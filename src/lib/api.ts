import { supabase } from '@/db/supabase';
import type {
  Student, Assessment, Course, Question,
  CourseRecommendation, Application, Payment,
  Counselling, Notification, FollowUp
} from '@/types/index';

// ── STUDENT ────────────────────────────────────────────────
export async function getStudentByProfileId(profileId: string): Promise<Student | null> {
  const { data } = await supabase
    .from('students')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();
  return data as Student | null;
}

export async function createStudent(data: Partial<Student>): Promise<Student | null> {
  const { data: result } = await supabase
    .from('students')
    .insert(data)
    .select()
    .maybeSingle();
  return result as Student | null;
}

export async function updateStudent(id: string, data: Partial<Student>): Promise<void> {
  await supabase.from('students').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
}

export async function getAllStudents(page = 0, pageSize = 20, search = '') {
  let query = supabase
    .from('students')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,student_id.ilike.%${search}%`);
  }
  const { data, count } = await query;
  return { data: (Array.isArray(data) ? data : []) as Student[], count: count ?? 0 };
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

export async function deleteCourse(id: string): Promise<void> {
  await supabase.from('courses').delete().eq('id', id);
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
