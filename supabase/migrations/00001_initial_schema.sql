
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User roles
CREATE TYPE public.user_role AS ENUM ('student', 'admin');
CREATE TYPE public.assessment_status AS ENUM ('not_started', 'in_progress', 'completed');
CREATE TYPE public.application_status AS ENUM ('not_started', 'in_progress', 'submitted', 'under_review', 'approved', 'rejected');
CREATE TYPE public.payment_status AS ENUM ('unpaid', 'paid', 'failed', 'refunded');
CREATE TYPE public.counselling_status AS ENUM ('not_scheduled', 'pending', 'scheduled', 'completed', 'selected', 'rejected', 'follow_up_required');
CREATE TYPE public.admission_status AS ENUM ('not_applied', 'application_submitted', 'under_review', 'counselling_pending', 'counselling_completed', 'selected', 'admission_confirmed', 'not_selected');
CREATE TYPE public.difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE public.course_status AS ENUM ('available', 'not_available');
CREATE TYPE public.followup_intent AS ENUM ('high', 'medium', 'low');
CREATE TYPE public.notification_type AS ENUM ('assessment', 'course', 'application', 'payment', 'counselling', 'admission', 'general');

-- Profiles table (synced from auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  phone text,
  role public.user_role NOT NULL DEFAULT 'student',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Trigger to sync new users to profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, role)
  VALUES (NEW.id, NEW.email, NEW.phone, 'student');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Helper function for role checking
CREATE OR REPLACE FUNCTION get_user_role(uid uuid)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = uid;
$$;

-- Students table (extended profile for students)
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id text UNIQUE,
  full_name text,
  email text,
  phone text,
  date_of_birth date,
  address text,
  city text,
  state text,
  pincode text,
  assessment_status public.assessment_status NOT NULL DEFAULT 'not_started',
  application_status public.application_status NOT NULL DEFAULT 'not_started',
  payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  counselling_status public.counselling_status NOT NULL DEFAULT 'not_scheduled',
  admission_status public.admission_status NOT NULL DEFAULT 'not_applied',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Courses table
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_name text NOT NULL,
  course_code text UNIQUE NOT NULL,
  description text,
  duration text,
  eligibility text,
  fee numeric(10,2) NOT NULL DEFAULT 0,
  category text,
  skills text[],
  career_opportunities text[],
  image_url text,
  available_seats integer DEFAULT 100,
  status public.course_status NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Assessment questions
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer text NOT NULL CHECK (correct_answer IN ('A','B','C','D')),
  marks integer NOT NULL DEFAULT 1,
  difficulty public.difficulty_level NOT NULL DEFAULT 'medium',
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Student assessments
CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score integer,
  total_marks integer,
  percentage numeric(5,2),
  answers jsonb,
  status public.assessment_status NOT NULL DEFAULT 'not_started',
  started_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- Course recommendations
CREATE TABLE public.course_recommendations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  recommendation_percentage numeric(5,2) DEFAULT 0,
  is_interested boolean NOT NULL DEFAULT false,
  is_selected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_recommendations ENABLE ROW LEVEL SECURITY;

-- Applications
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id),
  application_number text UNIQUE,
  status public.application_status NOT NULL DEFAULT 'not_started',
  step integer NOT NULL DEFAULT 1,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Auto-generate application number
CREATE OR REPLACE FUNCTION generate_application_number()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.application_number := 'APP-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM()*100000)::text, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_application_number
  BEFORE INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION generate_application_number();

-- Payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  payment_id text UNIQUE,
  transaction_id text UNIQUE,
  amount numeric(10,2) NOT NULL,
  payment_method text,
  status public.payment_status NOT NULL DEFAULT 'unpaid',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Auto-generate payment ID
CREATE OR REPLACE FUNCTION generate_payment_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.payment_id := 'PAY-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM()*100000)::text, 5, '0');
  NEW.transaction_id := 'TXN-' || uuid_generate_v4()::text;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_payment_id
  BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION generate_payment_id();

