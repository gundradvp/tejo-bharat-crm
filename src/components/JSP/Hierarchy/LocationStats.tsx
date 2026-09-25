import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Users, CheckCircle2, Clock, MapPin, UserCheck } from 'lucide-react';

export interface LocationStatsProps {
  level: 'assembly' | 'mandal' | 'panchayat';
  locationId?: string;
  assemblyId?: number;
  mandalName?: string;
  panchayatName?: string;
}

interface Stats {
  totalMembers: number;
  completed: number;
  pending: number;
  mandalCount: number;
  sadhakCount: number;
}

export default function LocationStats({ level, locationId, assemblyId, mandalName, panchayatName }: LocationStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        let query = supabase.from('jsp_kriya_members').select('status, mandal_name, volunteername');

        if (level === 'assembly' && assemblyId != null) {
          query = query.eq('assembly_id', assemblyId);
        } else if (level === 'mandal' && mandalName) {
          query = query.eq('mandal_name', mandalName);
        } else if (level === 'panchayat' && panchayatName) {
          query = query.eq('panchayat_name', panchayatName);
        } else {
          setLoading(false);
          return;
        }

        const { data, error } = await query;
        if (error) throw error;

        const rows = data || [];
        const completed = rows.filter((r) => r.status?.toLowerCase() === 'completed').length;
        const pending = rows.filter((r) => r.status?.toLowerCase() === 'pending').length;
        const mandalCount = new Set(rows.map((r) => r.mandal_name).filter(Boolean)).size;
        const sadhakCount = new Set(rows.map((r) => r.volunteername).filter(Boolean)).size;

        setStats({
          totalMembers: rows.length,
          completed,
          pending,
          mandalCount,
          sadhakCount,
        });
      } catch (err) {
        console.error('LocationStats fetch error:', err);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [level, locationId, assemblyId, mandalName, panchayatName]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
            <div className="h-8 w-8 bg-gray-200 rounded-lg mb-3" />
            <div className="h-6 w-16 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-24 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: 'Total Members', value: stats.totalMembers, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Total Mandals', value: stats.mandalCount, icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Sadhaks', value: stats.sadhakCount, icon: UserCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value.toLocaleString()}</p>
            <p className="text-xs font-medium text-gray-500 mt-1">{card.label}</p>
          </div>
        );
      })}
    </div>
  );
}
