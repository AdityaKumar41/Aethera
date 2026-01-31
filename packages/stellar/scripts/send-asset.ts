import "dotenv/config";
import { 
  Keypair, 
  Operation, 
  TransactionBuilder, 
  BASE_FEE, 
  Asset,
  Networks,
  Horizon
} from "@stellar/stellar-sdk";

/**
 * MOCK USDC UTILITY SCRIPT
 * 
 * This script allows you to send mock USDC to any wallet address.
 * It will automatically use the configuration from your .env file.
 */

import { relayerService } from "../src/relayer";

async function sendUSDC() {
  const args = process.argv.slice(2);
  const destination = args[0];
  const amount = args[1] || "100.0";
  
  // Try to use provided secret, or default to relayer
  let senderSecret = process.env.SENDER_SECRET || "";
  
  if (!destination) {
    console.log("❌ Usage: npx tsx scripts/send-mock-usdc.ts <destination_address> [amount]");
    process.exit(1);
  }

  // Initialize relayer to decrypt secret if needed
  if (!senderSecret) {
    console.log("🔄 Initializing relayer to use admin secret...");
    await relayerService.initialize();
    const relayerKeypair = relayerService.getKeypair();
    if (relayerKeypair) {
      senderSecret = relayerKeypair.secret();
    }
  }

  const assetCode = process.env.USDC_ASSET_CODE || "USDC";
  const assetIssuer = process.env.USDC_ISSUER || "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const usdcAsset = new Asset(assetCode, assetIssuer);
  
  const horizonUrl = process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
  const server = new Horizon.Server(horizonUrl);
  const networkPassphrase = process.env.STELLAR_NETWORK === "mainnet" 
    ? Networks.PUBLIC 
    : Networks.TESTNET;

  try {
    if (!senderSecret) {
      throw new Error("SENDER_SECRET or ADMIN_RELAYER_SECRET is not defined in .env");
    }

    const senderKeypair = Keypair.fromSecret(senderSecret);
    console.log(`📡 Preparing to send ${amount} ${assetCode} to ${destination}`);
    console.log(`🏦 Sender: ${senderKeypair.publicKey()}`);

    // 1. Load sender account
    const senderAccount = await server.loadAccount(senderKeypair.publicKey());

    // 2. Build transaction
    const txBuilder = new TransactionBuilder(senderAccount, {
      fee: BASE_FEE,
      networkPassphrase,
    });

    // Add payment operation
    txBuilder.addOperation(
      Operation.payment({
        destination,
        asset: usdcAsset,
        amount: amount.toString(),
      })
    );

    const transaction = txBuilder.setTimeout(180).build();
    transaction.sign(senderKeypair);

    // 3. Submit
    console.log("🚀 Submitting transaction to Horizon...");
    const result = await server.submitTransaction(transaction);
    
    console.log("✅ Successfully sent!");
    console.log(`🔗 Transaction Hash: ${result.hash}`);
    console.log(`🔗 Explorer: https://stellar.expert/explorer/testnet/tx/${result.hash}`);

  } catch (error: any) {
    console.error("❌ Transfer failed:");
    if (error.response?.data?.extras?.result_codes) {
      console.error("   Reason:", error.response.data.extras.result_codes);
      if (error.response.data.extras.result_codes.operations.includes("op_no_trust")) {
        console.error("   💡 Hint: The destination address needs to have a trustline for this USDC asset.");
      }
    } else {
      console.error("   Error:", error.message || error);
    }
    process.exit(1);
  }
}

sendUSDC();
