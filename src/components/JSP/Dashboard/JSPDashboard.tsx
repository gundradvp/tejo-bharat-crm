import { useEffect, useState, useCallback } from 'react';
import { supabase, Profile, isJSPAdmin, hasAnyRole } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Users, CheckCircle2, Clock, UserCheck, BarChart3, Trophy, Building2, PieChart as PieIcon } from 'lucide-react';

interface DashboardStats {
  totalMembers: number;
  completedPayments: number;
  pendingMembers: number;
  totalSadhaks: number;
}

interface PhaseCount {
  phase: string;
  count: number;
}

interface SadhakRanking {
  volunteername: string;
  volunteer_mobile: string | null;
  count: number;
}

interface AssemblyCount {
  assembly_id: number | null;
  constituency_name: string | null;
  total: number;
  completed: number;
  pending: number;
}

interface GenderCount {
  gender: string;
  count: number;
}

const PHASE_COLORS: Record<string, string> = {
  first: 'bg-amber-400',
  second: 'bg-amber-500',
  third: 'bg-amber-600',
  fourth: 'bg-orange-500',
  fifth: 'bg-orange-600',
};

const PHASE_LABELS: Record<string, string> = {
  first: '1st Phase',
  second: '2nd Phase',
  third: '3rd Phase',
  fourth: '4th Phase',
  fifth: '5th Phase',
};

