import type {
  Student, Assessment, Course, Question,
  CourseRecommendation, Application, Payment,
  Counselling, Notification, FollowUp, Profile
} from '@/types/index';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('tatti_token');
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

export async function getAllStudents(page = 0, pageSize = 20, search = '') {
  const query = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    search: search || '',
  });
  const res = await fetch(`${API_BASE}/students?${query.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) return { data: [], count: 0 };
  const result = await res.json();
  return {
    data: (result.data || []) as Student[],
    count: result.count ?? 0,
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

export async function deleteCourse(id: string): Promise<void> {
  await fetch(`${API_BASE}/courses/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
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

export async function createPayment(payment: Partial<Payment>): Promise<Payment | null> {
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

export async function getAllPayments(page = 0, pageSize = 20) {
  const query = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  const res = await fetch(`${API_BASE}/payments?${query.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) return { data: [], count: 0 };
  const result = await res.json();
  return {
    data: (result.data || []) as Payment[],
    count: result.count ?? 0,
  };
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

export async function getAllCounselling(): Promise<Counselling[]> {
  const res = await fetch(`${API_BASE}/counselling`, {
    headers: getHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (Array.isArray(data) ? data : []) as Counselling[];
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
export async function getFollowUps(): Promise<FollowUp[]> {
  const res = await fetch(`${API_BASE}/follow-ups`, {
    headers: getHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (Array.isArray(data) ? data : []) as FollowUp[];
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

