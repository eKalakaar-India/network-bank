const { PrismaClient } = require('@prisma/client');
const { cleanName, mergeRecords } = require('./services/validator');
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching active records...');
  const records = await prisma.record.findMany({
    where: { isDeleted: false },
    orderBy: { srNo: 'asc' }
  });
  console.log(`Total active records: ${records.length}`);

  // Index records by nameKey
  const nameMap = new Map();
  records.forEach(r => {
    const nameKey = cleanName(r.nameOfAuthorisedPerson || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    r._nameKey = nameKey;
    r._emails = (r.email || '').toLowerCase().split(/[\s,;/]+/).filter(Boolean);
    r._phones = (r.contactNumber || '').split(/[\s,;/]+/).filter(Boolean);
    
    if (nameKey) {
      if (!nameMap.has(nameKey)) {
        nameMap.set(nameKey, []);
      }
      nameMap.get(nameKey).push(r);
    }
  });

  let duplicateGroups = 0;
  let totalDuplicatesDetected = 0;

  for (const [nameKey, group] of nameMap.entries()) {
    if (group.length < 2) continue;
    
    // We will find duplicates within this name group
    const mergedIndices = new Set();
    
    for (let i = 0; i < group.length; i++) {
      if (mergedIndices.has(i)) continue;
      
      const recordA = group[i];
      let matches = [];
      
      for (let j = i + 1; j < group.length; j++) {
        if (mergedIndices.has(j)) continue;
        const recordB = group[j];
        
        // Match condition: common email or common phone
        const hasCommonEmail = recordA._emails.some(e => recordB._emails.includes(e));
        const hasCommonPhone = recordA._phones.some(p => recordB._phones.includes(p));
        
        // Or if both have no contact info but all other fields are identical
        const bothEmptyContact = recordA._emails.length === 0 && recordB._emails.length === 0 &&
                                 recordA._phones.length === 0 && recordB._phones.length === 0;
        
        const isIdentical = bothEmptyContact && 
                            (recordA.nameOfOrganization || '').toLowerCase().trim() === (recordB.nameOfOrganization || '').toLowerCase().trim() &&
                            (recordA.designation || '').toLowerCase().trim() === (recordB.designation || '').toLowerCase().trim() &&
                            (recordA.state || '').toLowerCase().trim() === (recordB.state || '').toLowerCase().trim() &&
                            (recordA.districtCity || '').toLowerCase().trim() === (recordB.districtCity || '').toLowerCase().trim();

        if (hasCommonEmail || hasCommonPhone || isIdentical) {
          matches.push(j);
          mergedIndices.add(j);
        }
      }
      
      if (matches.length > 0) {
        duplicateGroups++;
        totalDuplicatesDetected += matches.length;
      }
    }
  }

  console.log(`Duplicate scan summary:`);
  console.log(`- Duplicate groups identified: ${duplicateGroups}`);
  console.log(`- Total records to merge/delete: ${totalDuplicatesDetected}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
