#!/usr/bin/env node
/**
 * Set User Role Script
 * 
 * Usage: node scripts/set-user-role.js <email> <role>
 * 
 * Roles: INVESTOR, INSTALLER, ADMIN
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const role = process.argv[3]?.toUpperCase();

  if (!email) {
    // List all users if no email provided
    console.log("\n📋 Current Users:\n");
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        kycStatus: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (users.length === 0) {
      console.log("No users found in database.");
    } else {
      console.log("Email                              | Role      | KYC Status  | Name");
      console.log("-----------------------------------+-----------+-------------+----------------");
      users.forEach(u => {
        const email = (u.email || 'N/A').padEnd(35);
        const role = (u.role || 'N/A').padEnd(10);
        const kyc = (u.kycStatus || 'N/A').padEnd(12);
        const name = u.name || 'N/A';
        console.log(`${email}| ${role}| ${kyc}| ${name}`);
      });
    }
    
    console.log("\n💡 To change a user's role, run:");
    console.log("   node scripts/set-user-role.js <email> <INVESTOR|INSTALLER|ADMIN>\n");
    return;
  }

  if (!role || !['INVESTOR', 'INSTALLER', 'ADMIN'].includes(role)) {
    console.error("\n❌ Invalid role. Must be: INVESTOR, INSTALLER, or ADMIN\n");
    process.exit(1);
  }

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
  console.log(`   Email: ${updated.email}`);
  console.log(`   Role:  ${user.role} → ${updated.role}\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
