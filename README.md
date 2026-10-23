# SmartGov Connect AI — Intelligent Civic Grievance Redressal Platform

> **"Your Voice. Smarter Governance."**  
> A production-minded, full-stack AI-powered citizen grievance management platform combining the visual polish, responsiveness, and interaction quality of consumer applications (Instagram, Linear, Stripe) with the structured workflows, auditability, and reliability of modern government platforms.

---

## 🌟 Overview & Key Highlights

SmartGov Connect AI bridges citizens and municipal administration through:
- **Mobile Number Authentication:** Built for public scale (+91 default country code, bcrypt password hashing, JWT sessions, role-based access control).
- **CivicNLP AI Grievance Engine:** Autonomous text preprocessing, 7-domain category classification, priority and hazard detection, department routing, duplicate detection, and master-incident clustering with 100% transparent algorithmic explainability.
- **Interconnected Single Source of Truth:** Shared persistent database where citizen submissions immediately trigger AI analysis, duplicate cross-referencing, municipal queue updates, administrative assignments, and citizen notification dispatches.
- **Real-Time Notification Ledger:** Full WebSocket streaming (Socket.IO) with room-based isolation and persistent inbox tracking.
- **FAANG-Level UI/UX Polish:** Deep navy text and actions, clean soft-gray surfaces, restrained violet AI accents, color-coded status badges, real-time debounced AI typing preview, accessible modals, and fully responsive layouts.

---

## 🏗️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Context API |
| **Backend** | Node.js (v25), Express, TypeScript (ESM), Socket.IO, Multer, Bcrypt, JWT |
| **Database** | Embedded SQLite with WAL mode & foreign keys (zero-external daemon dependency) |
| **AI / NLP** | SmartGov CivicNLP v2.4 (Semantic Lexical & Heuristic Reasoning Engine) |
| **Testing** | Vitest (21 automated unit, integration, and end-to-end workflow tests) |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ (tested on Node v25.8.0)
- npm 9+

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Environment Configuration
Inspect or modify `.env` (pre-configured with safe defaults):
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=smartgov_dev_jwt_key_2026_super_secure_civic_platform
JWT_EXPIRES_IN=7d
DATABASE_PATH=./data/smartgov.db
UPLOAD_DIR=./uploads
```

### 3. Database Seeding
Populate the database with pre-configured departments, master issues, fictional citizens, and 14 realistic grievances:
```bash
npm run seed
```

### 4. Running the Application
Start the integrated production server (Express API + Socket.IO + Static Vite frontend):
```bash
npm start
```
Or for local development:
```bash
npm run dev
```

Visit the platform in your browser at:
👉 **`http://localhost:5000`** (or Vite dev server at `http://localhost:5173`)

---

## 🔑 Demonstration Credentials

For evaluation, use either the 1-click **"Evaluation Demo Accounts"** autofill buttons on the login page or sign in manually:

| Role | Mobile Number | Password | Account Holder | Scope |
|---|---|---|---|---|
| **Administrator** | `+919876543210` | `Admin@12345` | Chief Grievance Administrator | Full oversight, queue assignment, status transitions, user management, reports |
| **Demo Citizen** | `+919876543211` | `Citizen@12345` | Priya Sharma | File grievances, track status, view notifications, profile management |

---

## 🏛️ System Modules

### 1. Public Landing Page (`/`)
- Brand vision: *"Your Voice. Smarter Governance."*
- 3-Step interactive redressal workflow overview.
- Feature breakdown: Category classification, priority triage, duplicate clustering.
- Public benchmark statistics derived directly from persistent database records.
- Instant public tracking search bar (`/track/:complaintId`).

### 2. Citizen Experience
- **Citizen Dashboard (`/dashboard`):** Real-time counters (Total, Pending, In Progress, Resolved), quick actions, and recent activity feed.
- **File Grievance (`/submit`):**
  - Title, description, category selector with AI Auto-Detect.
  - Multilingual support: English, Telugu (తెలుగు), Hindi (हिन्दी).
  - Ward/locality, address, and live GPS coordinates auto-capture.
  - Photo evidence upload with client-side preview.
  - **Live AI Preview Widget:** As the citizen types, CivicNLP predicts the category, severity, and routing department in real-time!
- **My Complaints (`/complaints`):** Search, status filtering, category filtering, and cards linking to timeline detail.
- **Complaint Detail (`/complaints/:id`):** Complete immutable status ledger, department remarks, uploaded photo viewer, and AI Intelligence breakdown card.
- **Citizen Profile (`/profile`):** Name and email updates, password change, and transparent security activity ledger.

