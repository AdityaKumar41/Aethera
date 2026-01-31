import { config } from "dotenv";
import path from "path";
// Load env vars from root
config({ path: path.resolve(__dirname, "../../../.env") });
config({ path: path.resolve(__dirname, "../../../.env.local") });

import { Keypair, Asset, Operation, TransactionBuilder, BASE_FEE } from "@stellar/stellar-sdk";
import { prisma } from "@aethera/database";
import { walletService } from "./wallet";
import { stellarClient } from "./client";
import { getOrCreateRelayerAccount } from "./relayer";

const USDC_ASSET_TESTNET = new Asset(
  "USDC",
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
);

async function main() {
  const publicKey = "GADNOHMSFOPG3XTR43LVINMPEMUE5HJS7UOGRCQ4ZW4ZB4L7DLAMYGNP";
  const amount = "5000";

  console.log(`💰 Funding ${publicKey} with ${amount} Circle Testnet USDC via DEX Swap...`);

  try {
    // 1. Get Relayer keypair
    const relayerKeypair = await getOrCreateRelayerAccount();
    const relayerPub = relayerKeypair.publicKey();
    console.log(`Relayer: ${relayerPub}`);

    // 2. Load Relayer account
    const relayerAccount = await stellarClient.horizon.loadAccount(relayerPub);

    // 3. Build Swap Transaction (Path Payment)
    const swapTx = new TransactionBuilder(relayerAccount, {
      fee: BASE_FEE,
      networkPassphrase: stellarClient.getNetworkPassphrase(),
    })
      .addOperation(
        Operation.pathPaymentStrictReceive({
          sendAsset: Asset.native(),
          sendMax: "15000", // High max to ensure success on low-liquidity testnet
          destination: publicKey,
          destAsset: USDC_ASSET_TESTNET,
          destAmount: amount,
          path: [],
        }),
      )
      .setTimeout(30)
      .build();

    swapTx.sign(relayerKeypair);
    const result = await stellarClient.horizon.submitTransaction(swapTx);

    console.log(`\n✅ Successfully funded ${amount} USDC!`);
    console.log(`Hash: ${result.hash}`);

  } catch (error: any) {
    if (error.response?.data?.extras?.result_codes) {
      console.error("❌ Transaction failed with codes:", JSON.stringify(error.response.data.extras.result_codes, null, 2));
    }
    console.error("❌ Error:", error.message || error);
    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
