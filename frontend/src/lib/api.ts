import type {
  Student, Assessment, Course, Question,
  CourseRecommendation, Application, Payment,
  Counselling, Notification, FollowUp, Profile
} from '@/types/index';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getHeaders(): HeadersInit {
  // Check localStorage first (remember-me logins), then sessionStorage (session-only logins).
  // Both admin and student tokens must be found regardless of which storage was used.
  const token = localStorage.getItem('tatti_token') || sessionStorage.getItem('tatti_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ── STUDENT ────────────────────────────────────────────────
export async function getStudentByProfileId(profileId: string): Promise<Student | null> {
  const res = await fetch(`${API_BASE}/students/profile/${profileId}`, {
    headers: getHeaders(),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data) return null;
  return data as Student;
}

export async function createStudent(data: Partial<Student>): Promise<Student | null> {
  const res = await fetch(`${API_BASE}/students`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) return null;
  const result = await res.json();
  if (!result) return null;
  return result as Student;
}

export async function updateStudent(id: string, data: Partial<Student>): Promise<void> {
  await fetch(`${API_BASE}/students/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
}

export async function deleteStudent(id: string): Promise<void> {
  await fetch(`${API_BASE}/students/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
}

export async function unlockStudentApplication(studentId: string, adminName?: string): Promise<{ success: boolean; applicationAccess?: boolean; message?: string }> {
  const res = await fetch(`${API_BASE}/students/${studentId}/application-access`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ unlocked: true, adminName: adminName || 'TATTI Head Administrator' }),
  });
  return res.json();
}

export async function lockStudentApplication(studentId: string, adminName?: string): Promise<{ success: boolean; applicationAccess?: boolean; message?: string }> {
  const res = await fetch(`${API_BASE}/students/${studentId}/application-access`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ unlocked: false, adminName: adminName || 'TATTI Head Administrator' }),
  });
  return res.json();
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ReportsSummary {
  total_students: number;
  new_students_7d?: number;
  assessed_count: number;
  applications_count: number;
  paid_count: number;
  counselled_count: number;
  admitted_count: number;
  total_payments: number;
}

export interface DashboardStats {
  totalStudents: number;
  newStudents7d: number;
  assessmentCompleted: number;
  assessmentPending: number;
  applicationsSubmitted: number;
  paidApplications: number;
  unpaidApplications: number;
  counsellingPending: number;
  admissionsConfirmed: number;
  /** 7-day registration trend, one entry per day oldest→newest */
  registrationTrend?: { date: string; count: number }[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/admin/dashboard/stats`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    // Throw so the caller (AdminDashboard) can show the real error state instead of
    // silently displaying zeros — which was masking auth failures and DB errors.
    let errMsg = `Dashboard stats API error (HTTP ${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) errMsg = body.error;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(errMsg);
  }
  return await res.json();
}

export async function getReportsSummary(): Promise<ReportsSummary | null> {
  const res = await fetch(`${API_BASE}/admin/reports/summary`, {
    headers: getHeaders(),
  });
  if (!res.ok) return null;
  return await res.json();
}

function buildQueryString(filters: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== 'all') params.set(key, value);
  });
  return params.toString();
}

async function triggerDownload(url: string, fileName: string, expectedType: string) {
  const res = await fetch(url, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error('Download failed');
  }

  const blob = await res.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);

  if (!blob.type || !blob.type.includes(expectedType.replace(/\./g, ''))) {
    const text = await blob.text();
    if (text && text.toLowerCase().includes('error')) {
      throw new Error('Download content invalid');
    }
  }
}

