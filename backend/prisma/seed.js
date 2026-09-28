const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Clean all tables
  await prisma.user.deleteMany({});
  await prisma.record.deleteMany({});
  await prisma.import.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.exportLog.deleteMany({});

  // Create new credentials based on request
  const adminPassword = await bcrypt.hash('eK_admin@2025', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'ekalakaartech@gmail.com',
      password: adminPassword,
      name: 'Ekalakaar',
      role: 'ADMIN',
    },
  });

  const staff = await prisma.user.create({
    data: {
      email: 'staff@databank.com',
      password: userPassword,
      name: 'Evelyn Montgomery',
      role: 'USER',
    },
  });

  console.log('Seeded Users:');
  console.log('Admin:', admin.email);
  console.log('Cleared database of all relationship records successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
