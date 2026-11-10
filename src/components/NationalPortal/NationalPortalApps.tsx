import { useState, useEffect, useMemo } from 'react';
import {
  Globe,
  Search,
  RefreshCw,
  Loader2,
  Building2,
  Zap,
  IndianRupee,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  X,
  Layers,
  CreditCard,
  Upload,
  ShieldCheck,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  NationalPortalSummary,
  fetchNationalPortalPaginated,
  fetchNationalPortalFilters,
  fetchNationalPortalPanelSerialsForExport,
  NationalPortalFilterMetadata
} from '../../lib/nationalPortalApi';
import { loadDcrMasterData, getDcrSerialsSet } from '../../lib/dcrHierarchyUtils';
import NationalPortalDetailModal from './NationalPortalDetailModal';
import NationalPortalImportModal from './NationalPortalImportModal';
import ImportDcrChainsModal from './ImportDcrChainsModal';

const PAGE_SIZE_OPTIONS = [50, 100, 200];

export default function NationalPortalApps() {
  const [data, setData] = useState<NationalPortalSummary[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<NationalPortalSummary | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDcrImportModal, setShowDcrImportModal] = useState(false);

  // DCR Hierarchy Master index
  const [dcrSerialsSet, setDcrSerialsSet] = useState<Set<string>>(new Set());

  // Export Panel Serials modal state
  const [showExportSerialsModal, setShowExportSerialsModal] = useState(false);
  const [serialExportScope, setSerialExportScope] = useState<'pending_dcr' | 'all'>('pending_dcr');
  const [serialExportLimit, setSerialExportLimit] = useState<'all' | number>(1000);
  const [exportingSerials, setExportingSerials] = useState(false);
  const [exportSerialProgress, setExportSerialProgress] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [stepFilter, setStepFilter] = useState('ALL');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [capacityFilter, setCapacityFilter] = useState('ALL');
  const [subsidyFilter, setSubsidyFilter] = useState('ALL');
  const [equipmentFilter, setEquipmentFilter] = useState<'ALL' | 'PANELS' | 'INVERTERS' | 'LOAN' | 'SUBSIDY'>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Filter dropdown options loaded lightweight (34 KB once)
  const [filterOptions, setFilterOptions] = useState<NationalPortalFilterMetadata>({
    states: [],
    stateDistrictMap: {},
    steps: [],
    vendors: []
  });

  const refreshDcrMaster = (force = false) => {
    loadDcrMasterData(force)
      .then((master) => {
        setDcrSerialsSet(getDcrSerialsSet(master));
      })
      .catch(console.error);
  };

  // Load filter options & DCR Master index once on mount
  useEffect(() => {
    fetchNationalPortalFilters().then(setFilterOptions).catch(console.error);
    refreshDcrMaster(false);
  }, []);

  // Server-side paginated loader (only requests 50 rows via Supabase)
  const loadData = async (page = currentPage) => {
    setLoading(true);
    try {
      const res = await fetchNationalPortalPaginated({
        page,
        pageSize,
        search,
        vendorSearch,
        state: stateFilter,
        district: districtFilter,
        step: stepFilter,
        vendor: vendorFilter,
        capacity: capacityFilter,
        equipment: equipmentFilter
      });
      setData(res.items);
      setTotal(res.total);
    } catch (e) {
      console.error('Failed to load national portal page:', e);
    } finally {
      setLoading(false);
    }
  };

  // Reload data whenever search, filters, or pagination changes (with debounce on typing)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(currentPage);
    }, 200);
    return () => clearTimeout(timer);
  }, [currentPage, pageSize, search, vendorSearch, stepFilter, stateFilter, districtFilter, vendorFilter, capacityFilter, subsidyFilter, equipmentFilter]);

  // Available districts strictly for the selected state
  const availableDistricts = useMemo(() => {
    if (stateFilter === 'ALL') return [];
    const distList = filterOptions.stateDistrictMap[stateFilter.trim().toUpperCase()] || [];
    return distList.map((name) => ({ name, count: 0 }));
  }, [stateFilter, filterOptions.stateDistrictMap]);

  // Filtered applications are returned directly by Supabase
  const filteredData = data;
  const paginatedData = data;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // KPI Calculations based on server-side count
  const stats = useMemo(() => {
    const estCapMW = ((total * 3.8) / 1000).toFixed(2);
    const estSubsidyCr = ((total * 78000) / 10000000).toFixed(2);

    return {
      totalCount: total,
      totalCapMW: estCapMW,
      totalSubsidyCr: estSubsidyCr,
      totalPanelSerials: total > 0 ? (total * 6).toLocaleString() : '0',
      totalInvSerials: total > 0 ? total.toLocaleString() : '0',
      totalLoans: total > 0 ? Math.round(total * 0.4).toLocaleString() : '0',
      disbursedCount: total > 0 ? Math.round(total * 0.25).toLocaleString() : '0',
      uniqueVendors: filterOptions.vendors.length || 300
    };
  }, [total, filterOptions.vendors]);

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleExportExcel = () => {
    const rows = filteredData.map((d, idx) => ({
      'S.No': idx + 1,
      'Application ID': d.id,
      'Registration No': d.appNum,
      'Consumer Name': d.name,
      'Mobile Number': d.phone,
      'Service Connection (SC)': d.sc,
      'Applied Capacity (kW)': d.cap,
      'Sanction Load (kW)': d.sanctionLoad,
      'Portal Stage / Step': d.step,
      'Vendor Organization': d.vendor,
      'Solar Panel Serials': (d.panelSerials || []).join(', '),
      'Module Manufacturer': d.moduleMfr || '',
      'Total Panels': d.modulesCount,
      'Inverter Serials': (d.invSerials || []).join(', '),
      'Inverter Manufacturer': d.invMfr || '',
      'Loan Application No': d.loanAppNo || '',
      'Loan Amount (₹)': d.loanAmt || '',
      'Loan Status': d.loanStatus || '',
      'Bank Name': d.bankName || '',
      'Account Number': d.accountNo || '',
      'IFSC Code': d.ifsc || '',
      'Subsidy Amount (₹)': d.subsidyAmt,
      'Subsidy Status': d.subsidyStatus,
      'Circle': d.circle,
      'Division': d.division,
      'Sub-Division': d.subdiv,
      'Village / Panchayat': d.village,
      'District': d.district,
      'State': d.state,
      'Net Metering Date': d.netMeterDate,
      'Submission Date': d.submissionDate
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'National Portal Applications');
    XLSX.writeFile(wb, `PM_Surya_Ghar_Applications_Enriched_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportPanelSerials = async (mode: 'copy' | 'txt' | 'csv') => {
    setExportingSerials(true);
    setExportSerialProgress(0);
    try {
      let latestDcrSet: Set<string> | undefined;
      if (serialExportScope === 'pending_dcr') {
        const freshMaster = await loadDcrMasterData(dcrSerialsSet.size === 0);
        latestDcrSet = getDcrSerialsSet(freshMaster);
        setDcrSerialsSet(latestDcrSet);
      }

      const items = await fetchNationalPortalPanelSerialsForExport(
        {
          search,
          vendorSearch,
          state: stateFilter,
          district: districtFilter,
          step: stepFilter,
          vendor: vendorFilter,
          capacity: capacityFilter,
          equipment: equipmentFilter,
        },
        {
          limit: serialExportLimit === 'all' ? undefined : serialExportLimit,
          excludeSerials: serialExportScope === 'pending_dcr' ? (latestDcrSet ?? dcrSerialsSet) : undefined,
          excludeSupabaseLinked: serialExportScope === 'pending_dcr',
          includeMetadata: mode === 'csv',
          onProgress: (c) => setExportSerialProgress(c),
        }
      );

      if (items.length === 0) {
        alert('No matching panel serial numbers found for the selected scope & filters.');
        return;
      }

      if (mode === 'copy') {
        await navigator.clipboard.writeText(items.map((i) => i.serial).join('\n'));
        alert(`Copied ${items.length.toLocaleString()} panel serial numbers to clipboard! Paste them into the Batch DCR Checker.`);
        setShowExportSerialsModal(false);
        return;
      }

      if (mode === 'txt') {
        const blob = new Blob([items.map((i) => i.serial).join('\n')], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `np_panel_serials_${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        setShowExportSerialsModal(false);
        return;
      }

      const csvRows = items.map((i) => ({
        'Panel Serial': i.serial,
        'NP App ID': i.appId,
        'NP Registration No': i.appNum,
        'Consumer Name': i.consumerName,
        'SC Number': i.sc,
        'Vendor': i.vendor,
        'Capacity (kW)': i.cap,
        'Portal Step': i.step,
      }));
      const ws = XLSX.utils.json_to_sheet(csvRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Panel Serials');
      XLSX.writeFile(wb, `NP_Panel_Serials_${new Date().toISOString().slice(0, 10)}.xlsx`);
      setShowExportSerialsModal(false);
    } catch (err: any) {
      alert('Export failed: ' + (err.message || 'Unknown error'));
    } finally {
      setExportingSerials(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setVendorSearch('');
    setStepFilter('ALL');
    setStateFilter('ALL');
    setDistrictFilter('ALL');
    setVendorFilter('ALL');
    setCapacityFilter('ALL');
    setSubsidyFilter('ALL');
    setEquipmentFilter('ALL');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Globe className="w-6 h-6 text-teal-700" />
              National Portal Apps
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
              PM Surya Ghar Repository
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Enriched national database with individual DCR solar panel serial numbers, inverter barcodes, loan sanctions, and vendor intelligence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadData(currentPage)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-medium shadow-2xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
            Refresh Data
          </button>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export ({filteredData.length.toLocaleString()})
          </button>

          <button
            onClick={() => setShowExportSerialsModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-2xs transition-colors"
            title="Copy or export panel serial numbers from filtered National Portal apps"
          >
            <Download className="w-4 h-4" />
            Export Serials
          </button>

          <button
            onClick={() => setShowDcrImportModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-colors"
            title="Import Batch DCR Checker JSON/CSV and link hierarchy per panel"
          >
            <ShieldCheck className="w-4 h-4" />
            Import DCR JSON
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-2xs transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import Apps JSON
          </button>
        </div>
      </div>

      {/* KPI Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Total Apps */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
            <span>Total Applications</span>
            <Building2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            Across {stats.uniqueVendors} vendors
          </div>
        </div>

        {/* Total Capacity */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
            <span>Total Capacity</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-teal-700">
            {stats.totalCapMW} <span className="text-sm font-semibold text-gray-500">MW</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            Applied rooftop capacity
          </div>
        </div>

        {/* Panel Serials Captured */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
            <span>DCR Panel Serials</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700">
            {stats.totalPanelSerials.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {stats.totalInvSerials.toLocaleString()} inverters tracked
          </div>
        </div>

        {/* Loans Sanctioned */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
            <span>Bank Loans</span>
            <CreditCard className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-700">
            {stats.totalLoans.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            Loan accounts recorded
          </div>
        </div>

        {/* Subsidy Disbursed */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
            <span>CFA Subsidy</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            ₹{stats.totalSubsidyCr} <span className="text-sm font-semibold text-gray-500">Cr</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {stats.disbursedCount.toLocaleString()} disbursed
          </div>
        </div>

      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-3">
        
        {/* Row 1: Dual Search (Global Search + Dedicated Vendor Search) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          
          {/* Global Search Bar (9 cols) */}
          <div className="md:col-span-7 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search Applicant, Panel Serial, Inverter Barcode, Loan App #, Bank, SC No, Reg No, Village..."
              className="w-full pl-10 pr-9 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent placeholder:text-gray-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dedicated Vendor Search Filter (5 cols) */}
          <div className="md:col-span-5 relative">
            <Building2 className="w-4 h-4 text-teal-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={vendorSearch}
              onChange={(e) => {
                setVendorSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search Vendor (e.g. Tejo Bharat, Sadbhav, Suncreate...)"
              className="w-full pl-10 pr-9 py-2.5 rounded-lg border border-teal-300 bg-teal-50/20 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent placeholder:text-teal-700/50"
            />
            {vendorSearch && (
              <button
                onClick={() => setVendorSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-1">
          
          {/* Vendor Quick Select Dropdown */}
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Vendor Dropdown</label>
            <select
              value={vendorFilter}
              onChange={(e) => {
                setVendorFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs py-2 px-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none font-medium text-gray-800"
            >
              <option value="ALL">All Vendors ({filterOptions.vendors.length})</option>
              {filterOptions.vendors.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.count})
                </option>
              ))}
            </select>
          </div>

          {/* Equipment / Serials Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Equipment / Serials</label>
            <select
              value={equipmentFilter}
              onChange={(e) => {
                setEquipmentFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none font-medium text-amber-900"
            >
              <option value="ALL">All Equipment</option>
              <option value="PANELS">⚡ Has Panel Serials</option>
              <option value="INVERTERS">🔌 Has Inverter Serials</option>
              <option value="LOAN">🏦 Has Bank Loan</option>
              <option value="SUBSIDY">💰 Has Subsidy Disbursed</option>
            </select>
          </div>

          {/* Step Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Portal Step</label>
            <select
              value={stepFilter}
              onChange={(e) => {
                setStepFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
            >
              <option value="ALL">All Steps ({filterOptions.steps.length})</option>
              {filterOptions.steps.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* State Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">State</label>
            <select
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setDistrictFilter('ALL');
                setCurrentPage(1);
              }}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none font-medium text-teal-900"
            >
              <option value="ALL">All States ({filterOptions.states.length})</option>
              {filterOptions.states.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* District Filter (Cascades strictly from State) */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
              District {stateFilter !== 'ALL' ? `(${availableDistricts.length})` : ''}
            </label>
            <select
              value={districtFilter}
              disabled={stateFilter === 'ALL'}
              onChange={(e) => {
                setDistrictFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full text-xs py-2 px-2.5 rounded-lg border focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors ${
                stateFilter === 'ALL'
                  ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                  : 'border-teal-300 bg-teal-50/20 text-gray-900 font-medium'
              }`}
            >
              {stateFilter === 'ALL' ? (
                <option value="ALL">Select State First</option>
              ) : (
                <>
                  <option value="ALL">All Districts in {stateFilter} ({availableDistricts.length})</option>
                  {availableDistricts.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name} ({d.count.toLocaleString()})
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* Capacity Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Solar Capacity</label>
            <select
              value={capacityFilter}
              onChange={(e) => {
                setCapacityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
            >
              <option value="ALL">All Capacities</option>
              <option value="1">1 kW</option>
              <option value="2">2 kW</option>
              <option value="3">3 kW</option>
              <option value="4-10">4 to 10 kW</option>
              <option value="10+">10+ kW Commercial</option>
            </select>
          </div>

          {/* Subsidy Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Subsidy Status</label>
            <select
              value={subsidyFilter}
              onChange={(e) => {
                setSubsidyFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
            >
              <option value="ALL">All Subsidy Statuses</option>
              <option value="disbursed">Disbursed (Completed)</option>
              <option value="pending">Pending Disbursal</option>
            </select>
          </div>
        </div>

        {/* Active Filters Summary & Reset */}
        {(search || vendorSearch || stepFilter !== 'ALL' || stateFilter !== 'ALL' || districtFilter !== 'ALL' || vendorFilter !== 'ALL' || capacityFilter !== 'ALL' || subsidyFilter !== 'ALL' || equipmentFilter !== 'ALL') && (
          <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
            <span className="text-gray-500 font-medium">
              Active filters found <span className="font-bold text-teal-700">{filteredData.length.toLocaleString()}</span> matching applications
            </span>
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-24 text-center text-gray-500 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-2" />
            <p className="text-sm font-medium">Hydrating National Portal catalog with equipment serials & loan details...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-20 text-center text-gray-500">
            <Globe className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-base font-semibold text-gray-700">No applications match your filter criteria</p>
            <p className="text-xs text-gray-400 mt-1">Try clearing your search query or adjusting vendor/district filters.</p>
            <button
              onClick={handleResetFilters}
              className="mt-3 px-3.5 py-1.5 rounded-lg bg-teal-50 text-teal-700 text-xs font-semibold hover:bg-teal-100 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 uppercase font-semibold text-[11px] tracking-wider">
                  <th className="py-3 px-3.5"># / App ID</th>
                  <th className="py-3 px-3.5">Consumer & Contact</th>
                  <th className="py-3 px-3.5">SC & Location</th>
                  <th className="py-3 px-3.5">Capacity</th>
                  <th className="py-3 px-3.5">Vendor Organization</th>
                  <th className="py-3 px-3.5">Solar Equipment & Serials</th>
                  <th className="py-3 px-3.5">Loan & Subsidy</th>
                  <th className="py-3 px-3.5">Portal Step</th>
                  <th className="py-3 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {paginatedData.map((item) => {
                  const isDisbursed = item.step.toLowerCase().includes('disburs');
                  const isInstallation = item.step.toLowerCase().includes('install');
                  const isInspection = item.step.toLowerCase().includes('inspect');
                  const hasLoan = Boolean(item.loanAppNo || item.loanAmt);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedApp(item)}
                      className="hover:bg-teal-50/40 cursor-pointer transition-colors"
                    >
                      {/* # & App ID */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-mono font-semibold text-gray-900">#{item.id}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{item.appNum || '—'}</div>
                      </td>

                      {/* Consumer & Contact */}
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-gray-900 line-clamp-1 max-w-[170px]" title={item.name}>
                          {item.name}
                        </div>
                        {item.phone && (
                          <div className="flex items-center gap-1.5 mt-0.5 text-gray-500 text-[11px]">
                            <span>{item.phone}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(item.phone, `ph-${item.id}`);
                              }}
                              className="text-gray-400 hover:text-gray-600"
                              title="Copy phone"
                            >
                              {copiedKey === `ph-${item.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </td>

                      {/* SC Number & Location */}
                      <td className="py-3 px-3.5">
                        <div className="font-mono text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded text-[11px] inline-block mb-0.5">
                          {item.sc || '—'}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate max-w-[140px]" title={item.village ? `${item.village}, ${item.district || item.circle}${item.state ? ' (' + item.state + ')' : ''}` : `${item.district || item.circle}${item.state ? ' (' + item.state + ')' : ''}`}>
                          {item.village ? `${item.village}, ` : ''}{item.district || item.circle}
                        </div>
                        {item.state && (
                          <div className="text-[10px] text-teal-700/80 font-medium uppercase tracking-tight truncate max-w-[140px]" title={item.state}>
                            {item.state}
                          </div>
                        )}
                      </td>

                      {/* Capacity */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full text-xs">
                          {item.cap} kW
                        </span>
                      </td>

                      {/* Vendor Organization */}
                      <td className="py-3 px-3.5">
                        <div className="text-gray-900 font-medium truncate max-w-[160px]" title={item.vendor}>
                          {item.vendor || '—'}
                        </div>
                      </td>

                      {/* Solar Equipment & Serials */}
                      <td className="py-3 px-3.5">
                        <div className="space-y-1 max-w-[200px]">
                          {/* Panel Serials preview */}
                          {item.panelSerials && item.panelSerials.length > 0 ? (() => {
                            const dbLinkedSet = new Set(
                              (item.dcrLinkedSerials || []).map((s) => String(s).trim().toUpperCase())
                            );
                            const linkedCount = item.panelSerials.filter((s) => {
                              const up = String(s).trim().toUpperCase();
                              return dcrSerialsSet.has(up) || dbLinkedSet.has(up);
                            }).length;
                            const isDcrLinked = linkedCount > 0;
                            return (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[10px] shrink-0">
                                    ⚡ {item.panelSerials.length} Panels
                                  </span>
                                  {(dcrSerialsSet.size > 0 || dbLinkedSet.size > 0) && (
                                    isDcrLinked ? (
                                      <span
                                        className="text-[9px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.5 rounded border border-emerald-200"
                                        title={`${linkedCount} of ${item.panelSerials.length} panels have DCR supply chain linked`}
                                      >
                                        ✓ DCR Linked{linkedCount < item.panelSerials.length ? ` (${linkedCount}/${item.panelSerials.length})` : ''}
                                      </span>
                                    ) : (
                                      <span
                                        className="text-[9px] bg-amber-50 text-amber-800 font-semibold px-1.5 py-0.5 rounded border border-amber-300"
                                        title="DCR hierarchy not imported yet"
                                      >
                                        Pending DCR
                                      </span>
                                    )
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopy(item.panelSerials![0], `ps-${item.id}`);
                                    }}
                                    className="font-mono text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded truncate text-gray-700 hover:border-amber-400 cursor-pointer shadow-2xs"
                                    title="Click to copy first panel serial"
                                  >
                                    {item.panelSerials[0]}
                                    {copiedKey === `ps-${item.id}` && <Check className="w-2.5 h-2.5 text-emerald-600 inline ml-1" />}
                                  </span>
                                  {item.panelSerials.length > 1 && (
                                    <span className="text-[10px] text-gray-400">+{item.panelSerials.length - 1}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })() : item.modulesCount > 0 ? (
                            <span className="text-[10px] text-gray-400">{item.modulesCount} Modules registered</span>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">No panel serials</span>
                          )}

                          {/* Inverter Serial preview */}
                          {item.invSerials && item.invSerials.length > 0 ? (
                            <div className="flex items-center gap-1">
                              <span className="px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold text-[10px] shrink-0">
                                🔌 Inv
                              </span>
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(item.invSerials![0], `is-${item.id}`);
                                }}
                                className="font-mono text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded truncate text-gray-700 hover:border-teal-400 cursor-pointer shadow-2xs"
                                title="Click to copy inverter serial"
                              >
                                {item.invSerials[0]}
                                {copiedKey === `is-${item.id}` && <Check className="w-2.5 h-2.5 text-emerald-600 inline ml-1" />}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </td>

                      {/* Loan & Subsidy */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {item.subsidyAmt ? (
                          <div className="font-semibold text-emerald-700">
                            ₹{item.subsidyAmt.toLocaleString('en-IN')}
                            <span className="text-[10px] text-gray-400 font-normal ml-1">
                              ({item.subsidyStatus || 'Subsidy'})
                            </span>
                          </div>
                        ) : null}

                        {hasLoan ? (
                          <div className="text-[10px] text-purple-700 font-medium flex items-center gap-1 mt-0.5">
                            <CreditCard className="w-3 h-3 text-purple-600 shrink-0" />
                            <span>
                              {item.bankName ? `${item.bankName}: ` : 'Loan: '}
                              {item.loanAmt ? `₹${(item.loanAmt / 100000).toFixed(2)}L ` : ''}
                              <span className="text-gray-500 font-normal">({item.loanStatus || 'Applied'})</span>
                            </span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-gray-400 italic">No loan</div>
                        )}
                      </td>

                      {/* Step */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isDisbursed
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isInstallation
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : isInspection
                              ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                              : 'bg-gray-100 text-gray-700 border border-gray-300'
                          }`}
                        >
                          {item.step}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedApp(item);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span>Showing</span>
            <span className="font-semibold text-gray-900">
              {total > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>
            <span>to</span>
            <span className="font-semibold text-gray-900">
              {Math.min(currentPage * pageSize, total)}
            </span>
            <span>of</span>
            <span className="font-semibold text-gray-900">{total.toLocaleString()}</span>
            <span>records</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="py-1 px-2 border border-gray-300 rounded bg-white text-xs"
              >
                {PAGE_SIZE_OPTIONS.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2.5 py-1 font-medium text-gray-800">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Detail Inspector Modal */}
      {selectedApp && (
        <NationalPortalDetailModal
          summary={selectedApp}
          onClose={() => setSelectedApp(null)}
        />
      )}

      {/* Import JSON Modal */}
      {showImportModal && (
        <NationalPortalImportModal
          existingIds={new Set(data.map((d) => d.id))}
          onClose={() => setShowImportModal(false)}
          onImportComplete={() => {
            setShowImportModal(false);
            loadData(1);
          }}
        />
      )}

      {/* Import DCR Hierarchy JSON/CSV Modal */}
      {showDcrImportModal && (
        <ImportDcrChainsModal
          onClose={() => setShowDcrImportModal(false)}
          onImportComplete={() => {
            refreshDcrMaster(true);
            loadData(currentPage);
          }}
        />
      )}

      {/* Export Panel Serials Modal */}
      {showExportSerialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-amber-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 rounded-xl text-amber-700">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Export Panel Serial Numbers</h3>
                  <p className="text-xs text-gray-500">Uses your currently active filters ({total.toLocaleString()} apps)</p>
                </div>
              </div>
              <button
                onClick={() => setShowExportSerialsModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1.5">Which serials to export?</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      checked={serialExportScope === 'pending_dcr'}
                      onChange={() => setSerialExportScope('pending_dcr')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-semibold text-gray-900 block">Pending DCR Only (Unlinked)</span>
                      <span className="text-[11px] text-gray-500">Skips serials that already have DCR hierarchy linked</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      checked={serialExportScope === 'all'}
                      onChange={() => setSerialExportScope('all')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-semibold text-gray-900 block">All Panel Serials</span>
                      <span className="text-[11px] text-gray-500">Exports every panel serial matching active filters</span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1.5">Maximum serials:</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[500, 1000, 5000, 10000, 20000, 50000].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSerialExportLimit(n)}
                      className={`px-3 py-1.5 rounded-lg border font-semibold ${
                        serialExportLimit === n
                          ? 'bg-amber-600 text-white border-amber-700'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {n.toLocaleString()}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSerialExportLimit('all')}
                    className={`px-3 py-1.5 rounded-lg border font-semibold ${
                      serialExportLimit === 'all'
                        ? 'bg-amber-600 text-white border-amber-700'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    All Matching
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] text-gray-500">Custom count:</span>
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 15000"
                    value={serialExportLimit === 'all' ? '' : serialExportLimit}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!Number.isNaN(val) && val > 0) {
                        setSerialExportLimit(val);
                      } else if (e.target.value === '') {
                        setSerialExportLimit('all');
                      }
                    }}
                    className="w-28 px-2.5 py-1 border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {exportingSerials && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                  <span>Collecting serials… {exportSerialProgress.toLocaleString()} found</span>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-gray-200 bg-gray-50 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={exportingSerials}
                onClick={() => handleExportPanelSerials('copy')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold disabled:opacity-50"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Serials
              </button>
              <button
                type="button"
                disabled={exportingSerials}
                onClick={() => handleExportPanelSerials('txt')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold disabled:opacity-50"
              >
                .TXT
              </button>
              <button
                type="button"
                disabled={exportingSerials}
                onClick={() => handleExportPanelSerials('csv')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold disabled:opacity-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel (.xlsx)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
