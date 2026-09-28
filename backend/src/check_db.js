const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.record.count({ where: { isDeleted: false } });
  console.log(`Current active records: ${count}`);
  
  if (count > 0) {
    const samples = await prisma.record.findMany({
      where: { isDeleted: false },
      take: 5
    });
    console.log('Sample records:', JSON.stringify(samples, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
