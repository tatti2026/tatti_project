-- ============================================================================
-- Migration: Add student_id_counters, username, extend direct_messages
-- Run this against the existing tatti_portal database.
-- All statements are idempotent (safe to run multiple times).
-- ============================================================================

-- 1. Add student_id_counters table
CREATE TABLE IF NOT EXISTS public.student_id_counters (
    year INTEGER PRIMARY KEY,
    counter INTEGER NOT NULL DEFAULT 0
);

-- 2. Add username column to students (if it doesn't exist yet)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'username'
    ) THEN
        ALTER TABLE public.students ADD COLUMN username VARCHAR(100) UNIQUE;
    END IF;
END $$;

-- 3. Extend direct_messages table with new columns

-- receiver_role
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'direct_messages' AND column_name = 'receiver_role'
    ) THEN
        ALTER TABLE public.direct_messages ADD COLUMN receiver_role VARCHAR(20) NOT NULL DEFAULT 'student';
    END IF;
END $$;

-- message_text: ensure NOT NULL with default (existing rows may have empty text)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'direct_messages' AND column_name = 'attachment_name'
    ) THEN
        ALTER TABLE public.direct_messages ADD COLUMN attachment_name VARCHAR(500);
        ALTER TABLE public.direct_messages ADD COLUMN attachment_size VARCHAR(50);
        ALTER TABLE public.direct_messages ADD COLUMN attachment_type VARCHAR(100);
        ALTER TABLE public.direct_messages ADD COLUMN attachment_url TEXT;
        ALTER TABLE public.direct_messages ADD COLUMN delivered_at TIMESTAMPTZ;
        ALTER TABLE public.direct_messages ADD COLUMN read_at TIMESTAMPTZ;
    END IF;
END $$;

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_direct_messages_student_id ON public.direct_messages(student_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON public.direct_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_type ON public.direct_messages(sender_type);

SELECT 'Migration completed successfully!' AS result;
