
import axios from "axios";
import { prisma } from "@aethera/database";

const API_URL = "http://localhost:3002/api";

async function main() {
  console.log("Starting Admin Endpoint Verification...");

  // 1. Get an admin user
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (!admin) {
    console.error("No admin found. Cannot test.");
    process.exit(1);
  }
  console.log(`Using admin: ${admin.id}`);

  // 2. Mock Auth Header
  const headers = {
    "x-mock-auth-user-id": admin.id,
  };

  try {
    // 3. Test GET /admin/projects/funded
    console.log("Testing GET /admin/projects/funded...");
    const response = await axios.get(`${API_URL}/admin/projects/funded`, { headers });
    
    if (response.data.success) {
        console.log("✅ GET /admin/projects/funded successful");
        console.log(`Found ${response.data.data.length} funded projects.`);
    } else {
        console.error("❌ GET /admin/projects/funded failed:", response.data);
    }

  } catch (error: any) {
    console.error("❌ Request failed:", error.response?.data || error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
