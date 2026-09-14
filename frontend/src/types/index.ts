export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  withCount?: boolean;
}

export type UserRole = 'student' | 'admin';
export type AssessmentStatus = 'not_started' | 'in_progress' | 'completed';
export type ApplicationStatus = 'not_started' | 'in_progress' | 'submitted' | 'under_review' | 'approved' | 'rejected';
export type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'refunded';
export type CounsellingStatus = 'not_scheduled' | 'pending' | 'scheduled' | 'completed' | 'selected' | 'rejected' | 'follow_up_required';
export type AdmissionStatus = 'not_applied' | 'application_submitted' | 'under_review' | 'counselling_pending' | 'counselling_completed' | 'selected' | 'admission_confirmed' | 'not_selected';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type CourseStatus = 'available' | 'not_available';
export type FollowupIntent = 'high' | 'medium' | 'low';
export type NotificationType = 'assessment' | 'course' | 'application' | 'payment' | 'counselling' | 'admission' | 'general';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  profile_id: string;
  student_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  selected_course?: string | null;
  date_of_birth: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  assessment_status: AssessmentStatus;
  application_status: ApplicationStatus;
  payment_status: PaymentStatus;
  counselling_status: CounsellingStatus;
  admission_status: AdmissionStatus;
  application_access_status?: 'locked' | 'unlocked';
  application_unlocked_by?: string | null;
  application_unlocked_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Course {
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
  image_url: string | null;
  available_seats: number | null;
  status: CourseStatus;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  marks: number;
  difficulty: DifficultyLevel;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Assessment {
  id: string;
  student_id: string;
  score: number | null;
  total_marks: number | null;
  percentage: number | null;
  answers: Record<string, string> | null;
  status: AssessmentStatus;
  started_at: string | null;
  submitted_at: string | null;
  created_at: string;
}

export interface CourseRecommendation {
  id: string;
  student_id: string;
  course_id: string;
  recommendation_percentage: number;
  is_interested: boolean;
  is_selected: boolean;
  created_at: string;
  course?: Course;
}

export interface Application {
  id: string;
  student_id: string;
  course_id: string | null;
  application_number: string | null;
  status: ApplicationStatus;
  step: number;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  course?: Course;
}

export interface Payment {
  id: string;
  application_id: string;
  student_id: string;
  payment_id: string | null;
  transaction_id: string | null;
  amount: number;
  payment_method: string | null;
  status: PaymentStatus;
  paid_at: string | null;
  created_at: string;
}

export interface Counselling {
  id: string;
  student_id: string;
  counsellor_name: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  mode: string | null;
  venue_or_link: string | null;
  instructions: string | null;
  notes: string | null;
  status: CounsellingStatus;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  profile_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

export interface FollowUp {
  id: string;
  student_id: string;
  intent_level: FollowupIntent;
  last_interaction: string | null;
  followup_date: string | null;
  followup_status: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentWithDetails extends Student {
  profile?: Profile;
  assessment?: Assessment;
  application?: Application;
  payment?: Payment;
  counselling?: Counselling;
}

export interface AdminAuditLog {
  id: string;
  student_id: string;
  student_name?: string;
  admin_id: string;
  admin_name: string;
  action: 'UNLOCK' | 'LOCK';
  date: string;
  time: string;
  created_at: string;
}

