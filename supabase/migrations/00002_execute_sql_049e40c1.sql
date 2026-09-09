DO $$
DECLARE
  admin_uid uuid := gen_random_uuid();
BEGIN
  -- Insert into auth.users
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    admin_uid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@tatti.edu.in',
    crypt('Admin@TATTI2024', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"TATTI Administrator"}',
    false, '', '', '', ''
  );
  -- The trigger inserts profile with role='student'; update to admin
  UPDATE public.profiles SET role = 'admin', full_name = 'TATTI Administrator' WHERE id = admin_uid;
END $$;