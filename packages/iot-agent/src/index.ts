import * as StellarSdk from "@stellar/stellar-sdk";
import axios from "axios";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";
import { SimulationAdapter } from "./adapters/simulation.js";
import { SolarEdgeAdapter } from "./adapters/solaredge.js";
import { SMAAdapter } from "./adapters/sma.js";
import { IoTAdapter } from "./adapters/base.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// Configuration
// ============================================

const API_BASE_URL = process.env.AETHERA_API_URL || "http://localhost:3002/api";
const PROJECT_ID = process.env.PROJECT_ID; 
const ACTIVATION_CODE = process.env.ACTIVATION_CODE; // One-time activation code
const INTERVAL_MS = parseInt(process.env.POLLING_INTERVAL || "60000"); // 1 minute default
const ADAPTER_TYPE = process.env.ADAPTER_TYPE || "simulation";

// ============================================
// Device Identity
// ============================================

function getDeviceKeypair(): StellarSdk.Keypair {
  const envKey = process.env.DEVICE_SECRET_KEY;
  if (envKey) {
    return StellarSdk.Keypair.fromSecret(envKey);
  }

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
// Adapter Strategy
// ============================================

function createAdapter(): IoTAdapter {
  switch (ADAPTER_TYPE.toLowerCase()) {
    case "solaredge":
      return new SolarEdgeAdapter(
        process.env.SOLAREDGE_SITE_ID || "",
        process.env.SOLAREDGE_API_KEY || ""
      );
    case "sma":
      return new SMAAdapter(
        process.env.SMA_SYSTEM_ID || "",
        process.env.SMA_API_USERNAME || "",
        process.env.SMA_API_PASSWORD || ""
      );
    case "simulation":
    default:
      return new SimulationAdapter();
  }
}

const adapter = createAdapter();

// ============================================
// Device Provisioning & Ingestion
// ============================================

async function activateDevice() {
  if (!ACTIVATION_CODE) {
    console.warn("⚠️ ACTIVATION_CODE not provided. Checking if already activated...");
    return;
  }

  try {
    console.log(`📡 Activating device with code: ${ACTIVATION_CODE}...`);
    const info = await adapter.getDeviceInfo();
    
    const response = await axios.post(`${API_BASE_URL}/oracle/devices/activate`, {
      activationCode: ACTIVATION_CODE,
      publicKey: deviceKp.publicKey(),
      metadata: {
        ...info,
        version: "0.2.0"
      }
    });
    
    console.log("✅ Device activated successfully:", response.data.data.deviceId);
    // Unset activation code after success to avoid redundant calls
    process.env.ACTIVATION_CODE = "";
  } catch (error: any) {
    if (error.response?.status === 409) {
      console.log("ℹ️ Device already activated for this project.");
    } else {
      console.error("❌ Activation failed:", error.response?.data || error.message);
    }
  }
}

async function sendTelemetry() {
  try {
    const reading = await adapter.readProduction();
    
    // Create payload
    const payload = JSON.stringify({
      wh: reading.energyWh, // We use lifetime Wh for the oracle per newer logic
      power: reading.powerW,
      timestamp: reading.timestamp.getTime(),
      deviceId: deviceKp.publicKey(),
    });

    // Sign payload
    const signature = deviceKp.sign(Buffer.from(payload)).toString("hex");

    console.log(`📤 Sending production update: ${reading.energyWh.toFixed(2)} Wh (Power: ${reading.powerW?.toFixed(1) || 0}W)`);
    
    await axios.post(`${API_BASE_URL}/oracle/ingest`, {
      payload,
      signature,
      publicKey: deviceKp.publicKey()
    });
  } catch (error: any) {
    console.error("❌ Telemetry failed:", error.response?.data || error.message);
  }
}

// ============================================
// Main Loop
// ============================================

async function main() {
  console.log("🚀 Aethera Device Agent (ADA) starting...");
  console.log("🆔 Device ID:", deviceKp.publicKey());
  console.log("🔌 Adapter Type:", ADAPTER_TYPE);

  try {
    await adapter.connect();
    await activateDevice();

    console.log(`⏱️ Starting production monitoring (Interval: ${INTERVAL_MS}ms)`);
    // Run once immediately, then interval
    await sendTelemetry();
    setInterval(sendTelemetry, INTERVAL_MS);
  } catch (error) {
    console.error("❌ Critical agent failure:", error);
    process.exit(1);
  }
}

main().catch(console.error);
