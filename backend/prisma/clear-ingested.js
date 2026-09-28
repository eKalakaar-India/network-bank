const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting ingestion data cleanup...');
  
  // Clear only ingested data tables, leaving the User table completely untouched
  const deletedRecords = await prisma.record.deleteMany({});
  const deletedImports = await prisma.import.deleteMany({});
  const deletedActivityLogs = await prisma.activityLog.deleteMany({});
  const deletedExportLogs = await prisma.exportLog.deleteMany({});

  console.log(`Successfully cleared:`);
  console.log(`- ${deletedRecords.count} relationship records`);
  console.log(`- ${deletedImports.count} import history logs`);
  console.log(`- ${deletedActivityLogs.count} activity logs`);
  console.log(`- ${deletedExportLogs.count} export logs`);
}

main()
  .catch((e) => {
    console.error('Error clearing ingested data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
