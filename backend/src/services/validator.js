/**
 * Utility functions for validating emails, phones, and checking duplicates.
 */

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh'
];

const MAJOR_CITIES = [
  'Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'New Delhi', 'Delhi', 'Noida', 'Gurugram', 
  'Faridabad', 'Ghaziabad', 'Bengaluru', 'Bangalore', 'Mysore', 'Chennai', 'Coimbatore', 
  'Madurai', 'Hyderabad', 'Warangal', 'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 
  'Kolkata', 'Howrah', 'Patna', 'Gaya', 'Muzaffarpur', 'Lucknow', 'Kanpur', 'Agra', 
  'Varanasi', 'Meerut', 'Prayagraj', 'Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bhopal', 
  'Indore', 'Gwalior', 'Jabalpur', 'Kochi', 'Trivandrum', 'Calicut', 'Bhubaneswar'
];

const CITY_TO_STATE = require('./cities_to_states.json');

/**
 * Basic email format checker
 */
function isValidEmail(email) {
  if (!email) return false;
  // Support multiple emails separated by spaces or commas
  const emails = email.split(/[\s,;/]+/);
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emails.every(e => !e.trim() || re.test(e.trim()));
}

function cleanName(name) {
  if (!name) return '';
  // Remove garbage characters like *, #, $, %, &, @, etc. Keep letters, numbers, spaces, dots, hyphens, and apostrophes.
  let cleaned = String(name)
    .replace(/[\*#\$%&\^@_=+\[\]{}|\\<>?~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned;
}

/**
 * Normalizes one or more phone numbers (separated by spaces, commas, slashes)
 * Enforces a proper 10-digit format and strips leading zeros.
 */
function normalizePhoneNumber(phone) {
  if (!phone) return '';
  const str = String(phone).trim();
  
  // Split phone numbers by common delimiters
  const parts = str.split(/[\s,;/\\|]+/);
  
  // Check if any part contains digits but is less than 10 digits (fragmented/incomplete)
  const hasIncomplete = parts.some(p => {
    const digits = p.replace(/\D/g, '');
    return digits.length > 0 && digits.length < 10;
  });
  
  // If there is any incomplete fragment, merge ALL digits in the string together
  if (hasIncomplete) {
    let digits = str.replace(/\D/g, '');
    while (digits.startsWith('0')) {
      digits = digits.substring(1);
    }
    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.substring(2);
    }
    if (digits.length === 11 && digits.startsWith('9')) {
      digits = digits.substring(1);
    }
    
    if (digits.length === 10) {
      return digits;
    }
    return '';
  }
  
  // Otherwise normalize each complete fragment separately
  const normalizedList = parts.map(p => {
    let digits = p.replace(/\D/g, '');
    while (digits.startsWith('0')) {
      digits = digits.substring(1);
    }
    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.substring(2);
    }
    if (digits.length === 11 && digits.startsWith('9')) {
      digits = digits.substring(1);
    }
    if (digits.length === 10) {
      return digits;
    }
    return '';
  }).filter(Boolean);

  return normalizedList.join(', ');
}

/**
 * Heuristically extracts state and city from raw address strings
 */
function extractLocationFromAddress(addressStr) {
  if (!addressStr) return { state: '', city: '' };
  
  let detectedState = '';
  let detectedCity = '';

  const cleanAddr = addressStr.toLowerCase();

  // 1. Detect State
  for (const state of INDIAN_STATES) {
    if (cleanAddr.includes(state.toLowerCase())) {
      detectedState = state;
      break;
    }
  }

  // Fallback state checks for common abbreviations
  if (!detectedState) {
    if (cleanAddr.includes('up ') || cleanAddr.endsWith('up')) detectedState = 'Uttar Pradesh';
    else if (cleanAddr.includes('mp ') || cleanAddr.endsWith('mp')) detectedState = 'Madhya Pradesh';
    else if (cleanAddr.includes('mh ') || cleanAddr.endsWith('mh')) detectedState = 'Maharashtra';
    else if (cleanAddr.includes('dl ') || cleanAddr.includes('delhi')) detectedState = 'Delhi';
  }

  // 2. Detect City
  for (const city of MAJOR_CITIES) {
    if (cleanAddr.includes(city.toLowerCase())) {
      detectedCity = city;
      break;
    }
  }

  return { state: detectedState, city: detectedCity };
}

/**
 * Validates a single row and flags any issues
 */
