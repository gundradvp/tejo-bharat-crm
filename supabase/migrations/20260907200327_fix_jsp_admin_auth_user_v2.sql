/*
  # Fix JSP Admin Auth User (v2)

  Previous attempts created the auth.user with missing columns that
  Supabase Auth expects (confirmation_token, recovery_token, etc.).
  This matches the exact pattern used by the working Tejo Bharat users.

  Credentials:
  - Email: jspadmin@tejobharat.com
  - Password: JSP@admin123
*/

DO $$
DECLARE
  v_tenant_id uuid := '00000000-0000-0000-0000-000000000001';
  v_role_jsp_admin uuid;
  v_enc_pwd text;
  old_user_id uuid;
  new_user_id uuid;
BEGIN
  -- Get the jsp_admin role id
  SELECT id INTO v_role_jsp_admin FROM roles WHERE name = 'jsp_admin';

  -- Hash the password
  v_enc_pwd := crypt('JSP@admin123', gen_salt('bf'));

  -- Find and delete the existing broken user
  SELECT id INTO old_user_id FROM auth.users WHERE email = 'jspadmin@tejobharat.com';
  IF old_user_id IS NOT NULL THEN
    DELETE FROM user_roles WHERE user_id = old_user_id;
    DELETE FROM profiles WHERE id = old_user_id;
    DELETE FROM auth.users WHERE id = old_user_id;
  END IF;

  -- Create auth user with ALL required columns (matching working users pattern)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    phone_change_token, phone_change, email_change_token_current
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'jspadmin@tejobharat.com',
    v_enc_pwd,
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"JSP Admin","role":"jsp_admin"}'::jsonb,
    '', '', '', '', '', '', ''
  )
  RETURNING id INTO new_user_id;

  -- Create profile
  IF new_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, role, is_active, tenant_id, created_at, updated_at)
    VALUES (new_user_id, 'jspadmin@tejobharat.com', 'JSP Admin', 'jsp_admin', true, v_tenant_id, now(), now())
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      is_active = EXCLUDED.is_active,
      tenant_id = EXCLUDED.tenant_id,
      updated_at = now();

    -- Assign jsp_admin role
    INSERT INTO user_roles (user_id, role_id, assigned_at)
    VALUES (new_user_id, v_role_jsp_admin, now())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
