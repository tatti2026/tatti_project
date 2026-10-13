-- ============================================================================
-- Migration v3: Add per-option marks to questions table
-- Each option (A, B, C, D) gets its own marks column for career-fit scoring.
-- All statements are idempotent (safe to run multiple times).
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'marks_a'
    ) THEN
        ALTER TABLE public.questions ADD COLUMN marks_a INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'marks_b'
    ) THEN
        ALTER TABLE public.questions ADD COLUMN marks_b INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'marks_c'
    ) THEN
        ALTER TABLE public.questions ADD COLUMN marks_c INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'marks_d'
    ) THEN
        ALTER TABLE public.questions ADD COLUMN marks_d INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

SELECT 'Migration v3 (option marks) completed successfully!' AS result;
