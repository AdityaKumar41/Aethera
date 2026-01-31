import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(__dirname, "../../../.env") });
config({ path: path.resolve(__dirname, "../../../.env.local") });

import { contractService } from "./contracts";
import * as StellarSdk from "@stellar/stellar-sdk";

async function main() {
  const usdcTokenId = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
  const userAddress = "GADNOHMSFOPG3XTR43LVINMPEMUE5HJS7UOGRCQ4ZW4ZB4L7DLAMYGNP";
  
  console.log(`🔍 Checking USDC Contract Identity: ${usdcTokenId}`);

  try {
    const res = await contractService.simulateContractCall(
      usdcTokenId,
      "symbol",
      [],
      userAddress
    );

    if (res.success && res.result) {
      const native = StellarSdk.scValToNative(res.result as StellarSdk.xdr.ScVal);
      console.log("✅ Token Symbol:", native);
    } else {
      console.error("❌ Failed to get symbol:", res.error);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main().finally(() => process.exit());
