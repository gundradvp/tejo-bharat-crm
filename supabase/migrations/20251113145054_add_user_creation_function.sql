/*
  # Add User Creation Helper Function

  ## Purpose
  Creates a helper function to easily create users with profiles from SQL or admin panel.

  ## Changes
  1. Creates a function to handle user creation with profile
  2. Can be called from SQL to create initial admin users

  ## Usage Example
  To create an admin user:
  ```sql
  -- This will be done via Supabase Auth signup
  ```
*/

-- Create a trigger function to auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'agent'),
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Note: To create users, use Supabase Dashboard or the signup form
-- For the first admin user, you can sign up through the app and then update the role:
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-admin-email@example.com';
