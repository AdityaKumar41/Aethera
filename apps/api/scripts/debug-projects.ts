
import { prisma } from "@aethera/database";

async function main() {
  console.log("Checking Project Status...");

  const projects = await prisma.project.findMany({
    include: {
      iotDevices: true,
      installer: true,
    }
  });

  console.log(`Found ${projects.length} projects.`);
  projects.forEach(p => {
    console.log(`- [${p.id}] ${p.name}`);
    console.log(`  Status: ${p.status}`);
    console.log(`  Funding: ${p.fundingRaised} / ${p.fundingTarget}`);
    console.log(`  Devices: ${p.iotDevices.length}`);
    console.log(`  Installer: ${p.installer.email}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
