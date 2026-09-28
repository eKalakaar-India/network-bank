/**
 * Smart Heuristic Mapping Engine for mapping arbitrary CSV/XLSX column headers
 * to the Target Schema columns.
 */

const TARGET_SCHEMA = {
  category: 'Category',
  nameOfOrganization: 'Name of Organization',
  nameOfAuthorisedPerson: 'Name of Authorised Person/ Expert',
  designation: 'Designation',
  sector: 'Sector',
  strengthExpertise: 'Strength/ Expertise/ Specilisation',
  contactNumber: 'Contact Number',
  email: 'Email',
  state: 'State',
  districtCity: 'District/City',
  languages: 'Languages',
  scopeOfCollaboration: 'Scope of Collaboration/ Relationship with Us',
  reliability: 'Reliability (Time, Resource, etc)',
  remarks: 'Remarks'
};

const SYNONYMS = {
  category: ['category', 'cat', 'group', 'type', 'classification'],
  nameOfOrganization: ['organization', 'organisation', 'company', 'company name', 'org', 'firm', 'ngo name', 'ngo', 'institute', 'institution', 'university'],
  nameOfAuthorisedPerson: ['authorised person', 'authorized person', 'expert', 'name', 'full name', 'person name', 'contact person', 'expert name', 'representative', 'caption'],
  designation: ['designation', 'role', 'title', 'job title', 'position', 'status'],
  sector: ['sector', 'industry', 'domain', 'field', 'segment', 'important data- job/business'],
  strengthExpertise: ['strength', 'expertise', 'specialisation', 'specialization', 'skills', 'focus', 'competencies', 'expertise area', 'education'],
  contactNumber: ['contact number', 'contact', 'phone', 'phone number', 'mobile', 'mobile number', 'tel', 'telephone', 'cell', 'residence phone', 'office phone', 'mobile phone'],
  email: ['email', 'e-mail', 'mail', 'email address', 'e-mail address', 'email id'],
  state: ['state', 'region', 'province'],
  districtCity: ['district', 'city', 'district/city', 'town', 'location', 'hq'],
  languages: ['languages', 'langs', 'languages spoken', 'language'],
  scopeOfCollaboration: ['scope of collaboration', 'relationship with us', 'collaboration', 'partnership scope', 'scope', 'relationship', 'history of association'],
  reliability: ['reliability', 'reliability (time, resource, etc)', 'trustworthiness', 'rating', 'reliability rating', 'proximity'],
  remarks: ['remarks', 'notes', 'remark', 'note', 'comments', 'comment', 'description', 'office address', 'residence address', 'native address', 'self interest areas', 'reference persons', 'photograph']
};

/**
 * Automap columns using string similarities and predefined synonym lists.
 * Returns an object mapping user-uploaded raw headers to database field keys.
 */
function autoMapHeaders(headers) {
  const mapping = {};
  
  headers.forEach(header => {
    const cleanHeader = header.trim().toLowerCase().replace(/[^a-z0-9\s/(),]/g, '');
    
    // Skip auto-mapping label columns to value fields (e.g., E-mail 1 - Label, Phone - Label)
    if (cleanHeader.includes('label')) {
      mapping[header] = '';
      return;
    }
    
    let matchedKey = null;
    
    // Check exact synonyms
    for (const [key, synonyms] of Object.entries(SYNONYMS)) {
      if (synonyms.includes(cleanHeader)) {
        matchedKey = key;
        break;
      }
    }
    
    // Try substring checks if no exact match
    if (!matchedKey) {
      for (const [key, synonyms] of Object.entries(SYNONYMS)) {
        if (synonyms.some(syn => cleanHeader.includes(syn) || syn.includes(cleanHeader))) {
          matchedKey = key;
          break;
        }
      }
    }
    
    if (matchedKey) {
      mapping[header] = matchedKey;
    } else {
      // Leave unmapped for the user to select
      mapping[header] = '';
    }
  });

  return mapping;
}

module.exports = {
  TARGET_SCHEMA,
  autoMapHeaders
};
