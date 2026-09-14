# TATTI Portal - Full-Stack Architecture Documentation

## 1. System Architecture

The TATTI Student Management Portal is structured as a decoupled, modular full-stack architecture:

```
tatti-portal/
├── frontend/             # React 18 + Vite + Tailwind CSS + Lucide Icons + jsPDF
│   ├── src/
│   │   ├── components/   # Atomic UI components, inputs, buttons, dialogs
│   │   ├── layouts/      # StudentLayout (no counselling), AdminLayout
│   │   ├── pages/
│   │   │   ├── auth/     # LoginPage, AdminLoginPage
│   │   │   ├── student/  # StudentDashboard, EntryAssessment, ApplicationProcess, etc.
│   │   │   └── admin/    # AdminDashboard, StudentDetails, Confirmations, etc.
│   │   ├── routes/       # Centralized route definitions and role guards
│   │   ├── services/     # Access control, UPI payments, direct messaging services
│   │   ├── hooks/        # Custom React hooks
│   │   ├── contexts/     # AuthContext, ThemeContext
│   │   ├── store/        # State store management
│   │   ├── types/        # TypeScript models and interfaces
│   │   ├── utils/        # Helper functions and formatters
│   │   └── assets/       # Static assets
│   ├── package.json
│   └── vite.config.ts
│
├── backend/              # Node.js + Express + TypeScript + PostgreSQL client
│   ├── src/
│   │   ├── controllers/  # Request orchestrators
│   │   ├── routes/       # Express REST router definitions
│   │   ├── models/       # Data contracts and domain types
│   │   ├── services/     # Assessment scoring, UPI payment, application access logic
│   │   ├── middleware/   # Authentication, access control guards, error handlers
│   │   ├── config/       # Environment configuration
│   │   ├── database/     # DB connection pool and client
│   │   └── utils/        # JWT utilities, PDF receipt helpers
│   ├── package.json
│   └── .env
│
├── database/             # PostgreSQL / Supabase source of truth
│   ├── migrations/       # Numbered SQL migration files (00001 to 00007)
│   ├── schema/           # Consolidated full_schema.sql
│   └── seed/             # Initial questions, courses, and admin seed data
│
└── docs/                 # Documentation (API, Database, Architecture)
```

---

## 2. Key Domain Rules & Workflows

### 2.1 Student Journey
1. **Student Registration & Login**: Authenticates via Student Portal.
2. **Dashboard**: Shows overall progress, quick actions, and announcement highlights.
3. **Entry Assessment**:
   - 30 comprehensive questions covering Logical Reasoning, Quantitative Aptitude, Technical Aptitude, and Verbal Ability.
   - Real-time timer, answer review, and progress indicator.
   - **Crucial Rule**: Course Recommendation menu item is **completely omitted** from the sidebar. Recommendations are only revealed inside the Entry Assessment module **after** assessment completion.
4. **Course Selection**: Student selects a recommended course or chooses from the full catalog.
5. **Application Process (Default Locked)**:
   - **Crucial Rule**: Application Process is **locked by default**.
   - Student sees an informational lock status screen directing them to wait for administrative review.
   - Only a designated TATTI Administrator can unlock access for the student.
   - Once unlocked, the student gains access to Step 1 (Personal Details), Step 2 (Course Review), Step 3 (Payment), and Step 4 (Confirmation & Receipt).
6. **Payment Step (UPI Exclusive)**:
   - **Crucial Rule**: UPI is the **exclusive** institutional payment channel.
   - Students can choose between UPI Apps (Google Pay, PhonePe, Paytm, BHIM), dynamic UPI QR Code scanning, or entering their UPI ID / VPA.
   - Generates an official downloadable PDF payment receipt with unique receipt number (`REC...`).
7. **Student Notifications**:
   - **Crucial Rule**: Notifications interface strictly presents only two primary tabs: `[ All ]` and `[ Messages ]`.

### 2.2 Administrator Capabilities
- **Student Verification & Application Access**: Unlocks or locks individual student application access with an instant audit log.
- **Entry Assessment & Question Management**: Add, edit, or toggle question status across categories.
- **Course & Fee Catalog**: Manage courses, durations, fees, and seat quotas.
- **Payment Verification & Confirmation**: Real-time monitoring of collected fees and confirmation approvals.
- **Counselling & Follow-up Scheduling**: Internal CRM for academic advisors.

---

## 3. Security & Access Control

- **Role-Based Guards**: Protected routes enforce `requireRole: 'student'` or `requireRole: 'admin'`.
- **API Access Control Middleware**: `backend/src/middleware/accessControlMiddleware.ts` intercepts application modifications and payment initiations, querying the database to ensure the student's `application_access_status === 'unlocked'`.
- **UPI Transaction Safety**: Direct verification with merchant VPA and unique transaction IDs preventing double-spend or spoofed confirmations.
