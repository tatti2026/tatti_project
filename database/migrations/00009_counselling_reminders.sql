-- 00009_counselling_reminders.sql
-- Add persistent reminder tracking columns to counselling table

ALTER TABLE public.counselling 
  ADD COLUMN IF NOT EXISTS reminder_option text,
  ADD COLUMN IF NOT EXISTS reminder_datetime timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_status text DEFAULT 'pending';

-- Index for fast retrieval of pending due reminders by the background worker
CREATE INDEX IF NOT EXISTS idx_counselling_pending_reminders 
  ON public.counselling (reminder_datetime) 
  WHERE (reminder_sent = false OR reminder_sent IS NULL);
