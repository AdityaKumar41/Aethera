import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(__dirname, "../../../.env") });
config({ path: path.resolve(__dirname, "../../../.env.local") });

import { contractService } from "./contracts";

async function main() {
  const usdcTokenId = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
  const userAddress = "GADNOHMSFOPG3XTR43LVINMPEMUE5HJS7UOGRCQ4ZW4ZB4L7DLAMYGNP";
  
  console.log(`🔍 Checking Soroban Balance for User: ${userAddress} on Token: ${usdcTokenId}`);

  try {
    const result = await contractService.getTokenBalance(usdcTokenId, userAddress);
    if (result) {
      console.log(`✅ Soroban Balance: ${result.balance.toString()}`);
      console.log(`   (Formatted: ${Number(result.balance) / 10_000_000} USDC)`);
    } else {
      console.log("❌ Could not get balance");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main().finally(() => process.exit());
