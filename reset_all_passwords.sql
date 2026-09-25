-- Reset all user passwords to: Tenent@2026!
-- Execute this in your Supabase SQL Editor

-- Reset contact@tejobharat.com (Super Admin)
SELECT auth.update_user_password('7a5b0ef0-7402-4303-a5f1-617d97f7b088', 'Tenent@2026!');

-- Reset durga@tejobharat.com (Admin)
SELECT auth.update_user_password('761dfe93-d257-4bd7-91b9-d246362b7d4f', 'Tenent@2026!');

-- Reset jyothsna@tejobharat.com (Admin)
SELECT auth.update_user_password('d278bb80-0e4a-495b-b096-d8c566c2246d', 'Tenent@2026!');

-- Reset venkatrao@tejobharat.com (Admin)
SELECT auth.update_user_password('fc9eb40c-c076-4808-916a-25fe176564ad', 'Tenent@2026!');

-- Reset nag@tejobharat.com (Employee)
SELECT auth.update_user_password('92eeae6d-433a-477a-91fe-90d8340ab246', 'Tenent@2026!');

-- Reset venkat@tejobharat.com (Employee)
SELECT auth.update_user_password('8caafd80-c02b-4988-b177-9e8123f76b5c', 'Tenent@2026!');

-- Reset ganga@tejobharat.com (Lead Generator)
SELECT auth.update_user_password('124df5fe-5333-4653-b648-4fd819fa7b1a', 'Tenent@2026!');

-- Reset mouli@tejobharat.com (Lead Generator)
SELECT auth.update_user_password('a2193feb-558d-40ca-a170-3cb23e32e4c1', 'Tenent@2026!');

-- Reset raj@tejobharat.com (Lead Generator)
SELECT auth.update_user_password('49aaa09c-3c46-4129-b1e0-7aabefa26c20', 'Tenent@2026!');
