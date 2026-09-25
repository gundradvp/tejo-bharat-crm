import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Copy, Check, Search, Upload, Users, Filter, MapPin, Zap, Clock, Loader2, TrendingUp, Calendar, Database, ChevronLeft, ChevronRight, RefreshCw, RotateCcw, Receipt, IndianRupee, Gauge, Download, Link2, UserSearch, X, Sun as SunIcon, FileStack, Flame, UserCircle, Building2, ArrowUpDown, MessageSquare } from 'lucide-react';
import * as XLSX from 'xlsx';
import Pagination from '../Common/Pagination';
import { useAuth } from '../../contexts/AuthContext';
import { canAccessWhatsAppHub } from '../../lib/whatsappApi';
import { type Profile } from '../../lib/supabase';
import { JSP_LOCATION_HIERARCHY } from '../../lib/jspLocationData';
import {
  EBCustomer,
  CALL_STATUS_LABELS,
  CALL_STATUS_COLORS,
  fetchEBCustomers,
  fetchEBFilterValues,
  fetchEBCustomerStats,
  fetchEBBillSummaries,
  fetchEBCustomersForExport,
  fetchEBSCOnlyForExport,
  fetchExistingSuryaGharSCNumbers,
  fetchProspectSCNumbers,
  fetchEBImportBatches,
  updateEBSolarFlag,
  EBBillSummary,
  EBFilterOptions,
  EBSortOption,
  EBImportBatch,
  FilterOperator,
  JSPMemberLink,
  fetchJSPMembersForEBCustomers,
  fetchJSPVolunteers,
  fetchMobilesForVolunteer,
  extractAreaCode,
} from '../../lib/ebApi';
import EBCustomerDetailModal from './EBCustomerDetailModal';
import MultiSelectDropdown from '../Common/MultiSelectDropdown';
import AreaCodeFilter from '../Prospects/AreaCodeFilter';

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  gte: '\u2265 (min)',
  gt: '> (greater than)',
  lte: '\u2264 (max)',
  lt: '< (less than)',
  eq: '= (equals)',
  between: 'between',
};

const PAGE_SIZE_OPTIONS = [50, 100, 200];

const STORAGE_KEY = 'eb_customer_filters';

interface SavedFilters {
  search: string;
  areaCodes?: string[];
  eros: string[];
  sections: string[];
  statuses: string[];
  callStatuses: string[];
  categories: string[];
  mandals: string[];
  subStations: string[];
  areas: string[];
  excludeSolar: boolean;
  importBatchId: string | null;
  dateFrom: string;
  dateTo: string;
  billAmountOp: FilterOperator;
  billAmountVal: string;
  billAmountMaxVal: string;
  billUnitsOp: FilterOperator;
  billUnitsVal: string;
  billUnitsMaxVal: string;
  sortBy?: EBSortOption;
  pageSize: number;
}

function loadSavedFilters(): Partial<SavedFilters> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

