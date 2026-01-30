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
