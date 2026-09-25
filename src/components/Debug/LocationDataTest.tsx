import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function LocationDataTest() {
  const { profile } = useAuth();
  const [states, setStates] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const testLocationData = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Testing location data access...');
      console.log('User tenant_id:', profile?.tenant_id);

      const { data: statesData, error: statesError } = await supabase
        .from('states')
        .select('*')
        .order('name');

      if (statesError) {
        console.error('States error:', statesError);
        throw statesError;
      }

      console.log('States data:', statesData);
      setStates(statesData || []);

      if (statesData && statesData.length > 0) {
        const { data: districtsData, error: districtsError } = await supabase
          .from('districts')
          .select('*')
          .eq('state_id', statesData[0].id)
          .order('name');

        if (districtsError) {
          console.error('Districts error:', districtsError);
          throw districtsError;
        }

        console.log('Districts data:', districtsData);
        setDistricts(districtsData || []);
      }
    } catch (err: any) {
      console.error('Test error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      testLocationData();
    }
  }, [profile]);

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Location Data Test</h2>

      <div className="space-y-4">
        <div>
          <strong>User Info:</strong>
          <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">
            {JSON.stringify({
              id: profile?.id,
              email: profile?.email,
              tenant_id: profile?.tenant_id,
              role: profile?.role
            }, null, 2)}
          </pre>
        </div>

        {loading && (
          <div className="text-blue-600">Loading...</div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div>
          <strong>States ({states.length}):</strong>
          <div className="bg-gray-50 p-2 rounded text-sm">
            {states.length === 0 ? (
              <div className="text-red-600">No states found!</div>
            ) : (
              <ul>
                {states.map(s => (
                  <li key={s.id}>
                    {s.name} (ID: {s.id}, Tenant: {s.tenant_id})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <strong>Districts ({districts.length}):</strong>
          <div className="bg-gray-50 p-2 rounded text-sm max-h-60 overflow-auto">
            {districts.length === 0 ? (
              <div className="text-yellow-600">No districts loaded</div>
            ) : (
              <ul>
                {districts.map(d => (
                  <li key={d.id}>
                    {d.name} (ID: {d.id})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <button
          onClick={testLocationData}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh Test
        </button>
      </div>
    </div>
  );
}
