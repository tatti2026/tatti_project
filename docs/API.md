# TATTI Management Portal - Backend API Reference

## Base URL
- Development: `http://localhost:5000/api`
- Production: `https://api.tatti.edu.in/api`

All requests should supply `Content-Type: application/json`. Protected endpoints require an `Authorization: Bearer <jwt_token>` header.

---

## 1. Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/register` | Register a new student profile | No |
| `POST` | `/api/auth/login` | Login with email and password | No |
| `GET`  | `/api/auth/me` | Fetch current session profile & role | Yes |

### Example Login Response:
```json
{
  "success": true,
  "token": "eyJhbGciOi...",
  "user": {
    "id": "std_101",
    "email": "student@example.com",
    "role": "student",
    "fullName": "Kavitha R"
  }
}
```

---

## 2. Assessment Endpoints (`/api/assessments`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET`  | `/api/assessments/active` | Get active assessment questions | Yes |
| `POST` | `/api/assessments/start` | Start or resume an assessment session | Yes (Student) |
| `POST` | `/api/assessments/submit` | Submit answers, calculate score & percentage | Yes (Student) |
| `GET`  | `/api/assessments/recommendations` | Get rule-based course recommendations | Yes (Student) |

> **Note**: Course recommendations are **only accessible after** assessment submission is status `completed`.

---

## 3. Application Process Endpoints (`/api/applications`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET`  | `/api/applications/status` | Get application and lock status | Yes (Student) |
| `POST` | `/api/applications/save-step` | Save progress (Step 1 Personal Details, Step 2 Course) | Yes (Student & Unlocked) |
| `POST` | `/api/applications/submit` | Final submission after successful payment | Yes (Student & Unlocked) |

> **Security**: The application submission and step-saving endpoints are guarded by `accessControlMiddleware`. If Admin has not unlocked access (`application_access_status != 'unlocked'`), the API returns `403 Forbidden` with an explanation.

---

## 4. Payment Endpoints (`/api/payments`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/payments/create-intent` | Initialize an official UPI payment intent | Yes (Student & Unlocked) |
| `POST` | `/api/payments/verify-upi` | Verify UPI transaction reference & complete payment | Yes (Student & Unlocked) |
| `GET`  | `/api/payments/receipt/:paymentId` | Get generated payment receipt metadata & PDF data | Yes |

---

## 5. Admin Endpoints (`/api/admin`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET`  | `/api/admin/dashboard-stats` | Summary statistics (students, applications, payments) | Yes (Admin) |
| `GET`  | `/api/admin/students` | Paginated list of students with filter & search | Yes (Admin) |
| `POST` | `/api/admin/applications/toggle-access` | **Unlock/Lock student application process** | Yes (Admin) |
| `GET`  | `/api/admin/access-audit-logs` | View application unlock/lock audit trail | Yes (Admin) |
| `POST` | `/api/admin/questions` | Create or update assessment questions | Yes (Admin) |
| `DELETE`| `/api/admin/questions/:id` | Soft delete/deactivate an assessment question | Yes (Admin) |
| `POST` | `/api/admin/courses` | Create or update courses and fee structures | Yes (Admin) |

### Application Access Toggle Request Body:
```json
{
  "studentId": "std_101",
  "status": "unlocked",
  "reason": "Verified Entry Assessment score and counselling eligibility"
}
```

---

## 6. Notification Endpoints (`/api/notifications`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET`  | `/api/notifications` | Get system notifications and direct messages | Yes |
| `PATCH`| `/api/notifications/:id/read` | Mark notification as read | Yes |
| `POST` | `/api/notifications/direct-message` | Send real-time direct message between student and admin | Yes |
