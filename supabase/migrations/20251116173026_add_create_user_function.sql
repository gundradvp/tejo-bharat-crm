/*
  # Add User Creation Function

  ## Description
  Creates a function to allow admins to create new users with profiles programmatically.
  This function creates both the auth user and the profile in one transaction.

  ## Changes
  1. Creates `create_user_with_profile` function
     - Takes email, password, full name, phone, and role as parameters
     - Creates user in auth.users
     - Creates corresponding profile
     - Returns the user ID

  ## Security
  - Function uses SECURITY DEFINER to access auth.users
  - Only admins should be able to call this function (enforced at application level)

  ## Usage Example
  ```sql
  SELECT create_user_with_profile(
    'agent@example.com',
    'password123',
    'John Doe',
    '1234567890',
    'agent'
  );
  ```
*/

-- Create function to create user with profile
CREATE OR REPLACE FUNCTION public.create_user_with_profile(
  user_email TEXT,
  user_password TEXT,
  user_full_name TEXT,
  user_phone TEXT DEFAULT NULL,
  user_role TEXT DEFAULT 'employee'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Create the user in auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    user_email,
    crypt(user_password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', user_full_name, 'role', user_role),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO new_user_id;

  -- Create the profile (trigger will handle this, but we ensure it exists)
  INSERT INTO public.profiles (id, email, full_name, phone, role, is_active)
  VALUES (
    new_user_id,
    user_email,
    user_full_name,
    user_phone,
    user_role::text,
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = user_full_name,
    phone = user_phone,
    role = user_role::text;

  RETURN new_user_id;
END;
$$;

-- Grant execute permission to authenticated users (app will check admin role)
GRANT EXECUTE ON FUNCTION public.create_user_with_profile TO authenticated;
