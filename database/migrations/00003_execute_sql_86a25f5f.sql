DO $$
DECLARE
  uids uuid[] := ARRAY[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
  ];
  names text[] := ARRAY[
    'Arun Kumar M', 'Priya Devi S', 'Karthik Rajan', 'Meenakshi P',
    'Suresh Babu T', 'Lakshmi R', 'Vijay Anand K', 'Deepa Nair',
    'Ramesh Chandran', 'Kavitha Sundaram', 'Anbu Selvan', 'Nithya R'
  ];
  emails text[] := ARRAY[
    'arun.kumar@gmail.com', 'priya.devi@gmail.com', 'karthik.rajan@gmail.com',
    'meenakshi.p@gmail.com', 'suresh.babu@gmail.com', 'lakshmi.r@gmail.com',
    'vijay.anand@gmail.com', 'deepa.nair@gmail.com', 'ramesh.c@gmail.com',
    'kavitha.s@gmail.com', 'anbu.selvan@gmail.com', 'nithya.r@gmail.com'
  ];
  phones text[] := ARRAY[
    '9876543210','9876543211','9876543212','9876543213',
    '9876543214','9876543215','9876543216','9876543217',
    '9876543218','9876543219','9876543220','9876543221'
  ];
  cities text[] := ARRAY[
    'Chennai','Coimbatore','Madurai','Salem',
    'Trichy','Tirunelveli','Erode','Vellore',
    'Tirupur','Thanjavur','Cuddalore','Kanchipuram'
  ];
  -- assessment_status, application_status, payment_status, counselling_status, admission_status
  a_status text[] := ARRAY['completed','completed','completed','completed','completed','completed','in_progress','not_started','completed','completed','completed','completed'];
  ap_status text[] := ARRAY['submitted','submitted','submitted','in_progress','submitted','submitted','not_started','not_started','submitted','submitted','not_started','submitted'];
  py_status text[] := ARRAY['paid','paid','unpaid','unpaid','paid','unpaid','unpaid','unpaid','paid','unpaid','unpaid','paid'];
  co_status text[] := ARRAY['completed','scheduled','pending','not_scheduled','selected','pending','not_scheduled','not_scheduled','scheduled','follow_up_required','not_scheduled','completed'];
  ad_status text[] := ARRAY['admission_confirmed','counselling_pending','counselling_pending','not_applied','selected','counselling_pending','not_applied','not_applied','counselling_pending','counselling_pending','not_applied','admission_confirmed'];
  i integer;
BEGIN
  FOR i IN 1..12 LOOP
    -- auth.users
    INSERT INTO auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at,
      created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      uids[i],
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      emails[i],
      crypt('Student@123', gen_salt('bf')),
      now(),
      now() - (i * interval '3 days'),
      now() - (i * interval '3 days'),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', names[i]),
      false, '', '', '', ''
    );
    -- Update profile (trigger already inserted with role=student)
    UPDATE public.profiles 
    SET full_name = names[i], phone = phones[i]
    WHERE id = uids[i];
    -- students record
    INSERT INTO public.students (
      profile_id, student_id, full_name, email, phone,
      date_of_birth, address, city, state, pincode,
      assessment_status, application_status, payment_status,
      counselling_status, admission_status,
      created_at, updated_at
    ) VALUES (
      uids[i],
      'TATTI2024' || LPAD(i::text, 3, '0'),
      names[i], emails[i], phones[i],
      ('2000-01-' || LPAD(i::text, 2, '0'))::date,
      (i || ', Main Street'),
      cities[i], 'Tamil Nadu',
      '60000' || i,
      a_status[i]::assessment_status,
      ap_status[i]::application_status,
      py_status[i]::payment_status,
      co_status[i]::counselling_status,
      ad_status[i]::admission_status,
      now() - (i * interval '3 days'),
      now() - (i * interval '1 day')
    );
  END LOOP;
END $$;