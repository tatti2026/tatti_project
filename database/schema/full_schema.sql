-- ============================================================================
-- TATTI Student Management Portal - Consolidated Database Schema
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Students Table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id VARCHAR(50) UNIQUE,
    full_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    date_of_birth DATE,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    parent_name VARCHAR(255),
    parent_phone VARCHAR(20),
    selected_course VARCHAR(255),
    assessment_status VARCHAR(30) DEFAULT 'not_started' CHECK (assessment_status IN ('not_started', 'in_progress', 'completed')),
    application_status VARCHAR(30) DEFAULT 'not_started' CHECK (application_status IN ('not_started', 'in_progress', 'submitted', 'under_review', 'approved', 'rejected')),
    application_access_status VARCHAR(20) DEFAULT 'locked' CHECK (application_access_status IN ('locked', 'unlocked')),
    application_unlocked_by VARCHAR(255),
    application_unlocked_at TIMESTAMPTZ,
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded')),
    admission_status VARCHAR(40) DEFAULT 'not_applied' CHECK (admission_status IN ('not_applied', 'application_submitted', 'under_review', 'counselling_pending', 'counselling_completed', 'selected', 'admission_confirmed', 'not_selected')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Courses Catalog Table
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_name VARCHAR(255) NOT NULL,
    course_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    duration VARCHAR(50),
    eligibility TEXT,
    fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
    category VARCHAR(100),
    skills TEXT[],
    career_opportunities TEXT[],
    image_url TEXT,
    available_seats INTEGER DEFAULT 30,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'not_available')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Questions Table (Entrance Exam)
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
    marks INTEGER NOT NULL DEFAULT 1,
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Assessments Table
CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    score NUMERIC(5, 2),
    total_marks NUMERIC(5, 2),
    percentage NUMERIC(5, 2),
    answers JSONB,
    status VARCHAR(30) DEFAULT 'in_progress' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    started_at TIMESTAMPTZ DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Course Recommendations Table
CREATE TABLE IF NOT EXISTS public.course_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    recommendation_percentage NUMERIC(5, 2) NOT NULL,
    is_interested BOOLEAN DEFAULT false,
    is_selected BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_student_course UNIQUE (student_id, course_id)
);

-- 7. Applications Table
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id),
    application_number VARCHAR(50) UNIQUE,
    status VARCHAR(30) DEFAULT 'in_progress' CHECK (status IN ('not_started', 'in_progress', 'submitted', 'under_review', 'approved', 'rejected')),
    step INTEGER DEFAULT 1,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Payments Table (UPI Only)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    payment_id VARCHAR(100) UNIQUE,
    transaction_id VARCHAR(100) UNIQUE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'UPI',
    status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'failed', 'refunded')),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Direct Messages Table (WhatsApp-style Admin <-> Student)
CREATE TABLE IF NOT EXISTS public.direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    sender_id UUID,
    sender_name VARCHAR(255) NOT NULL,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('admin', 'student')),
    message_text TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Admin Audit Logs Table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    admin_id UUID,
    admin_name VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('UNLOCK', 'LOCK')),
    date VARCHAR(50) NOT NULL,
    time VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
