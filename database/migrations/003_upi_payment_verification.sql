-- ============================================================================
-- Migration 003: UPI Payment Verification, Admin Confirmation & Notifications
-- ============================================================================

-- 1. Add missing columns to payments table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'course_id'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'utr_number'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN utr_number VARCHAR(100);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'screenshot_url'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN screenshot_url TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'screenshot_path'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN screenshot_path TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'submitted_at'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN submitted_at TIMESTAMPTZ DEFAULT now();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'approved_by'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN approved_by VARCHAR(255);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'approved_at'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN approved_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'payment_verified_at'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN payment_verified_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'rejected_by'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN rejected_by VARCHAR(255);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'rejected_at'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN rejected_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN rejection_reason TEXT;
    END IF;
END $$;

-- 2. Add confirmed_at to applications table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'confirmed_at'
    ) THEN
        ALTER TABLE public.applications ADD COLUMN confirmed_at TIMESTAMPTZ;
    END IF;
END $$;

-- 3. Add student_id to notifications table if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'student_id'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN student_id UUID REFERENCES public.students(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Update check constraints to allow new statuses
-- Payments status check
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('unpaid', 'paid', 'failed', 'refunded', 'pending', 'Pending', 'approved', 'Approved', 'rejected', 'Rejected', 'Pending Verification', 'pending_verification'));

-- Applications status check
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE public.applications ADD CONSTRAINT applications_status_check
  CHECK (status IN ('not_started', 'in_progress', 'submitted', 'under_review', 'approved', 'rejected', 'confirmed', 'Confirmed', 'Pending Verification', 'pending_verification'));

-- Students payment_status check
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_payment_status_check;
ALTER TABLE public.students ADD CONSTRAINT students_payment_status_check
  CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded', 'pending', 'Pending', 'approved', 'Approved', 'rejected', 'Rejected', 'Pending Verification', 'pending_verification'));

-- Students application_status check
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_application_status_check;
ALTER TABLE public.students ADD CONSTRAINT students_application_status_check
  CHECK (application_status IN ('not_started', 'in_progress', 'submitted', 'under_review', 'approved', 'rejected', 'confirmed', 'Confirmed', 'Pending Verification', 'pending_verification'));

-- 5. Helpful indexes
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_student_id ON public.notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_profile_id ON public.notifications(profile_id);
