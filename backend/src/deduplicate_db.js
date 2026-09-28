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

  const parent = {};
  function find(id) {
    if (!parent[id]) parent[id] = id;
    if (parent[id] === id) return id;
    parent[id] = find(parent[id]);
    return parent[id];
  }
  function union(id1, id2) {
    const root1 = find(id1);
    const root2 = find(id2);
    if (root1 !== root2) {
      parent[root1] = root2;
    }
  }

  const emailMap = new Map();
  const phoneMap = new Map();
  const nameGroups = new Map();

  records.forEach(r => {
    const emails = (r.email || '').toLowerCase().split(/[\s,;/]+/).filter(Boolean);
    const phones = (r.contactNumber || '').split(/[\s,;/]+/).filter(Boolean);
    const nameKey = cleanName(r.nameOfAuthorisedPerson || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    emails.forEach(email => {
      if (emailMap.has(email)) {
        union(r.id, emailMap.get(email));
      } else {
        emailMap.set(email, r.id);
      }
    });

    phones.forEach(phone => {
      if (phoneMap.has(phone)) {
        union(r.id, phoneMap.get(phone));
      } else {
        phoneMap.set(phone, r.id);
      }
    });

    if (nameKey) {
      if (!nameGroups.has(nameKey)) {
        nameGroups.set(nameKey, []);
      }
      nameGroups.get(nameKey).push(r);
    }
  });

  for (const [nameKey, group] of nameGroups.entries()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];

        const emailsA = (a.email || '').toLowerCase().split(/[\s,;/]+/).filter(Boolean);
        const emailsB = (b.email || '').toLowerCase().split(/[\s,;/]+/).filter(Boolean);
        const phonesA = (a.contactNumber || '').split(/[\s,;/]+/).filter(Boolean);
        const phonesB = (b.contactNumber || '').split(/[\s,;/]+/).filter(Boolean);

        let conflict = false;

        if (emailsA.length > 0 && emailsB.length > 0) {
          const emailMatch = emailsA.some(e => emailsB.includes(e));
          if (!emailMatch) conflict = true;
        }

        if (phonesA.length > 0 && phonesB.length > 0) {
          const phoneMatch = phonesA.some(p => phonesB.includes(p));
          if (!phoneMatch) conflict = true;
        }

        if (!conflict) {
          union(a.id, b.id);
        }
      }
    }
  }

  const groups = new Map();
  records.forEach(r => {
    const rootId = find(r.id);
    if (!groups.has(rootId)) {
      groups.set(rootId, []);
    }
    groups.get(rootId).push(r);
  });

  const recordsToUpdate = [];
  const recordIdsToDelete = [];

  for (const [rootId, group] of groups.entries()) {
    if (group.length < 2) continue;

    group.sort((x, y) => (x.srNo || 999999) - (y.srNo || 999999));
    const target = group[0];
    let mergedData = { ...target };

    for (let i = 1; i < group.length; i++) {
      mergeRecords(mergedData, group[i]);
      recordIdsToDelete.push(group[i].id);
    }

    delete mergedData.id;
    delete mergedData.createdAt;
    delete mergedData.updatedAt;

    recordsToUpdate.push({
      id: target.id,
      data: mergedData
    });
  }

  console.log(`Deduplication Plan:`);
  console.log(`- Updating: ${recordsToUpdate.length} records`);
  console.log(`- Soft Deleting: ${recordIdsToDelete.length} duplicate records`);

  if (recordsToUpdate.length > 0) {
    console.log('Applying updates...');
    const batchSize = 100;
    for (let i = 0; i < recordsToUpdate.length; i += batchSize) {
      const batch = recordsToUpdate.slice(i, i + batchSize);
      await prisma.$transaction(
        batch.map(item => prisma.record.update({
          where: { id: item.id },
          data: item.data
        }))
      );
    }
    console.log('Updates applied.');
  }

  if (recordIdsToDelete.length > 0) {
    console.log('Applying soft deletes...');
    const batchSize = 500;
    for (let i = 0; i < recordIdsToDelete.length; i += batchSize) {
      const batch = recordIdsToDelete.slice(i, i + batchSize);
      await prisma.record.updateMany({
        where: { id: { in: batch } },
        data: { isDeleted: true }
      });
    }
    console.log('Soft deletes applied.');
  }

  console.log('Database deduplication complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
