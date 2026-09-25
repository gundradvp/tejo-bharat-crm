/*
  # Delete broken JSP auth user for recreation via edge function

  Removes the manually inserted auth.users row so the edge function
  can create it properly via the Auth Admin API.
*/

DO $$
DECLARE
  old_user_id uuid;
BEGIN
  SELECT id INTO old_user_id FROM auth.users WHERE email = 'jspadmin@tejobharat.com';
  IF old_user_id IS NOT NULL THEN
    DELETE FROM user_roles WHERE user_id = old_user_id;
    DELETE FROM profiles WHERE id = old_user_id;
    DELETE FROM auth.identities WHERE user_id = old_user_id;
    DELETE FROM auth.users WHERE id = old_user_id;
  END IF;
END $$;
