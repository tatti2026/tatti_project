DO $$
DECLARE
  course_ids uuid[] := ARRAY[
    'f45ed396-804d-4db9-a85c-10bdb9536c25'::uuid,
    '5f2e1af3-79d7-485b-95a7-ba19be372657'::uuid,
    '69bade86-669a-486b-a9c0-e8241a512380'::uuid,
    'fa2658c0-4820-4124-ab81-9e40d7baf8d5'::uuid,
    '1bedfb02-f0ee-4a5a-85ee-32a3c00ba183'::uuid,
    'b95e720e-0ffe-4139-acc1-0f3300201d9a'::uuid
  ];
  course_fees numeric[] := ARRAY[75000,45000,65000,55000,70000,50000];
  s record;
  app_id uuid;
  course_idx int;
  pay_methods text[] := ARRAY['UPI','Credit Card','Net Banking','Debit Card','Bank Transfer'];
BEGIN
  FOR s IN SELECT id, student_id, application_status, payment_status, counselling_status, admission_status
           FROM public.students WHERE application_status != 'not_started' LOOP

    course_idx := (RANDOM() * 5 + 1)::int;

    -- Course recommendation
    INSERT INTO public.course_recommendations (student_id, course_id, recommendation_percentage, is_interested, is_selected)
    VALUES (s.id, course_ids[course_idx], (RANDOM()*40+60)::int, true, true)
    ON CONFLICT DO NOTHING;

    -- Application
    INSERT INTO public.applications (student_id, course_id, status, step, submitted_at, created_at, updated_at)
    VALUES (
      s.id, course_ids[course_idx],
      s.application_status::application_status,
      CASE s.application_status WHEN 'submitted' THEN 3 ELSE 2 END,
      CASE s.application_status WHEN 'submitted' THEN now() - interval '7 days' ELSE NULL END,
      now() - interval '8 days', now() - interval '7 days'
    )
    RETURNING id INTO app_id;

    -- Payment for paid students
    IF s.payment_status = 'paid' THEN
      INSERT INTO public.payments (application_id, student_id, amount, payment_method, status, paid_at, created_at)
      VALUES (
        app_id, s.id,
        course_fees[course_idx],
        pay_methods[(RANDOM()*4+1)::int],
        'paid',
        now() - interval '6 days',
        now() - interval '6 days'
      );
    END IF;

    -- Counselling for scheduled/pending/completed/selected/follow_up_required
    IF s.counselling_status != 'not_scheduled' THEN
      INSERT INTO public.counselling (student_id, counsellor_name, scheduled_date, scheduled_time, mode, venue_or_link, instructions, status, created_at, updated_at)
      VALUES (
        s.id,
        (ARRAY['Dr. Anitha Rajan','Mr. Suresh Kumar','Ms. Priya Venkat','Dr. Ramesh G'][(RANDOM()*3+1)::int]),
        (CURRENT_DATE + ((RANDOM()*10-5)::int * interval '1 day'))::date,
        (ARRAY['10:00 AM','11:00 AM','2:00 PM','3:30 PM','4:00 PM'])[(RANDOM()*4+1)::int],
        (ARRAY['Online','In-Person'])[(RANDOM()*1+1)::int],
        CASE WHEN RANDOM() > 0.5 THEN 'https://meet.tatti.edu.in/room-' || floor(RANDOM()*999+100)::text
             ELSE 'TATTI Main Campus, Block B, Room 201, Chennai' END,
        'Please bring your original certificates and a government-issued photo ID.',
        s.counselling_status::counselling_status,
        now() - interval '5 days', now() - interval '4 days'
      );
    END IF;
  END LOOP;

  -- Follow-ups for all students based on intent
  INSERT INTO public.follow_ups (student_id, intent_level, last_interaction, followup_date, followup_status, notes, created_at, updated_at)
  SELECT 
    id,
    CASE
      WHEN payment_status = 'paid' AND counselling_status IN ('scheduled','completed','selected') THEN 'high'
      WHEN assessment_status = 'completed' AND payment_status = 'unpaid' THEN 'medium'
      ELSE 'low'
    END::followup_intent,
    now() - interval '2 days',
    CURRENT_DATE + interval '3 days',
    (ARRAY['pending','called','emailed','completed'])[(RANDOM()*3+1)::int],
    'Follow-up required regarding admission process.',
    now() - interval '2 days', now() - interval '1 day'
  FROM public.students;

  -- Seed notifications for admin profile
  INSERT INTO public.notifications (profile_id, title, message, type, is_read, created_at)
  SELECT 
    (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1),
    n.title, n.message, n.type::notification_type, n.is_read, n.created_at
  FROM (VALUES
    ('New Student Registered','Arun Kumar M has registered and completed sign-up.','general',false, now() - interval '1 hour'),
    ('Assessment Submitted','Priya Devi S has submitted the TAT entrance assessment.','assessment',false, now() - interval '2 hours'),
    ('Payment Received','Suresh Babu T has completed payment of ₹65,000 for Cloud Computing & DevOps.','payment',false, now() - interval '3 hours'),
    ('Counselling Pending','3 students are awaiting counselling scheduling.','counselling',true, now() - interval '5 hours'),
    ('Follow-up Required','Kavitha Sundaram requires immediate follow-up (low intent).','general',true, now() - interval '1 day'),
    ('New Assessment Submitted','Ramesh Chandran has submitted the entrance assessment.','assessment',true, now() - interval '2 days'),
    ('Payment Received','Arun Kumar M completed payment of ₹75,000 for AI & ML.','payment',true, now() - interval '3 days')
  ) AS n(title, message, type, is_read, created_at);

END $$;