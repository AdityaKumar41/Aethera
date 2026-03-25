import { config } from "dotenv";
import { join } from "path";
import fs from "fs";

// Try multiple common paths for .env
const envPaths = [
  join(process.cwd(), ".env"),
  join(process.cwd(), "apps/api/.env"),
];

let loaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    config({ path: envPath });
    console.log(`[API] Environment variables loaded from: ${envPath}`);
    loaded = true;
    break;
  }
}

if (!loaded) {
  console.warn("[API] Warning: No .env file found in expected locations");
}

console.log("[API] Environment variables initialized");

export function validateEnv(): void {
  const requiredBase = ["DATABASE_URL"];
  const requiredProd = [
    "JWT_SECRET",
    "CLERK_SECRET_KEY",
    "STAT_RELAYER_SECRET",
    "STELLAR_SECRET_ENCRYPTION_KEY",
    "WALLET_ENCRYPTION_SECRET",
    "STELLAR_NETWORK",
  ];

  const isProd = process.env.NODE_ENV === "production";
  const required = isProd ? [...requiredBase, ...requiredProd] : requiredBase;
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    const message = `[API] Missing required env vars: ${missing.join(", ")}`;
    if (isProd && process.env.SKIP_ENV_VALIDATION !== "true") {
      throw new Error(message);
    }
    console.warn(message);
  }

  // Log optional config status
  const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  console.log(`[API] Email notifications: ${smtpConfigured ? "SMTP configured" : "console-only (set SMTP_HOST, SMTP_USER, SMTP_PASS to enable)"}`);
}
