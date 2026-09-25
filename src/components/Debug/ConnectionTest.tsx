import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function ConnectionTest() {
  const [status, setStatus] = useState<string>('Not tested');
  const [details, setDetails] = useState<any>(null);

  const testConnection = async () => {
    setStatus('Testing...');
    try {
      console.log('Starting connection test...');

      const envCheck = {
        hasUrl: !!import.meta.env.VITE_SUPABASE_URL,
        hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
        url: import.meta.env.VITE_SUPABASE_URL,
      };
      console.log('Environment check:', envCheck);

      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (error) {
        console.error('Supabase query error:', error);
        setStatus(`Error: ${error.message}`);
        setDetails(error);
      } else {
        console.log('Connection successful!');
        setStatus('✓ Connected successfully!');
        setDetails({ data, envCheck });
      }
    } catch (err: any) {
      console.error('Connection test failed:', err);
      setStatus(`Failed: ${err.message}`);
      setDetails(err);
    }
  };

  const testAuth = async () => {
    setStatus('Testing auth...');
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setStatus(`Auth Error: ${error.message}`);
        setDetails(error);
      } else {
        setStatus('✓ Auth endpoint working!');
        setDetails(data);
      }
    } catch (err: any) {
      setStatus(`Auth Failed: ${err.message}`);
      setDetails(err);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Supabase Connection Test</h1>

      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Environment Variables</h2>
          <div className="text-sm space-y-1">
            <div>URL: {import.meta.env.VITE_SUPABASE_URL ? '✓' : '✗'} {import.meta.env.VITE_SUPABASE_URL}</div>
            <div>Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✓' : '✗'} {import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20)}...</div>
          </div>
        </div>

        <div className="space-x-4">
          <button
            onClick={testConnection}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Test Database Connection
          </button>

          <button
            onClick={testAuth}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Test Auth Endpoint
          </button>
        </div>

        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Status</h2>
          <div className="text-sm">{status}</div>
        </div>

        {details && (
          <div className="bg-gray-100 p-4 rounded-lg">
            <h2 className="font-semibold mb-2">Details</h2>
            <pre className="text-xs overflow-auto max-h-96">
              {JSON.stringify(details, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
