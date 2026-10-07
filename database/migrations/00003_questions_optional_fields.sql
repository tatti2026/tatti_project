-- Migration 00003: Make questions table optional fields nullable
-- Correct Answer, Marks, Difficulty, Category are optional for Career Fit Assessment questions.

ALTER TABLE public.questions ALTER COLUMN correct_answer DROP NOT NULL;
ALTER TABLE public.questions ALTER COLUMN marks DROP NOT NULL;
ALTER TABLE public.questions ALTER COLUMN difficulty DROP NOT NULL;
