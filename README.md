# TATTI Student Management Portal

A full-stack, enterprise-grade portal for the **Tamil Nadu Advanced Technical Training Institute (TATTI)**. Includes an automated Student Entry Assessment engine, rule-based course recommendations, admin-controlled multi-step application workflow, exclusive UPI payment gateway, and administrative CRM.

---

## 🏛️ Project Architecture

```
tatti-portal/
│
├── frontend/                     # React 18 + Vite + Tailwind CSS + Lucide Icons
│   ├── src/
│   │   ├── components/           # UI library (buttons, inputs, dialogs, dropzones)
│   │   ├── pages/
│   │   │   ├── auth/             # Student & Admin authentication
│   │   │   ├── student/          # Dashboard, Assessment, Application, Notifications
│   │   │   └── admin/            # Dashboard, Students, Courses, Confirmations, etc.
│   │   ├── layouts/              # StudentLayout (no counselling) & AdminLayout
│   │   ├── routes/               # Centralized routes with role guards
│   │   ├── services/             # Application access, payments & real-time messaging
│   │   ├── hooks/                # Custom React hooks
│   │   ├── contexts/             # AuthContext, ThemeContext
│   │   ├── store/                # Zustand / state management
│   │   ├── types/                # Unified TypeScript interfaces
│   │   ├── utils/                # Utility helpers and formatters
│   │   └── assets/               # Branding and illustrations
│   ├── public/                   # Static favicon and public assets
│   ├── package.json              # Frontend dependencies
│   └── vite.config.ts            # Vite 8 config with PostCSS Tailwind setup
│
├── backend/                      # Node.js + Express + TypeScript + PostgreSQL
│   ├── src/
│   │   ├── controllers/          # Business logic handlers
│   │   ├── routes/               # Modular REST endpoints
│   │   ├── models/               # Domain data contracts
│   │   ├── services/             # Scoring, UPI payment & access control services
│   │   ├── middleware/           # Auth guard, accessControlMiddleware, errorHandler
│   │   ├── config/               # Environment & app constants
│   │   ├── database/             # PostgreSQL / Supabase pool & query client
│   │   └── utils/                # JWT helpers & receipt generator
│   ├── package.json              # Backend dependencies
│   └── .env                      # Environment variables
│
├── database/                     # Database source of truth
│   ├── migrations/               # Numbered SQL migrations (00001 - 00007)
│   ├── schema/                   # Consolidated full_schema.sql
│   └── seed/                     # Seed questions, courses, admin accounts
│
├── docs/                         # Technical documentation
│   ├── API.md                    # REST API endpoints & request/response schemas
│   ├── DATABASE.md               # ER diagram, schema details & RLS policies
│   └── ARCHITECTURE.md           # System design & security model
│
├── .gitignore                    # Git exclusions
└── README.md                     # Project overview and run instructions
```

---

## 🌟 Key Features & Rules

1. **Clean Navigation**:
   - `Counselling` has been completely removed from the student sidebar.
   - `Course Recommendation` is not in the sidebar; it only appears inside the Entry Assessment module **after** assessment completion.
2. **Controlled Application Workflow**:
   - Application Process is **locked by default**.
   - Students cannot unlock the process themselves. Only an Admin can unlock access from the Admin Portal.
   - All unlock/lock actions are recorded in the security audit log (`application_access_audit`).
3. **Exclusive UPI Payments**:
   - UPI is the only institutional payment channel.
   - Supports UPI Apps (Google Pay, PhonePe, Paytm, BHIM), dynamic QR Code scanning, and Virtual Payment Address (VPA) entry.
   - Instant downloadable PDF payment receipt.
4. **Focused Notifications**:
   - Student notifications page strictly features two primary tabs: `[ All ]` and `[ Messages ]`.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js >= 18
- npm or yarn

### 2. Frontend Development Server
```bash
# Option A: From frontend directory
cd frontend
npm run dev

# Option B: From root
npm run dev
```
The application will be accessible at: `http://localhost:5173/`

### 3. Backend API Server
```bash
cd backend
npm install
npm run dev
```
The REST API will be accessible at: `http://localhost:5000/api`

### 4. Database Setup
Execute the scripts located in `database/`:
- `database/schema/full_schema.sql` (Creates all tables, constraints, and indexes)
- `database/seed/seed_data.sql` (Inserts initial questions, courses, and demo records)

---

## 📚 Documentation Links
- [API Reference](docs/API.md)
- [Database & ER Diagram](docs/DATABASE.md)
- [Architecture & Access Control Model](docs/ARCHITECTURE.md)
