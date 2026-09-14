-- Migration 00008: Add Parent Name, Parent Phone, and Selected Course to Students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS parent_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS selected_course VARCHAR(255);

-- Populate sample parent details for existing students
UPDATE public.students
SET 
  parent_name = CASE 
    WHEN full_name ILIKE '%Priya%' THEN 'R. Sundaram'
    WHEN full_name ILIKE '%Rahul%' THEN 'M. Sharma'
    WHEN full_name ILIKE '%Sneha%' THEN 'K. Venkat'
    WHEN full_name ILIKE '%Karthik%' THEN 'V. Raman'
    WHEN full_name ILIKE '%Ananya%' THEN 'S. Krishnan'
    ELSE 'K. Ramanathan'
  END,
  parent_phone = CASE 
    WHEN phone IS NOT NULL THEN '+91 94441 ' || substring(phone from length(phone)-4)
    ELSE '+91 94441 23456'
  END,
  selected_course = COALESCE(selected_course, 'Full Stack Web Development')
WHERE parent_name IS NULL;
