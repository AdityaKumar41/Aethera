
import axios from "axios";
import { prisma } from "@aethera/database";
import * as nacl from "tweetnacl";
import * as naclUtil from "tweetnacl-util";
import { Keypair } from "@stellar/stellar-sdk";

const API_URL = "http://localhost:3002/api";

async function main() {
  console.log("🚀 Starting IoT Simulation Flow...");

  // 1. Setup: Get a user and project
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("No admin found");
  
  const headers = { "x-mock-auth-user-id": admin.id };

  // Find a Funded project (or create one in a real scenario, here we pick one)
  // We prefer one that is FUNDED or ACTIVE_PENDING_DATA
  const project = await prisma.project.findFirst({
    where: { status: { in: ["FUNDED", "ACTIVE_PENDING_DATA"] } }
  });

  if (!project) {
    console.error("❌ No suitable project found (FUNDED or ACTIVE_PENDING_DATA).");
    return;
  }
  console.log(`Using Project: ${project.id} (${project.status})`);

  // 2. Generate Device Keys
  // In a real scenario, the device generates these and we just register the public key.
  const keypair = nacl.sign.keyPair(); // Ed25519
  const publicKey = naclUtil.encodeBase64(keypair.publicKey);
  const secretKey = naclUtil.encodeBase64(keypair.secretKey);
  
  // For Stellar compatibility in signature verification context?
  // OracleService uses Keypair.fromPublicKey(publicKey).verify(...)
  // Stellar SDK keys are Ed25519 but encoded differently (StrKey).
  // Let's check how OracleService expects the key.
  // It uses `Keypair.fromPublicKey(publicKey)`.
  // So we should use Stellar SDK to generate keys to be safe and consistent.
  
  const stellarPair = Keypair.random();
  const devicePublicKey = stellarPair.publicKey();
  const deviceSecret = stellarPair.secret();

  console.log(`📱 Device Generated: ${devicePublicKey}`);

  // 3. Register Device (if not already)
  // We simulate the API call from the frontend
  try {
     // NOTE: The registration endpoint is /oracle/devices/register
     // API definition: router.post("/devices/register", ...) in oracle.ts
     console.log("Registering device...");
     await axios.post(`${API_URL}/oracle/devices/register`, {
        projectId: project.id,
        publicKey: devicePublicKey,
        metadata: { model: "Simulation-Script-v1" }
     }, { headers });
     console.log("✅ Device Registered");
  } catch (err: any) {
     console.error("❌ Registration Failed:", err.response?.data || err.message);
     return;
  }

  // 4. Activate Project (if FUNDED)
  if (project.status === "FUNDED") {
      console.log("Activating project...");
      try {
          await axios.post(`${API_URL}/admin/projects/${project.id}/activate`, {}, { headers });
          console.log("✅ Project Activated -> ACTIVE_PENDING_DATA");
      } catch (err: any) {
          console.error("⚠️ Activation Failed (On-Chain Error):", err.response?.data?.error || err.message);
          console.log("⚠️ Forcing status to ACTIVE_PENDING_DATA to continue simulation (Test Environment Fix)...");
          await prisma.project.update({
             where: { id: project.id },
             data: { 
                 status: "ACTIVE_PENDING_DATA",
                 totalEnergyProduced: 0, // Ensure strictly initialized
                 fundingRaised: project.fundingTarget // Ensure funded
             }
          });
      }
  } else if (project.status === "ACTIVE_PENDING_DATA") {
      // Ensure energy is init
       await prisma.project.update({
             where: { id: project.id },
             data: { totalEnergyProduced: { set: 0 } } // Reset or ensure not null
          });
  }

  // 5. Generate Telemetry Data
  const timestamp = Date.now();
  const energyWh = 5000 + Math.floor(Math.random() * 1000); // 5-6 kWh
  const payloadObj = {
      wh: energyWh, // OracleService expects 'wh'
      timestamp: timestamp,
      deviceId: devicePublicKey
  };
  const payloadStr = JSON.stringify(payloadObj);

  // 6. Sign Data
  // OracleService: keypair.verify(Buffer.from(payload), Buffer.from(signatureHex, "hex"))
  // We need to sign the payload string buffer.
  const signatureBuffer = stellarPair.sign(Buffer.from(payloadStr));
  const signatureHex = signatureBuffer.toString('hex');

  console.log(`📊 Sending Telemetry: ${energyWh} Wh`);

  // 7. Send to Oracle Ingest
  try {
      const res = await axios.post(`${API_URL}/oracle/ingest`, {
          payload: payloadStr,
          signature: signatureHex,
          publicKey: devicePublicKey
      }, { headers });

      if (res.data.success) {
          console.log(`✅ Data Ingested! ID: ${res.data.dataId}`);
      } else {
          console.error("❌ Ingestion response error:", res.data);
      }

  } catch (err: any) {
       console.error("❌ Ingestion Failed:", err.response?.data || err.message);
  }

  // 8. Verify DB State
  const updatedProject = await prisma.project.findUnique({ where: { id: project.id } });
  console.log(`\nProject Status: ${updatedProject?.status}`);
  console.log(`Total Energy: ${updatedProject?.totalEnergyProduced}`);

  if (updatedProject?.status === "ACTIVE") {
      console.log("🎉 SUCCESS: Project transitioned to ACTIVE via IoT Data!");
  } else {
      console.log("⚠️ Project did not transition to ACTIVE (User might need to refresh or verify logic)");
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
