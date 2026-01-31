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

async function createTrustline() {
  const args = process.argv.slice(2);
  const userSecret = args[0] || process.env.USER_SECRET;

  if (!userSecret) {
    console.log("❌ Usage: npx tsx scripts/create-trustline.ts <user_secret>");
    process.exit(1);
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
    const keypair = Keypair.fromSecret(userSecret);
    console.log(`📡 Creating trustline for ${assetCode} on account ${keypair.publicKey()}...`);

    const account = await server.loadAccount(keypair.publicKey());
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        Operation.changeTrust({
          asset: usdcAsset,
        })
      )
      .setTimeout(180)
      .build();

    transaction.sign(keypair);
    const result = await server.submitTransaction(transaction);
    
    console.log("✅ Trustline created successfully!");
    console.log(`🔗 Transaction Hash: ${result.hash}`);

  } catch (error: any) {
    console.error("❌ Trustline creation failed:", error.message || error);
    process.exit(1);
  }
}

createTrustline();
