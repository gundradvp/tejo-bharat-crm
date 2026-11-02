import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Search, Building2, ArrowRight, ArrowLeft, ArrowDownRight, ArrowUpRight,
  ShieldCheck, Package, Layers, ExternalLink, Copy, Check, FileSpreadsheet,
  TrendingUp, TrendingDown, Network, Factory, Users, Phone, MessageSquare,
  User, MapPin, Share2, Download, Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  loadVendorContactsMaster, lookupVendorContact, formatPhoneDisplay, 
  getTelLink, getWhatsAppLink, detectVendorDistrict 
} from '../../lib/vendorContactsService';
import { ContactsMasterData, VendorContact } from '../../types/vendorCRM';

interface SupplierInfo {
  supplier_name: string;
  panels_count: number;
  invoices: string[];
  manufacturers: string[];
  sample_serials: string[];
}

interface BuyerInfo {
  buyer_name: string;
  panels_count: number;
  invoices: string[];
  manufacturers: string[];
  sample_serials: string[];
}

interface VendorData {
  vendor_name: string;
  total_inbound_panels: number;
  total_outbound_panels: number;
  b2b_outbound_panels?: number;
  b2c_consumer_panels?: number;
  suppliers: SupplierInfo[];
  buyers: BuyerInfo[];
  manufacturers_handled: Record<string, number>;
}

interface ManufacturerRanking {
  rank: number;
  manufacturer_name: string;
  total_panels: number;
  share_percentage: number;
  tier1_buyers_count: number;
  top_tier1_buyers: Array<{
    buyer_name: string;
    panels_count: number;
    sample_invoices: string[];
  }>;
}

interface MasterData {
  summary: {
    total_dcr_chains: number;
    total_mapped_snumbers: number;
    total_entities_tracked: number;
    total_manufacturers?: number;
  };
  vendor_intelligence: Record<string, VendorData>;
  manufacturers_ranking?: ManufacturerRanking[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialVendor?: string;
}

export default function VendorSupplyChainModal({ isOpen, onClose, initialVendor = 'Venkata Siri' }: Props) {
  const [data, setData] = useState<MasterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialVendor);
  const [selectedVendorName, setSelectedVendorName] = useState(initialVendor);
  const [activeTab, setActiveTab] = useState<'both' | 'suppliers' | 'buyers' | 'manufacturers'>('both');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [contactsMaster, setContactsMaster] = useState<ContactsMasterData | null>(null);

  // Load contacts master
  useEffect(() => {
    if (!isOpen) return;
    loadVendorContactsMaster().then(cm => setContactsMaster(cm));
  }, [isOpen]);

