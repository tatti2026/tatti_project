ALTER TABLE public.follow_ups
    ADD COLUMN IF NOT EXISTS followup_time TIME;
