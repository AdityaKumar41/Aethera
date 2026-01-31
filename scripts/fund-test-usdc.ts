import {
  Keypair,
  Asset,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { stellarClient, getUSDCAsset } from "@aethera/stellar";

/**
 * Script to fund a testnet wallet with USDC
 * This creates a temporary issuer account and distributes USDC for testing
 */

async function fundWalletWithUSDC(
  destinationAddress: string,
  amount: string = "10000",
) {
  try {
    console.log(`🔧 Funding ${destinationAddress} with ${amount} USDC...`);

    // Create a temporary issuer keypair for test USDC
    const issuerKeypair = Keypair.random();
    const distributorKeypair = Keypair.random();

    console.log(`📝 Issuer: ${issuerKeypair.publicKey()}`);
    console.log(`📝 Distributor: ${distributorKeypair.publicKey()}`);

    // Step 1: Fund issuer and distributor with Friendbot
    console.log(`💰 Funding issuer with Friendbot...`);
    await stellarClient.horizon.friendbot(issuerKeypair.publicKey()).call();

    console.log(`💰 Funding distributor with Friendbot...`);
    await stellarClient.horizon
      .friendbot(distributorKeypair.publicKey())
      .call();

    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for accounts to be created

    // Step 2: Create USDC asset
    const testUSDC = new Asset("USDC", issuerKeypair.publicKey());

    // Step 3: Distributor creates trustline to issuer
    console.log(`🔗 Creating trustline from distributor to issuer...`);
    const distributorAccount = await stellarClient.horizon.loadAccount(
      distributorKeypair.publicKey(),
    );

    const trustlineTx = new TransactionBuilder(distributorAccount, {
      fee: "10000",
      networkPassphrase: "Test SDF Network ; September 2015",
    })
      .addOperation(
        Operation.changeTrust({
          asset: testUSDC,
          limit: "1000000000",
        }),
      )
      .setTimeout(30)
      .build();

    trustlineTx.sign(distributorKeypair);
    await stellarClient.horizon.submitTransaction(trustlineTx);

    // Step 4: Issue USDC from issuer to distributor
    console.log(`💵 Issuing USDC to distributor...`);
    const issuerAccount = await stellarClient.horizon.loadAccount(
      issuerKeypair.publicKey(),
    );

    const issueTx = new TransactionBuilder(issuerAccount, {
      fee: "10000",
      networkPassphrase: "Test SDF Network ; September 2015",
    })
      .addOperation(
        Operation.payment({
          destination: distributorKeypair.publicKey(),
          asset: testUSDC,
          amount: "1000000", // Issue 1M USDC to distributor
        }),
      )
      .setTimeout(30)
      .build();

    issueTx.sign(issuerKeypair);
    await stellarClient.horizon.submitTransaction(issueTx);

    // Step 5: Check if destination has trustline, create if not
    console.log(`🔍 Checking destination trustline...`);
    const destAccount =
      await stellarClient.horizon.loadAccount(destinationAddress);
    const hasTrustline = destAccount.balances.some(
      (balance: any) =>
        balance.asset_type !== "native" &&
        balance.asset_code === "USDC" &&
        balance.asset_issuer === issuerKeypair.publicKey(),
    );

    if (!hasTrustline) {
      console.log(
        `⚠️  Destination doesn't have trustline. User needs to create it first.`,
      );
      console.log(`   Run this command to create trustline:`);
      console.log(`   Issuer: ${issuerKeypair.publicKey()}`);
      return;
    }

    // Step 6: Send USDC from distributor to destination
    console.log(`📤 Sending ${amount} USDC to destination...`);
    const distributorAccountReload = await stellarClient.horizon.loadAccount(
      distributorKeypair.publicKey(),
    );

    const sendTx = new TransactionBuilder(distributorAccountReload, {
      fee: "10000",
      networkPassphrase: "Test SDF Network ; September 2015",
    })
      .addOperation(
        Operation.payment({
          destination: destinationAddress,
          asset: testUSDC,
          amount: amount,
        }),
      )
      .setTimeout(30)
      .build();

    sendTx.sign(distributorKeypair);
    const result = await stellarClient.horizon.submitTransaction(sendTx);

    console.log(`✅ Success! Sent ${amount} USDC`);
    console.log(`   Transaction: ${result.hash}`);
    console.log(`   Issuer: ${issuerKeypair.publicKey()}`);
    console.log(`\n⚠️  NOTE: This is test USDC from a temporary issuer.`);
    console.log(
      `   For real investments, you need USDC from the official issuer.`,
    );
  } catch (error: any) {
    console.error("❌ Error:", error.message || error);
    if (error.response) {
      console.error("Response:", error.response.data);
    }
  }
}

// For a simpler approach - just create trustline to official testnet USDC
async function createOfficialUSDCTrustline(
  userPublicKey: string,
  userSecretKey: string,
) {
  try {
    console.log(`🔗 Creating trustline to official testnet USDC...`);

    const usdcAsset = getUSDCAsset(); // Official testnet USDC
    const userKeypair = Keypair.fromSecret(userSecretKey);

    const account = await stellarClient.horizon.loadAccount(userPublicKey);

    const transaction = new TransactionBuilder(account, {
      fee: "10000",
      networkPassphrase: "Test SDF Network ; September 2015",
    })
      .addOperation(
        Operation.changeTrust({
          asset: usdcAsset,
          limit: "922337203685.4775807",
        }),
      )
      .setTimeout(30)
      .build();

    transaction.sign(userKeypair);
    const result = await stellarClient.horizon.submitTransaction(transaction);

    console.log(`✅ Trustline created!`);
    console.log(`   Transaction: ${result.hash}`);
    console.log(`   You can now receive USDC at: ${userPublicKey}`);
    console.log(`\n⚠️  To get testnet USDC, you need to:`);
    console.log(`   1. Visit https://stellar.org/laboratory`);
    console.log(`   2. Use the testnet USDC issuer to send yourself funds`);
  } catch (error: any) {
    console.error("❌ Error:", error.message || error);
  }
}

// Run the script
const destinationAddress =
  process.argv[2] || "GBI72UH3FX5CXCFSP5LQKJSGOTS2B2EU7JIPE7BMYQSWYMN33SZR2JCF";
const amount = process.argv[3] || "10000";

console.log(`\n🚀 Test USDC Funding Script\n`);
fundWalletWithUSDC(destinationAddress, amount);
