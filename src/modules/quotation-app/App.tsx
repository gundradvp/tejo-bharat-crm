import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { QuotationForm } from './components/QuotationForm';
import { QuotationPreview } from './components/QuotationPreview';
import { QuotationsList } from './components/QuotationsList';
import { PartiesList } from './components/PartiesList';
import { PartyForm } from './components/PartyForm';
import { ItemsList } from './components/ItemsList';
import { ItemModal } from './components/ItemModal';
import { BranchModal } from './components/BranchModal';
import { PaymentInModal } from './components/PaymentInModal';
import { EwayBillForm } from './components/EwayBillForm';
import { Quotation, Branch, DEFAULT_BRANCHES, DocumentType, DEFAULT_BANK_DETAILS, Party, DEFAULT_PARTIES, Item, DEFAULT_ITEMS, PaymentInRecord, LineItem } from './types/quotation';
import { supabase } from './lib/supabase';
import { getNextSequentialNumber } from './lib/quoteNumberGenerator';
import historicalQuotations from './data/historicalQuotations.json';
import historicalParties from './data/historicalParties.json';
import { CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

const INITIAL_QUOTATION: Quotation = {
  document_type: 'Quotation',
  invoice_prefix: 'TBGE2627Q',
  quotation_no: 'TBGE2627Q003',
  quotation_date: '2026-09-16',
  valid_until: '2026-10-16',
  customer_name: 'KVB Model village project, GRAMODAYA (4 Institutional Sites)',
  customer_phone: '9989279586',
  customer_address: 'Panchayat, RSK Building, Health Center & ZPHS School, KVB',
  customer_billing_address: 'Panchayat, RSK Building, Health Center & ZPHS School, KVB',
  customer_location: 'KVB, Andhra Pradesh',
  category: 'Commercial / Institutional',
  installation_type: 'Multi-Site On-Grid & Hybrid Rooftop Solar Plant (17 kW Total)',
  system_capacity_kw: 17,
  pricing_mode: 'total_cost',
  rate_per_kw: 86470.58,
  total_amount: 1470000,
  monthly_units: 2125,
  annual_units: 25500,
  system_life_years: 25,
  monthly_savings_rs: 15938,
  payback_period_years: 6.8,
  panel_brand: 'Tier-1 High Efficiency Mono DCR 500+ W Solar Panels',
  inverter_brand: 'On-Grid IP65 Inverters + Tier-1 Hybrid Inverter',
  inverter_phase: 'Three Phase / Single Phase',
  cables_brand: 'Polycab / Havells UV-Protected DC & Armored AC Cables',
  structure_type: 'HDG Elevated Structure (80µ Zinc)',
  structure_grid: 'Standard High-Wind Resistance Mounting Tables',
  structure_height: 'Elevated Superstructure / Flush Mount',
  branch_id: 'pith-ap',
  branch: DEFAULT_BRANCHES[1],
  hsn_code: '85414011',
  gst_rate_percent: 8.9,
  payment_status: 'Unpaid',
  bank_details: DEFAULT_BANK_DETAILS,
  auto_round_off: true,
  amount_received: 0,
  payment_type: 'Bank Transfer',
  is_fully_paid: false,
  status: 'Active',
  quote_format: '5_page',
  line_items: [
    {
      id: 'li-kvb-1',
      name: 'ZPHS School – 5 kW On-Grid Solar System',
      description: '5 kWp 500+ W Mono DCR Solar Array, 5 kW On-Grid String Inverter, HDG Structure & BOS',
      qty: 5,
      unit: 'kW',
      price_per_item: 64279.16,
      tax_rate_percent: 8.9,
      tax_amount: 28604.22,
      total_amount: 350000,
    },
    {
      id: 'li-kvb-2',
      name: 'Panchayat Office – 4 kW On-Grid Solar System',
      description: '4 kWp 500+ W Mono DCR Solar Array, 4 kW On-Grid String Inverter, HDG Structure & BOS',
      qty: 4,
      unit: 'kW',
      price_per_item: 64279.16,
      tax_rate_percent: 8.9,
      tax_amount: 22883.38,
      total_amount: 280000,
    },
    {
      id: 'li-kvb-3',
      name: 'RSK Building – 3 kW On-Grid Solar System',
      description: '3 kWp 500+ W Mono DCR Solar Array, 3 kW On-Grid String Inverter, HDG Structure & BOS',
      qty: 3,
      unit: 'kW',
      price_per_item: 64279.16,
      tax_rate_percent: 8.9,
      tax_amount: 17162.53,
      total_amount: 210000,
    },
    {
      id: 'li-kvb-4',
      name: 'Health Center – 5 kW Solar Array & On-Grid BOS Base',
      description: '5 kWp 500+ W Mono DCR Solar Array, HDG Structure & Turnkey Base BOS',
      qty: 5,
      unit: 'kW',
      price_per_item: 64279.16,
      tax_rate_percent: 8.9,
      tax_amount: 28604.22,
      total_amount: 350000,
    },
    {
      id: 'li-kvb-5',
      name: 'Health Center – 5 kW Heavy Duty Hybrid Inverter',
      description: '5 kW Dual Output Hybrid Inverter Upgrade (Grid Export + Critical Load Backup)',
      qty: 1,
      unit: 'Set',
      price_per_item: 73461.89,
      tax_rate_percent: 8.9,
      tax_amount: 6538.11,
      total_amount: 80000,
    },
    {
      id: 'li-kvb-6',
      name: 'Health Center – 10 kWh LFP Lithium Battery Storage',
      description: '10 kWh LFP Battery Storage Bank for 24/7 Medical Cold Chain Backup',
      qty: 1,
      unit: 'Set',
      price_per_item: 160697.89,
      tax_rate_percent: 8.9,
      tax_amount: 14302.11,
      total_amount: 175000,
    },
    {
      id: 'li-kvb-7',
      name: 'Health Center – Hybrid DC Distribution Box (DCDB)',
      description: 'Heavy-Duty DC Distribution Box with SPDs & Protection',
      qty: 1,
      unit: 'Nos',
      price_per_item: 11478.42,
      tax_rate_percent: 8.9,
      tax_amount: 1021.58,
      total_amount: 12500,
    },
    {
      id: 'li-kvb-8',
      name: 'Health Center – Heavy Duty Battery Box / Enclosure',
      description: 'Battery Enclosure Rack & Protective Box',
      qty: 1,
      unit: 'Nos',
      price_per_item: 11478.42,
      tax_rate_percent: 8.9,
      tax_amount: 1021.58,
      total_amount: 12500,
    },
  ],
};

const DEFAULT_PAYMENT_IN_RECORDS: PaymentInRecord[] = [
  {
    id: 'payin-213',
    payment_number: '213',
    party_name: 'SUNRAY SOLAR GREEN ENERGY SOLUTIONS',
    payment_date: '2026-09-06',
    payment_mode: 'Netbanking',
    amount_received: 44250,
    settled_invoices: [
      {
        invoice_no: '29042051',
        date: '2026-09-06',
        invoice_amount: 148646,
        amount_settled: 44250,
        balance_amount: 104396
      }
    ]
  },
  {
    id: 'payin-212',
    payment_number: '212',
    party_name: 'SINGANA VENKATARAMAM',
    payment_date: '2026-09-03',
    payment_mode: 'Cash',
    amount_received: 24000,
    settled_invoices: []
  },
  {
    id: 'payin-211',
    payment_number: '211',
    party_name: 'GANTASRINU,',
    payment_date: '2026-08-31',
    payment_mode: 'Cash',
    amount_received: 22000,
    settled_invoices: []
  }
];

export interface QuotationAppProps {
  basePath?: string;
  onBackToCrm?: () => void;
}

export function App({ basePath = '', onBackToCrm }: QuotationAppProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'create' | 'list' | 'parties' | 'party_form' | 'items'>('create');
  const [activeDocFilter, setActiveDocFilter] = useState<'All' | DocumentType>('Quotation');
  const [createFormMode, setCreateFormMode] = useState<'edit' | 'preview'>('edit');
  
  const [branches, setBranches] = useState<Branch[]>(DEFAULT_BRANCHES);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('hyd-hq');
  const [quotation, setQuotation] = useState<Quotation>(INITIAL_QUOTATION);
  const [quotationsHistory, setQuotationsHistory] = useState<Quotation[]>([]);
  const [parties, setParties] = useState<Party[]>(DEFAULT_PARTIES);
  const [editingParty, setEditingParty] = useState<Party | null>(null);

  const [items, setItems] = useState<Item[]>(DEFAULT_ITEMS);
  const [isItemModalOpen, setIsItemModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const [paymentInRecords, setPaymentInRecords] = useState<PaymentInRecord[]>(DEFAULT_PAYMENT_IN_RECORDS);
  const [isPaymentInModalOpen, setIsPaymentInModalOpen] = useState<boolean>(false);
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<Quotation | null>(null);
  const [isEwayBillViewOpen, setIsEwayBillViewOpen] = useState<boolean>(false);

  const [isBranchModalOpen, setIsBranchModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Synchronize React state with URL path (including individual quotation/invoice routes & query pre-fills)
  useEffect(() => {
    const rawPath = location.pathname;
    const prefix = basePath || (rawPath.startsWith('/billing') ? '/billing' : '');
    const path = prefix && rawPath.startsWith(prefix) ? (rawPath.slice(prefix.length) || '/') : rawPath;

    // Check search params for prefill from CRM (e.g. from customer profile or EB customer)
    const searchParams = new URLSearchParams(location.search);
    const paramName = searchParams.get('customer_name') || searchParams.get('name');
    const paramPhone = searchParams.get('customer_phone') || searchParams.get('phone');
    const paramAddress = searchParams.get('customer_address') || searchParams.get('address');
    const paramKw = searchParams.get('capacity_kw') || searchParams.get('kw');
    const paramDocType = searchParams.get('docType') || searchParams.get('type');

    if (paramName || paramPhone || paramKw || paramAddress || paramDocType) {
      setQuotation(prev => ({
        ...prev,
        ...(paramDocType ? { document_type: paramDocType as DocumentType } : {}),
        ...(paramName ? { customer_name: paramName } : {}),
        ...(paramPhone ? { customer_phone: paramPhone } : {}),
        ...(paramAddress ? { customer_address: paramAddress, customer_billing_address: paramAddress, customer_location: paramAddress.slice(0, 40) } : {}),
        ...(paramKw ? { system_capacity_kw: Number(paramKw) || prev.system_capacity_kw } : {})
      }));
    }

    // Match individual quotation or invoice: /quotations/:id, /invoices/:id, /view/:id
    const docMatch = path.match(/^\/(quotations|invoices|view|create)\/([^\/]+)$/i);
    if (docMatch) {
      const docNo = decodeURIComponent(docMatch[2]);
      const localQuotesStr = localStorage.getItem('tb_quotations_history');
      const localQuotes: Quotation[] = localQuotesStr ? JSON.parse(localQuotesStr) : quotationsHistory;
      const foundDoc = localQuotes.find(q => q.quotation_no === docNo || q.id === docNo);
      
      if (foundDoc) {
        const kwItems = foundDoc.line_items?.filter(it => {
          const u = (it.unit || '').trim().toLowerCase();
          return u === 'kw' || u === 'kwp';
        }) || [];
        const sumKw = kwItems.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);
        let corrected = (sumKw > 0 && foundDoc.system_capacity_kw !== sumKw)
          ? { ...foundDoc, system_capacity_kw: sumKw }
          : foundDoc;
        if ((corrected.quotation_no || '').trim().toUpperCase() === 'TBGE2627Q003' && (!corrected.gst_rate_percent || corrected.gst_rate_percent === 0)) {
          corrected = {
            ...corrected,
            gst_rate_percent: 8.9,
            line_items: INITIAL_QUOTATION.line_items
          };
        }
        setQuotation(corrected);
        setCreateFormMode('preview');
        setActiveTab('create');
        if (foundDoc.document_type) setActiveDocFilter(foundDoc.document_type);
      } else {
        // Fallback: Fetch from Supabase by quotation number
        supabase.from('quotations').select('*').eq('quotation_no', docNo).then(({ data }) => {
          if (data && data[0]) {
            const kwItems = data[0].line_items?.filter((it: any) => {
              const u = (it.unit || '').trim().toLowerCase();
              return u === 'kw' || u === 'kwp';
            }) || [];
            const sumKw = kwItems.reduce((acc: number, it: any) => acc + (Number(it.qty) || 0), 0);
            const corrected = (sumKw > 0 && data[0].system_capacity_kw !== sumKw)
              ? { ...data[0], system_capacity_kw: sumKw }
              : data[0];
            setQuotation(corrected);
            setCreateFormMode('preview');
            setActiveTab('create');
          }
        });
      }
      return;
    }

    const lowerPath = path.toLowerCase();
    if (lowerPath === '/quotations') {
      setActiveTab('list');
      setActiveDocFilter('Quotation');
    } else if (lowerPath === '/payment-in') {
      setActiveTab('list');
      setActiveDocFilter('Payment In');
    } else if (lowerPath === '/proforma-invoices') {
      setActiveTab('list');
      setActiveDocFilter('Proforma Invoice');
    } else if (lowerPath === '/credit-notes') {
      setActiveTab('list');
      setActiveDocFilter('Credit Note');
    } else if (lowerPath === '/delivery-challans') {
      setActiveTab('list');
      setActiveDocFilter('Delivery Challan');
    } else if (lowerPath === '/parties') {
      setActiveTab('parties');
    } else if (lowerPath === '/parties/new') {
      setActiveTab('party_form');
      setEditingParty(null);
    } else if (lowerPath === '/items') {
      setActiveTab('items');
    } else if (lowerPath === '/create') {
      setActiveTab('create');
      setCreateFormMode('edit');
    } else if (lowerPath === '/all') {
      setActiveTab('list');
      setActiveDocFilter('All');
    } else if (lowerPath === '/invoices') {
      setActiveTab('list');
      setActiveDocFilter('Sales Invoice');
    } else if (lowerPath === '/') {
      setActiveTab('list');
      setActiveDocFilter('Quotation');
    }
  }, [location.pathname, location.search, basePath]);



  const activeBranch = branches.find((b) => b.id === (quotation.branch_id || selectedBranchId)) || branches[0];

  useEffect(() => {
    // Load local storage items
    const localB = localStorage.getItem('tb_branches_list');
    let finalBranches: Branch[] = DEFAULT_BRANCHES;
    if (localB) {
      try {
        let parsed: Branch[] = JSON.parse(localB);
        // Exclude unwanted legacy vizag-ap branch since user has only 2 branches
        parsed = parsed.filter(b => b.id !== 'vizag-ap');
        if (parsed.length === 0) {
          finalBranches = DEFAULT_BRANCHES;
        } else {
          // Normalize and upgrade AP & TG branches to official details
          finalBranches = parsed.map(b => {
            const cleanCin = (!b.cin || b.cin === 'AAT-5568' || b.cin.includes('AAT')) ? 'ACQ-2334' : b.cin;
            if (b.id === 'pith-ap' || b.state?.toLowerCase().includes('andhra') || b.address?.toLowerCase().includes('andhra')) {
              return {
                ...b,
                name: b.name.includes('Pithapuram') ? b.name : 'Tejo Bharat Pithapuram Branch',
                company_name: b.company_name || 'TEJO BHARAT GLOBAL ENERGY LLP',
                gstin: b.gstin && !b.gstin.includes('AAAAA') && b.gstin.startsWith('37') ? b.gstin : '37AAYFT4513H1ZO',
                cin: cleanCin,
                pan: b.pan || 'AAYFT4513H',
                email: b.email || 'contact@tejobharat.com',
                website: b.website || 'www.tejobharat.com',
                signatory_title: b.signatory_title || 'Authorized Signatory',
                state: 'Andhra Pradesh'
              };
            }
            if (b.id === 'hyd-hq' || b.state?.toLowerCase().includes('telangana') || b.address?.toLowerCase().includes('telangana')) {
              return {
                ...b,
                company_name: b.company_name || 'TEJO BHARAT GLOBAL ENERGY LLP',
                gstin: b.gstin && !b.gstin.includes('AAAAA') ? b.gstin : '36AAUFT4289K1ZE',
                cin: cleanCin,
                pan: b.pan || 'AAYFT4513H',
                email: b.email || 'contact@tejobharat.com',
                website: b.website || 'www.tejobharat.com',
                signatory_title: b.signatory_title || 'Authorized Signatory',
                state: 'Telangana'
              };
            }
            return {
              ...b,
              company_name: b.company_name || 'TEJO BHARAT GLOBAL ENERGY LLP',
              cin: cleanCin,
              pan: b.pan || 'AAYFT4513H',
              website: b.website || 'www.tejobharat.com',
              signatory_title: b.signatory_title || 'Authorized Signatory'
            };
          });
        }
      } catch (e) {
        console.warn(e);
        finalBranches = DEFAULT_BRANCHES;
      }
    }
    setBranches(finalBranches);
    localStorage.setItem('tb_branches_list', JSON.stringify(finalBranches));
    if (selectedBranchId === 'vizag-ap' || !finalBranches.some(b => b.id === selectedBranchId)) {
      setSelectedBranchId(finalBranches[0]?.id || 'hyd-hq');
    }

    // Load & merge customer parties
    const localP = localStorage.getItem('tb_parties_list');
    let combinedParties: Party[] = [...DEFAULT_PARTIES, ...(historicalParties as Party[])];
    if (localP) {
      try {
        const parsed: Party[] = JSON.parse(localP);
        const map = new Map<string, Party>();
        combinedParties.forEach(p => map.set((p.name || '').toLowerCase().trim(), p));
        parsed.forEach(p => map.set((p.name || '').toLowerCase().trim(), p));
        combinedParties = Array.from(map.values());
      } catch (e) { console.warn(e); }
    }
    setParties(combinedParties);
    localStorage.setItem('tb_parties_list', JSON.stringify(combinedParties));

    const localI = localStorage.getItem('tb_items_list');
    if (localI) {
      try { setItems(JSON.parse(localI)); } catch (e) { console.warn(e); }
    }

    const localPayIn = localStorage.getItem('tb_payment_in_records');
    if (localPayIn) {
      try { setPaymentInRecords(JSON.parse(localPayIn)); } catch (e) { console.warn(e); }
    }

    // Load & merge quotations (STRICTLY filter to quotation numbers starting with TBGE)
    const localQuotes = localStorage.getItem('tb_quotations_history');
    const masterHistorical = (historicalQuotations as Quotation[]).filter(q => 
      (q.quotation_no || '').trim().toUpperCase().startsWith('TBGE')
    );
    let combinedQuotes: Quotation[] = [...masterHistorical];
    if (localQuotes) {
      try {
        const parsed: Quotation[] = JSON.parse(localQuotes);
        const map = new Map<string, Quotation>();
        // Base historical definitions
        masterHistorical.forEach(q => map.set((q.quotation_no || '').trim().toUpperCase(), q));
        // User edits and saved quotations from localStorage take precedence
        parsed.filter(q => (q.quotation_no || '').trim().toUpperCase().startsWith('TBGE'))
              .forEach(q => {
                const key = (q.quotation_no || '').trim().toUpperCase();
                // If it's the obsolete 12.75L draft, keep the canonical 14.70L version
                if (key === 'TBGE2627Q003') {
                  if (q.total_amount === 1275000) return;
                  if (!q.gst_rate_percent || q.gst_rate_percent === 0) {
                    const canonical = masterHistorical.find(m => (m.quotation_no || '').trim().toUpperCase() === 'TBGE2627Q003');
                    q = {
                      ...q,
                      gst_rate_percent: canonical?.gst_rate_percent || 8.9,
                      line_items: canonical?.line_items || INITIAL_QUOTATION.line_items,
                    };
                  }
                }
                map.set(key, q);
              });
        combinedQuotes = Array.from(map.values()).filter(q => 
          (q.quotation_no || '').trim().toUpperCase().startsWith('TBGE')
        );
      } catch (e) { console.warn(e); }
    }
    // Helper to remove any "(Rate: ₹.../kW)" or "(Rate: ...)" from line items
    const stripRateFromItems = (items?: LineItem[]): LineItem[] | undefined => {
      if (!items) return items;
      return items.map(it => ({
        ...it,
        description: it.description 
          ? it.description
              .replace(/\s*\(\s*Rate:\s*₹?[^)]+\/kW\s*\)/gi, '')
              .replace(/\s*\(\s*Rate:\s*[^)]+\)/gi, '')
              .replace(/\s*Rate:\s*₹?[^,\s)]+\/kW/gi, '')
              .trim() 
          : it.description
      }));
    };

    // Sanitize quotations: remove (Rate: ...), heal multi-site items, and ensure AP details
    combinedQuotes = combinedQuotes.map(q => {
      const isAP = (q.branch_id === 'pith-ap') || 
                   (q.branch?.state?.toLowerCase().includes('andhra')) || 
                   (q.customer_location?.toLowerCase().includes('andhra')) ||
                   (q.customer_address?.toLowerCase().includes('andhra'));
      let sanitizedLineItems = stripRateFromItems(q.line_items);

      if (sanitizedLineItems && sanitizedLineItems.length > 0 && (/^\d+\s*k[wW]p?\s*On/i.test(sanitizedLineItems[0].name))) {
        const hasOtherKvbSites = sanitizedLineItems.some(it => it.name.includes('Panchayat') || it.name.includes('RSK'));
        if (hasOtherKvbSites) {
          sanitizedLineItems = sanitizedLineItems.map((it, idx) => idx === 0 ? {
            ...it,
            name: 'ZPHS School – 5 kW On-Grid Solar System',
            description: '5 kWp 500+ W Mono DCR Solar Array, 5 kW On-Grid String Inverter, HDG Structure & BOS'
          } : it);
        }
      }

      const kwItems = sanitizedLineItems?.filter(it => {
        const u = (it.unit || '').trim().toLowerCase();
        return u === 'kw' || u === 'kwp';
      }) || [];
      const sumKw = kwItems.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);
      const cap = sumKw > 0 ? sumKw : (q.system_capacity_kw || 5);

      if (isAP && q.branch) {
        return {
          ...q,
          system_capacity_kw: cap,
          line_items: sanitizedLineItems,
          branch: {
            ...q.branch,
            gstin: '37AAYFT4513H1ZO',
            email: 'contact@tejobharat.com',
          }
        };
      }
      return {
        ...q,
        system_capacity_kw: cap,
        line_items: sanitizedLineItems
      };
    });
    setQuotationsHistory(combinedQuotes);
    localStorage.setItem('tb_quotations_history', JSON.stringify(combinedQuotes));

    // Also sanitize current active quotation in state
    setQuotation(prev => {
      let items: LineItem[] = stripRateFromItems(prev.line_items) || [];
      const isKvb003 = (prev.quotation_no || '').trim().toUpperCase() === 'TBGE2627Q003';
      let gstRate = prev.gst_rate_percent;
      if (isKvb003 && (!gstRate || gstRate === 0)) {
        gstRate = 8.9;
        items = INITIAL_QUOTATION.line_items || [];
      }
      if (items && items.length > 0 && (/^\d+\s*k[wW]p?\s*On/i.test(items[0].name))) {
        const hasOtherKvbSites = items.some(it => it.name.includes('Panchayat') || it.name.includes('RSK'));
        if (hasOtherKvbSites) {
          items = items.map((it, idx) => idx === 0 ? {
            ...it,
            name: 'ZPHS School – 5 kW On-Grid Solar System',
            description: '5 kWp 500+ W Mono DCR Solar Array, 5 kW On-Grid String Inverter, HDG Structure & BOS'
          } : it);
        }
      }
      const kwItems = items.filter(it => {
        const u = (it.unit || '').trim().toLowerCase();
        return u === 'kw' || u === 'kwp';
      });
      const sumKw = kwItems.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);
      const cap = sumKw > 0 ? sumKw : (prev.system_capacity_kw || 17);

      return {
        ...prev,
        gst_rate_percent: gstRate,
        system_capacity_kw: cap,
        line_items: items
      };
    });
  }, []);

  const handleSaveParty = (party: Party, saveAndNew: boolean = false) => {
    let updated: Party[];
    if (party.id || editingParty?.id) {
      const pId = party.id || editingParty?.id;
      updated = parties.map(p => (p.id === pId || p.name === party.name ? { ...party, id: pId } : p));
    } else {
      const newP: Party = {
        ...party,
        id: `p-${Date.now()}`,
        balance: party.opening_balance || 0,
        balance_type: party.opening_balance_type || 'To Collect',
      };
      updated = [newP, ...parties];
    }

    setParties(updated);
    localStorage.setItem('tb_parties_list', JSON.stringify(updated));

    setNotification({
      type: 'success',
      message: `Party "${party.name}" saved successfully!`
    });
    setTimeout(() => setNotification(null), 4000);

    if (saveAndNew) {
      setEditingParty(null);
      if (activeTab !== 'create') {
        setActiveTab('party_form');
      }
    } else {
      setEditingParty(null);
      if (activeTab !== 'create') {
        setActiveTab('parties');
      }
    }
  };

  const handleDeleteParty = (id?: string) => {
    if (!id) return;
    const targetParty = parties.find(p => p.id === id);
    if (!targetParty) return;

    const pNameLower = targetParty.name.toLowerCase().trim();

    // Check linked quotations/invoices
    const linkedQuotes = quotationsHistory.filter(q => 
      q.customer_name?.toLowerCase().trim() === pNameLower
    );

    // Check linked payment in records
    const linkedPayments = paymentInRecords.filter(p => 
      p.party_name?.toLowerCase().trim() === pNameLower
    );

    if (linkedQuotes.length > 0 || linkedPayments.length > 0) {
      alert(
        `❌ CANNOT DELETE PARTY "${targetParty.name.toUpperCase()}"\n\nThis party has active transactions linked to it:\n` +
        (linkedQuotes.length > 0 ? `• ${linkedQuotes.length} Document(s) (Invoices / Quotations)\n` : '') +
        (linkedPayments.length > 0 ? `• ${linkedPayments.length} Payment In Record(s)\n` : '') +
        `\nPlease delete all linked invoices and payment records for this party first before deleting the party.`
      );
      return;
    }

    if (!confirm(`Are you sure you want to delete party "${targetParty.name}"?`)) return;

    const updated = parties.filter(p => p.id !== id);
    setParties(updated);
    localStorage.setItem('tb_parties_list', JSON.stringify(updated));

    setNotification({
      type: 'success',
      message: `Party "${targetParty.name}" deleted successfully.`
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSaveItem = (item: Item, saveAndNew: boolean = false) => {
    let updated: Item[];
    if (item.id || editingItem?.id) {
      const iId = item.id || editingItem?.id;
      updated = items.map(i => (i.id === iId || i.name === item.name ? { ...item, id: iId } : i));
    } else {
      const newI: Item = {
        ...item,
        id: `itm-${Date.now()}`,
      };
      updated = [newI, ...items];
    }

    setItems(updated);
    localStorage.setItem('tb_items_list', JSON.stringify(updated));

    setNotification({
      type: 'success',
      message: `Item "${item.name}" saved successfully!`
    });
    setTimeout(() => setNotification(null), 4000);

    if (saveAndNew) {
      setEditingItem(null);
      setIsItemModalOpen(true);
    } else {
      setEditingItem(null);
      setIsItemModalOpen(false);
    }
  };

  const handleDeleteItem = (id?: string) => {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this item?')) return;
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    localStorage.setItem('tb_items_list', JSON.stringify(updated));
  };

  const handleNewDocument = (docType: DocumentType = 'Sales Invoice') => {
    const localStr = localStorage.getItem('tb_quotations_history') || '[]';
    const localQuotes: Quotation[] = JSON.parse(localStr);
    const allRecords = localQuotes.length > 0 ? localQuotes : quotationsHistory;
    
    const quoteNo = getNextSequentialNumber(docType, allRecords);

    setQuotation({
      ...INITIAL_QUOTATION,
      id: `q-${Date.now()}`,
      document_type: docType,
      invoice_prefix: quoteNo.slice(0, 10),
      quotation_no: quoteNo,
      quotation_date: new Date().toISOString().split('T')[0],
      branch_id: activeBranch.id,
      branch: activeBranch,
    });
    setCreateFormMode('edit');
    setActiveTab('create');
  };

  const handleSavePaymentIn = (record: PaymentInRecord) => {
    // 1. Add record to paymentInRecords
    const updatedRecords = [record, ...paymentInRecords];
    setPaymentInRecords(updatedRecords);
    localStorage.setItem('tb_payment_in_records', JSON.stringify(updatedRecords));

    // 2. Reflect settled payments onto target invoices!
    const localStr = localStorage.getItem('tb_quotations_history') || '[]';
    let localQuotes: Quotation[] = JSON.parse(localStr);
    if (localQuotes.length === 0) localQuotes = [quotation];

    const updatedQuotations = localQuotes.map((q) => {
      const settledItem = record.settled_invoices.find((item) => item.invoice_no === q.quotation_no);
      if (settledItem) {
        const newRec = (q.amount_received || 0) + settledItem.amount_settled;
        const isPaidFull = newRec >= q.total_amount;
        return {
          ...q,
          amount_received: newRec,
          payment_status: (isPaidFull ? 'Paid' : 'Partial') as any,
          is_fully_paid: isPaidFull,
        };
      }
      return q;
    });

    // Also update current active quotation if matched
    const currentSettled = record.settled_invoices.find((item) => item.invoice_no === quotation.quotation_no);
    if (currentSettled) {
      const newRec = (quotation.amount_received || 0) + currentSettled.amount_settled;
      const isPaidFull = newRec >= quotation.total_amount;
      setQuotation((prev) => ({
        ...prev,
        amount_received: newRec,
        payment_status: isPaidFull ? 'Paid' : 'Partial',
        is_fully_paid: isPaidFull,
      }));
    }

    setQuotationsHistory(updatedQuotations);
    localStorage.setItem('tb_quotations_history', JSON.stringify(updatedQuotations));

    setNotification({
      type: 'success',
      message: `Payment In #${record.payment_number} recorded successfully! Settlement reflected on Invoice.`
    });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleDeletePaymentInRecord = (id: string) => {
    const deletedRecord = paymentInRecords.find(p => p.id === id);
    if (!deletedRecord) return;

    if (!confirm(`Are you sure you want to delete Payment In #${deletedRecord.payment_number}?`)) return;

    // 1. Remove from paymentInRecords
    const updatedRecords = paymentInRecords.filter(p => p.id !== id);
    setPaymentInRecords(updatedRecords);
    localStorage.setItem('tb_payment_in_records', JSON.stringify(updatedRecords));

    // 2. Un-settle linked invoices and restore balance
    if (deletedRecord.settled_invoices && deletedRecord.settled_invoices.length > 0) {
      const localStr = localStorage.getItem('tb_quotations_history') || '[]';
      let localQuotes: Quotation[] = JSON.parse(localStr);
      if (localQuotes.length === 0) localQuotes = [quotation];

      const updatedQuotations = localQuotes.map((q) => {
        const settledItem = deletedRecord.settled_invoices.find((s) => s.invoice_no === q.quotation_no);
        if (settledItem) {
          const newRec = Math.max(0, (q.amount_received || 0) - settledItem.amount_settled);
          const isPaidFull = newRec >= q.total_amount;
          const newStatus = isPaidFull ? 'Paid' : newRec > 0 ? 'Partial' : 'Unpaid';
          return {
            ...q,
            amount_received: newRec,
            payment_status: newStatus as any,
            is_fully_paid: isPaidFull,
          };
        }
        return q;
      });

      setQuotationsHistory(updatedQuotations);
      localStorage.setItem('tb_quotations_history', JSON.stringify(updatedQuotations));

      // Also update active quotation if matched
      const currentSettled = deletedRecord.settled_invoices.find((s) => s.invoice_no === quotation.quotation_no);
      if (currentSettled) {
        const newRec = Math.max(0, (quotation.amount_received || 0) - currentSettled.amount_settled);
        const isPaidFull = newRec >= quotation.total_amount;
        const newStatus = isPaidFull ? 'Paid' : newRec > 0 ? 'Partial' : 'Unpaid';
        setQuotation((prev) => ({
          ...prev,
          amount_received: newRec,
          payment_status: newStatus as any,
          is_fully_paid: isPaidFull,
        }));
      }
    }

    setNotification({
      type: 'success',
      message: `Payment In #${deletedRecord.payment_number} deleted. Invoice balance updated.`
    });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleAddBranch = (newBranch: Branch) => {
    const updated = [...branches, newBranch];
    setBranches(updated);
    localStorage.setItem('tb_branches_list', JSON.stringify(updated));
    setSelectedBranchId(newBranch.id);
    setQuotation((prev) => ({ ...prev, branch_id: newBranch.id, branch: newBranch }));
  };

  const handleUpdateBranch = (updatedBranch: Branch) => {
    const updated = branches.map(b => b.id === updatedBranch.id ? updatedBranch : b);
    setBranches(updated);
    localStorage.setItem('tb_branches_list', JSON.stringify(updated));
    if (selectedBranchId === updatedBranch.id || quotation.branch_id === updatedBranch.id) {
      setQuotation((prev) => ({ ...prev, branch: updatedBranch }));
    }
  };

  const handleDeleteBranch = (branchId: string) => {
    const updated = branches.filter(b => b.id !== branchId);
    setBranches(updated);
    localStorage.setItem('tb_branches_list', JSON.stringify(updated));
    if (selectedBranchId === branchId && updated.length > 0) {
      setSelectedBranchId(updated[0].id);
      setQuotation((prev) => ({ ...prev, branch_id: updated[0].id, branch: updated[0] }));
    }
  };

  const handleSaveToSupabase = async () => {
    setIsSaving(true);
    setNotification(null);

    const cleanNo = (quotation.quotation_no || '').trim().toUpperCase();
    if (!cleanNo) {
      alert('❌ Please enter a valid Document / Invoice Number before saving.');
      setIsSaving(false);
      return;
    }

    const quoteId = quotation.id || `quote-${cleanNo}`;
    let savedQuotation: Quotation = {
      ...quotation,
      id: quoteId,
      quotation_no: cleanNo,
      quotation_date: quotation.quotation_date || new Date().toISOString().split('T')[0],
      valid_until: quotation.valid_until || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    };

    try {
      // Save Document to Supabase
      const { error } = await supabase
        .from('quotations')
        .upsert([{
          quotation_no: savedQuotation.quotation_no,
          document_type: savedQuotation.document_type || 'Sales Invoice',
          quotation_date: savedQuotation.quotation_date,
          expiry_date: savedQuotation.valid_until,
          customer_name: savedQuotation.customer_name,
          customer_mobile: savedQuotation.customer_phone,
          total_amount: savedQuotation.total_amount,
          status: 'active',
          created_at: new Date().toISOString(),
        }]);

      if (error) {
        console.warn('Supabase save info:', error.message);
      }

      // Save locally as persistence fallback
      if (savedQuotation.amount_received && savedQuotation.amount_received > 0) {
        const settledAmt = Number(quotation.amount_received) || 0;
        const totalAmt = quotation.total_amount || 0;
        const isPaidFull = settledAmt >= totalAmt;
        const currentPayStatus = isPaidFull ? 'Paid' : 'Partial';

        savedQuotation.payment_status = currentPayStatus as any;
        savedQuotation.is_fully_paid = isPaidFull;

        const existingIdx = paymentInRecords.findIndex(p => 
          p.settled_invoices?.some(s => s.invoice_no === quotation.quotation_no)
        );

        const payInNo = existingIdx >= 0 
          ? paymentInRecords[existingIdx].payment_number 
          : `${214 + paymentInRecords.length}`;

        const autoPaymentIn: PaymentInRecord = {
          id: existingIdx >= 0 ? paymentInRecords[existingIdx].id : `payin-auto-${quotation.quotation_no}`,
          payment_number: payInNo,
          party_name: quotation.customer_name,
          payment_date: quotation.quotation_date || new Date().toISOString().split('T')[0],
          payment_mode: (quotation.payment_type as any) || 'Cash',
          amount_received: settledAmt,
          discount: 0,
          notes: `Payment received for ${quotation.document_type || 'Sales Invoice'} #${quotation.quotation_no}`,
          settled_invoices: [
            {
              invoice_no: quotation.quotation_no,
              date: quotation.quotation_date,
              invoice_amount: totalAmt,
              tds: 0,
              discount: 0,
              amount_settled: settledAmt,
              balance_amount: Math.max(0, totalAmt - settledAmt),
            }
          ],
          created_at: new Date().toISOString(),
        };

        let updatedPayInList: PaymentInRecord[];
        if (existingIdx >= 0) {
          updatedPayInList = paymentInRecords.map((p, idx) => idx === existingIdx ? autoPaymentIn : p);
        } else {
          updatedPayInList = [autoPaymentIn, ...paymentInRecords];
        }

        setPaymentInRecords(updatedPayInList);
        localStorage.setItem('tb_payment_in_records', JSON.stringify(updatedPayInList));
      }

      const localStr = localStorage.getItem('tb_quotations_history') || '[]';
      const localArr: Quotation[] = JSON.parse(localStr);
      const filtered = localArr.filter(q => 
        (q.quotation_no || '').trim().toUpperCase() !== cleanNo &&
        q.id !== savedQuotation.id
      );
      const updatedHistory = [savedQuotation, ...filtered];
      localStorage.setItem('tb_quotations_history', JSON.stringify(updatedHistory));
      setQuotationsHistory(updatedHistory);
      setQuotation(savedQuotation);

      const typeLabel = quotation.document_type || 'Document';
      setNotification({
        type: 'success',
        message: `${typeLabel} ${quotation.quotation_no} saved successfully!`
      });
      if (savedQuotation.document_type) {
        setActiveDocFilter(savedQuotation.document_type);
      }
      setActiveTab('list');
    } catch (e: any) {
      console.error(e);
      setNotification({
        type: 'error',
        message: 'Failed to save document: ' + e.message
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      app: 'Tejo Bharat Solar Quotation App',
      version: '1.0',
      exported_at: new Date().toISOString(),
      quotations: quotationsHistory,
      parties,
      items,
      branches,
      paymentInRecords,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tejo_bharat_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setNotification({
      type: 'success',
      message: `Backup exported successfully (${quotationsHistory.length} documents, ${parties.length} parties saved).`
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleImportBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.quotations && Array.isArray(parsed.quotations)) {
          setQuotationsHistory(parsed.quotations);
          localStorage.setItem('tb_quotations_history', JSON.stringify(parsed.quotations));
        }
        if (parsed.parties && Array.isArray(parsed.parties)) {
          setParties(parsed.parties);
          localStorage.setItem('tb_parties_list', JSON.stringify(parsed.parties));
        }
        if (parsed.items && Array.isArray(parsed.items)) {
          setItems(parsed.items);
          localStorage.setItem('tb_items_list', JSON.stringify(parsed.items));
        }
        if (parsed.paymentInRecords && Array.isArray(parsed.paymentInRecords)) {
          setPaymentInRecords(parsed.paymentInRecords);
          localStorage.setItem('tb_payment_in_records', JSON.stringify(parsed.paymentInRecords));
        }
        setNotification({
          type: 'success',
          message: `Backup restored successfully! Loaded ${parsed.quotations?.length || 0} documents.`
        });
        setTimeout(() => setNotification(null), 5000);
      } catch (err: any) {
        alert('Failed to parse backup JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#f4f5f9] flex font-sans select-none">
      
      {/* MyBillBook Left Dark Sidebar */}
      <Sidebar
        basePath={basePath}
        onBackToCrm={onBackToCrm}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeDocFilter={activeDocFilter}
        setActiveDocFilter={setActiveDocFilter}
        onNewDocument={handleNewDocument}
        onOpenBranchModal={() => setIsBranchModalOpen(true)}
        onOpenParties={() => setActiveTab('parties')}
        onOpenItems={() => setActiveTab('items')}
        onOpenCreateParty={() => {
          setEditingParty(null);
          setActiveTab('party_form');
        }}
        onOpenCreateItem={() => {
          setEditingItem(null);
          setIsItemModalOpen(true);
        }}
        onOpenCreatePaymentIn={() => {
          setSelectedInvoiceForModal(null);
          setIsPaymentInModalOpen(true);
        }}
        quotationsCount={quotationsHistory.filter(q => (q.document_type || 'Quotation') === 'Quotation').length}
        invoicesCount={quotationsHistory.filter(q => q.document_type === 'Sales Invoice' || q.document_type === 'Tax Invoice').length}
        partiesCount={parties.length}
        itemsCount={items.length}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        <main className="flex-1 w-full px-6 py-4 overflow-y-auto">
          
          {/* Notification Alert */}
          {notification && (
            <div className={`mb-4 p-3.5 rounded-xl flex items-center justify-between shadow-md transition-all no-print ${
              notification.type === 'success' ? 'bg-emerald-900 text-white' : 'bg-rose-900 text-white'
            }`}>
              <div className="flex items-center gap-3 text-xs font-semibold">
                {notification.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                )}
                <span>{notification.message}</span>
              </div>
              <button onClick={() => setNotification(null)} className="text-white opacity-70 hover:opacity-100 text-xs font-bold px-2">
                ✕
              </button>
            </div>
          )}

          {isEwayBillViewOpen ? (
            <EwayBillForm
              quotation={selectedInvoiceForModal || quotation}
              branch={activeBranch}
              onSave={(ewayData) => {
                const ewayNo = ewayData.eway_bill_no;
                setQuotation((prev) => ({ ...prev, eway_bill_no: ewayNo }));
                const updatedHistory = quotationsHistory.map((q) => 
                  q.quotation_no === (selectedInvoiceForModal?.quotation_no || quotation.quotation_no)
                    ? { ...q, eway_bill_no: ewayNo }
                    : q
                );
                setQuotationsHistory(updatedHistory);
                localStorage.setItem('tb_quotations_history', JSON.stringify(updatedHistory));
                setIsEwayBillViewOpen(false);
                setSelectedInvoiceForModal(null);
                setNotification({
                  type: 'success',
                  message: `E-way Bill #${ewayNo} generated successfully!`
                });
                setTimeout(() => setNotification(null), 4000);
              }}
              onCancel={() => {
                setIsEwayBillViewOpen(false);
                setSelectedInvoiceForModal(null);
              }}
            />
          ) : activeTab === 'create' ? (
            <div className="space-y-4">
              
              {/* Form View (Edit Mode) */}
              {createFormMode === 'edit' ? (
                <QuotationForm
                  branches={branches}
                  selectedBranchId={selectedBranchId}
                  onSelectBranch={(id) => {
                    setSelectedBranchId(id);
                    const br = branches.find(b => b.id === id);
                    if (br) {
                      setQuotation(prev => ({ ...prev, branch_id: br.id, branch: br }));
                    }
                  }}
                  quotation={quotation}
                  onChangeQuotation={setQuotation}
                  parties={parties}
                  items={items}
                  onExit={() => {
                    setActiveTab('list');
                    navigate(`${basePath || ''}/quotations`);
                  }}
                  onSave={handleSaveToSupabase}
                  mode={createFormMode}
                  setMode={setCreateFormMode}
                  onOpenCreateItem={() => {
                    setEditingItem(null);
                    setIsItemModalOpen(true);
                  }}
                  onUpdatePartyInList={(p) => handleSaveParty(p, false)}
                  onOpenBranchModal={() => setIsBranchModalOpen(true)}
                />
              ) : (
                /* Preview View (Preview Mode) */
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm no-print">
                    <button
                      onClick={() => setCreateFormMode('edit')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Edit</span>
                    </button>

                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                      <button
                        onClick={() => setCreateFormMode('edit')}
                        className="px-4 py-1 text-slate-500 hover:text-slate-900"
                      >
                        Edit Mode
                      </button>
                      <button
                        onClick={() => setCreateFormMode('preview')}
                        className="px-4 py-1 bg-white text-indigo-700 rounded-lg shadow-sm"
                      >
                        Preview Mode
                      </button>
                    </div>

                    <button
                      onClick={handleSaveToSupabase}
                      className="px-4 py-1.5 bg-[#4f46e5] text-white font-extrabold text-xs rounded-lg shadow"
                    >
                      Save Document
                    </button>
                  </div>

                  <QuotationPreview
                    quotation={quotation}
                    onChangeQuotation={setQuotation}
                    branch={activeBranch}
                    onSaveToSupabase={handleSaveToSupabase}
                    isSaving={isSaving}
                    onOpenRecordPayment={() => {
                      setSelectedInvoiceForModal(quotation);
                      setIsPaymentInModalOpen(true);
                    }}
                    onOpenEwayBill={() => {
                      setSelectedInvoiceForModal(quotation);
                      setIsEwayBillViewOpen(true);
                    }}
                    payments={paymentInRecords}
                    parties={parties}
                    onOpenBranchModal={() => setIsBranchModalOpen(true)}
                    onBackToList={() => {
                      setActiveTab('list');
                      navigate(`${basePath || ''}/quotations`);
                    }}
                  />
                </div>
              )}

            </div>
          ) : activeTab === 'parties' ? (
            <PartiesList
              parties={parties}
              onOpenCreateParty={() => {
                setEditingParty(null);
                setActiveTab('party_form');
              }}
              onEditParty={(p) => {
                setEditingParty(p);
                setActiveTab('party_form');
              }}
              onDeleteParty={handleDeleteParty}
              onSelectPartyForQuotation={(p) => {
                const partyAddr = p.billing_address || p.shipping_address || '';
                const partyLoc = partyAddr ? partyAddr.slice(0, 40) : '';
                setQuotation({
                  ...quotation,
                  customer_name: p.name,
                  customer_phone: p.mobile_number || '',
                  customer_gstin: p.gstin || '',
                  customer_pan: p.pan_number || '',
                  customer_address: partyAddr,
                  customer_billing_address: p.billing_address || '',
                  customer_shipping_address: p.shipping_address || partyAddr,
                  customer_location: partyLoc,
                });
                setCreateFormMode('edit');
                setActiveTab('create');
              }}
            />
          ) : activeTab === 'party_form' ? (
            <PartyForm
              initialParty={editingParty}
              onSave={handleSaveParty}
              onCancel={() => setActiveTab('parties')}
            />
          ) : activeTab === 'items' ? (
            <ItemsList
              items={items}
              onOpenCreateItem={() => {
                setEditingItem(null);
                setIsItemModalOpen(true);
              }}
              onEditItem={(item) => {
                setEditingItem(item);
                setIsItemModalOpen(true);
              }}
              onDeleteItem={handleDeleteItem}
            />
          ) : (
            <QuotationsList
              activeDocFilter={activeDocFilter}
              onSelectQuotation={(q) => {
                setQuotation(q);
                setCreateFormMode('preview');
                setActiveTab('create');
                const routePrefix = (basePath || '') + (q.document_type === 'Quotation' ? '/quotations' : '/invoices');
                navigate(`${routePrefix}/${q.quotation_no}`);
              }}
              onNewQuotation={(type) => {
                handleNewDocument(type || 'Sales Invoice');
              }}
              paymentInRecords={paymentInRecords}
              onOpenCreatePaymentIn={() => {
                setSelectedInvoiceForModal(null);
                setIsPaymentInModalOpen(true);
              }}
              onDeletePaymentInRecord={handleDeletePaymentInRecord}
            />
          )}
        </main>
      </div>

      {/* Record Payment In Modal */}
      <PaymentInModal
        isOpen={isPaymentInModalOpen}
        onClose={() => {
          setIsPaymentInModalOpen(false);
          setSelectedInvoiceForModal(null);
        }}
        parties={parties}
        quotations={quotationsHistory.length > 0 ? quotationsHistory : [quotation]}
        onSavePaymentIn={handleSavePaymentIn}
        nextPaymentNumber={`${214 + paymentInRecords.length + 1}`}
        invoice={selectedInvoiceForModal}
      />

      {/* Item Modal */}
      <ItemModal
        isOpen={isItemModalOpen}
        initialItem={editingItem}
        onClose={() => setIsItemModalOpen(false)}
        onSave={handleSaveItem}
      />

      {/* Branch Modal */}
      <BranchModal
        isOpen={isBranchModalOpen}
        onClose={() => setIsBranchModalOpen(false)}
        branches={branches}
        selectedBranchId={selectedBranchId}
        onSelectBranch={(id) => {
          setSelectedBranchId(id);
          const br = branches.find(b => b.id === id);
          if (br) setQuotation(prev => ({ ...prev, branch_id: br.id, branch: br }));
        }}
        onAddBranch={handleAddBranch}
        onUpdateBranch={handleUpdateBranch}
        onDeleteBranch={handleDeleteBranch}
      />
    </div>
  );
}

export default App;
