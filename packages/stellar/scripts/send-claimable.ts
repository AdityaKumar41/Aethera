import "dotenv/config";
import { 
  Keypair, 
  Operation, 
  TransactionBuilder, 
  BASE_FEE, 
  Asset,
  Networks,
  Horizon,
  Claimant
} from "@stellar/stellar-sdk";
import { relayerService } from "../src/relayer";

async function sendClaimable() {
  const args = process.argv.slice(2);
  const destination = args[0];
  const amount = args[1] || "1000.0";
  const assetCode = args[2] || "USDC";
  const assetIssuer = args[3] || process.env.USDC_ISSUER || "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

  if (!destination) {
    console.log("❌ Usage: npx tsx scripts/send-claimable.ts <destination_address> [amount] [asset_code] [asset_issuer]");
    process.exit(1);
  }

  const usdcAsset = assetCode === "XLM" ? Asset.native() : new Asset(assetCode, assetIssuer);
  
  const horizonUrl = process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
  const server = new Horizon.Server(horizonUrl);
  const networkPassphrase = process.env.STELLAR_NETWORK === "mainnet" 
    ? Networks.PUBLIC 
    : Networks.TESTNET;

  try {
    console.log("🔄 Initializing relayer to use admin secret...");
    await relayerService.initialize();
    const relayerKeypair = relayerService.getKeypair();
    
    if (!relayerKeypair) {
      throw new Error("Relayer not initialized. Check your .env file.");
    }

    console.log(`📡 Preparing Claimable Balance of ${amount} ${assetCode} for ${destination}`);
    console.log(`🏦 Sender: ${relayerKeypair.publicKey()}`);

    const senderAccount = await server.loadAccount(relayerKeypair.publicKey());

    const transaction = new TransactionBuilder(senderAccount, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        Operation.createClaimableBalance({
          claimants: [
            new Claimant(destination, Claimant.predicateUnconditional())
          ],
          asset: usdcAsset,
          amount: amount.toString(),
        })
      )
      .setTimeout(180)
      .build();

    transaction.sign(relayerKeypair);

    console.log("🚀 Submitting transaction...");
    const result = await server.submitTransaction(transaction);
    
    console.log("✅ Claimable Balance created successfully!");
    console.log(`🔗 Transaction Hash: ${result.hash}`);
    console.log(`👉 The recipient can claim this after adding a trustline for ${assetCode}.`);

  } catch (error: any) {
    console.error("❌ Creation failed:", error.message || error);
    process.exit(1);
  }
}

sendClaimable();