function validateRow(row) {
  const errors = [];
  const warnings = [];

  // Relocate city/state values if they were mapped to designation or nameOfOrganization
  const fieldsToCheck = ['designation', 'nameOfOrganization'];
  fieldsToCheck.forEach(field => {
    if (!row[field]) return;
    const valClean = String(row[field]).trim();
    const valLower = valClean.toLowerCase();
    
    let matchedCity = null;
    let matchedState = null;
    
    for (const state of INDIAN_STATES) {
      const s = state.toLowerCase();
      const rx = new RegExp(`^${s}(\\s+(office|hq|branch|headquarters|headquarter|division|center|centre|dept|department))?$`, 'i');
      if (rx.test(valLower)) {
        matchedState = state;
        break;
      }
    }
    
    for (const city of MAJOR_CITIES) {
      const c = city.toLowerCase();
      const rx = new RegExp(`^${c}(\\s+(office|hq|branch|headquarters|headquarter|division|center|centre|dept|department))?$`, 'i');
      if (rx.test(valLower)) {
        matchedCity = city;
        break;
      }
    }
    
    if (matchedCity || matchedState) {
      if (matchedCity && !row.districtCity) {
        row.districtCity = matchedCity;
      }
      if (matchedState && !row.state) {
        row.state = matchedState;
      }
      row[field] = null;
      warnings.push(`Relocated city/state '${valClean}' from ${field} to State/DistrictCity fields`);
    }
  });

  // Extract city/state names from nameOfAuthorisedPerson and nameOfOrganization if present
  const fieldsWithNames = ['nameOfAuthorisedPerson', 'nameOfOrganization'];
  fieldsWithNames.forEach(field => {
    if (!row[field]) return;
    
    let val = String(row[field]).trim();
    let valLower = val.toLowerCase();
    
    for (const city of MAJOR_CITIES) {
      const c = city.toLowerCase();
      const regex = new RegExp(`\\b${c}(\\s+(office|hq|branch|headquarters|headquarter|division|center|centre|dept|department))?\\b`, 'i');
      
      if (regex.test(valLower)) {
        if (!row.districtCity) {
          row.districtCity = city;
          warnings.push(`Extracted city '${city}' from ${field}`);
        }
        
        val = val.replace(regex, '');
        val = val.replace(/\(\s*\)/g, '')
                 .replace(/\s+/g, ' ')
                 .trim();
        valLower = val.toLowerCase();
      }
    }
    
    for (const state of INDIAN_STATES) {
      const s = state.toLowerCase();
      const regex = new RegExp(`\\b${s}(\\s+(office|hq|branch|headquarters|headquarter|division|center|centre|dept|department))?\\b`, 'i');
      
      if (regex.test(valLower)) {
        if (!row.state) {
          row.state = state;
          warnings.push(`Extracted state '${state}' from ${field}`);
        }
        
        val = val.replace(regex, '');
        val = val.replace(/\(\s*\)/g, '')
                 .replace(/\s+/g, ' ')
                 .trim();
        valLower = val.toLowerCase();
      }
    }
    
    val = val.replace(/^[\s,.\-/()]+|[\s,.\-/()]+$/g, '')
             .replace(/\s+/g, ' ')
             .trim();
             
    if (val.length === 0) {
      row[field] = null;
    } else {
      row[field] = val;
    }
  });

  // Clean names of garbage symbols
  if (row.nameOfAuthorisedPerson) {
    row.nameOfAuthorisedPerson = cleanName(row.nameOfAuthorisedPerson);
  }
  if (row.nameOfOrganization) {
    row.nameOfOrganization = cleanName(row.nameOfOrganization);
  }

  // Email validation & smart extraction
  if (row.email) {
    const extractedEmails = [];
    const parts = String(row.email).split(/[\s,;/]+/);
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    parts.forEach(part => {
      const cleanPart = part.trim();
      if (re.test(cleanPart)) {
        extractedEmails.push(cleanPart);
      }
    });

    if (extractedEmails.length > 0) {
      row.email = extractedEmails.join(', ');
    } else {
      const originalEmail = row.email;
      row.email = null; // Gracefully clear to prevent discarding the entire row
      warnings.push(`Cleared invalid email format: '${originalEmail}'`);
    }
  }

  // Phone validation
  if (row.contactNumber) {
    const cleanPhone = normalizePhoneNumber(row.contactNumber);
    if (!cleanPhone) {
      warnings.push('Phone number is invalid or contains no digits');
    }
  }

  // Category validation & Auto-AI Suggestions Assignment
  const allowedCategories = ['Govt', 'Corporate', 'NGO', 'Academic', 'Political', 'Other'];
  let currentCategory = (row.category || 'Other').trim();

  // If category is "Other" or blank, run AI category auto-classifier!
  if (currentCategory === 'Other' || !currentCategory) {
    const email = (row.email || '').toLowerCase();
    const org = (row.nameOfOrganization || '').toLowerCase();
    const designation = (row.designation || '').toLowerCase();
    const remarksStr = (row.remarks || '').toLowerCase();

    if (email.endsWith('.gov') || email.endsWith('.gov.in') || email.includes('gov') || org.includes('ministry') || org.includes('department of') || org.includes('national institution')) {
      currentCategory = 'Govt';
      warnings.push(`AI automatically classified and assigned Category as 'Govt'`);
    } else if (email.endsWith('.edu') || email.endsWith('.ac.in') || email.includes('univ') || org.includes('iit') || org.includes('university') || org.includes('school') || org.includes('college') || org.includes('institute') || org.includes('academic')) {
      currentCategory = 'Academic';
      warnings.push(`AI automatically classified and assigned Category as 'Academic'`);
    } else if (email.endsWith('.org') || org.includes('foundation') || org.includes('ngo') || org.includes('trust') || org.includes('charity') || org.includes('association') || org.includes('society')) {
      currentCategory = 'NGO';
      warnings.push(`AI automatically classified and assigned Category as 'NGO'`);
    } else if (email.endsWith('.com') || email.endsWith('.co') || org.includes('ltd') || org.includes('limited') || org.includes('private') || org.includes('pvt') || org.includes('corp') || org.includes('solutions') || org.includes('sons') || org.includes('company')) {
      currentCategory = 'Corporate';
      warnings.push(`AI automatically classified and assigned Category as 'Corporate'`);
    } else if (org.includes('political') || org.includes('party') || org.includes('parliament') || org.includes('assembly') || designation.includes('minister') || designation.includes('mla') || designation.includes('mp')) {
      currentCategory = 'Political';
      warnings.push(`AI automatically classified and assigned Category as 'Political'`);
    }
  }

  const matchedCategory = allowedCategories.find(
    c => c.toLowerCase() === currentCategory.toLowerCase()
  );
  row.category = matchedCategory || 'Other';

  // Automatically attempt location extraction if state/city are missing but address-like fields are present
  // Address-like fields can be mapped to remarks or scope or separate columns in raw import
  const addressContent = [row.remarks, row.scopeOfCollaboration].filter(Boolean).join(' ');
  if (addressContent && (!row.state || !row.districtCity)) {
    const extracted = extractLocationFromAddress(addressContent);
    if (!row.state && extracted.state) {
      row.state = extracted.state;
      warnings.push(`Extracted state '${extracted.state}' from address content`);
    }
    if (!row.districtCity && extracted.city) {
      row.districtCity = extracted.city;
      warnings.push(`Extracted city '${extracted.city}' from address content`);
    }
  }

  // Auto-map state based on city if state is missing
  if (row.districtCity) {
    const cityClean = String(row.districtCity).trim().toLowerCase();
    const mappedState = CITY_TO_STATE[cityClean];
    if (mappedState && !row.state) {
      row.state = mappedState;
      warnings.push(`Automatically assigned state '${mappedState}' based on city '${row.districtCity}'`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    data: row
  };
}

function selectBestName(name1, name2) {
  const n1 = cleanName(name1);
  const n2 = cleanName(name2);
  if (!n1) return n2;
  if (!n2) return n1;
  
  const hasDigits1 = /\d/.test(n1);
  const hasDigits2 = /\d/.test(n2);
  
  if (hasDigits1 && !hasDigits2) return n2;
  if (!hasDigits1 && hasDigits2) return n1;
  
  const clean1 = n1.replace(/\b\d+\s*[A-Z]*\b/g, '').trim();
  const clean2 = n2.replace(/\b\d+\s*[A-Z]*\b/g, '').trim();
  
  if (clean1.length >= clean2.length) return n1;
  return n2;
}

function isSamePerson(a, b) {
  const emailsA = (a.email || '').toLowerCase().split(/[\s,;/]+/).filter(Boolean);
  const emailsB = (b.email || '').toLowerCase().split(/[\s,;/]+/).filter(Boolean);
  const phonesA = (a.contactNumber || '').split(/[\s,;/]+/).filter(Boolean);
  const phonesB = (b.contactNumber || '').split(/[\s,;/]+/).filter(Boolean);

  // A. Check common non-empty email
  const hasCommonEmail = emailsA.some(e => emailsB.includes(e));
  if (hasCommonEmail) return true;

  // B. Check common non-empty phone
  const hasCommonPhone = phonesA.some(p => phonesB.includes(p));
  if (hasCommonPhone) return true;

  // C. Check name compatibility (same name and no conflicting contact details)
  const nameA = cleanName(a.nameOfAuthorisedPerson || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const nameB = cleanName(b.nameOfAuthorisedPerson || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (nameA && nameA === nameB) {
    if (emailsA.length > 0 && emailsB.length > 0) {
      const emailMatch = emailsA.some(e => emailsB.includes(e));
      if (!emailMatch) return false;
    }
    if (phonesA.length > 0 && phonesB.length > 0) {
      const phoneMatch = phonesA.some(p => phonesB.includes(p));
      if (!phoneMatch) return false;
    }
    return true;
  }

  return false;
}

function mergeRecords(target, source) {
  // Merge category (prefer non-'Other')
  if (source.category && source.category !== 'Other' && (!target.category || target.category === 'Other')) {
    target.category = source.category;
  }
  
  // Merge organization (prefer longer/non-empty name)
  if (source.nameOfOrganization && (!target.nameOfOrganization || source.nameOfOrganization.length > target.nameOfOrganization.length)) {
    target.nameOfOrganization = cleanName(source.nameOfOrganization);
  }
  
  // Merge authorized person (prefer clean, non-numbered, or longer name)
  if (source.nameOfAuthorisedPerson) {
    target.nameOfAuthorisedPerson = selectBestName(target.nameOfAuthorisedPerson, source.nameOfAuthorisedPerson);
  }
  
  // Merge designation (prefer longer)
  if (source.designation && (!target.designation || source.designation.length > target.designation.length)) {
    target.designation = source.designation;
  }
  
  // Merge sector
  if (source.sector && (!target.sector || !target.sector.toLowerCase().includes(source.sector.toLowerCase()))) {
    target.sector = target.sector ? `${target.sector}, ${source.sector}` : source.sector;
  }
  
  // Merge strengthExpertise
  if (source.strengthExpertise && (!target.strengthExpertise || !target.strengthExpertise.toLowerCase().includes(source.strengthExpertise.toLowerCase()))) {
    target.strengthExpertise = target.strengthExpertise ? `${target.strengthExpertise}, ${source.strengthExpertise}` : source.strengthExpertise;
  }
  
  // Merge contact numbers (combine unique numbers)
  const phones = new Set([
    ...(target.contactNumber || '').split(/[\s,]+/).filter(Boolean),
    ...(source.contactNumber || '').split(/[\s,]+/).filter(Boolean)
  ]);
  target.contactNumber = Array.from(phones).join(', ') || null;
  
  // Merge emails
  const emails = new Set([
    ...(target.email || '').split(/[\s,]+/).filter(Boolean).map(e => e.toLowerCase()),
    ...(source.email || '').split(/[\s,]+/).filter(Boolean).map(e => e.toLowerCase())
  ]);
  target.email = Array.from(emails).join(', ') || null;
  
  // Merge state (prefer non-empty)
  if (source.state && !target.state) target.state = source.state;
  
  // Merge districtCity (prefer non-empty)
  if (source.districtCity && !target.districtCity) target.districtCity = source.districtCity;
  
  // Merge languages
  if (source.languages && (!target.languages || !target.languages.toLowerCase().includes(source.languages.toLowerCase()))) {
    target.languages = target.languages ? `${target.languages}, ${source.languages}` : source.languages;
  }
  
  // Merge scopeOfCollaboration
  if (source.scopeOfCollaboration && (!target.scopeOfCollaboration || !target.scopeOfCollaboration.toLowerCase().includes(source.scopeOfCollaboration.toLowerCase()))) {
    target.scopeOfCollaboration = target.scopeOfCollaboration ? `${target.scopeOfCollaboration}; ${source.scopeOfCollaboration}` : source.scopeOfCollaboration;
  }
  
  // Merge reliability (prefer High over Medium, Medium over Low)
  const relPriority = { 'High': 3, 'Medium': 2, 'Low': 1, '': 0 };
  const targetRel = target.reliability || '';
  const sourceRel = source.reliability || '';
  if (relPriority[sourceRel] > relPriority[targetRel]) {
    target.reliability = sourceRel;
  }
  
  // Merge remarks
  if (source.remarks && (!target.remarks || !target.remarks.toLowerCase().includes(source.remarks.toLowerCase()))) {
    target.remarks = target.remarks ? `${target.remarks}; ${source.remarks}` : source.remarks;
  }
}

module.exports = {
  isValidEmail,
  normalizePhoneNumber,
  extractLocationFromAddress,
  validateRow,
  cleanName,
  isSamePerson,
  mergeRecords
};