export default function JSPDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [phases, setPhases] = useState<PhaseCount[]>([]);
  const [topSadhaks, setTopSadhaks] = useState<SadhakRanking[]>([]);
  const [assemblyCounts, setAssemblyCounts] = useState<AssemblyCount[]>([]);
  const [genderCounts, setGenderCounts] = useState<GenderCount[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      if (!profile) return;
      setLoading(true);
      try {
        const isAdmin = isJSPAdmin(profile as Profile | null);
        const isSadhak = hasAnyRole(profile as Profile | null, ['jsp_sadhak']) && !isAdmin;
        const vf = isSadhak ? profile.full_name : null;

        // Build a base query with optional volunteer filter
        const baseSelect = (cols: string) => {
          let q = supabase.from('jsp_kriya_members').select(cols);
          if (vf) q = q.eq('volunteername', vf);
          return q;
        };

        // Total count using head-only count
        const { count: totalCount } = await baseSelect('*', ).select('*', { count: 'exact', head: true });
        // Completed
        let completedQ = supabase.from('jsp_kriya_members').select('*', { count: 'exact', head: true }).ilike('status', 'completed');
        if (vf) completedQ = completedQ.eq('volunteername', vf);
        const { count: completedCount } = await completedQ;
        // Pending
        let pendingQ = supabase.from('jsp_kriya_members').select('*', { count: 'exact', head: true }).ilike('status', 'pending');
        if (vf) pendingQ = pendingQ.eq('volunteername', vf);
        const { count: pendingCount } = await pendingQ;

        // Sadhaks count — fetch distinct volunteernames (paginated)
        const sadhakSet = new Set<string>();
        let sOffset = 0;
        while (true) {
          let sq = supabase.from('jsp_kriya_members').select('volunteername').range(sOffset, sOffset + 999);
          if (vf) sq = sq.eq('volunteername', vf);
          const { data: sd } = await sq;
          if (!sd || sd.length === 0) break;
          sd.forEach((r: any) => { if (r.volunteername) sadhakSet.add(r.volunteername); });
          if (sd.length < 1000) break;
          sOffset += 1000;
        }

        setStats({
          totalMembers: totalCount ?? 0,
          completedPayments: completedCount ?? 0,
          pendingMembers: pendingCount ?? 0,
          totalSadhaks: sadhakSet.size,
        });

        // Phase counts via head-only count queries
        const phaseResults: PhaseCount[] = [];
        for (const phase of ['first', 'second', 'third', 'fourth', 'fifth']) {
          let pq = supabase.from('jsp_kriya_members').select('*', { count: 'exact', head: true }).ilike('phase', phase);
          if (vf) pq = pq.eq('volunteername', vf);
          const { count: pc } = await pq;
          if (pc && pc > 0) phaseResults.push({ phase, count: pc });
        }
        setPhases(phaseResults.sort((a, b) => b.count - a.count));

        // Gender counts via head-only count queries
        const gResults: GenderCount[] = [];
        for (const g of ['Male', 'Female', 'Other']) {
          let gq = supabase.from('jsp_kriya_members').select('*', { count: 'exact', head: true });
          if (g === 'Male') gq = gq.or('gender.ilike.Male,gender.ilike.M');
          else if (g === 'Female') gq = gq.or('gender.ilike.Female,gender.ilike.F');
          else gq = gq.not('gender', 'is', null).not('gender', 'ilike', 'Male').not('gender', 'ilike', 'M').not('gender', 'ilike', 'Female').not('gender', 'ilike', 'F');
          if (vf) gq = gq.eq('volunteername', vf);
          const { count: gc } = await gq;
          if (gc && gc > 0) gResults.push({ gender: g, count: gc });
        }
        setGenderCounts(gResults);

        // Assembly counts — fetch distinct constituency names, then count each
        const asmSet = new Set<string>();
        let aOffset = 0;
        while (true) {
          let aq = supabase.from('jsp_kriya_members').select('constituency_name').range(aOffset, aOffset + 999);
          if (vf) aq = aq.eq('volunteername', vf);
          const { data: ad } = await aq;
          if (!ad || ad.length === 0) break;
          ad.forEach((r: any) => { if (r.constituency_name) asmSet.add(r.constituency_name); });
          if (ad.length < 1000) break;
          aOffset += 1000;
        }

        const asmCounts: AssemblyCount[] = [];
        for (const constituency of asmSet) {
          let aq = supabase.from('jsp_kriya_members').select('*', { count: 'exact', head: true }).eq('constituency_name', constituency);
          if (vf) aq = aq.eq('volunteername', vf);
          const { count: ac } = await aq;

          let aqC = supabase.from('jsp_kriya_members').select('*', { count: 'exact', head: true }).eq('constituency_name', constituency).ilike('status', 'completed');
          if (vf) aqC = aqC.eq('volunteername', vf);
          const { count: acC } = await aqC;

          let aqP = supabase.from('jsp_kriya_members').select('*', { count: 'exact', head: true }).eq('constituency_name', constituency).ilike('status', 'pending');
          if (vf) aqP = aqP.eq('volunteername', vf);
          const { count: acP } = await aqP;

          asmCounts.push({
            assembly_id: null,
            constituency_name: constituency,
            total: ac ?? 0,
            completed: acC ?? 0,
            pending: acP ?? 0,
          });
        }
        asmCounts.sort((a, b) => b.total - a.total);
        setAssemblyCounts(asmCounts);

        // Top 10 sadhaks — build count map by paginating
        const sMap: Record<string, { count: number; mobile: string | null }> = {};
        let tOffset = 0;
        while (true) {
          let tq = supabase.from('jsp_kriya_members').select('volunteername,volunteer_mobile').range(tOffset, tOffset + 999);
          if (vf) tq = tq.eq('volunteername', vf);
          const { data: td } = await tq;
          if (!td || td.length === 0) break;
          td.forEach((r: any) => {
            if (!r.volunteername) return;
            if (!sMap[r.volunteername]) sMap[r.volunteername] = { count: 0, mobile: r.volunteer_mobile || null };
            sMap[r.volunteername].count++;
          });
          if (td.length < 1000) break;
          tOffset += 1000;
        }
        const topArr = Object.entries(sMap)
          .map(([name, v]) => ({ volunteername: name, volunteer_mobile: v.mobile, count: v.count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        setTopSadhaks(topArr);
      } catch (err) {
        console.error('JSP Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const cards = [
    { label: 'Total Members', value: stats?.totalMembers ?? 0, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Completed Payments', value: stats?.completedPayments ?? 0, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Pending Members', value: stats?.pendingMembers ?? 0, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Total Sadhaks', value: stats?.totalSadhaks ?? 0, icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  const maxPhaseCount = Math.max(...phases.map((p) => p.count), 1);
  const totalGender = genderCounts.reduce((s, g) => s + g.count, 0) || 1;
  const genderColors: Record<string, string> = {
    Male: '#3b82f6',
    Female: '#ec4899',
    Other: '#a855f7',
    Unknown: '#9ca3af',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">JSP Dashboard</h1>
          <p className="text-sm text-gray-500">Kriya membership overview and analytics</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value.toLocaleString()}</p>
              <p className="text-xs font-medium text-gray-500 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Phase-wise bar chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-500" />
            Phase-wise Member Count
          </h3>
          <div className="space-y-3">
            {phases.length === 0 && <p className="text-sm text-gray-400">No phase data available</p>}
            {phases.map((p) => (
              <div key={p.phase} className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-600 w-20 flex-shrink-0">{PHASE_LABELS[p.phase] || p.phase}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-7 overflow-hidden">
                  <div
                    className={`h-full ${PHASE_COLORS[p.phase] || 'bg-amber-500'} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                    style={{ width: `${(p.count / maxPhaseCount) * 100}%` }}
                  >
                    <span className="text-xs font-bold text-white">{p.count.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gender breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-amber-500" />
            Gender Breakdown
          </h3>
          {genderCounts.length === 0 ? (
            <p className="text-sm text-gray-400">No gender data available</p>
          ) : (
            <div className="flex items-center gap-6">
              <div className="relative w-36 h-36 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-36 h-36 -rotate-90">
                  {(() => {
                    let offset = 0;
                    return genderCounts.map((g) => {
                      const pct = (g.count / totalGender) * 100;
                      const dash = `${pct} ${100 - pct}`;
                      const circle = (
                        <circle
                          key={g.gender}
                          cx="18"
                          cy="18"
                          r="15.915"
                          fill="none"
                          stroke={genderColors[g.gender] || '#9ca3af'}
                          strokeWidth="4"
                          strokeDasharray={dash}
                          strokeDashoffset={-offset}
                        />
                      );
                      offset += pct;
                      return circle;
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900">{totalGender.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {genderCounts.map((g) => (
                  <div key={g.gender} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: genderColors[g.gender] || '#9ca3af' }} />
                      <span className="text-sm text-gray-600">{g.gender}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{g.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top 10 Sadhaks */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          Top 10 Sadhaks by Enrollment
        </h3>
        {topSadhaks.length === 0 ? (
          <p className="text-sm text-gray-400">No sadhak data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">#</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">Sadhak Name</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">Mobile</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-500">Enrollments</th>
                </tr>
              </thead>
              <tbody>
                {topSadhaks.map((s, i) => (
                  <tr key={s.volunteername} className="border-b border-gray-50 hover:bg-amber-50/50 transition-colors">
                    <td className="py-2.5 px-3 text-gray-400 font-medium">{i + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-gray-900">{s.volunteername}</td>
                    <td className="py-2.5 px-3 text-gray-600">{s.volunteer_mobile || '—'}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-600">{s.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assembly-wise breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-amber-500" />
          Assembly-wise Member Count
        </h3>
        {assemblyCounts.length === 0 ? (
          <p className="text-sm text-gray-400">No assembly data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">Assembly</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-500">Total</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-500">Completed</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-500">Pending</th>
                </tr>
              </thead>
              <tbody>
                {assemblyCounts.map((a, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-amber-50/50 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-gray-900">{a.constituency_name || `Assembly #${a.assembly_id}`}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-gray-900">{a.total.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-green-600 font-medium">{a.completed.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-orange-600 font-medium">{a.pending.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
