import { existsSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

const envCandidates = [
  join(process.cwd(), "apps/api/.env"),
  join(process.cwd(), "../../apps/api/.env"),
  join(process.cwd(), ".env"),
  join(process.cwd(), ".env.local"),
];

for (const envPath of envCandidates) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

async function main() {
  const email = process.argv[2] || process.env.ADMIN_EMAIL || "ownyourblogs@gmail.com";
  const role = (process.argv[3] || process.env.ADMIN_ROLE || "ADMIN").toUpperCase();

  if (!["ADMIN", "INVESTOR", "INSTALLER", "UNSET"].includes(role)) {
    throw new Error(`Unsupported role: ${role}`);
  }

  const { prisma } = await import("./index.js");

  console.log(`Setting role ${role} for ${email}...`);

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error(`User with email "${email}" not found.`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: role as any },
  });

  console.log("Role updated successfully.");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
