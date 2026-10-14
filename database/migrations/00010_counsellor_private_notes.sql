-- Migration 00010: Counsellor Private Notes Table (Counsellor-Only Confidential Notes)
CREATE TABLE IF NOT EXISTS public.counsellor_private_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    counselling_id UUID NOT NULL REFERENCES public.counselling(id) ON DELETE CASCADE,
    counsellor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_counsellor_counselling_note UNIQUE (counsellor_id, counselling_id)
);

CREATE INDEX IF NOT EXISTS idx_cpn_counsellor_id ON public.counsellor_private_notes(counsellor_id);
CREATE INDEX IF NOT EXISTS idx_cpn_counselling_id ON public.counsellor_private_notes(counselling_id);
CREATE INDEX IF NOT EXISTS idx_cpn_student_id ON public.counsellor_private_notes(student_id);
