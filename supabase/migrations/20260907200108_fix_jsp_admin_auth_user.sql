/*
  # Fix JSP Admin Auth User

  The previously created auth user had incomplete metadata, causing
  "Database error querying schema" at login. This migration deletes
  the old user and recreates with correct jsonb metadata fields.
*/

DO $$
DECLARE
  old_user_id uuid;
  new_user_id uuid;
BEGIN
  -- Find and delete the existing broken user
  SELECT id INTO old_user_id FROM auth.users WHERE email = 'jspadmin@tejobharat.com';
  IF old_user_id IS NOT NULL THEN
    DELETE FROM user_roles WHERE user_id = old_user_id;
    DELETE FROM profiles WHERE id = old_user_id;
    DELETE FROM auth.users WHERE id = old_user_id;
  END IF;

  -- Create fresh auth user with all required fields
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'jspadmin@tejobharat.com',
    crypt('JSP@admin123', gen_salt('bf')),
    now(),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"JSP Admin"}'::jsonb
  )
  RETURNING id INTO new_user_id;

  -- Create profile
  IF new_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, role, is_active, tenant_id)
    VALUES (new_user_id, 'jspadmin@tejobharat.com', 'JSP Admin', 'jsp_admin', true, '00000000-0000-0000-0000-000000000001')
    ON CONFLICT (id) DO NOTHING;

    -- Assign jsp_admin role
    INSERT INTO user_roles (user_id, role_id)
    SELECT new_user_id, id FROM roles WHERE name = 'jsp_admin'
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
