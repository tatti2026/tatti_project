export type UserRole = 'student' | 'admin';
export type AssessmentStatus = 'not_started' | 'in_progress' | 'completed';
export type ApplicationStatus = 'not_started' | 'in_progress' | 'submitted' | 'under_review' | 'approved' | 'rejected';
export type ApplicationAccessStatus = 'locked' | 'unlocked';
export type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'refunded';
export type AdmissionStatus = 'not_applied' | 'application_submitted' | 'under_review' | 'counselling_pending' | 'counselling_completed' | 'selected' | 'admission_confirmed' | 'not_selected';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  role: UserRole;
  avatar_url?: string | null;
  created_at: string;
}

export interface StudentRecord {
  id: string;
  profile_id: string;
  student_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  selected_course?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  assessment_status: AssessmentStatus;
  application_status: ApplicationStatus;
  application_access_status: ApplicationAccessStatus;
  application_unlocked_by?: string | null;
  application_unlocked_at?: string | null;
  payment_status: PaymentStatus;
  counselling_status?: string | null;
  admission_status: AdmissionStatus;
  created_at: string;
  updated_at: string;
}

export interface CourseRecord {
  id: string;
  course_name: string;
  course_code: string;
  description: string | null;
  duration: string | null;
  eligibility: string | null;
  fee: number;
  category: string | null;
  skills: string[] | null;
  career_opportunities: string[] | null;
  available_seats: number | null;
  status: 'available' | 'not_available';
}

export interface QuestionRecord {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string | null;
}

export interface AssessmentRecord {
  id: string;
  student_id: string;
  score: number | null;
  total_marks: number | null;
  percentage: number | null;
  answers: Record<string, string> | null;
  status: AssessmentStatus;
  submitted_at: string | null;
}

export interface ApplicationRecord {
  id: string;
  student_id: string;
  course_id: string | null;
  application_number: string | null;
  status: ApplicationStatus;
  step: number;
  submitted_at: string | null;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  application_id: string | null;
  student_id: string;
  payment_id: string;
  transaction_id: string;
  amount: number;
  payment_method: 'UPI';
  status: PaymentStatus;
  paid_at: string;
}

export interface AdminAuditLogRecord {
  id: string;
  student_id: string;
  admin_id: string;
  admin_name: string;
  action: 'UNLOCK' | 'LOCK';
  date: string;
  time: string;
  created_at: string;
}

export interface NotificationRecord {
  id: string;
  profile_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface ChatMessageRecord {
  id: string;
  student_id: string;
  sender_id: string;
  sender_name: string;
  sender_type: 'admin' | 'student';
  text: string;
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
}
