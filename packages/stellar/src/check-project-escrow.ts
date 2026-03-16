import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(__dirname, "../../../.env") });
config({ path: path.resolve(__dirname, "../../../.env.local") });

import { contractService } from "./contracts.js";
import * as StellarSdk from "@stellar/stellar-sdk";

async function main() {
  const treasuryId = "CAWNBL27F7F7CRBK4XYN7JE6UUK7YMVUDOAI25E4UEVGLQRCBE3CIKVU";
  const projectId = "cml25tpr80000zwv0svop33as";
  const sourceAddress = "GADNOHMSFOPG3XTR43LVINMPEMUE5HJS7UOGRCQ4ZW4ZB4L7DLAMYGNP";
  
  console.log(`🔍 Checking Project Escrow: ${projectId} on Treasury: ${treasuryId}`);

  try {
    const res = await contractService.simulateContractCall(
      treasuryId,
      "get_project",
      [StellarSdk.nativeToScVal(projectId, { type: "string" })],
      sourceAddress
    );

    if (res.success && res.result) {
      const native = StellarSdk.scValToNative(res.result as StellarSdk.xdr.ScVal);
      console.log("✅ Project Escrow:", JSON.stringify(native, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value, 2));
    } else {
      console.error("❌ Simulation failed:", res.error);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main().finally(() => process.exit());
