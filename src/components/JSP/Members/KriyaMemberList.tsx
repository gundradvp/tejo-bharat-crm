import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase, Profile, isJSPAdmin, hasAnyRole } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Search, Download, X, ChevronLeft, ChevronRight, Users, Filter, Phone, MapPin, CreditCard, Calendar, UserCircle } from 'lucide-react';
import { JSP_LOCATION_HIERARCHY } from '../../../lib/jspLocationData';
import Pagination from '../../Common/Pagination';

interface KriyaMember {
  id: number;
  jsp_id: string | null;
  name: string | null;
  mobile: string | null;
  age: number | null;
  dob: string | null;
  gender: string | null;
  aadhar_number: string | null;
  address: string | null;
  photo_url: string | null;
  membership_type: string | null;
  phase: string | null;
  status: string | null;
  payment_id: string | null;
  payment_status: string | null;
  payment_verified: string | null;
  payment_completed_date: string | null;
  parliament_constituency_id: number | null;
  parliament_constituency_name: string | null;
  assembly_id: number | null;
  constituency_name: string | null;
  mandal_name: string | null;
  panchayat_name: string | null;
  polling_booth_number: string | null;
  ward_no: string | null;
  volunteername: string | null;
  volunteer_mobile: string | null;
  created_date: string | null;
  nominee_name: string | null;
  nominee_aadhar_number: string | null;
  y2021_present: number | null;
  y2022_present: number | null;
  y2023_present: number | null;
  y2024_present: number | null;
  y2026_present: number | null;
  remarks: string | null;
}

interface FilterOption {
  value: string;
  label: string;
}

const PAGE_SIZE = 50;

const STATUS_BADGES: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  suspended: 'bg-red-100 text-red-700',
  'constituency changed': 'bg-gray-100 text-gray-700',
};

const PAYMENT_DOT: Record<string, string> = {
  success: 'bg-green-500',
  pending: 'bg-amber-500',
};

