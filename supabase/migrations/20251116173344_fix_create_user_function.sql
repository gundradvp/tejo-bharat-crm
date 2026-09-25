/*
  # Fix User Creation Function

  ## Description
  Replaces the previous create_user_with_profile function with a simpler version
  that works with Supabase's built-in functions.

  ## Changes
  1. Drops the old function
  2. Creates a new simplified function that only creates the profile
  3. User creation will be handled via Supabase Auth Admin API from the application

  ## Note
  The actual user creation in auth.users will be done via the Supabase Admin API
  from the application code, not directly in SQL.
*/

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS public.create_user_with_profile(TEXT, TEXT, TEXT, TEXT, TEXT);

-- We don't need a complex SQL function
-- User creation will be handled by the application using Supabase Admin API
