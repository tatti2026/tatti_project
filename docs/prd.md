# Requirements Document

## 1. Application Overview

**Application Name**: TATTI Student & Admin Management Portal

**Description**: A production-quality web application for Tamil Nadu Advanced Technical Training Institute (TATTI) that manages the complete student journey — from login and entry assessment through course recommendation, application, payment, counselling, and admission — alongside a comprehensive Admin Management Dashboard. The system provides two separate portal experiences: a Student Portal and an Admin Portal.

---

## 2. Users and Use Cases

**Target Users**:
- Students: Prospective and enrolled students navigating the admission journey
- Administrators: TATTI staff managing students, assessments, courses, counselling, and reporting

**Core Use Cases**:
- Student registers, logs in, takes the entrance assessment, receives course recommendations, submits an application, completes payment, attends counselling, and tracks admission status
- Admin manages questions, views student data, segments students by performance, schedules counselling, manages courses, tracks payments, and exports reports

---

## 3. Page Structure and Functional Description

### 3.1 Page Hierarchy

```
TATTI Portal
├── Authentication
│   ├── Student Login Page
│   ├── Forgot Password Flow
│   ├── Student Sign-Up
│   └── Admin Login Page
├── Student Portal
│   ├── Student Dashboard
│   ├── Entry Assessment
│   ├── Course Recommendation
│   ├── Application Process
│   │   ├── Step 1: Student Details
│   │   ├── Step 2: Course Selection
│   │   └── Step 3: Payment
│   ├── Payment Confirmation
│   ├── Counselling
│   ├── Admission Status
│   ├── Notifications
│   └── Profile
└── Admin Portal
    ├── Admin Dashboard
    ├── Student Details
    ├── Entry Assessment (Question Management)
    ├── Assessment and Segmentation
    ├── Counselling Management
    ├── Follow-up Management
    ├── Courses Management
    ├── Confirmations
    ├── Reports
    ├── Notifications
    └── Settings
```

---

### 3.2 Authentication Pages

#### 3.2.1 Student Login Page

Split-screen layout:

**Left Side — TATTI Branding**:
- TATTI logo
- Full name: Tamil Nadu Advanced Technical Training Institute
- Badge or text: TAT Entrance Exam
- Headline: \"Your Journey Starts Here\"
- Description: \"Access your entrance exam results, counselling updates, personalized course recommendations, and admission status — all in one place.\"
- Education/technology illustration featuring student, laptop, education icons, digital learning, and technology/network elements
- Purple/blue gradient background with decorative shapes