### 3. AI Complaint Processing Engine (`src/server/services/aiEngine.ts`)
- **Text Normalization:** Cleans noise, standardizes whitespace, and extracts civic signal tokens.
- **7-Category Classification:** Roads & Potholes, Water Supply & Leakage, Garbage & Sanitation, Electricity & Streetlights, Drainage & Sewerage, Public Safety & Hazards, and Other Grievances.
- **Hazard & Priority Detection:** Deterministic rules detect life-threatening hazards (e.g. open borewells, live wires, structural collapses) and escalate them to `CRITICAL` urgency.
- **Duplicate Detection:** Calculates Jaccard token overlap and locality proximity. Flags similar active complaints to administrators without ever deleting citizen voices.
- **Master Issue Association:** Automatically recommends clustering nearby related grievances (e.g. pipeline burst flooding road) under a unified Master Ticket.
- **Transparent Labeling:** Honest engine attribution as an intelligent civic rule & lexical semantic engine.

### 4. Administrator Command Center (`/admin`)
- **Operations Dashboard (`/admin/overview`):** Live database-backed metrics, category volume bars, priority triage distribution, and department workload counters.
- **Grievance Redressal Queue (`/admin/complaints`):** Multi-filter data table with search, category, priority, status, and department filters.
- **Department Assignment Drawer:** Assigns authorized municipal authority with citizen-visible and internal notes.
- **Status State Machine:** Strictly enforces valid status transitions (`SUBMITTED` → `UNDER_REVIEW` → `ASSIGNED` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`) and rejects unauthorized jumps.
- **Master Civic Issues (`/admin/master-issues`):** Manage multi-complaint clusters with synchronized complaint counts and linked incident timelines.
- **Registered Citizens & Security Ledger (`/admin/users`):** Citizen roster, complaint counts, account disable/reactivate toggle with audit log, and security event inspection.
- **Department Roster (`/admin/departments`):** View workloads, active head of department contact information, and edit category mappings.
- **Reports & CSV Export (`/admin/reports`):** One-click download of all complaint records formatted as CSV with privacy controls.

### 5. Real-Time Notifications
- WebSocket distribution via Socket.IO.
- Persistent database inbox (`/notifications`).
- Unread count badge with animated pulse in the navigation bar.
- Interactive dropdown with mark-as-read and mark-all-read capabilities.

---

## 🧪 Automated Testing

SmartGov Connect AI includes a comprehensive test suite with 21 automated tests covering unit logic, state machines, and end-to-end integration workflows:

```bash
npm test
```

### Verified Test Suites:
1. `tests/complaints.test.ts`
   - State machine transition validation (`VALID_STATUS_TRANSITIONS`).
   - Category and priority labels verification.
2. `tests/aiEngine.test.ts`
   - Text preprocessing and token normalization.
   - Category prediction across 6 civic domains.
   - Critical priority hazard escalation rules.
   - Department recommendation routing.
3. `tests/auth.test.ts`
   - Bcrypt password hashing and verification.
   - JWT token signing, claims verification, and tamper rejection.
4. `tests/e2e-workflow.test.ts`
   - Administrator authentication & JWT generation.
   - Citizen registration with normalized mobile numbers (`+91`).
   - Admin user management sync.
   - Grievance submission with CivicNLP triage.
   - Department assignment and status transition lifecycle.
   - Notification dispatch and unread counter updates.
   - RBAC enforcement and private data isolation.
   - Invalid status transition rejection.

---

## 🔒 Security & Data Integrity

- **Role-Based Access Control (RBAC):** Middleware checks verify user roles on every administrative route. Citizens cannot access admin endpoints.
- **Record Ownership Verification:** Citizens can only view their own complaints; attempts to access another citizen's records return HTTP 403.
- **Zero Sensitive Data Leaks:** Password hashes, internal admin notes, and private phone numbers are stripped from public tracking views.
- **Rate Limiting:** Protects authentication and public lookup endpoints against brute-force attacks.
- **Audit Trails:** Every administrative assignment, status transition, and account toggle is logged to `audit_logs` with timestamps and admin identities.

---

## 📜 Disclaimer
This software is a technology demonstration platform and is not an official government service. All municipal data, complaints, citizen names, and phone numbers are fictional demonstration records.
