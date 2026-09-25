/*
  # Update profiles role check to include JSP roles + Create JSP Admin User

  ## 1. Schema Change
  The `profiles.role` column had a CHECK constraint limited to
  'admin', 'lead_generator', 'employee'. We extend it to also allow
  all JSP roles so JSP users can have a profile row.

  ## 2. New User
  Creates a JSP admin login:
  - Email: jspadmin@tejobharat.com
  - Password: JSP@admin123
  - Role: jsp_admin
  - Tenant: Tejo Bharat
*/

-- 1. Update the profiles role check constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin', 'lead_generator', 'employee', 'finance', 'lead_generator_access',
    'jsp_admin', 'jsp_parliament_incharge', 'jsp_assembly_incharge',
    'jsp_mandal_incharge', 'jsp_village_incharge', 'jsp_booth_incharge',
    'jsp_sadhak'
  ));

-- 2. Create auth user + profile + role assignment
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  SELECT id INTO new_user_id FROM auth.users WHERE email = 'jspadmin@tejobharat.com';

  IF new_user_id IS NULL THEN
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
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"JSP Admin"}'
    )
    RETURNING id INTO new_user_id;
  END IF;

  IF new_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, role, is_active, tenant_id)
    VALUES (new_user_id, 'jspadmin@tejobharat.com', 'JSP Admin', 'jsp_admin', true, '00000000-0000-0000-0000-000000000001')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO user_roles (user_id, role_id)
    SELECT new_user_id, id FROM roles WHERE name = 'jsp_admin'
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