-- Counselling sessions
CREATE TABLE public.counselling (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  counsellor_name text,
  scheduled_date date,
  scheduled_time time,
  mode text DEFAULT 'Online',
  venue_or_link text,
  instructions text,
  notes text,
  status public.counselling_status NOT NULL DEFAULT 'not_scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.counselling ENABLE ROW LEVEL SECURITY;

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type public.notification_type NOT NULL DEFAULT 'general',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Follow-ups
CREATE TABLE public.follow_ups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  intent_level public.followup_intent NOT NULL DEFAULT 'medium',
  last_interaction timestamptz,
  followup_date date,
  followup_status text DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

-- ==================== RLS POLICIES ====================

-- PROFILES
CREATE POLICY "Admins full access profiles" ON profiles FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Users view own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (role IS NOT DISTINCT FROM get_user_role(auth.uid()));

-- STUDENTS
CREATE POLICY "Admins full access students" ON students FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Students view own record" ON students FOR SELECT TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "Students insert own record" ON students FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Students update own record" ON students FOR UPDATE TO authenticated USING (profile_id = auth.uid());

-- COURSES
CREATE POLICY "Anyone can view available courses" ON courses FOR SELECT USING (true);
CREATE POLICY "Admins full access courses" ON courses FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');

-- QUESTIONS
CREATE POLICY "Authenticated users can view active questions" ON questions FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins full access questions" ON questions FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');

-- ASSESSMENTS
CREATE POLICY "Admins full access assessments" ON assessments FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Students view own assessments" ON assessments FOR SELECT TO authenticated USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));
CREATE POLICY "Students insert own assessments" ON assessments FOR INSERT TO authenticated WITH CHECK (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));
CREATE POLICY "Students update own assessments" ON assessments FOR UPDATE TO authenticated USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));

-- COURSE RECOMMENDATIONS
CREATE POLICY "Admins full access recommendations" ON course_recommendations FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Students view own recommendations" ON course_recommendations FOR SELECT TO authenticated USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));
CREATE POLICY "Students insert own recommendations" ON course_recommendations FOR INSERT TO authenticated WITH CHECK (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));
CREATE POLICY "Students update own recommendations" ON course_recommendations FOR UPDATE TO authenticated USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));

-- APPLICATIONS
CREATE POLICY "Admins full access applications" ON applications FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Students view own applications" ON applications FOR SELECT TO authenticated USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));
CREATE POLICY "Students insert own applications" ON applications FOR INSERT TO authenticated WITH CHECK (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));
CREATE POLICY "Students update own applications" ON applications FOR UPDATE TO authenticated USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));

-- PAYMENTS
CREATE POLICY "Admins full access payments" ON payments FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Students view own payments" ON payments FOR SELECT TO authenticated USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));
CREATE POLICY "Students insert own payments" ON payments FOR INSERT TO authenticated WITH CHECK (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));
CREATE POLICY "Students update own payments" ON payments FOR UPDATE TO authenticated USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));

-- COUNSELLING
CREATE POLICY "Admins full access counselling" ON counselling FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Students view own counselling" ON counselling FOR SELECT TO authenticated USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));

-- NOTIFICATIONS
CREATE POLICY "Admins full access notifications" ON notifications FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Users view own notifications" ON notifications FOR SELECT TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "Users insert own notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

-- FOLLOW_UPS
CREATE POLICY "Admins full access follow_ups" ON follow_ups FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Students view own follow_ups" ON follow_ups FOR SELECT TO authenticated USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));

-- Public view
CREATE VIEW public.public_profiles AS SELECT id, role, full_name FROM profiles;

-- ==================== SEED DATA ====================

