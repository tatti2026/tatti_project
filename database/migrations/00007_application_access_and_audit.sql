-- TATTI Portal: Migration 00007 - Application Access Control & Admin Audit Logs

-- Add application_access_status, application_unlocked_by, application_unlocked_at to students
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS application_access_status VARCHAR(20) DEFAULT 'locked' CHECK (application_access_status IN ('locked', 'unlocked')),
ADD COLUMN IF NOT EXISTS application_unlocked_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS application_unlocked_at TIMESTAMPTZ;

-- Create admin audit logs table
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

-- Enable RLS and indexes
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_audit_student_id ON public.admin_audit_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_students_app_access ON public.students(application_access_status);
