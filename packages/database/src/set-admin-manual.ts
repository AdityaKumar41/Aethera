import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(__dirname, "../../../.env") });
config({ path: path.resolve(__dirname, "../../../.env.local") });

import prisma from "./index.js";

async function main() {
  const email = "adityamoharana80@gmail.com";
  const role = "ADMIN";

  console.log(`Setting role ${role} for ${email}...`);

  const user = await prisma.user.findFirst({
    where: { email: email },
  });

  if (!user) {
    console.error(`\n❌ User with email "${email}" not found.\n`);
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: role },
  });

  console.log(`\n✅ User role updated successfully!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