  // Load supply chain master JSON from public folder
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/dcr_supply_chain_master.json')
      .then((res) => res.json())
      .then((json: MasterData) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load DCR supply chain master data:', err);
        setLoading(false);
      });
  }, [isOpen]);

  // Set default selection when initialVendor changes or modal opens
  useEffect(() => {
    if (initialVendor) {
      setSearchTerm(initialVendor);
      setSelectedVendorName(initialVendor);
    }
  }, [initialVendor, isOpen]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const copyVendorWhatsApp = (
    vendorName: string,
    panels: number,
    brands: string[],
    invoices: string[],
    contact: VendorContact | null,
    key: string
  ) => {
    let msg = `🏢 *${vendorName}*\n`;
    if (contact?.contactPersonName) {
      msg += `👤 *Contact:* ${contact.contactPersonName}\n`;
    }
    if (contact?.contactPersonMobile) {
      msg += `📱 *Phone:* +91 ${contact.contactPersonMobile}\n`;
    } else {
      msg += `📱 *Phone:* (Not in directory)\n`;
    }
    if (contact?.address || contact?.district) {
      msg += `📍 *Address:* ${[contact.address, contact.district].filter(Boolean).join(', ')}\n`;
    }
    if (panels) {
      msg += `📦 *Panels:* ${panels}`;
      if (brands.length > 0) msg += ` (${brands.join(', ')})`;
      msg += `\n`;
    }
    if (invoices.length > 0) {
      msg += `📄 *Invoices:* ${invoices.join(', ')}\n`;
    }
    copyToClipboard(msg.trim(), key);
  };

  const copyVendorExcelRow = (
    vendorName: string,
    panels: number,
    brands: string[],
    invoices: string[],
    contact: VendorContact | null,
    key: string
  ) => {
    const row = [
      vendorName,
      contact?.contactPersonName || '',
      contact?.contactPersonMobile ? `'${contact.contactPersonMobile}` : '',
      contact?.contactPersonEmail || '',
      (contact?.address || '').replace(/[\t\n\r]/g, ' '),
      contact?.district || '',
      panels,
      brands.join(', '),
      invoices.join(', ')
    ].join('\t');
    copyToClipboard(row, key);
  };

  const handleCopyBulkWhatsApp = (
    type: 'buyers' | 'suppliers',
    items: Array<{ name: string; panels: number; brands: string[]; invoices: string[]; contact?: VendorContact | null; district?: string }>,
    vendorName: string,
    districtLabel?: string
  ) => {
    if (items.length === 0) return;
    const baseTitle = type === 'buyers' ? `Who is Purchasing from ${vendorName}` : `Where ${vendorName} is Purchasing From`;
    const locTag = districtLabel && districtLabel !== 'ALL' ? ` [${districtLabel}]` : '';
    const header = `📋 *${baseTitle}${locTag}* (${items.length} Vendors)\n\n`;
    const entries = items.map((item, idx) => {
      const c = item.contact !== undefined ? item.contact : (contactsMaster ? lookupVendorContact(item.name, contactsMaster) : null);
      const dist = item.district || c?.district;
      let block = `${idx + 1}. *${item.name}*\n`;
      if (c?.contactPersonName) {
        block += `   👤 Contact: ${c.contactPersonName}\n`;
      }
      if (c?.contactPersonMobile) {
        block += `   📱 Phone: +91 ${c.contactPersonMobile}\n`;
      } else {
        block += `   📱 Phone: (Not in directory)\n`;
      }
      const locParts = [c?.address, dist].filter(Boolean);
      if (locParts.length > 0) {
        block += `   📍 Address: ${locParts.join(', ')}\n`;
      }
      block += `   📦 Panels: ${item.panels}`;
      if (item.brands.length > 0) block += ` (${item.brands.join(', ')})`;
      block += `\n`;
      if (item.invoices.length > 0) {
        block += `   📄 Invoices: ${item.invoices.join(', ')}\n`;
      }
      return block.trim();
    });

    copyToClipboard(header + entries.join('\n\n'), `${type}_whatsapp_bulk`);
  };

  const handleCopyBulkExcelTSV = (
    type: 'buyers' | 'suppliers',
    items: Array<{ name: string; panels: number; brands: string[]; invoices: string[]; contact?: VendorContact | null; district?: string }>
  ) => {
    if (items.length === 0) return;
    const headers = [
      'Vendor / Partner Name',
      'Contact Person',
      'Mobile Phone',
      'Email',
      'Address',
      'District',
      'Panels Count',
      'Brands',
      'Invoices / References'
    ];

    const rows = items.map((item) => {
      const c = item.contact !== undefined ? item.contact : (contactsMaster ? lookupVendorContact(item.name, contactsMaster) : null);
      const dist = item.district || c?.district || '';
      return [
        item.name,
        c?.contactPersonName || '',
        c?.contactPersonMobile ? `'${c.contactPersonMobile}` : '',
        c?.contactPersonEmail || '',
        (c?.address || '').replace(/[\t\n\r]/g, ' '),
        dist,
        item.panels,
        item.brands.join(', '),
        item.invoices.join(', ')
      ].join('\t');
    });

    const tsv = [headers.join('\t'), ...rows].join('\n');
    copyToClipboard(tsv, `${type}_excel_tsv`);
  };

  const handleDownloadExcelFile = (
    type: 'buyers' | 'suppliers',
    items: Array<{ name: string; panels: number; brands: string[]; invoices: string[]; contact?: VendorContact | null; district?: string }>,
    vendorName: string,
    districtLabel?: string
  ) => {
    if (items.length === 0) return;
    const cleanVendorName = vendorName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 24);
    const typeLabel = type === 'buyers' ? 'Buyers' : 'Suppliers';
    const cleanDist = districtLabel && districtLabel !== 'ALL' ? `_${districtLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}` : '';

    const rows = items.map((item, idx) => {
      const c = item.contact !== undefined ? item.contact : (contactsMaster ? lookupVendorContact(item.name, contactsMaster) : null);
      const dist = item.district || c?.district || '';
      return {
        'S.No': idx + 1,
        'Vendor / Partner Name': item.name,
        'Contact Person': c?.contactPersonName || '',
        'Mobile Phone': c?.contactPersonMobile || '',
        'Email': c?.contactPersonEmail || '',
        'Address': c?.address || '',
        'District': dist,
        'Panels Count': item.panels,
        'Brands': item.brands.join(', '),
        'Invoices / References': item.invoices.join(', ')
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 34 },
      { wch: 22 },
      { wch: 16 },
      { wch: 24 },
      { wch: 45 },
      { wch: 22 },
      { wch: 12 },
      { wch: 30 },
      { wch: 30 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${typeLabel}`.slice(0, 31));
    XLSX.writeFile(wb, `${cleanVendorName}_${typeLabel}${cleanDist}.xlsx`);
  };

  // List of all vendors in database
  const allVendorsList = useMemo(() => {
    if (!data?.vendor_intelligence) return [];
    return Object.keys(data.vendor_intelligence).sort((a, b) => {
      const totalA = (data.vendor_intelligence[a].total_inbound_panels || 0) + (data.vendor_intelligence[a].total_outbound_panels || 0);
      const totalB = (data.vendor_intelligence[b].total_inbound_panels || 0) + (data.vendor_intelligence[b].total_outbound_panels || 0);
      return totalB - totalA;
    });
  }, [data]);

  // Autocomplete / Filtered vendor names based on searchTerm
  const filteredVendors = useMemo(() => {
    if (!searchTerm.trim()) return allVendorsList.slice(0, 30);
    const q = searchTerm.toLowerCase().trim();
    return allVendorsList.filter((v) => v.toLowerCase().includes(q)).slice(0, 50);
  }, [searchTerm, allVendorsList]);

  // Best matching selected vendor
  const currentVendorData = useMemo(() => {
    if (!data?.vendor_intelligence) return null;
    
    // 1. Direct exact match by selectedVendorName
    if (selectedVendorName && data.vendor_intelligence[selectedVendorName]) {
      return data.vendor_intelligence[selectedVendorName];
    }
    
    // 2. Direct exact match by searchTerm
    if (searchTerm.trim() && data.vendor_intelligence[searchTerm.trim()]) {
      return data.vendor_intelligence[searchTerm.trim()];
    }

    // 3. Case-insensitive exact match
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const exactMatch = allVendorsList.find((v) => v.toLowerCase() === q);
      if (exactMatch) return data.vendor_intelligence[exactMatch];

      // 4. Starts-with or contains match
      const startsWithMatch = allVendorsList.find((v) => v.toLowerCase().startsWith(q));
      if (startsWithMatch) return data.vendor_intelligence[startsWithMatch];

      const substringMatch = allVendorsList.find((v) => v.toLowerCase().includes(q));
      if (substringMatch) return data.vendor_intelligence[substringMatch];
    }

    return null;
  }, [selectedVendorName, searchTerm, data, allVendorsList]);

  // Look up verified contact details for selected vendor
  const activeVendorContact = useMemo(() => {
    if (!currentVendorData || !contactsMaster) return null;
    return lookupVendorContact(currentVendorData.vendor_name, contactsMaster);
  }, [currentVendorData, contactsMaster]);

  // District & Location Filter state
  const [districtFilter, setDistrictFilter] = useState<string>('ALL');

  // Reset district filter whenever selected vendor changes
  useEffect(() => {
    setDistrictFilter('ALL');
  }, [selectedVendorName, searchTerm]);

  // Enrich suppliers with verified contact details and detected district
  const enrichedSuppliers = useMemo(() => {
    if (!currentVendorData) return [];
    return currentVendorData.suppliers.map((s) => {
      const contact = contactsMaster ? lookupVendorContact(s.supplier_name, contactsMaster) : null;
      let district = contact?.district;
      if (!district || district === 'Anakapalli') {
        district = detectVendorDistrict(contact?.address, s.supplier_name);
      }
      return {
        supplier: s,
        contact,
        district: district || 'Anakapalli'
      };
    });
  }, [currentVendorData, contactsMaster]);

  // Enrich buyers with verified contact details and detected district
  const enrichedBuyers = useMemo(() => {
    if (!currentVendorData) return [];
    return currentVendorData.buyers.map((b) => {
      const contact = contactsMaster ? lookupVendorContact(b.buyer_name, contactsMaster) : null;
      let district = contact?.district;
      if (!district || district === 'Anakapalli') {
        district = detectVendorDistrict(contact?.address, b.buyer_name);
      }
      return {
        buyer: b,
        contact,
        district: district || 'Anakapalli'
      };
    });
  }, [currentVendorData, contactsMaster]);

  // Compute available districts and counts for this vendor
  const districtOptions = useMemo(() => {
    if (!currentVendorData) return [];
    const map: Record<string, { suppliersCount: number; buyersCount: number; panelsCount: number }> = {};

    enrichedSuppliers.forEach(({ district, supplier }) => {
      if (!map[district]) map[district] = { suppliersCount: 0, buyersCount: 0, panelsCount: 0 };
      map[district].suppliersCount += 1;
      map[district].panelsCount += supplier.panels_count;
    });

    enrichedBuyers.forEach(({ district, buyer }) => {
      if (!map[district]) map[district] = { suppliersCount: 0, buyersCount: 0, panelsCount: 0 };
      map[district].buyersCount += 1;
      map[district].panelsCount += buyer.panels_count;
    });

    return Object.entries(map)
      .map(([district, stats]) => ({
        district,
        ...stats,
        totalCount: stats.suppliersCount + stats.buyersCount
      }))
      .sort((a, b) => b.totalCount - a.totalCount);
  }, [enrichedSuppliers, enrichedBuyers, currentVendorData]);

  // Filtered suppliers based on selected district
  const filteredSuppliers = useMemo(() => {
    if (districtFilter === 'ALL') return enrichedSuppliers;
    return enrichedSuppliers.filter((s) => s.district === districtFilter);
  }, [enrichedSuppliers, districtFilter]);

  // Filtered buyers based on selected district
  const filteredBuyers = useMemo(() => {
    if (districtFilter === 'ALL') return enrichedBuyers;
    return enrichedBuyers.filter((b) => b.district === districtFilter);
  }, [enrichedBuyers, districtFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-5 flex items-start justify-between border-b border-indigo-900/40">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Solar Panel DCR Supply Chain & Vendor Tracker
                </h2>
                <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Verified DCR Network
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-1">
                Track full vendor supply trails: <strong className="text-white">From where vendors purchase</strong> and <strong className="text-white">who is purchasing from them</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Quick Filter Bar */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 space-y-3">
          {/* Main Full-Width Search Input */}
          <div className="relative w-full">
            <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                const val = e.target.value;
                setSearchTerm(val);
                if (data?.vendor_intelligence && data.vendor_intelligence[val]) {
                  setSelectedVendorName(val);
                }
              }}
              placeholder="Type any vendor name to track (e.g. Venkata Siri, Tejo Bharat, Effisol, Freyr, Laxmi, Spectra...)"
              className="w-full pl-11 pr-10 py-3 bg-white border-2 border-indigo-200 rounded-2xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 shadow-sm transition-all"
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedVendorName('');
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Presets Strip */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mr-1">Quick Trace:</span>
            {[
              { label: 'Venkata Siri (All)', full: 'Venkata Siri (All Entities Consolidated)' },
              { label: 'Venkata Siri Pvt Ltd', full: 'Venkata Siri Solar Private Limited' },
              { label: 'Venkata Siri Power', full: 'Venkata Siri Solar Power' },
              { label: 'Tejo Bharat LLP', full: 'Tejo Bharat Global Energy LLP' },
              { label: 'Spectra Enterprises', full: 'Spectra Enterprises' },
              { label: 'Laxmi Industries', full: 'Laxmi Industries' },
              { label: 'Effisol Energy', full: 'Effisol Energy Solutions Private Limited' },
              { label: 'Freyr Energy', full: 'Freyr Energy Services Private Limited' },
              { label: 'Deepa Natural', full: 'Deepa natural power systems' },
            ].map(({ label, full }) => (
              <button
                key={full}
                type="button"
                onClick={() => {
                  setSearchTerm(full);
                  setSelectedVendorName(full);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                  currentVendorData?.vendor_name === full
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-indigo-50 hover:border-indigo-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Autocomplete / Suggested Matching Vendors */}
          {searchTerm.trim() && filteredVendors.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1 max-h-24 overflow-y-auto">
              <span className="text-[10px] text-gray-400 uppercase font-bold">Matches ({filteredVendors.length}):</span>
              {filteredVendors.slice(0, 15).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setSearchTerm(v);
                    setSelectedVendorName(v);
                  }}
                  className={`px-2.5 py-1 text-xs rounded-lg font-semibold border transition-all ${
                    currentVendorData?.vendor_name === v
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white hover:bg-indigo-50 text-indigo-800 border-indigo-200'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-gray-500">Loading verified DCR Supply Chain records (3,970+ chains)...</p>
            </div>
          ) : !currentVendorData ? (
            <div className="text-center py-16 space-y-3 bg-gray-50 rounded-2xl border border-gray-200">
              <Building2 className="w-10 h-10 text-gray-400 mx-auto" />
              <p className="text-sm font-semibold text-gray-700">No vendor found matching "{searchTerm}"</p>
              <p className="text-xs text-gray-400">
                Please select from the quick trace buttons above or type another vendor name.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Selected Vendor Overview Banner */}
              <div className="bg-gradient-to-br from-indigo-50 via-white to-amber-50 border border-indigo-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{currentVendorData.vendor_name}</h3>
                      <p className="text-xs text-gray-500">
                        Tracked in DCR Supply Chains across PM Surya Ghar Phase 3 ground reports
                      </p>
                    </div>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-right shadow-2xs">
                      <span className="text-[10px] text-emerald-700 font-bold uppercase block flex items-center justify-end gap-1">
                        <TrendingDown className="w-3 h-3" /> Inbound Purchased
                      </span>
                      <span className="text-base font-bold text-emerald-900">
                        {currentVendorData.total_inbound_panels.toLocaleString('en-IN')}{' '}
                        <span className="text-xs font-normal text-emerald-700">panels</span>
                      </span>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-right shadow-2xs">
                      <span className="text-[10px] text-blue-700 font-bold uppercase block flex items-center justify-end gap-1">
                        <TrendingUp className="w-3 h-3" /> B2B Resellers / Buyers
                      </span>
                      <span className="text-base font-bold text-blue-900">
                        {(currentVendorData.b2b_outbound_panels ?? currentVendorData.buyers.reduce((acc, b) => acc + b.panels_count, 0)).toLocaleString('en-IN')}{' '}
                        <span className="text-xs font-normal text-blue-700">panels</span>
                      </span>
                    </div>

                    {((currentVendorData.b2c_consumer_panels ?? 0) > 0) && (
                      <div className="bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 text-right shadow-2xs">
                        <span className="text-[10px] text-purple-700 font-bold uppercase block flex items-center justify-end gap-1">
                          <Users className="w-3 h-3" /> Retail Consumers (B2C)
                        </span>
                        <span className="text-base font-bold text-purple-900">
                          {currentVendorData.b2c_consumer_panels?.toLocaleString('en-IN')}{' '}
                          <span className="text-xs font-normal text-purple-700">installs</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Brands Handled */}
                {Object.keys(currentVendorData.manufacturers_handled).length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-indigo-100/60">
                    <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                      <Factory className="w-3.5 h-3.5 text-gray-400" />
                      Manufacturers / Brands Handled:
                    </span>
                    {Object.entries(currentVendorData.manufacturers_handled).map(([brand, count]) => (
                      <span
                        key={brand}
                        className="px-2 py-0.5 bg-white border border-gray-200 text-gray-800 rounded-lg text-xs font-medium shadow-2xs"
                      >
                        {brand}: <strong className="text-indigo-600">{count}</strong>
                      </span>
                    ))}
                  </div>
                )}

                {/* Verified Contact & 1-Click Dialing Card */}
                {activeVendorContact && (
                  <div className="bg-white/95 border border-emerald-200 rounded-xl p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs mt-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                        <User className="w-5 h-5 text-emerald-700" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-gray-900">
                            {activeVendorContact.contactPersonName || 'Authorized Contact'}
                          </span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                            Portal Registered
                          </span>
                          {activeVendorContact.district && (
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" /> {activeVendorContact.district}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate max-w-lg">
                          {activeVendorContact.address}
                        </p>
                      </div>
                    </div>

                    {/* Direct Calling & WhatsApp Actions */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      {activeVendorContact.contactPersonMobile ? (
                        <>
                          <a
                            href={getTelLink(activeVendorContact.contactPersonMobile)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Call {formatPhoneDisplay(activeVendorContact.contactPersonMobile)}</span>
                          </a>

                          <a
                            href={getWhatsAppLink(activeVendorContact.contactPersonMobile, currentVendorData.vendor_name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp Pitch</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => copyVendorWhatsApp(currentVendorData.vendor_name, currentVendorData.total_outbound_panels || currentVendorData.total_inbound_panels, Object.keys(currentVendorData.manufacturers_handled), [], activeVendorContact, 'vendor_card_wa')}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 rounded-xl text-xs font-bold transition-all shadow-2xs"
                            title="Copy full contact & address formatted for WhatsApp"
                          >
                            {copiedKey === 'vendor_card_wa' ? <Check className="w-3.5 h-3.5 text-teal-700" /> : <Share2 className="w-3.5 h-3.5 text-teal-700" />}
                            <span>{copiedKey === 'vendor_card_wa' ? 'Copied WhatsApp!' : 'Copy WhatsApp'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => copyVendorExcelRow(currentVendorData.vendor_name, currentVendorData.total_outbound_panels || currentVendorData.total_inbound_panels, Object.keys(currentVendorData.manufacturers_handled), [], activeVendorContact, 'vendor_card_xl')}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-2xs"
                            title="Copy vendor row to paste into Excel (TSV)"
                          >
                            {copiedKey === 'vendor_card_xl' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5 text-emerald-700" />}
                            <span>{copiedKey === 'vendor_card_xl' ? 'Copied for Excel!' : 'Copy for Excel'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => copyToClipboard(activeVendorContact.contactPersonMobile!, 'vendor_contact_mobile')}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                            title="Copy phone number"
                          >
                            {copiedKey === 'vendor_contact_mobile' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 font-semibold">Phone not in directory</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* View Tab Selector */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-200 pb-2.5 gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActiveTab('both')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      activeTab === 'both'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Complete 360° Flow (Both)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('suppliers')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      activeTab === 'suppliers'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Inbound: Where Purchasing From ({districtFilter === 'ALL' ? currentVendorData.suppliers.length : `${filteredSuppliers.length}/${currentVendorData.suppliers.length}`})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('buyers')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      activeTab === 'buyers'
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Outbound: Who is Purchasing From ({districtFilter === 'ALL' ? currentVendorData.buyers.length : `${filteredBuyers.length}/${currentVendorData.buyers.length}`})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('manufacturers')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                      activeTab === 'manufacturers'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    <Factory className="w-3.5 h-3.5" />
                    Manufacturers / Starters ({data?.manufacturers_ranking?.length || 41})
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                  <span>
                    {districtFilter === 'ALL'
                      ? `${currentVendorData.suppliers.length} Suppliers • ${currentVendorData.buyers.length} Buyers`
                      : `${filteredSuppliers.length} Sup • ${filteredBuyers.length} Buy (${districtFilter})`}
                  </span>
                </div>
              </div>

              {/* District & Location Filter Bar (Active for Both, Suppliers, and Buyers) */}
              {activeTab !== 'manufacturers' && (
                <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2 flex-wrap flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0">
                      <MapPin className="w-4 h-4 text-indigo-600" />
                      <span>Filter by District / Location:</span>
                    </div>

                    {/* District Dropdown Selector */}
                    <div className="relative min-w-[240px]">
                      <select
                        value={districtFilter}
                        onChange={(e) => setDistrictFilter(e.target.value)}
                        className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-slate-800 shadow-2xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
                      >
                        <option value="ALL">
                          🌐 All Districts / Locations ({currentVendorData.suppliers.length} Suppliers, {currentVendorData.buyers.length} Buyers)
                        </option>
                        {districtOptions.map((opt) => (
                          <option key={opt.district} value={opt.district}>
                            📍 {opt.district} ({opt.buyersCount} Buyers{opt.suppliersCount > 0 ? `, ${opt.suppliersCount} Suppliers` : ''})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quick District Filter Pills for top districts */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setDistrictFilter('ALL')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          districtFilter === 'ALL'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        All ({currentVendorData.suppliers.length + currentVendorData.buyers.length})
                      </button>

                      {districtOptions.slice(0, 6).map((opt) => (
                        <button
                          key={opt.district}
                          type="button"
                          onClick={() => setDistrictFilter(opt.district)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                            districtFilter === opt.district
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200'
                          }`}
                        >
                          <span>{opt.district}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              districtFilter === opt.district
                                ? 'bg-indigo-800 text-indigo-100'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {activeTab === 'buyers'
                              ? opt.buyersCount
                              : activeTab === 'suppliers'
                              ? opt.suppliersCount
                              : opt.totalCount}
                          </span>
                        </button>
                      ))}

                      {districtFilter !== 'ALL' && (
                        <button
                          type="button"
                          onClick={() => setDistrictFilter('ALL')}
                          className="text-[11px] text-rose-600 hover:text-rose-700 font-bold px-2 py-1 rounded-lg hover:bg-rose-50 border border-rose-200 flex items-center gap-1 transition-colors"
                          title="Reset district filter to show all"
                        >
                          <X className="w-3 h-3" />
                          <span>Reset</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter Status Badge */}
                  <div className="text-right shrink-0">
                    {districtFilter === 'ALL' ? (
                      <span className="text-[11px] text-slate-400">All locations shown</span>
                    ) : (
                      <span className="text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 text-[11px]">
                        <MapPin className="w-3 h-3 text-indigo-600" />
                        {districtFilter} ({filteredSuppliers.length} Sup, {filteredBuyers.length} Buy)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Tables Section: Manufacturers Leaderboard OR Inbound/Outbound Split */}
              {activeTab === 'manufacturers' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Factory className="w-4 h-4 text-amber-600" />
                        <span>All Solar Module Manufacturers (Start of DCR Hierarchy)</span>
                      </h4>
                      <p className="text-xs text-gray-500">
                        Total {data?.manufacturers_ranking?.length || 41} primary manufacturers identified across 23,780 verified DCR module chains. Click any manufacturer to trace their downstream distribution network.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="max-h-[520px] overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase tracking-wider text-[11px] sticky top-0">
                          <tr>
                            <th className="px-3.5 py-2.5 text-center w-12">#</th>
                            <th className="px-3.5 py-2.5">Manufacturer (Hierarchy Originator)</th>
                            <th className="px-3.5 py-2.5 text-center">Panels</th>
                            <th className="px-3.5 py-2.5 text-center">State Share</th>
                            <th className="px-3.5 py-2.5">Direct Tier-1 Distributors</th>
                            <th className="px-3.5 py-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data?.manufacturers_ranking?.map((m) => (
                            <tr key={m.manufacturer_name} className="hover:bg-amber-50/40 transition-colors">
                              <td className="px-3.5 py-2.5 text-center font-bold text-gray-500">
                                {m.rank <= 3 ? (
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                    m.rank === 1 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                    m.rank === 2 ? 'bg-slate-200 text-slate-800' : 'bg-orange-100 text-orange-800'
                                  }`}>
                                    {m.rank}
                                  </span>
                                ) : (
                                  m.rank
                                )}
                              </td>
                              <td className="px-3.5 py-2.5 font-bold text-gray-900">
                                <div>
                                  <span>{m.manufacturer_name}</span>
                                </div>
                              </td>
                              <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold rounded-md">
                                  {m.total_panels.toLocaleString('en-IN')}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 text-center whitespace-nowrap font-semibold text-gray-700">
                                {m.share_percentage}%
                              </td>
                              <td className="px-3.5 py-2.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {m.top_tier1_buyers.slice(0, 3).map((b) => (
                                    <button
                                      key={b.buyer_name}
                                      type="button"
                                      onClick={() => {
                                        setSearchTerm(b.buyer_name);
                                        setSelectedVendorName(b.buyer_name);
                                        setActiveTab('both');
                                      }}
                                      className="px-2 py-0.5 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-gray-200 rounded text-[11px] font-medium transition-colors"
                                      title={`Click to trace ${b.buyer_name} (${b.panels_count} panels)`}
                                    >
                                      {b.buyer_name}: <strong className="text-gray-900">{b.panels_count}</strong>
                                    </button>
                                  ))}
                                  {m.tier1_buyers_count > 3 && (
                                    <span className="text-[10px] text-gray-400 font-medium">
                                      +{m.tier1_buyers_count - 3} more
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSearchTerm(m.manufacturer_name);
                                    setSelectedVendorName(m.manufacturer_name);
                                    setActiveTab('both');
                                  }}
                                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs transition-colors inline-flex items-center gap-1"
                                >
                                  Trace Tree <ArrowRight className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                /* Inbound & Outbound Tables */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* INBOUND: Where Purchasing From */}
                {(activeTab === 'both' || activeTab === 'suppliers') && (
                  <div className={`space-y-3 ${activeTab === 'suppliers' ? 'lg:col-span-2' : ''}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ArrowDownRight className="w-4 h-4 text-emerald-600 shrink-0" />
                        <h4 className="text-sm font-bold text-gray-900">
                          Where {currentVendorData.vendor_name} is Purchasing From
                        </h4>
                        <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full shrink-0">
                          {districtFilter === 'ALL'
                            ? `${currentVendorData.suppliers.length} Suppliers`
                            : `${filteredSuppliers.length} / ${currentVendorData.suppliers.length} Suppliers (${districtFilter})`}
                        </span>
                      </div>

                      {/* Bulk Copy & Export Options */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleCopyBulkWhatsApp(
                            'suppliers',
                            filteredSuppliers.map(s => ({
                              name: s.supplier.supplier_name,
                              panels: s.supplier.panels_count,
                              brands: s.supplier.manufacturers,
                              invoices: s.supplier.invoices,
                              contact: s.contact,
                              district: s.district
                            })),
                            currentVendorData.vendor_name,
                            districtFilter
                          )}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 rounded-lg text-[11px] font-bold shadow-2xs transition-all active:scale-95"
                          title={`Copy ${filteredSuppliers.length} suppliers with phone numbers & addresses formatted for WhatsApp`}
                        >
                          {copiedKey === 'suppliers_whatsapp_bulk' ? <Check className="w-3.5 h-3.5 text-teal-700" /> : <MessageSquare className="w-3.5 h-3.5 text-teal-700" />}
                          <span>{copiedKey === 'suppliers_whatsapp_bulk' ? 'Copied WhatsApp!' : `Copy WhatsApp (${filteredSuppliers.length})`}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyBulkExcelTSV(
                            'suppliers',
                            filteredSuppliers.map(s => ({
                              name: s.supplier.supplier_name,
                              panels: s.supplier.panels_count,
                              brands: s.supplier.manufacturers,
                              invoices: s.supplier.invoices,
                              contact: s.contact,
                              district: s.district
                            }))
                          )}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold shadow-2xs transition-all active:scale-95"
                          title={`Copy ${filteredSuppliers.length} suppliers table to clipboard to paste directly into Excel`}
                        >
                          {copiedKey === 'suppliers_excel_tsv' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5 text-emerald-700" />}
                          <span>{copiedKey === 'suppliers_excel_tsv' ? 'Copied for Excel!' : `Copy for Excel (${filteredSuppliers.length})`}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadExcelFile(
                            'suppliers',
                            filteredSuppliers.map(s => ({
                              name: s.supplier.supplier_name,
                              panels: s.supplier.panels_count,
                              brands: s.supplier.manufacturers,
                              invoices: s.supplier.invoices,
                              contact: s.contact,
                              district: s.district
                            })),
                            currentVendorData.vendor_name,
                            districtFilter
                          )}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-lg text-[11px] font-bold shadow-2xs transition-all active:scale-95"
                          title="Download Excel spreadsheet file (.xlsx)"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700" />
                          <span>Export .xlsx ({filteredSuppliers.length})</span>
                        </button>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                      <div className="max-h-[480px] overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase tracking-wider text-[11px] sticky top-0">
                            <tr>
                              <th className="px-3.5 py-2.5">Supplier / Seller</th>
                              <th className="px-3.5 py-2.5 text-center">Panels</th>
                              <th className="px-3.5 py-2.5">Brands</th>
                              <th className="px-3.5 py-2.5">Invoices / Ref</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filteredSuppliers.length > 0 ? (
                              filteredSuppliers.map(({ supplier: s, contact: sc, district }, idx) => {
                                return (
                                  <tr key={s.supplier_name} className="hover:bg-emerald-50/40 transition-colors">
                                    <td className="px-3.5 py-2.5 font-medium text-gray-900">
                                      <div className="flex items-center justify-between gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSearchTerm(s.supplier_name);
                                            setSelectedVendorName(s.supplier_name);
                                          }}
                                          className="text-left hover:text-indigo-600 hover:underline flex items-center gap-1 group font-bold text-gray-900"
                                          title="Click to trace this supplier"
                                        >
                                          <span>{s.supplier_name}</span>
                                          <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>

                                        <div className="flex items-center gap-1 shrink-0">
                                          {sc?.contactPersonMobile && (
                                            <>
                                              <a
                                                href={getTelLink(sc.contactPersonMobile)}
                                                className="p-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                                                title={`Call ${sc.contactPersonName || s.supplier_name}: +91 ${sc.contactPersonMobile}`}
                                              >
                                                <Phone className="w-3 h-3" />
                                              </a>
                                              <a
                                                href={getWhatsAppLink(sc.contactPersonMobile, s.supplier_name)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1 rounded-md bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors"
                                                title={`WhatsApp ${s.supplier_name}`}
                                              >
                                                <MessageSquare className="w-3 h-3" />
                                              </a>
                                            </>
                                          )}

                                          {/* Copy for WhatsApp */}
                                          <button
                                            type="button"
                                            onClick={() => copyVendorWhatsApp(s.supplier_name, s.panels_count, s.manufacturers, s.invoices, sc, `sup_wa_${idx}`)}
                                            className="p-1 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-700 transition-colors"
                                            title="Copy contact & address to paste into WhatsApp"
                                          >
                                            {copiedKey === `sup_wa_${idx}` ? <Check className="w-3 h-3 text-green-600" /> : <Share2 className="w-3 h-3" />}
                                          </button>

                                          {/* Copy Row for Excel */}
                                          <button
                                            type="button"
                                            onClick={() => copyVendorExcelRow(s.supplier_name, s.panels_count, s.manufacturers, s.invoices, sc, `sup_tsv_${idx}`)}
                                            className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                            title="Copy vendor row to paste into Excel (TSV)"
                                          >
                                            {copiedKey === `sup_tsv_${idx}` ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                                          </button>
                                        </div>
                                      </div>

                                      {/* Subtitle with District Badge, Phone, Contact Person, and Address */}
                                      <div className="text-[11px] text-gray-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                                        {/* Clickable District Badge */}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setDistrictFilter(district);
                                          }}
                                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-semibold text-[10px] transition-colors ${
                                            districtFilter === district
                                              ? 'bg-indigo-600 text-white'
                                              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60'
                                          }`}
                                          title={`Filter by ${district}`}
                                        >
                                          <MapPin className="w-2.5 h-2.5 shrink-0" />
                                          <span>{district}</span>
                                        </button>

                                        {sc?.contactPersonMobile && (
                                          <span className="font-mono text-emerald-700 font-semibold flex items-center gap-0.5">
                                            <Phone className="w-2.5 h-2.5 text-emerald-600" />
                                            +91 {sc.contactPersonMobile}
                                          </span>
                                        )}
                                        {sc?.contactPersonName && (
                                          <span className="text-gray-700 font-medium">
                                            • 👤 {sc.contactPersonName}
                                          </span>
                                        )}
                                        {sc?.address && (
                                          <span className="text-gray-500 truncate max-w-[200px]" title={sc.address}>
                                            • {sc.address}
                                          </span>
                                        )}
                                        {!sc && (
                                          <span className="text-[10px] text-gray-400 italic">
                                            Directory record unlisted
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md">
                                        {s.panels_count}
                                      </span>
                                    </td>
                                    <td className="px-3.5 py-2.5 text-gray-600 truncate max-w-[140px]" title={s.manufacturers.join(', ')}>
                                      {s.manufacturers.join(', ') || '-'}
                                    </td>
                                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-gray-500 truncate max-w-[130px]" title={s.invoices.join(', ')}>
                                      {s.invoices.length > 0 ? (
                                        <div className="flex items-center gap-1">
                                          <span className="truncate">{s.invoices.join(', ')}</span>
                                          <button
                                            type="button"
                                            onClick={() => copyToClipboard(s.invoices.join('\n'), `inv_sup_${idx}`)}
                                            className="text-gray-400 hover:text-gray-600"
                                            title="Copy invoice numbers"
                                          >
                                            {copiedKey === `inv_sup_${idx}` ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                                          </button>
                                        </div>
                                      ) : (
                                        <span className="text-gray-400 italic">Direct / Stock</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={4} className="text-center py-10 space-y-2">
                                  <p className="text-xs text-gray-500 font-medium">
                                    No suppliers found for {currentVendorData.vendor_name} in <strong className="text-indigo-700">{districtFilter}</strong>.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => setDistrictFilter('ALL')}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline"
                                  >
                                    Reset filter to show all {currentVendorData.suppliers.length} suppliers
                                  </button>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* OUTBOUND: Who is Purchasing From */}
                {(activeTab === 'both' || activeTab === 'buyers') && (
                  <div className={`space-y-3 ${activeTab === 'buyers' ? 'lg:col-span-2' : ''}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ArrowUpRight className="w-4 h-4 text-blue-600 shrink-0" />
                        <h4 className="text-sm font-bold text-gray-900">
                          Who is Purchasing from {currentVendorData.vendor_name}
                        </h4>
                        <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full shrink-0">
                          {districtFilter === 'ALL'
                            ? `${currentVendorData.buyers.length} Buyers`
                            : `${filteredBuyers.length} / ${currentVendorData.buyers.length} Buyers (${districtFilter})`}
                        </span>
                      </div>

                      {/* Bulk Copy & Export Options */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleCopyBulkWhatsApp(
                            'buyers',
                            filteredBuyers.map(b => ({
                              name: b.buyer.buyer_name,
                              panels: b.buyer.panels_count,
                              brands: b.buyer.manufacturers,
                              invoices: b.buyer.invoices,
                              contact: b.contact,
                              district: b.district
                            })),
                            currentVendorData.vendor_name,
                            districtFilter
                          )}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 rounded-lg text-[11px] font-bold shadow-2xs transition-all active:scale-95"
                          title={`Copy ${filteredBuyers.length} buyers with phone numbers & addresses formatted for WhatsApp`}
                        >
                          {copiedKey === 'buyers_whatsapp_bulk' ? <Check className="w-3.5 h-3.5 text-teal-700" /> : <MessageSquare className="w-3.5 h-3.5 text-teal-700" />}
                          <span>{copiedKey === 'buyers_whatsapp_bulk' ? 'Copied WhatsApp!' : `Copy WhatsApp (${filteredBuyers.length})`}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyBulkExcelTSV(
                            'buyers',
                            filteredBuyers.map(b => ({
                              name: b.buyer.buyer_name,
                              panels: b.buyer.panels_count,
                              brands: b.buyer.manufacturers,
                              invoices: b.buyer.invoices,
                              contact: b.contact,
                              district: b.district
                            }))
                          )}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold shadow-2xs transition-all active:scale-95"
                          title={`Copy ${filteredBuyers.length} buyers table to clipboard to paste directly into Excel`}
                        >
                          {copiedKey === 'buyers_excel_tsv' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5 text-emerald-700" />}
                          <span>{copiedKey === 'buyers_excel_tsv' ? 'Copied for Excel!' : `Copy for Excel (${filteredBuyers.length})`}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadExcelFile(
                            'buyers',
                            filteredBuyers.map(b => ({
                              name: b.buyer.buyer_name,
                              panels: b.buyer.panels_count,
                              brands: b.buyer.manufacturers,
                              invoices: b.buyer.invoices,
                              contact: b.contact,
                              district: b.district
                            })),
                            currentVendorData.vendor_name,
                            districtFilter
                          )}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-lg text-[11px] font-bold shadow-2xs transition-all active:scale-95"
                          title="Download Excel spreadsheet file (.xlsx)"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700" />
                          <span>Export .xlsx ({filteredBuyers.length})</span>
                        </button>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                      <div className="max-h-[480px] overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase tracking-wider text-[11px] sticky top-0">
                            <tr>
                              <th className="px-3.5 py-2.5">Buyer / Reseller / Partner (Strictly B2B)</th>
                              <th className="px-3.5 py-2.5 text-center">Panels</th>
                              <th className="px-3.5 py-2.5">Brands</th>
                              <th className="px-3.5 py-2.5">Invoices / Ref</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filteredBuyers.length > 0 ? (
                              filteredBuyers.map(({ buyer: b, contact: bc, district }, idx) => {
                                return (
                                  <tr key={b.buyer_name} className="hover:bg-blue-50/40 transition-colors">
                                    <td className="px-3.5 py-2.5 font-medium text-gray-900">
                                      <div className="flex items-center justify-between gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSearchTerm(b.buyer_name);
                                            setSelectedVendorName(b.buyer_name);
                                          }}
                                          className="text-left hover:text-indigo-600 hover:underline flex items-center gap-1 group font-bold text-gray-900"
                                          title="Click to trace this buyer"
                                        >
                                          <span>{b.buyer_name}</span>
                                          <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>

                                        <div className="flex items-center gap-1 shrink-0">
                                          {bc?.contactPersonMobile && (
                                            <>
                                              <a
                                                href={getTelLink(bc.contactPersonMobile)}
                                                className="p-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                                                title={`Call ${bc.contactPersonName || b.buyer_name}: +91 ${bc.contactPersonMobile}`}
                                              >
                                                <Phone className="w-3 h-3" />
                                              </a>
                                              <a
                                                href={getWhatsAppLink(bc.contactPersonMobile, b.buyer_name)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1 rounded-md bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors"
                                                title={`WhatsApp ${b.buyer_name}`}
                                              >
                                                <MessageSquare className="w-3 h-3" />
                                              </a>
                                            </>
                                          )}

                                          {/* Copy for WhatsApp */}
                                          <button
                                            type="button"
                                            onClick={() => copyVendorWhatsApp(b.buyer_name, b.panels_count, b.manufacturers, b.invoices, bc, `buy_wa_${idx}`)}
                                            className="p-1 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-700 transition-colors"
                                            title="Copy contact & address to paste into WhatsApp"
                                          >
                                            {copiedKey === `buy_wa_${idx}` ? <Check className="w-3 h-3 text-green-600" /> : <Share2 className="w-3 h-3" />}
                                          </button>

                                          {/* Copy Row for Excel */}
                                          <button
                                            type="button"
                                            onClick={() => copyVendorExcelRow(b.buyer_name, b.panels_count, b.manufacturers, b.invoices, bc, `buy_tsv_${idx}`)}
                                            className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                            title="Copy vendor row to paste into Excel (TSV)"
                                          >
                                            {copiedKey === `buy_tsv_${idx}` ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                                          </button>
                                        </div>
                                      </div>

                                      {/* Subtitle with District Badge, Phone, Contact Person, and Address */}
                                      <div className="text-[11px] text-gray-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                                        {/* Clickable District Badge */}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setDistrictFilter(district);
                                          }}
                                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-semibold text-[10px] transition-colors ${
                                            districtFilter === district
                                              ? 'bg-blue-600 text-white'
                                              : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60'
                                          }`}
                                          title={`Filter by ${district}`}
                                        >
                                          <MapPin className="w-2.5 h-2.5 shrink-0" />
                                          <span>{district}</span>
                                        </button>

                                        {bc?.contactPersonMobile && (
                                          <span className="font-mono text-emerald-700 font-semibold flex items-center gap-0.5">
                                            <Phone className="w-2.5 h-2.5 text-emerald-600" />
                                            +91 {bc.contactPersonMobile}
                                          </span>
                                        )}
                                        {bc?.contactPersonName && (
                                          <span className="text-gray-700 font-medium">
                                            • 👤 {bc.contactPersonName}
                                          </span>
                                        )}
                                        {bc?.address && (
                                          <span className="text-gray-500 truncate max-w-[200px]" title={bc.address}>
                                            • {bc.address}
                                          </span>
                                        )}
                                        {!bc && (
                                          <span className="text-[10px] text-gray-400 italic">
                                            Directory record unlisted
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded-md">
                                        {b.panels_count}
                                      </span>
                                    </td>
                                    <td className="px-3.5 py-2.5 text-gray-600 truncate max-w-[140px]" title={b.manufacturers.join(', ')}>
                                      {b.manufacturers.join(', ') || '-'}
                                    </td>
                                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-gray-500 truncate max-w-[130px]" title={b.invoices.join(', ')}>
                                      {b.invoices.length > 0 ? (
                                        <div className="flex items-center gap-1">
                                          <span className="truncate">{b.invoices.join(', ')}</span>
                                          <button
                                            type="button"
                                            onClick={() => copyToClipboard(b.invoices.join('\n'), `inv_buy_${idx}`)}
                                            className="text-gray-400 hover:text-gray-600"
                                            title="Copy invoice numbers"
                                          >
                                            {copiedKey === `inv_buy_${idx}` ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                                          </button>
                                        </div>
                                      ) : (
                                        <span className="text-gray-400 italic">Direct / Consumer</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={4} className="text-center py-10 space-y-2">
                                  <p className="text-xs text-gray-500 font-medium">
                                    No buyers found for {currentVendorData.vendor_name} in <strong className="text-indigo-700">{districtFilter}</strong>.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => setDistrictFilter('ALL')}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline"
                                  >
                                    Reset filter to show all {currentVendorData.buyers.length} buyers
                                  </button>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

              </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-gray-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Mapped across {data?.summary?.total_dcr_chains?.toLocaleString('en-IN') || '3,970'} DCR supply chains & {data?.summary?.total_mapped_snumbers?.toLocaleString('en-IN') || '3,974'} S-numbers</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-colors shadow-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
