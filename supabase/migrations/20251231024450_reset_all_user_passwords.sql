/*
  # Reset All User Passwords
  
  Resets all user passwords to: Tenent@2026!
  
  This migration uses the pgsodium extension to hash passwords properly.
*/

-- Update all user passwords to 'Tenent@2026!'
UPDATE auth.users
SET 
  encrypted_password = crypt('Tenent@2026!', gen_salt('bf')),
  updated_at = now()
WHERE id IN (
  '7a5b0ef0-7402-4303-a5f1-617d97f7b088',  -- contact@tejobharat.com
  '761dfe93-d257-4bd7-91b9-d246362b7d4f',  -- durga@tejobharat.com
  'd278bb80-0e4a-495b-b096-d8c566c2246d',  -- jyothsna@tejobharat.com
  'fc9eb40c-c076-4808-916a-25fe176564ad',  -- venkatrao@tejobharat.com
  '92eeae6d-433a-477a-91fe-90d8340ab246',  -- nag@tejobharat.com
  '8caafd80-c02b-4988-b177-9e8123f76b5c',  -- venkat@tejobharat.com
  '124df5fe-5333-4653-b648-4fd819fa7b1a',  -- ganga@tejobharat.com
  'a2193feb-558d-40ca-a170-3cb23e32e4c1',  -- mouli@tejobharat.com
  '49aaa09c-3c46-4129-b1e0-7aabefa26c20'   -- raj@tejobharat.com
);
