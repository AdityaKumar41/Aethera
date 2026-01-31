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
 * CLAIM ALL UTILITY
 * 
 * This script will:
 * 1. Find all claimable balances for the user.
 * 2. Add trustlines for the assets if missing.
 * 3. Claim everything!
 */

async function claimAll() {
  const args = process.argv.slice(2);
  const userSecret = args[0];

  if (!userSecret) {
    console.log("❌ Usage: npx tsx scripts/claim-all.ts <user_secret_key>");
    process.exit(1);
  }

  const horizonUrl = process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
  const server = new Horizon.Server(horizonUrl);
  const networkPassphrase = process.env.STELLAR_NETWORK === "mainnet" 
    ? Networks.PUBLIC 
    : Networks.TESTNET;

  try {
    const userKeypair = Keypair.fromSecret(userSecret);
    const userPublic = userKeypair.publicKey();
    console.log(`📡 Searching for claimable balances for: ${userPublic}`);

    // 1. Fetch claimable balances
    const response = await server.claimableBalances().claimant(userPublic).call();
    const balances = response.records;

    if (balances.length === 0) {
      console.log("ℹ️ No claimable balances found.");
      return;
    }

    console.log(`✅ Found ${balances.length} claimable balances.`);

    const account = await server.loadAccount(userPublic);
    const txBuilder = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase,
    });

    for (const cb of balances) {
      console.log(`📦 Processing ${cb.amount} ${cb.asset}...`);
      
      const assetParts = cb.asset.split(":");
      const asset = assetParts.length === 2 
        ? new Asset(assetParts[0], assetParts[1]) 
        : Asset.native();

      // 2. Add Trustline if not native
      if (!asset.isNative()) {
         const hasTrustline = account.balances.some((b: any) => 
           b.asset_code === asset.getCode() && b.asset_issuer === asset.getIssuer()
         );

         if (!hasTrustline) {
           console.log(`🔗 Adding trustline for ${asset.getCode()}...`);
           txBuilder.addOperation(Operation.changeTrust({ asset }));
         }
      }

      // 3. Add Claim operation
      txBuilder.addOperation(Operation.claimClaimableBalance({ balanceId: cb.id }));
    }

    const transaction = txBuilder.setTimeout(180).build();
    transaction.sign(userKeypair);

    console.log("🚀 Submitting claim transaction...");
    const result = await server.submitTransaction(transaction);
    
    console.log("🎉 SUCCESS! All tokens claimed.");
    console.log(`🔗 Transaction Hash: ${result.hash}`);

  } catch (error: any) {
    console.error("❌ Claim failed:", error.message || error);
    process.exit(1);
  }
}

claimAll();
