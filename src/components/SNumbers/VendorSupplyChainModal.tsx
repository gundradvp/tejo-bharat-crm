import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Search, Building2, ArrowRight, ArrowLeft, ArrowDownRight, ArrowUpRight,
  ShieldCheck, Package, Layers, ExternalLink, Copy, Check, FileSpreadsheet,
  TrendingUp, TrendingDown, Network, Factory, Users, Phone, MessageSquare,
  User, MapPin, Share2, Download, Filter, Calendar, CalendarDays, Hash,
  FileText, CheckCircle2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  loadVendorContactsMaster, lookupVendorContact, formatPhoneDisplay, 
  getTelLink, getWhatsAppLink, detectVendorDistrict 
} from '../../lib/vendorContactsService';
import { ContactsMasterData, VendorContact } from '../../types/vendorCRM';

export interface EdgePanelItem {
  serial: string;
  invoice?: string;
}

export interface SupplierInfo {
  supplier_name: string;
  panels_count: number;
  invoices: string[];
  manufacturers: string[];
  sample_serials: string[];
  panels?: EdgePanelItem[];
}

export interface BuyerInfo {
  buyer_name: string;
  panels_count: number;
  invoices: string[];
  manufacturers: string[];
  sample_serials: string[];
  panels?: EdgePanelItem[];
}

export interface SerialMeta {
  date?: string;
  comp_date?: string;
  sno?: string;
  consumer?: string;
  app?: string;
  mfr?: string;
}

export interface ResolvedPanelRecord {
  serial: string;
  invoice: string;
  dateInserted: string;
  datePurchase: string;
  sNumber: string;
  consumerName: string;
  appId: string;
  manufacturer: string;
}

export interface PanelDetailsModalData {
  partnerName: string;
  currentVendorName: string;
  type: 'supplier' | 'buyer';
  panelsCount: number;
  invoices: string[];
  manufacturers: string[];
  panels: ResolvedPanelRecord[];
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
    total_dcr_serials?: number;
  };
  vendor_intelligence: Record<string, VendorData>;
  serial_metadata?: Record<string, SerialMeta>;
  manufacturers_ranking?: ManufacturerRanking[];
  snumber_dcr_map?: Record<string, any>;
}

