import { Asset, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { getOrCreateRelayerAccount } from "./relayer.js";
import { stellarClient } from "./client.js";

async function main() {
  const destinationAddress = "GCORR7O73GS6W5IHJQE2GR3CMXVMSVKCRHAY3W2F6TVQXGQ7WVMINRQY";
  try {
    console.log(`Processing for: ${destinationAddress}`);

    const relayerAccount = await getOrCreateRelayerAccount();
    console.log(`Using relayer account: ${relayerAccount.publicKey()}`);

    // Load relayer account
    const relayerAccountData = await stellarClient.horizon.loadAccount(
        relayerAccount.publicKey(),
    );

    // Check if destination exists
    let destinationAccount;
    try {
        destinationAccount = await stellarClient.horizon.loadAccount(destinationAddress);
    } catch (e: any) {
        if (e.response?.status === 404) {
            console.log("Account does not exist. Creating and funding with 100 XLM...");
            const tx = new TransactionBuilder(relayerAccountData, {
                fee: "10000",
                networkPassphrase: stellarClient.getNetworkPassphrase(),
            })
            .addOperation(Operation.createAccount({
                destination: destinationAddress,
                startingBalance: "100", // 100 XLM
            }))
            .setTimeout(30)
            .build();
            
            tx.sign(relayerAccount);
            const res = await stellarClient.horizon.submitTransaction(tx);
            console.log("✅ Created account with 100 XLM. Hash:", res.hash);
            console.log("⚠️ Cannot send USDC yet. Destination must add trustline to USDC.");
            return;
        }
        throw e;
    }

    // Check trustline
    const testUSDC = new Asset("USDC", relayerAccount.publicKey());
    const hasTrustline = destinationAccount.balances.some((b: any) => 
        b.asset_code === "USDC" && b.asset_issuer === relayerAccount.publicKey()
    );

    if (!hasTrustline) {
        console.log("⚠️ Destination has no trustline for USDC. Cannot send USDC.");
        console.log("Issuer:", relayerAccount.publicKey());
        console.log("Please add a trustline to this asset code and issuer.");
        return;
    }

    // Send USDC
    const transaction = new TransactionBuilder(relayerAccountData, {
      fee: "10000",
      networkPassphrase: stellarClient.getNetworkPassphrase(),
    })
      .addOperation(
        Operation.payment({
          destination: destinationAddress,
          asset: testUSDC,
          amount: "1000",
        }),
      )
      .setTimeout(30)
      .build();

    transaction.sign(relayerAccount);
    console.log("Submitting USDC payment...");
    const result = await stellarClient.horizon.submitTransaction(transaction);

    console.log("✅ Sent 1000 USDC! Hash:", result.hash);

  } catch (error: any) {
    if (error.response?.data?.extras?.result_codes) {
        console.error("Transaction failed with result codes:", JSON.stringify(error.response.data.extras.result_codes, null, 2));
    }
    console.error("❌ Error:", error.message || error);
    process.exit(1);
  }
}

main();
