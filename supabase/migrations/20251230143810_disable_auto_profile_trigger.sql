/*
  # Disable Automatic Profile Creation Trigger

  1. Changes
    - Drop the automatic profile creation trigger
    - Profile creation is now handled by the create-user edge function
    - This prevents conflicts with tenant_id and other required fields

  2. Reason
    - The trigger was creating profiles without tenant_id
    - Edge function provides better control over user creation
    - Allows proper validation and error handling
*/

-- Drop the trigger that auto-creates profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function as well since it's no longer needed
DROP FUNCTION IF EXISTS public.handle_new_user();
