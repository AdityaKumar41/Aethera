import {
  Keypair,
  Asset,
  Operation,
  TransactionBuilder,
  Networks,
  Horizon,
} from "@stellar/stellar-sdk";

const TARGET_ADDRESS =
  "GBI72UH3FX5CXCFSP5LQKJSGOTS2B2EU7JIPE7BMYQSWYMN33SZR2JCF";
const AMOUNT = "10000";

async function fundUSDC() {
  console.log(`🚀 Funding ${TARGET_ADDRESS} with ${AMOUNT} USDC...`);

  const server = new Horizon.Server("https://horizon-testnet.stellar.org");

  // Create temporary issuer and distributor
  const issuerKeypair = Keypair.random();
  const distributorKeypair = Keypair.random();

  console.log(`📝 Issuer: ${issuerKeypair.publicKey()}`);
  console.log(`📝 Distributor: ${distributorKeypair.publicKey()}`);

  // Fund both with friendbot
  console.log("\n💰 Funding issuer with XLM...");
  await server.friendbot(issuerKeypair.publicKey()).call();

  console.log("💰 Funding distributor with XLM...");
  await server.friendbot(distributorKeypair.publicKey()).call();

  // Wait for accounts to be ready
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Create USDC asset
  const usdcAsset = new Asset("USDC", issuerKeypair.publicKey());

  // 1. Distributor creates trustline to issuer
  console.log("\n🔗 Creating trustline from distributor to issuer...");
  let distributorAccount = await server.loadAccount(
    distributorKeypair.publicKey(),
  );

  const trustlineTx = new TransactionBuilder(distributorAccount, {
    fee: "10000",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.changeTrust({
        asset: usdcAsset,
        limit: "1000000000",
      }),
    )
    .setTimeout(30)
    .build();

  trustlineTx.sign(distributorKeypair);
  await server.submitTransaction(trustlineTx);
  console.log("✅ Trustline created");

  // 2. Issue USDC to distributor
  console.log("\n💵 Issuing USDC to distributor...");
  const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());

  const issueTx = new TransactionBuilder(issuerAccount, {
    fee: "10000",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: distributorKeypair.publicKey(),
        asset: usdcAsset,
        amount: "1000000",
      }),
    )
    .setTimeout(30)
    .build();

  issueTx.sign(issuerKeypair);
  await server.submitTransaction(issueTx);
  console.log("✅ USDC issued");

  // 3. Check if target has trustline, create if needed
  console.log("\n🔍 Checking target account...");
  try {
    const targetAccount = await server.loadAccount(TARGET_ADDRESS);

    const hasTrustline = targetAccount.balances.some(
      (balance: any) =>
        balance.asset_type !== "native" &&
        balance.asset_code === "USDC" &&
        balance.asset_issuer === issuerKeypair.publicKey(),
    );

    console.log(`Trustline exists: ${hasTrustline}`);

    if (!hasTrustline) {
      console.log(
        "⚠️  Target needs trustline - this will be created by their wallet",
      );
      console.log(
        "Note: User must create trustline first or we need their secret key",
      );
    }
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log(
        "⚠️  Account doesn't exist - needs to be funded with XLM first",
      );
      return;
    }
  }

  // 4. Send USDC to target (will fail if no trustline)
  console.log(`\n💸 Sending ${AMOUNT} USDC to target...`);
  distributorAccount = await server.loadAccount(distributorKeypair.publicKey());

  const sendTx = new TransactionBuilder(distributorAccount, {
    fee: "10000",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: TARGET_ADDRESS,
        asset: usdcAsset,
        amount: AMOUNT,
      }),
    )
    .setTimeout(30)
    .build();

  sendTx.sign(distributorKeypair);

  try {
    const result = await server.submitTransaction(sendTx);
    console.log("✅ SUCCESS! USDC sent");
    console.log(
      `Transaction: https://stellar.expert/explorer/testnet/tx/${result.hash}`,
    );
    console.log(`\n📊 Issuer: ${issuerKeypair.publicKey()}`);
    console.log(`💰 Amount: ${AMOUNT} USDC`);
  } catch (error: any) {
    console.error(
      "❌ Failed to send USDC:",
      error.response?.data?.extras?.result_codes,
    );

    if (
      error.response?.data?.extras?.result_codes?.operations?.includes(
        "op_no_trust",
      )
    ) {
      console.log("\n⚠️  Target account needs to create a trustline first!");
      console.log(
        `Run this to create trustline manually (need their secret key)`,
      );
    }
  }
}

fundUSDC().catch(console.error);