export default function EBCustomerList() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.roles?.includes('admin') || profile?.role === 'admin';
  const canAccessWhatsApp = canAccessWhatsAppHub(profile as Profile | null);
  const saved = loadSavedFilters();

  const [searchTerm, setSearchTerm] = useState(saved.search || '');
  const [debouncedSearch, setDebouncedSearch] = useState(saved.search || '');
  const [areaCodeSelections, setAreaCodeSelections] = useState<string[]>(saved.areaCodes || []);
  const [eroSelections, setEroSelections] = useState<string[]>(saved.eros || []);
  const [sectionSelections, setSectionSelections] = useState<string[]>(saved.sections || []);
  const [statusSelections, setStatusSelections] = useState<string[]>(saved.statuses || []);
  const [callStatusSelections, setCallStatusSelections] = useState<string[]>(saved.callStatuses || []);
  const [categorySelections, setCategorySelections] = useState<string[]>(saved.categories || []);
  const [mandalSelections, setMandalSelections] = useState<string[]>(saved.mandals || []);
  const [subStationSelections, setSubStationSelections] = useState<string[]>(saved.subStations || []);
  const [areaSelections, setAreaSelections] = useState<string[]>(saved.areas || []);
  const [excludeSolar, setExcludeSolar] = useState<boolean>(saved.excludeSolar ?? true);
  const [importBatchId, setImportBatchId] = useState<string | null>(saved.importBatchId || null);
  const [dateFrom, setDateFrom] = useState(saved.dateFrom || '');
  const [dateTo, setDateTo] = useState(saved.dateTo || '');
  const [importBatches, setImportBatches] = useState<EBImportBatch[]>([]);

  // Bill filter input state (what the user types)
  const [billAmountOp, setBillAmountOp] = useState<FilterOperator>(saved.billAmountOp || 'gte');
  const [billAmountVal, setBillAmountVal] = useState(saved.billAmountVal || '');
  const [billAmountMaxVal, setBillAmountMaxVal] = useState(saved.billAmountMaxVal || '');
  const [billUnitsOp, setBillUnitsOp] = useState<FilterOperator>(saved.billUnitsOp || 'gte');
  const [billUnitsVal, setBillUnitsVal] = useState(saved.billUnitsVal || '');
  const [billUnitsMaxVal, setBillUnitsMaxVal] = useState(saved.billUnitsMaxVal || '');

  // Applied bill filter state (what actually gets queried)
  const [appliedBillAmount, setAppliedBillAmount] = useState<{ op: FilterOperator; val: string; maxVal: string } | null>(null);
  const [appliedBillUnits, setAppliedBillUnits] = useState<{ op: FilterOperator; val: string; maxVal: string } | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [customers, setCustomers] = useState<EBCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<EBCustomer | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(saved.pageSize || 50);
  const [sortBy, setSortBy] = useState<EBSortOption>(saved.sortBy || 'created_at_desc');
  const [statFilter, setStatFilter] = useState<string | null>(null);
  const [highUsageOnly, setHighUsageOnly] = useState(false);
  const [stats, setStats] = useState({ total: 0, called: 0, interested: 0, followUpsDue: 0, live: 0 });

  const [filterValues, setFilterValues] = useState<{
    eros: string[]; sections: string[]; statuses: string[];
    categories: string[]; mandals: string[]; subStations: string[]; areas: string[];
  }>({ eros: [], sections: [], statuses: [], categories: [], mandals: [], subStations: [], areas: [] });
  const [billSummaries, setBillSummaries] = useState<Map<string, EBBillSummary>>(new Map());
  const [suryaGharSCs, setSuryaGharSCs] = useState<Set<string>>(new Set());
  const [prospectSCs, setProspectSCs] = useState<Set<string>>(new Set());
  const [jspOnlyFilter, setJspOnlyFilter] = useState(false);
  const [jspMemberMap, setJspMemberMap] = useState<Record<string, JSPMemberLink>>({});
  const [volunteerFilter, setVolunteerFilter] = useState<string>('');
  const [volunteerAssembly, setVolunteerAssembly] = useState<string>('Pithapuram');
  const [volunteersList, setVolunteersList] = useState<string[]>([]);

  const AVAILABLE_ASSEMBLIES = useMemo(() => {
    return Array.from(new Set(JSP_LOCATION_HIERARCHY.map((n) => n.assembly))).filter(Boolean).sort();
  }, []);

  const handleOpenWhatsAppCampaign = () => {
    const params = new URLSearchParams({
      tab: 'campaigns',
      source: 'eb_customers',
      openModal: 'true',
    });
    if (searchTerm) params.set('search', searchTerm);
    if (categorySelections.length > 0) params.set('category', categorySelections[0]);
    if (mandalSelections.length > 0) params.set('mandal', mandalSelections[0]);
    if (eroSelections.length > 0) params.set('ero', eroSelections[0]);
    if (sectionSelections.length > 0) params.set('section', sectionSelections[0]);
    if (areaCodeSelections.length > 0) params.set('areaCodes', areaCodeSelections.join(','));
    else if (areaSelections.length > 0) params.set('area', areaSelections[0]);
    if (volunteerAssembly) params.set('constituency', volunteerAssembly);
    if (callStatusSelections.length > 0) params.set('callStatus', callStatusSelections[0]);
    if (excludeSolar) params.set('hideSolar', 'true');
    if (appliedBillUnits?.val) {
      params.set('unitsOp', appliedBillUnits.op);
      params.set('unitsVal', appliedBillUnits.val);
      if (appliedBillUnits.maxVal) params.set('unitsMax', appliedBillUnits.maxVal);
    }
    navigate(`/whatsapp?${params.toString()}`);
  };

  const [exporting, setExporting] = useState(false);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLimit, setExportLimit] = useState<number | 'all'>('all');
  const [exportType, setExportType] = useState<'full' | 'scOnly'>('full');

  // Persist filters to localStorage
  useEffect(() => {
    const data: SavedFilters = {
      search: searchTerm,
      areaCodes: areaCodeSelections,
      eros: eroSelections,
      sections: sectionSelections,
      statuses: statusSelections,
      callStatuses: callStatusSelections,
      categories: categorySelections,
      mandals: mandalSelections,
      subStations: subStationSelections,
      areas: areaSelections,
      excludeSolar,
      importBatchId,
      dateFrom,
      dateTo,
      billAmountOp, billAmountVal, billAmountMaxVal,
      billUnitsOp, billUnitsVal, billUnitsMaxVal,
      sortBy,
      pageSize,
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
  }, [searchTerm, areaCodeSelections, eroSelections, sectionSelections, statusSelections, callStatusSelections, categorySelections, mandalSelections, subStationSelections, areaSelections, excludeSolar, importBatchId, dateFrom, dateTo, billAmountOp, billAmountVal, billAmountMaxVal, billUnitsOp, billUnitsVal, billUnitsMaxVal, sortBy, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadFilterValues = useCallback(async () => {
    setLoadingFilters(true);
    try {
      const values = await fetchEBFilterValues({
        eros: eroSelections,
        sections: sectionSelections,
      });
      setFilterValues(values);
      setFiltersLoaded(true);
      if (eroSelections.length > 0 && sectionSelections.length > 0 && values.sections.length > 0) {
        const validSections = sectionSelections.filter((s) => values.sections.includes(s));
        if (validSections.length !== sectionSelections.length) {
          setSectionSelections(validSections);
        }
      }
    } catch (err) { console.error('Error loading filter values:', err); }
    finally { setLoadingFilters(false); }
  }, [eroSelections, sectionSelections]);

  const loadStats = useCallback(async () => {
    try {
      const s = await fetchEBCustomerStats();
      setStats(s);
    } catch (err) { console.error('Error loading stats:', err); }
  }, []);

  const buildBillFilters = useCallback((): EBFilterOptions => {
    const filters: EBFilterOptions = {};
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

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const billFilters = buildBillFilters();
      let jspMobilesFilter: string[] | undefined = undefined;

      // Only query JSP member mobiles if a volunteer is selected (or an assembly)
      // to avoid generating an oversized 78KB URL that causes HTTP 414 URI Too Long.
      if (volunteerFilter || (jspOnlyFilter && volunteerAssembly)) {
        jspMobilesFilter = await fetchMobilesForVolunteer(volunteerFilter, volunteerAssembly);
      }

      const filters: EBFilterOptions = {
        search: debouncedSearch || undefined,
        areaCodes: areaCodeSelections,
        eros: eroSelections,
        sections: sectionSelections,
        statuses: statusSelections,
        callStatuses: callStatusSelections,
        categories: categorySelections,
        mandals: mandalSelections,
        subStations: subStationSelections,
        areas: areaCodeSelections,
        excludeSolar,
        importBatchId,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        jspMobiles: jspMobilesFilter,
        sortBy,
        ...billFilters,
        page, pageSize,
      };

      if (statFilter === 'interested') filters.callStatuses = ['interested'];
      if (statFilter === 'live') filters.statuses = ['LIVE'];
      if (statFilter === 'followups') filters.followUpDue = true;
      if (statFilter === 'called') filters.calledOnly = true;

      const result = await fetchEBCustomers(filters);
      setCustomers(result.customers);
      setTotal(result.total);
      setLoading(false);

      if (result.customers.length > 0) {
        const customerIds = result.customers.map((c) => c.id);
        const scNumbers = result.customers.map((c) => c.sc_number);
        const mobiles = result.customers.map((c) => c.mobile_number || c.phone).filter(Boolean) as string[];
        fetchEBBillSummaries(customerIds).then(setBillSummaries).catch((err) => console.error('Error loading bill summaries:', err));
        fetchExistingSuryaGharSCNumbers(scNumbers).then(setSuryaGharSCs).catch((err) => console.error('Error loading Surya Ghar matches:', err));
        fetchProspectSCNumbers(scNumbers).then(setProspectSCs).catch((err) => console.error('Error loading prospect matches:', err));
        if (isAdmin && mobiles.length > 0) {
          fetchJSPMembersForEBCustomers(mobiles).then(setJspMemberMap).catch((err) => console.error('Error loading JSP member links:', err));
        }
      } else {
        setBillSummaries(new Map());
        setSuryaGharSCs(new Set());
        setProspectSCs(new Set());
        setJspMemberMap({});
      }
    } catch (err) {
      console.error('Error loading EB customers:', err);
      setCustomers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, areaCodeSelections, eroSelections, sectionSelections, statusSelections, callStatusSelections, categorySelections, mandalSelections, subStationSelections, areaSelections, excludeSolar, importBatchId, dateFrom, dateTo, buildBillFilters, page, pageSize, statFilter, jspOnlyFilter, volunteerFilter, volunteerAssembly, sortBy]);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadFilterValues(); }, [loadFilterValues]);
  useEffect(() => {
    fetchEBImportBatches().then(setImportBatches).catch(() => {});
  }, []);

  useEffect(() => {
    if (jspOnlyFilter) {
      fetchJSPVolunteers(volunteerAssembly).then(setVolunteersList).catch(() => {});
    } else {
      setVolunteerFilter('');
    }
  }, [jspOnlyFilter, volunteerAssembly]);

  const volunteerEbCustomerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    customers.forEach((c) => {
      const cleanMobile = (c.mobile_number || c.phone || '').replace(/\D/g, '').slice(-10);
      const jspMember = cleanMobile ? jspMemberMap[cleanMobile] : undefined;
      if (jspMember && jspMember.volunteername) {
        const vName = jspMember.volunteername.trim();
        counts[vName] = (counts[vName] || 0) + 1;
      }
    });
    return counts;
  }, [customers, jspMemberMap]);

  const allFilterValuesEmpty =
    filterValues.eros.length === 0 && filterValues.sections.length === 0 &&
    filterValues.statuses.length === 0 && filterValues.categories.length === 0 &&
    filterValues.mandals.length === 0 && filterValues.subStations.length === 0 &&
    filterValues.areas.length === 0;

  const displayedCustomers = useMemo(() => {
    let result = customers.filter((c) => {
      if (excludeSolar) {
        if (c.solar_already_installed) return false;
        if (c.call_status === 'solar_already_installed') return false;
        if (suryaGharSCs.has(c.sc_number)) return false;
      }
      const cleanMobile = (c.mobile_number || c.phone || '').replace(/\D/g, '').slice(-10);
      const jspMember = cleanMobile ? jspMemberMap[cleanMobile] : undefined;
      if (highUsageOnly) {
        const bs = billSummaries.get(c.id);
        if (!bs?.high_usage) return false;
      }
      if (volunteerFilter) {
        if (!jspMember || jspMember.volunteername !== volunteerFilter) return false;
      } else if (jspOnlyFilter && volunteerAssembly) {
        if (!jspMember) return false;
      }
      return true;
    });

    if (sortBy === 'units_desc') {
      result.sort((a, b) => {
        const aUnits = billSummaries.get(a.id)?.max_billed_units ?? (billSummaries.get(a.id)?.recent_units ?? 0);
        const bUnits = billSummaries.get(b.id)?.max_billed_units ?? (billSummaries.get(b.id)?.recent_units ?? 0);
        return bUnits - aUnits;
      });
    } else if (sortBy === 'units_asc') {
      result.sort((a, b) => {
        const aUnits = billSummaries.get(a.id)?.max_billed_units ?? (billSummaries.get(a.id)?.recent_units ?? 0);
        const bUnits = billSummaries.get(b.id)?.max_billed_units ?? (billSummaries.get(b.id)?.recent_units ?? 0);
        return aUnits - bUnits;
      });
    } else if (sortBy === 'load_desc') {
      result.sort((a, b) => (b.contracted_load ?? 0) - (a.contracted_load ?? 0));
    } else if (sortBy === 'load_asc') {
      result.sort((a, b) => (a.contracted_load ?? 0) - (b.contracted_load ?? 0));
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
  }, [customers, highUsageOnly, billSummaries, jspOnlyFilter, jspMemberMap, volunteerFilter, volunteerAssembly, excludeSolar, suryaGharSCs, sortBy]);

  const totalPages = Math.ceil(total / pageSize);
  const highUsageCount = Array.from(billSummaries.values()).filter((bs) => bs.high_usage).length;

  const hasActiveFilters =
    areaCodeSelections.length > 0 ||
    eroSelections.length > 0 || sectionSelections.length > 0 ||
    statusSelections.length > 0 || callStatusSelections.length > 0 ||
    categorySelections.length > 0 || mandalSelections.length > 0 ||
    subStationSelections.length > 0 ||
    excludeSolar || !!importBatchId || !!dateFrom || !!dateTo ||
    !!appliedBillAmount || !!appliedBillUnits || jspOnlyFilter || !!volunteerFilter;

  const activeFilterCount =
    (areaCodeSelections.length > 0 ? 1 : 0) +
    [eroSelections, sectionSelections, statusSelections, callStatusSelections, categorySelections, mandalSelections, subStationSelections]
      .filter((a) => a.length > 0).length +
    [appliedBillAmount, appliedBillUnits].filter(Boolean).length +
    (excludeSolar ? 1 : 0) + (importBatchId ? 1 : 0) + (dateFrom || dateTo ? 1 : 0) + (jspOnlyFilter ? 1 : 0) + (volunteerFilter ? 1 : 0);

  const hasPendingBillFilter =
    (!!billAmountVal !== !!appliedBillAmount ||
     (appliedBillAmount && (billAmountOp !== appliedBillAmount.op || billAmountVal !== appliedBillAmount.val || billAmountMaxVal !== appliedBillAmount.maxVal)) ||
     !!billUnitsVal !== !!appliedBillUnits ||
     (appliedBillUnits && (billUnitsOp !== appliedBillUnits.op || billUnitsVal !== appliedBillUnits.val || billUnitsMaxVal !== appliedBillUnits.maxVal)));

  const clearFilters = () => {
    setAreaCodeSelections([]);
    setEroSelections([]); setSectionSelections([]); setStatusSelections([]);
    setCallStatusSelections([]); setCategorySelections([]); setMandalSelections([]);
    setSubStationSelections([]); setAreaSelections([]);
    setExcludeSolar(true); setImportBatchId(null);
    setDateFrom(''); setDateTo('');
    setBillAmountOp('gte'); setBillAmountVal(''); setBillAmountMaxVal('');
    setBillUnitsOp('gte'); setBillUnitsVal(''); setBillUnitsMaxVal('');
    setAppliedBillAmount(null); setAppliedBillUnits(null);
    setJspOnlyFilter(false); setVolunteerFilter('');
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

  const handleModalUpdate = () => { loadCustomers(); loadStats(); };

  const handleExport = async () => {
    setShowExportModal(false);
    setExporting(true);
    try {
      const billFilters = buildBillFilters();
      const filters: EBFilterOptions = {
        search: debouncedSearch || undefined,
        areaCodes: areaCodeSelections,
        eros: eroSelections,
        sections: sectionSelections,
        statuses: statusSelections,
        callStatuses: callStatusSelections,
        categories: categorySelections,
        mandals: mandalSelections,
        subStations: subStationSelections,
        areas: areaSelections,
        excludeSolar,
        importBatchId,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        sortBy,
        ...billFilters,
      };
      if (statFilter === 'interested') filters.callStatuses = ['interested'];
      if (statFilter === 'live') filters.statuses = ['LIVE'];
      if (statFilter === 'followups') filters.followUpDue = true;
      if (statFilter === 'called') filters.calledOnly = true;

      const limit = exportLimit === 'all' ? undefined : exportLimit;

      if (exportType === 'scOnly') {
        const scNumbers = await fetchEBSCOnlyForExport(filters, limit);
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
        link.download = `eb_sc_numbers_${dateStr}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }

      const exportData = await fetchEBCustomersForExport(filters, limit);
      if (exportData.length === 0) {
        alert('No customers to export with current filters.');
        return;
      }

      const wb = XLSX.utils.book_new();

      const mainRows = exportData.map((r) => ({
        'SC Number': r.sc_number,
        'Customer Name': r.customer_name || '',
        'Mobile': r.mobile_number || '',
        'Phone': r.phone || '',
        'ERO': r.ero_name || '',
        'Section': r.section_name || '',
        'Sub Station': r.sub_station_name || '',
        'Area': r.area_name || '',
        'Mandal': r.mandal_name || '',
        'Panchayath': r.panchayath_name || '',
        'Category': r.category || '',
        'Status': r.status || '',
        'Phase': r.phase || '',
        'Contracted Load': r.contracted_load ?? '',
        'Connected Load': r.connected_load ?? '',
        'Load Unit': r.load_unit || '',
        'Meter No': r.meter_no || '',
        'Meter Make': r.meter_make || '',
        'Service Type': r.service_type || '',
        'Supply Release Date': r.supply_release_date || '',
        'Address': r.address || '',
        'Call Status': r.call_status,
        'Remark': r.remark || '',
        'Follow-up Date': r.follow_up_date || '',
        'Last Called At': r.last_called_at || '',
        'Max Billed Units': r.max_billed_units ?? '',
        'Max Units Bill Amount': r.max_units_bill_amount ?? '',
        'Max Bill Amount': r.max_bill_amount ?? '',
        'Recent Units': r.recent_units ?? '',
        'Recent Bill Amount': r.recent_bill_amount ?? '',
        'Recent Bill Month': r.recent_bill_month ?? '',
        'Latest Bill Month': r.latest_bill_month || '',
      }));
      const wsMain = XLSX.utils.json_to_sheet(mainRows);
      XLSX.utils.book_append_sheet(wb, wsMain, 'Customers');

      const billRows: Record<string, any>[] = [];
      for (const r of exportData) {
        if (r.bills.length === 0) {
          billRows.push({
            'SC Number': r.sc_number,
            'Customer Name': r.customer_name || '',
            'Bill Month': '',
            'Billed Units': '',
            'Bill Amount': '',
            'Bill Status': '',
          });
        } else {
          for (const b of r.bills) {
            billRows.push({
              'SC Number': r.sc_number,
              'Customer Name': r.customer_name || '',
              'Bill Month': b.bill_month || '',
              'Billed Units': b.billed_units ?? '',
              'Bill Amount': b.bill_amount ?? '',
              'Bill Status': b.bill_status || '',
            });
          }
        }
      }
      const wsBills = XLSX.utils.json_to_sheet(billRows);
      XLSX.utils.book_append_sheet(wb, wsBills, 'Monthly Bills');

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `eb_customers_export_${dateStr}.xlsx`);
    } catch (err: any) {
      console.error('Export failed:', err);
      alert('Export failed: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  const callStatusOptions = Object.keys(CALL_STATUS_LABELS);
  const callStatusLabels = Object.fromEntries(callStatusOptions.map(k => [k, CALL_STATUS_LABELS[k]]));

  if (loading && customers.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">EB Customers CRM</h1>
          <p className="text-sm text-gray-600 mt-1 flex items-center gap-1.5 flex-wrap">
            {isAdmin && volunteerFilter ? (
              <>
                <span className="font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                  {total.toLocaleString('en-IN')} JSP Member customer{total !== 1 ? 's' : ''}
                </span>
                <span className="text-red-600 font-medium">(Volunteer: {volunteerFilter})</span>
                <span className="text-gray-500">— matching your filters</span>
              </>
            ) : isAdmin && jspOnlyFilter && volunteerAssembly ? (
              <>
                <span className="font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                  {total.toLocaleString('en-IN')} JSP Member customer{total !== 1 ? 's' : ''}
                </span>
                <span className="text-red-600 font-medium">({volunteerAssembly})</span>
                <span className="text-gray-500">— matching your filters</span>
              </>
            ) : isAdmin && jspOnlyFilter ? (
              <>
                <span className="font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-md">
                  Select a Volunteer below to filter JSP Member customers
                </span>
                <span className="text-gray-500">— showing {total.toLocaleString('en-IN')} total customers</span>
              </>
            ) : (
              <>{total.toLocaleString('en-IN')} customers — call, track outcomes, and manage follow-ups</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => { loadCustomers(); loadStats(); loadFilterValues(); }}
            className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowExportModal(true)} disabled={exporting || total === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50" title="Export filtered data to Excel with monthly bills">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
          {canAccessWhatsApp && (
            <button
              onClick={handleOpenWhatsAppCampaign}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors shadow-sm"
              title="Launch WhatsApp Broadcast Campaign for EB Customers"
            >
              <MessageSquare className="w-4 h-4" /> WhatsApp Campaign
            </button>
          )}
          <button onClick={() => navigate('/eb-customers/import-bills')}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors">
            <Receipt className="w-4 h-4" /> Import Bills
          </button>
          <button onClick={() => navigate('/eb-customers/import')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
            <Upload className="w-4 h-4" /> Import Excel
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={<Database className="w-5 h-5" />} label="Total Customers" value={stats.total} color="blue" active={statFilter === null} onClick={() => { setStatFilter(null); setPage(1); }} />
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
              placeholder="Search by SC number, name, mobile, meter no, area, address..."
              className="w-full pl-10 pr-9 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {searchTerm && (
              <button onClick={() => { setSearchTerm(''); setDebouncedSearch(''); setPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear search">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <label className="text-xs font-semibold text-gray-500 whitespace-nowrap hidden md:flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" /> Sort:
            </label>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as EBSortOption); setPage(1); }}
              className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
              title="Sort customer records"
            >
              <option value="created_at_desc">🕒 Newest First</option>
              <option value="created_at_asc">🕒 Oldest First</option>
              <option value="units_desc">⚡ Billed Units: High to Low</option>
              <option value="units_asc">⚡ Billed Units: Low to High</option>
              <option value="load_desc">🔌 Sanctioned Load: High to Low</option>
              <option value="load_asc">🔌 Sanctioned Load: Low to High</option>
              <option value="name_asc">🔤 Customer Name (A → Z)</option>
              <option value="name_desc">🔤 Customer Name (Z → A)</option>
            </select>
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

        {showFilters && (
          <div className="space-y-4 pt-3 border-t border-gray-100">
            {!filtersLoaded && (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
                <span className="text-sm text-blue-700">Filter dropdown values are not loaded yet.</span>
                <button onClick={loadFilterValues} disabled={loadingFilters}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {loadingFilters ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
                  {loadingFilters ? 'Loading...' : 'Load Filters'}
                </button>
              </div>
            )}
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

            <div className="pt-3 border-t border-gray-100 space-y-3">
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={excludeSolar} onChange={(e) => { setExcludeSolar(e.target.checked); setPage(1); }}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" />
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <SunIcon className="w-4 h-4 text-amber-500" /> Hide Solar Already Installed
                  </span>
                </label>

                {isAdmin && (
                  <label className="flex items-center gap-2 cursor-pointer bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition-colors">
                    <input type="checkbox" checked={jspOnlyFilter} onChange={(e) => { setJspOnlyFilter(e.target.checked); setPage(1); }}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500" />
                    <span className="text-sm font-medium text-red-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                      JSP Members Only
                    </span>
                  </label>
                )}
              </div>

              {isAdmin && jspOnlyFilter && (
                <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-red-800 uppercase tracking-wider flex items-center gap-1.5">
                      <UserCircle className="w-4 h-4 text-red-600" /> Filter JSP Members by Volunteer / Sadhak
                    </span>
                    <span className="text-xs font-semibold text-red-700 bg-red-100 px-2.5 py-1 rounded-full border border-red-200">
                      {volunteersList.length} Volunteers in {volunteerAssembly || 'All Assemblies'}
                    </span>
                  </div>

                  {!volunteerFilter && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                      <span className="font-bold">👉 Action needed:</span> Select a Sadhak / Volunteer below to filter and view their assigned JSP members among the EB customers.
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-red-900 mb-1 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-red-600" /> Select Assembly Constituency
                      </label>
                      <select
                        value={volunteerAssembly}
                        onChange={(e) => { setVolunteerAssembly(e.target.value); setVolunteerFilter(''); setPage(1); }}
                        className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                      >
                        <option value="">All Assemblies</option>
                        {AVAILABLE_ASSEMBLIES.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-red-900 mb-1 flex items-center gap-1">
                        <UserCircle className="w-3.5 h-3.5 text-red-600" /> Select Sadhak / Volunteer
                      </label>
                      <select
                        value={volunteerFilter}
                        onChange={(e) => { setVolunteerFilter(e.target.value); setPage(1); }}
                        className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                      >
                        <option value="">All Volunteers ({volunteersList.length})</option>
                        {volunteersList.map((v) => {
                          const count = volunteerEbCustomerCounts[v] || 0;
                          return (
                            <option key={v} value={v}>
                              {v} {count > 0 ? `(${count} EB Customers in results)` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Import Batch</label>
                  <select value={importBatchId || ''} onChange={(e) => { setImportBatchId(e.target.value || null); setPage(1); }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">All batches</option>
                    {importBatches.map((b) => (
                      <option key={b.batch_id} value={b.batch_id}>{b.batch_label} ({b.row_count} rows)</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" /> Filter by Bill Amount / Units
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

            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium">
                <RotateCcw className="w-4 h-4" /> Reset all filters
              </button>
            )}
          </div>
        )}
      </div>

      <div className="relative">
      {loading && customers.length > 0 && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-600">Showing <strong>{displayedCustomers.length}</strong> of <strong>{total.toLocaleString('en-IN')}</strong> customers</p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-gray-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as EBSortOption); setPage(1); }}
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

      {customers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No EB customers found</p>
          <p className="text-sm text-gray-400 mt-1">{total === 0 ? 'Import an Excel/CSV file to get started' : 'Try adjusting your filters or search term'}</p>
          {total === 0 && (
            <button onClick={() => navigate('/eb-customers/import')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
              <Upload className="w-4 h-4" /> Import Excel
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {displayedCustomers.map((customer) => {
              const cleanMobile = (customer.mobile_number || customer.phone || '').replace(/\D/g, '').slice(-10);
              const jspMember = cleanMobile ? jspMemberMap[cleanMobile] : undefined;
              return (
                <div key={customer.id} className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedCustomer(customer)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-sm font-mono font-semibold text-gray-900">{customer.sc_number}</span>
                        {(() => {
                          const code = extractAreaCode(customer.sc_number);
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
                        {customer.customer_name && <span className="text-sm font-medium text-gray-700">{customer.customer_name}</span>}
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${CALL_STATUS_COLORS[customer.call_status] || 'bg-gray-100 text-gray-600'}`}>
                          {CALL_STATUS_LABELS[customer.call_status] || customer.call_status}
                        </span>
                        {customer.status === 'LIVE' && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-200">LIVE</span>}
                        {customer.solar_already_installed && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                            <SunIcon className="w-3 h-3" /> Solar Installed
                          </span>
                        )}
                        {suryaGharSCs.has(customer.sc_number) && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                            <Link2 className="w-3 h-3" /> Surya Ghar
                          </span>
                        )}
                        {prospectSCs.has(customer.sc_number) && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 flex items-center gap-1">
                            <UserSearch className="w-3 h-3" /> Prospect
                          </span>
                        )}
                        {isAdmin && jspMember && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/jsp/members?search=${encodeURIComponent(jspMember.mobile || jspMember.jsp_id || customer.mobile_number || '')}`);
                            }}
                            className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 flex items-center gap-1 cursor-pointer transition-colors"
                            title={`JSP Member: ${jspMember.name || jspMember.jsp_id || ''} (${jspMember.constituency_name || 'JSP'}) - Click to view JSP Profile`}
                          >
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                            JSP Member ({jspMember.constituency_name || 'JSP'})
                          </span>
                        )}
                        {customer.follow_up_date && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{new Date(customer.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      {customer.ero_name && (<span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{customer.ero_name}{customer.section_name && ` / ${customer.section_name}`}</span>)}
                      {customer.sub_station_name && (<span className="flex items-center gap-1"><Zap className="w-3 h-3" />{customer.sub_station_name}</span>)}
                      {customer.mandal_name && <span className="text-gray-600">{customer.mandal_name}</span>}
                      {customer.contracted_load != null && (<span className="flex items-center gap-1"><Zap className="w-3 h-3" />{customer.contracted_load} {customer.load_unit || 'KW'}</span>)}
                      {customer.category && <span className="text-gray-600">Cat: {customer.category}</span>}
                      {customer.last_called_at && (<span className="flex items-center gap-1"><Clock className="w-3 h-3" />Called {new Date(customer.last_called_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>)}
                    </div>
                    {customer.remark && <p className="text-xs text-gray-600 mt-1.5 truncate">"{customer.remark}"</p>}
                    {(() => {
                      const bs = billSummaries.get(customer.id);
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
                    {customer.mobile_number && (
                      <div className="flex items-center gap-1">
                        <a href={`tel:${customer.mobile_number}`} className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors" title="Click to Call"><Phone className="w-4 h-4" /></a>
                        <button onClick={() => copyToClipboard(customer.mobile_number!, `${customer.id}-mobile`)} className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors" title="Copy mobile number">
                          {copiedField === `${customer.id}-mobile` ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                    {customer.sc_number && (
                      <button onClick={() => copyToClipboard(customer.sc_number, `${customer.id}-sc`)} className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors" title="Copy SC Number">
                        {copiedField === `${customer.id}-sc` ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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

      {selectedCustomer && (
        <EBCustomerDetailModal customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} onUpdate={handleModalUpdate} />
      )}

      {showExportModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowExportModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Export to Excel</h3>
              <button onClick={() => setShowExportModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              <strong>{total.toLocaleString('en-IN')}</strong> customers match your current filters. Choose how many to export.
            </p>
            <div className="space-y-3 mb-5">
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="exportType" checked={exportType === 'full'} onChange={() => setExportType('full')}
                    className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700">Full Excel export (all columns + monthly bills)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="exportType" checked={exportType === 'scOnly'} onChange={() => setExportType('scOnly')}
                    className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700">SC Numbers only (CSV)</span>
                </label>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="exportLimit" checked={exportLimit === 'all'} onChange={() => setExportLimit('all')}
                    className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700">All {total.toLocaleString('en-IN')} records</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="exportLimit" checked={exportLimit !== 'all'} onChange={() => setExportLimit(Math.min(total, 500))}
                    className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700">Custom limit:</span>
                  <input type="number" min="1" max={total} value={exportLimit === 'all' ? '' : exportLimit}
                    onChange={(e) => setExportLimit(Math.min(total, Math.max(1, Number(e.target.value) || 1)))}
                    disabled={exportLimit === 'all'}
                    className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" />
                  <span className="text-xs text-gray-500">records</span>
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
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
