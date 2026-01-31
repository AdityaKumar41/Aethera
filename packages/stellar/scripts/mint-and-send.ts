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

/**
 * MINT AND SEND UTILITY
 * 
 * 1. Generates a temporary issuer
 * 2. Funds issuer with friendbot
 * 3. Creates Claimable Balances for the user
 */

async function mintAndSend() {
  const args = process.argv.slice(2);
  const destination = args[0];
  
  if (!destination) {
    console.log("❌ Usage: npx tsx scripts/mint-and-send.ts <destination_address>");
    process.exit(1);
  }

  const horizonUrl = process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
  const server = new Horizon.Server(horizonUrl);
  const networkPassphrase = process.env.STELLAR_NETWORK === "mainnet" 
    ? Networks.PUBLIC 
    : Networks.TESTNET;

  try {
    // 1. Generate Temporary Issuer
    console.log("🎲 Generating temporary issuer...");
    const issuerKeypair = Keypair.random();
    console.log(`🏦 Issuer: ${issuerKeypair.publicKey()}`);

    // 2. Fund Issuer with Friendbot
    console.log("💧 Funding issuer from friendbot...");
    await server.friendbot(issuerKeypair.publicKey()).call();
    console.log("✅ Issuer funded.");

    // 3. Define Assets
    const usdcAsset = new Asset("USDC", issuerKeypair.publicKey());
    const aethAsset = new Asset("AETH", issuerKeypair.publicKey());

    // 4. Create Claimable Balances
    const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
    
    console.log(`📡 Creating Claimable Balances for ${destination}...`);
    
    const transaction = new TransactionBuilder(issuerAccount, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        Operation.createClaimableBalance({
          claimants: [
            new Claimant(destination, Claimant.predicateUnconditional())
          ],
          asset: usdcAsset,
          amount: "1000.0000000",
        })
      )
      .addOperation(
        Operation.createClaimableBalance({
          claimants: [
            new Claimant(destination, Claimant.predicateUnconditional())
          ],
          asset: aethAsset,
          amount: "500.0000000",
        })
      )
      .setTimeout(180)
      .build();

    transaction.sign(issuerKeypair);

    console.log("🚀 Submitting transaction...");
    const result = await server.submitTransaction(transaction);
    
    console.log("✅ SUCCESS!");
    console.log(`🔗 Transaction Hash: ${result.hash}`);
    console.log(`🔗 Issuer Secret (save for trustlines): ${issuerKeypair.secret()}`);
    console.log("\n👉 IMPORTANT: The user must add trustlines for these assets and then claim them.");
    console.log(`USDC Issuer: ${issuerKeypair.publicKey()}`);
    console.log(`AETH Issuer: ${issuerKeypair.publicKey()}`);

  } catch (error: any) {
    console.error("❌ Failed:", error.message || error);
    process.exit(1);
  }
}

mintAndSend();
