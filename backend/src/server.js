const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Papa = require('papaparse');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const { TARGET_SCHEMA, autoMapHeaders } = require('./services/mappingEngine');
const { validateRow, normalizePhoneNumber, cleanName, isSamePerson, mergeRecords } = require('./services/validator');
const { authenticateToken, requireAdmin } = require('./middleware/auth');

require('dotenv').config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'luxury_cherrywood_vault_secret_2026';

const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'https://network-bank-olns-33ad6s5y8-e-kalakaar-s-projects.vercel.app/'
    // Add your deployed frontend URL here
    // 'https://your-frontend-domain.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
};

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json({ limit: '10mb' }));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV or Excel spreadsheets are permitted.'));
    }
  }
});

// Basic Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP'
});
app.use('/api/', apiLimiter);

// ----------------------------------------------------
// AUTHENTICATION ROUTES
// ----------------------------------------------------

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Please furnish all required fields' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'This email is already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, password: hashedPassword }
    });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  res.json({ message: `A secure reset token has been dispatched to ${email} (Vault Recovery Sim).` });
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

// ----------------------------------------------------
// RECORD / RELATIONSHIP DATABASE CRUD ROUTES
// ----------------------------------------------------

app.get('/api/records', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      name = '',
      category = '',
      state = '',
      reliability = '',
      sortBy = 'srNo',
      sortOrder = 'asc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      isDeleted: false
    };

    if (search) {
      where.OR = [
        { nameOfOrganization: { contains: search } },
        { nameOfAuthorisedPerson: { contains: search } },
        { email: { contains: search } },
        { contactNumber: { contains: search } },
        { sector: { contains: search } },
        { strengthExpertise: { contains: search } }
      ];
    }

    if (category) {
      where.category = category;
    }

    if (name) {
      where.nameOfAuthorisedPerson = { contains: name };
    }

    if (state) {
      where.state = state;
    }

    if (reliability) {
      where.reliability = reliability;
    }

    const [total, records] = await prisma.$transaction([
      prisma.record.count({ where }),
      prisma.record.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take
      })
    ]);

    const categoriesGroup = await prisma.record.groupBy({
      by: ['category'],
      _count: { id: true },
      where: { isDeleted: false }
    });

    const statesGroup = await prisma.record.groupBy({
      by: ['state'],
      _count: { id: true },
      where: { isDeleted: false }
    });

    res.json({
      records,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      },
      aggregates: {
        categories: categoriesGroup,
        states: statesGroup
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create manual record
app.post('/api/records', authenticateToken, async (req, res) => {
  try {
    const data = req.body;
    
    if (data.contactNumber) {
      data.contactNumber = normalizePhoneNumber(data.contactNumber);
    }

    const lastRecord = await prisma.record.findFirst({
      orderBy: { srNo: 'desc' }
    });
    data.srNo = lastRecord ? (lastRecord.srNo || 0) + 1 : 1;

    const record = await prisma.record.create({ data });
    
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        userName: req.user.name,
        action: 'CREATE_RECORD',
        details: `Manually added relationship record for: ${record.nameOfOrganization || record.nameOfAuthorisedPerson}`
      }
    });

    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update record
app.put('/api/records/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (data.contactNumber) {
      data.contactNumber = normalizePhoneNumber(data.contactNumber);
    }
    
    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;

    const record = await prisma.record.update({
      where: { id },
      data
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        userName: req.user.name,
        action: 'UPDATE_RECORD',
        details: `Updated relationship record ID: ${id} (${record.nameOfOrganization || record.nameOfAuthorisedPerson})`
      }
    });

    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete record (Soft-delete)
app.delete('/api/records/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const record = await prisma.record.update({
      where: { id },
      data: { isDeleted: true }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        userName: req.user.name,
        action: 'DELETE_RECORD',
        details: `Deleted relationship record ID: ${id} (${record.nameOfOrganization})`
      }
    });

    res.json({ message: 'Record soft deleted successfully', record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Delete
app.post('/api/records/bulk-delete', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'List of record IDs required' });
    }

    await prisma.record.updateMany({
      where: { id: { in: ids } },
      data: { isDeleted: true }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        userName: req.user.name,
        action: 'BULK_DELETE_RECORDS',
        details: `Bulk deleted ${ids.length} records.`
      }
    });

    res.json({ message: `Successfully cleared ${ids.length} relationship vault entries` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// ADVANCED AI SUGGESTIONS & DUPLICATE MERGE ENDPOINTS
// ----------------------------------------------------

// Get advanced AI suggestions for a record
app.get('/api/records/:id/suggestions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const record = await prisma.record.findUnique({ where: { id } });

    if (!record) {
      return res.status(444).json({ error: 'Record not found' });
    }

    const suggestions = {
      category: null,
      sector: null,
      potentialDuplicates: []
    };

    // 1. Suggest Category based on email domain
    if (record.category === 'Other' || !record.category) {
      const email = record.email?.toLowerCase() || '';
      if (email.endsWith('.gov') || email.endsWith('.gov.in') || email.includes('gov')) {
        suggestions.category = 'Govt';
      } else if (email.endsWith('.edu') || email.endsWith('.ac.in') || email.includes('univ')) {
        suggestions.category = 'Academic';
      } else if (email.endsWith('.org') || email.includes('foundation') || email.includes('ngo')) {
        suggestions.category = 'NGO';
      } else if (email.endsWith('.com') || email.includes('corp') || email.includes('tata')) {
        suggestions.category = 'Corporate';
      }
    }

    // 2. Suggest Sectors based on strengthExpertise context keywords
    if (!record.sector) {
      const expertise = (record.strengthExpertise || '').toLowerCase();
      if (expertise.includes('health') || expertise.includes('medical') || expertise.includes('sanitation')) {
        suggestions.sector = 'Public Health';
      } else if (expertise.includes('cyber') || expertise.includes('computing') || expertise.includes('tech')) {
        suggestions.sector = 'Technology & IT';
      } else if (expertise.includes('diplomacy') || expertise.includes('international') || expertise.includes('treaty')) {
        suggestions.sector = 'Foreign Relations';
      } else if (expertise.includes('governance') || expertise.includes('policy') || expertise.includes('reform')) {
        suggestions.sector = 'Policy & Governance';
      }
    }

    // 3. Find potential duplicates based on organization similarity
    if (record.nameOfOrganization) {
      const similar = await prisma.record.findMany({
        where: {
          isDeleted: false,
          id: { not: id },
          nameOfOrganization: { contains: record.nameOfOrganization.substring(0, 4) }
        },
        take: 3
      });
      suggestions.potentialDuplicates = similar;
    }

    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Advanced Conflict Resolution - Merge two duplicate records
app.post('/api/records/merge', authenticateToken, async (req, res) => {
  try {
    const { sourceId, targetId, mergedFields } = req.body;
    if (!sourceId || !targetId || !mergedFields) {
      return res.status(400).json({ error: 'Missing merge identifiers or field list' });
    }

    // Soft delete source record
    await prisma.record.update({
      where: { id: sourceId },
      data: { isDeleted: true }
    });

    // Update target record with merged fields
    const updatedRecord = await prisma.record.update({
      where: { id: targetId },
      data: mergedFields
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        userName: req.user.name,
        action: 'MERGE_RECORDS',
        details: `Merged duplicate record ID: ${sourceId} into Target ID: ${targetId} (${updatedRecord.nameOfOrganization})`
      }
    });

    res.json({ message: 'Duplicate conflict resolved and entries merged.', record: updatedRecord });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run bulk deduplication on all database records
app.post('/api/records/deduplicate', authenticateToken, async (req, res) => {
  try {
    const records = await prisma.record.findMany({
      where: { isDeleted: false },
      orderBy: { srNo: 'asc' }
    });

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

    if (recordsToUpdate.length > 0) {
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
    }

    if (recordIdsToDelete.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < recordIdsToDelete.length; i += batchSize) {
        const batch = recordIdsToDelete.slice(i, i + batchSize);
        await prisma.record.updateMany({
          where: { id: { in: batch } },
          data: { isDeleted: true }
        });
      }
    }

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        userName: req.user.name,
        action: 'DEDUPLICATE_RECORDS',
        details: `Ran bulk deduplication: Merged ${recordsToUpdate.length} target records and removed ${recordIdsToDelete.length} duplicates.`
      }
    });

    res.json({
      success: true,
      updatedCount: recordsToUpdate.length,
      deletedCount: recordIdsToDelete.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// SMART DATASET PARSING & AI FIELD MAPPING
// ----------------------------------------------------

// Ingest file and return columns with heuristic map & preview data
app.post('/api/upload/preview', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    
    let rawRows = [];
    let headers = [];

    if (ext === '.csv') {
      const csvData = fs.readFileSync(filePath, 'utf8');
      const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
      rawRows = parsed.data.map((row, idx) => ({ ...row, __sheetName: 'CSV', __rowNum: idx + 2 }));
      headers = parsed.meta.fields || [];
    } else {
      const workbook = XLSX.readFile(filePath);
      const uniqueHeaders = new Set();
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const parsed = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        parsed.forEach((row, idx) => {
          row.__sheetName = sheetName;
          row.__rowNum = idx + 2;
        });
        rawRows = rawRows.concat(parsed);
        parsed.forEach(row => {
          Object.keys(row).forEach(key => {
            if (key !== '__sheetName' && key !== '__rowNum') {
              uniqueHeaders.add(key);
            }
          });
        });
      });
      headers = Array.from(uniqueHeaders);
    }

    const recommendedMapping = autoMapHeaders(headers);

    res.json({
      fileName: req.file.originalname,
      filePath: req.file.filename,
      headers,
      recommendedMapping,
      targetSchema: TARGET_SCHEMA,
      preview: rawRows.slice(0, 5),
      totalRows: rawRows.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import finalized and mapped records
app.post('/api/upload/import', authenticateToken, async (req, res) => {
  try {
    const { filePath, mapping } = req.body;
    if (!filePath || !mapping) {
      return res.status(400).json({ error: 'Missing file path or schema mapping keys' });
    }

    const fullPath = path.join(uploadDir, filePath);
    if (!fs.existsSync(fullPath)) {
      return res.status(400).json({ error: 'Uploaded file has expired or was removed from workspace' });
    }

    const ext = path.extname(fullPath).toLowerCase();
    let rawRows = [];

    if (ext === '.csv') {
      const csvData = fs.readFileSync(fullPath, 'utf8');
      const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
      rawRows = parsed.data.map((row, idx) => ({ ...row, __sheetName: 'CSV', __rowNum: idx + 2 }));
    } else {
      const workbook = XLSX.readFile(fullPath);
      workbook.SheetNames.forEach(sheetName => {
        const parsed = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
        parsed.forEach((row, idx) => {
          row.__sheetName = sheetName;
          row.__rowNum = idx + 2;
        });
        rawRows = rawRows.concat(parsed);
      });
    }

    const recordsToCreate = [];
    const recordsToUpdate = [];
    let duplicatesCount = 0;
    let failedCount = 0;
    let successCount = 0;
    const diagnosticLogs = [];

    const lastRecord = await prisma.record.findFirst({
      orderBy: { srNo: 'desc' }
    });
    let currentSrNo = lastRecord ? (lastRecord.srNo || 0) : 0;

    const existingRecords = await prisma.record.findMany({
      where: { isDeleted: false }
    });

    // 1. Pre-index existing database records by their normalized name keys
    const dbNameMap = new Map();
    existingRecords.forEach(r => {
      r._nameKey = cleanName(r.nameOfAuthorisedPerson || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      r._emails = (r.email || '').toLowerCase().split(/[\s,]+/);
      r._phones = (r.contactNumber || '').split(/[\s,]+/);
      
      if (r._nameKey) {
        if (!dbNameMap.has(r._nameKey)) {
          dbNameMap.set(r._nameKey, []);
        }
        dbNameMap.get(r._nameKey).push(r);
      }
    });

    // 2. Indexes for batch processing records (to avoid double looping batch arrays)
    const createNameMap = new Map();
    const updateNameMap = new Map();

    // Fast O(1) comparison helper using pre-computed fields
    const isSamePersonFast = (a, b) => {
      if (!a._nameKey || !b._nameKey) return false;
      if (a._nameKey !== b._nameKey) return false;
      
      const hasCommonEmail = a._emails.some(e => e && b._emails.includes(e));
      if (hasCommonEmail) return true;
      
      const hasCommonPhone = a._phones.some(p => p && b._phones.includes(p));
      if (hasCommonPhone) return true;
      
      return false;
    };

    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i];
      const mappedRecord = {};

      for (const [rawHeader, targetDbKey] of Object.entries(mapping)) {
        if (targetDbKey && raw[rawHeader] !== undefined) {
          const val = String(raw[rawHeader]).trim();
          if (val) {
            if (mappedRecord[targetDbKey]) {
              mappedRecord[targetDbKey] = `${mappedRecord[targetDbKey]} ${val}`;
            } else {
              mappedRecord[targetDbKey] = val;
            }
          }
        }
      }

      const isRecordEmpty = Object.values(mappedRecord).every(val => !val);
      if (isRecordEmpty) {
        continue;
      }

      const validation = validateRow(mappedRecord);
      const validatedData = validation.data;

      if (!validation.valid) {
        failedCount++;
        diagnosticLogs.push({ 
          rowNumber: raw.__rowNum || (i + 1), 
          sheetName: raw.__sheetName || 'N/A', 
          error: validation.errors.join(', '), 
          warnings: validation.warnings 
        });
        continue;
      }

      // Clean name and phone formats
      if (validatedData.nameOfAuthorisedPerson) {
        validatedData.nameOfAuthorisedPerson = cleanName(validatedData.nameOfAuthorisedPerson);
      }
      if (validatedData.nameOfOrganization) {
        validatedData.nameOfOrganization = cleanName(validatedData.nameOfOrganization);
      }
      validatedData.contactNumber = normalizePhoneNumber(validatedData.contactNumber) || null;

      // Pre-compute matching keys on current row
      const nameKey = (validatedData.nameOfAuthorisedPerson || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      validatedData._nameKey = nameKey;
      validatedData._emails = (validatedData.email || '').toLowerCase().split(/[\s,]+/);
      validatedData._phones = (validatedData.contactNumber || '').split(/[\s,]+/);

      if (nameKey) {
        // A. Check matches in the current batch scheduled for creation
        const batchMatches = createNameMap.get(nameKey) || [];
        const batchMatch = batchMatches.find(r => isSamePersonFast(r, validatedData));
        if (batchMatch) {
          mergeRecords(batchMatch, validatedData);
          batchMatch._emails = (batchMatch.email || '').toLowerCase().split(/[\s,]+/);
          batchMatch._phones = (batchMatch.contactNumber || '').split(/[\s,]+/);
          duplicatesCount++;
          continue;
        }

        // B. Check matches in the current batch scheduled for updates
        const updateMatches = updateNameMap.get(nameKey) || [];
        const updateMatch = updateMatches.find(r => isSamePersonFast(r.data, validatedData));
        if (updateMatch) {
          mergeRecords(updateMatch.data, validatedData);
          updateMatch.data._emails = (updateMatch.data.email || '').toLowerCase().split(/[\s,]+/);
          updateMatch.data._phones = (updateMatch.data.contactNumber || '').split(/[\s,]+/);
          duplicatesCount++;
          continue;
        }

        // C. Check matches in the database (existingRecords index lookup)
        const dbMatches = dbNameMap.get(nameKey) || [];
        const dbMatch = dbMatches.find(r => isSamePersonFast(r, validatedData));
        if (dbMatch) {
          const mergedData = { ...dbMatch };
          mergeRecords(mergedData, validatedData);
          mergedData._emails = (mergedData.email || '').toLowerCase().split(/[\s,]+/);
          mergedData._phones = (mergedData.contactNumber || '').split(/[\s,]+/);

          // Strip Prisma read-only fields
          delete mergedData.id;
          delete mergedData.createdAt;
          delete mergedData.updatedAt;

          const updateObj = { id: dbMatch.id, data: mergedData };
          recordsToUpdate.push(updateObj);
          
          if (!updateNameMap.has(nameKey)) {
            updateNameMap.set(nameKey, []);
          }
          updateNameMap.get(nameKey).push(updateObj);
          duplicatesCount++;
          continue;
        }
      }

      // D. Brand new unique record
      currentSrNo++;
      validatedData.srNo = currentSrNo;
      recordsToCreate.push(validatedData);
      
      if (nameKey) {
        if (!createNameMap.has(nameKey)) {
          createNameMap.set(nameKey, []);
        }
        createNameMap.get(nameKey).push(validatedData);
      }
      successCount++;
    }

    if (recordsToCreate.length > 0) {
      const cleanCreateData = recordsToCreate.map(r => {
        const copy = { ...r };
        delete copy._nameKey;
        delete copy._emails;
        delete copy._phones;
        return copy;
      });
      await prisma.record.createMany({
        data: cleanCreateData
      });
    }

    if (recordsToUpdate.length > 0) {
      await prisma.$transaction(
        recordsToUpdate.map(item => {
          const copy = { ...item.data };
          delete copy._nameKey;
          delete copy._emails;
          delete copy._phones;
          return prisma.record.update({
            where: { id: item.id },
            data: copy
          });
        })
      );
    }

    const importLog = await prisma.import.create({
      data: {
        fileName: path.basename(fullPath),
        fileType: ext.replace('.', '').toUpperCase(),
        totalRows: rawRows.length,
        successfullyImported: successCount,
        failedRows: failedCount,
        duplicateRows: duplicatesCount,
        status: failedCount > 0 ? 'PARTIAL' : 'COMPLETED',
        logDetails: JSON.stringify(diagnosticLogs)
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        userName: req.user.name,
        action: 'IMPORT_FILE',
        details: `Imported file: ${importLog.fileName}. Imported: ${successCount}, Skips: ${failedCount + duplicatesCount}`
      }
    });

    res.json({
      success: true,
      importLog,
      logs: diagnosticLogs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/imports', authenticateToken, async (req, res) => {
  try {
    const logs = await prisma.import.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// EXPORTING ROUTES
// ----------------------------------------------------

app.get('/api/export/csv', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.query;
    let where = { isDeleted: false };
    
    if (ids) {
      const idArray = ids.split(',');
      where.id = { in: idArray };
    }

    const records = await prisma.record.findMany({
      where,
      orderBy: { srNo: 'asc' }
    });

    const csvRows = records.map(r => ({
      'Sr No': r.srNo || '',
      'Category': r.category || '',
      'Name of Organization': r.nameOfOrganization || '-',
      'Name of Authorised Person/ Expert': r.nameOfAuthorisedPerson || '-',
      'Designation': r.designation || '-',
      'Sector': r.sector || '-',
      'Strength/ Expertise/ Specilisation': r.strengthExpertise || '-',
      'Contact Number': r.contactNumber || '-',
      'Email': r.email || '-',
      'State': r.state || '-',
      'District/City': r.districtCity || '-',
      'Languages': r.languages || '-',
      'Scope of Collaboration/ Relationship with Us': r.scopeOfCollaboration || '-',
      'Reliability (Time, Resource, etc)': r.reliability || '-',
      'Remarks': r.remarks || '-'
    }));

    const csvString = Papa.unparse(csvRows);
    
    await prisma.exportLog.create({
      data: {
        userId: req.user.id,
        userName: req.user.name,
        fileType: 'CSV',
        recordsCount: records.length
      }
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=Network_Data_Bank_Export_${Date.now()}.csv`);
    res.status(200).send(csvString);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/export/xlsx', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.query;
    let where = { isDeleted: false };
    
    if (ids) {
      const idArray = ids.split(',');
      where.id = { in: idArray };
    }

    const records = await prisma.record.findMany({
      where,
      orderBy: { srNo: 'asc' }
    });

    const excelRows = records.map(r => ({
      'Sr No': r.srNo || '',
      'Category': r.category || '',
      'Name of Organization': r.nameOfOrganization || '-',
      'Name of Authorised Person/ Expert': r.nameOfAuthorisedPerson || '-',
      'Designation': r.designation || '-',
      'Sector': r.sector || '-',
      'Strength/ Expertise/ Specilisation': r.strengthExpertise || '-',
      'Contact Number': r.contactNumber || '-',
      'Email': r.email || '-',
      'State': r.state || '-',
      'District/City': r.districtCity || '-',
      'Languages': r.languages || '-',
      'Scope of Collaboration/ Relationship with Us': r.scopeOfCollaboration || '-',
      'Reliability (Time, Resource, etc)': r.reliability || '-',
      'Remarks': r.remarks || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Network Data');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    await prisma.exportLog.create({
      data: {
        userId: req.user.id,
        userName: req.user.name,
        fileType: 'XLSX',
        recordsCount: records.length
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Network_Data_Bank_Export_${Date.now()}.xlsx`);
    res.status(200).send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// ANALYTICS & AUDIT TRAILS ROUTES
// ----------------------------------------------------

app.get('/api/analytics', authenticateToken, async (req, res) => {
  try {
    const totalRecords = await prisma.record.count({ where: { isDeleted: false } });
    
    const categoryDist = await prisma.record.groupBy({
      by: ['category'],
      _count: { id: true },
      where: { isDeleted: false }
    });

    const stateDist = await prisma.record.groupBy({
      by: ['state'],
      _count: { id: true },
      where: { isDeleted: false }
    });

    const reliabilityDist = await prisma.record.groupBy({
      by: ['reliability'],
      _count: { id: true },
      where: { isDeleted: false }
    });

    const recentActivities = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const importStats = await prisma.import.aggregate({
      _sum: {
        successfullyImported: true,
        failedRows: true,
        duplicateRows: true
      }
    });

    res.json({
      totalRecords,
      categoryDist,
      stateDist,
      reliabilityDist,
      recentActivities,
      imports: importStats._sum
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/activity-logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const logs = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`Luxury Cinematic intelligence vault listening on port ${PORT}`);
});
