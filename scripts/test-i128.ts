import * as StellarSdk from "@stellar/stellar-sdk";

const val = 2500n;
const scVal = StellarSdk.nativeToScVal(val, { type: "i128" });
console.log("XDR:", scVal.toXDR("base64"));
console.log("Type:", scVal.switch().name);
