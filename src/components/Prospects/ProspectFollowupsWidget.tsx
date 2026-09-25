import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Phone, Clock, Calendar, ArrowRight, Users, Link2 } from 'lucide-react';
import { LeadProspect, CALL_STATUS_LABELS, CALL_STATUS_COLORS } from '../../lib/prospectApi';

export default function ProspectFollowupsWidget() {
  const navigate = useNavigate();
  const [followUps, setFollowUps] = useState<LeadProspect[]>([]);
  const [stats, setStats] = useState({ total: 0, existing: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const [followUpsRes, totalRes, existingRes] = await Promise.all([
        supabase
          .from('lead_prospects')
          .select('*')
          .lte('follow_up_date', todayStr)
          .not('call_status', 'in', '("converted","not_interested")')
          .order('follow_up_date', { ascending: true })
          .limit(5),
        supabase.from('lead_prospects').select('id', { count: 'exact', head: true }),
        supabase.from('lead_prospects').select('id', { count: 'exact', head: true }).eq('is_existing_customer', true),
      ]);

      setFollowUps((followUpsRes.data as any) || []);
      setStats({
        total: totalRes.count || 0,
        existing: existingRes.count || 0,
      });
    } catch (err) {
      console.error('Error loading prospect follow-ups:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  if (stats.total === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Phone className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Lead Prospects</h3>
        </div>
        <button
          onClick={() => navigate('/prospects')}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          View All <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-gray-600">
          <Users className="w-3.5 h-3.5" />
          <strong>{stats.total}</strong> Total Prospects
        </span>
        <span className="flex items-center gap-1.5 text-green-600">
          <Link2 className="w-3.5 h-3.5" />
          <strong>{stats.existing}</strong> Surya Ghar Matches
        </span>
      </div>

      {followUps.length > 0 && (
        <div className="px-5 py-3">
          <p className="text-xs font-medium text-orange-600 mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Follow-ups Due ({followUps.length})
          </p>
          <div className="space-y-2">
            {followUps.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => navigate('/prospects')}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono font-medium text-gray-900 truncate">
                      {p.sc_number || 'No SC'}
                    </span>
                    <span className={`px-1.5 py-0.5 text-xs rounded-full ${CALL_STATUS_COLORS[p.call_status] || 'bg-gray-100 text-gray-600'}`}>
                      {CALL_STATUS_LABELS[p.call_status] || p.call_status}
                    </span>
                    {p.is_existing_customer && (
                      <span className="px-1.5 py-0.5 text-xs rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                        <Link2 className="w-2.5 h-2.5" />
                        Surya Ghar
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                    {p.mobile_number && <span>{p.mobile_number}</span>}
                    {p.circle_name && <span>• {p.circle_name}</span>}
                    {p.follow_up_date && (
                      <span className="flex items-center gap-0.5 text-orange-600">
                        <Calendar className="w-3 h-3" />
                        {new Date(p.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
                {p.mobile_number && (
                  <a
                    href={`tel:${p.mobile_number}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors flex-shrink-0"
                    title="Call now"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {followUps.length === 0 && (
        <div className="px-5 py-4">
          <button
            onClick={() => navigate('/prospects')}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
          >
            <Phone className="w-4 h-4" />
            Start Calling Prospects
          </button>
        </div>
      )}
    </div>
  );
}