export async function exportReportCSV(filters: {
  search?: string;
  assessmentStatus?: string;
  applicationStatus?: string;
  paymentStatus?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const query = buildQueryString({
    search: filters.search,
    assessment_status: filters.assessmentStatus,
    application_status: filters.applicationStatus,
    payment_status: filters.paymentStatus,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
  });
  const date = new Date().toISOString().slice(0, 10);
  await triggerDownload(`${API_BASE}/admin/reports/export/csv${query ? `?${query}` : ''}`, `tatti-report-${date}.csv`, 'csv');
}

export async function exportReportExcel(filters: {
  search?: string;
  assessmentStatus?: string;
  applicationStatus?: string;
  paymentStatus?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const query = buildQueryString({
    search: filters.search,
    assessment_status: filters.assessmentStatus,
    application_status: filters.applicationStatus,
    payment_status: filters.paymentStatus,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
  });
  const date = new Date().toISOString().slice(0, 10);
  await triggerDownload(`${API_BASE}/admin/reports/export/excel${query ? `?${query}` : ''}`, `tatti-report-${date}.xlsx`, 'spreadsheet');
}

export async function exportReportPDF(filters: {
  search?: string;
  assessmentStatus?: string;
  applicationStatus?: string;
  paymentStatus?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const query = buildQueryString({
    search: filters.search,
    assessment_status: filters.assessmentStatus,
    application_status: filters.applicationStatus,
    payment_status: filters.paymentStatus,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
  });
  const date = new Date().toISOString().slice(0, 10);
  await triggerDownload(`${API_BASE}/admin/reports/export/pdf${query ? `?${query}` : ''}`, `tatti-report-${date}.pdf`, 'pdf');
}

export async function exportStudentExcel(filters: {
  search?: string;
  assessmentStatus?: string;
  applicationStatus?: string;
  paymentStatus?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const query = buildQueryString({
    search: filters.search,
    assessment_status: filters.assessmentStatus,
    application_status: filters.applicationStatus,
    payment_status: filters.paymentStatus,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
  });
  const date = new Date().toISOString().slice(0, 10);
  await triggerDownload(`${API_BASE}/admin/students/export/excel${query ? `?${query}` : ''}`, `tatti-student-details-${date}.xlsx`, 'spreadsheet');
}

export async function exportStudentPDF(filters: {
  search?: string;
  assessmentStatus?: string;
  applicationStatus?: string;
  paymentStatus?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const query = buildQueryString({
    search: filters.search,
    assessment_status: filters.assessmentStatus,
    application_status: filters.applicationStatus,
    payment_status: filters.paymentStatus,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
  });
  const date = new Date().toISOString().slice(0, 10);
  await triggerDownload(`${API_BASE}/admin/students/export/pdf${query ? `?${query}` : ''}`, `tatti-student-details-${date}.pdf`, 'pdf');
}

export interface GetStudentsOptions {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  assessment_status?: string;
  application_status?: string;
  payment_status?: string;
  admission_status?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  fromDate?: string;
  toDate?: string;
}

export async function getAllStudents(
  pageOrOptions: number | GetStudentsOptions = 1,
  pageSize = 20,
  search = ''
) {
  let queryObj: Record<string, string> = {};

  if (typeof pageOrOptions === 'object' && pageOrOptions !== null) {
    const opts = pageOrOptions;
    const pageVal = opts.page ?? 1;
    const limitVal = opts.limit ?? opts.pageSize ?? 20;
    queryObj.page = pageVal.toString();
    queryObj.limit = limitVal.toString();
    if (opts.search) queryObj.search = opts.search;
    if (opts.assessment_status && opts.assessment_status !== 'all') queryObj.assessment_status = opts.assessment_status;
    if (opts.application_status && opts.application_status !== 'all') queryObj.application_status = opts.application_status;
    if (opts.payment_status && opts.payment_status !== 'all') queryObj.payment_status = opts.payment_status;
    if (opts.admission_status && opts.admission_status !== 'all') queryObj.admission_status = opts.admission_status;
    if (opts.sortField) queryObj.sortField = opts.sortField;
    if (opts.sortOrder) queryObj.sortOrder = opts.sortOrder;
    if (opts.fromDate) queryObj.fromDate = opts.fromDate;
    if (opts.toDate) queryObj.toDate = opts.toDate;
  } else {
    const rawPage = Number(pageOrOptions);
    const p = rawPage <= 0 ? 1 : rawPage;
    queryObj.page = p.toString();
    queryObj.limit = pageSize.toString();
    if (search) queryObj.search = search;
  }

  const query = new URLSearchParams(queryObj);
  const res = await fetch(`${API_BASE}/students?${query.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) return { data: [], count: 0, pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } };
  const result = await res.json();
  const data = (result.data || []) as Student[];
  const count = result.count ?? data.length;
  const pagination: PaginationMeta = result.pagination || {
    page: Number(queryObj.page) || 1,
    limit: Number(queryObj.limit) || 10,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / (Number(queryObj.limit) || 10))),
  };

  return {
    data,
    count,
    pagination,
  };
}


// ── COURSES ────────────────────────────────────────────────
export async function getAllCourses(): Promise<Course[]> {
  const res = await fetch(`${API_BASE}/courses`, {
    headers: getHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (Array.isArray(data) ? data : []) as Course[];
}

export async function upsertCourse(course: Partial<Course>): Promise<void> {
  if (course.id) {
    await fetch(`${API_BASE}/courses/${course.id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(course),
    });
  } else {
    await fetch(`${API_BASE}/courses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(course),
    });
  }
}

// ── QUESTIONS ──────────────────────────────────────────────
export async function getActiveQuestions(): Promise<Question[]> {
  const res = await fetch(`${API_BASE}/questions/active`, {
    headers: getHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (Array.isArray(data) ? data : []) as Question[];
}

export async function getAllQuestions(): Promise<Question[]> {
  const res = await fetch(`${API_BASE}/questions`, {
    headers: getHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (Array.isArray(data) ? data : []) as Question[];
}

export async function upsertQuestion(q: Partial<Question>): Promise<void> {
  if (q.id) {
    await fetch(`${API_BASE}/questions/${q.id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(q),
    });
  } else {
    await fetch(`${API_BASE}/questions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(q),
    });
  }
}

export async function deleteQuestion(id: string): Promise<void> {
  await fetch(`${API_BASE}/questions/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
}

// ── ASSESSMENTS ────────────────────────────────────────────
export async function getAllAssessments(): Promise<Assessment[]> {
  const res = await fetch(`${API_BASE}/assessments`, {
    headers: getHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (Array.isArray(data) ? data : []) as Assessment[];
}

export async function getStudentAssessment(studentId: string): Promise<Assessment | null> {
  const res = await fetch(`${API_BASE}/assessments/student/${studentId}`, {
    headers: getHeaders(),
  });
  if (!res.ok) return null;
  return await res.json();
}

export async function createAssessment(studentId: string): Promise<Assessment | null> {
  const res = await fetch(`${API_BASE}/assessments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ studentId }),
  });
  if (!res.ok) return null;
  return await res.json();
}

export async function submitAssessment(id: string, score: number, totalMarks: number, answers: Record<string, string>): Promise<void> {
  await fetch(`${API_BASE}/assessments/${id}/submit`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ score, totalMarks, answers }),
  });
}

// ── COURSE RECOMMENDATIONS ─────────────────────────────────
export async function getStudentRecommendations(studentId: string): Promise<CourseRecommendation[]> {
  const res = await fetch(`${API_BASE}/assessments/recommendations/${studentId}`, {
    headers: getHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (Array.isArray(data) ? data : []) as CourseRecommendation[];
}

export async function upsertRecommendation(rec: Partial<CourseRecommendation>): Promise<void> {
  await fetch(`${API_BASE}/assessments/recommendations`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(rec),
  });
}

// ── APPLICATIONS ───────────────────────────────────────────
export async function getStudentApplication(studentId: string): Promise<Application | null> {
  const res = await fetch(`${API_BASE}/applications/student/${studentId}`, {
    headers: getHeaders(),
  });
  if (!res.ok) return null;
  return await res.json();
}

export async function upsertApplication(app: Partial<Application>): Promise<Application | null> {
  const endpoint = app.id ? `${API_BASE}/applications/${app.id}` : `${API_BASE}/applications`;
  const method = app.id ? 'PUT' : 'POST';

  const res = await fetch(endpoint, {
    method,
    headers: getHeaders(),
    body: JSON.stringify(app),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to upsert application');
  }
  return await res.json();
}

// ── PAYMENTS ───────────────────────────────────────────────
export async function getStudentPayment(studentId: string): Promise<Payment | null> {
  const res = await fetch(`${API_BASE}/payments/student/${studentId}`, {
    headers: getHeaders(),
  });
  if (!res.ok) return null;
  return await res.json();
}

export async function createPayment(payment: Partial<Payment> & {
  screenshot?: string;
  utr_number?: string;
  course_id?: string;
}): Promise<Payment | null> {
  const res = await fetch(`${API_BASE}/payments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payment),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create payment');
  }
  return await res.json();
}

export interface GetPaymentsOptions {
  page?: number;
  pageSize?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export async function getAllPayments(pageOrOptions: number | GetPaymentsOptions = 1, pageSize = 20) {
  let queryObj: Record<string, string> = {};

  if (typeof pageOrOptions === 'object' && pageOrOptions !== null) {
    const opts = pageOrOptions;
    const pageVal = opts.page ?? 1;
    const limitVal = opts.limit ?? opts.pageSize ?? 20;
    queryObj.page = pageVal.toString();
    queryObj.limit = limitVal.toString();
    if (opts.status && opts.status !== 'all') queryObj.status = opts.status;
    if (opts.search) queryObj.search = opts.search;
  } else {
    const rawPage = Number(pageOrOptions);
    const p = rawPage <= 0 ? 1 : rawPage;
    queryObj.page = p.toString();
    queryObj.limit = pageSize.toString();
  }

  const query = new URLSearchParams(queryObj);
  const res = await fetch(`${API_BASE}/payments?${query.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) return { data: [], count: 0, pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } };
  const result = await res.json();
  const data = (result.data || []) as Payment[];
  const count = result.count ?? data.length;
  const pagination: PaginationMeta = result.pagination || {
    page: Number(queryObj.page) || 1,
    limit: Number(queryObj.limit) || 10,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / (Number(queryObj.limit) || 10))),
  };

  return {
    data,
    count,
    pagination,
  };
}

// ── ADMIN PAYMENT VERIFICATION ─────────────────────────────

export interface PendingPayment {
  id: string;
  student_id: string;
  application_id: string | null;
  course_id: string | null;
  payment_id: string | null;
  transaction_id: string | null;
  utr_number: string | null;
  amount: number;
  payment_method: string | null;
  screenshot_url: string | null;
  status: string;
  submitted_at: string | null;
  created_at: string;
  student_name: string | null;
  student_code: string | null;
  student_email: string | null;
  student_phone: string | null;
  student_avatar: string | null;
  course_name: string | null;
  course_fee: number | null;
  application_status: string | null;
}

export interface RejectedPayment extends PendingPayment {
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
}

export interface PaymentDetails {
  id: string;
  student_id: string;
  application_id: string | null;
  course_id: string | null;
  amount: number;
  utr_number: string | null;
  transaction_id: string | null;
  payment_id: string | null;
  status: string;
  submitted_at: string | null;
  screenshot_url: string | null;
  screenshot_path: string | null;
  approved_by: string | null;
  approved_at: string | null;
  payment_verified_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  student: {
    id: string;
    profile_id: string | null;
    full_name: string | null;
    student_id: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
  course: {
    id: string | null;
    course_name: string | null;
    fee: number | null;
  };
  application: {
    id: string | null;
    status: string | null;
    step: number | null;
    submitted_at: string | null;
    confirmed_at: string | null;
  };
}

export async function getPendingPayments(page?: number, limit?: number, search?: string): Promise<any> {
  const params = new URLSearchParams();
  if (page !== undefined) params.set('page', page.toString());
  if (limit !== undefined) params.set('limit', limit.toString());
  if (search) params.set('search', search);

  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/admin/payments/pending${qs}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    if (page !== undefined) return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } };
    return [];
  }
  return await res.json();
}

export async function getRejectedPayments(page?: number, limit?: number, search?: string): Promise<any> {
  const params = new URLSearchParams();
  if (page !== undefined) params.set('page', page.toString());
  if (limit !== undefined) params.set('limit', limit.toString());
  if (search) params.set('search', search);

  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/admin/payments/rejected${qs}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    if (page !== undefined) return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } };
    return [];
  }
  return await res.json();
}

export async function getPaymentDetails(id: string): Promise<PaymentDetails | null> {
  const res = await fetch(`${API_BASE}/admin/payments/${id}`, {
    headers: getHeaders(),
  });
  if (!res.ok) return null;
  return await res.json();
}

export async function approvePayment(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/admin/payments/${id}/approve`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to approve payment');
  return data;
}

export async function rejectPayment(id: string, reason: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/admin/payments/${id}/reject`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ reason }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to reject payment');
  return data;
}

export function getPaymentScreenshotUrl(paymentId: string, isAdmin = false): string {
  const token = localStorage.getItem('tatti_token') || sessionStorage.getItem('tatti_token');
  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
  if (isAdmin) {
    return `${API_BASE}/admin/payments/${paymentId}/screenshot${tokenQuery}`;
  }
  return `${API_BASE}/payments/${paymentId}/screenshot${tokenQuery}`;
}

export function resolvePaymentScreenshotUrl(
  urlOrPath: string | null | undefined,
  paymentId?: string,
  isAdmin = false
): string | null {
  const token = localStorage.getItem('tatti_token') || sessionStorage.getItem('tatti_token');
  const tokenQuery = token ? `token=${encodeURIComponent(token)}` : '';

  if (urlOrPath && urlOrPath.startsWith('data:')) {
    return urlOrPath;
  }

  if (isAdmin && paymentId) {
    return getPaymentScreenshotUrl(paymentId, true);
  }

  if (urlOrPath) {
    if (urlOrPath.startsWith('/api')) {
      const backendOrigin = API_BASE.replace(/\/api$/, '');
      const fullUrl = `${backendOrigin}${urlOrPath}`;
      if (tokenQuery && !fullUrl.includes('token=')) {
        return fullUrl.includes('?') ? `${fullUrl}&${tokenQuery}` : `${fullUrl}?${tokenQuery}`;
      }
      return fullUrl;
    }
    if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
      if (tokenQuery && !urlOrPath.includes('token=')) {
        return urlOrPath.includes('?') ? `${urlOrPath}&${tokenQuery}` : `${urlOrPath}?${tokenQuery}`;
      }
      return urlOrPath;
    }
  }

  if (paymentId) {
    return getPaymentScreenshotUrl(paymentId, isAdmin);
  }

  return null;
}



// ── COUNSELLING ────────────────────────────────────────────
export async function getStudentCounselling(studentId: string): Promise<Counselling | null> {
  const res = await fetch(`${API_BASE}/counselling/student/${studentId}`, {
    headers: getHeaders(),
  });
  if (!res.ok) return null;
  return await res.json();
}

export async function upsertCounselling(c: Partial<Counselling>): Promise<void> {
  if (c.id) {
    await fetch(`${API_BASE}/counselling/${c.id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(c),
    });
  } else {
    await fetch(`${API_BASE}/counselling`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(c),
    });
  }
}

export async function getAllCounselling(page?: number, limit?: number, search?: string): Promise<any> {
  const params = new URLSearchParams();
  if (page !== undefined) params.set('page', page.toString());
  if (limit !== undefined) params.set('limit', limit.toString());
  if (search) params.set('search', search);

  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/counselling${qs}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    if (page !== undefined) return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } };
    return [];
  }
  return await res.json();
}

// ── NOTIFICATIONS ──────────────────────────────────────────
export async function getNotifications(profileId: string): Promise<Notification[]> {
  const res = await fetch(`${API_BASE}/notifications/profile/${profileId}`, {
    headers: getHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (Array.isArray(data) ? data : []) as Notification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  await fetch(`${API_BASE}/notifications/${id}/read`, {
    method: 'PUT',
    headers: getHeaders(),
  });
}

export async function createNotification(n: Partial<Notification>): Promise<void> {
  await fetch(`${API_BASE}/notifications`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(n),
  });
}

// ── FOLLOW-UPS ─────────────────────────────────────────────
export async function getFollowUps(page?: number, limit?: number, intent?: string, search?: string): Promise<any> {
  const params = new URLSearchParams();
  if (page !== undefined) params.set('page', page.toString());
  if (limit !== undefined) params.set('limit', limit.toString());
  if (intent) params.set('intent', intent);
  if (search) params.set('search', search);

  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/follow-ups${qs}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    if (page !== undefined) return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } };
    return [];
  }
  return await res.json();
}

export async function upsertFollowUp(f: Partial<FollowUp>): Promise<void> {
  if (f.id) {
    await fetch(`${API_BASE}/follow-ups/${f.id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(f),
    });
  } else {
    await fetch(`${API_BASE}/follow-ups`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(f),
    });
  }
}

// ── PROFILES ───────────────────────────────────────────────
export async function updateProfile(id: string, data: Partial<Profile>): Promise<void> {
  await fetch(`${API_BASE}/profiles/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
}

// ── DIRECT MESSAGES ─────────────────────────────────────────
export interface DirectMessageAttachment {
  name: string;
  size: number | string;
  type?: string;
  url?: string;
}

export interface DirectMessage {
  id: string;
  studentId: string;
  senderId: string;
  senderName: string;
  senderType: 'admin' | 'student';
  text: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  deliveredAt?: string;
  readAt?: string;
  attachment?: DirectMessageAttachment;
}

export interface ConversationSummary {
  studentId: string;
  studentCode?: string;
  studentName: string;
  studentEmail?: string;
  studentPhone?: string;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageSender: string;
  unreadCount: number;
  totalMessages: number;
}

export async function sendMessage(
  studentId: string,
  text: string,
  senderName?: string,
  attachment?: DirectMessageAttachment
): Promise<DirectMessage | null> {
  const res = await fetch(`${API_BASE}/messages/send`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ studentId, text, senderName, attachment }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to send message');
  }
  const data = await res.json();
  return data.message as DirectMessage;
}

export async function getConversation(studentId: string): Promise<DirectMessage[]> {
  const res = await fetch(`${API_BASE}/messages/conversation/${studentId}`, {
    headers: getHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.messages || []) as DirectMessage[];
}

export async function getAllConversations(): Promise<ConversationSummary[]> {
  const res = await fetch(`${API_BASE}/messages/conversations`, {
    headers: getHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.conversations || []) as ConversationSummary[];
}

export async function markMessagesRead(studentId: string): Promise<void> {
  await fetch(`${API_BASE}/messages/read/${studentId}`, {
    method: 'PUT',
    headers: getHeaders(),
  });
}

export async function getUnreadCount(): Promise<number> {
  const res = await fetch(`${API_BASE}/messages/unread-count`, {
    headers: getHeaders(),
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.count || 0;
}

export async function getMyStudentId(): Promise<{ studentId: string | null; studentCode: string | null }> {
  const res = await fetch(`${API_BASE}/messages/my-student-id`, {
    headers: getHeaders(),
  });
  if (!res.ok) return { studentId: null, studentCode: null };
  return await res.json();
}

