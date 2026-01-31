
import { prisma } from "@aethera/database";
import axios from "axios";

const API_URL = "http://localhost:3002/api";

async function main() {
  console.log("Starting IoT Activation Verification...");

  // 1. Get an admin user
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (!admin) {
    console.error("No admin found.");
    return;
  }
  const headers = { "x-mock-auth-user-id": admin.id };

  // 2. Find a FUNDED project with 0 devices
  let project = await prisma.project.findFirst({
    where: { 
      status: "FUNDED",
      iotDevices: { none: {} }
    }
  });

  if (!project) {
    console.log("No clean FUNDED project found. Creating one or finding one to reset...");
    // Just find any funded project and delete its devices for the test if needed, or stick to what we have.
    // Let's assume one exists from previous steps.
    const projects = await prisma.project.findMany({ where: { status: "FUNDED" } });
    if (projects.length > 0) {
        project = projects[0];
        await prisma.ioTDevice.deleteMany({ where: { projectId: project.id } });
        console.log(`Using project ${project.id} (cleared devices)`);
    } else {
        console.error("No FUNDED projects available to test.");
        return;
    }
  } else {
      console.log(`Using project ${project.id} (already has 0 devices)`);
  }

  // 3. Attempt Activation (Should FAIL)
  console.log("\n[Test 1] Attempting activation without devices...");
  try {
    await axios.post(`${API_URL}/admin/projects/${project.id}/activate`, {}, { headers });
    console.error("❌ Activation succeeded but SHOULD HAVE FAILED!");
  } catch (error: any) {
    if (error.response?.status === 400 && error.response?.data?.error?.includes("No IoT devices connected")) {
        console.log("✅ Activation failed as expected: " + error.response.data.error);
    } else {
        console.error("❌ Unexpected error:", error.response?.data || error.message);
    }
  }

  // 4. Add a Device
  console.log("\n[Test 2] Adding IoT Device...");
  await prisma.ioTDevice.create({
    data: {
        projectId: project.id,
        publicKey: `test-device-${Date.now()}`,
        status: "ACTIVE"
    }
  });
  console.log("✅ Device added.");

  // 5. Attempt Activation (Should SUCCEED)
  console.log("\n[Test 3] Attempting activation WITH device...");
  try {
    const res = await axios.post(`${API_URL}/admin/projects/${project.id}/activate`, {}, { headers });
    if (res.data.success) {
        console.log("✅ Activation succeeded!");
        console.log("Project status:", res.data.data.status);
    }
  } catch (error: any) {
    console.error("❌ Activation failed:", error.response?.data || error.message);
  }

}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
