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

export async function getAllStudents(page = 0, pageSize = 20, search = '') {
  const params = new URLSearchParams();
  params.set('page', String(page + 1));
  params.set('limit', String(pageSize));
  if (search) params.set('search', search);

  const res = await fetch(`${API_BASE}/students?${params.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) return { data: [], count: 0 };
  const result = await res.json();
  return {
    data: (result.data || []) as Student[],
    count: result.count ?? (Array.isArray(result.data) ? result.data.length : 0),
  };
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

// ── COURSES ────────────────────────────────────────────────
export async function getAllCourses(): Promise<Course[]> {
  const { data } = await supabase
    .from('courses')
    .select('*')
    .order('course_name', { ascending: true });
  return (Array.isArray(data) ? data : []) as Course[];
}

export async function upsertCourse(course: Partial<Course>): Promise<void> {
  if (course.id) {
    await supabase.from('courses').update({ ...course, updated_at: new Date().toISOString() }).eq('id', course.id);
  } else {
    await supabase.from('courses').insert(course);
  }
}

// ── QUESTIONS ──────────────────────────────────────────────
export async function getActiveQuestions(): Promise<Question[]> {
  const { data } = await supabase
    .from('questions')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(30);
  return (Array.isArray(data) ? data : []) as Question[];
}

export async function getAllQuestions(): Promise<Question[]> {
  const { data } = await supabase
    .from('questions')
    .select('*')
    .order('created_at', { ascending: false });
  return (Array.isArray(data) ? data : []) as Question[];
}

export async function upsertQuestion(q: Partial<Question>): Promise<void> {
  if (q.id) {
    await supabase.from('questions').update({ ...q, updated_at: new Date().toISOString() }).eq('id', q.id);
  } else {
    await supabase.from('questions').insert(q);
  }
}

export async function deleteQuestion(id: string): Promise<void> {
  await supabase.from('questions').delete().eq('id', id);
}

// ── ASSESSMENTS ────────────────────────────────────────────
export async function getAllAssessments(): Promise<Assessment[]> {
  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching assessments:', error);
    return [];
  }
  return (Array.isArray(data) ? data : []) as Assessment[];
}

export async function getStudentAssessment(studentId: string): Promise<Assessment | null> {
  const { data } = await supabase
    .from('assessments')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as Assessment | null;
}

export async function createAssessment(studentId: string): Promise<Assessment | null> {
  const { data } = await supabase
    .from('assessments')
    .insert({ student_id: studentId, status: 'in_progress', started_at: new Date().toISOString() })
    .select()
    .maybeSingle();
  return data as Assessment | null;
}

export async function submitAssessment(id: string, score: number, totalMarks: number, answers: Record<string, string>): Promise<void> {
  const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
  await supabase.from('assessments').update({
    score, total_marks: totalMarks, percentage,
    answers, status: 'completed', submitted_at: new Date().toISOString()
  }).eq('id', id);
}

// ── COURSE RECOMMENDATIONS ─────────────────────────────────
export async function getStudentRecommendations(studentId: string): Promise<CourseRecommendation[]> {
  const { data } = await supabase
    .from('course_recommendations')
    .select('*, course:courses(*)')
    .eq('student_id', studentId)
    .order('recommendation_percentage', { ascending: false });
  return (Array.isArray(data) ? data : []) as CourseRecommendation[];
}

export async function upsertRecommendation(rec: Partial<CourseRecommendation>): Promise<void> {
  await supabase.from('course_recommendations').upsert(rec, { onConflict: 'student_id,course_id' });
}

// ── APPLICATIONS ───────────────────────────────────────────
export async function getStudentApplication(studentId: string): Promise<Application | null> {
  const { data } = await supabase
    .from('applications')
    .select('*, course:courses(*)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as Application | null;
}

export async function upsertApplication(app: Partial<Application>): Promise<Application | null> {
  if (app.student_id && !isApplicationUnlocked(app.student_id)) {
    throw new Error('Application process is locked by TATTI Admin. Application cannot be modified or submitted.');
  }

  if (app.id) {
    const { data } = await supabase.from('applications')
      .update({ ...app, updated_at: new Date().toISOString() })
      .eq('id', app.id).select().maybeSingle();
    return data as Application | null;
  } else {
    const { data } = await supabase.from('applications').insert(app).select().maybeSingle();
    return data as Application | null;
  }
}

// ── PAYMENTS ───────────────────────────────────────────────
export async function getStudentPayment(studentId: string): Promise<Payment | null> {
  const { data } = await supabase
    .from('payments')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as Payment | null;
}

export async function createPayment(payment: Partial<Payment>): Promise<Payment | null> {
  if (payment.student_id && !isApplicationUnlocked(payment.student_id)) {
    throw new Error('Application process is locked by TATTI Admin. Payment cannot be initiated.');
  }

  const { data } = await supabase.from('payments').insert(payment).select().maybeSingle();
  return data as Payment | null;
}

export async function getAllPayments(page = 0, pageSize = 20) {
  const { data, count } = await supabase
    .from('payments')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);
  return { data: (Array.isArray(data) ? data : []) as Payment[], count: count ?? 0 };
}

// ── COUNSELLING ────────────────────────────────────────────
export async function getStudentCounselling(studentId: string): Promise<Counselling | null> {
  const { data } = await supabase
    .from('counselling')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as Counselling | null;
}

export async function upsertCounselling(c: Partial<Counselling>): Promise<void> {
  if (c.id) {
    await supabase.from('counselling').update({ ...c, updated_at: new Date().toISOString() }).eq('id', c.id);
  } else {
    await supabase.from('counselling').insert(c);
  }
}

export async function getAllCounselling(): Promise<Counselling[]> {
  const { data } = await supabase.from('counselling').select('*').order('created_at', { ascending: false });
  return (Array.isArray(data) ? data : []) as Counselling[];
}

// ── NOTIFICATIONS ──────────────────────────────────────────
export async function getNotifications(profileId: string): Promise<Notification[]> {
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(50);
  return (Array.isArray(data) ? data : []) as Notification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ is_read: true }).eq('id', id);
}

export async function createNotification(n: Partial<Notification>): Promise<void> {
  await supabase.from('notifications').insert(n);
}

// ── FOLLOW-UPS ─────────────────────────────────────────────
export async function getFollowUps(): Promise<FollowUp[]> {
  const { data } = await supabase.from('follow_ups').select('*').order('created_at', { ascending: false });
  return (Array.isArray(data) ? data : []) as FollowUp[];
}

export async function upsertFollowUp(f: Partial<FollowUp>): Promise<void> {
  if (f.id) {
    await supabase.from('follow_ups').update({ ...f, updated_at: new Date().toISOString() }).eq('id', f.id);
  } else {
    await supabase.from('follow_ups').insert(f);
  }
}
