const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const CITY_TO_STATE = require('./services/cities_to_states.json');

async function main() {
  console.log('Fetching records with city but missing state...');
  const records = await prisma.record.findMany({
    where: {
      isDeleted: false,
      districtCity: { not: null },
      OR: [
        { state: null },
        { state: '' }
      ]
    }
  });

  console.log(`Found ${records.length} records needing state assignment.`);

  let updatedCount = 0;
  const batchSize = 100;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    const updates = [];
    batch.forEach(rec => {
      const cityClean = String(rec.districtCity).trim().toLowerCase();
      const mappedState = CITY_TO_STATE[cityClean];
      if (mappedState) {
        updates.push(
          prisma.record.update({
            where: { id: rec.id },
            data: { state: mappedState }
          })
        );
        updatedCount++;
      }
    });

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }
  }

  console.log(`Successfully assigned state to ${updatedCount} records!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
