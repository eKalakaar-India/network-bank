# Network Data Bank — Master Relationship Intelligence Vault

A luxury cinematic data bank web application designed for high-value institutional relations and partnership records management.

## Visual Identity System
- **Atmospheric Dark Theme:** A crafted cinematic dark UI styled using deep slate layers (`#0F172A`, `#111827`, `#161B22`, `#1A1F2E`) with luxury Walnut Brown, Antique Gold accents (`#FB923C`, `#FFB86B`), and premium web serifs (*Playfair Display* & *Cormorant Garamond*).
- **Executive-grade Spreadsheet Layout:** Highly customized TanStack Tables with sticky cinematic headers, delicate borders, custom indicators, and smooth hover micro-animations.

---

## Technical Stack
- **Frontend Client:** React + Vite + TailwindCSS + Lucide Icons + Framer Motion + Recharts
- **Database Engine & ORM:** SQLite + Prisma ORM
- **Backend Services:** Node.js + Express + Multer + XLSX + PapaParse (CSV) + Rate Limiting + Helmet Security

---

## Predefined Fields Target Schema
The system maps all raw ingested spreadsheets into the following institutional target columns:
1. `Sr No`
2. `Category` (*Govt, Corporate, NGO, Academic, Political, Other*)
3. `Name of Organization`
4. `Name of Authorised Person/ Expert`
5. `Designation`
6. `Sector`
7. `Strength/ Expertise/ Specilisation`
8. `Contact Number`
9. `Email`
10. `State`
11. `District/City`
12. `Languages`
13. `Scope of Collaboration/ Relationship with Us`
14. `Reliability (Time, Resource, etc)`
15. `Remarks`

---

## Premium Intelligence & Automation Features

### 1. Smart Location Extraction & Normalization
* **City-to-State Auto Mapping:** Loaded with a comprehensive lookup database of **1,205 Indian cities and towns**. If a record has an identified city but is missing a state, the system automatically assigns the correct Indian state.
* **Name & Org Location Extraction:** The validator scans `nameOfAuthorisedPerson` and `nameOfOrganization` for city/state keywords. When identified, it populates the location fields (if blank), cleans the location word out of the name field, and trims remaining qualifiers or punctuation.
* **Header Mapping Relocation:** During ingestion, if a city or state name is mapped to the `designation` or `nameOfOrganization` columns, the system automatically redirects the value to `districtCity`/`state` and clears the source column.

### 2. Fact-Based Deduplication Engine
* **DSU-based Matching:** Built a fast `O(N)` Disjoint Set Union (DSU) clustering engine. Two profiles are grouped as the same person if:
  * They share any non-empty contact number (phone).
  * They share any non-empty email.
  * They share the same name key and have **non-conflicting** contact details (meaning one has details and the other is empty).
* **Smart Name Selector:** Automatically compares name variants of the same person. It detects and prefers clean names, stripping noise and trailing codes (e.g. merging `"Aakritee Kapoor 11 SW"` into `"Aakritee Kapoor"`).
* **One-Click Vault Deduplication:** Added a premium **"Remove Duplicates"** button beside the global search bar in the Vault Ledger page to run this logic database-wide instantly.

### 3. Advanced Vault Navigation
* **Page Jumper:** Direct navigation control allowing operators to type a specific page number and leap directly there.
* **Standard States Dropdown Filter:** Fixed state filter dynamically querying standard Indian states to ensure consistent UI filtering.

---

## Smart AI-Assisted Mapping Heuristics
The backend contains a fuzzy mapping dictionary that automatically resolves and maps incoming custom spreadsheet headers:
- `Company` / `Org` / `NGO Name` → `Name of Organization`
- `Full Name` / `Expert Name` → `Name of Authorised Person/ Expert`
- `Mobile` / `Phone` → `Contact Number`
- `Mail` → `Email`
- `Expertise` / `Skills` → `Strength/ Expertise/ Specilisation`
- `Notes` / `Comments` → `Remarks`

---

## Local Setup & Quick Start

### 1. Start Backend Server
```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run dev
```
*Backend runs on `http://localhost:5000`.*

### 2. Start Frontend Client
```bash
cd ../frontend
npm install
cmd /c "npm run dev"
```
*Frontend runs on `http://localhost:3000`.*

### Operational Credentials
- **Security Administrator:** `admin@databank.com` | Passcode: `admin123`
- **Standard Operator:** `staff@databank.com` | Passcode: `user123`

---

## Docker Execution
To spin up both frontend, backend and database services simultaneously via containers:
```bash
docker-compose up --build
```
- Client View: `http://localhost:3000`
- API Endpoint: `http://localhost:5000`
