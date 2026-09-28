const { PrismaClient } = require('@prisma/client');
const { validateRow } = require('./services/validator');
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching active records...');
  const records = await prisma.record.findMany({
    where: { isDeleted: false },
    orderBy: { srNo: 'asc' }
  });
  console.log(`Analyzing ${records.length} records...`);

  let updatedCount = 0;
  const batchSize = 100;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const updates = [];
    
    batch.forEach(rec => {
      const originalName = rec.nameOfAuthorisedPerson;
      const originalOrg = rec.nameOfOrganization;
      const originalCity = rec.districtCity;
      const originalState = rec.state;
      
      const validation = validateRow({ ...rec });
      const cleaned = validation.data;
      
      const changed = cleaned.nameOfAuthorisedPerson !== originalName ||
                      cleaned.nameOfOrganization !== originalOrg ||
                      cleaned.districtCity !== originalCity ||
                      cleaned.state !== originalState;
                      
      if (changed) {
        // Strip out read-only properties
        delete cleaned.id;
        delete cleaned.createdAt;
        delete cleaned.updatedAt;
        
        updates.push(
          prisma.record.update({
            where: { id: rec.id },
            data: cleaned
          })
        );
        updatedCount++;
      }
    });

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }
  }

  console.log(`Successfully updated ${updatedCount} records with cleaned names and extracted locations!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