-- Courses seed data
INSERT INTO public.courses (course_name, course_code, description, duration, eligibility, fee, category, skills, career_opportunities, available_seats, status) VALUES
('Artificial Intelligence & Machine Learning', 'AI-ML-001', 'Master AI algorithms, deep learning, neural networks, and practical ML applications using Python and TensorFlow.', '12 Months', 'B.E/B.Tech in CS/IT or equivalent with Mathematics background', 75000.00, 'Technology', ARRAY['Python', 'TensorFlow', 'Data Analysis', 'Neural Networks', 'NLP'], ARRAY['ML Engineer', 'Data Scientist', 'AI Researcher', 'Deep Learning Engineer'], 60, 'available'),
('Full Stack Web Development', 'FSWD-002', 'Learn modern web development with React, Node.js, databases, and cloud deployment to build scalable applications.', '8 Months', 'Any degree with basic programming knowledge', 45000.00, 'Technology', ARRAY['React', 'Node.js', 'MongoDB', 'REST APIs', 'DevOps'], ARRAY['Full Stack Developer', 'Frontend Developer', 'Backend Developer', 'Software Engineer'], 80, 'available'),
('Cloud Computing & DevOps', 'CC-DO-003', 'Master AWS, Azure, Docker, Kubernetes, CI/CD pipelines, and modern infrastructure management.', '10 Months', 'B.E/B.Tech or equivalent with networking basics', 65000.00, 'Technology', ARRAY['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Terraform'], ARRAY['DevOps Engineer', 'Cloud Architect', 'SRE', 'Infrastructure Engineer'], 50, 'available'),
('Data Science & Analytics', 'DS-AN-004', 'Comprehensive data science program covering statistical analysis, visualization, and business intelligence tools.', '9 Months', 'Graduation with Mathematics/Statistics background', 55000.00, 'Data', ARRAY['Python', 'R', 'Tableau', 'SQL', 'Machine Learning'], ARRAY['Data Analyst', 'Business Analyst', 'Data Scientist', 'BI Developer'], 70, 'available'),
('Cybersecurity & Ethical Hacking', 'CS-EH-005', 'Learn network security, penetration testing, vulnerability assessment, and cybersecurity best practices.', '10 Months', 'B.E/B.Tech in CS/IT/ECE with networking knowledge', 70000.00, 'Security', ARRAY['Network Security', 'Penetration Testing', 'SIEM', 'Cryptography', 'Firewall'], ARRAY['Security Analyst', 'Ethical Hacker', 'SOC Analyst', 'Security Consultant'], 40, 'available'),
('Internet of Things (IoT)', 'IOT-006', 'Build smart connected systems using embedded systems, sensors, protocols, and cloud integration.', '8 Months', 'B.E/B.Tech in ECE/EEE/CS with electronics basics', 50000.00, 'Technology', ARRAY['Arduino', 'Raspberry Pi', 'MQTT', 'Python', 'Embedded C'], ARRAY['IoT Engineer', 'Embedded Developer', 'Automation Engineer', 'Solutions Architect'], 55, 'available');

