import { prisma } from "../packages/database/src/index";
async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, stellarPubKey: true }
  });
  console.log(JSON.stringify(users, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
