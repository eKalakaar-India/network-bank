const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database records...');
  const deletedRecords = await prisma.record.deleteMany({});
  console.log(`Deleted ${deletedRecords.count} records.`);
  
  const deletedImports = await prisma.import.deleteMany({});
  console.log(`Deleted ${deletedImports.count} imports.`);
  
  const deletedLogs = await prisma.activityLog.deleteMany({});
  console.log(`Deleted ${deletedLogs.count} activity logs.`);
  
  const deletedExports = await prisma.exportLog.deleteMany({});
  console.log(`Deleted ${deletedExports.count} export logs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
