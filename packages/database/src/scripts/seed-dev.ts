import dotenv from "dotenv";
import { join } from "path";

// Load environment variables immediately
const envPath = join(process.cwd(), "../../apps/api/.env");
dotenv.config({ path: envPath });

async function main() {
  // Use dynamic import to ensure prisma client is initialized AFTER env is loaded
  const { prisma } = await import("../index.js");
  console.log("🌱 Starting seeding...");

  try {
    // 1. Create Users
    const admin = await prisma.user.upsert({
      where: { email: "ownyourblogs@gmail.com" },
      update: { role: "ADMIN" },
      create: {
        id: "user_owner_admin",
        email: "ownyourblogs@gmail.com",
        name: "Owner Admin",
        role: "ADMIN",
      },
    });

    await prisma.user.upsert({
      where: { email: "adityamoharana80@gmail.com" },
      update: { role: "ADMIN" },
      create: {
        id: "user_aditya_admin",
        email: "adityamoharana80@gmail.com",
        name: "Aditya Admin",
        role: "ADMIN",
      },
    });

    const installer = await prisma.user.upsert({
      where: { email: "test-installer@aethera.id" },
      update: { role: "INSTALLER" },
      create: {
        id: "user_test_installer",
        email: "test-installer@aethera.id",
        name: "Test Installer",
        role: "INSTALLER",
        company: "Solar Systems Inc",
        country: "India",
      },
    });

    const investor = await prisma.user.upsert({
      where: { email: "test-investor@aethera.id" },
      update: { role: "INVESTOR" },
      create: {
        id: "user_test_investor",
        email: "test-investor@aethera.id",
        name: "Test Investor",
        role: "INVESTOR",
        country: "USA",
      },
    });

    console.log("✅ Users created");

    // 2. Create Projects
    const project1 = await prisma.project.upsert({
      where: { tokenSymbol: "SOL1" },
      update: {},
      create: {
        id: "project_sol1",
        installerId: installer.id,
        name: "Odisha Solar Farm",
        description: "A large-scale solar project in Rural Odisha providing clean energy to 500 homes.",
        location: "Bhubaneswar",
        country: "India",
        capacity: 50.5,
        expectedYield: 12.5,
        fundingTarget: 50000,
        fundingRaised: 12500,
        pricePerToken: 1.0,
        tokenSymbol: "SOL1",
        status: "ACTIVE",
        totalEnergyProduced: 2500.5,
        currentYieldRate: 8.2,
        lastProductionUpdate: new Date(),
      },
    });

    const project2 = await prisma.project.upsert({
      where: { tokenSymbol: "SOL2" },
      update: {},
      create: {
        id: "project_sol2",
        installerId: installer.id,
        name: "Vizag Industrial Rooftop",
        description: "Industrial rooftop installation for a manufacturing plant in Vizag.",
        location: "Visakhapatnam",
        country: "India",
        capacity: 25.0,
        expectedYield: 15.0,
        fundingTarget: 25000,
        fundingRaised: 0,
        pricePerToken: 1.0,
        tokenSymbol: "SOL2",
        status: "FUNDING",
      },
    });

    console.log("✅ Projects created");

    // 3. Create IoT Device
    const device = await prisma.ioTDevice.upsert({
      where: { publicKey: "GB5L6PL3BB2BXYAVMGHWCPWZDCQNTTG6RLBPMTPY35JWM6GOHOWV4LV6" },
      update: {},
      create: {
        id: "device_001",
        projectId: project1.id,
        publicKey: "GB5L6PL3BB2BXYAVMGHWCPWZDCQNTTG6RLBPMTPY35JWM6GOHOWV4LV6",
        status: "ACTIVE",
      },
    });

    console.log("✅ IoT Device created");

    // 4. Create Investment
    await prisma.investment.create({
      data: {
        investorId: investor.id,
        projectId: project1.id,
        amount: 1000,
        tokenAmount: 1000,
        pricePerToken: 1.0,
        status: "CONFIRMED",
        txHash: "T" + Math.random().toString(36).substring(7),
      },
    });

    console.log("✅ Investment created");

    // 5. Create production data
    const now = new Date();
    for (let i = 0; i < 10; i++) {
      const recordedAt = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      await prisma.productionData.create({
        data: {
          projectId: project1.id,
          iotDeviceId: device.id,
          energyProduced: 25 + Math.random() * 10,
          recordedAt: recordedAt,
          source: "IOT",
          carbonCredits: 0.02 + Math.random() * 0.01,
        },
      });
    }

    console.log("✅ Production data created");
    console.log("🌱 Seeding completed successfully!");
  } catch (e) {
    console.error("❌ Seeding failed:", e);
    throw e;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