function maskAadhar(aadhar: string | null): string {
  if (!aadhar) return '—';
  const digits = aadhar.replace(/\D/g, '');
  if (digits.length >= 12) {
    return `XXXX-XXXX-${digits.slice(-4)}`;
  }
  return aadhar;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

const MEMBER_COLS = 'id,jsp_id,name,mobile,age,dob,gender,aadhar_number,address,membership_type,phase,status,payment_id,payment_status,payment_verified,payment_completed_date,parliament_constituency_id,parliament_constituency_name,assembly_id,constituency_name,mandal_name,panchayat_name,polling_booth_number,ward_no,volunteername,volunteer_mobile,created_date,nominee_name,nominee_aadhar_number,y2021_present,y2022_present,y2023_present,y2024_present,y2026_present,remarks';

export default function KriyaMemberList() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const queryParamSearch = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<KriyaMember[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [selectedMember, setSelectedMember] = useState<KriyaMember | null>(null);

  // Filters
  const [searchInput, setSearchInput] = useState(queryParamSearch);
  const [activeSearch, setActiveSearch] = useState(queryParamSearch);

  useEffect(() => {
    const param = searchParams.get('search');
    if (param) {
      setSearchInput(param);
      setActiveSearch(param.trim());
    }
  }, [searchParams]);

  const [stateFilter, setStateFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [parliamentFilter, setParliamentFilter] = useState('');
  const [assemblyFilter, setAssemblyFilter] = useState('');
  const [mandalFilter, setMandalFilter] = useState('');
  const [panchayatFilter, setPanchayatFilter] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [membershipTypeFilter, setMembershipTypeFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [sadhakFilter, setSadhakFilter] = useState('');

  const handleSearchSubmit = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveSearch(searchInput.trim());
  }, [searchInput]);

  // Sadhaks options from DB
  const [sadhaks, setSadhaks] = useState<FilterOption[]>([]);

  const isAdmin = profile ? isJSPAdmin(profile as Profile | null) : false;
  const isSadhakUser = profile ? (hasAnyRole(profile as Profile | null, ['jsp_sadhak']) && !isAdmin) : false;
  const volunteerFilter = isSadhakUser ? profile?.full_name ?? null : null;

  // Derive Location Cascading Options
  const availableStates = useMemo(() => {
    const set = new Set<string>();
    JSP_LOCATION_HIERARCHY.forEach((n) => { if (n.state) set.add(n.state); });
    return Array.from(set).sort();
  }, []);

  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    JSP_LOCATION_HIERARCHY.forEach((n) => {
      if (!stateFilter || n.state === stateFilter) {
        if (n.district) set.add(n.district);
      }
    });
    return Array.from(set).sort();
  }, [stateFilter]);

  const availableParliaments = useMemo(() => {
    const set = new Set<string>();
    JSP_LOCATION_HIERARCHY.forEach((n) => {
      if ((!stateFilter || n.state === stateFilter) &&
          (!districtFilter || n.district === districtFilter)) {
        if (n.parliament) set.add(n.parliament);
      }
    });
    return Array.from(set).sort();
  }, [stateFilter, districtFilter]);

  const availableAssemblies = useMemo(() => {
    const set = new Set<string>();
    JSP_LOCATION_HIERARCHY.forEach((n) => {
      if ((!stateFilter || n.state === stateFilter) &&
          (!districtFilter || n.district === districtFilter) &&
          (!parliamentFilter || n.parliament === parliamentFilter)) {
        if (n.assembly) set.add(n.assembly);
      }
    });
    return Array.from(set).sort();
  }, [stateFilter, districtFilter, parliamentFilter]);

  const availableMandals = useMemo(() => {
    const set = new Set<string>();
    JSP_LOCATION_HIERARCHY.forEach((n) => {
      if ((!stateFilter || n.state === stateFilter) &&
          (!districtFilter || n.district === districtFilter) &&
          (!parliamentFilter || n.parliament === parliamentFilter) &&
          (!assemblyFilter || n.assembly === assemblyFilter)) {
        n.mandals.forEach((m) => { if (m.name) set.add(m.name); });
      }
    });
    return Array.from(set).sort();
  }, [stateFilter, districtFilter, parliamentFilter, assemblyFilter]);

  const availablePanchayats = useMemo(() => {
    const set = new Set<string>();
    JSP_LOCATION_HIERARCHY.forEach((n) => {
      if ((!stateFilter || n.state === stateFilter) &&
          (!districtFilter || n.district === districtFilter) &&
          (!parliamentFilter || n.parliament === parliamentFilter) &&
          (!assemblyFilter || n.assembly === assemblyFilter)) {
        n.mandals.forEach((m) => {
          if (!mandalFilter || m.name === mandalFilter) {
            m.panchayats.forEach((p) => { if (p) set.add(p); });
          }
        });
      }
    });
    return Array.from(set).sort();
  }, [stateFilter, districtFilter, parliamentFilter, assemblyFilter, mandalFilter]);

  // Apply filters to a query builder
  const applyFilters = (q: any) => {
    if (volunteerFilter) q = q.eq('volunteername', volunteerFilter);
    if (parliamentFilter) q = q.eq('parliament_constituency_name', parliamentFilter);
    if (assemblyFilter) q = q.eq('constituency_name', assemblyFilter);
    else if (districtFilter) {
      if (availableAssemblies.length > 0) {
        q = q.in('constituency_name', availableAssemblies);
      }
    }
    if (mandalFilter) q = q.eq('mandal_name', mandalFilter);
    if (panchayatFilter) q = q.eq('panchayat_name', panchayatFilter);
    if (phaseFilter) q = q.eq('phase', phaseFilter);
    if (statusFilter) q = q.ilike('status', statusFilter);
    if (membershipTypeFilter) q = q.eq('membership_type', membershipTypeFilter);
    if (genderFilter) {
      if (genderFilter === 'Male') q = q.or('gender.ilike.Male,gender.ilike.M');
      else if (genderFilter === 'Female') q = q.or('gender.ilike.Female,gender.ilike.F');
      else q = q.ilike('gender', genderFilter);
    }
    if (sadhakFilter) q = q.eq('volunteername', sadhakFilter);

    if (activeSearch.trim()) {
      const term = activeSearch.trim();
      const isNumeric = /^\d+$/.test(term);
      if (isNumeric) {
        if (term.length === 12) {
          q = q.or(`aadhar_number.eq.${term},mobile.eq.${term},aadhar_number.ilike.%${term}%,jsp_id.ilike.%${term}%`);
        } else if (term.length === 10) {
          q = q.or(`mobile.eq.${term},mobile.ilike.%${term}%,aadhar_number.ilike.%${term}%,jsp_id.ilike.%${term}%`);
        } else {
          q = q.or(`mobile.ilike.%${term}%,aadhar_number.ilike.%${term}%,jsp_id.ilike.%${term}%`);
        }
      } else {
        q = q.or(`name.ilike.%${term}%,jsp_id.ilike.%${term}%`);
      }
    }
    return q;
  };

  // Fetch sadhak options (global or per selected assembly)
  useEffect(() => {
    if (!profile) return;

    let isMounted = true;

    const fetchSadhaks = async () => {
      const sadhakSet = new Set<string>();

      // 1. Instant seed from currently loaded members
      members.forEach((m) => {
        if (m.volunteername && m.volunteername.trim()) {
          sadhakSet.add(m.volunteername.trim());
        }
      });
      if (sadhakSet.size > 0 && isMounted) {
        setSadhaks(Array.from(sadhakSet).sort().map((v) => ({ value: v, label: v })));
      }

      // 2. Fetch from lookup values if assembly selected
      if (assemblyFilter) {
        try {
          const categoryKey = `jsp_sadhaks:${assemblyFilter.toLowerCase().trim()}`;
          const { data: cachedSadhaks } = await supabase
            .from('lookup_values')
            .select('value')
            .eq('category', categoryKey)
            .order('value');

          if (cachedSadhaks && cachedSadhaks.length > 0) {
            cachedSadhaks.forEach((s: any) => {
              if (s.value && s.value.trim()) sadhakSet.add(s.value.trim());
            });
            if (isMounted) {
              setSadhaks(Array.from(sadhakSet).sort().map((v) => ({ value: v, label: v })));
              return;
            }
          }
        } catch {}
      }

      // 3. Query distinct volunteer names from jsp_kriya_members
      try {
        let query = supabase
          .from('jsp_kriya_members')
          .select('volunteername')
          .not('volunteername', 'is', null)
          .limit(2000);

        if (assemblyFilter) {
          query = query.eq('constituency_name', assemblyFilter);
        }
        if (volunteerFilter) {
          query = query.eq('volunteername', volunteerFilter);
        }

        const { data } = await query;
        (data || []).forEach((r: any) => {
          if (r.volunteername && r.volunteername.trim()) sadhakSet.add(r.volunteername.trim());
        });

        if (isMounted) {
          setSadhaks(Array.from(sadhakSet).sort().map((v) => ({ value: v, label: v })));
        }
      } catch (err) {
        console.error('Sadhak fetch failed:', err);
      }
    };

    fetchSadhaks();

    return () => {
      isMounted = false;
    };
  }, [profile, volunteerFilter, assemblyFilter, members]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [activeSearch, stateFilter, districtFilter, parliamentFilter, assemblyFilter, mandalFilter, panchayatFilter, phaseFilter, statusFilter, membershipTypeFilter, genderFilter, sadhakFilter]);

  const hasActiveCriteria = Boolean(
    activeSearch.trim() ||
    stateFilter ||
    districtFilter ||
    parliamentFilter ||
    assemblyFilter ||
    mandalFilter ||
    panchayatFilter ||
    phaseFilter ||
    statusFilter ||
    membershipTypeFilter ||
    genderFilter ||
    sadhakFilter
  );

  // Fetch members with filters — separate count and data queries
  useEffect(() => {
    if (!hasActiveCriteria) {
      setMembers([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    const fetchMembers = async () => {
      setLoading(true);
      try {
        // Count query (head-only, separate builder)
        let countQuery = supabase.from('jsp_kriya_members').select('*', { count: 'exact', head: true });
        countQuery = applyFilters(countQuery);
        const { count, error: countError } = await countQuery;
        if (countError) throw countError;
        setTotalCount(count ?? 0);

        // Data query (separate builder)
        let dataQuery = supabase.from('jsp_kriya_members').select(MEMBER_COLS);
        dataQuery = applyFilters(dataQuery);
        const { data, error } = await dataQuery
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
          .order('id', { ascending: false });

        if (error) throw error;
        setMembers((data || []) as KriyaMember[]);
      } catch (err) {
        console.error('Member list error:', err);
        setMembers([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [page, activeSearch, stateFilter, districtFilter, parliamentFilter, assemblyFilter, mandalFilter, panchayatFilter, phaseFilter, statusFilter, membershipTypeFilter, genderFilter, sadhakFilter, volunteerFilter, hasActiveCriteria]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const exportCSV = useCallback(() => {
    if (members.length === 0) return;
    const headers = ['ID', 'JSP ID', 'Name', 'Mobile', 'Age', 'Gender', 'Mandal', 'Panchayat', 'Booth', 'Ward', 'Phase', 'Status', 'Membership Type', 'Payment Status', 'Volunteer', 'Volunteer Mobile', 'Created Date'];
    const rows = members.map((m) => [
      m.id, m.jsp_id || '', m.name || '', m.mobile || '', m.age || '', m.gender || '',
      m.mandal_name || '', m.panchayat_name || '', m.polling_booth_number || '', m.ward_no || '',
      m.phase || '', m.status || '', m.membership_type || '', m.payment_status || '',
      m.volunteername || '', m.volunteer_mobile || '', m.created_date || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kriya_members_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [members]);

  const selectClass = "w-full appearance-none bg-white border border-gray-300 rounded-lg py-2 pl-3 pr-8 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all";

  const openMemberDetail = useCallback(async (member: KriyaMember) => {
    setSelectedMember(member);
    try {
      const { data } = await supabase
        .from('jsp_kriya_members')
        .select('photo_url')
        .eq('id', member.id)
        .single();
      if (data?.photo_url) {
        setSelectedMember({ ...member, photo_url: data.photo_url });
      }
    } catch {}
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
            <Users className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Kriya Members</h1>
            <p className="text-sm text-gray-500">
              {sadhakFilter
                ? `${totalCount.toLocaleString()} memberships enrolled by Volunteer: "${sadhakFilter}"`
                : activeSearch.trim()
                ? `Found ${totalCount.toLocaleString()} result(s) for "${activeSearch.trim()}"`
                : assemblyFilter
                ? `${totalCount.toLocaleString()} members in ${assemblyFilter}`
                : hasActiveCriteria
                ? `${totalCount.toLocaleString()} total members found`
                : 'Search by name/mobile/aadhar, select a volunteer, or select a location filter'}
            </p>
          </div>
        </div>
        <button
          onClick={exportCSV}
          disabled={members.length === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-1">
          <Filter className="w-4 h-4 text-amber-500" />
          Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {/* Search form with explicit Search Button */}
          <form onSubmit={handleSearchSubmit} className="relative sm:col-span-2 lg:col-span-3 xl:col-span-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, mobile, or aadhar..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (e.target.value === '' && activeSearch !== '') {
                    setActiveSearch('');
                  }
                }}
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setActiveSearch('');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors flex items-center gap-1.5 flex-shrink-0"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </form>

          {/* 1. State */}
          <div className="relative">
            <select
              className={selectClass}
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setDistrictFilter('');
                setParliamentFilter('');
                setAssemblyFilter('');
                setMandalFilter('');
                setPanchayatFilter('');
              }}
            >
              <option value="">All States</option>
              {availableStates.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
          </div>

          {/* 2. District */}
          <div className="relative">
            <select
              className={selectClass}
              value={districtFilter}
              onChange={(e) => {
                setDistrictFilter(e.target.value);
                setParliamentFilter('');
                setAssemblyFilter('');
                setMandalFilter('');
                setPanchayatFilter('');
              }}
            >
              <option value="">All Districts</option>
              {availableDistricts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
          </div>

          {/* 3. Parliament Constituency */}
          <div className="relative">
            <select
              className={selectClass}
              value={parliamentFilter}
              onChange={(e) => {
                setParliamentFilter(e.target.value);
                setAssemblyFilter('');
                setMandalFilter('');
                setPanchayatFilter('');
              }}
            >
              <option value="">All Parliaments</option>
              {availableParliaments.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
          </div>

          {/* 4. Assembly Constituency */}
          <div className="relative">
            <select
              className={`${selectClass} ${!assemblyFilter ? 'border-amber-400 ring-2 ring-amber-100 font-semibold' : ''}`}
              value={assemblyFilter}
              onChange={(e) => {
                setAssemblyFilter(e.target.value);
                setMandalFilter('');
                setPanchayatFilter('');
                setSadhakFilter('');
              }}
            >
              <option value="">Select Assembly ({availableAssemblies.length})</option>
              {availableAssemblies.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 rotate-90 pointer-events-none" />
          </div>

          {/* 5. Mandal */}
          <div className="relative">
            <select
              className={`${selectClass} ${!assemblyFilter && availableMandals.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              value={mandalFilter}
              onChange={(e) => {
                setMandalFilter(e.target.value);
                setPanchayatFilter('');
              }}
            >
              <option value="">All Mandals</option>
              {availableMandals.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
          </div>

          {/* 6. Panchayat / Village */}
          <div className="relative">
            <select
              className={`${selectClass} ${!mandalFilter && availablePanchayats.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              value={panchayatFilter}
              onChange={(e) => setPanchayatFilter(e.target.value)}
            >
              <option value="">All Panchayats</option>
              {availablePanchayats.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
          </div>

          {/* Phase */}
          <div className="relative">
            <select className={selectClass} value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)}>
              <option value="">All Phases</option>
              <option value="first">1st Phase</option>
              <option value="second">2nd Phase</option>
              <option value="third">3rd Phase</option>
              <option value="fourth">4th Phase</option>
              <option value="fifth">5th Phase</option>
            </select>
            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
          </div>

          {/* Status */}
          <div className="relative">
            <select className={selectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Suspended">Suspended</option>
              <option value="Constituency Changed">Constituency Changed</option>
            </select>
            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
          </div>

          {/* Membership Type */}
          <div className="relative">
            <select className={selectClass} value={membershipTypeFilter} onChange={(e) => setMembershipTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              <option value="fresh">Fresh</option>
              <option value="renewal">Renewal</option>
              <option value="Suspension">Suspension</option>
            </select>
            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
          </div>

          {/* Gender */}
          <div className="relative">
            <select className={selectClass} value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
          </div>

          {/* Sadhak / Volunteer */}
          <div className="relative">
            <select
              className={selectClass}
              value={sadhakFilter}
              onChange={(e) => setSadhakFilter(e.target.value)}
            >
              <option value="">{`All Volunteers / Sadhaks (${sadhaks.length})`}</option>
              {sadhaks.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
          </div>
        </div>

        {/* Clear filters */}
        {(stateFilter || districtFilter || parliamentFilter || assemblyFilter || mandalFilter || panchayatFilter || phaseFilter || statusFilter || membershipTypeFilter || genderFilter || sadhakFilter || searchInput || activeSearch) && (
          <button
            onClick={() => {
              setSearchInput('');
              setActiveSearch('');
              setStateFilter('');
              setDistrictFilter('');
              setParliamentFilter('');
              setAssemblyFilter('');
              setMandalFilter('');
              setPanchayatFilter('');
              setPhaseFilter('');
              setStatusFilter('');
              setMembershipTypeFilter('');
              setGenderFilter('');
              setSadhakFilter('');
            }}
            className="text-xs font-medium text-amber-600 hover:text-amber-700"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Results table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {!hasActiveCriteria ? (
          <div className="text-center py-20 px-4">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100">
              <MapPin className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Search or Select Location Filter</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Enter a name, mobile number, or Aadhar in the search bar above, or select an Assembly Constituency to load records.
            </p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 font-medium">
              {activeSearch.trim() ? `Searching for "${activeSearch.trim()}"...` : `Loading members...`}
            </p>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No members found</p>
            <p className="text-sm text-gray-400 mt-1">
              {activeSearch.trim() ? `No records matched "${activeSearch.trim()}"` : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-3 font-semibold text-gray-500">Photo</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-500">Name</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-500 hidden md:table-cell">Mobile</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-500 hidden lg:table-cell">Age / Gender</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-500 hidden lg:table-cell">Mandal / Panchayat</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-500 hidden xl:table-cell">Booth / Ward</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-500">Phase</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-500">Status</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-500 hidden md:table-cell">Payment</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-500 hidden xl:table-cell">Enrolled By</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-500 hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => {
                    const statusKey = (m.status || '').toLowerCase();
                    const payKey = (m.payment_status || '').toLowerCase();
                    return (
                      <tr
                        key={m.id}
                        onClick={() => openMemberDetail(m)}
                        className="border-b border-gray-50 hover:bg-amber-50/40 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700">
                            {getInitials(m.name)}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-gray-900">{m.name || '—'}</td>
                        <td className="py-2.5 px-3 text-gray-600 hidden md:table-cell">{m.mobile || '—'}</td>
                        <td className="py-2.5 px-3 text-gray-600 hidden lg:table-cell">
                          {m.age != null ? m.age : '—'} / {m.gender || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 hidden lg:table-cell">
                          {m.mandal_name || '—'} / {m.panchayat_name || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 hidden xl:table-cell">
                          {m.polling_booth_number || '—'} / {m.ward_no || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 capitalize">{m.phase || '—'}</td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGES[statusKey] || 'bg-gray-100 text-gray-600'}`}>
                            {m.status || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 hidden md:table-cell">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${PAYMENT_DOT[payKey] || 'bg-gray-300'}`} title={m.payment_status || ''} />
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 hidden xl:table-cell">{m.volunteername || '—'}</td>
                        <td className="py-2.5 px-3 text-gray-500 hidden md:table-cell">{m.created_date || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-2 border-t border-gray-200">
              <Pagination
                currentPage={page + 1}
                totalPages={totalPages}
                onPageChange={(p) => setPage(p - 1)}
                totalItems={totalCount}
                pageSize={PAGE_SIZE}
                showTotalCount={true}
                theme="amber"
              />
            </div>
          </>
        )}
      </div>

      {/* Member detail modal */}
      {selectedMember && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setSelectedMember(null)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-amber-500 text-white px-5 py-4 flex items-center justify-between z-10">
              <h3 className="font-bold text-lg">Member Details</h3>
              <button onClick={() => setSelectedMember(null)} className="p-1 hover:bg-amber-600 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Photo + name */}
              <div className="flex items-center gap-4">
                {selectedMember.photo_url ? (
                  <img src={selectedMember.photo_url} alt={selectedMember.name || ''} className="w-20 h-20 rounded-full object-cover border-2 border-amber-200" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center text-xl font-bold text-amber-700">
                    {getInitials(selectedMember.name)}
                  </div>
                )}
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{selectedMember.name || '—'}</h4>
                  <p className="text-sm text-gray-500">JSP ID: {selectedMember.jsp_id || '—'}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mt-1 ${STATUS_BADGES[(selectedMember.status || '').toLowerCase()] || 'bg-gray-100 text-gray-600'}`}>
                    {selectedMember.status || '—'}
                  </span>
                </div>
              </div>

              {/* Personal info */}
              <Section title="Personal Information" icon={UserCircle}>
                <DetailRow label="Aadhar" value={maskAadhar(selectedMember.aadhar_number)} />
                <DetailRow label="Mobile" value={selectedMember.mobile || '—'} />
                <DetailRow label="Date of Birth" value={selectedMember.dob || '—'} />
                <DetailRow label="Age" value={selectedMember.age != null ? String(selectedMember.age) : '—'} />
                <DetailRow label="Gender" value={selectedMember.gender || '—'} />
                <DetailRow label="Address" value={selectedMember.address || '—'} />
              </Section>

              {/* Location */}
              <Section title="Location" icon={MapPin}>
                <DetailRow label="Parliament" value={selectedMember.parliament_constituency_name || '—'} />
                <DetailRow label="Assembly" value={selectedMember.constituency_name || '—'} />
                <DetailRow label="Mandal" value={selectedMember.mandal_name || '—'} />
                <DetailRow label="Panchayat" value={selectedMember.panchayat_name || '—'} />
                <DetailRow label="Booth" value={selectedMember.polling_booth_number || '—'} />
                <DetailRow label="Ward" value={selectedMember.ward_no || '—'} />
              </Section>

              {/* Membership */}
              <Section title="Membership" icon={CreditCard}>
                <DetailRow label="Type" value={selectedMember.membership_type || '—'} />
                <DetailRow label="Phase" value={selectedMember.phase || '—'} />
                <DetailRow label="Status" value={selectedMember.status || '—'} />
              </Section>

              {/* Payment */}
              <Section title="Payment" icon={CreditCard}>
                <DetailRow label="Payment ID" value={selectedMember.payment_id || '—'} />
                <DetailRow label="Status" value={selectedMember.payment_status || '—'} />
                <DetailRow label="Verified" value={selectedMember.payment_verified || '—'} />
                <DetailRow label="Completed Date" value={selectedMember.payment_completed_date || '—'} />
              </Section>

              {/* Nominee */}
              <Section title="Nominee" icon={UserCircle}>
                <DetailRow label="Name" value={selectedMember.nominee_name || '—'} />
                <DetailRow label="Aadhar" value={maskAadhar(selectedMember.nominee_aadhar_number)} />
              </Section>

              {/* Attendance */}
              <Section title="Year-wise Attendance" icon={Calendar}>
                <div className="grid grid-cols-5 gap-2">
                  {[['2021', selectedMember.y2021_present], ['2022', selectedMember.y2022_present], ['2023', selectedMember.y2023_present], ['2024', selectedMember.y2024_present], ['2026', selectedMember.y2026_present]].map(([year, val]) => (
                    <div key={year as string} className={`text-center py-2 rounded-lg ${val ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
                      <p className="text-xs font-semibold">{year}</p>
                      <p className="text-sm font-bold">{val ? 'Present' : '—'}</p>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Enrolled by */}
              <Section title="Enrolled By" icon={Phone}>
                <DetailRow label="Sadhak Name" value={selectedMember.volunteername || '—'} />
                <DetailRow label="Sadhak Mobile" value={selectedMember.volunteer_mobile || '—'} />
                <DetailRow label="Created Date" value={selectedMember.created_date || '—'} />
              </Section>

              {selectedMember.remarks && (
                <Section title="Remarks" icon={UserCircle}>
                  <p className="text-sm text-gray-600">{selectedMember.remarks}</p>
                </Section>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        {title}
      </h5>
      <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
        {children}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right break-words">{value}</span>
    </div>
  );
}
