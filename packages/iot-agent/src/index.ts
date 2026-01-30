import * as StellarSdk from "@stellar/stellar-sdk";
import axios from "axios";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// Configuration
// ============================================

const API_BASE_URL = process.env.AETHERA_API_URL || "http://localhost:3002/api";
const PROJECT_ID = process.env.PROJECT_ID; // The project this device belongs to
const INTERVAL_MS = parseInt(process.env.POLLING_INTERVAL || "30000"); // 30 seconds

// ============================================
// Device Identity
// ============================================

function getDeviceKeypair(): StellarSdk.Keypair {
  const envKey = process.env.DEVICE_SECRET_KEY;
  if (envKey) {
    return StellarSdk.Keypair.fromSecret(envKey);
  }

  // Load from local file if exists, otherwise generate
  const keyPath = join(__dirname, "../device-key.json");
  if (fs.existsSync(keyPath)) {
    const data = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
    return StellarSdk.Keypair.fromSecret(data.secret);
  }

  const kp = StellarSdk.Keypair.random();
  fs.writeFileSync(
    keyPath,
    JSON.stringify({
      publicKey: kp.publicKey(),
      secret: kp.secret(),
    }, null, 2)
  );
  console.log("🆕 Generated new device identity:", kp.publicKey());
  return kp;
}

const deviceKp = getDeviceKeypair();

// ============================================
// Telemetry Simulation
// ============================================

let totalWh = 0;

function simulateProduction(): number {
  // Simulate 100W - 500W production for the 30s interval
  const watts = 100 + Math.random() * 400;
  const wh = (watts * (INTERVAL_MS / 1000)) / 3600;
  totalWh += wh;
  return parseFloat(wh.toFixed(4));
}

// ============================================
// Ingestion
// ============================================

async function registerDevice() {
  if (!PROJECT_ID) {
    console.error("❌ PROJECT_ID not configured. Device registration skipped.");
    return;
  }

  try {
    console.log("📡 Registering device with Aethera Oracle...");
    const response = await axios.post(`${API_BASE_URL}/oracle/devices/register`, {
      projectId: PROJECT_ID,
      publicKey: deviceKp.publicKey(),
      metadata: {
        model: "Aethera-ADA-Sim-v1",
        version: "0.1.0",
        location: "Simulated-Node"
      }
    });
    console.log("✅ Device registered successfully:", response.data.data.deviceId);
  } catch (error: any) {
    if (error.response?.status === 409) {
      console.log("ℹ️ Device already registered.");
    } else {
      console.error("❌ Registration failed:", error.response?.data || error.message);
    }
  }
}

async function sendTelemetry() {
  const whProduced = simulateProduction();
  const timestamp = Date.now();

  // Create payload
  const payload = JSON.stringify({
    wh: whProduced,
    totalWh: parseFloat(totalWh.toFixed(4)),
    timestamp,
    deviceId: deviceKp.publicKey(),
  });

  // Sign payload
  const signature = deviceKp.sign(Buffer.from(payload)).toString("hex");

  try {
    console.log(`📤 Sending telemetry: ${whProduced} Wh (Total: ${totalWh.toFixed(2)} Wh)`);
    await axios.post(`${API_BASE_URL}/oracle/ingest`, {
      payload,
      signature,
      publicKey: deviceKp.publicKey()
    });
  } catch (error: any) {
    console.error("❌ Telemetry ingestion failed:", error.response?.data || error.message);
  }
}

// ============================================
// Main Loop
// ============================================

async function main() {
  console.log("🚀 Aethera Device Agent (ADA) starting...");
  console.log("🆔 Public Key:", deviceKp.publicKey());

  await registerDevice();

  console.log(`⏱️ Starting production simulation (Interval: ${INTERVAL_MS}ms)`);
  setInterval(sendTelemetry, INTERVAL_MS);
}

main().catch(console.error);
