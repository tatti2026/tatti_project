# TATTI Portal - Database Documentation

## 1. Overview
The TATTI Student Management Portal database is powered by PostgreSQL / Supabase with Row Level Security (RLS) policies and complete relational integrity.

Consolidated schema location: [`database/schema/full_schema.sql`](file:///c:/Users/acer/Downloads/tatti-portal-source-code/database/schema/full_schema.sql).
Seed script location: [`database/seed/seed_data.sql`](file:///c:/Users/acer/Downloads/tatti-portal-source-code/database/seed/seed_data.sql).

---

## 2. Entity Relationship Diagram (Mermaid)

```mermaid
erDiagram
    PROFILES ||--o{ STUDENTS : "profile_id"
    STUDENTS ||--o{ ASSESSMENTS : "student_id"
    STUDENTS ||--o{ COURSE_RECOMMENDATIONS : "student_id"
    STUDENTS ||--o{ APPLICATIONS : "student_id"
    STUDENTS ||--o{ PAYMENTS : "student_id"
    STUDENTS ||--o{ COUNSELLING : "student_id"
    STUDENTS ||--o{ APPLICATION_ACCESS_AUDIT : "student_id"
    COURSES ||--o{ COURSE_RECOMMENDATIONS : "course_id"
    COURSES ||--o{ APPLICATIONS : "course_id"
    APPLICATIONS ||--o{ PAYMENTS : "application_id"
    QUESTIONS ||--o{ QUESTION_OPTIONS : "question_id"

    STUDENTS {
        uuid id PK
        uuid profile_id FK
        string full_name
        string email
        string phone
        string application_access_status "locked | unlocked"
        uuid application_unlocked_by
        timestamp application_unlocked_at
        string application_status
        string payment_status
    }

    COURSES {
        uuid id PK
        string course_name
        string course_code
        numeric fee
        string duration
        string category
        integer available_seats
    }

    ASSESSMENTS {
        uuid id PK
        uuid student_id FK
        integer score
        integer total_marks
        numeric percentage
        jsonb answers
        string status "in_progress | completed"
    }

    APPLICATIONS {
        uuid id PK
        uuid student_id FK
        uuid course_id FK
        string application_number
        integer step "1 to 4"
        string status "draft | in_progress | submitted | approved | rejected"
    }

    PAYMENTS {
        uuid id PK
        uuid student_id FK
        uuid application_id FK
        numeric amount
        string payment_method "UPI"
        string transaction_id
        string status "pending | paid | failed"
    }

    APPLICATION_ACCESS_AUDIT {
        uuid id PK
        uuid student_id FK
        uuid admin_id FK
        string action "unlocked | locked"
        string reason
        timestamp created_at
    }
```

---

## 3. Key Tables & Field Specifications

### `students`
- Primary representation of enrolled or prospective students.
- Key access control fields:
  - `application_access_status`: `'locked'` by default; strictly updated only by administrators.
  - `application_unlocked_by`: UUID of the administrator who unlocked access.
  - `application_unlocked_at`: Timestamp of unlock action.

### `application_access_audit`
- Audit log recording every state transition for student application process unlocking/locking.
- Stores `student_id`, `admin_id`, `action` ('unlocked'/'locked'), `reason`, and `created_at`.

### `payments`
- Records payments made for course admission.
- Enforces `payment_method = 'UPI'` as the verified institutional collection channel.
- Generates unique transaction IDs and receipt numbers (`REC{YEAR}{NUM}`).

### `course_recommendations`
- Stores personalized course recommendations generated dynamically based on entry assessment score, cognitive traits, and technical aptitude.

---

## 4. Migrations History

| File | Description |
|------|-------------|
| `00001_initial_schema.sql` | Profiles, students, courses, initial enums |
| `00002_assessments_and_questions.sql` | Assessment questions, scoring schemas, recommendations |
| `00003_applications_and_payments.sql` | Application pipeline, payment logs, receipts |
| `00004_counselling_and_followups.sql` | Counselling sessions, scheduled follow-up reminders |
| `00005_notifications_and_audit.sql` | Notifications system, direct messaging logs |
| `00006_sample_data.sql` | Default questions, course catalog, seed accounts |
| `00007_application_access_and_audit.sql` | Application access locking status and security audit log |
