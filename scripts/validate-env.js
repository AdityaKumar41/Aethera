const { config } = require("dotenv");
const fs = require("fs");
const path = require("path");

const candidates = [
  path.join(process.cwd(), ".env"),
  path.join(process.cwd(), ".env.testnet"),
  path.join(process.cwd(), "apps/api/.env"),
];

for (const envPath of candidates) {
  if (fs.existsSync(envPath)) {
    config({ path: envPath });
    console.log(`[env] loaded ${envPath}`);
    break;
  }
}

const required = [
  "DATABASE_URL",
  "JWT_SECRET",
  "CLERK_SECRET_KEY",
  "STAT_RELAYER_SECRET",
  "STELLAR_SECRET_ENCRYPTION_KEY",
  "WALLET_ENCRYPTION_SECRET",
  "STELLAR_NETWORK",
  "ASSET_TOKEN_CONTRACT_ID",
  "TREASURY_CONTRACT_ID",
  "YIELD_DISTRIBUTOR_CONTRACT_ID",
  "GOVERNANCE_CONTRACT_ID",
  "ORACLE_CONTRACT_ID",
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`[env] missing: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("[env] all required variables present");
