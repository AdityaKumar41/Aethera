import * as StellarSdk from "@stellar/stellar-sdk";
import crypto from "crypto";

const adminPubKey = "GCCB36VEX2CCGBLACLH5PYUGEFFL6DIJZBLFEOUBGUSBFTXPECZNPWTA";
const salt = crypto.randomBytes(32);
const networkPassphrase = "Test SDF Network ; September 2015";

try {
    const contractId = StellarSdk.Address.contractIdFromAddress(
        StellarSdk.Address.fromString(adminPubKey),
        salt,
        StellarSdk.hash(Buffer.from(networkPassphrase))
    ).toString();
    console.log("Contract ID via helper:", contractId);
} catch (e) {
    console.log("Helper not found or failed:", e);
}
