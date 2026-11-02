import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sun, Search, Download, Upload, Zap, Copy, Check, Filter,
  Building2, Cpu, Eye, FileSpreadsheet, RefreshCw, Loader2,
  CheckCircle2, AlertCircle, FileCode, ArrowUpDown, ChevronRight,
  ChevronLeft, ChevronsLeft, ChevronsRight,
  ExternalLink, Layers, RotateCcw, X, Calendar, Network, ShieldCheck, Phone
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  APEGroundReport,
  DEFAULT_OFFICE_ID,
  DEFAULT_USER_ID,
  fetchAPEGroundReport,
  fetchAPEGroundReportsBatch,
  formatAPEGroundReport,
} from '../../lib/apepdclGroundReport';
import {
  getAllReportsFromDB,
  saveReportsToDB,
  syncReportsToDisk,
} from '../../lib/sNumbersIndexedDB';
import { SEED_GROUND_REPORTS } from './seedSNumbers';
import SNumberDetailModal from './SNumberDetailModal';
import VendorSupplyChainModal from './VendorSupplyChainModal';

const STORAGE_KEY = 'tb_s_number_reports_v3';

export default function SNumbersDashboard() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<APEGroundReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [vendorSearch, setVendorSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [dateSortOrder, setDateSortOrder] = useState<'desc' | 'asc' | 'none'>('none');
  const [hierarchyFilter, setHierarchyFilter] = useState<'ALL' | 'UNLINKED' | 'LINKED'>('ALL');
  const [selectedReport, setSelectedReport] = useState<APEGroundReport | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isLoadingAllReports, setIsLoadingAllReports] = useState(false);

  // Pagination State for high-performance instant rendering of 17,740+ S-Numbers
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // DCR Master Reference Sets
  const [dcrSerialsSet, setDcrSerialsSet] = useState<Set<string>>(new Set());
  const [dcrSNumbersSet, setDcrSNumbersSet] = useState<Set<string>>(new Set());
  const [dcrIndexLoaded, setDcrIndexLoaded] = useState(false);

  // Copy Modal State: Target ('snumbers' vs 'serials')
  const [showCopySerialsModal, setShowCopySerialsModal] = useState(false);
  const [copyTarget, setCopyTarget] = useState<'snumbers' | 'serials'>('snumbers');
  const [copyScope, setCopyScope] = useState<'all_serials' | 'one_per_snumber'>('all_serials');
  const [copyHierarchyFilter, setCopyHierarchyFilter] = useState<'unlinked_only' | 'all' | 'linked_only'>('unlinked_only');
  const [copyAllScope, setCopyAllScope] = useState<'all' | 'first_n_snumbers' | 'limit_serials'>('all');
  const [copySNumbersCount, setCopySNumbersCount] = useState<number>(10);
  const [copySerialsCount, setCopySerialsCount] = useState<number>(10);
  const [copySerialsFormat, setCopySerialsFormat] = useState<'newline' | 'comma'>('newline');
  const [includeSNumberPrefix, setIncludeSNumberPrefix] = useState(false);
  const [copySuccessToast, setCopySuccessToast] = useState<string | null>(null);
  const copyCountInputRef = useRef<HTMLInputElement>(null);

  // DCR Supply Chain Intelligence Modal State
  const [showSupplyChainModal, setShowSupplyChainModal] = useState(false);
  const [supplyChainTargetVendor, setSupplyChainTargetVendor] = useState('Venkata Siri');

  // Quick Single Fetch State (Default: State-wide Central Gateway 9000-138 / 2000-100)
  const [quickSNumber, setQuickSNumber] = useState('S32608030989');
  const [quickOfficeId, setQuickOfficeId] = useState(DEFAULT_OFFICE_ID);
  const [quickUserId, setQuickUserId] = useState(DEFAULT_USER_ID);
  const [isQuickFetching, setIsQuickFetching] = useState(false);
  const [quickFetchError, setQuickFetchError] = useState<string | null>(null);
  const [quickFetchSuccess, setQuickFetchSuccess] = useState<string | null>(null);

  // Office Batch Sync State
  const [isOfficeSyncing, setIsOfficeSyncing] = useState(false);
  const [officeSyncProgress, setOfficeSyncProgress] = useState<{ done: number; total: number; current?: string } | null>(null);
  const [officeSyncError, setOfficeSyncError] = useState<string | null>(null);

  // Bulk Downloader State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkInputText, setBulkInputText] = useState('');
  const [bulkConcurrency, setBulkConcurrency] = useState(8);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number; current?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize data: Load from IndexedDB (<30ms) + merge background disk reports
  useEffect(() => {
    let isMounted = true;

    // Step 1: Hydrate instantly from high-capacity IndexedDB
    getAllReportsFromDB()
      .then((stored) => {
        if (!isMounted) return;
        if (stored && stored.length > 0) {
          setReports(stored);
        } else {
          // Fallback to seed reports if IndexedDB is brand new
          const seedList = SEED_GROUND_REPORTS.map((r) => formatAPEGroundReport(r));
          setReports(seedList);
          saveReportsToDB(seedList);
        }
      })
      .catch((err) => {
        console.warn('IndexedDB hydration error, falling back:', err);
        const seedList = SEED_GROUND_REPORTS.map((r) => formatAPEGroundReport(r));
        if (isMounted) setReports(seedList);
      });

    // Step 2: In background, fetch consolidated reports from disk to merge fresh updates
    fetch('/s_numbers_ground_reports.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((rawList) => {
        if (!isMounted || !Array.isArray(rawList) || rawList.length === 0) return;

        setReports((prev) => {
          const map = new Map<string, APEGroundReport>();
          // Existing items from IndexedDB
          for (const r of prev) map.set(r.complain_no, r);

          let newAdded = 0;
          for (const item of rawList) {
            const formatted = formatAPEGroundReport(item);
            if (formatted.complain_no) {
              const existing = map.get(formatted.complain_no);
              if (!existing) {
                map.set(formatted.complain_no, formatted);
                newAdded++;
              } else if (
                (!existing.panel_serials_text && formatted.panel_serials_text) ||
                (!existing.consumer_name && formatted.consumer_name) ||
                (!existing.mobile_number && formatted.mobile_number) ||
                (!existing.sc_number && formatted.sc_number)
              ) {
                map.set(formatted.complain_no, {
                  ...existing,
                  ...formatted,
                  // Keep whichever has values
                  consumer_name: existing.consumer_name || formatted.consumer_name,
                  mobile_number: existing.mobile_number || formatted.mobile_number,
                  sc_number: existing.sc_number || formatted.sc_number,
                  panel_serials_text: existing.panel_serials_text || formatted.panel_serials_text,
                  solar_panel_serials: existing.solar_panel_serials.length > 0 ? existing.solar_panel_serials : formatted.solar_panel_serials,
                  vendor_name: existing.vendor_name || formatted.vendor_name,
                });
                newAdded++;
              }
            }
          }

          const merged = Array.from(map.values());
          if (newAdded > 0) {
            saveReportsToDB(merged);
          }
          return merged;
        });
      })
      .catch((err) => console.warn('Background ground reports fetch deferred:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  // Step 3: Load DCR Master index for instantaneous hierarchy status checks
  useEffect(() => {
    fetch('/dcr_supply_chain_master.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (Array.isArray(data.dcr_serials_list)) {
          setDcrSerialsSet(new Set(data.dcr_serials_list));
        }
        if (data.snumber_dcr_map) {
          setDcrSNumbersSet(new Set(Object.keys(data.snumber_dcr_map)));
        }
        setDcrIndexLoaded(true);
      })
      .catch((err) => console.warn('DCR index load deferred:', err));
  }, []);

  // Focus count input when Copy Serials modal opens
  useEffect(() => {
    if (showCopySerialsModal) {
      setTimeout(() => {
        copyCountInputRef.current?.focus();
        copyCountInputRef.current?.select();
      }, 60);
    }
  }, [showCopySerialsModal]);

  // Save changes to BOTH IndexedDB (client) and Disk (/api/save-ground-reports)
  const persistReports = (newList: APEGroundReport[]) => {
    setReports(newList);
    // 1. Save all records to IndexedDB without any 250-item cutoff
    saveReportsToDB(newList);
    // 2. Sync to disk so crm/public/s_numbers_ground_reports.json is updated
    syncReportsToDisk(newList);
    // 3. Keep fallback recent cache in LocalStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList.slice(0, 100)));
    } catch (e) {
      // ignore quota exceeded
    }
  };

  // Load full 17,763 downloaded ground reports from public JSON
  const handleLoadAllDownloadedReports = async () => {
    setIsLoadingAllReports(true);
    try {
      const res = await fetch('/s_numbers_ground_reports.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rawList = await res.json();
      if (Array.isArray(rawList)) {
        const formatted = rawList.map((r) => formatAPEGroundReport(r));
        const map = new Map<string, APEGroundReport>();
        for (const r of reports) map.set(r.complain_no, r);
        for (const r of formatted) map.set(r.complain_no, r);
        const merged = Array.from(map.values());
        persistReports(merged);
        alert(`Successfully loaded all ${merged.length.toLocaleString('en-IN')} verified APEPDCL Ground Reports!`);
      }
    } catch (err: any) {
      alert(`Failed to load ground reports: ${err.message}`);
    } finally {
      setIsLoadingAllReports(false);
    }
  };

  // Copy helper
  const copyText = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Handle Single Live Fetch
  const handleSingleFetch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = quickSNumber.trim().toUpperCase();
    if (!clean.startsWith('S')) {
      setQuickFetchError('Please enter a valid S-number starting with "S" (e.g. S32608030989)');
      return;
    }

    setIsQuickFetching(true);
    setQuickFetchError(null);
    setQuickFetchSuccess(null);

    try {
      const report = await fetchAPEGroundReport(clean, quickOfficeId, quickUserId);
      if (!report) {
        setQuickFetchError(`No ground report found for ${clean} with office_id ${quickOfficeId}. Verify the complaint number.`);
        return;
      }

      // Merge into list
      const existingIdx = reports.findIndex((r) => r.complain_no === report.complain_no);
      let updated: APEGroundReport[];
      if (existingIdx !== -1) {
        updated = [...reports];
        updated[existingIdx] = report;
      } else {
        updated = [report, ...reports];
      }

      persistReports(updated);
      setSelectedReport(report);
      setQuickFetchSuccess(`Successfully fetched ground report for ${clean}!`);
    } catch (err: any) {
      setQuickFetchError(err.message || 'Failed to fetch from APEPDCL portal');
    } finally {
      setIsQuickFetching(false);
    }
  };

  // Reset to full 124 verified seed records
  const handleResetToSeed = () => {
    if (confirm('Reset dashboard to all 124 verified APEPDCL Ground Reports?')) {
      const seedList = SEED_GROUND_REPORTS.map((r) => formatAPEGroundReport(r));
      persistReports(seedList);
    }
  };

  // Handle Sync from Office URL (.../service?office_id=9000-138&user_id=2000-100)
  const handleSyncOfficeList = async (overrideOffice?: string, overrideUser?: string) => {
    const targetOffice = overrideOffice || quickOfficeId;
    const targetUser = overrideUser || quickUserId;

    setIsOfficeSyncing(true);
    setOfficeSyncError(null);
    setOfficeSyncProgress({ done: 0, total: 0 });

    try {
      const isBrowser = typeof window !== 'undefined';
      const baseUrl = isBrowser
        ? '/api/apepdcl/jw/web/json/plugin/com.phoenix.services.WebserviceRevisedSolarP3GroundReport/service'
        : 'https://epccbopn.apeasternpower.com/jw/web/json/plugin/com.phoenix.services.WebserviceRevisedSolarP3GroundReport/service';

      const url = `${baseUrl}?office_id=${encodeURIComponent(targetOffice)}&user_id=${encodeURIComponent(targetUser)}`;

      const res = await fetch(url, { headers: { Accept: '*/*' } });
      if (!res.ok) throw new Error(`Failed to fetch office complaints list (HTTP ${res.status})`);

      const list = await res.json();
      if (!Array.isArray(list) || list.length === 0) {
        throw new Error(`No complaints returned for office ${targetOffice} & user ${targetUser}.`);
      }

      // Step 1: Immediately convert all basic complaint records into APEGroundReport objects
      // and display them in the table right away without waiting!
      const initialReports = list
        .map((item: any) => formatAPEGroundReport(item))
        .filter((r) => Boolean(r.complain_no));

      setReports((prev) => {
        const map = new Map<string, APEGroundReport>();
        for (const r of prev) map.set(r.complain_no, r);
        for (const r of initialReports) {
          const existing = map.get(r.complain_no);
          // Only overwrite if existing record lacks serials and new one has them
          if (!existing) {
            map.set(r.complain_no, r);
          }
        }
        const merged = Array.from(map.values());
        persistReports(merged);
        return merged;
      });

      // Step 2: Identify records needing full equipment enrichment (panel serials, inverter make/serial, CFA subsidy)
      const sNumbersNeedingEnrichment = initialReports
        .filter((r) => !r.panel_serials_text && (!r.solar_panel_manufacturer || !r.inverter_serial_number))
        .map((r) => r.complain_no);

      setOfficeSyncProgress({ done: 0, total: sNumbersNeedingEnrichment.length });

      if (sNumbersNeedingEnrichment.length > 0) {
        let batchAccumulator: APEGroundReport[] = [];

        await fetchAPEGroundReportsBatch(
          sNumbersNeedingEnrichment,
          12,
          (done, total, snum) => {
            setOfficeSyncProgress({ done, total, current: snum });
          },
          targetOffice,
          targetUser,
          (enrichedReport) => {
            batchAccumulator.push(enrichedReport);
            if (batchAccumulator.length >= 20) {
              const toMerge = [...batchAccumulator];
              batchAccumulator = [];
              setReports((prev) => {
                const map = new Map<string, APEGroundReport>();
                for (const r of prev) map.set(r.complain_no, r);
                for (const r of toMerge) map.set(r.complain_no, r);
                const updated = Array.from(map.values());
                persistReports(updated);
                return updated;
              });
            }
          }
        );

        if (batchAccumulator.length > 0) {
          setReports((prev) => {
            const map = new Map<string, APEGroundReport>();
            for (const r of prev) map.set(r.complain_no, r);
            for (const r of batchAccumulator) map.set(r.complain_no, r);
            const updated = Array.from(map.values());
            persistReports(updated);
            return updated;
          });
        }
      }

      alert(`Office Sync Complete for ${targetOffice}! Successfully loaded ${initialReports.length.toLocaleString('en-IN')} complaints.`);
    } catch (err: any) {
      setOfficeSyncError(err.message || 'Failed to sync office list');
    } finally {
      setIsOfficeSyncing(false);
      setOfficeSyncProgress(null);
    }
  };

  // Handle Bulk Download
  const handleStartBulkDownload = async () => {
    const lines = bulkInputText
      .split(/[\r\n,;\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.startsWith('S') && s.length >= 8);

    const sNumbers = [...new Set(lines)];
    if (sNumbers.length === 0) {
      alert('Please enter at least one valid S-number starting with "S"');
      return;
    }

    setIsBulkDownloading(true);
    setBulkProgress({ done: 0, total: sNumbers.length });

    try {
      const resultMap = await fetchAPEGroundReportsBatch(
        sNumbers,
        bulkConcurrency,
        (done, total, current) => {
          setBulkProgress({ done, total, current });
        },
        quickOfficeId,
        quickUserId
      );

      const newReports = Array.from(resultMap.values());
      if (newReports.length === 0) {
        alert('Download completed, but no records returned valid Ground Report data from APEPDCL.');
        return;
      }

      // Merge with existing
      const reportMap = new Map<string, APEGroundReport>();
      for (const r of reports) reportMap.set(r.complain_no, r);
      for (const r of newReports) reportMap.set(r.complain_no, r);

      const merged = Array.from(reportMap.values());
      persistReports(merged);
      setShowBulkModal(false);
      alert(`Bulk Download Complete! ${newReports.length} S-numbers saved to dashboard.`);
    } catch (err: any) {
      alert(`Bulk download failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsBulkDownloading(false);
      setBulkProgress(null);
    }
  };

  // Handle JSON file upload from disk
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let loaded = 0;
    const incoming: APEGroundReport[] = [];

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            parsed.forEach((item) => {
              const formatted = formatAPEGroundReport(item);
              if (formatted.complain_no) incoming.push(formatted);
            });
          } else if (typeof parsed === 'object' && parsed !== null) {
            const formatted = formatAPEGroundReport(parsed);
            if (formatted.complain_no) incoming.push(formatted);
          }
          loaded++;

          if (loaded === files.length) {
            const map = new Map<string, APEGroundReport>();
            for (const r of reports) map.set(r.complain_no, r);
            for (const r of incoming) map.set(r.complain_no, r);
            const merged = Array.from(map.values());
            persistReports(merged);
            alert(`Successfully loaded ${incoming.length} S-number JSON records!`);
          }
        } catch (err) {
          console.error(`Error reading ${file.name}:`, err);
        }
      };
      reader.readAsText(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Export Table to Excel
  const handleExportExcel = () => {
    if (filteredReports.length === 0) {
      alert('No records to export');
      return;
    }

    const rows = filteredReports.map((r) => ({
      'S-Number': r.complain_no,
      'Consumer Name': r.consumer_name || '',
      'Mobile Number': r.mobile_number || '',
      'SC Number': r.sc_number || '',
      'NP Application ID': r.consumer_scno_id || '',
      'Section Name': r.section_name || '',
      'Sub-Division': r.subdiv_name || '',
      District: r.district || '',
      'PIN Code': r.pin_installation || '',
      'Installation Address': r.address_installation || '',
      'Sanctioned Load (kW)': r.contract_load ?? '',
      'Module Capacity (kWp)': r.module_capacity_kw ?? '',
      'Panel Quantity': r.solar_panel_quantity ?? '',
      'Panel Wattage (W)': r.solar_panel_capacity_wp ?? '',
      'Panel Manufacturer': r.solar_panel_manufacturer || '',
      'Solar Panel Serial Numbers': r.panel_serials_text || '',
      'Inverter Manufacturer': r.inverter_manufacturer || '',
      'Inverter Serial Number': r.inverter_serial_number || '',
      'Inverter Capacity (kW)': r.inverter_capacity_kw ?? '',
      Phase: r.phase || '',
      'Net Meter Serial Number': r.new_mtr_sno || '',
      'Vendor Name': r.vendor_name || '',
      'Total Project Cost (Rs)': r.total_installation_amt ?? '',
      'Central Subsidy CFA (Rs)': r.total_cfa_amt ?? '',
      'Customer Net Share (Rs)': r.net_customer_amt ?? '',
      'Inspection Date': r.inst_create_date || r.comp_date || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'S-Numbers');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `s_numbers_ground_reports_${today}.xlsx`);
  };

  // Filters & Summary stats
  const districts = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => {
      if (r.district) set.add(r.district);
    });
    return Array.from(set).sort();
  }, [reports]);

  const vendors = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => {
      if (r.vendor_name) set.add(r.vendor_name);
    });
    return Array.from(set).sort();
  }, [reports]);

  const sections = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => {
      if (r.section_name) set.add(r.section_name);
    });
    return Array.from(set).sort();
  }, [reports]);

  // Helper to parse dates in APEPDCL formats (YYYY-MM-DD, DD-MMM-YYYY, DD-MM-YYYY)
  const parseReportDate = (d?: string | null): number => {
    if (!d || d === '-' || d.trim() === '') return 0;
    const str = d.trim();
    const t1 = Date.parse(str);
    if (!isNaN(t1)) return t1;
    const parts = str.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        const parsed = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)).getTime();
        if (!isNaN(parsed)) return parsed;
      }
      if (parts[0].length === 4) {
        const parsed = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
        if (!isNaN(parsed)) return parsed;
      }
    }
    return 0;
  };

  // Hierarchy counts across current filtered criteria (before applying hierarchy filter itself)
  const hierarchyCounts = useMemo(() => {
    let unlinked = 0;
    let linked = 0;
    for (const r of reports) {
      if (districtFilter !== 'ALL' && r.district !== districtFilter) continue;
      if (vendorFilter !== 'ALL' && r.vendor_name !== vendorFilter) continue;
      if (
        vendorSearch.trim() &&
        (!r.vendor_name || !r.vendor_name.toLowerCase().includes(vendorSearch.toLowerCase().trim()))
      ) {
        continue;
      }
      if (sectionFilter !== 'ALL' && r.section_name !== sectionFilter) continue;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          r.complain_no.toLowerCase().includes(q) ||
          (r.consumer_name && r.consumer_name.toLowerCase().includes(q)) ||
          (r.mobile_number && r.mobile_number.includes(q)) ||
          (r.sc_number && r.sc_number.includes(q)) ||
          (r.panel_serials_text && r.panel_serials_text.toLowerCase().includes(q)) ||
          (r.inverter_serial_number && r.inverter_serial_number.toLowerCase().includes(q)) ||
          (r.new_mtr_sno && r.new_mtr_sno.toLowerCase().includes(q)) ||
          (r.vendor_name && r.vendor_name.toLowerCase().includes(q)) ||
          (r.section_name && r.section_name.toLowerCase().includes(q)) ||
          (r.district && r.district.toLowerCase().includes(q));
        if (!match) continue;
      }

      if (dcrSNumbersSet.has(r.complain_no)) {
        linked++;
      } else {
        unlinked++;
      }
    }
    return { unlinked, linked, total: unlinked + linked };
  }, [reports, districtFilter, vendorFilter, vendorSearch, sectionFilter, searchQuery, dcrSNumbersSet]);

  const filteredReports = useMemo(() => {
    const list = reports.filter((r) => {
      if (districtFilter !== 'ALL' && r.district !== districtFilter) return false;
      if (vendorFilter !== 'ALL' && r.vendor_name !== vendorFilter) return false;
      if (
        vendorSearch.trim() &&
        (!r.vendor_name || !r.vendor_name.toLowerCase().includes(vendorSearch.toLowerCase().trim()))
      ) {
        return false;
      }
      if (sectionFilter !== 'ALL' && r.section_name !== sectionFilter) return false;

      // DCR Hierarchy link status filter
      if (hierarchyFilter === 'UNLINKED' && dcrSNumbersSet.has(r.complain_no)) return false;
      if (hierarchyFilter === 'LINKED' && !dcrSNumbersSet.has(r.complain_no)) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      return (
        r.complain_no.toLowerCase().includes(q) ||
        (r.consumer_name && r.consumer_name.toLowerCase().includes(q)) ||
        (r.mobile_number && r.mobile_number.includes(q)) ||
        (r.sc_number && r.sc_number.includes(q)) ||
        (r.panel_serials_text && r.panel_serials_text.toLowerCase().includes(q)) ||
        (r.inverter_serial_number && r.inverter_serial_number.toLowerCase().includes(q)) ||
        (r.new_mtr_sno && r.new_mtr_sno.toLowerCase().includes(q)) ||
        (r.vendor_name && r.vendor_name.toLowerCase().includes(q)) ||
        (r.section_name && r.section_name.toLowerCase().includes(q)) ||
        (r.district && r.district.toLowerCase().includes(q))
      );
    });

    if (dateSortOrder !== 'none') {
      return [...list].sort((a, b) => {
        const timeA = parseReportDate(a.inst_create_date || a.comp_date);
        const timeB = parseReportDate(b.inst_create_date || b.comp_date);
        return dateSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
    }

    return list;
  }, [reports, districtFilter, vendorFilter, vendorSearch, sectionFilter, searchQuery, dateSortOrder, hierarchyFilter, dcrSNumbersSet]);

  const activeFilters = useMemo(() => {
    const filters: string[] = [];
    if (searchQuery.trim()) filters.push(`Search: "${searchQuery.trim()}"`);
    if (districtFilter !== 'ALL') filters.push(`District: ${districtFilter}`);
    if (vendorFilter !== 'ALL') filters.push(`Vendor: ${vendorFilter}`);
    if (vendorSearch.trim()) filters.push(`Vendor: "${vendorSearch.trim()}"`);
    if (sectionFilter !== 'ALL') filters.push(`Section: ${sectionFilter}`);
    if (dateSortOrder !== 'none') filters.push(`Date: ${dateSortOrder === 'desc' ? 'Newest First ↓' : 'Oldest First ↑'}`);
    if (hierarchyFilter !== 'ALL') {
      filters.push(`Hierarchy: ${hierarchyFilter === 'UNLINKED' ? 'Not Defined (Pending)' : 'Defined (Verified)'}`);
    }
    return filters;
  }, [searchQuery, districtFilter, vendorFilter, vendorSearch, sectionFilter, dateSortOrder, hierarchyFilter]);

  const hasActiveFilters = activeFilters.length > 0;

  const handleResetFilters = () => {
    setSearchQuery('');
    setDistrictFilter('ALL');
    setVendorFilter('ALL');
    setVendorSearch('');
    setSectionFilter('ALL');
    setDateSortOrder('none');
    setHierarchyFilter('ALL');
  };

  const toggleDateSort = () => {
    setDateSortOrder((prev) => {
      if (prev === 'none') return 'desc';
      if (prev === 'desc') return 'asc';
      return 'none';
    });
  };

  // Reset pagination to page 1 whenever any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, districtFilter, vendorFilter, vendorSearch, sectionFilter, dateSortOrder, hierarchyFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));

  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReports.slice(start, start + pageSize);
  }, [filteredReports, currentPage, pageSize]);

  // 1. ALL panel serial numbers from all S-numbers in filteredReports (every single panel)
  const allSerialsInList = useMemo(() => {
    const list: {
      complain_no: string;
      consumer_name: string | null;
      serial: string;
      panelIndex: number;
      totalPanels: number;
      isLinked: boolean;
    }[] = [];

    for (const r of filteredReports) {
      if (!r.complain_no) continue;

      let serials: string[] = [];
      if (Array.isArray(r.solar_panel_serials) && r.solar_panel_serials.length > 0) {
        serials = r.solar_panel_serials
          .map((s) => String(s).trim())
          .filter((s) => s && s !== '-' && s.toUpperCase() !== 'NULL');
      } else if (r.panel_serials_text && typeof r.panel_serials_text === 'string') {
        serials = r.panel_serials_text
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter((s) => s && s !== '-' && s.toUpperCase() !== 'NULL');
      }

      serials.forEach((serial, idx) => {
        const isLinked = dcrSerialsSet.has(serial);
        list.push({
          complain_no: r.complain_no,
          consumer_name: r.consumer_name,
          serial,
          panelIndex: idx + 1,
          totalPanels: serials.length,
          isLinked,
        });
      });
    }

    return list;
  }, [filteredReports, dcrSerialsSet, dcrSNumbersSet]);

  // 2. Exactly 1 panel serial number per S-number (sample)
  const onePerSNumberList = useMemo(() => {
    const list: {
      complain_no: string;
      consumer_name: string | null;
      serial: string;
      panelIndex: number;
      totalPanels: number;
      isLinked: boolean;
    }[] = [];
    const seenSNumbers = new Set<string>();

    for (const r of filteredReports) {
      if (!r.complain_no || seenSNumbers.has(r.complain_no)) continue;

      let firstSerial: string | null = null;
      let total = 0;
      if (Array.isArray(r.solar_panel_serials) && r.solar_panel_serials.length > 0) {
        const valid = r.solar_panel_serials
          .map((s) => String(s).trim())
          .filter((s) => s && s !== '-' && s.toUpperCase() !== 'NULL');
        if (valid.length > 0) {
          firstSerial = valid[0];
          total = valid.length;
        }
      }

      if (!firstSerial && r.panel_serials_text && typeof r.panel_serials_text === 'string') {
        const parts = r.panel_serials_text
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter((s) => s && s !== '-' && s.toUpperCase() !== 'NULL');
        if (parts.length > 0) {
          firstSerial = parts[0];
          total = parts.length;
        }
      }

      if (firstSerial) {
        seenSNumbers.add(r.complain_no);
        const isLinked = dcrSerialsSet.has(firstSerial);
        list.push({
          complain_no: r.complain_no,
          consumer_name: r.consumer_name,
          serial: firstSerial,
          panelIndex: 1,
          totalPanels: total || 1,
          isLinked,
        });
      }
    }
    return list;
  }, [filteredReports, dcrSerialsSet, dcrSNumbersSet]);

  // Hierarchy counts for panels in current filtered reports
  const unlinkedSerialsCount = useMemo(() => {
    return allSerialsInList.filter((it) => !it.isLinked).length;
  }, [allSerialsInList]);

  const linkedSerialsCount = useMemo(() => {
    return allSerialsInList.filter((it) => it.isLinked).length;
  }, [allSerialsInList]);

  // S-Numbers counts in current filtered reports
  const unlinkedSNumbersCount = useMemo(() => {
    return filteredReports.filter((r) => !dcrSNumbersSet.has(r.complain_no)).length;
  }, [filteredReports, dcrSNumbersSet]);

  const linkedSNumbersCount = useMemo(() => {
    return filteredReports.filter((r) => dcrSNumbersSet.has(r.complain_no)).length;
  }, [filteredReports, dcrSNumbersSet]);

  // S-Numbers available for copy based on copyHierarchyFilter
  const availableSNumbersForCopy = useMemo(() => {
    if (copyHierarchyFilter === 'all') return filteredReports;
    if (copyHierarchyFilter === 'unlinked_only') {
      return filteredReports.filter((r) => !dcrSNumbersSet.has(r.complain_no));
    }
    return filteredReports.filter((r) => dcrSNumbersSet.has(r.complain_no));
  }, [filteredReports, copyHierarchyFilter, dcrSNumbersSet]);

  // S-Numbers items to copy based on copyAllScope & counts
  const snumbersToCopy = useMemo(() => {
    if (copyAllScope === 'all') {
      return availableSNumbersForCopy;
    }
    const count = Math.max(1, copySNumbersCount || 10);
    return availableSNumbersForCopy.slice(0, count);
  }, [availableSNumbersForCopy, copyAllScope, copySNumbersCount]);

  // Serials available for copy after applying copyHierarchyFilter ('unlinked_only' | 'all' | 'linked_only')
  const availableSerialsForCopy = useMemo(() => {
    if (copyHierarchyFilter === 'all') return allSerialsInList;
    if (copyHierarchyFilter === 'unlinked_only') {
      return allSerialsInList.filter((it) => !it.isLinked);
    }
    return allSerialsInList.filter((it) => it.isLinked);
  }, [allSerialsInList, copyHierarchyFilter]);

  const availableOnePerSNumberForCopy = useMemo(() => {
    if (copyHierarchyFilter === 'all') return onePerSNumberList;
    if (copyHierarchyFilter === 'unlinked_only') {
      return onePerSNumberList.filter((it) => !it.isLinked);
    }
    return onePerSNumberList.filter((it) => it.isLinked);
  }, [onePerSNumberList, copyHierarchyFilter]);

  // Unique S-numbers that have panels matching current hierarchy copy scope
  const sNumbersWithPanelsCount = useMemo(() => {
    return new Set(availableSerialsForCopy.map((it) => it.complain_no)).size;
  }, [availableSerialsForCopy]);

  // Items to copy dynamically computed based on mode & limits
  const itemsToCopy = useMemo(() => {
    if (copyScope === 'all_serials') {
      if (copyAllScope === 'all') {
        return availableSerialsForCopy;
      }
      if (copyAllScope === 'first_n_snumbers') {
        const targetCount = Math.max(1, copySNumbersCount || 10);
        const targetSNumbers = new Set(
          Array.from(new Set(availableSerialsForCopy.map((it) => it.complain_no))).slice(0, targetCount)
        );
        return availableSerialsForCopy.filter((it) => targetSNumbers.has(it.complain_no));
      }
      if (copyAllScope === 'limit_serials') {
        const count = Math.max(1, copySerialsCount || 10);
        return availableSerialsForCopy.slice(0, count);
      }
      return availableSerialsForCopy;
    } else {
      // one_per_snumber
      const count = Math.max(1, copySerialsCount || 10);
      return availableOnePerSNumberForCopy.slice(0, count);
    }
  }, [
    copyScope,
    copyAllScope,
    availableSerialsForCopy,
    availableOnePerSNumberForCopy,
    copySNumbersCount,
    copySerialsCount,
  ]);

  // Universal Copy handler for both S-Numbers and Panel Serials
  const handleCopyAction = async () => {
    if (copyTarget === 'snumbers') {
      if (snumbersToCopy.length === 0) {
        alert('No S-numbers match the current selection.');
        return;
      }

      let textToCopy = '';
      if (includeSNumberPrefix) {
        textToCopy = snumbersToCopy
          .map((r) => `${r.complain_no}\t${r.consumer_name || '-'}\t${r.mobile_number || '-'}\t${r.district || '-'}`)
          .join(copySerialsFormat === 'newline' ? '\n' : ', ');
      } else {
        textToCopy = snumbersToCopy
          .map((r) => r.complain_no)
          .join(copySerialsFormat === 'newline' ? '\n' : ', ');
      }

      try {
        await navigator.clipboard.writeText(textToCopy);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = textToCopy;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }

      const filterLabel =
        copyHierarchyFilter === 'unlinked_only'
          ? ' (Hierarchy Not Defined)'
          : copyHierarchyFilter === 'linked_only'
          ? ' (Already Linked)'
          : ' (All)';

      const toastMsg = `Copied ${snumbersToCopy.length.toLocaleString('en-IN')} S-numbers${filterLabel} to clipboard!`;
      setCopySuccessToast(toastMsg);
      setTimeout(() => {
        setCopySuccessToast(null);
        setShowCopySerialsModal(false);
      }, 1400);
    } else {
      if (itemsToCopy.length === 0) {
        alert('No panel serial numbers available in current selection.');
        return;
      }

      let textToCopy = '';
      if (includeSNumberPrefix) {
        textToCopy = itemsToCopy
          .map((it) => `${it.complain_no}\t${it.serial}`)
          .join(copySerialsFormat === 'newline' ? '\n' : ', ');
      } else {
        textToCopy = itemsToCopy
          .map((it) => it.serial)
          .join(copySerialsFormat === 'newline' ? '\n' : ', ');
      }

      try {
        await navigator.clipboard.writeText(textToCopy);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = textToCopy;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }

      const filterLabel =
        copyHierarchyFilter === 'unlinked_only'
          ? ' (Hierarchy Not Defined)'
          : copyHierarchyFilter === 'linked_only'
          ? ' (Already Linked)'
          : ' (All Serials)';

      const toastMsg =
        copyScope === 'all_serials'
          ? `Copied ${itemsToCopy.length.toLocaleString('en-IN')} serial numbers${filterLabel} to clipboard!`
          : `Copied ${itemsToCopy.length.toLocaleString('en-IN')} serial numbers (1 per S-number)${filterLabel} to clipboard!`;

      setCopySuccessToast(toastMsg);
      setTimeout(() => {
        setCopySuccessToast(null);
        setShowCopySerialsModal(false);
      }, 1400);
    }
  };

  const totalCapKw = useMemo(() => {
    return reports.reduce((sum, r) => sum + (r.module_capacity_kw || r.approved_cap_kw || 0), 0);
  }, [reports]);

  const totalPanels = useMemo(() => {
    return reports.reduce((sum, r) => sum + (r.solar_panel_quantity || r.solar_panel_serials.length || 0), 0);
  }, [reports]);

  const totalCfaAmt = useMemo(() => {
    return reports.reduce((sum, r) => sum + (r.total_cfa_amt || 0), 0);
  }, [reports]);

  return (
    <div className="space-y-6">
      
      {/* Page Title & Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Sun className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">S-Numbers Hub</h1>
              <p className="text-xs text-gray-600 mt-0.5">
                APEPDCL Solar Phase 3 Ground Reports • Panel Serial Numbers • Inverter Tracking • Net Metering
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Dedicated 1-Click State Data (2000-100) Button */}
          <button
            type="button"
            onClick={() => {
              setQuickOfficeId('9000-138');
              setQuickUserId('2000-100');
              handleSyncOfficeList('9000-138', '2000-100');
            }}
            disabled={isOfficeSyncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 hover:from-amber-700 hover:to-orange-700 active:from-amber-800 active:to-orange-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            title="Fetch all 2,142+ active state-wide solar complaints across all 11 districts via Office 9000-138 & User 2000-100"
          >
            {isOfficeSyncing && quickOfficeId === '9000-138' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 text-amber-200 fill-amber-200" />
            )}
            <span>Fetch All State Data (2000-100)</span>
            <span className="px-2 py-0.5 text-[10px] font-mono bg-white/20 rounded-full font-semibold">
              2,142 Live
            </span>
          </button>

          <button
            type="button"
            onClick={handleLoadAllDownloadedReports}
            disabled={isLoadingAllReports}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            title="Load and sync all 17,763 verified APEPDCL Ground Reports and registrations from disk"
          >
            {isLoadingAllReports ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
            Sync All 17,763 S-Numbers
          </button>

          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            Bulk Downloader
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload downloaded S-Number JSON files"
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Upload className="w-4 h-4 text-gray-500" />
            Upload JSONs
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>

          {/* Copy S-Numbers (Complaint IDs) */}
          <button
            type="button"
            onClick={() => {
              setCopyTarget('snumbers');
              setCopyHierarchyFilter(hierarchyFilter === 'UNLINKED' ? 'unlinked_only' : hierarchyFilter === 'LINKED' ? 'linked_only' : 'all');
              setCopyAllScope('all');
              setShowCopySerialsModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            title="Copy S-Numbers (Complaint Nos) for portal search or bulk download"
          >
            <Copy className="w-4 h-4" />
            <span>Copy S-Numbers</span>
            <span className="px-2 py-0.5 text-[10px] font-mono bg-white/20 rounded-full font-bold">
              {filteredReports.length.toLocaleString('en-IN')}
            </span>
          </button>

          {/* Copy Panel Serials */}
          <button
            type="button"
            onClick={() => {
              setCopyTarget('serials');
              setCopyScope('all_serials');
              setCopyHierarchyFilter(hierarchyFilter === 'UNLINKED' ? 'unlinked_only' : hierarchyFilter === 'LINKED' ? 'linked_only' : 'all');
              setCopyAllScope('all');
              setShowCopySerialsModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            title="Copy panel serial numbers (All in list or 1 per S-number)"
          >
            <Layers className="w-4 h-4" />
            <span>Copy Serials</span>
            {allSerialsInList.length > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-mono bg-white/20 rounded-full font-bold">
                {allSerialsInList.length.toLocaleString('en-IN')}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setSupplyChainTargetVendor('Venkata Siri');
              setShowSupplyChainModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-indigo-700 via-indigo-800 to-indigo-900 hover:from-indigo-800 hover:to-indigo-950 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all"
            title="Track complete solar panel DCR supply chains: Who is purchasing from whom"
          >
            <Network className="w-4 h-4 text-indigo-300" />
            <span>DCR Supply Chain Tracker</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/vendors')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all"
            title="Open Solar Vendor Sales & Calling CRM with Anakapalli & AP vendor directory"
          >
            <Phone className="w-4 h-4 text-teal-200" />
            <span>Vendor Calling CRM</span>
          </button>
        </div>
      </div>

      {/* Quick Single S-Number Fetcher Card & Office Sync Controls */}
      <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Zap className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
              Live APEPDCL Gateway
            </span>
            <div className="flex items-center gap-1.5 ml-2">
              <button
                type="button"
                onClick={() => { setQuickOfficeId('9000-138'); setQuickUserId('2000-100'); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all flex items-center gap-1.5 ${
                  quickOfficeId === '9000-138' && quickUserId === '2000-100'
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100/60'
                }`}
                title="Active State-wide Circle Office (2,142+ complaints across all 11 AP districts)"
              >
                <span>State HQ: 9000-138 (2000-100)</span>
                <span className="text-[10px] bg-amber-950/20 px-1 py-0.2 rounded font-sans">2,142</span>
              </button>
              <button
                type="button"
                onClick={() => { setQuickOfficeId('4000-20'); setQuickUserId('2000-526'); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all flex items-center gap-1.5 ${
                  quickOfficeId === '4000-20' && quickUserId === '2000-526'
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100/60'
                }`}
                title="Pithapuram / Division Office (124 complaints)"
              >
                <span>Division: 4000-20 (2000-526)</span>
                <span className="text-[10px] bg-amber-950/20 px-1 py-0.2 rounded font-sans">124</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleSyncOfficeList()}
              disabled={isOfficeSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
              title={`Query APEPDCL endpoint for all complaints registered under Office ${quickOfficeId} (User: ${quickUserId})`}
            >
              {isOfficeSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {isOfficeSyncing
                ? `Syncing (${officeSyncProgress?.done || 0}/${officeSyncProgress?.total || 0})...`
                : `🌐 Sync Live (${quickOfficeId} / ${quickUserId})`}
            </button>

            <button
              type="button"
              onClick={handleLoadAllDownloadedReports}
              disabled={isLoadingAllReports}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
              title="Refresh and load all verified Ground Reports from disk"
            >
              {isLoadingAllReports ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
              Reload Disk Reports
            </button>
          </div>
        </div>

        <form onSubmit={handleSingleFetch} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={quickSNumber}
              onChange={(e) => setQuickSNumber(e.target.value)}
              placeholder="Enter S-Number (e.g. S32608030989)"
              className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            />
          </div>

          <div className="w-full sm:w-36">
            <input
              type="text"
              value={quickOfficeId}
              onChange={(e) => setQuickOfficeId(e.target.value)}
              placeholder="Office ID"
              title="APEPDCL Office ID"
              className="w-full px-3 py-2.5 bg-white border border-amber-300 rounded-lg text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            />
          </div>

          <div className="w-full sm:w-36">
            <input
              type="text"
              value={quickUserId}
              onChange={(e) => setQuickUserId(e.target.value)}
              placeholder="User ID"
              title="APEPDCL User ID"
              className="w-full px-3 py-2.5 bg-white border border-amber-300 rounded-lg text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isQuickFetching}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {isQuickFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {isQuickFetching ? 'Fetching Live...' : 'Fetch Live Report'}
          </button>
        </form>

        {/* Real-time Office Sync Progress */}
        {isOfficeSyncing && officeSyncProgress && (
          <div className="p-3 bg-amber-100 border border-amber-300 rounded-lg text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
                Downloading Ground Reports: {officeSyncProgress.done} of {officeSyncProgress.total} completed
              </span>
              {officeSyncProgress.current && (
                <span className="font-mono text-[11px] bg-amber-200/60 px-2 py-0.5 rounded">
                  {officeSyncProgress.current}
                </span>
              )}
            </div>
            <div className="w-full bg-amber-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-600 h-1.5 rounded-full transition-all duration-200"
                style={{
                  width: `${Math.round((officeSyncProgress.done / (officeSyncProgress.total || 1)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {officeSyncError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Office Sync Error: {officeSyncError}</span>
          </div>
        )}

        {quickFetchError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{quickFetchError}</span>
          </div>
        )}

        {quickFetchSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{quickFetchSuccess}</span>
          </div>
        )}
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <span className="text-xs text-gray-500 font-semibold uppercase block">Ground Reports Loaded</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-gray-900">{reports.length.toLocaleString('en-IN')}</span>
            <span className="text-xs text-gray-500">verified</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4 shadow-sm">
          <span className="text-xs text-purple-700 font-semibold uppercase block">State S-Numbers</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-purple-900">98,078</span>
            <span className="text-xs text-purple-600 font-medium">11 circles</span>
          </div>
        </div>

        <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-sm">
          <span className="text-xs text-amber-700 font-semibold uppercase block">Solar Capacity</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-amber-900">{totalCapKw.toFixed(1)}</span>
            <span className="text-xs text-gray-500">kWp</span>
          </div>
        </div>

        <div className="bg-white border border-blue-200 rounded-2xl p-4 shadow-sm">
          <span className="text-xs text-blue-700 font-semibold uppercase block">Panels Tracked</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-blue-900">{totalPanels.toLocaleString('en-IN')}</span>
            <span className="text-xs text-gray-500">modules</span>
          </div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm">
          <span className="text-xs text-emerald-700 font-semibold uppercase block">PM Surya Subsidies</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-emerald-900">
              ₹{(totalCfaAmt / 100000).toFixed(2)}L
            </span>
            <span className="text-xs text-gray-500">CFA</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
        {/* Row 1: Search Inputs */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Main Global Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search S-number, SC number, Name, Mobile, Panel Serial, Inverter Serial, Meter No..."
              className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Typeable Vendor Filter */}
          <div className="relative min-w-[220px] md:w-72">
            <Building2 className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              list="vendor-datalist"
              value={vendorSearch}
              onChange={(e) => {
                setVendorSearch(e.target.value);
                if (vendorFilter !== 'ALL') setVendorFilter('ALL');
              }}
              placeholder="Type Vendor name to filter..."
              className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
            />
            {vendorSearch && (
              <button
                type="button"
                onClick={() => setVendorSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                title="Clear vendor filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <datalist id="vendor-datalist">
              {vendors.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Row 2: Dropdowns, Date Sort & Reset Button */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            {/* District dropdown */}
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">All Districts ({districts.length})</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Vendor Dropdown */}
            <select
              value={vendorFilter}
              onChange={(e) => {
                setVendorFilter(e.target.value);
                if (e.target.value !== 'ALL') setVendorSearch('');
              }}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 max-w-[210px] truncate"
            >
              <option value="ALL">All Vendors ({vendors.length})</option>
              {vendors.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>

            {/* Section dropdown */}
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 max-w-[190px] truncate"
            >
              <option value="ALL">All Sections ({sections.length})</option>
              {sections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Date Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <select
                value={dateSortOrder}
                onChange={(e) => setDateSortOrder(e.target.value as 'desc' | 'asc' | 'none')}
                className="bg-transparent border-none text-xs font-medium text-gray-700 focus:outline-none cursor-pointer pr-1"
                title="Sort S-numbers by inspection date"
              >
                <option value="none">Sort: Date (Default)</option>
                <option value="desc">Date: Newest First ↓</option>
                <option value="asc">Date: Oldest First ↑</option>
              </select>
            </div>

            {/* DCR Hierarchy Link Status Dropdown */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <select
                value={hierarchyFilter}
                onChange={(e) => setHierarchyFilter(e.target.value as 'ALL' | 'UNLINKED' | 'LINKED')}
                className="bg-transparent border-none text-xs font-medium text-gray-700 focus:outline-none cursor-pointer pr-1"
                title="Filter by DCR hierarchy link status"
              >
                <option value="ALL">Hierarchy: All ({hierarchyCounts.total.toLocaleString('en-IN')})</option>
                <option value="UNLINKED">Hierarchy Not Defined ({hierarchyCounts.unlinked.toLocaleString('en-IN')})</option>
                <option value="LINKED">Hierarchy Defined ({hierarchyCounts.linked.toLocaleString('en-IN')})</option>
              </select>
            </div>
          </div>

          {/* Reset Filters Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                hasActiveFilters
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 shadow-sm cursor-pointer'
                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
              }`}
              title="Reset all search queries, filters and date sorting"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${hasActiveFilters ? 'text-amber-700' : 'text-gray-400'}`} />
              <span>Reset Filters</span>
              {activeFilters.length > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-600 text-white font-bold text-[10px] rounded-full">
                  {activeFilters.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Active Filters Pill Bar */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-gray-500">Active Filters:</span>
              {activeFilters.map((f, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[11px] font-medium"
                >
                  {f}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-[11px]">
                Showing <strong className="text-gray-900">{filteredReports.length.toLocaleString('en-IN')}</strong> of{' '}
                {reports.length.toLocaleString('en-IN')} reports
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-amber-700 hover:text-amber-900 font-semibold underline text-[11px]"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">
                  <div className="flex items-center justify-between gap-1.5">
                    <button
                      type="button"
                      onClick={toggleDateSort}
                      className="flex items-center gap-1.5 text-left font-semibold text-gray-700 hover:text-amber-800 uppercase tracking-wider group transition-colors"
                      title="Click to toggle Sort by Date (Newest / Oldest / Default)"
                    >
                      <span>S-Number / Date</span>
                      {dateSortOrder === 'desc' ? (
                        <span className="flex items-center text-amber-700 font-bold text-[10px] bg-amber-100 px-1.5 py-0.5 rounded">
                          Newest ↓
                        </span>
                      ) : dateSortOrder === 'asc' ? (
                        <span className="flex items-center text-amber-700 font-bold text-[10px] bg-amber-100 px-1.5 py-0.5 rounded">
                          Oldest ↑
                        </span>
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-amber-600 transition-colors" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCopyTarget('snumbers');
                        setCopyHierarchyFilter(hierarchyFilter === 'UNLINKED' ? 'unlinked_only' : hierarchyFilter === 'LINKED' ? 'linked_only' : 'all');
                        setCopyAllScope('all');
                        setShowCopySerialsModal(true);
                      }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded font-bold uppercase tracking-tight transition-colors"
                      title="Copy S-numbers (Complaint IDs)"
                    >
                      <Copy className="w-3 h-3 text-amber-700" />
                      <span>Copy</span>
                    </button>
                  </div>
                </th>
                <th className="px-4 py-3">Consumer & Contact</th>
                <th className="px-4 py-3">Solar Modules & Capacity</th>
                <th className="px-4 py-3">
                  <div className="flex items-center justify-between gap-1.5">
                    <span>Panel Serials</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCopyTarget('serials');
                          setCopyScope('all_serials');
                          setCopyAllScope('all');
                          setCopyHierarchyFilter(hierarchyFilter === 'UNLINKED' ? 'unlinked_only' : hierarchyFilter === 'LINKED' ? 'linked_only' : 'all');
                          setShowCopySerialsModal(true);
                        }}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-amber-600 hover:bg-amber-700 text-white rounded font-bold uppercase tracking-tight transition-colors shadow-2xs"
                        title="Copy ALL panel serial numbers in the list (all panels of each S-number)"
                      >
                        <Layers className="w-3 h-3" />
                        <span>Copy All</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCopyTarget('serials');
                          setCopyScope('one_per_snumber');
                          setCopyHierarchyFilter(hierarchyFilter === 'UNLINKED' ? 'unlinked_only' : hierarchyFilter === 'LINKED' ? 'linked_only' : 'all');
                          setShowCopySerialsModal(true);
                        }}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded font-bold uppercase tracking-tight transition-colors"
                        title="Copy 1 serial number per S-number"
                      >
                        <Copy className="w-3 h-3 text-amber-700" />
                        <span>1 Per S-No</span>
                      </button>
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3">Inverter Make & Serial</th>
                <th className="px-4 py-3">Net Meter No</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">PM Surya Subsidy</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-normal">
              {filteredReports.length > 0 ? (
                paginatedReports.map((report) => (
                  <tr key={report.complain_no} className="hover:bg-amber-50/40 transition-colors">
                    
                    {/* S-Number & Date */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedReport(report)}
                        className="font-mono font-bold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1"
                      >
                        {report.complain_no}
                      </button>
                      <span className="text-[11px] text-gray-500 block">
                        {report.inst_create_date || report.comp_date || '-'}
                      </span>
                    </td>

                    {/* Consumer & Contact */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 truncate max-w-[150px]">
                        {report.consumer_name || '-'}
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500 font-mono text-[11px]">
                        <span>{report.mobile_number || '-'}</span>
                        {report.mobile_number && (
                          <button
                            type="button"
                            onClick={() => copyText(report.mobile_number!, `mobile_${report.complain_no}`)}
                            title="Copy mobile"
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {copiedKey === `mobile_${report.complain_no}` ? (
                              <Check className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 block truncate max-w-[150px]">
                        {report.section_name} • SC: {report.sc_number}
                      </span>
                    </td>

                    {/* Solar Modules & Capacity */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-bold text-gray-900 block">
                        {report.module_capacity_kw || report.approved_cap_kw || '-'} kWp
                      </span>
                      <span className="text-[11px] text-gray-600 block">
                        {report.solar_panel_quantity} × {report.solar_panel_capacity_wp}W
                      </span>
                      <span className="text-[10px] text-gray-400 block truncate max-w-[130px]">
                        {report.solar_panel_manufacturer || '-'}
                      </span>
                    </td>

                    {/* Panel Serials Pill */}
                    <td className="px-4 py-3">
                      {report.solar_panel_serials.length > 0 ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                              {report.solar_panel_serials.length} Panels
                            </span>
                            {dcrIndexLoaded && (
                              dcrSNumbersSet.has(report.complain_no) ? (
                                <span className="text-[9px] bg-emerald-50 text-emerald-700 font-medium px-1.5 py-0.2 rounded border border-emerald-200" title="DCR supply chain trail verified">
                                  DCR Linked
                                </span>
                              ) : (
                                <span className="text-[9px] bg-amber-50 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-300" title="Hierarchy not defined yet">
                                  Pending DCR
                                </span>
                              )
                            )}
                            <button
                              type="button"
                              onClick={() => copyText(report.panel_serials_text, `serials_${report.complain_no}`)}
                              className="text-[10px] text-amber-700 hover:underline flex items-center gap-0.5 ml-auto"
                            >
                              {copiedKey === `serials_${report.complain_no}` ? 'Copied' : 'Copy All'}
                            </button>
                          </div>
                          <span className="font-mono text-[10px] text-gray-500 block truncate max-w-[150px]">
                            {report.solar_panel_serials.slice(0, 2).join(', ')}...
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400 italic text-[11px]">-</span>
                          <span className="text-[9px] bg-amber-50 text-amber-800 font-semibold px-1.5 py-0.5 rounded border border-amber-200" title="Equipment inspection pending / no panels recorded in ground report yet">
                            Pending Serials
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Inverter */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-gray-900 block truncate max-w-[130px]">
                        {report.inverter_manufacturer || '-'}
                      </span>
                      <span className="font-mono text-[11px] text-blue-800 block truncate max-w-[130px]">
                        {report.inverter_serial_number || '-'}
                      </span>
                      <span className="text-[10px] text-gray-400 block">
                        {report.inverter_capacity_kw || '-'} kW ({report.phase || 1}-Ph)
                      </span>
                    </td>

                    {/* Net Meter No */}
                    <td className="px-4 py-3 whitespace-nowrap font-mono font-semibold text-gray-900">
                      {report.new_mtr_sno || '-'}
                    </td>

                    {/* Vendor Name */}
                    <td className="px-4 py-3 text-gray-800 truncate max-w-[150px] font-medium">
                      {report.vendor_name ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSupplyChainTargetVendor(report.vendor_name!);
                            setShowSupplyChainModal(true);
                          }}
                          className="hover:text-indigo-600 hover:underline text-left truncate max-w-[150px] block font-semibold transition-colors flex items-center gap-1 group"
                          title="Click to view DCR supply chain & trade network for this vendor"
                        >
                          <span className="truncate">{report.vendor_name}</span>
                          <Network className="w-3 h-3 text-gray-400 group-hover:text-indigo-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Subsidy CFA */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-bold text-emerald-800 block">
                        {report.total_cfa_amt ? `₹${report.total_cfa_amt.toLocaleString('en-IN')}` : '-'}
                      </span>
                      <span className="text-[10px] text-gray-500 block">
                        Cost: ₹{report.total_installation_amt ? (report.total_installation_amt / 1000).toFixed(0) + 'k' : '-'}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedReport(report)}
                        className="px-2.5 py-1.5 bg-gray-100 hover:bg-amber-100 hover:text-amber-900 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        View Report
                      </button>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500 text-xs">
                    No S-Number Ground Reports found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* High-Performance Pagination Bar */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-gray-600">
              Showing <strong className="text-gray-900 font-semibold">{filteredReports.length === 0 ? 0 : ((currentPage - 1) * pageSize) + 1}</strong> to{' '}
              <strong className="text-gray-900 font-semibold">{Math.min(currentPage * pageSize, filteredReports.length).toLocaleString('en-IN')}</strong> of{' '}
              <strong className="text-gray-900 font-semibold">{filteredReports.length.toLocaleString('en-IN')}</strong> records
            </span>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-gray-500 text-[11px]">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors shadow-2xs"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors shadow-2xs"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 bg-white border border-gray-300 rounded-lg font-bold text-gray-900 text-xs shadow-2xs">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors shadow-2xs"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors shadow-2xs"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Downloader Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Download className="w-5 h-5 text-amber-600" />
                Bulk S-Numbers Ground Report Downloader
              </h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Paste a list of S-numbers (one per line, comma or space separated) to fetch their live Ground Reports from APEPDCL simultaneously.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setBulkInputText(
                    `S32608271235\nS32608271279\nS32608291396\nS32609040796\nS32609182475\nS32609192926\nS32609200234\nS32609210109\nS32609220445\nS32609222667\nS32609222835\nS32609230300\nS32609230332\nS32609231947\nS32609251216\nS32609260229\nS32609260887\nS32609260960\nS32608030989`
                  );
                }}
                className="text-xs px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-md border border-amber-200 transition-colors"
              >
                + Load Pithapuram S-Numbers (19 Preset)
              </button>
            </div>

            <textarea
              rows={8}
              value={bulkInputText}
              onChange={(e) => setBulkInputText(e.target.value)}
              disabled={isBulkDownloading}
              placeholder="Paste S-Numbers here (e.g. S32608030989, S32608271235...)"
              className="w-full p-3 font-mono text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />

            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Parallel Workers: {bulkConcurrency}</span>
              <input
                type="range"
                min={1}
                max={20}
                value={bulkConcurrency}
                onChange={(e) => setBulkConcurrency(parseInt(e.target.value, 10))}
                disabled={isBulkDownloading}
                className="w-32 cursor-pointer"
              />
            </div>

            {isBulkDownloading && bulkProgress && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs font-medium text-amber-900">
                  <span>Downloading {bulkProgress.current || ''}...</span>
                  <span>{bulkProgress.done} / {bulkProgress.total}</span>
                </div>
                <div className="w-full bg-amber-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-600 h-full transition-all duration-300"
                    style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                disabled={isBulkDownloading}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartBulkDownload}
                disabled={isBulkDownloading}
                className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
              >
                {isBulkDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isBulkDownloading ? 'Downloading...' : 'Start Download'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Serial Numbers Modal */}
      {/* Copy S-Numbers & Serial Numbers Modal */}
      {showCopySerialsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {copyTarget === 'snumbers' ? 'Copy S-Numbers (Complaint IDs)' : 'Copy Panel Serial Numbers'}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Export S-Numbers or panel serial numbers with full DCR hierarchy link filtering
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCopySerialsModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Success toast notification */}
            {copySuccessToast && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{copySuccessToast}</span>
              </div>
            )}

            {/* Target Selector Tabs: S-Numbers vs Panel Serials */}
            <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setCopyTarget('snumbers')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  copyTarget === 'snumbers'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>S-Numbers ({filteredReports.length.toLocaleString('en-IN')})</span>
              </button>
              <button
                type="button"
                onClick={() => setCopyTarget('serials')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  copyTarget === 'serials'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Panel Serials ({allSerialsInList.length.toLocaleString('en-IN')})</span>
              </button>
            </div>

            {/* DCR Hierarchy Status Filter Selector */}
            <div className="p-3 bg-gradient-to-r from-amber-50/70 via-white to-indigo-50/70 border border-amber-200/80 rounded-xl space-y-2 text-xs shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Hierarchy Filter:
                </span>
                <span className="text-[11px] font-mono text-gray-500">
                  {copyTarget === 'snumbers' ? (
                    <>
                      <strong className="text-amber-700">{unlinkedSNumbersCount.toLocaleString('en-IN')} unlinked</strong> • <strong className="text-emerald-700">{linkedSNumbersCount.toLocaleString('en-IN')} linked</strong>
                    </>
                  ) : (
                    <>
                      <strong className="text-amber-700">{unlinkedSerialsCount.toLocaleString('en-IN')} unlinked</strong> • <strong className="text-emerald-700">{linkedSerialsCount.toLocaleString('en-IN')} linked</strong>
                    </>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 p-1 bg-white border border-gray-200 rounded-lg text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCopyHierarchyFilter('unlinked_only')}
                  className={`py-2 px-2 rounded-md transition-all text-center flex flex-col items-center gap-0.5 ${
                    copyHierarchyFilter === 'unlinked_only'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  title={copyTarget === 'snumbers' ? 'Only copy S-numbers whose DCR hierarchy is not defined yet' : 'Only copy panel serial numbers whose DCR hierarchy is not defined yet'}
                >
                  <span>Hierarchy Not Defined</span>
                  <span className="text-[10px] font-normal opacity-90">
                    ({copyTarget === 'snumbers' ? `${unlinkedSNumbersCount.toLocaleString('en-IN')} unlinked` : `${unlinkedSerialsCount.toLocaleString('en-IN')} unlinked`})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCopyHierarchyFilter('all')}
                  className={`py-2 px-2 rounded-md transition-all text-center flex flex-col items-center gap-0.5 ${
                    copyHierarchyFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  title="Copy all regardless of link status"
                >
                  <span>Copy All</span>
                  <span className="text-[10px] font-normal opacity-90">
                    ({copyTarget === 'snumbers' ? `${filteredReports.length.toLocaleString('en-IN')} S-Nos` : `${allSerialsInList.length.toLocaleString('en-IN')} panels`})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCopyHierarchyFilter('linked_only')}
                  className={`py-2 px-2 rounded-md transition-all text-center flex flex-col items-center gap-0.5 ${
                    copyHierarchyFilter === 'linked_only'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  title="Only copy items that have verified DCR supply chain mapped"
                >
                  <span>Already Linked</span>
                  <span className="text-[10px] font-normal opacity-90">
                    ({copyTarget === 'snumbers' ? `${linkedSNumbersCount.toLocaleString('en-IN')} verified` : `${linkedSerialsCount.toLocaleString('en-IN')} verified`})
                  </span>
                </button>
              </div>

              {copyTarget === 'snumbers' ? (
                copyHierarchyFilter === 'unlinked_only' ? (
                  <div className="p-2 bg-amber-50 rounded-lg border border-amber-200/80 text-[11px] text-amber-950 flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Copying S-numbers with Hierarchy Not Defined</strong> ({unlinkedSNumbersCount.toLocaleString('en-IN')} S-numbers pending DCR), ready to paste into the National Portal or Bulk Downloader.
                    </span>
                  </div>
                ) : copyHierarchyFilter === 'all' ? (
                  <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-200/80 text-[11px] text-indigo-950 flex items-start gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Copying ALL S-numbers</strong> ({filteredReports.length.toLocaleString('en-IN')} complaints matching active filters).
                    </span>
                  </div>
                ) : (
                  <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200/80 text-[11px] text-emerald-950 flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Copying only verified S-numbers</strong> ({linkedSNumbersCount.toLocaleString('en-IN')} complaints with verified DCR supply chains).
                    </span>
                  </div>
                )
              ) : (
                copyHierarchyFilter === 'unlinked_only' ? (
                  <div className="p-2 bg-amber-50 rounded-lg border border-amber-200/80 text-[11px] text-amber-950 space-y-1">
                    <div className="flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Only copying unlinked panel serials</strong> ({unlinkedSerialsCount} panels pending DCR).
                      </span>
                    </div>
                    {unlinkedSNumbersCount > 0 && (
                      <p className="pl-5 text-[10px] text-amber-800">
                        Tip: {unlinkedSNumbersCount.toLocaleString('en-IN')} S-numbers have pending ground inspection / no panels recorded yet.{' '}
                        <button
                          type="button"
                          onClick={() => setCopyTarget('snumbers')}
                          className="font-bold underline text-amber-900 hover:text-amber-950 cursor-pointer"
                        >
                          Switch to Copy S-Numbers
                        </button>
                      </p>
                    )}
                  </div>
                ) : copyHierarchyFilter === 'all' ? (
                  <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-200/80 text-[11px] text-indigo-950 flex items-start gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Copying ALL panel serial numbers</strong> ({allSerialsInList.length.toLocaleString('en-IN')} panels).
                    </span>
                  </div>
                ) : (
                  <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200/80 text-[11px] text-emerald-950 flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Copying only verified panels</strong> with full DCR supply chain history already mapped.
                    </span>
                  </div>
                )
              )}
            </div>

            {/* Scope Details based on Mode */}
            {copyTarget === 'snumbers' ? (
              <div className="space-y-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs">
                <div className="text-gray-800 font-bold flex items-center justify-between">
                  <span>How many S-numbers do you want to copy?</span>
                  <span className="text-[11px] font-normal text-amber-800">
                    {availableSNumbersForCopy.length.toLocaleString('en-IN')} available S-numbers
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-800">
                    <input
                      type="radio"
                      name="copySNumbersScope"
                      checked={copyAllScope === 'all'}
                      onChange={() => setCopyAllScope('all')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>
                      <strong>Copy ALL matching S-numbers</strong> ({availableSNumbersForCopy.length.toLocaleString('en-IN')} S-numbers)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-800">
                    <input
                      type="radio"
                      name="copySNumbersScope"
                      checked={copyAllScope === 'first_n_snumbers'}
                      onChange={() => setCopyAllScope('first_n_snumbers')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>Limit to first</span>
                    <input
                      type="number"
                      min={1}
                      max={availableSNumbersForCopy.length || 1}
                      value={copySNumbersCount}
                      onClick={() => setCopyAllScope('first_n_snumbers')}
                      onChange={(e) => {
                        setCopyAllScope('first_n_snumbers');
                        setCopySNumbersCount(Math.max(1, parseInt(e.target.value, 10) || 1));
                      }}
                      className="w-24 px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span>S-numbers</span>
                  </label>

                  {/* S-Numbers Presets */}
                  {copyAllScope === 'first_n_snumbers' && (
                    <div className="flex items-center gap-1.5 flex-wrap pl-6 pt-0.5">
                      <span className="text-[10px] text-gray-400 font-medium">Presets:</span>
                      {[10, 25, 50, 100, 500, 1000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCopySNumbersCount(preset)}
                          className={`px-2 py-0.5 text-[11px] font-semibold rounded border transition-all ${
                            copySNumbersCount === preset
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {preset} S-Nos
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Panel Serials Mode */
              <div className="space-y-3">
                {/* Mode Switch Tabs: All Serials vs 1 per S-number */}
                <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setCopyScope('all_serials')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      copyScope === 'all_serials'
                        ? 'bg-white text-amber-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-amber-600" />
                    <span>All Serials ({availableSerialsForCopy.length.toLocaleString('en-IN')})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCopyScope('one_per_snumber')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      copyScope === 'one_per_snumber'
                        ? 'bg-white text-amber-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Copy className="w-3.5 h-3.5 text-amber-600" />
                    <span>1 per S-Number ({availableOnePerSNumberForCopy.length.toLocaleString('en-IN')})</span>
                  </button>
                </div>

                {copyScope === 'all_serials' ? (
                  <div className="space-y-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs">
                    <div className="text-gray-800 font-bold flex items-center justify-between">
                      <span>How many serial numbers do you want to copy?</span>
                      <span className="text-[11px] font-normal text-amber-800">
                        {availableSerialsForCopy.length.toLocaleString('en-IN')} available panels across {sNumbersWithPanelsCount} S-numbers
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-800">
                        <input
                          type="radio"
                          name="copyAllScope"
                          checked={copyAllScope === 'all'}
                          onChange={() => setCopyAllScope('all')}
                          className="text-amber-600 focus:ring-amber-500"
                        />
                        <span>
                          <strong>Copy ALL matching serial numbers</strong> ({availableSerialsForCopy.length.toLocaleString('en-IN')} panels from all {sNumbersWithPanelsCount} S-numbers)
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-800">
                        <input
                          type="radio"
                          name="copyAllScope"
                          checked={copyAllScope === 'first_n_snumbers'}
                          onChange={() => setCopyAllScope('first_n_snumbers')}
                          className="text-amber-600 focus:ring-amber-500"
                        />
                        <span>All serial numbers from first</span>
                        <input
                          type="number"
                          min={1}
                          max={sNumbersWithPanelsCount || 1}
                          value={copySNumbersCount}
                          onClick={() => setCopyAllScope('first_n_snumbers')}
                          onChange={(e) => {
                            setCopyAllScope('first_n_snumbers');
                            setCopySNumbersCount(Math.max(1, parseInt(e.target.value, 10) || 1));
                          }}
                          className="w-20 px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <span>S-numbers</span>
                      </label>

                      {copyAllScope === 'first_n_snumbers' && (
                        <div className="flex items-center gap-1.5 flex-wrap pl-6 pt-0.5">
                          <span className="text-[10px] text-gray-400 font-medium">Presets:</span>
                          {[5, 10, 20, 50, 100].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setCopySNumbersCount(preset)}
                              className={`px-2 py-0.5 text-[11px] font-semibold rounded border transition-all ${
                                copySNumbersCount === preset
                                  ? 'bg-amber-600 text-white border-amber-600'
                                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              {preset} S-Nos
                            </button>
                          ))}
                        </div>
                      )}

                      <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-800">
                        <input
                          type="radio"
                          name="copyAllScope"
                          checked={copyAllScope === 'limit_serials'}
                          onChange={() => setCopyAllScope('limit_serials')}
                          className="text-amber-600 focus:ring-amber-500"
                        />
                        <span>Limit to first</span>
                        <input
                          type="number"
                          min={1}
                          max={availableSerialsForCopy.length || 1}
                          value={copySerialsCount}
                          onClick={() => setCopyAllScope('limit_serials')}
                          onChange={(e) => {
                            setCopyAllScope('limit_serials');
                            setCopySerialsCount(Math.max(1, parseInt(e.target.value, 10) || 1));
                          }}
                          className="w-20 px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <span>serials</span>
                      </label>
                    </div>
                  </div>
                ) : (
                  /* 1 Serial Per S-Number Controls */
                  <div className="space-y-2 p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs">
                    <label className="block text-xs font-bold text-gray-800">
                      How many serial numbers do you want to copy? (1 per S-number)
                    </label>
                    <div className="flex items-center gap-2.5">
                      <input
                        ref={copyCountInputRef}
                        type="number"
                        min={1}
                        max={availableOnePerSNumberForCopy.length || 1}
                        value={copySerialsCount}
                        onChange={(e) => setCopySerialsCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCopyAction();
                        }}
                        className="w-28 px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                      />
                      <span className="text-xs text-gray-500 font-medium">
                        numbers (1 per S-number • {availableOnePerSNumberForCopy.length.toLocaleString('en-IN')} available S-numbers)
                      </span>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[11px] text-gray-400 font-medium mr-1">Presets:</span>
                      {[5, 10, 20, 50, 100].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setCopySerialsCount(preset);
                            copyCountInputRef.current?.focus();
                          }}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                            copySerialsCount === preset
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                      {availableOnePerSNumberForCopy.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCopySerialsCount(availableOnePerSNumberForCopy.length);
                            copyCountInputRef.current?.focus();
                          }}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                            copySerialsCount === availableOnePerSNumberForCopy.length
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          All ({availableOnePerSNumberForCopy.length})
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Options: Format & Prefix */}
            <div className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-gray-700">
                  <input
                    type="radio"
                    name="copyFormat"
                    checked={copySerialsFormat === 'newline'}
                    onChange={() => setCopySerialsFormat('newline')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span>One per line</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-gray-700">
                  <input
                    type="radio"
                    name="copyFormat"
                    checked={copySerialsFormat === 'comma'}
                    onChange={() => setCopySerialsFormat('comma')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span>Comma-separated</span>
                </label>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={includeSNumberPrefix}
                  onChange={(e) => setIncludeSNumberPrefix(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>
                  {copyTarget === 'snumbers' ? 'Include Details (Tabbed for Excel)' : 'Include S-Number'}
                </span>
              </label>
            </div>

            {/* Preview Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-gray-600 font-semibold">
                <span>
                  {copyTarget === 'snumbers'
                    ? `Preview (${snumbersToCopy.length.toLocaleString('en-IN')} S-numbers):`
                    : `Preview (${itemsToCopy.length.toLocaleString('en-IN')} serial numbers from ${new Set(itemsToCopy.map((i) => i.complain_no)).size.toLocaleString('en-IN')} S-numbers):`}
                </span>
                <span className="text-[11px] text-amber-700 font-mono font-medium">
                  {copyTarget === 'snumbers'
                    ? 'Complaint IDs'
                    : copyScope === 'all_serials'
                    ? 'All panels included'
                    : '1 serial per S-number'}
                </span>
              </div>
              <div className="max-h-44 overflow-y-auto bg-gray-900 text-amber-300 font-mono text-[11px] p-3 rounded-xl space-y-1 select-all border border-gray-800">
                {copyTarget === 'snumbers' ? (
                  snumbersToCopy.length > 0 ? (
                    snumbersToCopy.slice(0, 100).map((item, idx) => (
                      <div key={`${item.complain_no}_${idx}`} className="flex items-baseline justify-between gap-2 border-b border-gray-800/60 pb-1">
                        <span className="text-gray-500 select-none text-[10px]">#{idx + 1}</span>
                        <span className="text-amber-300 font-bold font-mono text-[11px]">
                          {item.complain_no}
                        </span>
                        <span className="text-gray-400 text-[10px] truncate max-w-[140px]">
                          {item.consumer_name || item.vendor_name || '-'}
                        </span>
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-sans font-bold ${
                            dcrSNumbersSet.has(item.complain_no)
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                              : 'bg-amber-950/80 text-amber-400 border border-amber-800'
                          }`}>
                            {dcrSNumbersSet.has(item.complain_no) ? 'Linked' : 'Pending DCR'}
                          </span>
                          {item.solar_panel_serials.length > 0 ? (
                            <span className="text-gray-400 text-[10px]">({item.solar_panel_serials.length} panels)</span>
                          ) : (
                            <span className="text-gray-500 text-[10px] italic">(no panels)</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 py-3 text-center">
                      No S-numbers match the "{copyHierarchyFilter === 'unlinked_only' ? 'Hierarchy Not Defined' : copyHierarchyFilter === 'linked_only' ? 'Already Linked' : 'All'}" filter.
                    </div>
                  )
                ) : itemsToCopy.length > 0 ? (
                  itemsToCopy.slice(0, 100).map((item, idx) => (
                    <div key={`${item.complain_no}_${item.serial}_${idx}`} className="flex items-baseline justify-between gap-2 border-b border-gray-800/60 pb-1">
                      <span className="text-gray-500 select-none text-[10px]">#{idx + 1}</span>
                      <span className="text-gray-400 text-[10px] truncate max-w-[150px]">
                        {item.complain_no}
                        {copyScope === 'all_serials' && (
                          <span className="text-gray-500 ml-1">
                            ({item.panelIndex}/{item.totalPanels})
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1.5 flex-1 justify-end">
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-sans font-bold ${
                          item.isLinked
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                            : 'bg-amber-950/80 text-amber-400 border border-amber-800'
                        }`}>
                          {item.isLinked ? 'Linked' : 'Pending DCR'}
                        </span>
                        <span className="text-amber-300 font-bold truncate font-mono">
                          {item.serial}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 py-3 text-center">
                    No panel serial numbers match the "{copyHierarchyFilter === 'unlinked_only' ? 'Hierarchy Not Defined' : copyHierarchyFilter === 'linked_only' ? 'Already Linked' : 'All'}" filter.
                  </div>
                )}
                {((copyTarget === 'snumbers' ? snumbersToCopy.length : itemsToCopy.length) > 100) && (
                  <div className="text-center text-gray-500 text-[10px] pt-1">
                    ... and {((copyTarget === 'snumbers' ? snumbersToCopy.length : itemsToCopy.length) - 100).toLocaleString('en-IN')} more items will be copied
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowCopySerialsModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCopyAction}
                disabled={copyTarget === 'snumbers' ? snumbersToCopy.length === 0 : itemsToCopy.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                {copySuccessToast ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>
                  {copySuccessToast
                    ? 'Copied to Clipboard!'
                    : copyTarget === 'snumbers'
                    ? copyHierarchyFilter === 'unlinked_only'
                      ? `Copy ${snumbersToCopy.length.toLocaleString('en-IN')} Unlinked S-Numbers (Pending DCR)`
                      : copyHierarchyFilter === 'linked_only'
                      ? `Copy ${snumbersToCopy.length.toLocaleString('en-IN')} Linked S-Numbers (Verified)`
                      : `Copy ${snumbersToCopy.length.toLocaleString('en-IN')} S-Numbers`
                    : copyHierarchyFilter === 'unlinked_only'
                    ? `Copy ${itemsToCopy.length.toLocaleString('en-IN')} Unlinked Serials (Pending DCR)`
                    : copyScope === 'all_serials'
                    ? `Copy All ${itemsToCopy.length.toLocaleString('en-IN')} Serial Numbers`
                    : `Copy ${itemsToCopy.length} Serial Numbers (1 per S-No)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* S-Number Detail Modal */}
      <SNumberDetailModal
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
      />

      {/* Vendor Supply Chain Intelligence Modal */}
      <VendorSupplyChainModal
        isOpen={showSupplyChainModal}
        onClose={() => setShowSupplyChainModal(false)}
        initialVendor={supplyChainTargetVendor}
      />

    </div>
  );
}
