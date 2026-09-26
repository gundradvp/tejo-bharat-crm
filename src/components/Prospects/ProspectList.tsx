import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone, Copy, Check, Search, Upload, Users, Filter,
  MapPin, Zap, Clock, Loader2, TrendingUp, Calendar,
  Database, ChevronLeft, ChevronRight, RefreshCw, RotateCcw,
  Receipt, IndianRupee, Gauge, Link2, Layers, Download, X, Flame, ArrowUpDown, Sun, MessageSquare,
} from 'lucide-react';
import * as XLSX from 'xlsx/xlsx.mjs';
import Pagination from '../Common/Pagination';
import { useAuth } from '../../contexts/AuthContext';
import { canAccessWhatsAppHub } from '../../lib/whatsappApi';
import { type Profile } from '../../lib/supabase';
import {
  LeadProspect,
  CALL_STATUS_LABELS,
  CALL_STATUS_COLORS,
  fetchProspects,
  fetchProspectFilterValues,
  fetchProspectStats,
  fetchProspectBillSummaries,
  fetchImportBatches,
  ImportBatch,
  ProspectBillSummary,
  ProspectFilterOptions,
  ProspectSortOption,
  FilterOperator,
  fetchProspectsForExport,
  fetchProspectSCOnlyForExport,
  extractAreaCode,
} from '../../lib/prospectApi';
import ProspectDetailModal from './ProspectDetailModal';
import MultiSelectDropdown from '../Common/MultiSelectDropdown';
import AreaCodeFilter from './AreaCodeFilter';

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  gte: '\u2265 (min)',
  gt: '> (greater than)',
  lte: '\u2264 (max)',
  lt: '< (less than)',
  eq: '= (equals)',
  between: 'between',
};

const PAGE_SIZE_OPTIONS = [50, 100, 200];

const STORAGE_KEY = 'prospect_filters';

interface SavedFilters {
  search: string;
  circles: string[];
  divisions: string[];
  subdivs: string[];
  eros: string[];
  sections: string[];
  statuses: string[];
  callStatuses: string[];
  categories: string[];
  mandals: string[];
  subStations: string[];
  areaCodes?: string[];
  hideSuryaGhar?: boolean;
  hideSolarInstalled?: boolean;
  billAmountOp: FilterOperator;
  billAmountVal: string;
  billAmountMaxVal: string;
  billUnitsOp: FilterOperator;
  billUnitsVal: string;
  billUnitsMaxVal: string;
  importBatchId: string | null;
  dateFrom: string;
  dateTo: string;
  sortBy?: ProspectSortOption;
  pageSize: number;
}

function loadSavedFilters(): Partial<SavedFilters> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