-- Sample assessment questions
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, marks, difficulty, category, is_active) VALUES
('What does CPU stand for?', 'Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Core Processing Unit', 'A', 1, 'easy', 'Computer Basics', true),
('Which programming language is known as the "language of the web"?', 'Python', 'Java', 'JavaScript', 'C++', 'C', 1, 'easy', 'Programming', true),
('What is the time complexity of binary search?', 'O(n)', 'O(log n)', 'O(n²)', 'O(1)', 'B', 2, 'medium', 'Algorithms', true),
('Which data structure uses LIFO (Last In, First Out) principle?', 'Queue', 'Array', 'Stack', 'Linked List', 'C', 1, 'easy', 'Data Structures', true),
('What does HTML stand for?', 'Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Language', 'Home Tool Markup Language', 'A', 1, 'easy', 'Web Development', true),
('Which sorting algorithm has the best average-case time complexity?', 'Bubble Sort', 'Insertion Sort', 'Merge Sort', 'Selection Sort', 'C', 2, 'medium', 'Algorithms', true),
('What is the primary purpose of a firewall?', 'Speed up internet', 'Store data', 'Block unauthorized access', 'Manage files', 'C', 1, 'easy', 'Networking', true),
('Which command is used to list files in Linux?', 'dir', 'list', 'ls', 'show', 'C', 1, 'easy', 'Operating Systems', true),
('What does SQL stand for?', 'Structured Query Language', 'Simple Question Language', 'Standard Query Logic', 'Structured Question Library', 'A', 1, 'easy', 'Databases', true),
('What is machine learning?', 'Programming computers manually', 'Algorithms that learn from data', 'A type of computer hardware', 'Internet security protocol', 'B', 2, 'medium', 'AI/ML', true),
('Which protocol is used for secure web communication?', 'HTTP', 'FTP', 'HTTPS', 'SMTP', 'C', 1, 'easy', 'Networking', true),
('What is a primary key in a database?', 'First column', 'Unique identifier for a record', 'Foreign reference', 'Index key', 'B', 1, 'medium', 'Databases', true),
('What does OOP stand for?', 'Object Oriented Programming', 'Open Operating Platform', 'Output Object Processing', 'Optional Output Program', 'A', 1, 'easy', 'Programming', true),
('Which company developed the Python programming language?', 'Microsoft', 'Google', 'PSF (Python Software Foundation)', 'Apple', 'C', 1, 'medium', 'Programming', true),
('What is cloud computing?', 'Computing using physical servers only', 'Delivering services over the internet', 'A type of weather app', 'Data stored on local drives', 'B', 1, 'easy', 'Cloud', true),
('What is the function of an operating system?', 'Only run games', 'Manage hardware and software resources', 'Browse the internet', 'Write code', 'B', 1, 'easy', 'Operating Systems', true),
('Which of the following is a NoSQL database?', 'MySQL', 'PostgreSQL', 'MongoDB', 'Oracle', 'C', 2, 'medium', 'Databases', true),
('What is recursion in programming?', 'Loop that counts down', 'Function that calls itself', 'Method that sorts arrays', 'Class inheriting from parent', 'B', 2, 'medium', 'Programming', true),
('Which layer of OSI model handles encryption?', 'Network Layer', 'Transport Layer', 'Session Layer', 'Presentation Layer', 'D', 2, 'hard', 'Networking', true),
('What is an API?', 'Application Programming Interface', 'Automatic Program Installation', 'Application Plugin Interface', 'Advanced Program Instruction', 'A', 1, 'easy', 'Programming', true),
('What does RAM stand for?', 'Random Access Memory', 'Read Access Module', 'Rapid Application Memory', 'Read And Modify', 'A', 1, 'easy', 'Computer Basics', true),
('Which of the following is a version control system?', 'Docker', 'Jenkins', 'Git', 'Ansible', 'C', 1, 'easy', 'DevOps', true),
('What is the purpose of a VPN?', 'Speed up browsing', 'Create secure private network over public internet', 'Store passwords', 'Block advertisements', 'B', 2, 'medium', 'Networking', true),
('What is agile methodology in software development?', 'Waterfall-based planning', 'Iterative and incremental approach', 'Single phase delivery', 'Document first approach', 'B', 2, 'medium', 'Software Engineering', true),
('Which of the following is NOT a programming paradigm?', 'Object-Oriented', 'Functional', 'Procedural', 'Relational', 'D', 2, 'medium', 'Programming', true),
('What is a neural network inspired by?', 'Computer circuits', 'Human brain structure', 'Database design', 'Network topology', 'B', 2, 'medium', 'AI/ML', true),
('Which command deploys a Docker container?', 'docker start', 'docker run', 'docker deploy', 'docker launch', 'B', 2, 'medium', 'DevOps', true),
('What is Big O notation used for?', 'Database indexing', 'Measuring algorithm efficiency', 'Naming variables', 'Memory allocation', 'B', 2, 'medium', 'Algorithms', true),
('What does IoT stand for?', 'Internet of Things', 'Integration of Technology', 'Internet of Transactions', 'Interface of Tools', 'A', 1, 'easy', 'IoT', true),
('What is the purpose of encryption?', 'Speed up data transfer', 'Compress files', 'Protect data by converting to unreadable format', 'Organize databases', 'C', 2, 'medium', 'Cybersecurity', true);
