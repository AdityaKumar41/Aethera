import { getOrCreateRelayerAccount, stellarClient } from "@aethera/stellar";
import { Asset, Operation, TransactionBuilder } from "@stellar/stellar-sdk";

async function sendTestUSDC(destinationAddress: string) {
  try {
    console.log(`Sending test USDC to: ${destinationAddress}`);

    const relayerAccount = await getOrCreateRelayerAccount();
    console.log(`Using relayer account: ${relayerAccount.publicKey()}`);

    // Create test USDC asset
    const testUSDC = new Asset("USDC", relayerAccount.publicKey());

    // Load relayer account
    const relayerAccountData = await stellarClient.horizon.loadAccount(
      relayerAccount.publicKey(),
    );

    // Create payment transaction
    const transaction = new TransactionBuilder(relayerAccountData, {
      fee: "10000",
      networkPassphrase:
        process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ||
        "Test SDF Network ; September 2015",
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

    // Sign with relayer account
    transaction.sign(relayerAccount);

    // Submit transaction
    console.log("Submitting transaction...");
    const result = await stellarClient.horizon.submitTransaction(transaction);

    console.log("✅ Success!");
    console.log(`Transaction hash: ${result.hash}`);
    console.log(`Sent 1000 test USDC to ${destinationAddress}`);
  } catch (error: any) {
    if (error.message?.includes("op_no_trust")) {
      console.error(
        "❌ Error: The destination account needs to establish a trustline for USDC first",
      );
      console.error(
        "The account must add a trustline before receiving USDC tokens",
      );
    } else {
      console.error("❌ Error sending test USDC:", error.message || error);
    }
    process.exit(1);
  }
}

const destinationAddress =
  process.argv[2] || "GBI72UH3FX5CXCFSP5LQKJSGOTS2B2EU7JIPE7BMYQSWYMN33SZR2JCF";
sendTestUSDC(destinationAddress);