export default function ProspectList() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const canAccessWhatsApp = canAccessWhatsAppHub(profile as Profile | null);
  const saved = loadSavedFilters();

  const [searchTerm, setSearchTerm] = useState(saved.search || '');
  const [debouncedSearch, setDebouncedSearch] = useState(saved.search || '');
  const [circleSelections, setCircleSelections] = useState<string[]>(saved.circles || []);
  const [divisionSelections, setDivisionSelections] = useState<string[]>(saved.divisions || []);
  const [subdivSelections, setSubdivSelections] = useState<string[]>(saved.subdivs || []);
  const [eroSelections, setEroSelections] = useState<string[]>(saved.eros || []);
  const [sectionSelections, setSectionSelections] = useState<string[]>(saved.sections || []);
  const [statusSelections, setStatusSelections] = useState<string[]>(saved.statuses || []);
  const [callStatusSelections, setCallStatusSelections] = useState<string[]>(saved.callStatuses || []);
  const [categorySelections, setCategorySelections] = useState<string[]>(saved.categories || []);
  const [mandalSelections, setMandalSelections] = useState<string[]>(saved.mandals || []);
  const [subStationSelections, setSubStationSelections] = useState<string[]>(saved.subStations || []);
  const [areaCodeSelections, setAreaCodeSelections] = useState<string[]>(saved.areaCodes || []);
  const [hideSuryaGhar, setHideSuryaGhar] = useState<boolean>(saved.hideSuryaGhar || false);
  const [hideSolarInstalled, setHideSolarInstalled] = useState<boolean>(saved.hideSolarInstalled || false);

  // Bill filter input state
  const [billAmountOp, setBillAmountOp] = useState<FilterOperator>(saved.billAmountOp || 'gte');
  const [billAmountVal, setBillAmountVal] = useState(saved.billAmountVal || '');
  const [billAmountMaxVal, setBillAmountMaxVal] = useState(saved.billAmountMaxVal || '');
  const [billUnitsOp, setBillUnitsOp] = useState<FilterOperator>(saved.billUnitsOp || 'gte');
  const [billUnitsVal, setBillUnitsVal] = useState(saved.billUnitsVal || '');
  const [billUnitsMaxVal, setBillUnitsMaxVal] = useState(saved.billUnitsMaxVal || '');

  // Applied bill filter state
  const [appliedBillAmount, setAppliedBillAmount] = useState<{ op: FilterOperator; val: string; maxVal: string } | null>(null);
  const [appliedBillUnits, setAppliedBillUnits] = useState<{ op: FilterOperator; val: string; maxVal: string } | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [prospects, setProspects] = useState<LeadProspect[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedProspect, setSelectedProspect] = useState<LeadProspect | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(saved.pageSize || 50);
  const [sortBy, setSortBy] = useState<ProspectSortOption>(saved.sortBy || 'created_at_desc');
  const [statFilter, setStatFilter] = useState<string | null>(null);
  const [highUsageOnly, setHighUsageOnly] = useState(false);
  const [stats, setStats] = useState({ total: 0, called: 0, interested: 0, followUpsDue: 0, live: 0 });

  const [filterValues, setFilterValues] = useState<{
    eros: string[]; sections: string[]; statuses: string[]; categories: string[];
    mandals: string[]; subStations: string[]; circles: string[]; divisions: string[]; subdivs: string[];
  }>({ eros: [], sections: [], statuses: [], categories: [], mandals: [], subStations: [], circles: [], divisions: [], subdivs: [] });

  const [billSummaries, setBillSummaries] = useState<Map<string, ProspectBillSummary>>(new Map());
  const [importBatches, setImportBatches] = useState<ImportBatch[]>([]);
  const [importBatchId, setImportBatchId] = useState<string | null>(saved.importBatchId || null);
  const [dateFrom, setDateFrom] = useState(saved.dateFrom || '');
  const [dateTo, setDateTo] = useState(saved.dateTo || '');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLimit, setExportLimit] = useState<number | 'all'>('all');
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState<'full' | 'scOnly'>('full');

  const handleOpenWhatsAppCampaign = () => {
    const params = new URLSearchParams({
      tab: 'campaigns',
      source: 'prospects',
      openModal: 'true',
    });
    if (searchTerm) params.set('search', searchTerm);
    if (circleSelections.length > 0) params.set('circle', circleSelections[0]);
    if (categorySelections.length > 0) params.set('category', categorySelections[0]);
    if (mandalSelections.length > 0) params.set('mandal', mandalSelections[0]);
    if (areaCodeSelections.length > 0) params.set('areaCodes', areaCodeSelections.join(','));
    if (callStatusSelections.length > 0) params.set('callStatus', callStatusSelections[0]);
    if (hideSolarInstalled) params.set('hideSolar', 'true');
    if (hideSuryaGhar) params.set('hideSuryaGhar', 'true');
    if (appliedBillUnits?.val) {
      params.set('unitsOp', appliedBillUnits.op);
      params.set('unitsVal', appliedBillUnits.val);
      if (appliedBillUnits.maxVal) params.set('unitsMax', appliedBillUnits.maxVal);
    }
    navigate(`/whatsapp?${params.toString()}`);
  };

  // Persist filters to localStorage
  useEffect(() => {
    const data: SavedFilters = {
      search: searchTerm,
      circles: circleSelections, divisions: divisionSelections, subdivs: subdivSelections,
      eros: eroSelections, sections: sectionSelections, statuses: statusSelections,
      callStatuses: callStatusSelections, categories: categorySelections,
      mandals: mandalSelections, subStations: subStationSelections,
      areaCodes: areaCodeSelections,
      hideSuryaGhar,
      hideSolarInstalled,
      billAmountOp, billAmountVal, billAmountMaxVal,
      billUnitsOp, billUnitsVal, billUnitsMaxVal,
      importBatchId,
      dateFrom, dateTo,
      sortBy,
      pageSize,
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
  }, [searchTerm, circleSelections, divisionSelections, subdivSelections, eroSelections, sectionSelections, statusSelections, callStatusSelections, categorySelections, mandalSelections, subStationSelections, areaCodeSelections, hideSuryaGhar, hideSolarInstalled, billAmountOp, billAmountVal, billAmountMaxVal, billUnitsOp, billUnitsVal, billUnitsMaxVal, importBatchId, dateFrom, dateTo, sortBy, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadFilterValues = useCallback(async () => {
    try {
      const values = await fetchProspectFilterValues();
      setFilterValues(values);
    } catch (err) { console.error('Error loading filter values:', err); }
    try {
      const batches = await fetchImportBatches();
      setImportBatches(batches);
    } catch (err) { console.error('Error loading import batches:', err); }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const s = await fetchProspectStats();
      setStats(s);
    } catch (err) { console.error('Error loading stats:', err); }
  }, []);

  const buildBillFilters = useCallback((): ProspectFilterOptions => {
    const filters: ProspectFilterOptions = {};
    if (appliedBillAmount && appliedBillAmount.val) {
      filters.billAmount = {
        operator: appliedBillAmount.op,
        value: parseFloat(appliedBillAmount.val),
        ...(appliedBillAmount.op === 'between' && appliedBillAmount.maxVal
          ? { maxValue: parseFloat(appliedBillAmount.maxVal) }
          : {}),
      };
    }
    if (appliedBillUnits && appliedBillUnits.val) {
      filters.billUnits = {
        operator: appliedBillUnits.op,
        value: parseFloat(appliedBillUnits.val),
        ...(appliedBillUnits.op === 'between' && appliedBillUnits.maxVal
          ? { maxValue: parseFloat(appliedBillUnits.maxVal) }
          : {}),
      };
    }
    return filters;
  }, [appliedBillAmount, appliedBillUnits]);

  const loadProspects = useCallback(async () => {
    setLoading(true);
    try {
      const billFilters = buildBillFilters();
      const filters: ProspectFilterOptions = {
        search: debouncedSearch || undefined,
        circles: circleSelections,
        divisions: divisionSelections,
        subdivs: subdivSelections,
        eros: eroSelections,
        sections: sectionSelections,
        statuses: statusSelections,
        callStatuses: callStatusSelections,
        categories: categorySelections,
        mandals: mandalSelections,
        subStations: subStationSelections,
        areaCodes: areaCodeSelections,
        hideSuryaGhar,
        hideSolarInstalled,
        sortBy,
        ...billFilters,
        importBatchId: importBatchId || undefined,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        page, pageSize,
      };

      if (statFilter === 'interested') filters.callStatuses = ['interested'];
      if (statFilter === 'live') filters.statuses = ['LIVE'];
      if (statFilter === 'followups') filters.followUpDue = true;
      if (statFilter === 'called') filters.calledOnly = true;

      const result = await fetchProspects(filters);
      setProspects(result.prospects);
      setTotal(result.total);
      setLoading(false);

      if (result.prospects.length > 0) {
        const scNumbers = result.prospects.map((p) => p.sc_number).filter(Boolean) as string[];
        fetchProspectBillSummaries(scNumbers).then(setBillSummaries).catch((err) => console.error('Error loading bill summaries:', err));
      } else {
        setBillSummaries(new Map());
      }
    } catch (err) { console.error('Error loading prospects:', err); }
    finally { setLoading(false); }
  }, [debouncedSearch, circleSelections, divisionSelections, subdivSelections, eroSelections, sectionSelections, statusSelections, callStatusSelections, categorySelections, mandalSelections, subStationSelections, areaCodeSelections, hideSuryaGhar, hideSolarInstalled, buildBillFilters, importBatchId, dateFrom, dateTo, page, pageSize, statFilter, sortBy]);

  useEffect(() => { loadProspects(); }, [loadProspects]);
  useEffect(() => { loadFilterValues(); loadStats(); }, [loadFilterValues, loadStats]);

  const displayedProspects = useMemo(() => {
    let result = prospects.filter((p) => {
      if (hideSuryaGhar && p.is_existing_customer) return false;
      if (hideSolarInstalled) {
        if (p.call_status === 'solar_already_installed' || p.call_status === 'already_installed') return false;
        if (p.ep_registration_number && p.ep_registration_number.trim() && p.ep_registration_number.trim() !== '-' && p.ep_registration_number.trim() !== '--') return false;
        if (p.existing_solar_load_kw != null && p.existing_solar_load_kw > 0) return false;
      }
      if (highUsageOnly) {
        if (!p.sc_number) return false;
        const bs = billSummaries.get(p.sc_number);
        return bs?.high_usage;
      }
      return true;
    });

    if (sortBy === 'units_desc') {
      result.sort((a, b) => {
        const aBs = a.sc_number ? billSummaries.get(a.sc_number) : undefined;
        const bBs = b.sc_number ? billSummaries.get(b.sc_number) : undefined;
        const aUnits = aBs?.max_billed_units ?? (aBs?.recent_units ?? 0);
        const bUnits = bBs?.max_billed_units ?? (bBs?.recent_units ?? 0);
        return bUnits - aUnits;
      });
    } else if (sortBy === 'units_asc') {
      result.sort((a, b) => {
        const aBs = a.sc_number ? billSummaries.get(a.sc_number) : undefined;
        const bBs = b.sc_number ? billSummaries.get(b.sc_number) : undefined;
        const aUnits = aBs?.max_billed_units ?? (aBs?.recent_units ?? 0);
        const bUnits = bBs?.max_billed_units ?? (bBs?.recent_units ?? 0);
        return aUnits - bUnits;
      });
    } else if (sortBy === 'load_desc') {
      result.sort((a, b) => (b.applied_solar_load_kw ?? b.contracted_load ?? 0) - (a.applied_solar_load_kw ?? a.contracted_load ?? 0));
    } else if (sortBy === 'load_asc') {
      result.sort((a, b) => (a.applied_solar_load_kw ?? a.contracted_load ?? 0) - (b.applied_solar_load_kw ?? b.contracted_load ?? 0));
    } else if (sortBy === 'name_asc') {
      result.sort((a, b) => (a.customer_name || '').localeCompare(b.customer_name || ''));
    } else if (sortBy === 'name_desc') {
      result.sort((a, b) => (b.customer_name || '').localeCompare(a.customer_name || ''));
    } else if (sortBy === 'created_at_desc') {
      result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    } else if (sortBy === 'created_at_asc') {
      result.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
    }

    return result;
  }, [prospects, highUsageOnly, hideSuryaGhar, hideSolarInstalled, billSummaries, sortBy]);

  const totalPages = Math.ceil(total / pageSize);
  const highUsageCount = Array.from(billSummaries.values()).filter((bs) => bs.high_usage).length;

  const hasActiveFilters =
    circleSelections.length > 0 || divisionSelections.length > 0 || subdivSelections.length > 0 ||
    eroSelections.length > 0 || sectionSelections.length > 0 || statusSelections.length > 0 ||
    callStatusSelections.length > 0 || categorySelections.length > 0 || mandalSelections.length > 0 ||
    subStationSelections.length > 0 || areaCodeSelections.length > 0 || hideSuryaGhar || hideSolarInstalled || !!appliedBillAmount || !!appliedBillUnits || !!importBatchId || !!dateFrom || !!dateTo;

  const activeFilterCount =
    [circleSelections, divisionSelections, subdivSelections, eroSelections, sectionSelections, statusSelections, callStatusSelections, categorySelections, mandalSelections, subStationSelections, areaCodeSelections]
      .filter((a) => a.length > 0).length +
    (hideSuryaGhar ? 1 : 0) + (hideSolarInstalled ? 1 : 0) +
    [appliedBillAmount, appliedBillUnits].filter(Boolean).length +
    (importBatchId ? 1 : 0) + (dateFrom || dateTo ? 1 : 0);

  const hasPendingBillFilter =
    (!!billAmountVal !== !!appliedBillAmount ||
     (appliedBillAmount && (billAmountOp !== appliedBillAmount.op || billAmountVal !== appliedBillAmount.val || billAmountMaxVal !== appliedBillAmount.maxVal)) ||
     !!billUnitsVal !== !!appliedBillUnits ||
     (appliedBillUnits && (billUnitsOp !== appliedBillUnits.op || billUnitsVal !== appliedBillUnits.val || billUnitsMaxVal !== appliedBillUnits.maxVal)));

  const clearFilters = () => {
    setCircleSelections([]); setDivisionSelections([]); setSubdivSelections([]);
    setEroSelections([]); setSectionSelections([]); setStatusSelections([]);
    setCallStatusSelections([]); setCategorySelections([]); setMandalSelections([]);
    setSubStationSelections([]);
    setAreaCodeSelections([]);
    setHideSuryaGhar(false);
    setHideSolarInstalled(false);
    setBillAmountOp('gte'); setBillAmountVal(''); setBillAmountMaxVal('');
    setBillUnitsOp('gte'); setBillUnitsVal(''); setBillUnitsMaxVal('');
    setAppliedBillAmount(null); setAppliedBillUnits(null);
    setImportBatchId(null);
    setDateFrom(''); setDateTo('');
    setSearchTerm(''); setDebouncedSearch('');
    setSortBy('created_at_desc');
    setStatFilter(null); setPage(1);
  };

  const applyBillFilters = () => {
    setAppliedBillAmount(billAmountVal ? { op: billAmountOp, val: billAmountVal, maxVal: billAmountMaxVal } : null);
    setAppliedBillUnits(billUnitsVal ? { op: billUnitsOp, val: billUnitsVal, maxVal: billUnitsMaxVal } : null);
    setPage(1);
  };

  const handleStatClick = (filter: string) => {
    setStatFilter((prev) => (prev === filter ? null : filter));
    setPage(1);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleModalUpdate = () => { loadProspects(); loadStats(); };

  const handleExport = async () => {
    setShowExportModal(false);
    setExporting(true);
    try {
      const billFilters = buildBillFilters();
      const filters: ProspectFilterOptions = {
        search: debouncedSearch || undefined,
        circles: circleSelections,
        divisions: divisionSelections,
        subdivs: subdivSelections,
        eros: eroSelections,
        sections: sectionSelections,
        statuses: statusSelections,
        callStatuses: callStatusSelections,
        categories: categorySelections,
        mandals: mandalSelections,
        subStations: subStationSelections,
        areaCodes: areaCodeSelections,
        hideSuryaGhar,
        hideSolarInstalled,
        sortBy,
        ...billFilters,
        importBatchId: importBatchId || undefined,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
      };
      if (statFilter === 'interested') filters.callStatuses = ['interested'];
      if (statFilter === 'live') filters.statuses = ['LIVE'];
      if (statFilter === 'followups') filters.followUpDue = true;
      if (statFilter === 'called') filters.calledOnly = true;

      const limit = exportLimit === 'all' ? undefined : exportLimit;

      if (exportType === 'scOnly') {
        const scNumbers = await fetchProspectSCOnlyForExport(filters, limit);
        if (scNumbers.length === 0) {
          alert('No SC numbers found in the filtered data.');
          return;
        }
        const csvContent = 'SC Number\n' + scNumbers.map((n) => String(n)).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const dateStr = new Date().toISOString().split('T')[0];
        link.download = `prospect_sc_numbers_${dateStr}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }

      const exportData = await fetchProspectsForExport(filters, limit);
      if (exportData.length === 0) {
        alert('No prospects to export with current filters.');
        return;
      }

      const wb = XLSX.utils.book_new();
      const rows = exportData.map((r) => ({
        'SC Number': r.sc_number || '',
        'Customer Name': r.customer_name || '',
        'Circle': r.circle_name || '',
        'Division': r.division_name || '',
        'Subdiv': r.subdiv_name || '',
        'ERO': r.ero_name || '',
        'Section': r.section_name || '',
        'Mandal': r.mandal_name || '',
        'Sub Station': r.sub_station_name || '',
        'Area': r.area_name || '',
        'Village': r.village_name || '',
        'Panchayath': r.panchayath_name || '',
        'Assembly Constituency': r.assembly_constituency || '',
        'Category': r.category || '',
        'EB Status': r.eb_status || '',
        'Phase': r.phase || '',
        'Contracted Load': r.contracted_load ?? '',
        'Connected Load': r.connected_load ?? '',
        'Load Unit': r.load_unit || '',
        'Meter No': r.meter_no || '',
        'Feeder': r.feeder_name || '',
        'Mobile': r.mobile_number || '',
        'Email': r.email || '',
        'Existing Load KW': r.existing_load_kw ?? '',
        'Existing Solar Load KW': r.existing_solar_load_kw ?? '',
        'Applied Solar Load KW': r.applied_solar_load_kw ?? '',
        'NP Registration No': r.np_registration_number || '',
        'EP Registration No': r.ep_registration_number || '',
        'Complaint Date': r.complaint_date || '',
        'National Portal Status': r.national_portal_status || '',
        'EPDCL Portal Status': r.epdcl_portal_status || '',
        'Bill Amount 1': r.bill_amount_1 ?? '',
        'Bill Month 1': r.bill_month_1 || '',
        'Bill Amount 2': r.bill_amount_2 ?? '',
        'Bill Month 2': r.bill_month_2 || '',
        'Bill Amount 3': r.bill_amount_3 ?? '',
        'Bill Month 3': r.bill_month_3 || '',
        'Call Status': r.call_status,
        'Remark': r.remark || '',
        'Follow-up Date': r.follow_up_date || '',
        'Last Called At': r.last_called_at || '',
        'Called By': r.called_by_name || '',
        'Surya Ghar Customer': r.is_existing_customer ? 'Yes' : 'No',
        'Imported At': r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : '',
        'Max Billed Units': r.max_billed_units ?? '',
        'Max Units Bill Amount': r.max_units_bill_amount ?? '',
        'Max Bill Amount': r.max_bill_amount ?? '',
        'Recent Units': r.recent_units ?? '',
        'Recent Bill Amount': r.recent_bill_amount ?? '',
        'Recent Bill Month': r.recent_bill_month || '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Prospects');

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `prospects_export_${dateStr}.xlsx`);
    } catch (err: any) {
      console.error('Export failed:', err);
      alert('Export failed: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  const callStatusOptions = Object.keys(CALL_STATUS_LABELS);
  const callStatusLabels = Object.fromEntries(callStatusOptions.map(k => [k, CALL_STATUS_LABELS[k]]));

  if (loading && prospects.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Prospects</h1>
          <p className="text-sm text-gray-600 mt-1">
            {total.toLocaleString('en-IN')} prospects — call, track outcomes, and identify existing Surya Ghar customers
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => { loadProspects(); loadStats(); loadFilterValues(); }}
            className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => navigate('/eb-customers/import-bills')}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors">
            <Receipt className="w-4 h-4" /> Import Bills
          </button>
          <button onClick={() => setShowExportModal(true)} disabled={exporting || total === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50" title="Export filtered prospects to Excel">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
          <button onClick={() => navigate('/prospects/import')}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors shadow-sm"
            title="Live PM Surya Ghar Sync from APEPDCL Portal">
            <Sun className="w-4 h-4" /> Sync APEPDCL
          </button>
          {canAccessWhatsApp && (
            <button
              onClick={handleOpenWhatsAppCampaign}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors shadow-sm"
              title="Launch WhatsApp Broadcast Campaign for PM Surya Ghar Prospects"
            >
              <MessageSquare className="w-4 h-4" /> WhatsApp Campaign
            </button>
          )}
          <button onClick={() => navigate('/prospects/import')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
            <Upload className="w-4 h-4" /> Import Excel
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={<Database className="w-5 h-5" />} label="Total Prospects" value={stats.total} color="blue" active={statFilter === null} onClick={() => { setStatFilter(null); setPage(1); }} />
        <StatCard icon={<Phone className="w-5 h-5" />} label="Called" value={stats.called} color="gray" active={statFilter === 'called'} onClick={() => handleStatClick('called')} />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Interested" value={stats.interested} color="green" active={statFilter === 'interested'} onClick={() => handleStatClick('interested')} />
        <StatCard icon={<Zap className="w-5 h-5" />} label="Live Connections" value={stats.live} color="teal" active={statFilter === 'live'} onClick={() => handleStatClick('live')} />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Follow-ups Due" value={stats.followUpsDue} color="orange" active={statFilter === 'followups'} onClick={() => handleStatClick('followups')} />
        <StatCard icon={<Flame className="w-5 h-5" />} label="High Usage (>500)" value={highUsageCount} color="orange" active={highUsageOnly} onClick={() => { setHighUsageOnly(!highUsageOnly); setPage(1); }} />
      </div>

      {/* Search and filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              placeholder="Search by SC number, name, meter no, village, registration no..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <label className="text-xs font-semibold text-gray-500 whitespace-nowrap hidden md:flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" /> Sort:
            </label>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as ProspectSortOption); setPage(1); }}
              className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
              title="Sort prospect records"
            >
              <option value="created_at_desc">🕒 Newest First</option>
              <option value="created_at_asc">🕒 Oldest First</option>
              <option value="units_desc">⚡ Billed Units: High to Low</option>
              <option value="units_asc">⚡ Billed Units: Low to High</option>
              <option value="load_desc">☀️ Applied Solar Load: High to Low</option>
              <option value="load_asc">☀️ Applied Solar Load: Low to High</option>
              <option value="name_asc">🔤 Customer Name (A → Z)</option>
              <option value="name_desc">🔤 Customer Name (Z → A)</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                setHideSuryaGhar(!hideSuryaGhar);
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-semibold transition-all ${
                hideSuryaGhar
                  ? 'bg-green-600 text-white border-green-700 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              title={hideSuryaGhar ? 'Surya Ghar (existing customers) are hidden. Click to show.' : 'Click to hide already existing customers (Surya Ghar)'}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>{hideSuryaGhar ? '✓ Surya Ghar Hidden' : 'Hide Surya Ghar'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setHideSolarInstalled(!hideSolarInstalled);
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-semibold transition-all ${
                hideSolarInstalled
                  ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              title={hideSolarInstalled ? 'Solar Installed prospects are hidden. Click to show.' : 'Click to hide prospects who already installed solar'}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>{hideSolarInstalled ? '✓ Solar Installed Hidden' : 'Hide Solar Installed'}</span>
            </button>
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors bg-red-50 border-red-300 text-red-700 hover:bg-red-100 flex-shrink-0">
              <RotateCcw className="w-4 h-4" /> Reset Filters
            </button>
          )}
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors flex-shrink-0 ${
              showFilters || hasActiveFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}>
            <Filter className="w-4 h-4" /> Filters
            {activeFilterCount > 0 && <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">{activeFilterCount}</span>}
          </button>
        </div>

        {/* Active Filter Chips */}
        {(areaCodeSelections.length > 0 || hideSuryaGhar || hideSolarInstalled) && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 px-0.5">
            <span className="text-xs font-semibold text-gray-700">Active Exclusions & Codes:</span>
            {hideSuryaGhar && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800 rounded-full border border-green-300 shadow-sm">
                <Link2 className="w-3 h-3" />
                Surya Ghar Hidden
                <button
                  type="button"
                  onClick={() => {
                    setHideSuryaGhar(false);
                    setPage(1);
                  }}
                  className="hover:text-green-950 ml-1 p-0.5"
                  title="Show Surya Ghar customers"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {hideSolarInstalled && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full border border-amber-300 shadow-sm">
                <Sun className="w-3 h-3" />
                Solar Installed Hidden
                <button
                  type="button"
                  onClick={() => {
                    setHideSolarInstalled(false);
                    setPage(1);
                  }}
                  className="hover:text-amber-950 ml-1 p-0.5"
                  title="Show Solar Installed prospects"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {areaCodeSelections.map((code) => (
              <span
                key={code}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono font-bold bg-purple-100 text-purple-800 rounded-full border border-purple-300 shadow-sm"
              >
                Area {code}
                <button
                  type="button"
                  onClick={() => {
                    setAreaCodeSelections((prev) => prev.filter((c) => c !== code));
                    setPage(1);
                  }}
                  className="hover:text-purple-950 ml-1 p-0.5"
                  title="Remove this code filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => {
                setHideSuryaGhar(false);
                setHideSolarInstalled(false);
                setAreaCodeSelections([]);
                setPage(1);
              }}
              className="text-xs text-red-600 hover:text-red-700 font-medium ml-1"
            >
              Clear exclusions & codes
            </button>
          </div>
        )}

        {showFilters && (
          <div className="space-y-4 pt-3 border-t border-gray-100">
            {/* Lead Exclusions Filter Card */}
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
              <p className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-600" /> Exclude Existing Customers & Solar Installations
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                  hideSuryaGhar ? 'bg-green-50 border-green-300 text-green-950 ring-1 ring-green-300' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={hideSuryaGhar}
                    onChange={(e) => {
                      setHideSuryaGhar(e.target.checked);
                      setPage(1);
                    }}
                    className="mt-0.5 rounded border-gray-300 text-green-600 focus:ring-green-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-green-600" /> Hide Existing Customers ('Surya Ghar' label)
                    </span>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Hides prospects who are already existing customers in Tejo Bharat CRM.
                    </p>
                  </div>
                </label>

                <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                  hideSolarInstalled ? 'bg-amber-50 border-amber-300 text-amber-950 ring-1 ring-amber-300' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={hideSolarInstalled}
                    onChange={(e) => {
                      setHideSolarInstalled(e.target.checked);
                      setPage(1);
                    }}
                    className="mt-0.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-600" /> Hide 'Solar Installed' / EP Registered
                    </span>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Hides prospects who already have solar installed or EP registration numbers on the portal.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Original prospect filters: Circle / Division / Subdiv */}
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">Location (Circle / Division / Subdiv)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <MultiSelectDropdown label="Circle" options={filterValues.circles} selected={circleSelections} onChange={(v) => { setCircleSelections(v); setPage(1); }} />
                <MultiSelectDropdown label="Division" options={filterValues.divisions} selected={divisionSelections} onChange={(v) => { setDivisionSelections(v); setPage(1); }} />
                <MultiSelectDropdown label="Subdiv" options={filterValues.subdivs} selected={subdivSelections} onChange={(v) => { setSubdivSelections(v); setPage(1); }} />
              </div>
            </div>

            {/* EB-enriched filters */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-700 mb-2">EB Customer Info (Section Office / ERO / Mandal / Area)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <MultiSelectDropdown label="ERO" options={filterValues.eros} selected={eroSelections} onChange={(v) => { setEroSelections(v); setPage(1); }} />
                <MultiSelectDropdown label="Section" options={filterValues.sections} selected={sectionSelections} onChange={(v) => { setSectionSelections(v); setPage(1); }} />
                <MultiSelectDropdown label="Sub Station" options={filterValues.subStations} selected={subStationSelections} onChange={(v) => { setSubStationSelections(v); setPage(1); }} />
                <MultiSelectDropdown label="Status" options={filterValues.statuses} selected={statusSelections} onChange={(v) => { setStatusSelections(v); setPage(1); }} />
                <MultiSelectDropdown label="Call Status" options={callStatusOptions} selected={callStatusSelections} onChange={(v) => { setCallStatusSelections(v); setPage(1); }} optionLabels={callStatusLabels} />
                <MultiSelectDropdown label="Category" options={filterValues.categories} selected={categorySelections} onChange={(v) => { setCategorySelections(v); setPage(1); }} />
                <MultiSelectDropdown label="Mandal" options={filterValues.mandals} selected={mandalSelections} onChange={(v) => { setMandalSelections(v); setPage(1); }} />
                <AreaCodeFilter
                  label="Area"
                  selected={areaCodeSelections}
                  onChange={(v) => {
                    setAreaCodeSelections(v);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            {/* Bill range filters */}
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" /> Filter by Bill Amount / Units (from EB billing history)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <OperatorFilterInput label="Bill Amount" icon={<IndianRupee className="w-3.5 h-3.5 text-gray-400" />}
                  operator={billAmountOp} onOperatorChange={(v) => setBillAmountOp(v)}
                  value={billAmountVal} onValueChange={setBillAmountVal}
                  maxValue={billAmountMaxVal} onMaxValueChange={setBillAmountMaxVal}
                  showBetween={billAmountOp === 'between'} placeholder="Enter amount" />
                <OperatorFilterInput label="Billed Units" icon={<Gauge className="w-3.5 h-3.5 text-gray-400" />}
                  operator={billUnitsOp} onOperatorChange={(v) => setBillUnitsOp(v)}
                  value={billUnitsVal} onValueChange={setBillUnitsVal}
                  maxValue={billUnitsMaxVal} onMaxValueChange={setBillUnitsMaxVal}
                  showBetween={billUnitsOp === 'between'} placeholder="Enter units" />
              </div>
              <div className="flex items-center gap-3 mt-3">
                <button onClick={applyBillFilters}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  <Filter className="w-4 h-4" /> Apply Bill Filters
                </button>
                {hasPendingBillFilter && (
                  <span className="text-xs text-orange-600 font-medium">Changes not yet applied</span>
                )}
                {(appliedBillAmount || appliedBillUnits) && (
                  <button onClick={() => { setAppliedBillAmount(null); setAppliedBillUnits(null); setBillAmountVal(''); setBillAmountMaxVal(''); setBillUnitsVal(''); setBillUnitsMaxVal(''); setPage(1); }}
                    className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium">
                    <RotateCcw className="w-3.5 h-3.5" /> Clear bill filters
                  </button>
                )}
              </div>
            </div>

            {/* Import batch filter */}
            {importBatches.length > 0 && (
              <div className="pt-3 border-t border-gray-100">
                <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Filter by Import Batch
                </label>
                <select
                  value={importBatchId || ''}
                  onChange={(e) => { setImportBatchId(e.target.value || null); setPage(1); }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All batches</option>
                  {importBatches.map((batch) => {
                    const date = new Date(batch.latest_created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                    return (
                      <option key={batch.batch_id} value={batch.batch_id}>
                        {batch.batch_label} — {batch.row_count} rows ({date})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Date range filter */}
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-1.5">
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Filter by Import Date
                </label>
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setDateFrom(today);
                      setDateTo(today);
                      setPage(1);
                    }}
                    className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                      dateFrom && dateFrom === dateTo && dateFrom === new Date().toISOString().split('T')[0]
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const y = new Date();
                      y.setDate(y.getDate() - 1);
                      const yesterday = y.toISOString().split('T')[0];
                      setDateFrom(yesterday);
                      setDateTo(yesterday);
                      setPage(1);
                    }}
                    className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    Yesterday
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const past = new Date();
                      past.setDate(past.getDate() - 7);
                      setDateFrom(past.toISOString().split('T')[0]);
                      setDateTo(new Date().toISOString().split('T')[0]);
                      setPage(1);
                    }}
                    className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    Past 7 Days
                  </button>
                  {(dateFrom || dateTo) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDateFrom('');
                        setDateTo('');
                        setPage(1);
                      }}
                      className="px-2 py-0.5 text-xs font-medium rounded text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Imported From</label>
                  <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Imported To</label>
                  <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium">
                <RotateCcw className="w-4 h-4" /> Reset all filters
              </button>
            )}
          </div>
        )}
      </div>

      <div className="relative">
      {loading && prospects.length > 0 && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-600">
          Showing <strong>{((page - 1) * pageSize + 1).toLocaleString('en-IN')}–{Math.min(page * pageSize, total).toLocaleString('en-IN')}</strong> of <strong>{total.toLocaleString('en-IN')}</strong> prospects
          {totalPages > 1 && <span className="text-xs text-gray-400 ml-2 font-medium">(Page {page} of {totalPages})</span>}
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-gray-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as ProspectSortOption); setPage(1); }}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="created_at_desc">Newest First</option>
              <option value="created_at_asc">Oldest First</option>
              <option value="units_desc">⚡ Billed Units: High to Low</option>
              <option value="units_asc">⚡ Billed Units: Low to High</option>
              <option value="load_desc">Load: High to Low</option>
              <option value="load_asc">Load: Low to High</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Rows per page:</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {PAGE_SIZE_OPTIONS.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
            </select>
          </div>
        </div>
      </div>

      {prospects.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No prospects found</p>
          <p className="text-sm text-gray-400 mt-1">{total === 0 ? 'Import an Excel file to get started' : 'Try adjusting your filters or search term'}</p>
          {total === 0 && (
            <button onClick={() => navigate('/prospects/import')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
              <Upload className="w-4 h-4" /> Import Excel
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {displayedProspects.map((prospect) => (
              <div key={prospect.id} className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedProspect(prospect)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      {prospect.sc_number && (
                        <span className="text-sm font-mono font-semibold text-gray-900">
                          {prospect.sc_number}
                        </span>
                      )}
                      {(() => {
                        const code = extractAreaCode(prospect.sc_number);
                        if (!code) return null;
                        const isSelected = areaCodeSelections.includes(code);
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAreaCodeSelections((prev) =>
                                prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
                              );
                              setPage(1);
                            }}
                            title={`Area Code: ${code}. Click to ${isSelected ? 'remove filter' : 'filter by area ' + code}`}
                            className={`px-1.5 py-0.5 text-xs font-mono font-semibold rounded border transition-colors ${
                              isSelected
                                ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
                                : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:border-purple-300'
                            }`}
                          >
                            Area: {code}
                          </button>
                        );
                      })()}
                      {prospect.customer_name && <span className="text-sm font-medium text-gray-700">{prospect.customer_name}</span>}
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${CALL_STATUS_COLORS[prospect.call_status] || 'bg-gray-100 text-gray-600'}`}>
                        {CALL_STATUS_LABELS[prospect.call_status] || prospect.call_status}
                      </span>
                      {prospect.eb_status === 'LIVE' && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-200">LIVE</span>}
                      {prospect.is_existing_customer && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                          <Link2 className="w-3 h-3" /> Surya Ghar
                        </span>
                      )}
                      {prospect.follow_up_date && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{new Date(prospect.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                      {(() => {
                        if (!prospect.created_at) return null;
                        const isToday = new Date(prospect.created_at).toDateString() === new Date().toDateString();
                        if (isToday) {
                          return (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1">
                              ✨ New Today
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      {prospect.circle_name && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{prospect.circle_name}{prospect.division_name && ` / ${prospect.division_name}`}{prospect.subdiv_name && ` / ${prospect.subdiv_name}`}</span>
                      )}
                      {prospect.ero_name && !prospect.circle_name && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{prospect.ero_name}{prospect.section_name && ` / ${prospect.section_name}`}</span>
                      )}
                      {prospect.village_name && <span className="text-gray-600">{prospect.village_name}</span>}
                      {prospect.sub_station_name && (<span className="flex items-center gap-1"><Zap className="w-3 h-3" />{prospect.sub_station_name}</span>)}
                      {prospect.applied_solar_load_kw != null && (<span className="flex items-center gap-1"><Zap className="w-3 h-3" />{prospect.applied_solar_load_kw} KW</span>)}
                      {prospect.last_called_at && (<span className="flex items-center gap-1"><Clock className="w-3 h-3" />Called {new Date(prospect.last_called_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>)}
                      {prospect.created_at && (
                        <span className="flex items-center gap-1 text-gray-400" title={`First added on ${new Date(prospect.created_at).toLocaleString('en-IN')}`}>
                          <Calendar className="w-3 h-3" />Added {new Date(prospect.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    {prospect.remark && <p className="text-xs text-gray-600 mt-1.5 truncate">"{prospect.remark}"</p>}
                    {(() => {
                      if (!prospect.sc_number) return null;
                      const bs = billSummaries.get(prospect.sc_number);
                      if (!bs || (bs.max_billed_units == null && bs.max_bill_amount == null && bs.recent_units == null && bs.recent_bill_amount == null)) return null;
                      return (
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {bs.high_usage && (
                            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full ring-1 ring-red-200" title="Latest month billed units exceed 500 — high usage prospect">
                              <Flame className="w-3 h-3 text-red-500" />
                              High Usage
                            </span>
                          )}
                          {bs.max_billed_units != null && (
                            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full" title="Maximum billed units across all months">
                              <Gauge className="w-3 h-3 text-gray-500" />
                              {Number(bs.max_billed_units).toLocaleString('en-IN')}
                              <span className="text-gray-400 font-normal ml-0.5">max units</span>
                            </span>
                          )}
                          {bs.max_units_bill_amount != null && (
                            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full" title="Bill amount for the month with max units">
                              <IndianRupee className="w-3 h-3 text-gray-500" />
                              {Number(bs.max_units_bill_amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                              <span className="text-gray-400 font-normal ml-0.5">max units bill</span>
                            </span>
                          )}
                          {bs.recent_units != null && (
                            <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${bs.recent_units > 500 ? 'text-red-700 bg-red-50' : 'text-teal-700 bg-teal-50'}`} title={`Latest month (${bs.recent_bill_month || '—'}) billed units`}>
                              <Gauge className={`w-3 h-3 ${bs.recent_units > 500 ? 'text-red-500' : 'text-teal-500'}`} />
                              {Number(bs.recent_units).toLocaleString('en-IN')}
                              <span className={`font-normal ml-0.5 ${bs.recent_units > 500 ? 'text-red-400' : 'text-teal-500'}`}>{bs.recent_bill_month || 'Latest'} units</span>
                            </span>
                          )}
                          {bs.recent_bill_amount != null && (
                            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full" title={`Latest month (${bs.recent_bill_month || '—'}) bill amount`}>
                              <IndianRupee className="w-3 h-3 text-amber-500" />
                              {Number(bs.recent_bill_amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                              <span className="text-amber-500 font-normal ml-0.5">{bs.recent_bill_month || 'Latest'} bill</span>
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {prospect.sc_number && (
                      <button onClick={() => copyToClipboard(prospect.sc_number!, `${prospect.id}-sc`)}
                        className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors" title="Copy SC Number">
                        {copiedField === `${prospect.id}-sc` ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              totalItems={total}
              pageSize={pageSize}
              theme="blue"
            />
          )}
        </>
      )}
      </div>

      {showExportModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowExportModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Export to Excel</h3>
              <button onClick={() => setShowExportModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Export <strong>{total.toLocaleString('en-IN')}</strong> prospects with current filters applied. Bill summary data from EB billing history will be included.</p>
            <div className="space-y-3 mb-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="exportType" checked={exportType === 'full'} onChange={() => setExportType('full')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-gray-700">Full Excel export (all columns + bill summaries)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="exportType" checked={exportType === 'scOnly'} onChange={() => setExportType('scOnly')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-gray-700">SC Numbers only (CSV)</span>
                </label>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="exportLimit" checked={exportLimit === 'all'} onChange={() => setExportLimit('all')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-gray-700">Export all ({total.toLocaleString('en-IN')})</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="exportLimit" checked={exportLimit !== 'all'} onChange={() => setExportLimit(Math.min(total, 500))}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-gray-700">Export first</span>
                  <input type="number" min="1" max={total} value={exportLimit === 'all' ? '' : exportLimit}
                    onChange={(e) => setExportLimit(Math.min(total, Math.max(1, Number(e.target.value) || 1)))}
                    disabled={exportLimit === 'all'}
                    className="w-24 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <span className="text-sm text-gray-500">rows</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleExport} disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {exporting ? 'Exporting...' : 'Export Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedProspect && (
        <ProspectDetailModal prospect={selectedProspect} onClose={() => setSelectedProspect(null)} onUpdate={handleModalUpdate} />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, active, onClick }: { icon: React.ReactNode; label: string; value: number; color: string; active?: boolean; onClick?: () => void }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600', gray: 'bg-gray-50 text-gray-600',
    green: 'bg-green-50 text-green-600', teal: 'bg-teal-50 text-teal-600',
    orange: 'bg-orange-50 text-orange-600',
  };
  return (
    <button onClick={onClick}
      className={`bg-white rounded-xl shadow-sm p-3 flex items-center gap-3 text-left transition-all w-full ${
        active ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-md hover:-translate-y-0.5'
      }`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 truncate">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value.toLocaleString('en-IN')}</p>
      </div>
    </button>
  );
}

function OperatorFilterInput({ label, icon, operator, onOperatorChange, value, onValueChange, maxValue, onMaxValueChange, showBetween, placeholder }: {
  label: string; icon: React.ReactNode; operator: FilterOperator; onOperatorChange: (v: FilterOperator) => void;
  value: string; onValueChange: (v: string) => void;
  maxValue: string; onMaxValueChange: (v: string) => void;
  showBetween: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="flex gap-2">
        <select value={operator} onChange={(e) => onOperatorChange(e.target.value as FilterOperator)}
          className="rounded-lg border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0">
          {(Object.keys(OPERATOR_LABELS) as FilterOperator[]).map((op) => (<option key={op} value={op}>{OPERATOR_LABELS[op]}</option>))}
        </select>
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2">{icon}</span>
          <input type="number" min="0" value={value} onChange={(e) => onValueChange(e.target.value)}
            placeholder={showBetween ? 'Min value' : placeholder}
            className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {showBetween && (
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2">{icon}</span>
            <input type="number" min="0" value={maxValue} onChange={(e) => onMaxValueChange(e.target.value)}
              placeholder="Max value"
              className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        )}
      </div>
    </div>
  );
}
