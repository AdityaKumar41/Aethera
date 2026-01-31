import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(__dirname, "../../../.env") });
config({ path: path.resolve(__dirname, "../../../.env.local") });

import prisma from "./index";

async function main() {
  const email = "adityamoharana480@gmail.com";
  console.log(`Checking user: ${email}`);

  const user = await prisma.user.findFirst({
    where: { email: email },
    select: { id: true, email: true, stellarPubKey: true, stellarSecretEncrypted: true }
  });

  if (!user) {
    console.error(`❌ User ${email} not found.`);
  } else {
    console.log(`✅ User found:`, {
        id: user.id,
        email: user.email,
        stellarPubKey: user.stellarPubKey,
        hasSecret: !!user.stellarSecretEncrypted
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
