import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ctnridgmzwvwcioizspp.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0bnJpZGdtend2d2Npb2l6c3BwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA0NDE1OSwiZXhwIjoyMDc4NjIwMTU5fQ.Y3zPZYxWZ2xU5xHN4SsRSPiWXCxDjQZy4qkI-hg0kRM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const users = [
  { id: '7a5b0ef0-7402-4303-a5f1-617d97f7b088', email: 'contact@tejobharat.com' },
  { id: '761dfe93-d257-4bd7-91b9-d246362b7d4f', email: 'durga@tejobharat.com' },
  { id: 'd278bb80-0e4a-495b-b096-d8c566c2246d', email: 'jyothsna@tejobharat.com' },
  { id: 'fc9eb40c-c076-4808-916a-25fe176564ad', email: 'venkatrao@tejobharat.com' },
  { id: '92eeae6d-433a-477a-91fe-90d8340ab246', email: 'nag@tejobharat.com' },
  { id: '8caafd80-c02b-4988-b177-9e8123f76b5c', email: 'venkat@tejobharat.com' },
  { id: '124df5fe-5333-4653-b648-4fd819fa7b1a', email: 'ganga@tejobharat.com' },
  { id: 'a2193feb-558d-40ca-a170-3cb23e32e4c1', email: 'mouli@tejobharat.com' },
  { id: '49aaa09c-3c46-4129-b1e0-7aabefa26c20', email: 'raj@tejobharat.com' },
];

const newPassword = 'Tenent@2026!';

async function resetPasswords() {
  console.log('Starting password reset for all users...\n');

  for (const user of users) {
    try {
      const { error } = await supabase.auth.admin.updateUserById(user.id, {
        password: newPassword
      });

      if (error) {
        console.error(`❌ Failed to reset password for ${user.email}:`, error.message);
      } else {
        console.log(`✅ Password reset successfully for ${user.email}`);
      }
    } catch (err) {
      console.error(`❌ Error resetting password for ${user.email}:`, err);
    }
  }

  console.log('\n✅ Password reset complete!');
  console.log(`All passwords have been set to: ${newPassword}`);
}

resetPasswords();
