import React, { useState, useEffect } from 'react';
import { 
  Quotation, 
  Branch, 
  Party, 
  DocumentType, 
  LineItem, 
  Item, 
  PANEL_BRANDS, 
  INVERTER_BRANDS,
  INVERTER_PHASES,
  STRUCTURE_GRIDS,
  STRUCTURE_HEIGHTS,
  STRUCTURE_TYPES,
  CABLE_BRANDS,
  ScopeItem,
  DEFAULT_SCOPE_ITEMS
} from '../types/quotation';
import { generateQuotationNumber, getNextSequentialNumber, NumberFormatType } from '../lib/quoteNumberGenerator';
import { fetchGSTDetails } from '../lib/gstLookup';
import { calculateSolarYieldAndCO2, ALL_INDIAN_STATES } from '../lib/solarYieldLookup';
import { AddItemsToBillModal } from './AddItemsToBillModal';
import { OffGridCalculatorModal } from './OffGridCalculatorModal';
import { PartyForm } from './PartyForm';
import { ManageDropdownsModal, DEFAULT_BOM_DROPDOWN_OPTIONS, BomDropdownOptions } from './ManageDropdownsModal';
import { 
  ArrowLeft, 
  Settings, 
  Keyboard, 
  Plus, 
  Scan, 
  FileText, 
  Landmark, 
  QrCode, 
  HelpCircle,
  Sparkles,
  GripVertical,
  MoreVertical,
  X,
  User,
  Building2,
  Truck,
  Copy,
  Check,
  Bookmark,
  Save,
  Trash2,
  BookmarkPlus
} from 'lucide-react';

export interface BomPreset {
  id: string;
  name: string;
  inverter_brand: string;
  inverter_phase: string;
  structure_grid: string;
  structure_height: string;
  structure_type: string;
  panel_brand: string;
  cables_brand: string;
}

export const DEFAULT_BOM_PRESETS: BomPreset[] = [
  {
    id: 'preset-3kw',
    name: '3kW Residential Standard',
    inverter_brand: 'Deye Inverter',
    inverter_phase: 'Single Phase (1-Phase)',
    structure_grid: '3x5 (15 Modules Table)',
    structure_height: 'Elevated Superstructure (6ft–10ft Height)',
    structure_type: 'Hot-Dip Galvanized (HDG) Steel Superstructure (80+ Micron Zinc)',
    panel_brand: 'Waaree (500+ W TopCon / DCR Mono)',
    cables_brand: 'Polycab Solar DC & Armored AC Cables'
  },
  {
    id: 'preset-5kw',
    name: '5kW Elevated High-Yield',
    inverter_brand: 'Deye Inverter',
    inverter_phase: 'Single Phase (1-Phase)',
    structure_grid: '4x6 (24 Modules Table)',
    structure_height: 'Elevated Superstructure (10ft Height)',
    structure_type: 'Hot-Dip Galvanized (HDG) Steel Superstructure (80+ Micron Zinc)',
    panel_brand: 'Premier Energies (500+ W Bi-facial / TopCon)',
    cables_brand: 'KEI Industries Solar Cables'
  },
  {
    id: 'preset-10kw',
    name: '10kW Commercial 3-Phase',
    inverter_brand: 'Solis String Inverter',
    inverter_phase: 'Three Phase (3-Phase)',
    structure_grid: '4x6 (24 Modules Table)',
    structure_height: 'Elevated Superstructure (10ft Height)',
    structure_type: 'Hot-Dip Galvanized (HDG) Steel Superstructure (80+ Micron Zinc)',
    panel_brand: 'Adani Solar (500+ W Mono PERC)',
    cables_brand: 'Polycab Solar DC & Armored AC Cables'
  },
  {
    id: 'preset-hybrid',
    name: 'Hybrid Battery Storage System',
    inverter_brand: 'Deye Inverter',
    inverter_phase: 'Single Phase (1-Phase)',
    structure_grid: '3x5 (15 Modules Table)',
    structure_height: 'Elevated Superstructure (6ft–10ft Height)',
    structure_type: 'Hot-Dip Galvanized (HDG) Steel Superstructure (80+ Micron Zinc)',
    panel_brand: 'Waaree (500+ W TopCon / DCR Mono)',
    cables_brand: 'Polycab Solar DC & Armored AC Cables'
  }
];

interface QuotationFormProps {
  branches: Branch[];
  selectedBranchId: string;
  onSelectBranch: (branchId: string) => void;
  quotation: Quotation;
  onChangeQuotation: (updated: Quotation) => void;
  parties?: Party[];
  items?: Item[];
  onExit?: () => void;
  onSave?: () => void;
  mode?: 'edit' | 'preview';
  setMode?: (mode: 'edit' | 'preview') => void;
  onOpenCreateItem?: () => void;
  onEditParty?: (party: Party) => void;
  onOpenCreateParty?: () => void;
  onUpdatePartyInList?: (party: Party) => void;
  onOpenBranchModal?: () => void;
}

