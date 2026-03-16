import { config } from "dotenv";
import path from "path";
// Load env vars from root
config({ path: path.resolve(__dirname, "../../../.env") });
config({ path: path.resolve(__dirname, "../../../.env.local") });

import { Keypair, Asset, Operation, TransactionBuilder, BASE_FEE } from "@stellar/stellar-sdk";
import { prisma } from "@aethera/database";
import { walletService } from "./wallet.js";
import { stellarClient } from "./client.js";
import { getOrCreateRelayerAccount } from "./relayer.js";

async function main() {
  const email = "adityamoharana480@gmail.com";
  console.log(`🚀 Starting USDC funding process for ${email}...`);

  try {
    // 1. Find user in database
    const user = await prisma.user.findFirst({
      where: { email: email },
      select: { stellarPubKey: true, stellarSecretEncrypted: true }
    });

    if (!user || !user.stellarPubKey || !user.stellarSecretEncrypted) {
      throw new Error(`User not found or missing wallet info for ${email}`);
    }

    console.log(`✅ Found user wallet: ${user.stellarPubKey}`);

    // 2. Load relayer (issuer/funder)
    const relayerAccount = await getOrCreateRelayerAccount();
    console.log(`Relayer Address: ${relayerAccount.publicKey()}`);

    // 3. Setup Asset
    const usdcAsset = new Asset("USDC", relayerAccount.publicKey());

    // 4. Decrypt user secret to sign trustline
    const userSecret = walletService.decryptSecret(user.stellarSecretEncrypted);
    const userKeypair = Keypair.fromSecret(userSecret);

    // 5. Add Trustline (signed by user)
    console.log("📝 Adding trustline for USDC...");
    const userAccountData = await stellarClient.horizon.loadAccount(userKeypair.publicKey());
    const trustlineTx = new TransactionBuilder(userAccountData, {
      fee: BASE_FEE,
      networkPassphrase: stellarClient.getNetworkPassphrase(),
    })
      .addOperation(Operation.changeTrust({
        asset: usdcAsset,
        limit: "1000000"
      }))
      .setTimeout(30)
      .build();

    trustlineTx.sign(userKeypair);
    const trustlineRes = await stellarClient.horizon.submitTransaction(trustlineTx);
    console.log(`✅ Trustline added. Hash: ${trustlineRes.hash}`);

    // 6. Send USDC (signed by relayer)
    console.log("💰 Sending 10,000 USDC...");
    const relayerAccountData = await stellarClient.horizon.loadAccount(relayerAccount.publicKey());
    const paymentTx = new TransactionBuilder(relayerAccountData, {
      fee: BASE_FEE,
      networkPassphrase: stellarClient.getNetworkPassphrase(),
    })
      .addOperation(Operation.payment({
        destination: user.stellarPubKey,
        asset: usdcAsset,
        amount: "10000"
      }))
      .setTimeout(30)
      .build();

    paymentTx.sign(relayerAccount);
    const paymentRes = await stellarClient.horizon.submitTransaction(paymentTx);
    console.log(`✅ Sent 10,000 USDC. Hash: ${paymentRes.hash}`);

    console.log("\n✨ Process complete! User should see USDC balance in frontend.");

  } catch (error: any) {
    if (error.response?.data?.extras?.result_codes) {
        console.error("Transaction failed with result codes:", JSON.stringify(error.response.data.extras.result_codes, null, 2));
    }
    console.error("❌ Error:", error.message || error);
    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