export const getShortBrandName = (name: string): string => {
  if (!name) return '';
  const cleaned = name
    .replace(/\s+(Private|Pvt\.?|Limited|Ltd\.?)\b/gi, '')
    .trim();
  return cleaned || name;
};

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
    districtLabel?: string,
    brandLabel?: string
  ) => {
    if (items.length === 0) return;
    const baseTitle = type === 'buyers' ? `Who is Purchasing from ${vendorName}` : `Where ${vendorName} is Purchasing From`;
    const filterParts = [
      districtLabel && districtLabel !== 'ALL' ? districtLabel : '',
      brandLabel && brandLabel !== 'ALL' ? getShortBrandName(brandLabel) : ''
    ].filter(Boolean);
    const locTag = filterParts.length > 0 ? ` [${filterParts.join(' • ')}]` : '';
    const partnerRole = type === 'buyers' ? 'Vendors/Buyers' : 'Sellers/Suppliers';
    const header = `📋 *${baseTitle}${locTag}* (${items.length} ${partnerRole})\n\n`;
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
    districtLabel?: string,
    brandLabel?: string
  ) => {
    if (items.length === 0) return;
    const cleanVendorName = vendorName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 24);
    const typeLabel = type === 'buyers' ? 'Buyers' : 'Suppliers';
    const cleanDist = districtLabel && districtLabel !== 'ALL' ? `_${districtLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}` : '';
    const cleanBrand = brandLabel && brandLabel !== 'ALL' ? `_${getShortBrandName(brandLabel).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 16)}` : '';

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
    XLSX.writeFile(wb, `${cleanVendorName}_${typeLabel}${cleanDist}${cleanBrand}.xlsx`);
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

  // Always-Visible Global Brand Filter state
  const [globalBrandFilter, setGlobalBrandFilter] = useState<string>('ALL');

  // Compute all 41 brands across the entire dataset (always available, regardless of vendor)
  const allGlobalBrands = useMemo(() => {
    if (!data) return [];
    const brandMap: Record<string, { name: string; panels: number; rank: number; sellers: Set<string>; buyers: Set<string> }> = {};

    if (data.manufacturers_ranking) {
      data.manufacturers_ranking.forEach((m) => {
        brandMap[m.manufacturer_name] = {
          name: m.manufacturer_name,
          panels: m.total_panels,
          rank: m.rank,
          sellers: new Set(),
          buyers: new Set()
        };
      });
    }

    if (data.vendor_intelligence) {
      Object.entries(data.vendor_intelligence).forEach(([_, vData]) => {
        (vData.suppliers || []).forEach((s) => {
          (s.manufacturers || []).forEach((m) => {
            const brand = m?.trim();
            if (!brand) return;
            if (!brandMap[brand]) {
              brandMap[brand] = { name: brand, panels: 0, rank: 999, sellers: new Set(), buyers: new Set() };
            }
            brandMap[brand].sellers.add(s.supplier_name);
          });
        });

        (vData.buyers || []).forEach((b) => {
          (b.manufacturers || []).forEach((m) => {
            const brand = m?.trim();
            if (!brand) return;
            if (!brandMap[brand]) {
              brandMap[brand] = { name: brand, panels: 0, rank: 999, sellers: new Set(), buyers: new Set() };
            }
            brandMap[brand].buyers.add(b.buyer_name);
          });
        });
      });
    }

    return Object.values(brandMap)
      .map((b) => ({
        name: b.name,
        panels: b.panels,
        rank: b.rank,
        sellersCount: b.sellers.size,
        buyersCount: b.buyers.size
      }))
      .sort((a, b) => b.panels - a.panels);
  }, [data]);

  // Top brands for quick 1-click pills
  const topBrandsList = useMemo(() => {
    return allGlobalBrands.slice(0, 8);
  }, [allGlobalBrands]);

  // Synthesize network-wide vendor data when a brand is selected without a specific vendor
  const brandNetworkData = useMemo(() => {
    if (!data?.vendor_intelligence || globalBrandFilter === 'ALL') return null;

    const brand = globalBrandFilter;
    const supplierMap = new Map<string, SupplierInfo & { invSet: Set<string> }>();
    const buyerMap = new Map<string, BuyerInfo & { invSet: Set<string> }>();

    for (const [_, vData] of Object.entries(data.vendor_intelligence)) {
      (vData.suppliers || []).forEach((s) => {
        if ((s.manufacturers || []).some((m) => m.toLowerCase().trim() === brand.toLowerCase().trim())) {
          const key = s.supplier_name;
          if (!supplierMap.has(key)) {
            supplierMap.set(key, {
              supplier_name: key,
              panels_count: 0,
              invoices: [],
              manufacturers: [brand],
              sample_serials: [],
              panels: [],
              invSet: new Set()
            });
          }
          const entry = supplierMap.get(key)!;
          entry.panels_count += s.panels_count;
          (s.invoices || []).forEach((inv) => entry.invSet.add(inv));
          if (s.panels && entry.panels && entry.panels.length < 500) {
            entry.panels.push(...s.panels.slice(0, 500 - entry.panels.length));
          }
        }
      });

      (vData.buyers || []).forEach((b) => {
        if ((b.manufacturers || []).some((m) => m.toLowerCase().trim() === brand.toLowerCase().trim())) {
          const key = b.buyer_name;
          if (!buyerMap.has(key)) {
            buyerMap.set(key, {
              buyer_name: key,
              panels_count: 0,
              invoices: [],
              manufacturers: [brand],
              sample_serials: [],
              panels: [],
              invSet: new Set()
            });
          }
          const entry = buyerMap.get(key)!;
          entry.panels_count += b.panels_count;
          (b.invoices || []).forEach((inv) => entry.invSet.add(inv));
          if (b.panels && entry.panels && entry.panels.length < 500) {
            entry.panels.push(...b.panels.slice(0, 500 - entry.panels.length));
          }
        }
      });
    }

    const suppliers: SupplierInfo[] = Array.from(supplierMap.values())
      .map((s) => ({
        supplier_name: s.supplier_name,
        panels_count: s.panels_count,
        invoices: Array.from(s.invSet),
        manufacturers: s.manufacturers,
        sample_serials: s.sample_serials,
        panels: s.panels
      }))
      .sort((a, b) => b.panels_count - a.panels_count);

    const buyers: BuyerInfo[] = Array.from(buyerMap.values())
      .map((b) => ({
        buyer_name: b.buyer_name,
        panels_count: b.panels_count,
        invoices: Array.from(b.invSet),
        manufacturers: b.manufacturers,
        sample_serials: b.sample_serials,
        panels: b.panels
      }))
      .sort((a, b) => b.panels_count - a.panels_count);

    const rankingInfo = (data.manufacturers_ranking || []).find(
      (m) => m.manufacturer_name.toLowerCase().trim() === brand.toLowerCase().trim()
    );
    const inboundTotal = suppliers.reduce((acc, s) => acc + s.panels_count, 0);
    const outboundTotal = buyers.reduce((acc, b) => acc + b.panels_count, 0);
    const totalPanels = rankingInfo?.total_panels || inboundTotal;

    const res: VendorData = {
      vendor_name: `${brand} (All State Entities Consolidated)`,
      total_inbound_panels: totalPanels,
      total_outbound_panels: outboundTotal,
      b2b_outbound_panels: outboundTotal,
      b2c_consumer_panels: 0,
      suppliers,
      buyers,
      manufacturers_handled: { [brand]: totalPanels }
    };
    return res;
  }, [data, globalBrandFilter]);

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

    // 5. If no specific vendor matched, but a brand is selected globally -> show complete brand network
    if (brandNetworkData) {
      return brandNetworkData;
    }

    return null;
  }, [selectedVendorName, searchTerm, data, allVendorsList, brandNetworkData]);

  // Look up verified contact details for selected vendor
  const activeVendorContact = useMemo(() => {
    if (!currentVendorData || !contactsMaster) return null;
    return lookupVendorContact(currentVendorData.vendor_name, contactsMaster);
  }, [currentVendorData, contactsMaster]);

  // District & Location Filter state
  const [districtFilter, setDistrictFilter] = useState<string>('ALL');

  // Brand Filter state (unified master filter or individual seller / buyer filters)
  const [supplierBrandFilter, setSupplierBrandFilter] = useState<string>('ALL');
  const [buyerBrandFilter, setBuyerBrandFilter] = useState<string>('ALL');

  // Global brand selector handler (syncs top dropdown and table filters)
  const handleSelectGlobalBrand = (brand: string) => {
    setGlobalBrandFilter(brand);
    setSupplierBrandFilter(brand);
    setBuyerBrandFilter(brand);
  };

  // Master brand selector handler (sets both sellers and buyers together)
  const handleSelectMasterBrand = (brand: string) => {
    handleSelectGlobalBrand(brand);
  };

  // Reset district filter whenever selected vendor changes, sync brand filters
  useEffect(() => {
    setDistrictFilter('ALL');
    setSupplierBrandFilter(globalBrandFilter);
    setBuyerBrandFilter(globalBrandFilter);
  }, [selectedVendorName, searchTerm, globalBrandFilter]);

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

  // Compute available brands for suppliers (sellers)
  const supplierBrandOptions = useMemo(() => {
    if (!enrichedSuppliers.length) return [];
    const map: Record<string, { suppliersCount: number; panelsCount: number }> = {};
    enrichedSuppliers.forEach(({ supplier }) => {
      (supplier.manufacturers || []).forEach((mfr) => {
        const brand = mfr.trim();
        if (!brand) return;
        if (!map[brand]) map[brand] = { suppliersCount: 0, panelsCount: 0 };
        map[brand].suppliersCount += 1;
        map[brand].panelsCount += supplier.panels_count;
      });
    });
    return Object.entries(map)
      .map(([brand, stats]) => ({ brand, ...stats }))
      .sort((a, b) => b.panelsCount - a.panelsCount);
  }, [enrichedSuppliers]);

  // Compute available brands for buyers (vendors)
  const buyerBrandOptions = useMemo(() => {
    if (!enrichedBuyers.length) return [];
    const map: Record<string, { buyersCount: number; panelsCount: number }> = {};
    enrichedBuyers.forEach(({ buyer }) => {
      (buyer.manufacturers || []).forEach((mfr) => {
        const brand = mfr.trim();
        if (!brand) return;
        if (!map[brand]) map[brand] = { buyersCount: 0, panelsCount: 0 };
        map[brand].buyersCount += 1;
        map[brand].panelsCount += buyer.panels_count;
      });
    });
    return Object.entries(map)
      .map(([brand, stats]) => ({ brand, ...stats }))
      .sort((a, b) => b.panelsCount - a.panelsCount);
  }, [enrichedBuyers]);

  // Compute all available brands across both sellers & buyers (and vendor's own handled brands)
  const allBrandOptions = useMemo(() => {
    if (!currentVendorData) return [];
    const map: Record<string, { suppliersCount: number; buyersCount: number; panelsCount: number }> = {};

    // First seed from manufacturers_handled if present
    if (currentVendorData.manufacturers_handled) {
      Object.entries(currentVendorData.manufacturers_handled).forEach(([mfr, count]) => {
        const brand = mfr.trim();
        if (!brand) return;
        map[brand] = { suppliersCount: 0, buyersCount: 0, panelsCount: count };
      });
    }

    // Aggregate supplier counts
    enrichedSuppliers.forEach(({ supplier }) => {
      (supplier.manufacturers || []).forEach((mfr) => {
        const brand = mfr.trim();
        if (!brand) return;
        if (!map[brand]) map[brand] = { suppliersCount: 0, buyersCount: 0, panelsCount: 0 };
        map[brand].suppliersCount += 1;
        if (!currentVendorData.manufacturers_handled?.[brand]) {
          map[brand].panelsCount += supplier.panels_count;
        }
      });
    });

    // Aggregate buyer counts
    enrichedBuyers.forEach(({ buyer }) => {
      (buyer.manufacturers || []).forEach((mfr) => {
        const brand = mfr.trim();
        if (!brand) return;
        if (!map[brand]) map[brand] = { suppliersCount: 0, buyersCount: 0, panelsCount: 0 };
        map[brand].buyersCount += 1;
        if (!currentVendorData.manufacturers_handled?.[brand]) {
          map[brand].panelsCount += buyer.panels_count;
        }
      });
    });

    return Object.entries(map)
      .map(([brand, stats]) => ({
        brand,
        ...stats,
        totalPartners: stats.suppliersCount + stats.buyersCount
      }))
      .sort((a, b) => b.panelsCount - a.panelsCount);
  }, [currentVendorData, enrichedSuppliers, enrichedBuyers]);

  // Current unified master brand value ('ALL', a specific brand, or 'CUSTOM' if mismatched)
  const masterBrandValue =
    supplierBrandFilter === buyerBrandFilter
      ? supplierBrandFilter
      : 'CUSTOM';

  // Filtered suppliers based on selected district and brand
  const filteredSuppliers = useMemo(() => {
    return enrichedSuppliers.filter((s) => {
      const matchDistrict = districtFilter === 'ALL' || s.district === districtFilter;
      const matchBrand =
        supplierBrandFilter === 'ALL' ||
        (s.supplier.manufacturers || []).some(
          (m) => m.toLowerCase().trim() === supplierBrandFilter.toLowerCase().trim()
        );
      return matchDistrict && matchBrand;
    });
  }, [enrichedSuppliers, districtFilter, supplierBrandFilter]);

  // Filtered buyers based on selected district and brand
  const filteredBuyers = useMemo(() => {
    return enrichedBuyers.filter((b) => {
      const matchDistrict = districtFilter === 'ALL' || b.district === districtFilter;
      const matchBrand =
        buyerBrandFilter === 'ALL' ||
        (b.buyer.manufacturers || []).some(
          (m) => m.toLowerCase().trim() === buyerBrandFilter.toLowerCase().trim()
        );
      return matchDistrict && matchBrand;
    });
  }, [enrichedBuyers, districtFilter, buyerBrandFilter]);

  // Panel Details Modal State (triggered when clicking on panel count pills e.g. 56)
  const [activePanelsModal, setActivePanelsModal] = useState<PanelDetailsModalData | null>(null);
  const [panelSearchTerm, setPanelSearchTerm] = useState('');
  const [panelInvoiceFilter, setPanelInvoiceFilter] = useState('ALL');
  const [panelCopiedKey, setPanelCopiedKey] = useState<string | null>(null);

  // Close panel modal on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activePanelsModal) {
        e.stopPropagation();
        setActivePanelsModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePanelsModal]);

  const handleOpenPanelsModal = (
    type: 'supplier' | 'buyer',
    partnerName: string,
    panelsCount: number,
    edgePanels?: EdgePanelItem[],
    sampleSerials?: string[],
    invoices?: string[],
    manufacturers?: string[]
  ) => {
    if (!currentVendorData) return;

    let items: Array<{ serial: string; invoice: string }> = [];
    if (edgePanels && edgePanels.length > 0) {
      items = edgePanels.map((p) => ({
        serial: p.serial,
        invoice: p.invoice || ''
      }));
    } else if (sampleSerials && sampleSerials.length > 0) {
      items = sampleSerials.map((s, idx) => ({
        serial: s,
        invoice: invoices?.[idx % (invoices.length || 1)] || ''
      }));
    }

    const resolvedPanels: ResolvedPanelRecord[] = items.map((item) => {
      const meta = data?.serial_metadata?.[item.serial];
      return {
        serial: item.serial,
        invoice: item.invoice || '',
        dateInserted: meta?.date || '',
        datePurchase: meta?.comp_date || '',
        sNumber: meta?.sno || '',
        consumerName: meta?.consumer || '',
        appId: meta?.app || '',
        manufacturer: meta?.mfr || manufacturers?.[0] || ''
      };
    });

    setPanelSearchTerm('');
    setPanelInvoiceFilter('ALL');
    setActivePanelsModal({
      partnerName,
      currentVendorName: currentVendorData.vendor_name,
      type,
      panelsCount,
      invoices: invoices || [],
      manufacturers: manufacturers || [],
      panels: resolvedPanels
    });
  };

  const filteredModalPanels = useMemo(() => {
    if (!activePanelsModal) return [];
    return activePanelsModal.panels.filter((p) => {
      if (panelInvoiceFilter !== 'ALL' && (p.invoice || 'Direct / Stock') !== panelInvoiceFilter) {
        return false;
      }
      if (!panelSearchTerm.trim()) return true;
      const q = panelSearchTerm.toLowerCase().trim();
      return (
        p.serial.toLowerCase().includes(q) ||
        p.invoice.toLowerCase().includes(q) ||
        p.dateInserted.toLowerCase().includes(q) ||
        p.datePurchase.toLowerCase().includes(q) ||
        p.sNumber.toLowerCase().includes(q) ||
        p.consumerName.toLowerCase().includes(q) ||
        p.appId.toLowerCase().includes(q) ||
        p.manufacturer.toLowerCase().includes(q)
      );
    });
  }, [activePanelsModal, panelInvoiceFilter, panelSearchTerm]);

  const modalInvoiceOptions = useMemo(() => {
    if (!activePanelsModal) return [];
    const counts: Record<string, number> = {};
    activePanelsModal.panels.forEach((p) => {
      const inv = p.invoice || 'Direct / Stock';
      counts[inv] = (counts[inv] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [activePanelsModal]);

  const handleCopyModalSerials = () => {
    if (!filteredModalPanels.length) return;
    const text = filteredModalPanels.map((p) => p.serial).join('\n');
    navigator.clipboard.writeText(text);
    setPanelCopiedKey('all_serials');
    setTimeout(() => setPanelCopiedKey(null), 1800);
  };

  const handleCopyModalTSV = () => {
    if (!filteredModalPanels.length || !activePanelsModal) return;
    const headers = [
      'S.No',
      'Panel Serial Number',
      'Date Inserted into System',
      'Date of Purchase / Application',
      'Invoice / Ref',
      'Brand / Manufacturer',
      'S-Number (Complaint No)',
      'Consumer Name',
      'Application ID',
      'Supplier / Seller',
      'Buyer / Partner'
    ];
    const fromEntity = activePanelsModal.type === 'supplier' ? activePanelsModal.partnerName : activePanelsModal.currentVendorName;
    const toEntity = activePanelsModal.type === 'supplier' ? activePanelsModal.currentVendorName : activePanelsModal.partnerName;

    const rows = filteredModalPanels.map((p, idx) => [
      idx + 1,
      p.serial,
      p.dateInserted || '',
      p.datePurchase || '',
      p.invoice || '',
      p.manufacturer || '',
      p.sNumber || '',
      p.consumerName || '',
      p.appId || '',
      fromEntity,
      toEntity
    ].join('\t'));

    const tsv = [headers.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(tsv);
    setPanelCopiedKey('tsv_table');
    setTimeout(() => setPanelCopiedKey(null), 1800);
  };

  const handleExportModalExcel = () => {
    if (!filteredModalPanels.length || !activePanelsModal) return;
    const fromEntity = activePanelsModal.type === 'supplier' ? activePanelsModal.partnerName : activePanelsModal.currentVendorName;
    const toEntity = activePanelsModal.type === 'supplier' ? activePanelsModal.currentVendorName : activePanelsModal.partnerName;

    const rows = filteredModalPanels.map((p, idx) => ({
      'S.No': idx + 1,
      'Panel Serial Number': p.serial,
      'Date Inserted into System': p.dateInserted || '',
      'Date of Purchase / Application': p.datePurchase || '',
      'Invoice / Ref': p.invoice || '',
      'Brand / Manufacturer': p.manufacturer || '',
      'S-Number (Complaint No)': p.sNumber || '',
      'Consumer Name': p.consumerName || '',
      'Application ID': p.appId || '',
      'Supplier / Seller': fromEntity,
      'Buyer / Partner': toEntity
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 18 },
      { wch: 20 },
      { wch: 16 },
      { wch: 28 },
      { wch: 18 },
      { wch: 24 },
      { wch: 24 },
      { wch: 32 },
      { wch: 32 }
    ];

    const wb = XLSX.utils.book_new();
    const sheetName = `${activePanelsModal.partnerName.slice(0, 20)}_Panels`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

    const cleanPartner = activePanelsModal.partnerName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 20);
    const cleanCurrent = activePanelsModal.currentVendorName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 20);
    XLSX.writeFile(wb, `${cleanPartner}_to_${cleanCurrent}_${activePanelsModal.panels.length}_Panels.xlsx`);
  };

  const formatDateString = (d?: string) => {
    if (!d) return '-';
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, day] = d.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mIdx = parseInt(m, 10) - 1;
      return `${day}-${months[mIdx] || m}-${y}`;
    }
    return d;
  };

  if (!isOpen) return null;

  return (
    <>
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

        {/* Search & Global Brand Filter Bar (ALWAYS VISIBLE AT TOP) */}
        <div className="p-4 bg-slate-50/95 border-b border-gray-200 space-y-3">
          {/* Row 1: Vendor Search Input + Always-Visible Brand Dropdown */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Main Vendor Search Input */}
            <div className="relative flex-1">
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
                placeholder="Search vendor name (e.g. Venkata Siri, Tejo Bharat, Spectra, Laxmi...)"
                className="w-full pl-11 pr-10 py-2.5 bg-white border-2 border-indigo-200 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 shadow-2xs transition-all"
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
                  title="Clear vendor search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* ALWAYS VISIBLE BRAND / MANUFACTURER DROPDOWN */}
            <div className="relative md:w-80 shrink-0">
              <div className="relative flex items-center">
                <Factory className="w-4 h-4 text-amber-600 absolute left-3 pointer-events-none" />
                <select
                  value={globalBrandFilter}
                  onChange={(e) => handleSelectGlobalBrand(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-amber-50/80 border-2 border-amber-300 hover:border-amber-400 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 cursor-pointer transition-all"
                >
                  <option value="ALL">
                    🏭 Filter All by Brand: All Brands ({allGlobalBrands.length})
                  </option>
                  {allGlobalBrands.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name} ({m.panels.toLocaleString('en-IN')} panels • {m.sellersCount} sellers, {m.buyersCount} vendors)
                    </option>
                  ))}
                </select>
                {globalBrandFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => handleSelectGlobalBrand('ALL')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Reset brand filter to show all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Top Brands Quick Pills (ALWAYS VISIBLE) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Factory className="w-3 h-3 text-amber-600" />
              <span>Brands:</span>
            </span>

            <button
              type="button"
              onClick={() => handleSelectGlobalBrand('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                globalBrandFilter === 'ALL'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white hover:bg-amber-50 text-slate-700 border border-slate-200'
              }`}
            >
              All Brands
            </button>

            {topBrandsList.map((m) => {
              const isSelected = globalBrandFilter === m.name;
              return (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => handleSelectGlobalBrand(isSelected ? 'ALL' : m.name)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                    isSelected
                      ? 'bg-amber-600 text-white shadow-2xs ring-2 ring-amber-300'
                      : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200'
                  }`}
                  title={`${m.name}: ${m.panels.toLocaleString('en-IN')} panels • ${m.sellersCount} sellers, ${m.buyersCount} buyers`}
                >
                  <span>{getShortBrandName(m.name)}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-amber-800 text-amber-100'
                        : 'bg-amber-50 text-amber-800 border border-amber-200/50'
                    }`}
                  >
                    {m.panels >= 1000 ? `${(m.panels / 1000).toFixed(m.panels % 1000 === 0 ? 0 : 1)}k` : m.panels}
                  </span>
                </button>
              );
            })}

            {globalBrandFilter !== 'ALL' && (
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1 ml-auto">
                <Check className="w-3 h-3 text-amber-700" />
                <span>Active: {getShortBrandName(globalBrandFilter)}</span>
              </span>
            )}
          </div>

          {/* Row 3: Quick Presets Strip (Vendors) */}
          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-200/70">
            <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mr-1">Quick Trace:</span>
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
            ].map(({ label, full }) => {
              const vData = data?.vendor_intelligence?.[full];
              const brandPanels = globalBrandFilter !== 'ALL' && vData?.manufacturers_handled?.[globalBrandFilter];
              const isSelected = currentVendorData?.vendor_name === full;
              return (
                <button
                  key={full}
                  type="button"
                  onClick={() => {
                    setSearchTerm(full);
                    setSelectedVendorName(full);
                  }}
                  className={`px-2.5 py-1 text-xs font-bold rounded-xl border transition-all flex items-center gap-1 ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-indigo-50 hover:border-indigo-400'
                  }`}
                >
                  <span>{label}</span>
                  {brandPanels ? (
                    <span
                      className={`text-[10px] px-1 py-0.2 rounded-full font-mono ${
                        isSelected ? 'bg-indigo-800 text-indigo-100' : 'bg-amber-100 text-amber-900 font-bold'
                      }`}
                      title={`${brandPanels} panels of ${globalBrandFilter}`}
                    >
                      {brandPanels}p
                    </span>
                  ) : null}
                </button>
              );
            })}
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
            <div className="space-y-6">
              {searchTerm ? (
                <div className="text-center py-12 space-y-3 bg-gray-50 rounded-2xl border border-gray-200">
                  <Building2 className="w-10 h-10 text-gray-400 mx-auto" />
                  <p className="text-sm font-semibold text-gray-700">No vendor found matching "{searchTerm}"</p>
                  <p className="text-xs text-gray-400">
                    Please select a brand from the dropdown above or pick from the quick trace buttons.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedVendorName('');
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                  >
                    Clear search filter
                  </button>
                </div>
              ) : (
                <div className="text-center py-10 px-4 bg-gradient-to-br from-indigo-50/40 via-white to-amber-50/40 rounded-2xl border border-indigo-100 space-y-2">
                  <Network className="w-10 h-10 text-indigo-600 mx-auto" />
                  <h3 className="text-base font-bold text-gray-900">
                    Solar Panel DCR Network Intelligence
                  </h3>
                  <p className="text-xs text-gray-500 max-w-lg mx-auto">
                    Select any brand from the dropdown above to filter all sellers and vendors across Andhra Pradesh, or search for a specific vendor.
                  </p>
                </div>
              )}

              {/* Grid of all Brands */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Factory className="w-4 h-4 text-amber-600" />
                  <span>Explore All {allGlobalBrands.length} Solar Panel Brands (Click to Filter All Sellers & Vendors)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allGlobalBrands.map((m) => (
                    <button
                      key={m.name}
                      type="button"
                      onClick={() => handleSelectGlobalBrand(m.name)}
                      className="p-3.5 bg-white hover:bg-amber-50/60 border border-slate-200 hover:border-amber-300 rounded-xl text-left transition-all shadow-2xs hover:shadow-xs group cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-amber-800 truncate">
                          {m.name}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-700 shrink-0" />
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                        <span className="font-bold text-amber-700">
                          {m.panels.toLocaleString('en-IN')} panels
                        </span>
                        <span>•</span>
                        <span>{m.sellersCount} Sellers</span>
                        <span>•</span>
                        <span>{m.buyersCount} Vendors</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
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
                      <span>Manufacturers / Brands Handled:</span>
                      <span className="text-[10px] text-indigo-500 font-normal hidden sm:inline">(click to filter)</span>
                    </span>
                    {Object.entries(currentVendorData.manufacturers_handled).map(([brand, count]) => {
                      const isSelected = supplierBrandFilter === brand && buyerBrandFilter === brand;
                      return (
                        <button
                          key={brand}
                          type="button"
                          onClick={() => handleSelectMasterBrand(isSelected ? 'ALL' : brand)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shadow-2xs ${
                            isSelected
                              ? 'bg-amber-600 text-white font-bold ring-2 ring-amber-300 shadow-sm'
                              : 'bg-white hover:bg-amber-50 text-gray-800 border border-gray-200 hover:border-amber-300 cursor-pointer'
                          }`}
                          title={`Click to filter all sellers and vendors by ${brand}`}
                        >
                          <span>{brand}:</span>
                          <strong className={isSelected ? 'text-amber-100' : 'text-indigo-600'}>{count}</strong>
                          {isSelected && <Check className="w-3 h-3 text-white ml-0.5" />}
                        </button>
                      );
                    })}
                    {(supplierBrandFilter !== 'ALL' || buyerBrandFilter !== 'ALL') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSupplierBrandFilter('ALL');
                          setBuyerBrandFilter('ALL');
                        }}
                        className="px-2 py-0.5 text-xs text-rose-600 hover:text-rose-800 font-bold hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1 transition-colors ml-1"
                        title="Clear brand filters"
                      >
                        <X className="w-3 h-3" />
                        <span>Clear Brand</span>
                      </button>
                    )}
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
                    Inbound: Where Purchasing From ({districtFilter === 'ALL' && supplierBrandFilter === 'ALL' ? currentVendorData.suppliers.length : `${filteredSuppliers.length}/${currentVendorData.suppliers.length}`})
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
                    Outbound: Who is Purchasing From ({districtFilter === 'ALL' && buyerBrandFilter === 'ALL' ? currentVendorData.buyers.length : `${filteredBuyers.length}/${currentVendorData.buyers.length}`})
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
                    {districtFilter === 'ALL' && supplierBrandFilter === 'ALL' && buyerBrandFilter === 'ALL'
                      ? `${currentVendorData.suppliers.length} Suppliers • ${currentVendorData.buyers.length} Buyers`
                      : `${filteredSuppliers.length} Sup • ${filteredBuyers.length} Buy (Filtered)`}
                  </span>
                </div>
              </div>

              {/* Dual Filter Bar: District/Location & Brand/Manufacturer */}
              {activeTab !== 'manufacturers' && (
                <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-3.5 space-y-3 shadow-2xs">
                  {/* Row 1: Filter by District / Location */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200/80">
                    <div className="flex items-center gap-2 flex-wrap flex-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0">
                        <MapPin className="w-4 h-4 text-indigo-600" />
                        <span>Filter by District / Location:</span>
                      </div>

                      {/* District Dropdown Selector */}
                      <div className="relative min-w-[220px]">
                        <select
                          value={districtFilter}
                          onChange={(e) => setDistrictFilter(e.target.value)}
                          className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-slate-800 shadow-2xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
                        >
                          <option value="ALL">
                            🌐 All Districts / Locations ({currentVendorData.suppliers.length} Sellers, {currentVendorData.buyers.length} Vendors)
                          </option>
                          {districtOptions.map((opt) => (
                            <option key={opt.district} value={opt.district}>
                              📍 {opt.district} ({opt.buyersCount} Vendors{opt.suppliersCount > 0 ? `, ${opt.suppliersCount} Sellers` : ''})
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
                            <span>Reset District</span>
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

                  {/* Row 2: Filter by Solar Brand / Manufacturer (All Sellers & Vendors) */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap flex-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0">
                        <Factory className="w-4 h-4 text-amber-600" />
                        <span>Filter by Brand:</span>
                      </div>

                      {/* Brand Dropdown Selector */}
                      <div className="relative min-w-[240px]">
                        <select
                          value={masterBrandValue}
                          onChange={(e) => handleSelectMasterBrand(e.target.value)}
                          className="w-full text-xs font-semibold bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-slate-800 shadow-2xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none cursor-pointer"
                        >
                          <option value="ALL">
                            🏷️ All Brands / Manufacturers ({allBrandOptions.length} Brands Available)
                          </option>
                          {allBrandOptions.map((opt) => (
                            <option key={opt.brand} value={opt.brand}>
                              🏭 {opt.brand} ({opt.suppliersCount} Sellers, {opt.buyersCount} Vendors{opt.panelsCount ? ` • ${opt.panelsCount.toLocaleString()} panels` : ''})
                            </option>
                          ))}
                          {masterBrandValue === 'CUSTOM' && (
                            <option value="CUSTOM" disabled>
                              ⚡ Custom Brand Filter (Sellers & Vendors have individual filters)
                            </option>
                          )}
                        </select>
                      </div>

                      {/* Quick Brand Pills for top brands */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleSelectMasterBrand('ALL')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            supplierBrandFilter === 'ALL' && buyerBrandFilter === 'ALL'
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          All Brands
                        </button>

                        {allBrandOptions.slice(0, 6).map((opt) => {
                          const isMatch = supplierBrandFilter === opt.brand && buyerBrandFilter === opt.brand;
                          return (
                            <button
                              key={opt.brand}
                              type="button"
                              onClick={() => handleSelectMasterBrand(isMatch ? 'ALL' : opt.brand)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                                isMatch
                                  ? 'bg-amber-600 text-white shadow-2xs ring-1 ring-amber-400'
                                  : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200'
                              }`}
                              title={`${opt.brand}: ${opt.suppliersCount} Sellers, ${opt.buyersCount} Vendors (${opt.panelsCount.toLocaleString()} panels)`}
                            >
                              <span>{getShortBrandName(opt.brand)}</span>
                              {opt.panelsCount > 0 && (
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                    isMatch
                                      ? 'bg-amber-800 text-amber-100'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200/50'
                                  }`}
                                >
                                  {opt.panelsCount >= 1000
                                    ? `${(opt.panelsCount / 1000).toFixed(opt.panelsCount % 1000 === 0 ? 0 : 1)}k`
                                    : opt.panelsCount}
                                </span>
                              )}
                            </button>
                          );
                        })}

                        {(supplierBrandFilter !== 'ALL' || buyerBrandFilter !== 'ALL') && (
                          <button
                            type="button"
                            onClick={() => {
                              setSupplierBrandFilter('ALL');
                              setBuyerBrandFilter('ALL');
                            }}
                            className="text-[11px] text-rose-600 hover:text-rose-700 font-bold px-2 py-1 rounded-lg hover:bg-rose-50 border border-rose-200 flex items-center gap-1 transition-colors"
                            title="Reset brand filter to show all"
                          >
                            <X className="w-3 h-3" />
                            <span>Reset Brand</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Brand Status Badge */}
                    <div className="text-right shrink-0">
                      {supplierBrandFilter === 'ALL' && buyerBrandFilter === 'ALL' ? (
                        <span className="text-[11px] text-slate-400">All brands shown</span>
                      ) : supplierBrandFilter === buyerBrandFilter ? (
                        <span className="text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 text-[11px]">
                          <Factory className="w-3 h-3 text-amber-600" />
                          {getShortBrandName(supplierBrandFilter)} ({filteredSuppliers.length} Sellers, {filteredBuyers.length} Vendors)
                        </span>
                      ) : (
                        <span className="text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 text-[11px]">
                          <Factory className="w-3 h-3 text-amber-600" />
                          Custom: Sup({getShortBrandName(supplierBrandFilter)}) • Buy({getShortBrandName(buyerBrandFilter)})
                        </span>
                      )}
                    </div>
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
                          Where {currentVendorData.vendor_name} is Purchasing From (Sellers)
                        </h4>
                        <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full shrink-0">
                          {districtFilter === 'ALL' && supplierBrandFilter === 'ALL'
                            ? `${currentVendorData.suppliers.length} Sellers`
                            : `${filteredSuppliers.length} / ${currentVendorData.suppliers.length} Sellers (${[districtFilter !== 'ALL' && districtFilter, supplierBrandFilter !== 'ALL' && getShortBrandName(supplierBrandFilter)].filter(Boolean).join(' • ')})`}
                        </span>
                      </div>

                      {/* Seller Brand Filter Dropdown & Bulk Export Options */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Dropdown to filter sellers by brand */}
                        <div className="flex items-center gap-1.5 bg-emerald-50/70 border border-emerald-200/90 rounded-lg px-2 py-1 shadow-2xs">
                          <Factory className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <label htmlFor="seller-brand-select" className="text-[11px] font-bold text-emerald-900 shrink-0">
                            Brand:
                          </label>
                          <select
                            id="seller-brand-select"
                            value={supplierBrandFilter}
                            onChange={(e) => setSupplierBrandFilter(e.target.value)}
                            className="text-xs font-semibold bg-white border border-emerald-300 rounded-md px-2 py-0.5 text-slate-800 shadow-2xs focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer max-w-[180px]"
                          >
                            <option value="ALL">All Brands ({currentVendorData.suppliers.length} Sellers)</option>
                            {supplierBrandOptions.map((opt) => (
                              <option key={opt.brand} value={opt.brand}>
                                {opt.brand} ({opt.suppliersCount} sellers • {opt.panelsCount.toLocaleString()} panels)
                              </option>
                            ))}
                          </select>
                          {supplierBrandFilter !== 'ALL' && (
                            <button
                              type="button"
                              onClick={() => setSupplierBrandFilter('ALL')}
                              className="text-[11px] text-rose-600 hover:text-rose-800 font-bold p-0.5 hover:bg-rose-50 rounded"
                              title="Reset seller brand filter"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

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
                            districtFilter,
                            supplierBrandFilter
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
                            districtFilter,
                            supplierBrandFilter
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
                              <th className="px-3.5 py-2.5 text-center" title="Click badge to view all panel serial numbers, purchase dates & insert dates">
                                <span className="inline-flex items-center gap-1 justify-center">
                                  Panels
                                  <span className="text-[9px] font-normal lowercase opacity-70">(click)</span>
                                </span>
                              </th>
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
                                      <button
                                        type="button"
                                        onClick={() => handleOpenPanelsModal('supplier', s.supplier_name, s.panels_count, s.panels, s.sample_serials, s.invoices, s.manufacturers)}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-800 hover:text-emerald-950 font-bold rounded-lg transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer border border-emerald-300/70 group"
                                        title={`Click to view all ${s.panels_count} panel serial numbers, purchase dates & insert dates`}
                                      >
                                        <span>{s.panels_count}</span>
                                        <ExternalLink className="w-3 h-3 text-emerald-700 opacity-60 group-hover:opacity-100 transition-opacity" />
                                      </button>
                                    </td>
                                    <td className="px-3.5 py-2.5">
                                      {s.manufacturers.length > 0 ? (
                                        <div className="flex items-center gap-1 flex-wrap">
                                          {s.manufacturers.map((brandName) => {
                                            const isSelected = supplierBrandFilter === brandName;
                                            return (
                                              <button
                                                key={brandName}
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSupplierBrandFilter(isSelected ? 'ALL' : brandName);
                                                }}
                                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                                  isSelected
                                                    ? 'bg-emerald-700 text-white shadow-2xs'
                                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 cursor-pointer'
                                                }`}
                                                title={`Click to filter sellers by ${brandName}`}
                                              >
                                                {getShortBrandName(brandName)}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
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
                                    No sellers found for {currentVendorData.vendor_name}
                                    {districtFilter !== 'ALL' && <> in <strong className="text-indigo-700">{districtFilter}</strong></>}
                                    {supplierBrandFilter !== 'ALL' && <> carrying brand <strong className="text-emerald-700">{supplierBrandFilter}</strong></>}.
                                  </p>
                                  <div className="flex items-center justify-center gap-2">
                                    {supplierBrandFilter !== 'ALL' && (
                                      <button
                                        type="button"
                                        onClick={() => setSupplierBrandFilter('ALL')}
                                        className="text-xs text-emerald-600 hover:text-emerald-800 font-bold underline cursor-pointer"
                                      >
                                        Reset brand filter
                                      </button>
                                    )}
                                    {districtFilter !== 'ALL' && (
                                      <button
                                        type="button"
                                        onClick={() => setDistrictFilter('ALL')}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                                      >
                                        Reset location filter
                                      </button>
                                    )}
                                  </div>
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
                          Who is Purchasing from {currentVendorData.vendor_name} (Vendors)
                        </h4>
                        <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full shrink-0">
                          {districtFilter === 'ALL' && buyerBrandFilter === 'ALL'
                            ? `${currentVendorData.buyers.length} Vendors`
                            : `${filteredBuyers.length} / ${currentVendorData.buyers.length} Vendors (${[districtFilter !== 'ALL' && districtFilter, buyerBrandFilter !== 'ALL' && getShortBrandName(buyerBrandFilter)].filter(Boolean).join(' • ')})`}
                        </span>
                      </div>

                      {/* Buyer Brand Filter Dropdown & Bulk Export Options */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Dropdown to filter vendors by brand */}
                        <div className="flex items-center gap-1.5 bg-blue-50/70 border border-blue-200/90 rounded-lg px-2 py-1 shadow-2xs">
                          <Factory className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                          <label htmlFor="buyer-brand-select" className="text-[11px] font-bold text-blue-900 shrink-0">
                            Brand:
                          </label>
                          <select
                            id="buyer-brand-select"
                            value={buyerBrandFilter}
                            onChange={(e) => setBuyerBrandFilter(e.target.value)}
                            className="text-xs font-semibold bg-white border border-blue-300 rounded-md px-2 py-0.5 text-slate-800 shadow-2xs focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer max-w-[180px]"
                          >
                            <option value="ALL">All Brands ({currentVendorData.buyers.length} Vendors)</option>
                            {buyerBrandOptions.map((opt) => (
                              <option key={opt.brand} value={opt.brand}>
                                {opt.brand} ({opt.buyersCount} vendors • {opt.panelsCount.toLocaleString()} panels)
                              </option>
                            ))}
                          </select>
                          {buyerBrandFilter !== 'ALL' && (
                            <button
                              type="button"
                              onClick={() => setBuyerBrandFilter('ALL')}
                              className="text-[11px] text-rose-600 hover:text-rose-800 font-bold p-0.5 hover:bg-rose-50 rounded"
                              title="Reset vendor brand filter"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

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
                            districtFilter,
                            buyerBrandFilter
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
                            districtFilter,
                            buyerBrandFilter
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
                              <th className="px-3.5 py-2.5 text-center" title="Click badge to view all panel serial numbers, purchase dates & insert dates">
                                <span className="inline-flex items-center gap-1 justify-center">
                                  Panels
                                  <span className="text-[9px] font-normal lowercase opacity-70">(click)</span>
                                </span>
                              </th>
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
                                      <button
                                        type="button"
                                        onClick={() => handleOpenPanelsModal('buyer', b.buyer_name, b.panels_count, b.panels, b.sample_serials, b.invoices, b.manufacturers)}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 hover:bg-blue-200 active:bg-blue-300 text-blue-800 hover:text-blue-950 font-bold rounded-lg transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer border border-blue-300/70 group"
                                        title={`Click to view all ${b.panels_count} panel serial numbers, purchase dates & insert dates`}
                                      >
                                        <span>{b.panels_count}</span>
                                        <ExternalLink className="w-3 h-3 text-blue-700 opacity-60 group-hover:opacity-100 transition-opacity" />
                                      </button>
                                    </td>
                                    <td className="px-3.5 py-2.5">
                                      {b.manufacturers.length > 0 ? (
                                        <div className="flex items-center gap-1 flex-wrap">
                                          {b.manufacturers.map((brandName) => {
                                            const isSelected = buyerBrandFilter === brandName;
                                            return (
                                              <button
                                                key={brandName}
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setBuyerBrandFilter(isSelected ? 'ALL' : brandName);
                                                }}
                                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                                  isSelected
                                                    ? 'bg-blue-700 text-white shadow-2xs'
                                                    : 'bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200/80 cursor-pointer'
                                                }`}
                                                title={`Click to filter vendors by ${brandName}`}
                                              >
                                                {getShortBrandName(brandName)}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
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
                                    No vendors / buyers found for {currentVendorData.vendor_name}
                                    {districtFilter !== 'ALL' && <> in <strong className="text-indigo-700">{districtFilter}</strong></>}
                                    {buyerBrandFilter !== 'ALL' && <> buying brand <strong className="text-blue-700">{buyerBrandFilter}</strong></>}.
                                  </p>
                                  <div className="flex items-center justify-center gap-2">
                                    {buyerBrandFilter !== 'ALL' && (
                                      <button
                                        type="button"
                                        onClick={() => setBuyerBrandFilter('ALL')}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                                      >
                                        Reset brand filter
                                      </button>
                                    )}
                                    {districtFilter !== 'ALL' && (
                                      <button
                                        type="button"
                                        onClick={() => setDistrictFilter('ALL')}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                                      >
                                        Reset location filter
                                      </button>
                                    )}
                                  </div>
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

    {/* Panel Serial Numbers & Purchase Records Modal */}
    {activePanelsModal && (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
        <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150">
          
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-4 flex items-start justify-between border-b border-indigo-900/40">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {activePanelsModal.panels.length} Solar Panel Serial Numbers &amp; Purchase Records
                  </h3>
                  <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full ${
                    activePanelsModal.type === 'supplier' 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}>
                    {activePanelsModal.type === 'supplier' ? 'Inbound Purchase' : 'Outbound Supply'}
                  </span>
                </div>
                <p className="text-xs text-indigo-200/90 mt-1 flex items-center gap-1.5 flex-wrap">
                  <span>{activePanelsModal.type === 'supplier' ? 'Supplier:' : 'Seller:'} <strong className="text-white">{activePanelsModal.partnerName}</strong></span>
                  <span className="text-amber-400 font-bold">➔</span>
                  <span>{activePanelsModal.type === 'supplier' ? 'Buyer / Tracker:' : 'Buyer:'} <strong className="text-white">{activePanelsModal.currentVendorName}</strong></span>
                  <span className="text-indigo-300/60">•</span>
                  <span className="text-emerald-300 font-semibold">{activePanelsModal.panels.length} Verified Panels</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActivePanelsModal(null)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Close panel viewer (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toolbar / Search & Actions */}
          <div className="p-4 bg-slate-50 border-b border-slate-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={panelSearchTerm}
                  onChange={(e) => setPanelSearchTerm(e.target.value)}
                  placeholder="Search serial, invoice, date, customer, S-number..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium placeholder:text-slate-400"
                />
                {panelSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setPanelSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={handleCopyModalSerials}
                  disabled={filteredModalPanels.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  title="Copy all serial numbers newline-separated"
                >
                  {panelCopiedKey === 'all_serials' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-indigo-600" />}
                  <span>{panelCopiedKey === 'all_serials' ? 'Copied Serials!' : `Copy Serials (${filteredModalPanels.length})`}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyModalTSV}
                  disabled={filteredModalPanels.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  title="Copy entire table for Excel / Google Sheets (TSV)"
                >
                  {panelCopiedKey === 'tsv_table' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
                  <span>{panelCopiedKey === 'tsv_table' ? 'Copied TSV!' : 'Copy for Excel'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportModalExcel}
                  disabled={filteredModalPanels.length === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-sm disabled:opacity-50 cursor-pointer"
                  title="Export complete details to formatted .xlsx Excel file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export .xlsx</span>
                </button>
              </div>
            </div>

            {/* Invoice Filter Chips if more than 1 invoice */}
            {modalInvoiceOptions.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200/60">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Invoices:</span>
                <button
                  type="button"
                  onClick={() => setPanelInvoiceFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    panelInvoiceFilter === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  All Invoices ({activePanelsModal.panels.length})
                </button>
                {modalInvoiceOptions.map(([inv, count]) => (
                  <button
                    key={inv}
                    type="button"
                    onClick={() => setPanelInvoiceFilter(inv)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                      panelInvoiceFilter === inv
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {inv} <span className="opacity-75 font-sans font-bold">({count})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Panels Table */}
          <div className="overflow-y-auto max-h-[60vh] flex-1 p-0">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px] sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="px-3.5 py-2.5 w-12 text-center">#</th>
                  <th className="px-3.5 py-2.5 font-bold">Panel Serial Number</th>
                  <th className="px-3.5 py-2.5 font-bold text-emerald-950">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Date Inserted into System</span>
                    </div>
                  </th>
                  <th className="px-3.5 py-2.5 font-bold text-indigo-950">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Date of Purchase / Comp</span>
                    </div>
                  </th>
                  <th className="px-3.5 py-2.5">Invoice / Ref</th>
                  <th className="px-3.5 py-2.5">Brand / Manufacturer</th>
                  <th className="px-3.5 py-2.5">S-Number (Complaint)</th>
                  <th className="px-3.5 py-2.5">Customer / Consumer</th>
                  <th className="px-3.5 py-2.5">Portal App ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredModalPanels.length > 0 ? (
                  filteredModalPanels.map((p, idx) => {
                    const serialCopyKey = `panel_modal_s_${idx}`;
                    const snoCopyKey = `panel_modal_sno_${idx}`;
                    const invCopyKey = `panel_modal_inv_${idx}`;

                    return (
                      <tr key={idx} className="hover:bg-indigo-50/40 transition-colors">
                        {/* Index */}
                        <td className="px-3.5 py-2.5 text-center font-mono text-[11px] text-slate-400">
                          {idx + 1}
                        </td>

                        {/* Serial Number with 1-click copy */}
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
                              {p.serial}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(p.serial, serialCopyKey)}
                              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                              title="Copy serial number"
                            >
                              {copiedKey === serialCopyKey ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Date Inserted Into System */}
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          {p.dateInserted ? (
                            <span
                              className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80"
                              title={`System Entry Date (INST_CREATE_DATE): ${p.dateInserted}`}
                            >
                              <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                              {formatDateString(p.dateInserted)}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic font-mono text-[11px]">-</span>
                          )}
                        </td>

                        {/* Date of Purchase / Complaint */}
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          {p.datePurchase ? (
                            <span
                              className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/80"
                              title={`Date of Purchase / Application Complaint: ${p.datePurchase}`}
                            >
                              <CalendarDays className="w-3 h-3 text-indigo-600 shrink-0" />
                              {formatDateString(p.datePurchase)}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic font-mono text-[11px]">-</span>
                          )}
                        </td>

                        {/* Invoice */}
                        <td className="px-3.5 py-2.5 whitespace-nowrap font-mono text-[11px]">
                          {p.invoice ? (
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {p.invoice}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(p.invoice, invCopyKey)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                title="Copy invoice"
                              >
                                {copiedKey === invCopyKey ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Direct / Stock</span>
                          )}
                        </td>

                        {/* Brand / Manufacturer */}
                        <td className="px-3.5 py-2.5 text-slate-700 max-w-[150px] truncate" title={p.manufacturer}>
                          {p.manufacturer || '-'}
                        </td>

                        {/* S-Number */}
                        <td className="px-3.5 py-2.5 whitespace-nowrap font-mono text-[11px]">
                          {p.sNumber ? (
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/70">
                                {p.sNumber}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(p.sNumber, snoCopyKey)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                title="Copy S-number"
                              >
                                {copiedKey === snoCopyKey ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">-</span>
                          )}
                        </td>

                        {/* Consumer Name */}
                        <td className="px-3.5 py-2.5 text-slate-800 font-medium max-w-[130px] truncate" title={p.consumerName}>
                          {p.consumerName || '-'}
                        </td>

                        {/* Portal App ID */}
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {p.appId || '-'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-500 space-y-2">
                      <p className="font-semibold text-xs">No panels match your filter or search query.</p>
                      <button
                        type="button"
                        onClick={() => { setPanelSearchTerm(''); setPanelInvoiceFilter('ALL'); }}
                        className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                      >
                        Clear Search &amp; Invoice Filters
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span>Showing <strong>{filteredModalPanels.length}</strong> of <strong>{activePanelsModal.panels.length}</strong> panels</span>
              {activePanelsModal.panels.length > 0 && (
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  100% Verified in DCR Network
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setActivePanelsModal(null)}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              Close (ESC)
            </button>
          </div>

        </div>
      </div>
    )}
  </>
  );
}