**Right Side — Login Card (white, rounded)**:
- Heading: \"Welcome Back!\"
- Subtitle: \"Sign in to continue your student journey\"
- Student ID / Email field (placeholder: \"Enter your Student ID or email\")
- Password field with visibility toggle (placeholder: \"Enter your password\")
- Remember me checkbox
- Forgot Password? link
- Sign In button with TATTI purple-to-blue gradient; includes loading, hover, and disabled states
- OR divider
- Continue with Google button (secondary style) — implemented via OSS Google login
- \"New student? Sign Up\" link below the form

#### 3.2.2 Forgot Password Flow

Modal or dedicated page:
- Heading: \"Forgot Password?\"
- Description: \"Enter your Student ID or registered email to receive a one-time password.\"
- Student ID / Email input field
- Send OTP button
- 6-digit OTP input
- Verify OTP button
- New Password field
- Confirm Password field
- Reset Password button
- Success and error messages displayed appropriately at each step

#### 3.2.3 Student Sign-Up

- Fields: Student ID / Email, Create Password, Confirm Password
- Create Account button
- Validation: email/Student ID format, password strength, password confirmation match, required fields
- On successful registration: redirect to Student Dashboard
- Student registration creates a student record in the database

#### 3.2.4 Admin Login Page

- Heading: \"TATTI Admin Portal\"
- Subtitle: \"Secure administration and student management\"
- Admin Email / Username field
- Password field
- Remember me checkbox
- Forgot Password? link
- Admin Sign In button
- Same TATTI visual identity as student login but with enterprise-focused presentation
- Role-based access: admin role only

---

### 3.3 Student Portal

**Student Sidebar (fixed, dark navy)**:
Dashboard, Entry Assessment, Course Recommendation, Application Process, Counselling, Admission Status, Notifications, Profile, Logout

#### 3.3.1 Student Dashboard

- Welcome section: \"Welcome back, [Student Name]!\" with current application status
- Progress Roadmap (visual, step-by-step): Registration → Assessment → Recommendation → Application → Payment → Counselling → Admission
  - Each step shows completed / current / upcoming state with icons and connecting progress lines
- KPI/Summary Cards:
  - Assessment Status
  - Recommended Courses
  - Application Status
  - Payment Status
  - Counselling Status
  - Each card displays a status badge: Completed, Pending, In Progress, Not Started, Paid, or Unpaid

#### 3.3.2 Entry Assessment

- Heading: \"TAT Entrance Assessment\"
- Assessment instructions displayed before start
- Shows: number of questions (30 MCQ), time limit, progress indicator
- MCQ questions with options A, B, C, D
- Previous / Next navigation between questions
- Submit Assessment button with confirmation dialog
- After submission:
  - Score, percentage, and assessment status displayed
  - Assessment result stored for admin segmentation

#### 3.3.3 Course Recommendation

- Heading: \"Course Recommendations\"
- Course cards generated based on assessment performance
- Each card shows: Course name, description, duration, eligibility, course fee, skill areas, career opportunities, recommendation percentage
- View Details button and Select Course button per card
- Interested Courses section: student can multi-select courses
- Continue button to proceed
- Selected course preferences saved to the student record

#### 3.3.4 Application Process

Three-step wizard:

**Step 1 — Student Details**:
- Full Name, Student ID, Email, Phone Number, Date of Birth, Address, City, State, Pincode

**Step 2 — Course Selection**:
- Displays selected course details: name, duration, description, eligibility, fee
- Total Amount displayed

**Step 3 — Payment**:
- Total Amount shown
- Payment methods: UPI, Credit/Debit Card, Net Banking, Bank Transfer
- Proceed to Pay button
- Secure payment messaging displayed

#### 3.3.5 Payment Confirmation

- Heading: \"Payment Successful!\"
- Displays: Student Name, Application ID, Payment ID, Transaction ID, Selected Course, Amount Paid, Payment Date, Payment Method, Payment Status: Paid
- Download Payment Receipt button (downloadable receipt with all payment and application details)
- Go to Dashboard button

#### 3.3.6 Counselling Page

- Counselling Status indicator: Not Scheduled / Scheduled / Completed / Selected / Pending
- When scheduled: Date, Time, Counsellor name, Mode, Venue or Meeting Link, Instructions
- Counselling timeline showing history

#### 3.3.7 Admission Status

- Large status indicator: Application Submitted / Under Review / Counselling Pending / Counselling Completed / Selected / Admission Confirmed / Not Selected
- Complete application timeline showing all status changes

#### 3.3.8 Notifications

Student receives notifications for:
- Assessment available
- Assessment submitted
- Course recommendation available
- Application reminder
- Payment confirmation
- Counselling scheduled
- Admission update

#### 3.3.9 Profile

- View and edit student profile information
- Changes sync to Admin Student Details in real time

---

### 3.4 Admin Portal

**Admin Sidebar (fixed, dark navy)**:
Dashboard, Student Details, Entry Assessment, Assessment and Segmentation, Counselling, Follow-up, Courses, Confirmations, Reports, Notifications, Settings, Logout

#### 3.4.1 Admin Dashboard

- Welcome: \"Good morning, Admin\"
- Subtitle: \"Manage students, assessments, courses and admissions.\"

**KPI Cards**:
Total Students, New Students, Assessment Completed, Assessment Pending, Applications Submitted, Paid Applications, Unpaid Applications, Counselling Pending, Admissions Confirmed

**Charts**:
- Student Registration Trend (line chart)
- Assessment Performance (bar or donut chart: High / Medium / Low performers)
- Application Status (Paid / Unpaid / Pending / Completed)
- Course Interest (most selected courses)

#### 3.4.2 Student Details — Admin

Searchable student management table:

**Columns**: Student ID, Student Name, Email, Phone, Selected Course, Assessment Status, Application Status, Payment Status, Counselling Status, Admission Status, Created Date, Actions

**Actions per row**: View, Edit, Delete, View Application, View Assessment, View Payment, View Counselling

**Features**: Search, Filters, Sorting, Pagination, Export, Bulk actions

**Auto-sync**: When a student updates their details in the Student Portal, changes reflect in this table in real time

#### 3.4.3 Entry Assessment — Admin (Question Management)

Admin can: Create, Edit, Delete, and View MCQ questions; Enable or disable questions; Set correct answer, marks, difficulty

**MCQ Question Fields**: Question text, Option A, Option B, Option C, Option D, Correct Answer, Marks, Difficulty, Category, Status

Actions: Add Question, Save Question, Edit, Delete (with confirmation dialogs)

#### 3.4.4 Assessment and Segmentation

Automatic student categorization based on assessment score:
- High Intent / High Performance
- Medium Intent / Medium Performance
- Low Intent / Low Performance

Displayed via cards, tables, charts, and status badges

Per-student view: Assessment score, percentage, interested courses, recommended courses, application status, payment status, counselling status

#### 3.4.5 Counselling Management

Admin can:
- View students requiring counselling
- Schedule counselling sessions
- Assign counsellor
- Update date and time
- Add notes
- Change counselling status

**Statuses**: Pending / Scheduled / Completed / Selected / Rejected / Follow-up Required

Counselling history displayed per student

#### 3.4.6 Follow-up Management

Three segments: HIGH INTENT, MEDIUM INTENT, LOW INTENT

Per student: Name, ID, Contact, Course interest, Assessment score, Payment status, Last interaction, Follow-up date, Follow-up status

Actions: Call, Email, Add Note, Schedule Follow-up, View Student

#### 3.4.7 Courses Management

Admin can: Add, Edit, View course details; Activate or Deactivate courses

**Course Fields**: Course Name, Course Code, Description, Duration, Eligibility, Fee, Category, Skills, Career Opportunities, Course Image, Available Seats, Status

Status toggle: Available / Not Available

Displayed in modern card and table format

#### 3.4.8 Confirmations

Student records categorized by payment: PAID / NOT PAID / YET TO PAY

**Table Columns**: Student ID, Name, Course, Application ID, Amount, Payment Status, Transaction ID, Application Status, Date, Actions

**Actions**: View, Verify Payment, Download Receipt, Contact Student

#### 3.4.9 Reports

**Report Types**: Student Registration, Assessment Performance, Course Interest, Application, Payment, Counselling, Admission, Follow-up

**Export Formats**: CSV, Excel, PDF

#### 3.4.10 Admin Notifications

Admin receives notifications for:
- New student registered
- New assessment submitted
- Payment received
- Counselling pending
- Follow-up required

#### 3.4.11 Settings

Admin settings panel (general configuration)

---

## 4. Business Rules and Logic

### 4.1 Role-Based Access Control
- Students access only the Student Portal; admins access only the Admin Portal
- Routes are protected by role; unauthorized access redirects to the appropriate login page
- Authentication uses Supabase Auth with student and admin roles

### 4.2 Assessment Scoring
- 30 MCQ questions; score auto-calculated on submission
- Score determines segmentation: High / Medium / Low Intent and Performance
- Segmentation thresholds defined by admin configuration
- Assessment can only be taken once per student (or as configured by admin)

### 4.3 Course Recommendation Logic
- Recommendations generated based on assessment score and student-selected interests
- Recommendation percentage displayed per course card
- Student can select multiple interested courses; final course selection occurs in Application Step 2

### 4.4 Application and Payment Flow
- Application is a three-step wizard; each step must be completed before proceeding
- Payment status is recorded upon completion; confirmation generates a downloadable receipt
- Payment status (Paid / Unpaid) is visible to admin in real time

### 4.5 Counselling Scheduling
- Admin schedules counselling after application and payment are confirmed
- Counselling status updates in Student Portal automatically when admin changes status

### 4.6 Admission Status Updates
- Admin updates admission status; changes reflect immediately in Student Portal Admission Status page

### 4.7 Data Synchronization
- All student data changes (profile, application, payment, counselling, admission) sync between Student Portal and Admin Portal in real time via Supabase

### 4.8 Demo Data
- Realistic sample/demo data pre-loaded for all major sections where needed
- Clean empty states and loading skeletons displayed throughout when data is absent or loading

---

## 5. Exceptions and Edge Cases

| Scenario | Handling |
|---|---|
| Invalid Student ID or password at login | Display inline error message |
| OTP expired or incorrect during password reset | Display error; allow resend OTP |
| Student attempts to retake a completed assessment | Show completed result; block retake (unless admin resets) |
| Payment fails or is interrupted | Show failure message; allow retry; do not record as paid |
| Student accesses a step before completing prerequisites | Redirect to the required prior step with guidance message |
| Admin deletes a student record | Confirmation dialog required; associated data archived |
| Export with no data | Show empty state message; disable export button |
| Session timeout | Redirect to login page with session-expired message |

---

## 6. Design System

- Style: Premium modern SaaS dashboard
- Background: Clean white for content areas; dark navy for sidebars
- Primary accents: Purple/blue gradient
- Components: Rounded cards, soft shadows, thin borders, spacious layout
- Spacing system: 8px base unit
- Border radius: 10–14px
- Typography: Professional, accessible contrast, clear visual hierarchy
- Iconography: Consistent icon set throughout
- UI Components: Fixed left sidebar, top navigation/header, breadcrumb, KPI cards, data tables, status badges, progress indicators, timeline/roadmap, charts, modal dialogs, tabs, search, filters, pagination, export buttons, toast notifications, confirmation dialogs, empty states, loading skeletons
- Responsive: Desktop-first with fixed sidebar and multi-column layout; tablet with collapsible sidebar; mobile with collapsible sidebar or bottom navigation and single-column layout

---

## 7. Acceptance Criteria

1. A new student opens the application, completes sign-up, and is redirected to the Student Dashboard
2. The student navigates to Entry Assessment, completes all 30 MCQ questions, submits, and views their score and percentage
3. The student navigates to Course Recommendation, views course cards with recommendation percentages, selects interested courses, and proceeds
4. The student completes the three-step Application Process (details, course selection, payment) and reaches the Payment Confirmation page with a downloadable receipt
5. The student views Counselling page and sees scheduled counselling details after admin schedules a session
6. The student views Admission Status and sees the current admission state updated by admin
7. An admin logs in to the Admin Portal and views the Dashboard with KPI cards and charts
8. Admin navigates to Student Details, searches for a student, and views their full record including assessment, application, payment, and counselling data
9. Admin creates a new MCQ question in Entry Assessment management and saves it
10. Admin segments students in Assessment and Segmentation, schedules a counselling session, and updates admission status — all changes reflect in the Student Portal in real time
11. Admin exports a Payment Report in CSV format

---

## 8. Out of Scope (Not Implemented in This Release)

- Live video counselling integration
- In-app chat or messaging between student and counsellor
- Multi-language support
- Third-party LMS integration
- Mobile native app (iOS/Android)
- Automated email/SMS notification delivery infrastructure
- Advanced analytics beyond the specified charts and report types
- Student fee installment or partial payment plans
