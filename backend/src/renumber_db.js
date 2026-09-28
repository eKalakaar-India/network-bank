const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching active records...');
  const records = await prisma.record.findMany({
    where: { isDeleted: false },
    orderBy: { srNo: 'asc' }
  });
  console.log(`Found ${records.length} active records to re-index.`);

  console.log('Updating serial numbers...');
  const batchSize = 100;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    await prisma.$transaction(
      batch.map((rec, index) => {
        const newSrNo = i + index + 1;
        return prisma.record.update({
          where: { id: rec.id },
          data: { srNo: newSrNo }
        });
      })
    );
  }

  console.log('Successfully re-indexed serial numbers!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
