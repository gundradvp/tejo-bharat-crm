import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import LocationStats from './LocationStats';
import { ChevronDown, MapPin, Users, Building2, Layers, Loader2 } from 'lucide-react';

interface JspLocation {
  id: string;
  name: string;
  name_telugu?: string | null;
  type: string;
  area_category?: string | null;
  total_wards?: number | null;
  parent_id?: string | null;
  source_id?: number | null;
  state_id?: number | null;
}

type Level = 'state' | 'district' | 'parliament' | 'assembly' | 'mandal' | 'panchayat';

const LEVEL_ORDER: Level[] = ['state', 'district', 'parliament', 'assembly', 'mandal', 'panchayat'];
const LEVEL_LABELS: Record<Level, string> = {
  state: 'State',
  district: 'District',
  parliament: 'Parliament',
  assembly: 'Assembly',
  mandal: 'Mandal',
  panchayat: 'Panchayat',
};

function areaCategoryBadge(category: string): { bg: string; text: string } {
  const cat = category?.toLowerCase() || '';
  if (cat.includes('rural') || cat.includes('panchayat')) return { bg: 'bg-green-100', text: 'text-green-700' };
  if (cat.includes('municipal corporation')) return { bg: 'bg-purple-100', text: 'text-purple-700' };
  if (cat.includes('municipality')) return { bg: 'bg-blue-100', text: 'text-blue-700' };
  if (cat.includes('town') || cat.includes('nagar')) return { bg: 'bg-amber-100', text: 'text-amber-700' };
  return { bg: 'bg-gray-100', text: 'text-gray-700' };
}

