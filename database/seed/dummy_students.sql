-- ============================================================================
-- TATTI Student Portal - 10 Dummy Test Students Seed Script
-- Password for all dummy students: Test@12345
-- Safe to re-run (idempotent)
-- ============================================================================

DO $$
DECLARE
    pwd_hash TEXT := '$2b$10$wNqH.LgYpE1F3aI0E2f.AOV0jXlJ2aQ8lZ5F4k9/Hn7R6oQ3g3f6m'; -- Test@12345
    u_id UUID;
    s_id UUID;
    fswd_id UUID;
    aids_id UUID;
    cyber_id UUID;
    devops_id UUID;
    ds_id UUID;
    iot_id UUID;
BEGIN
    -- Look up course IDs
    SELECT id INTO fswd_id FROM public.courses WHERE course_code = 'FSWD-2026' LIMIT 1;
    SELECT id INTO aids_id FROM public.courses WHERE course_code = 'AIDS-2026' LIMIT 1;
    SELECT id INTO cyber_id FROM public.courses WHERE course_code = 'CYBER-2026' LIMIT 1;
    SELECT id INTO devops_id FROM public.courses WHERE course_code = 'DEVOPS-2026' LIMIT 1;
    SELECT id INTO ds_id FROM public.courses WHERE course_code = 'DS-AN-004' LIMIT 1;
    SELECT id INTO iot_id FROM public.courses WHERE course_code = 'IOT-006' LIMIT 1;

    -- 1. Arjun Kumar
    INSERT INTO public.users (email, password_hash)
    VALUES ('arjun.test@tatti.edu.in', pwd_hash)
    ON CONFLICT (email) DO NOTHING;
    SELECT id INTO u_id FROM public.users WHERE email = 'arjun.test@tatti.edu.in';

    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (u_id, 'arjun.test@tatti.edu.in', 'Arjun Kumar', '+91 98765 43210', 'student')
    ON CONFLICT (id) DO UPDATE SET full_name = 'Arjun Kumar', phone = '+91 98765 43210';

    INSERT INTO public.students (
        profile_id, student_id, username, full_name, email, phone,
        parent_name, parent_phone, selected_course,
        assessment_status, application_status, application_access_status,
        payment_status, admission_status
    ) VALUES (
        u_id, '2026-TEST-001', 'arjun.test', 'Arjun Kumar', 'arjun.test@tatti.edu.in', '+91 98765 43210',
        'Ramesh Kumar', '+91 98765 43211', NULL,
        'not_started', 'not_started', 'locked',
        'unpaid', 'not_applied'
    ) ON CONFLICT (student_id) DO UPDATE SET
        selected_course = NULL,
        assessment_status = 'not_started',
        application_status = 'not_started',
        application_access_status = 'locked',
        payment_status = 'unpaid';

    -- 2. Priya S
    INSERT INTO public.users (email, password_hash)
    VALUES ('priya.test@tatti.edu.in', pwd_hash)
    ON CONFLICT (email) DO NOTHING;
    SELECT id INTO u_id FROM public.users WHERE email = 'priya.test@tatti.edu.in';

    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (u_id, 'priya.test@tatti.edu.in', 'Priya S', '+91 98765 43212', 'student')
    ON CONFLICT (id) DO UPDATE SET full_name = 'Priya S', phone = '+91 98765 43212';

    INSERT INTO public.students (
        profile_id, student_id, username, full_name, email, phone,
        parent_name, parent_phone, selected_course,
        assessment_status, application_status, application_access_status,
        payment_status, admission_status
    ) VALUES (
        u_id, '2026-TEST-002', 'priya.test', 'Priya S', 'priya.test@tatti.edu.in', '+91 98765 43212',
        'Suresh S', '+91 98765 43213', NULL,
        'in_progress', 'not_started', 'locked',
        'unpaid', 'not_applied'
    ) ON CONFLICT (student_id) DO UPDATE SET
        selected_course = NULL,
        assessment_status = 'in_progress',
        application_status = 'not_started',
        application_access_status = 'locked',
        payment_status = 'unpaid';

    -- 3. Karthik R
    INSERT INTO public.users (email, password_hash)
    VALUES ('karthik.test@tatti.edu.in', pwd_hash)
    ON CONFLICT (email) DO NOTHING;
    SELECT id INTO u_id FROM public.users WHERE email = 'karthik.test@tatti.edu.in';

    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (u_id, 'karthik.test@tatti.edu.in', 'Karthik R', '+91 98765 43214', 'student')
    ON CONFLICT (id) DO UPDATE SET full_name = 'Karthik R', phone = '+91 98765 43214';

    INSERT INTO public.students (
        profile_id, student_id, username, full_name, email, phone,
        parent_name, parent_phone, selected_course,
        assessment_status, application_status, application_access_status,
        payment_status, admission_status
    ) VALUES (
        u_id, '2026-TEST-003', 'karthik.test', 'Karthik R', 'karthik.test@tatti.edu.in', '+91 98765 43214',
        'Rajendran R', '+91 98765 43215', NULL,
        'completed', 'not_started', 'unlocked',
        'unpaid', 'not_applied'
    ) ON CONFLICT (student_id) DO UPDATE SET
        selected_course = NULL,
        assessment_status = 'completed',
        application_status = 'not_started',
        application_access_status = 'unlocked',
        payment_status = 'unpaid';

    -- 4. Ananya M
    INSERT INTO public.users (email, password_hash)
    VALUES ('ananya.test@tatti.edu.in', pwd_hash)
    ON CONFLICT (email) DO NOTHING;
    SELECT id INTO u_id FROM public.users WHERE email = 'ananya.test@tatti.edu.in';

    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (u_id, 'ananya.test@tatti.edu.in', 'Ananya M', '+91 98765 43216', 'student')
    ON CONFLICT (id) DO UPDATE SET full_name = 'Ananya M', phone = '+91 98765 43216';

    INSERT INTO public.students (
        profile_id, student_id, username, full_name, email, phone,
        parent_name, parent_phone, selected_course,
        assessment_status, application_status, application_access_status,
        payment_status, admission_status
    ) VALUES (
        u_id, '2026-TEST-004', 'ananya.test', 'Ananya M', 'ananya.test@tatti.edu.in', '+91 98765 43216',
        'Murugan M', '+91 98765 43217', 'Full Stack Web Development',
        'completed', 'in_progress', 'unlocked',
        'unpaid', 'not_applied'
    ) ON CONFLICT (student_id) DO UPDATE SET
        selected_course = 'Full Stack Web Development',
        assessment_status = 'completed',
        application_status = 'in_progress',
        application_access_status = 'unlocked',
        payment_status = 'unpaid';

    -- 5. Naveen Kumar
    INSERT INTO public.users (email, password_hash)
    VALUES ('naveen.test@tatti.edu.in', pwd_hash)
    ON CONFLICT (email) DO NOTHING;
    SELECT id INTO u_id FROM public.users WHERE email = 'naveen.test@tatti.edu.in';

    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (u_id, 'naveen.test@tatti.edu.in', 'Naveen Kumar', '+91 98765 43218', 'student')
    ON CONFLICT (id) DO UPDATE SET full_name = 'Naveen Kumar', phone = '+91 98765 43218';

    INSERT INTO public.students (
        profile_id, student_id, username, full_name, email, phone,
        parent_name, parent_phone, selected_course,
        assessment_status, application_status, application_access_status,
        payment_status, admission_status
    ) VALUES (
        u_id, '2026-TEST-005', 'naveen.test', 'Naveen Kumar', 'naveen.test@tatti.edu.in', '+91 98765 43218',
        'Vijay Kumar', '+91 98765 43219', 'Artificial Intelligence & Data Science',
        'completed', 'submitted', 'unlocked',
        'paid', 'application_submitted'
    ) ON CONFLICT (student_id) DO UPDATE SET
        selected_course = 'Artificial Intelligence & Data Science',
        assessment_status = 'completed',
        application_status = 'submitted',
        application_access_status = 'unlocked',
        payment_status = 'paid',
        admission_status = 'application_submitted';

    -- 6. Deepa Lakshmi
    INSERT INTO public.users (email, password_hash)
    VALUES ('deepa.test@tatti.edu.in', pwd_hash)
    ON CONFLICT (email) DO NOTHING;
    SELECT id INTO u_id FROM public.users WHERE email = 'deepa.test@tatti.edu.in';

    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (u_id, 'deepa.test@tatti.edu.in', 'Deepa Lakshmi', '+91 98765 43220', 'student')
    ON CONFLICT (id) DO UPDATE SET full_name = 'Deepa Lakshmi', phone = '+91 98765 43220';

    INSERT INTO public.students (
        profile_id, student_id, username, full_name, email, phone,
        parent_name, parent_phone, selected_course,
        assessment_status, application_status, application_access_status,
        payment_status, admission_status
    ) VALUES (
        u_id, '2026-TEST-006', 'deepa.test', 'Deepa Lakshmi', 'deepa.test@tatti.edu.in', '+91 98765 43220',
        'Lakshmanan V', '+91 98765 43221', 'Cybersecurity & Ethical Hacking',
        'completed', 'under_review', 'unlocked',
        'paid', 'under_review'
    ) ON CONFLICT (student_id) DO UPDATE SET
        selected_course = 'Cybersecurity & Ethical Hacking',
        assessment_status = 'completed',
        application_status = 'under_review',
        application_access_status = 'unlocked',
        payment_status = 'paid',
        admission_status = 'under_review';

    -- 7. Siddharth V
    INSERT INTO public.users (email, password_hash)
    VALUES ('siddharth.test@tatti.edu.in', pwd_hash)
    ON CONFLICT (email) DO NOTHING;
    SELECT id INTO u_id FROM public.users WHERE email = 'siddharth.test@tatti.edu.in';

    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (u_id, 'siddharth.test@tatti.edu.in', 'Siddharth V', '+91 98765 43222', 'student')
    ON CONFLICT (id) DO UPDATE SET full_name = 'Siddharth V', phone = '+91 98765 43222';

    INSERT INTO public.students (
        profile_id, student_id, username, full_name, email, phone,
        parent_name, parent_phone, selected_course,
        assessment_status, application_status, application_access_status,
        payment_status, admission_status
    ) VALUES (
        u_id, '2026-TEST-007', 'siddharth.test', 'Siddharth V', 'siddharth.test@tatti.edu.in', '+91 98765 43222',
        'Venkatraman S', '+91 98765 43223', 'Cloud Computing & DevOps Architecture',
        'completed', 'approved', 'unlocked',
        'paid', 'counselling_pending'
    ) ON CONFLICT (student_id) DO UPDATE SET
        selected_course = 'Cloud Computing & DevOps Architecture',
        assessment_status = 'completed',
        application_status = 'approved',
        application_access_status = 'unlocked',
        payment_status = 'paid',
        admission_status = 'counselling_pending';

    -- 8. Meera Krishnan
    INSERT INTO public.users (email, password_hash)
    VALUES ('meera.test@tatti.edu.in', pwd_hash)
    ON CONFLICT (email) DO NOTHING;
    SELECT id INTO u_id FROM public.users WHERE email = 'meera.test@tatti.edu.in';

    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (u_id, 'meera.test@tatti.edu.in', 'Meera Krishnan', '+91 98765 43224', 'student')
    ON CONFLICT (id) DO UPDATE SET full_name = 'Meera Krishnan', phone = '+91 98765 43224';

    INSERT INTO public.students (
        profile_id, student_id, username, full_name, email, phone,
        parent_name, parent_phone, selected_course,
        assessment_status, application_status, application_access_status,
        payment_status, admission_status
    ) VALUES (
        u_id, '2026-TEST-008', 'meera.test', 'Meera Krishnan', 'meera.test@tatti.edu.in', '+91 98765 43224',
        'Radhakrishnan P', '+91 98765 43225', 'Data Science & Analytics',
        'completed', 'approved', 'unlocked',
        'paid', 'counselling_completed'
    ) ON CONFLICT (student_id) DO UPDATE SET
        selected_course = 'Data Science & Analytics',
        assessment_status = 'completed',
        application_status = 'approved',
        application_access_status = 'unlocked',
        payment_status = 'paid',
        admission_status = 'counselling_completed';

    -- 9. Vigneshwaran K
    INSERT INTO public.users (email, password_hash)
    VALUES ('vignesh.test@tatti.edu.in', pwd_hash)
    ON CONFLICT (email) DO NOTHING;
    SELECT id INTO u_id FROM public.users WHERE email = 'vignesh.test@tatti.edu.in';

    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (u_id, 'vignesh.test@tatti.edu.in', 'Vigneshwaran K', '+91 98765 43226', 'student')
    ON CONFLICT (id) DO UPDATE SET full_name = 'Vigneshwaran K', phone = '+91 98765 43226';

    INSERT INTO public.students (
        profile_id, student_id, username, full_name, email, phone,
        parent_name, parent_phone, selected_course,
        assessment_status, application_status, application_access_status,
        payment_status, admission_status
    ) VALUES (
        u_id, '2026-TEST-009', 'vignesh.test', 'Vigneshwaran K', 'vignesh.test@tatti.edu.in', '+91 98765 43226',
        'Kannan T', '+91 98765 43227', 'Internet of Things (IoT)',
        'completed', 'approved', 'unlocked',
        'paid', 'admission_confirmed'
    ) ON CONFLICT (student_id) DO UPDATE SET
        selected_course = 'Internet of Things (IoT)',
        assessment_status = 'completed',
        application_status = 'approved',
        application_access_status = 'unlocked',
        payment_status = 'paid',
        admission_status = 'admission_confirmed';

    -- 10. Kavitha Mohan
    INSERT INTO public.users (email, password_hash)
    VALUES ('kavitha.test@tatti.edu.in', pwd_hash)
    ON CONFLICT (email) DO NOTHING;
    SELECT id INTO u_id FROM public.users WHERE email = 'kavitha.test@tatti.edu.in';

    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (u_id, 'kavitha.test@tatti.edu.in', 'Kavitha Mohan', '+91 98765 43228', 'student')
    ON CONFLICT (id) DO UPDATE SET full_name = 'Kavitha Mohan', phone = '+91 98765 43228';

    INSERT INTO public.students (
        profile_id, student_id, username, full_name, email, phone,
        parent_name, parent_phone, selected_course,
        assessment_status, application_status, application_access_status,
        payment_status, admission_status
    ) VALUES (
        u_id, '2026-TEST-010', 'kavitha.test', 'Kavitha Mohan', 'kavitha.test@tatti.edu.in', '+91 98765 43228',
        'Mohanraj G', '+91 98765 43229', 'Full Stack Web Development',
        'completed', 'rejected', 'unlocked',
        'failed', 'not_selected'
    ) ON CONFLICT (student_id) DO UPDATE SET
        selected_course = 'Full Stack Web Development',
        assessment_status = 'completed',
        application_status = 'rejected',
        application_access_status = 'unlocked',
        payment_status = 'failed',
        admission_status = 'not_selected';

END $$;