export const QuotationForm: React.FC<QuotationFormProps> = ({
  branches,
  selectedBranchId,
  onSelectBranch,
  quotation,
  onChangeQuotation,
  parties = [],
  items = [],
  onExit,
  onSave,
  mode = 'edit',
  setMode,
  onOpenCreateItem,
  onEditParty,
  onOpenCreateParty,
  onUpdatePartyInList,
  onOpenBranchModal
}) => {
  const [pricingMode, setPricingMode] = useState<'per_kw' | 'total_cost'>('per_kw');
  const [showPartyPicker, setShowPartyPicker] = useState<boolean>(false);
  const [showAddItemsModal, setShowAddItemsModal] = useState<boolean>(false);
  const [showOffGridModal, setShowOffGridModal] = useState<boolean>(false);

  const handleApplyOffGridQuote = (data: {
    systemCapacityKw: number;
    totalAmount: number;
    category: string;
    lineItems: LineItem[];
    ratePerKw: number;
    description: string;
  }) => {
    const custLoc = quotation.customer_location || quotation.customer_address || 'Telangana';
    const yieldInfo = calculateSolarYieldAndCO2(data.systemCapacityKw, custLoc);

    onChangeQuotation({
      ...quotation,
      category: data.category as any,
      system_capacity_kw: data.systemCapacityKw,
      rate_per_kw: data.ratePerKw,
      total_amount: data.totalAmount,
      monthly_units: yieldInfo.monthlyUnits,
      annual_units: yieldInfo.annualUnits,
      monthly_savings_rs: Math.round(yieldInfo.monthlyUnits * 7.5),
      line_items: data.lineItems,
    });
  };

  // BOM Dropdown Options Manager State & LocalStorage Persistence
  const [bomOptions, setBomOptions] = useState<BomDropdownOptions>(() => {
    const saved = localStorage.getItem('tb_bom_dropdown_options');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.warn(e); }
    }
    return DEFAULT_BOM_DROPDOWN_OPTIONS;
  });

  const [isManageDropdownsOpen, setIsManageDropdownsOpen] = useState<boolean>(false);

  const handleSaveBomOptions = (updatedOptions: BomDropdownOptions) => {
    setBomOptions(updatedOptions);
    localStorage.setItem('tb_bom_dropdown_options', JSON.stringify(updatedOptions));
  };

  const handleAddCustomValueInline = (categoryKey: keyof BomDropdownOptions, customValue: string) => {
    const val = customValue.trim();
    if (!val) return;
    const currentList = bomOptions[categoryKey];
    if (!currentList.includes(val)) {
      const updatedList = [...currentList, val];
      const updatedOptions = { ...bomOptions, [categoryKey]: updatedList };
      handleSaveBomOptions(updatedOptions);
    }
  };

  // BOM Presets State & Management
  const [bomPresets, setBomPresets] = useState<BomPreset[]>(() => {
    const saved = localStorage.getItem('tb_bom_presets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn(e);
      }
    }
    return DEFAULT_BOM_PRESETS;
  });

  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyText = (text: string, fieldId: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleCopyFullBOM = () => {
    const lines = [
      `📋 TEJO BHARAT SOLAR - BILL OF MATERIALS (BOM) & SPECIFICATIONS`,
      `⚡ Inverter Brand / Make: ${quotation.inverter_brand || bomOptions.inverterBrands[0]}`,
      `🔌 Inverter Phase: ${quotation.inverter_phase || bomOptions.inverterPhases[0]}`,
      `📐 Structure Layout Grid: ${quotation.structure_grid || bomOptions.structureGrids[0]}`,
      `📏 Structure Height: ${quotation.structure_height || bomOptions.structureHeights[0]}`,
      `🔩 Structure Material & Spec: ${quotation.structure_type || bomOptions.structureTypes[0]}`,
      `☀️ Solar Modules / Panels: ${quotation.panel_brand || bomOptions.panelBrands[0]}`,
      `🛡️ DC / AC Cables Brand: ${quotation.cables_brand || bomOptions.cableBrands[0]}`
    ];
    handleCopyText(lines.join('\n'), 'all_bom');
  };

  const handleSaveCurrentAsPreset = () => {
    const defaultName = `${quotation.system_capacity_kw || 5}kW ${quotation.inverter_brand ? quotation.inverter_brand.split(' ')[0] : 'Solar'} Package`;
    const name = prompt('Enter a name to save this BOM configuration preset:', defaultName);
    if (!name || !name.trim()) return;

    const newPreset: BomPreset = {
      id: `preset-${Date.now()}`,
      name: name.trim(),
      inverter_brand: quotation.inverter_brand || bomOptions.inverterBrands[0],
      inverter_phase: quotation.inverter_phase || bomOptions.inverterPhases[0],
      structure_grid: quotation.structure_grid || bomOptions.structureGrids[0],
      structure_height: quotation.structure_height || bomOptions.structureHeights[0],
      structure_type: quotation.structure_type || bomOptions.structureTypes[0],
      panel_brand: quotation.panel_brand || bomOptions.panelBrands[0],
      cables_brand: quotation.cables_brand || bomOptions.cableBrands[0]
    };

    const updated = [...bomPresets, newPreset];
    setBomPresets(updated);
    localStorage.setItem('tb_bom_presets', JSON.stringify(updated));
    setSelectedPresetId(newPreset.id);
    handleCopyText(newPreset.name, 'saved_preset');
  };

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (!presetId) return;
    const preset = bomPresets.find(p => p.id === presetId);
    if (preset) {
      onChangeQuotation({
        ...quotation,
        inverter_brand: preset.inverter_brand,
        inverter_phase: preset.inverter_phase,
        structure_grid: preset.structure_grid,
        structure_height: preset.structure_height,
        structure_type: preset.structure_type,
        panel_brand: preset.panel_brand,
        cables_brand: preset.cables_brand
      });
      handleCopyText(preset.name, 'preset_loaded');
    }
  };

  const handleDeletePreset = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (DEFAULT_BOM_PRESETS.some(p => p.id === presetId)) {
      alert('Built-in factory presets cannot be deleted.');
      return;
    }
    if (!window.confirm('Delete this saved BOM preset?')) return;
    const updated = bomPresets.filter(p => p.id !== presetId);
    setBomPresets(updated);
    localStorage.setItem('tb_bom_presets', JSON.stringify(updated));
    if (selectedPresetId === presetId) setSelectedPresetId('');
  };

  // Popup Party Form Modal State
  const [isPartyFormModalOpen, setIsPartyFormModalOpen] = useState<boolean>(false);
  const [partyFormInitial, setPartyFormInitial] = useState<Party | null>(null);

  const handleOpenPartyPopup = (p?: Party | null) => {
    setPartyFormInitial(p || null);
    setIsPartyFormModalOpen(true);
  };

  const handleSavePartyPopup = (savedParty: Party) => {
    if (onUpdatePartyInList) {
      onUpdatePartyInList(savedParty);
    }

    const partyAddr = savedParty.billing_address || savedParty.shipping_address || '';
    const partyLoc = partyAddr ? partyAddr.slice(0, 45) : '';

    onChangeQuotation({
      ...quotation,
      customer_name: savedParty.name,
      customer_phone: savedParty.mobile_number || '',
      customer_address: partyAddr,
      customer_billing_address: savedParty.billing_address || '',
      customer_shipping_address: savedParty.shipping_address || partyAddr,
      customer_location: partyLoc,
      customer_gstin: savedParty.gstin || '',
      customer_pan: savedParty.pan_number || '',
    });

    setIsPartyFormModalOpen(false);
    setShowPartyPicker(false);
  };
  
  const [gstinInput, setGstinInput] = useState<string>('');
  const [isFetchingGst, setIsFetchingGst] = useState<boolean>(false);
  const [gstStatus, setGstStatus] = useState<string>('');

  // Expandable sections for left side bottom buttons
  const [showNotes, setShowNotes] = useState<boolean>(Boolean(quotation.notes));
  const [showTerms, setShowTerms] = useState<boolean>(Boolean(quotation.terms_and_conditions));
  const [showBank, setShowBank] = useState<boolean>(true);
  const [showQR, setShowQR] = useState<boolean>(true);
  const [showDueDate, setShowDueDate] = useState<boolean>(Boolean(quotation.due_date));
  const [showAdditionalCharges, setShowAdditionalCharges] = useState<boolean>(Boolean(quotation.additional_charges));

  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];

  // Initialize line items if empty
  const lineItems: LineItem[] = (quotation.line_items && quotation.line_items.length > 0)
    ? quotation.line_items
    : [
        {
          id: 'line-default-1',
          name: `${quotation.system_capacity_kw || 5} kWp On-Grid Solar PV Power System`,
          description: `${quotation.system_capacity_kw || 5} kWp 500+ W Mono DCR Solar Array, ${quotation.system_capacity_kw || 5} kW On-Grid String Inverter, HDG Structure & BOS`,
          hsn_code: quotation.hsn_code || '85414011',
          qty: quotation.system_capacity_kw || 5,
          unit: 'kW',
          price_per_item: Math.round((((quotation.total_amount || 300000) / (1 + (quotation.gst_rate_percent || 8.9) / 100)) / (quotation.system_capacity_kw || 5)) * 100) / 100,
          update_sales_price: false,
          discount_rs: 0,
          discount_percent: 0,
          tax_rate_percent: quotation.gst_rate_percent || 8.9,
          tax_amount: Math.round(((quotation.total_amount || 300000) - ((quotation.total_amount || 300000) / (1 + (quotation.gst_rate_percent || 8.9) / 100))) * 100) / 100,
          total_amount: quotation.total_amount || 300000,
        }
      ];

  const handleGstLookup = async () => {
    if (!gstinInput || gstinInput.trim().length !== 15) {
      setGstStatus('GSTIN must be 15 characters long (e.g. 37AAYFT4513H1ZO)');
      return;
    }

    setIsFetchingGst(true);
    setGstStatus('Fetching GSTIN details...');

    try {
      const details = await fetchGSTDetails(gstinInput);
      const updatedCustName = details.tradeName || details.legalName || quotation.customer_name;
      const updatedLocation = `${details.city || 'Kakinada'}, ${details.state}`;
      
      onChangeQuotation({
        ...quotation,
        customer_name: updatedCustName.includes('Entity (') ? quotation.customer_name : updatedCustName,
        customer_location: updatedLocation,
        customer_address: details.billingAddress,
        customer_billing_address: details.billingAddress,
        customer_shipping_address: details.shippingAddress,
        same_as_billing: true,
        customer_gstin: details.gstin,
        customer_pan: details.pan,
      });

      setGstStatus(`✓ Success: Found ${details.legalName} | State: ${details.state}`);
    } catch (err: any) {
      setGstStatus(`Error: ${err.message}`);
    } finally {
      setIsFetchingGst(false);
    }
  };

  const handleSelectParty = (p: Party) => {
    const partyAddr = p.billing_address || p.shipping_address || '';
    const partyLoc = partyAddr ? partyAddr.slice(0, 45) : '';
    onChangeQuotation({
      ...quotation,
      customer_name: p.name,
      customer_phone: p.mobile_number || '',
      customer_address: partyAddr,
      customer_billing_address: p.billing_address || '',
      customer_shipping_address: p.shipping_address || partyAddr,
      customer_location: partyLoc,
      customer_gstin: p.gstin || '',
      customer_pan: p.pan_number || '',
    });
    setShowPartyPicker(false);
  };

  const handleAddItemsFromModal = (itemsToAdd: LineItem[]) => {
    const updatedLineItems = [...lineItems, ...itemsToAdd];
    updateInvoiceTotals(updatedLineItems);
  };

  const handleLineItemChange = (index: number, updatedItem: LineItem) => {
    const updatedLineItems = [...lineItems];
    
    // Recalculate line total based on tax exclusive price, qty, discount, and tax rate
    const lineTotalBase = updatedItem.price_per_item * updatedItem.qty;
    const discountAmt = updatedItem.discount_rs || 0;
    const taxableLine = Math.max(0, lineTotalBase - discountAmt);
    const taxAmt = Math.round(((taxableLine * updatedItem.tax_rate_percent) / 100) * 100) / 100;
    const finalLineTotal = Math.round((taxableLine + taxAmt) * 100) / 100;

    updatedLineItems[index] = {
      ...updatedItem,
      tax_amount: taxAmt,
      total_amount: finalLineTotal,
    };

    updateInvoiceTotals(updatedLineItems);
  };

  const handleLineAmountChange = (index: number, newTotalAmount: number) => {
    const item = lineItems[index];
    const totalAmt = Math.max(0, newTotalAmount);
    const taxRate = (item.tax_rate_percent !== undefined && item.tax_rate_percent !== null) 
      ? item.tax_rate_percent 
      : (quotation.gst_rate_percent || 8.9);
    const qty = Math.max(1, item.qty);
    const discount = item.discount_rs || 0;

    // Working backward from tax-inclusive total
    const taxableTotal = taxRate > 0 ? (totalAmt / (1 + taxRate / 100)) : totalAmt;
    const newPricePerItem = Math.round(((taxableTotal + discount) / qty) * 100) / 100;
    const newTaxAmount = Math.round((totalAmt - taxableTotal) * 100) / 100;

    const updatedLineItems = [...lineItems];
    updatedLineItems[index] = {
      ...item,
      tax_rate_percent: taxRate,
      price_per_item: newPricePerItem,
      tax_amount: newTaxAmount,
      total_amount: totalAmt,
    };

    updateInvoiceTotals(updatedLineItems);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    const updatedLineItems = lineItems.filter((_, i) => i !== index);
    updateInvoiceTotals(updatedLineItems);
  };

  // Helper to handle solar capacity, price/kW, category & pricing updates
  const handleSolarSpecsUpdate = (
    updatedKw?: number,
    updatedRate?: number,
    updatedTotal?: number,
    updatedCategory?: string
  ) => {
    const kwItems = lineItems.filter(it => {
      const u = (it.unit || '').trim().toLowerCase();
      return u === 'kw' || u === 'kwp';
    });
    const itemsKwSum = kwItems.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);
    const kw = updatedKw !== undefined 
      ? Math.max(0.1, updatedKw) 
      : (itemsKwSum > 0 ? itemsKwSum : (quotation.system_capacity_kw || 5));

    const rate = updatedRate !== undefined ? Math.max(0, updatedRate) : (quotation.rate_per_kw || 55000);
    const category = updatedCategory !== undefined ? updatedCategory : (quotation.category || 'Residential / Home');

    let total = quotation.total_amount || 0;
    if (updatedTotal !== undefined) {
      total = Math.max(0, updatedTotal);
    } else if (updatedKw !== undefined || updatedRate !== undefined) {
      total = Math.round(kw * rate);
    }

    const derivedRate = kw > 0 ? Math.round(total / kw) : rate;

    // Spec calculations using state solar insolation
    const custLoc = quotation.customer_location || quotation.customer_address || 'Telangana';
    const yieldInfo = calculateSolarYieldAndCO2(kw, custLoc);
    const monthlyUnits = yieldInfo.monthlyUnits;
    const annualUnits = yieldInfo.annualUnits;
    const monthlySavings = Math.round(monthlyUnits * 7.5);

    // Update Line Item 1 ONLY IF it is a single-item quotation
    const isSingleItem = lineItems.length <= 1;
    let updatedLineItems = lineItems;

    if (isSingleItem) {
      const taxRate = quotation.gst_rate_percent || 8.9;
      const taxableTotal = total / (1 + taxRate / 100);
      const taxAmount = Math.round((total - taxableTotal) * 100) / 100;
      const pricePerKw = kw > 0 ? Math.round((taxableTotal / kw) * 100) / 100 : Math.round(taxableTotal * 100) / 100;

      const normCat = category.toLowerCase();
      const isCommercial = normCat.includes('commercial') || normCat.includes('industrial') || normCat.includes('institutional');
      const defaultPanelShort = isCommercial ? 'Non-DCR (NDCR) 500+ W' : '500+ W Mono DCR';

      updatedLineItems = lineItems.map((item, idx) => {
        if (idx === 0) {
          return {
            ...item,
            name: `${kw} kWp On-Grid Solar PV Power System`,
            description: `${kw} kWp ${defaultPanelShort} Solar Array, ${kw} kW On-Grid String Inverter, HDG Structure & BOS`,
            qty: kw,
            unit: item.unit || 'kW',
            price_per_item: pricePerKw,
            tax_amount: taxAmount,
            total_amount: total,
          };
        }
        return item;
      });
    }

    onChangeQuotation({
      ...quotation,
      category: category as any,
      system_capacity_kw: kw,
      rate_per_kw: derivedRate,
      total_amount: total,
      monthly_units: monthlyUnits,
      annual_units: annualUnits,
      monthly_savings_rs: monthlySavings,
      line_items: updatedLineItems,
    });
  };

  const updateInvoiceTotals = (itemsList: LineItem[]) => {
    const totalInvoiceAmt = itemsList.reduce((sum, item) => sum + item.total_amount, 0);
    
    // Sum kW across all items whose unit is kW / kWp
    const kwItems = itemsList.filter(it => {
      const u = (it.unit || '').trim().toLowerCase();
      return u === 'kw' || u === 'kwp';
    });

    let totalCapacity = 0;
    if (kwItems.length > 0) {
      totalCapacity = kwItems.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);
    } else {
      // Check if item names or descriptions have kW specified
      let parsedSum = 0;
      itemsList.forEach(it => {
        const text = `${it.name || ''} ${it.description || ''}`;
        const match = text.match(/(\d+(?:\.\d+)?)\s*k[wW]p?/);
        if (match) parsedSum += parseFloat(match[1]);
      });
      if (parsedSum > 0) {
        totalCapacity = parsedSum;
      } else {
        const firstItem = itemsList[0];
        totalCapacity = (firstItem && firstItem.qty > 0) ? firstItem.qty : (quotation.system_capacity_kw || 5);
      }
    }

    const finalCapacity = totalCapacity > 0 ? totalCapacity : (quotation.system_capacity_kw || 5);

    onChangeQuotation({
      ...quotation,
      line_items: itemsList,
      total_amount: totalInvoiceAmt,
      system_capacity_kw: finalCapacity,
    });
  };

  const docTypeTitle = quotation.document_type === 'Quotation' 
    ? 'Create Quotation' 
    : quotation.document_type === 'Proforma Invoice'
    ? 'Create Proforma Invoice'
    : 'Create Sales Invoice';

  // Subtotal calculations matching Screenshot 2
  const totalQty = lineItems.reduce((sum, item) => sum + item.qty, 0);
  const totalDiscountRs = lineItems.reduce((sum, item) => sum + (item.discount_rs || 0), 0);
  const totalTaxRs = lineItems.reduce((sum, item) => sum + item.tax_amount, 0);
  const subtotalRs = lineItems.reduce((sum, item) => sum + item.total_amount, 0);

  const taxableAmountTotal = subtotalRs - totalTaxRs;
  const sgstAmt = Math.round((totalTaxRs / 2) * 100) / 100;
  const cgstAmt = Math.round((totalTaxRs / 2) * 100) / 100;
  const taxPercentHalf = lineItems[0] ? (lineItems[0].tax_rate_percent / 2).toFixed(2) : '4.45';

  const additionalChargesAmt = quotation.additional_charges || 0;
  const grandTotalRaw = subtotalRs + additionalChargesAmt;
  const grandTotal = quotation.auto_round_off !== false ? Math.round(grandTotalRaw) : grandTotalRaw;

  return (
    <div className="space-y-4 font-sans text-slate-800 pb-12">
      
      {/* TOP NAVIGATION BAR (Matching MyBillBook Screenshot 1) */}
      <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>

          <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
            {docTypeTitle}
          </h1>
        </div>

        {/* Center: Edit Mode / Preview Mode Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setMode && setMode('edit')}
            className={`px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              mode === 'edit' 
                ? 'bg-white text-indigo-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Edit Mode</span>
          </button>
          <button
            onClick={() => setMode && setMode('preview')}
            className={`px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              mode === 'preview' 
                ? 'bg-white text-indigo-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Preview Mode</span>
          </button>
        </div>

        {/* Right: Settings, Save & New, Save */}
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onSave}
            className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-all"
          >
            Save & New
          </button>

          <button
            onClick={onSave}
            className="px-5 py-1.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-extrabold text-xs rounded-lg shadow-md transition-all"
          >
            Save
          </button>

          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TOP DUAL BOX SECTION (Bill To + Invoice Details) */}
      <div className="grid grid-cols-12 gap-4">
        
        {/* LEFT BOX: BILL TO (Cols 6) */}
        <div className="col-span-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Bill To</span>
            <button className="p-1 hover:bg-slate-100 rounded">
              <Settings className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {!quotation.customer_name ? (
            <div 
              onClick={() => setShowPartyPicker(true)}
              className="border-2 border-dashed border-sky-300 rounded-xl p-8 text-center cursor-pointer hover:bg-sky-50/50 transition-all flex flex-col items-center justify-center min-h-[140px]"
            >
              <div className="flex items-center gap-2 text-sky-600 font-bold text-xs">
                <Plus className="w-4 h-4" />
                <span>+ Add Party</span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 relative group space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900 uppercase">
                  {quotation.customer_name}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const matched = parties.find(p => p.name.toLowerCase() === quotation.customer_name.toLowerCase());
                      handleOpenPartyPopup(matched || {
                        name: quotation.customer_name,
                        mobile_number: quotation.customer_phone,
                        gstin: quotation.customer_gstin,
                        pan_number: quotation.customer_pan,
                        billing_address: quotation.customer_address,
                        shipping_address: quotation.customer_shipping_address,
                        party_type: 'Customer',
                      });
                    }}
                    className="text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded font-bold transition-all"
                  >
                    Edit Party
                  </button>
                  <button
                    onClick={() => setShowPartyPicker(true)}
                    className="text-xs text-indigo-600 font-bold hover:underline"
                  >
                    Change Party
                  </button>
                </div>
              </div>

              {/* Editable Customer GSTIN & PAN */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Party GSTIN</label>
                  <input
                    type="text"
                    placeholder="e.g. 37AAYFT4513H1ZO"
                    value={quotation.customer_gstin || ''}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      const pan = val.length >= 12 ? val.substring(2, 12) : (quotation.customer_pan || '');
                      onChangeQuotation({
                        ...quotation,
                        customer_gstin: val,
                        customer_pan: pan
                      });
                    }}
                    className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white uppercase font-bold text-teal-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">PAN Number</label>
                  <input
                    type="text"
                    placeholder="e.g. AAYFT4513H"
                    value={quotation.customer_pan || ''}
                    onChange={(e) => onChangeQuotation({ ...quotation, customer_pan: e.target.value.toUpperCase() })}
                    className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white uppercase font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Editable Customer Address Box */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Billing & Shipping Address</label>
                <textarea
                  rows={2}
                  value={quotation.customer_address || quotation.customer_billing_address || ''}
                  onChange={(e) => {
                    const newAddr = e.target.value;
                    onChangeQuotation({
                      ...quotation,
                      customer_address: newAddr,
                      customer_billing_address: newAddr,
                      customer_shipping_address: quotation.same_as_billing !== false ? newAddr : quotation.customer_shipping_address,
                      customer_location: newAddr ? newAddr.slice(0, 45) : quotation.customer_location,
                    });
                  }}
                  placeholder="Enter billing address..."
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white font-sans"
                />
              </div>

              <div className="text-xs text-slate-500 font-mono">
                Phone: {quotation.customer_phone || '+91 94797 97947'}
              </div>
            </div>
          )}

          {/* GST Auto-Fetch Input */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Auto-fetch by Party GSTIN (e.g. 37AAYFT4513H1ZO)"
                value={gstinInput}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setGstinInput(val);
                  if (val.length === 15) {
                    const pan = val.substring(2, 12);
                    onChangeQuotation({
                      ...quotation,
                      customer_gstin: val,
                      customer_pan: pan
                    });
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 uppercase"
              />
              <button
                onClick={handleGstLookup}
                disabled={isFetchingGst}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all disabled:opacity-50"
              >
                {isFetchingGst ? 'Fetching...' : 'Get Details'}
              </button>
            </div>

            {gstStatus && (
              <p className={`text-[11px] font-semibold ${gstStatus.startsWith('✓') ? 'text-emerald-600' : 'text-amber-600'}`}>
                {gstStatus}
              </p>
            )}
          </div>
        </div>

        {/* RIGHT BOX: INVOICE DETAILS (Cols 6) */}
        <div className="col-span-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Invoice Details</span>
            
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={Boolean(quotation.repeat_invoice)}
                  onChange={(e) => onChangeQuotation({ ...quotation, repeat_invoice: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Repeat this Invoice</span>
              </label>

              <button className="p-1 hover:bg-slate-100 rounded">
                <Settings className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Active Issuer Office Address & Branch Selector */}
          <div className="bg-teal-50/80 border border-teal-200 p-2.5 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-teal-900">
                <Building2 className="w-3.5 h-3.5 text-teal-700" />
                <span>Issuer Office Address Header</span>
              </div>
              {onOpenBranchModal && (
                <button
                  type="button"
                  onClick={onOpenBranchModal}
                  className="text-[10px] font-extrabold text-teal-700 hover:text-teal-900 bg-white px-2 py-0.5 rounded border border-teal-300 hover:bg-teal-100 transition-all"
                >
                  ✏️ Edit / Manage Offices
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  const targetId = e.target.value;
                  onSelectBranch(targetId);
                  const br = branches.find(b => b.id === targetId);
                  if (br) {
                    const newState = br.state?.toLowerCase().includes('andhra') ? 'Andhra Pradesh' : 'Telangana';
                    const newYield = calculateSolarYieldAndCO2(quotation.system_capacity_kw || 5, newState);
                    onChangeQuotation({
                      ...quotation,
                      branch_id: br.id,
                      branch: br,
                      customer_location: quotation.customer_location 
                        ? (quotation.customer_location.includes(',') ? `${quotation.customer_location.split(',')[0]}, ${newState}` : `${quotation.customer_location}, ${newState}`)
                        : newState,
                      monthly_units: newYield.monthlyUnits,
                      annual_units: newYield.annualUnits,
                      monthly_savings_rs: Math.round(newYield.monthlyUnits * 7.5),
                    });
                  }
                }}
                className="w-full font-bold text-slate-800 bg-white border border-teal-300 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-teal-500"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code}) - {b.city || b.state} | GSTIN: {b.gstin}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-slate-600 font-medium truncate">
              📍 {selectedBranch.address} | GSTIN: <span className="font-mono font-bold">{selectedBranch.gstin}</span>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Invoice Prefix */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">
                Invoice Prefix
              </label>
              <input
                type="text"
                value={quotation.invoice_prefix || 'TB/26-27/'}
                onChange={(e) => onChangeQuotation({ ...quotation, invoice_prefix: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Invoice Number (Editable & Auto-Incrementing starting at 001) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-500 block">
                  {quotation.document_type || 'Sales Invoice'} Number
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const localStr = localStorage.getItem('tb_quotations_history') || '[]';
                    const history = JSON.parse(localStr);
                    const nextNo = getNextSequentialNumber(quotation.document_type || 'Sales Invoice', history);
                    onChangeQuotation({ ...quotation, quotation_no: nextNo });
                  }}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                  title="Auto-generate next sequential number starting from 001"
                >
                  ⚡ Next No.
                </button>
              </div>
              <input
                type="text"
                value={quotation.quotation_no}
                onChange={(e) => onChangeQuotation({ ...quotation, quotation_no: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs font-mono font-extrabold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 uppercase"
              />
              {(() => {
                const localStr = localStorage.getItem('tb_quotations_history') || '[]';
                const history = JSON.parse(localStr);
                const currentNo = (quotation.quotation_no || '').trim().toUpperCase();
                const isDup = history.some((q: any) => (q.quotation_no || '').trim().toUpperCase() === currentNo && q.id !== quotation.id);
                if (isDup && currentNo) {
                  return (
                    <span className="text-[10px] font-bold text-rose-600 mt-0.5 block">
                      ⚠️ Duplicate Number!
                    </span>
                  );
                }
                return null;
              })()}
            </div>

            {/* Document Date */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">
                {quotation.document_type || 'Quotation'} Date
              </label>
              <input
                type="date"
                value={quotation.quotation_date || ''}
                onChange={(e) => {
                  const newDate = e.target.value;
                  let newValid = quotation.valid_until;
                  if (newDate) {
                    try {
                      const d = new Date(newDate);
                      if (!isNaN(d.getTime())) {
                        d.setDate(d.getDate() + 30);
                        newValid = d.toISOString().split('T')[0];
                      }
                    } catch (_) {}
                  }
                  onChangeQuotation({
                    ...quotation,
                    quotation_date: newDate,
                    valid_until: newValid
                  });
                }}
                className="w-full px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
          </div>

          {/* Valid Until / Due Date */}
          <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-200">
            <label className="text-[11px] font-bold text-slate-600 whitespace-nowrap">Valid Until / Due Date:</label>
            <input
              type="date"
              value={quotation.valid_until || quotation.due_date || ''}
              onChange={(e) => onChangeQuotation({ ...quotation, valid_until: e.target.value, due_date: e.target.value })}
              className="px-2.5 py-1 text-xs font-mono font-bold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          {/* PO No. & E-Way Bill No. */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">
                PO No.
              </label>
              <input
                type="text"
                placeholder="Enter PO Number"
                value={quotation.po_number || ''}
                onChange={(e) => onChangeQuotation({ ...quotation, po_number: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mb-1">
                <span>E-Way Bill No.</span>
                <HelpCircle className="w-3 h-3 text-slate-400" />
              </label>
              <input
                type="text"
                placeholder="Enter E-Way Bill No."
                value={quotation.eway_bill_no || ''}
                onChange={(e) => onChangeQuotation({ ...quotation, eway_bill_no: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Quotation Format Length Selection (2-Page vs 4-5 Page Detailed Proposal) */}
          <div className="pt-2">
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Quotation Print Format Length
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChangeQuotation({ ...quotation, quote_format: '2_page' })}
                className={`px-3 py-2 text-xs font-bold rounded-lg border text-left flex flex-col transition-all ${
                  (quotation.quote_format === '2_page')
                    ? 'bg-teal-50 border-teal-600 text-teal-900 ring-2 ring-teal-500/20'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>📄 2-Page Quick Quote</span>
                <span className="text-[10px] text-slate-500 font-normal">Compact 2-page invoice summary</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeQuotation({ ...quotation, quote_format: '5_page' })}
                className={`px-3 py-2 text-xs font-bold rounded-lg border text-left flex flex-col transition-all ${
                  (quotation.quote_format === '5_page' || !quotation.quote_format)
                    ? 'bg-teal-50 border-teal-600 text-teal-900 ring-2 ring-teal-500/20'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>📚 4-5 Page Proposal Booklet</span>
                <span className="text-[10px] text-slate-500 font-normal">Detailed technical & commercial proposal</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* SOLAR SYSTEM SPECIFICATIONS & CAPACITY PRICING CONTROL CARD */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white p-4 rounded-xl shadow-sm border border-slate-700 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-700 pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-base">☀️</span>
            <h2 className="text-xs font-black uppercase tracking-wider text-amber-400">
              Solar System Capacity, Category & Pricing Controls
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowOffGridModal(true)}
              className="px-3 py-1 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 text-xs font-black rounded-lg shadow-sm flex items-center gap-1.5 transition-all transform hover:scale-105"
            >
              <span>⚡ Off-Grid Calculator</span>
            </button>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              Auto-calculates monthly units, subsidy & proposal items
            </span>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3">
          {/* Consumer Category */}
          <div className="col-span-3">
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              Consumer Category
            </label>
            <select
              value={quotation.category || 'Residential / Home'}
              onChange={(e) => handleSolarSpecsUpdate(undefined, undefined, undefined, e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-bold bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-400"
            >
              <option value="Residential / Home">🏠 Residential / Home (PM Surya Ghar Subsidy)</option>
              <option value="Off-Grid Solar System">⚡ Off-Grid Solar System (Battery Backup Package)</option>
              <option value="Group Housing Society (GHS)">🏢 Group Housing Society (GHS / RWA)</option>
              <option value="Commercial / Institutional">🏬 Commercial / Institutional (40% AD & Tax Benefits)</option>
              <option value="Industrial">🏭 Industrial (40% AD & Tax Benefits)</option>
            </select>
          </div>

          {/* Customer Site State / Solar Insolation Index */}
          <div className="col-span-3">
            <label className="text-[11px] font-bold text-teal-300 block mb-1">
              Installation State (Branch Region)
            </label>
            <select
              value={(() => {
                const curBr = branches.find(b => b.id === (quotation.branch_id || selectedBranchId));
                if (curBr?.state?.toLowerCase().includes('andhra')) return 'Andhra Pradesh';
                if (curBr?.state?.toLowerCase().includes('telangana')) return 'Telangana';
                const loc = (quotation.customer_location || quotation.customer_address || '').toLowerCase();
                return (loc.includes('andhra') || loc.includes('pitha') || loc.includes('kvb')) ? 'Andhra Pradesh' : 'Telangana';
              })()}
              onChange={(e) => {
                const newState = e.target.value;
                const newYield = calculateSolarYieldAndCO2(quotation.system_capacity_kw || 5, newState);
                let newBranch = quotation.branch;
                let newBranchId = quotation.branch_id;
                if (newState.toLowerCase().includes('andhra')) {
                  const apBranch = branches.find(b => b.state.toLowerCase().includes('andhra') || b.id.includes('pith') || b.id.includes('ap')) || branches[1] || branches[0];
                  if (apBranch) {
                    newBranch = apBranch;
                    newBranchId = apBranch.id;
                    onSelectBranch(apBranch.id);
                  }
                } else if (newState.toLowerCase().includes('telangana')) {
                  const tgBranch = branches.find(b => b.state.toLowerCase().includes('telangana') || b.id.includes('hyd')) || branches[0];
                  if (tgBranch) {
                    newBranch = tgBranch;
                    newBranchId = tgBranch.id;
                    onSelectBranch(tgBranch.id);
                  }
                }
                onChangeQuotation({
                  ...quotation,
                  customer_location: quotation.customer_location ? `${quotation.customer_location.split(',')[0]}, ${newState}` : newState,
                  monthly_units: newYield.monthlyUnits,
                  annual_units: newYield.annualUnits,
                  monthly_savings_rs: Math.round(newYield.monthlyUnits * 7.5),
                  branch: newBranch,
                  branch_id: newBranchId,
                });
              }}
              className="w-full px-2.5 py-1.5 text-xs font-bold bg-slate-800 border border-teal-500 rounded-lg text-amber-300 focus:ring-2 focus:ring-amber-400"
            >
              {(branches.length > 0 ? Array.from(new Set(branches.map(b => b.state).filter(Boolean))) : ['Telangana', 'Andhra Pradesh']).map((st) => {
                const matchedBr = branches.find(b => b.state.toLowerCase() === st.toLowerCase());
                return (
                  <option key={st} value={st}>
                    {st} {matchedBr ? `(${matchedBr.name})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* System Capacity kW */}
          <div className="col-span-2">
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              System Capacity (kW)
            </label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={quotation.system_capacity_kw || ''}
              onChange={(e) => handleSolarSpecsUpdate(parseFloat(e.target.value) || 0, undefined, undefined, undefined)}
              placeholder="e.g. 15"
              className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-800 border border-slate-600 rounded-lg text-amber-300 focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Rate per kW */}
          <div className="col-span-2">
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              Price / kW (₹/kW)
            </label>
            <input
              type="number"
              step="1000"
              value={quotation.rate_per_kw || ''}
              onChange={(e) => handleSolarSpecsUpdate(undefined, parseFloat(e.target.value) || 0, undefined, undefined)}
              placeholder="e.g. 55000"
              className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Total Gross Cost */}
          <div className="col-span-2">
            <label className="text-[11px] font-bold text-amber-400 block mb-1">
              Gross Cost (₹)
            </label>
            <input
              type="number"
              step="5000"
              value={quotation.total_amount || ''}
              onChange={(e) => handleSolarSpecsUpdate(undefined, undefined, parseFloat(e.target.value) || 0, undefined)}
              placeholder="Total Cost"
              className="w-full px-2.5 py-1.5 text-xs font-mono font-black bg-teal-950 border border-teal-500 rounded-lg text-amber-300 focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        {/* Dynamic State Yield & Carbon/Trees Impact Bar */}
        {(() => {
          const loc = (quotation.customer_location || quotation.customer_address || '').toLowerCase();
          const currentState = ALL_INDIAN_STATES.find(st => loc.includes(st.toLowerCase())) || 'Telangana';
          const yieldInfo = calculateSolarYieldAndCO2(quotation.system_capacity_kw || 5, currentState);

          return (
            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] bg-slate-950/80 px-3.5 py-2 rounded-lg border border-slate-800">
              <div className="flex items-center gap-4 text-slate-300 flex-wrap">
                <span>⚡ Yield ({yieldInfo.state}): <strong className="text-white">~{yieldInfo.monthlyUnits.toLocaleString('en-IN')} Units/mo</strong> <span className="text-slate-400 text-[10px]">({yieldInfo.annualUnits.toLocaleString('en-IN')} Units/yr)</span></span>
                <span>🌿 CO₂ Offset: <strong className="text-emerald-400">{yieldInfo.annualCo2OffsetTonnes} T/yr</strong> <span className="text-slate-400 text-[10px]">({yieldInfo.lifetimeCo2OffsetTonnes} T 25y)</span></span>
                <span>🌲 Trees Equivalent: <strong className="text-green-400">{yieldInfo.annualTreesEquivalent.toLocaleString('en-IN')} Trees/yr</strong> <span className="text-slate-400 text-[10px]">({yieldInfo.lifetimeTreesEquivalent.toLocaleString('en-IN')} 25y)</span></span>
                <span>💰 Est. Savings: <strong className="text-amber-300">₹ {(quotation.monthly_savings_rs || Math.round(yieldInfo.monthlyUnits * 7.5)).toLocaleString('en-IN')}/mo</strong></span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="text-slate-400">Total Gross:</span>
                <span className="text-amber-400 font-mono font-black">₹ {(quotation.total_amount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* BILL OF MATERIALS (BOM) & EQUIPMENT SELECTION CONTROLS CARD */}
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-sm border border-slate-700 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-700 pb-2.5 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-teal-400 text-base">🔩</span>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-teal-400 flex items-center gap-2">
                <span>Bill of Materials (BOM) & Equipment Specifications</span>
                <span className="text-[10px] bg-teal-950 text-teal-300 font-extrabold px-2 py-0.5 rounded-full border border-teal-800">
                  Copy & Save
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Copy Full BOM Specifications */}
            <button
              type="button"
              onClick={handleCopyFullBOM}
              className="px-2.5 py-1 bg-teal-950/80 hover:bg-teal-900 text-teal-300 hover:text-white text-[11px] font-extrabold rounded-lg border border-teal-700/80 flex items-center gap-1.5 transition-all shadow-xs"
              title="Copy all 7 equipment specifications to clipboard"
            >
              {copiedField === 'all_bom' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">✓ Copied All Specs!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-teal-400" />
                  <span>📋 Copy BOM Specs</span>
                </>
              )}
            </button>

            {/* Load Preset Dropdown */}
            <div className="flex items-center bg-slate-800 border border-slate-600 rounded-lg overflow-hidden">
              <span className="pl-2 pr-1 text-amber-400">
                <Bookmark className="w-3.5 h-3.5" />
              </span>
              <select
                value={selectedPresetId}
                onChange={(e) => handleSelectPreset(e.target.value)}
                className="bg-transparent py-1 pr-2 text-[11px] font-extrabold text-amber-300 focus:outline-none cursor-pointer"
                title="Load a pre-configured BOM combination"
              >
                <option value="" className="bg-slate-900 text-slate-300">⚡ Load Preset BOM...</option>
                {bomPresets.map((preset) => (
                  <option key={preset.id} value={preset.id} className="bg-slate-900 text-white font-medium">
                    {preset.name}
                  </option>
                ))}
              </select>
              {selectedPresetId && !DEFAULT_BOM_PRESETS.some(p => p.id === selectedPresetId) && (
                <button
                  type="button"
                  onClick={(e) => handleDeletePreset(selectedPresetId, e)}
                  className="px-1.5 py-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40"
                  title="Delete this custom preset"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Save Current Combination as Preset */}
            <button
              type="button"
              onClick={handleSaveCurrentAsPreset}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-extrabold rounded-lg border border-amber-500/40 flex items-center gap-1.5 transition-all shadow-xs"
              title="Save the current combination of 7 dropdowns as a reusable preset"
            >
              <Save className="w-3.5 h-3.5 text-amber-400" />
              <span>💾 Save Preset</span>
            </button>

            {/* Manage Dropdowns Options Modal */}
            <button
              type="button"
              onClick={() => setIsManageDropdownsOpen(true)}
              className="px-2.5 py-1 bg-teal-900/80 hover:bg-teal-800 text-amber-300 text-[11px] font-extrabold rounded-lg border border-teal-600 flex items-center gap-1.5 transition-all shadow-xs"
              title="Add, edit, copy, or remove dropdown values"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span>⚙️ Manage Options</span>
            </button>
          </div>
        </div>

        {/* 7 BOM DROPDOWNS GRID */}
        <div className="grid grid-cols-12 gap-3">
          
          {/* 1. Solar Inverter Brand */}
          <div className="col-span-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-300">
                Inverter Brand / Make
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopyText(quotation.inverter_brand || bomOptions.inverterBrands[0], 'inverter_brand')}
                  className="text-[10px] text-slate-400 hover:text-teal-300 flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-slate-800 transition-all font-semibold"
                  title="Copy selected Inverter Brand to clipboard"
                >
                  {copiedField === 'inverter_brand' ? (
                    <span className="text-emerald-400 text-[9px] font-extrabold">✓ Copied</span>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const custom = prompt('Enter new Inverter Brand / Model to save to dropdown list (e.g. Microtek Hybrid / Deye 12kW):');
                    if (custom && custom.trim()) {
                      handleAddCustomValueInline('inverterBrands', custom);
                      onChangeQuotation({ ...quotation, inverter_brand: custom.trim() });
                    }
                  }}
                  className="text-[10px] text-amber-400 hover:text-amber-300 px-1 py-0.5 rounded hover:bg-amber-950/40 transition-all font-extrabold"
                  title="Save new Inverter option to dropdown list"
                >
                  +Save
                </button>
              </div>
            </div>
            <select
              value={quotation.inverter_brand || bomOptions.inverterBrands[0]}
              onChange={(e) => {
                if (e.target.value === '__add_custom__') {
                  const custom = prompt('Enter custom Inverter Brand / Model (e.g. Microtek Hybrid / Deye 10kW):');
                  if (custom && custom.trim()) {
                    handleAddCustomValueInline('inverterBrands', custom);
                    onChangeQuotation({ ...quotation, inverter_brand: custom.trim() });
                  }
                } else {
                  onChangeQuotation({ ...quotation, inverter_brand: e.target.value });
                }
              }}
              className="w-full px-2.5 py-1.5 text-xs font-bold bg-slate-800 border border-slate-600 rounded-lg text-teal-300 focus:ring-2 focus:ring-teal-400"
            >
              {bomOptions.inverterBrands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
              {quotation.inverter_brand && !bomOptions.inverterBrands.includes(quotation.inverter_brand) && (
                <option value={quotation.inverter_brand}>{quotation.inverter_brand} (Custom)</option>
              )}
              <option value="__add_custom__" className="text-amber-400 font-bold">+ Write-in Custom Option...</option>
            </select>
          </div>

          {/* 2. Inverter Phase */}
          <div className="col-span-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-300">
                Inverter Phase
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopyText(quotation.inverter_phase || bomOptions.inverterPhases[0], 'inverter_phase')}
                  className="text-[10px] text-slate-400 hover:text-teal-300 flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-slate-800 transition-all font-semibold"
                  title="Copy selected Inverter Phase to clipboard"
                >
                  {copiedField === 'inverter_phase' ? (
                    <span className="text-emerald-400 text-[9px] font-extrabold">✓ Copied</span>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const custom = prompt('Enter new Inverter Phase option to save to dropdown:');
                    if (custom && custom.trim()) {
                      handleAddCustomValueInline('inverterPhases', custom);
                      onChangeQuotation({ ...quotation, inverter_phase: custom.trim() });
                    }
                  }}
                  className="text-[10px] text-amber-400 hover:text-amber-300 px-1 py-0.5 rounded hover:bg-amber-950/40 transition-all font-extrabold"
                  title="Save new Inverter Phase option"
                >
                  +Save
                </button>
              </div>
            </div>
            <select
              value={quotation.inverter_phase || bomOptions.inverterPhases[0]}
              onChange={(e) => {
                if (e.target.value === '__add_custom__') {
                  const custom = prompt('Enter custom Inverter Phase option:');
                  if (custom && custom.trim()) {
                    handleAddCustomValueInline('inverterPhases', custom);
                    onChangeQuotation({ ...quotation, inverter_phase: custom.trim() });
                  }
                } else {
                  onChangeQuotation({ ...quotation, inverter_phase: e.target.value });
                }
              }}
              className="w-full px-2.5 py-1.5 text-xs font-bold bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-400"
            >
              {bomOptions.inverterPhases.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
              {quotation.inverter_phase && !bomOptions.inverterPhases.includes(quotation.inverter_phase) && (
                <option value={quotation.inverter_phase}>{quotation.inverter_phase} (Custom)</option>
              )}
              <option value="__add_custom__" className="text-amber-400 font-bold">+ Write-in Custom Option...</option>
            </select>
          </div>

          {/* 3. Structure Table Grid */}
          <div className="col-span-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-300">
                Structure Layout Grid
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopyText(quotation.structure_grid || bomOptions.structureGrids[0], 'structure_grid')}
                  className="text-[10px] text-slate-400 hover:text-teal-300 flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-slate-800 transition-all font-semibold"
                  title="Copy selected Structure Grid to clipboard"
                >
                  {copiedField === 'structure_grid' ? (
                    <span className="text-emerald-400 text-[9px] font-extrabold">✓ Copied</span>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const custom = prompt('Enter new Structure Layout Grid to save to dropdown (e.g. 3x6 Table / 4x5 Table):');
                    if (custom && custom.trim()) {
                      handleAddCustomValueInline('structureGrids', custom);
                      onChangeQuotation({ ...quotation, structure_grid: custom.trim() });
                    }
                  }}
                  className="text-[10px] text-amber-400 hover:text-amber-300 px-1 py-0.5 rounded hover:bg-amber-950/40 transition-all font-extrabold"
                  title="Save new Structure Layout Grid"
                >
                  +Save
                </button>
              </div>
            </div>
            <select
              value={quotation.structure_grid || bomOptions.structureGrids[0]}
              onChange={(e) => {
                if (e.target.value === '__add_custom__') {
                  const custom = prompt('Enter custom Structure Grid (e.g. 3x6 Table / 4x5 Table):');
                  if (custom && custom.trim()) {
                    handleAddCustomValueInline('structureGrids', custom);
                    onChangeQuotation({ ...quotation, structure_grid: custom.trim() });
                  }
                } else {
                  onChangeQuotation({ ...quotation, structure_grid: e.target.value });
                }
              }}
              className="w-full px-2.5 py-1.5 text-xs font-bold bg-slate-800 border border-slate-600 rounded-lg text-amber-300 focus:ring-2 focus:ring-teal-400"
            >
              {bomOptions.structureGrids.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
              {quotation.structure_grid && !bomOptions.structureGrids.includes(quotation.structure_grid) && (
                <option value={quotation.structure_grid}>{quotation.structure_grid} (Custom)</option>
              )}
              <option value="__add_custom__" className="text-amber-400 font-bold">+ Write-in Custom Option...</option>
            </select>
          </div>

          {/* 4. Structure Height */}
          <div className="col-span-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-300">
                Structure Height (ft)
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopyText(quotation.structure_height || bomOptions.structureHeights[0], 'structure_height')}
                  className="text-[10px] text-slate-400 hover:text-teal-300 flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-slate-800 transition-all font-semibold"
                  title="Copy selected Structure Height to clipboard"
                >
                  {copiedField === 'structure_height' ? (
                    <span className="text-emerald-400 text-[9px] font-extrabold">✓ Copied</span>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const custom = prompt('Enter new Structure Height option to save (e.g. Elevated 14ft Height):');
                    if (custom && custom.trim()) {
                      handleAddCustomValueInline('structureHeights', custom);
                      onChangeQuotation({ ...quotation, structure_height: custom.trim() });
                    }
                  }}
                  className="text-[10px] text-amber-400 hover:text-amber-300 px-1 py-0.5 rounded hover:bg-amber-950/40 transition-all font-extrabold"
                  title="Save new Structure Height option"
                >
                  +Save
                </button>
              </div>
            </div>
            <select
              value={quotation.structure_height || bomOptions.structureHeights[0]}
              onChange={(e) => {
                if (e.target.value === '__add_custom__') {
                  const custom = prompt('Enter custom Structure Height (e.g. Elevated 14ft Height):');
                  if (custom && custom.trim()) {
                    handleAddCustomValueInline('structureHeights', custom);
                    onChangeQuotation({ ...quotation, structure_height: custom.trim() });
                  }
                } else {
                  onChangeQuotation({ ...quotation, structure_height: e.target.value });
                }
              }}
              className="w-full px-2.5 py-1.5 text-xs font-bold bg-slate-800 border border-slate-600 rounded-lg text-amber-300 focus:ring-2 focus:ring-teal-400"
            >
              {bomOptions.structureHeights.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
              {quotation.structure_height && !bomOptions.structureHeights.includes(quotation.structure_height) && (
                <option value={quotation.structure_height}>{quotation.structure_height} (Custom)</option>
              )}
              <option value="__add_custom__" className="text-amber-400 font-bold">+ Write-in Custom Option...</option>
            </select>
          </div>

          {/* 5. Mounting Structure Material */}
          <div className="col-span-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-300">
                Structure Material & Spec
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopyText(quotation.structure_type || bomOptions.structureTypes[0], 'structure_type')}
                  className="text-[10px] text-slate-400 hover:text-teal-300 flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-slate-800 transition-all font-semibold"
                  title="Copy selected Structure Material to clipboard"
                >
                  {copiedField === 'structure_type' ? (
                    <span className="text-emerald-400 text-[9px] font-extrabold">✓ Copied</span>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const custom = prompt('Enter new Structure Material & Spec to save:');
                    if (custom && custom.trim()) {
                      handleAddCustomValueInline('structureTypes', custom);
                      onChangeQuotation({ ...quotation, structure_type: custom.trim() });
                    }
                  }}
                  className="text-[10px] text-amber-400 hover:text-amber-300 px-1 py-0.5 rounded hover:bg-amber-950/40 transition-all font-extrabold"
                  title="Save new Structure Material spec"
                >
                  +Save
                </button>
              </div>
            </div>
            <select
              value={quotation.structure_type || bomOptions.structureTypes[0]}
              onChange={(e) => {
                if (e.target.value === '__add_custom__') {
                  const custom = prompt('Enter custom Structure Material / Spec:');
                  if (custom && custom.trim()) {
                    handleAddCustomValueInline('structureTypes', custom);
                    onChangeQuotation({ ...quotation, structure_type: custom.trim() });
                  }
                } else {
                  onChangeQuotation({ ...quotation, structure_type: e.target.value });
                }
              }}
              className="w-full px-2.5 py-1.5 text-xs font-bold bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-400"
            >
              {bomOptions.structureTypes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
              {quotation.structure_type && !bomOptions.structureTypes.includes(quotation.structure_type) && (
                <option value={quotation.structure_type}>{quotation.structure_type} (Custom)</option>
              )}
              <option value="__add_custom__" className="text-amber-400 font-bold">+ Write-in Custom Option...</option>
            </select>
          </div>

          {/* 6. Solar Panel Brand */}
          <div className="col-span-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-300">
                Solar Modules / Panels Brand
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopyText(quotation.panel_brand || bomOptions.panelBrands[0], 'panel_brand')}
                  className="text-[10px] text-slate-400 hover:text-teal-300 flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-slate-800 transition-all font-semibold"
                  title="Copy selected Solar Module brand to clipboard"
                >
                  {copiedField === 'panel_brand' ? (
                    <span className="text-emerald-400 text-[9px] font-extrabold">✓ Copied</span>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const custom = prompt('Enter new Solar Panel Brand / Spec to save (e.g. Waaree 600W TOPCon):');
                    if (custom && custom.trim()) {
                      handleAddCustomValueInline('panelBrands', custom);
                      onChangeQuotation({ ...quotation, panel_brand: custom.trim() });
                    }
                  }}
                  className="text-[10px] text-amber-400 hover:text-amber-300 px-1 py-0.5 rounded hover:bg-amber-950/40 transition-all font-extrabold"
                  title="Save new Solar Panel brand"
                >
                  +Save
                </button>
              </div>
            </div>
            <select
              value={quotation.panel_brand || bomOptions.panelBrands[0]}
              onChange={(e) => {
                if (e.target.value === '__add_custom__') {
                  const custom = prompt('Enter custom Solar Panel Brand / Spec (e.g. Waaree 600W TOPCon):');
                  if (custom && custom.trim()) {
                    handleAddCustomValueInline('panelBrands', custom);
                    onChangeQuotation({ ...quotation, panel_brand: custom.trim() });
                  }
                } else {
                  onChangeQuotation({ ...quotation, panel_brand: e.target.value });
                }
              }}
              className="w-full px-2.5 py-1.5 text-xs font-bold bg-slate-800 border border-slate-600 rounded-lg text-teal-300 focus:ring-2 focus:ring-teal-400"
            >
              {bomOptions.panelBrands.map((pb) => (
                <option key={pb} value={pb}>{pb}</option>
              ))}
              {quotation.panel_brand && !bomOptions.panelBrands.includes(quotation.panel_brand) && (
                <option value={quotation.panel_brand}>{quotation.panel_brand} (Custom)</option>
              )}
              <option value="__add_custom__" className="text-amber-400 font-bold">+ Write-in Custom Option...</option>
            </select>
          </div>

          {/* 7. Cables Brand */}
          <div className="col-span-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-300">
                DC / AC Cables Brand
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopyText(quotation.cables_brand || bomOptions.cableBrands[0], 'cables_brand')}
                  className="text-[10px] text-slate-400 hover:text-teal-300 flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-slate-800 transition-all font-semibold"
                  title="Copy selected Cables Brand to clipboard"
                >
                  {copiedField === 'cables_brand' ? (
                    <span className="text-emerald-400 text-[9px] font-extrabold">✓ Copied</span>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const custom = prompt('Enter new Cable Make / Brand to save (e.g. APAR Solar Cables):');
                    if (custom && custom.trim()) {
                      handleAddCustomValueInline('cableBrands', custom);
                      onChangeQuotation({ ...quotation, cables_brand: custom.trim() });
                    }
                  }}
                  className="text-[10px] text-amber-400 hover:text-amber-300 px-1 py-0.5 rounded hover:bg-amber-950/40 transition-all font-extrabold"
                  title="Save new Cable brand"
                >
                  +Save
                </button>
              </div>
            </div>
            <select
              value={quotation.cables_brand || bomOptions.cableBrands[0]}
              onChange={(e) => {
                if (e.target.value === '__add_custom__') {
                  const custom = prompt('Enter custom Cable Make / Brand (e.g. APAR Solar Cables):');
                  if (custom && custom.trim()) {
                    handleAddCustomValueInline('cableBrands', custom);
                    onChangeQuotation({ ...quotation, cables_brand: custom.trim() });
                  }
                } else {
                  onChangeQuotation({ ...quotation, cables_brand: e.target.value });
                }
              }}
              className="w-full px-2.5 py-1.5 text-xs font-bold bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-400"
            >
              {bomOptions.cableBrands.map((cb) => (
                <option key={cb} value={cb}>{cb}</option>
              ))}
              {quotation.cables_brand && !bomOptions.cableBrands.includes(quotation.cables_brand) && (
                <option value={quotation.cables_brand}>{quotation.cables_brand} (Custom)</option>
              )}
              <option value="__add_custom__" className="text-amber-400 font-bold">+ Write-in Custom Option...</option>
            </select>
          </div>

          {/* Summary Badge with Quick Copy */}
          <div className="col-span-12 flex items-end">
            <div className="w-full bg-slate-800/90 px-3.5 py-2.5 rounded-lg border border-slate-700 text-xs flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold">Selected BOM Summary:</span>
                <span className="font-extrabold text-amber-300">
                  Inverter: {quotation.inverter_brand || bomOptions.inverterBrands[0]} ({quotation.inverter_phase || bomOptions.inverterPhases[0]}) • Structure: {quotation.structure_grid ? quotation.structure_grid.split(' ')[0] : '3x5'} Layout ({quotation.structure_height ? quotation.structure_height.split(' ')[0] : 'Elevated'}) • Panels: {quotation.panel_brand ? quotation.panel_brand.split(' ')[0] : 'Waaree'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const summaryText = `Inverter: ${quotation.inverter_brand || bomOptions.inverterBrands[0]} (${quotation.inverter_phase || bomOptions.inverterPhases[0]}) | Structure: ${quotation.structure_grid || bomOptions.structureGrids[0]} (${quotation.structure_height || bomOptions.structureHeights[0]}) | Panels: ${quotation.panel_brand || bomOptions.panelBrands[0]} | Cables: ${quotation.cables_brand || bomOptions.cableBrands[0]}`;
                  handleCopyText(summaryText, 'summary_text');
                }}
                className="px-2 py-0.5 text-[11px] text-teal-400 hover:text-white bg-slate-900 border border-slate-600 hover:border-teal-500 rounded font-bold transition-all flex items-center gap-1"
                title="Copy single-line BOM summary to clipboard"
              >
                {copiedField === 'summary_text' ? (
                  <span className="text-emerald-400 font-extrabold">✓ Copied Summary</span>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-teal-400" />
                    <span>Copy Summary</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SCOPE OF WORK RESPONSIBILITIES MANAGER CARD (Page 4 of Proposal) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-teal-600 text-lg">📋</span>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Scope of Work Responsibilities Manager (Page 4 of Proposal)
              </h2>
              <p className="text-[11px] text-slate-500">
                Toggle & move scope items between Tejo Bharat EPC Scope and Customer Scope with 1-click
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => onChangeQuotation({ ...quotation, scope_items: DEFAULT_SCOPE_ITEMS })}
            className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-all"
          >
            Reset to Defaults
          </button>
        </div>

        {/* 2-COLUMN GRID: TEJO BHARAT EPC SCOPE vs CUSTOMER SCOPE */}
        {(() => {
          const currentScopeItems = (quotation.scope_items && quotation.scope_items.length > 0)
            ? quotation.scope_items
            : DEFAULT_SCOPE_ITEMS;

          const handleToggleScope = (itemId: string) => {
            const updated = currentScopeItems.map((item) => {
              if (item.id === itemId) {
                return {
                  ...item,
                  scope: (item.scope === 'epc' ? 'customer' : 'epc') as 'epc' | 'customer',
                };
              }
              return item;
            });
            onChangeQuotation({ ...quotation, scope_items: updated });
          };

          const handleTextChange = (itemId: string, newText: string) => {
            const updated = currentScopeItems.map((item) => {
              if (item.id === itemId) {
                return { ...item, text: newText };
              }
              return item;
            });
            onChangeQuotation({ ...quotation, scope_items: updated });
          };

          const handleAddItem = (targetScope: 'epc' | 'customer') => {
            const text = prompt(`Enter new item for ${targetScope === 'epc' ? 'Tejo Bharat EPC Scope' : 'Customer Scope'}:`);
            if (text && text.trim()) {
              const newItem: ScopeItem = {
                id: `scope-${Date.now()}`,
                text: text.trim(),
                scope: targetScope,
              };
              onChangeQuotation({
                ...quotation,
                scope_items: [...currentScopeItems, newItem],
              });
            }
          };

          const handleDeleteItem = (itemId: string) => {
            const updated = currentScopeItems.filter((item) => item.id !== itemId);
            onChangeQuotation({ ...quotation, scope_items: updated });
          };

          const epcList = currentScopeItems.filter((item) => item.scope === 'epc');
          const custList = currentScopeItems.filter((item) => item.scope === 'customer');

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* LEFT COLUMN: TEJO BHARAT EPC SCOPE */}
              <div className="border border-teal-300 bg-teal-50/40 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between border-b border-teal-200 pb-2">
                  <span className="text-xs font-black text-teal-900 flex items-center gap-1.5">
                    ✅ Tejo Bharat EPC Scope ({epcList.length} Items)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddItem('epc')}
                    className="px-2 py-0.5 bg-teal-700 hover:bg-teal-800 text-white rounded text-[10px] font-bold"
                  >
                    + Add EPC Item
                  </button>
                </div>

                <div className="space-y-2">
                  {epcList.map((item) => (
                    <div key={item.id} className="bg-white p-2 rounded-lg border border-teal-200 shadow-2xs flex items-center gap-2">
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => handleTextChange(item.id, e.target.value)}
                        className="flex-1 text-xs font-medium text-slate-800 border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-teal-500 font-sans"
                      />
                      <button
                        type="button"
                        onClick={() => handleToggleScope(item.id)}
                        title="Move to Customer Scope"
                        className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-[10px] font-extrabold flex items-center gap-1 shrink-0"
                      >
                        <span>Move ➡️</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-slate-400 hover:text-red-600 p-1 text-xs font-bold shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT COLUMN: CUSTOMER SCOPE */}
              <div className="border border-amber-300 bg-amber-50/40 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                    ⚠️ Customer Scope ({custList.length} Items)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddItem('customer')}
                    className="px-2 py-0.5 bg-amber-700 hover:bg-amber-800 text-white rounded text-[10px] font-bold"
                  >
                    + Add Customer Item
                  </button>
                </div>

                <div className="space-y-2">
                  {custList.map((item) => (
                    <div key={item.id} className="bg-white p-2 rounded-lg border border-amber-200 shadow-2xs flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleScope(item.id)}
                        title="Move to Tejo Bharat Scope"
                        className="px-2 py-1 bg-teal-100 hover:bg-teal-200 text-teal-900 rounded text-[10px] font-extrabold flex items-center gap-1 shrink-0"
                      >
                        <span>⬅️ Move</span>
                      </button>
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => handleTextChange(item.id, e.target.value)}
                        className="flex-1 text-xs font-medium text-slate-800 border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-amber-500 font-sans"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-slate-400 hover:text-red-600 p-1 text-xs font-bold shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          );
        })()}
      </div>

      {/* ITEMS TABLE SECTION (Matching MyBillBook Screenshot 2) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-4">
        
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="p-2.5 w-10 text-center">NO</th>
              <th className="p-2.5">ITEMS</th>
              <th className="p-2.5 w-24">HSN</th>
              <th className="p-2.5 w-28">QTY</th>
              <th className="p-2.5 w-40">PRICE/ITEM (₹)</th>
              <th className="p-2.5 w-28">DISCOUNT</th>
              <th className="p-2.5 w-32">TAX</th>
              <th className="p-2.5 w-36 text-right">AMOUNT (₹)</th>
              <th className="p-2.5 w-12 text-center">
                <Settings className="w-3.5 h-3.5 text-slate-400 inline" />
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs font-medium">
            {lineItems.map((item, idx) => (
              <tr key={item.id || idx} className="hover:bg-slate-50/60 transition-colors">
                
                {/* Drag Handle & Row No */}
                <td className="p-2.5 text-center font-bold text-slate-400">
                  <div className="flex items-center justify-center gap-1">
                    <GripVertical className="w-3.5 h-3.5 text-slate-300 cursor-grab" />
                  </div>
                </td>

                {/* ITEM NAME & DESCRIPTION TEXTAREA */}
                <td className="p-2.5 space-y-1.5">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleLineItemChange(idx, { ...item, name: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <textarea
                    rows={1}
                    placeholder="Enter Description (optional)"
                    value={item.description || ''}
                    onChange={(e) => handleLineItemChange(idx, { ...item, description: e.target.value })}
                    className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded-lg text-slate-600 focus:ring-1 focus:ring-indigo-500 font-sans"
                  />
                </td>

                {/* HSN CODE */}
                <td className="p-2.5">
                  <input
                    type="text"
                    value={item.hsn_code || '-'}
                    onChange={(e) => handleLineItemChange(idx, { ...item, hsn_code: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs font-mono text-center border border-slate-300 rounded-lg"
                  />
                </td>

                {/* QTY & UNIT BADGE */}
                <td className="p-2.5">
                  <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2 py-1">
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => handleLineItemChange(idx, { ...item, qty: Math.max(1, Number(e.target.value)) })}
                      className="w-full text-xs font-mono font-bold text-center bg-transparent focus:outline-none"
                    />
                    <span className="text-[10px] font-extrabold text-slate-400 ml-1">{item.unit || 'PCS'}</span>
                  </div>
                </td>

                {/* PRICE / ITEM (₹) & UPDATE SALES PRICE CHECKBOX */}
                <td className="p-2.5 space-y-1">
                  <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2 py-1">
                    <span className="text-xs text-slate-400 font-mono mr-1">₹</span>
                    <input
                      type="number"
                      value={item.price_per_item}
                      onChange={(e) => handleLineItemChange(idx, { ...item, price_per_item: Number(e.target.value) })}
                      className="w-full text-xs font-mono font-bold text-slate-900 bg-transparent focus:outline-none"
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(item.update_sales_price)}
                      onChange={(e) => handleLineItemChange(idx, { ...item, update_sales_price: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Update Sales Price</span>
                  </label>
                </td>

                {/* DISCOUNT (₹ and %) */}
                <td className="p-2.5 space-y-1">
                  <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2 py-1">
                    <span className="text-xs text-slate-400 font-mono mr-1">₹</span>
                    <input
                      type="number"
                      value={item.discount_rs || 0}
                      onChange={(e) => handleLineItemChange(idx, { ...item, discount_rs: Number(e.target.value) })}
                      className="w-full text-xs font-mono text-center bg-transparent focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center bg-white border border-slate-200 rounded px-2 py-0.5">
                    <input
                      type="number"
                      value={item.discount_percent || 0}
                      onChange={(e) => handleLineItemChange(idx, { ...item, discount_percent: Number(e.target.value) })}
                      className="w-full text-[10px] font-mono text-center bg-transparent focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400">%</span>
                  </div>
                </td>

                {/* TAX RATE & CALCULATED TAX SUBTEXT */}
                <td className="p-2.5 space-y-1">
                  <select
                    value={item.tax_rate_percent}
                    onChange={(e) => handleLineItemChange(idx, { ...item, tax_rate_percent: Number(e.target.value) })}
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg font-mono bg-white text-slate-800"
                  >
                    <option value={8.9}>8.9% (Solar EPC 70:30)</option>
                    <option value={12}>12% (Inverter / Battery / BOS)</option>
                    <option value={18}>18% (Turnkey Services / AMC)</option>
                    <option value={5}>5% (Solar PV Goods)</option>
                    <option value={0}>0% (Exempt / Nil)</option>
                  </select>
                  <div className="text-[10px] text-slate-500 font-mono text-center">
                    (₹ {item.tax_amount.toLocaleString('en-IN')})
                  </div>
                </td>

                {/* AMOUNT (₹) LINE TOTAL - EDITABLE */}
                <td className="p-2.5">
                  <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2.5 py-1 focus-within:ring-2 focus-within:ring-indigo-500">
                    <span className="text-xs text-slate-400 font-mono font-bold mr-1">₹</span>
                    <input
                      type="number"
                      value={item.total_amount}
                      onChange={(e) => handleLineAmountChange(idx, Number(e.target.value))}
                      className="w-full text-right font-mono font-extrabold text-sm text-slate-900 bg-transparent focus:outline-none"
                    />
                  </div>
                </td>

                {/* ROW ACTIONS */}
                <td className="p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button className="p-1 text-slate-400 hover:text-slate-700">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                    {lineItems.length > 1 && (
                      <button 
                        onClick={() => handleRemoveLineItem(idx)}
                        className="p-1 text-rose-400 hover:text-rose-600 rounded"
                        title="Remove Item"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>

        {/* Add Item & Scan Barcode Buttons Row (Matching Screenshot 2) */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div 
            onClick={() => setShowAddItemsModal(true)}
            className="flex-1 border-2 border-dashed border-sky-400 rounded-xl p-2.5 text-center cursor-pointer hover:bg-sky-50/60 transition-all text-xs font-extrabold text-sky-600 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Item</span>
          </div>

          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all">
            <Scan className="w-4 h-4 text-indigo-600" />
            <span>Scan Barcode</span>
          </button>
        </div>

        {/* Subtotal Summary Row (Matching Screenshot 2) */}
        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-extrabold text-slate-800 font-mono">
          <span>Subtotal</span>
          <div className="flex items-center gap-8">
            <span>{totalQty}</span>
            <span>₹ {totalDiscountRs}</span>
            <span>₹ {totalTaxRs.toLocaleString('en-IN')}</span>
            <span className="text-sm text-indigo-700">₹ {subtotalRs.toLocaleString('en-IN')}</span>
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION: NOTES & PAYMENT SUMMARY GRID */}
      <div className="grid grid-cols-12 gap-4">
        
        {/* LEFT COLUMN: COLLAPSIBLE BUTTONS (Cols 6) */}
        <div className="col-span-6 space-y-3">
          
          {/* Notes */}
          {!showNotes ? (
            <button
              onClick={() => setShowNotes(true)}
              className="w-full p-2.5 bg-white border border-slate-200 hover:border-indigo-400 rounded-xl text-left text-xs font-bold text-indigo-600 flex items-center gap-2 shadow-sm transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>+ Add Notes</span>
            </button>
          ) : (
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5 shadow-sm">
              <label className="text-xs font-bold text-slate-600 block">Notes</label>
              <textarea
                rows={2}
                placeholder="Enter document notes or customer reminders..."
                value={quotation.notes || ''}
                onChange={(e) => onChangeQuotation({ ...quotation, notes: e.target.value })}
                className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Terms & Conditions */}
          {!showTerms ? (
            <button
              onClick={() => setShowTerms(true)}
              className="w-full p-2.5 bg-white border border-slate-200 hover:border-indigo-400 rounded-xl text-left text-xs font-bold text-indigo-600 flex items-center gap-2 shadow-sm transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>+ Add Terms & Conditions</span>
            </button>
          ) : (
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5 shadow-sm">
              <label className="text-xs font-bold text-slate-600 block">Terms & Conditions</label>
              <textarea
                rows={3}
                placeholder="1. 50% advance along with purchase order&#10;2. Delivery within 10 days&#10;3. Warranty 25 years on panels"
                value={quotation.terms_and_conditions || ''}
                onChange={(e) => onChangeQuotation({ ...quotation, terms_and_conditions: e.target.value })}
                className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          )}

          {/* Bank Account */}
          <button
            onClick={() => setShowBank(!showBank)}
            className={`w-full p-2.5 bg-white border rounded-xl text-left text-xs font-bold flex items-center justify-between shadow-sm transition-all ${
              showBank ? 'border-indigo-500 text-indigo-700 bg-indigo-50/20' : 'border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-indigo-600" />
              <span>Bank Account Details</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">KOTAK9989279586</span>
          </button>

          {/* Payment QR */}
          <button
            onClick={() => setShowQR(!showQR)}
            className={`w-full p-2.5 bg-white border rounded-xl text-left text-xs font-bold flex items-center justify-between shadow-sm transition-all ${
              showQR ? 'border-indigo-500 text-indigo-700 bg-indigo-50/20' : 'border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-indigo-600" />
              <span>Payment QR Code</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">tejobharat@okaxis</span>
          </button>

        </div>

        {/* RIGHT COLUMN: SUMMARY & PAYMENT BOX (Matching Screenshot 2) */}
        <div className="col-span-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 font-sans text-xs">
          
          {/* Add Transportation & Additional Charges */}
          {!showAdditionalCharges && !quotation.additional_charges ? (
            <button 
              type="button"
              onClick={() => {
                setShowAdditionalCharges(true);
                if (!quotation.additional_charges_label) {
                  onChangeQuotation({ ...quotation, additional_charges_label: 'Transportation & Delivery Charges' });
                }
              }}
              className="font-extrabold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1.5 py-1 text-xs"
            >
              <Truck className="w-4 h-4 text-indigo-500" />
              <span>+ Add Transportation / Freight Charges</span>
            </button>
          ) : (
            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-indigo-950 text-xs flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-indigo-600" />
                  Transportation & Freight Charges
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowAdditionalCharges(false);
                    onChangeQuotation({ ...quotation, additional_charges: 0 });
                  }}
                  className="text-slate-400 hover:text-red-600 text-xs font-bold"
                >
                  Remove ✕
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  placeholder="e.g. Transportation & Delivery Charges"
                  value={quotation.additional_charges_label || 'Transportation & Delivery Charges'}
                  onChange={(e) => onChangeQuotation({ ...quotation, additional_charges_label: e.target.value })}
                  className="font-semibold text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 flex-1 text-slate-800 focus:ring-1 focus:ring-indigo-500 font-sans"
                />
                <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2 py-1 w-28">
                  <span className="text-xs text-slate-400 font-mono mr-1">₹</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={quotation.additional_charges || ''}
                    onChange={(e) => onChangeQuotation({ ...quotation, additional_charges: Number(e.target.value) })}
                    className="w-full text-right font-mono font-black text-slate-900 focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* QUICK PRESETS */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] font-bold text-slate-400">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => onChangeQuotation({ ...quotation, additional_charges: 3000 })}
                  className="px-2 py-0.5 bg-white hover:bg-indigo-100 border border-indigo-200 text-indigo-900 rounded text-[10px] font-extrabold"
                >
                  ₹3,000 (Local)
                </button>
                <button
                  type="button"
                  onClick={() => onChangeQuotation({ ...quotation, additional_charges: 5000 })}
                  className="px-2 py-0.5 bg-white hover:bg-indigo-100 border border-indigo-200 text-indigo-900 rounded text-[10px] font-extrabold"
                >
                  ₹5,000 (State)
                </button>
                <button
                  type="button"
                  onClick={() => onChangeQuotation({ ...quotation, additional_charges: 10000 })}
                  className="px-2 py-0.5 bg-white hover:bg-indigo-100 border border-indigo-200 text-indigo-900 rounded text-[10px] font-extrabold"
                >
                  ₹10,000 (Heavy Outstation)
                </button>
              </div>
            </div>
          )}

          {/* Taxable Amount & SGST / CGST Breakdown (Matching Screenshot 2) */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100 font-semibold text-slate-600">
            <div className="flex justify-between items-center">
              <span>Taxable Amount</span>
              <span className="font-mono font-bold text-slate-900">₹ {taxableAmountTotal.toLocaleString('en-IN')}</span>
            </div>
            
            {/* Quick GST Rate Presets */}
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1 my-1">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 uppercase">
                <span>Set All Items GST Rate:</span>
                <span className="font-mono text-teal-800">{quotation.gst_rate_percent ?? 8.9}%</span>
              </div>
              <div className="flex gap-1">
                {[
                  { label: '0% (Nil)', val: 0 },
                  { label: '5%', val: 5 },
                  { label: '8.9% (Solar)', val: 8.9 },
                  { label: '12%', val: 12 },
                  { label: '18%', val: 18 }
                ].map((g) => (
                  <button
                    key={g.val}
                    type="button"
                    onClick={() => {
                      const updated = lineItems.map(it => {
                        const taxable = Math.round((it.price_per_item * it.qty - (it.discount_rs || 0)) * 100) / 100;
                        const tax = Math.round(((taxable * g.val) / 100) * 100) / 100;
                        return {
                          ...it,
                          tax_rate_percent: g.val,
                          tax_amount: tax,
                          total_amount: Math.round((taxable + tax) * 100) / 100
                        };
                      });
                      
                      const newTotal = updated.reduce((sum, item) => sum + item.total_amount, 0);

                      onChangeQuotation({
                        ...quotation,
                        gst_rate_percent: g.val,
                        total_amount: newTotal > 0 ? newTotal : quotation.total_amount,
                        line_items: updated,
                      });
                    }}
                    className={`flex-1 py-0.5 text-[10px] font-bold rounded border transition-all ${
                      (quotation.gst_rate_percent === g.val || (!quotation.gst_rate_percent && g.val === 8.9))
                        ? 'bg-teal-700 text-white border-teal-800 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between text-[11px] text-slate-500">
              <span>SGST @{taxPercentHalf}%</span>
              <span className="font-mono font-bold text-slate-700">₹ {sgstAmt.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>CGST @{taxPercentHalf}%</span>
              <span className="font-mono font-bold text-slate-700">₹ {cgstAmt.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Add Discount Link */}
          <div>
            <button className="font-bold text-indigo-600 hover:underline flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" />
              <span>Add Discount</span>
            </button>
          </div>

          {/* Apply TCS Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="tcs-check"
              checked={Boolean(quotation.tcs_applied)}
              onChange={(e) => onChangeQuotation({ ...quotation, tcs_applied: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="tcs-check" className="font-semibold text-slate-700 cursor-pointer">
              Apply TCS
            </label>
          </div>

          {/* Auto Round Off Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="roundoff-check"
              checked={quotation.auto_round_off !== false}
              onChange={(e) => onChangeQuotation({ ...quotation, auto_round_off: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="roundoff-check" className="font-semibold text-slate-700 cursor-pointer">
              Auto Round Off
            </label>
          </div>

          {/* Show GST Breakdown in Proposal Preview */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-gst-check"
              checked={quotation.show_gst_in_table !== false}
              onChange={(e) => onChangeQuotation({ ...quotation, show_gst_in_table: e.target.checked })}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <label htmlFor="show-gst-check" className="font-semibold text-teal-900 cursor-pointer text-xs flex items-center gap-1.5">
              <span>🏛️ Show Detailed GST Columns & Summary in Proposal</span>
            </label>
          </div>

          {/* TOTAL AMOUNT HIGHLIGHT (Matching Screenshot 2) */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <span className="text-base font-black text-slate-900">Total Amount:</span>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2">
              <span className="text-xs font-bold text-slate-500">₹</span>
              <input
                type="number"
                value={grandTotal}
                onChange={(e) => onChangeQuotation({ ...quotation, total_amount: Number(e.target.value) })}
                className="w-36 text-right font-mono font-black text-lg text-slate-900 bg-transparent focus:outline-none"
              />
            </div>
          </div>

          {/* TOTAL AMOUNT RECEIVED & PAYMENT TYPE */}
          <div className="pt-2 space-y-2 border-t border-slate-100">
            <div className="flex items-center justify-between font-bold text-slate-600">
              <span>Total Amount Received</span>
              <span className="font-mono text-slate-900">₹ {quotation.amount_received || 0}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5">
                <span className="text-xs text-slate-400 font-bold mr-1">₹</span>
                <input
                  type="number"
                  placeholder="0"
                  value={quotation.amount_received || 0}
                  onChange={(e) => onChangeQuotation({ ...quotation, amount_received: Number(e.target.value) })}
                  className="w-full text-xs font-mono font-bold bg-transparent focus:outline-none"
                />
              </div>

              <select
                value={quotation.payment_type || 'Cash'}
                onChange={(e) => onChangeQuotation({ ...quotation, payment_type: e.target.value as any })}
                className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI / GPay</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            {/* Mark as Fully Paid Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="fullypaid-check"
                checked={Boolean(quotation.is_fully_paid)}
                onChange={(e) => {
                  const checked = e.target.checked;
                  onChangeQuotation({
                    ...quotation,
                    is_fully_paid: checked,
                    amount_received: checked ? grandTotal : 0,
                    payment_status: checked ? 'Paid' : 'Unpaid',
                  });
                }}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="fullypaid-check" className="font-semibold text-slate-700 cursor-pointer">
                Mark as fully paid
              </label>
            </div>

          </div>

        </div>

      </div>

      {/* ADD ITEMS TO BILL MODAL */}
      <AddItemsToBillModal
        isOpen={showAddItemsModal}
        onClose={() => setShowAddItemsModal(false)}
        items={items}
        onAddSelectedItemsToBill={handleAddItemsFromModal}
        onOpenCreateItem={onOpenCreateItem}
      />

      {/* PARTY SELECTION MODAL */}
      {showPartyPicker && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-600" />
                  <span>Select Party / Customer</span>
                </h3>
                <button
                  onClick={() => handleOpenPartyPopup(null)}
                  className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs rounded-lg border border-indigo-200 flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Party</span>
                </button>
              </div>

              <button 
                onClick={() => setShowPartyPicker(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
              {parties.map((p) => (
                <div
                  key={p.id || p.name}
                  className="p-3.5 hover:bg-indigo-50/60 rounded-xl cursor-pointer transition-colors space-y-1.5 group flex items-start justify-between"
                  onClick={() => handleSelectParty(p)}
                >
                  <div className="space-y-1 flex-1 pr-3">
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-xs text-slate-900 uppercase">{p.name}</span>
                      <span className="text-slate-500 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">{p.mobile_number || 'No Mobile'}</span>
                    </div>

                    {p.gstin && (
                      <div className="text-[11px] text-slate-600 font-mono">
                        GSTIN: <strong>{p.gstin}</strong>
                      </div>
                    )}

                    {p.billing_address && (
                      <div className="text-[11px] text-slate-600 leading-snug">
                        📍 {p.billing_address}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPartyPopup(p);
                      }}
                      className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleSelectParty(p)}
                      className="px-3 py-1 bg-[#4f46e5] text-white text-xs font-bold rounded-lg shadow-sm"
                    >
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 text-right">
              <button
                onClick={() => setShowPartyPicker(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP PARTY FORM MODAL */}
      {isPartyFormModalOpen && (
        <PartyForm
          initialParty={partyFormInitial}
          isModal={true}
          onSave={handleSavePartyPopup}
          onCancel={() => setIsPartyFormModalOpen(false)}
        />
      )}

      {/* MANAGE BOM DROPDOWNS MODAL */}
      <ManageDropdownsModal
        isOpen={isManageDropdownsOpen}
        onClose={() => setIsManageDropdownsOpen(false)}
        options={bomOptions}
        onSaveOptions={handleSaveBomOptions}
      />

      {/* OFF-GRID SOLAR CALCULATOR & DESIGNER MODAL */}
      <OffGridCalculatorModal
        isOpen={showOffGridModal}
        onClose={() => setShowOffGridModal(false)}
        onApplyOffGridQuote={handleApplyOffGridQuote}
      />

    </div>
  );
};