export default function HierarchyBrowser() {
  const { profile } = useAuth();
  const [selections, setSelections] = useState<Record<Level, JspLocation | null>>({
    state: null, district: null, parliament: null, assembly: null, mandal: null, panchayat: null,
  });
  const [options, setOptions] = useState<Record<Level, JspLocation[]>>({
    state: [], district: [], parliament: [], assembly: [], mandal: [], panchayat: [],
  });
  const [loadingLevel, setLoadingLevel] = useState<Level | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const fetchByType = useCallback(async (type: Level, parentId?: string): Promise<JspLocation[]> => {
    let query = supabase.from('jsp_locations').select('*').eq('type', type).order('name');
    if (parentId) {
      query = query.eq('parent_id', parentId);
    }
    const { data, error } = await query;
    if (error) {
      console.error(`Error fetching ${type}:`, error);
      return [];
    }
    return (data || []) as JspLocation[];
  }, []);

  useEffect(() => {
    setLoadingLevel('state');
    fetchByType('state').then((states) => {
      setOptions((prev) => ({ ...prev, state: states }));
      setLoadingLevel(null);
    });
  }, [fetchByType]);

  const selectLocation = (level: Level, loc: JspLocation | null) => {
    const levelIndex = LEVEL_ORDER.indexOf(level);
    setSelections((prev) => {
      const next = { ...prev, [level]: loc };
      for (let i = levelIndex + 1; i < LEVEL_ORDER.length; i++) {
        next[LEVEL_ORDER[i]] = null;
      }
      return next;
    });
    setOptions((prev) => {
      const next = { ...prev };
      for (let i = levelIndex + 1; i < LEVEL_ORDER.length; i++) {
        next[LEVEL_ORDER[i]] = [];
      }
      return next;
    });

    if (loc) {
      const childLevel = LEVEL_ORDER[levelIndex + 1];
      if (childLevel) {
        setLoadingLevel(childLevel);
        fetchByType(childLevel, loc.id).then((children) => {
          setOptions((prev) => ({ ...prev, [childLevel]: children }));
          setLoadingLevel(null);
        });
      }
    }
  };

  const selectedPanchayat = selections.panchayat;
  const selectedAssembly = selections.assembly;

  useEffect(() => {
    if (!selectedPanchayat) {
      setMemberCount(null);
      return;
    }
    setLoadingMembers(true);
    supabase
      .from('jsp_kriya_members')
      .select('*', { count: 'exact', head: true })
      .eq('panchayat_name', selectedPanchayat.name)
      .then(({ count, error }) => {
        if (error) {
          console.error('Member count error:', error);
          setMemberCount(null);
        } else {
          setMemberCount(count ?? 0);
        }
        setLoadingMembers(false);
      });
  }, [selectedPanchayat]);

  const assemblyIdNum = selectedAssembly?.source_id ?? undefined;

  const dropdownClass = (level: Level): string => {
    const levelIndex = LEVEL_ORDER.indexOf(level);
    const parentSelected = levelIndex === 0 || selections[LEVEL_ORDER[levelIndex - 1]] !== null;
    return `relative flex-1 min-w-[140px] ${!parentSelected ? 'opacity-50 cursor-not-allowed' : ''}`;
  };

  const renderDropdown = (level: Level) => {
    const levelIndex = LEVEL_ORDER.indexOf(level);
    const parentSelected = levelIndex === 0 || selections[LEVEL_ORDER[levelIndex - 1]] !== null;
    const selected = selections[level];
    const opts = options[level];
    const isLoading = loadingLevel === level;

    return (
      <div key={level} className={dropdownClass(level)}>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          {LEVEL_LABELS[level]}
        </label>
        <div className="relative">
          <select
            disabled={!parentSelected || isLoading}
            value={selected?.id || ''}
            onChange={(e) => {
              const loc = opts.find((o) => o.id === e.target.value) || null;
              selectLocation(level, loc);
            }}
            className="w-full appearance-none bg-white border border-gray-300 rounded-lg py-2.5 pl-3 pr-9 text-sm font-medium text-gray-800 disabled:cursor-not-allowed disabled:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all"
          >
            <option value="">{isLoading ? 'Loading...' : `Select ${LEVEL_LABELS[level]}`}</option>
            {opts.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>
    );
  };

  const badge = selectedPanchayat?.area_category
    ? areaCategoryBadge(selectedPanchayat.area_category)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
          <Layers className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Hierarchy Browser</h1>
          <p className="text-sm text-gray-500">Browse the full location tree from State to Panchayat</p>
        </div>
      </div>

      {/* Filter dropdowns */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          {LEVEL_ORDER.map((level) => renderDropdown(level))}
        </div>
        {(selections.state || selections.district || selections.parliament) && (
          <div className="mt-4 flex flex-wrap gap-2 items-center text-xs text-gray-500">
            <span className="font-semibold text-gray-600">Breadcrumb:</span>
            {LEVEL_ORDER.filter((l) => selections[l]).map((l, i, arr) => (
              <span key={l} className="flex items-center gap-2">
                <span className="font-medium text-amber-600">{selections[l]!.name}</span>
                {i < arr.length - 1 && <ChevronDown className="w-3 h-3 -rotate-90 text-gray-300" />}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Panchayat summary card */}
      {selectedPanchayat && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedPanchayat.name}</h2>
                {selectedPanchayat.name_telugu && (
                  <p className="text-sm text-gray-500">{selectedPanchayat.name_telugu}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {badge && (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
                      {selectedPanchayat.area_category}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{selectedPanchayat.total_wards ?? 0}</span> Wards
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                    <Users className="w-4 h-4 text-gray-400" />
                    {loadingMembers ? (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    ) : (
                      <span className="font-medium">{memberCount?.toLocaleString() ?? 0}</span>
                    )}
                    <span>Kriya Members</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assembly-level stats */}
      {selectedAssembly && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            {selectedAssembly.name} — Assembly Stats
          </h3>
          <LocationStats
            level="assembly"
            assemblyId={assemblyIdNum}
            locationId={selectedAssembly.id}
          />
        </div>
      )}

      {/* Empty state */}
      {!selectedPanchayat && !selectedAssembly && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Select a location from the filters above</p>
          <p className="text-sm text-gray-400 mt-1">Choose a State to get started, then drill down to see stats</p>
        </div>
      )}
    </div>
  );
}
