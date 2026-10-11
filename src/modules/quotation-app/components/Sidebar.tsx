import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard,
  Sun, 
  Users,
  Package,
  Plus, 
  ChevronDown, 
  ChevronRight,
  Settings,
  ShieldCheck,
  Award,
  BarChart3,
  ShoppingCart,
  UserPlus,
  PackagePlus,
  FileSpreadsheet,
  Receipt,
  RotateCcw,
  FileText,
  Truck,
  FileCheck,
  ShoppingBag,
  CreditCard,
  Download,
  Upload,
  PanelLeftClose
} from 'lucide-react';
import { DocumentType } from '../types/quotation';

interface SidebarProps {
  activeTab: 'create' | 'list' | 'parties' | 'party_form' | 'items';
  setActiveTab: (tab: 'create' | 'list' | 'parties' | 'party_form' | 'items') => void;
  activeDocFilter: 'All' | DocumentType;
  setActiveDocFilter: (filter: 'All' | DocumentType) => void;
  onNewDocument: (docType: DocumentType) => void;
  onOpenBranchModal: () => void;
  onOpenParties?: () => void;
  onOpenItems?: () => void;
  onOpenCreateParty?: () => void;
  onOpenCreateItem?: () => void;
  onOpenCreatePaymentIn?: () => void;
  quotationsCount?: number;
  invoicesCount?: number;
  partiesCount?: number;
  itemsCount?: number;
  onExportBackup?: () => void;
  onImportBackup?: (file: File) => void;
  basePath?: string;
  onBackToCrm?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  activeDocFilter,
  setActiveDocFilter,
  onNewDocument,
  onOpenBranchModal,
  onOpenParties,
  onOpenItems,
  onOpenCreateParty,
  onOpenCreateItem,
  onOpenCreatePaymentIn,
  quotationsCount,
  invoicesCount,
  partiesCount,
  itemsCount,
  onExportBackup,
  onImportBackup,
  basePath = "",
  onBackToCrm,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState<boolean>(false);
  const [isSalesExpanded, setIsSalesExpanded] = useState<boolean>(true);

  const docTypeToRoute = (type: DocumentType) => {
    const prefix = basePath || "";
    if (type === 'Quotation') return `${prefix}/quotations`;
    if (type === 'Payment In') return `${prefix}/payment-in`;
    if (type === 'Proforma Invoice') return `${prefix}/proforma-invoices`;
    if (type === 'Credit Note') return `${prefix}/credit-notes`;
    if (type === 'Delivery Challan') return `${prefix}/delivery-challans`;
    return `${prefix}/invoices`;
  };

  const handleCreateType = (type: DocumentType) => {
    setActiveDocFilter(type);
    onNewDocument(type);
    setActiveTab('create');
    setIsCreateDropdownOpen(false);
    navigate(`${basePath || ""}/create`);
  };

  const handleSelectDocFilter = (type: DocumentType) => {
    setActiveDocFilter(type);
    setActiveTab('list');
    navigate(docTypeToRoute(type));
  };

  return (
    <aside className="w-64 bg-[#0a1128] text-slate-300 flex flex-col justify-between min-h-screen no-print select-none border-r border-slate-800/80 shadow-2xl font-sans flex-shrink-0 transition-all duration-300">
      
      {/* TOP HEADER */}
      <div className="p-3.5 space-y-3.5">

        {/* Back to Solar CRM button & Hide Sidebar toggle */}
        <div className="flex items-center gap-2">
          {onBackToCrm && (
            <button
              onClick={onBackToCrm}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all group cursor-pointer"
            >
              <Sun className="w-4 h-4 text-slate-950 group-hover:rotate-45 transition-transform" />
              <span>← Switch to Solar CRM</span>
            </button>
          )}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-2 bg-[#121c3d] hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-700/80 transition-all cursor-pointer shadow-sm group flex-shrink-0 ml-auto"
              title="Hide Sidebar"
            >
              <PanelLeftClose className="w-4 h-4 group-hover:scale-110 transition-transform text-slate-300" />
            </button>
          )}
        </div>
        
        {/* Company Profile Header */}
        <div className="flex items-center gap-3 p-2 bg-[#121c3d] rounded-xl border border-slate-800/90 shadow-sm">
          <div className="w-9 h-9 bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center font-black text-xs text-white shadow-inner flex-shrink-0 bg-gradient-to-br from-indigo-900 to-slate-950">
            TB
          </div>
          <div className="overflow-hidden leading-tight flex-1">
            <h1 className="font-extrabold text-xs text-white tracking-wide truncate">
              TEJO BHARAT GLO...
            </h1>
            <p className="text-[11px] text-slate-400 font-mono tracking-tight truncate mt-0.5">
              9479797947
            </p>
          </div>
          {!onBackToCrm && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer flex-shrink-0"
              title="Hide Sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* CREATE SALES INVOICE PRIMARY BUTTON (Matching MyBillBook Screenshot media_1789136175759.png) */}
        <div className="relative">
          <div className="flex bg-[#dbeafe] hover:bg-[#bfdbfe] text-[#1e40af] rounded-2xl overflow-hidden shadow-md transition-all">
            <button
              onClick={() => handleCreateType('Sales Invoice')}
              className="flex-1 px-3.5 py-2.5 font-extrabold text-xs flex items-center gap-1.5 transition-all text-[#1e40af]"
            >
              <Plus className="w-4 h-4 text-[#1e40af]" />
              <span>Create Sales Invoice</span>
            </button>
            <button
              onClick={() => setIsCreateDropdownOpen(!isCreateDropdownOpen)}
              className="px-3 border-l border-indigo-200/60 flex items-center justify-center hover:bg-[#bfdbfe] transition-all text-[#1e40af]"
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCreateDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* FLOATING MULTI-SECTION POPOVER DROPDOWN (Matching Screenshot media_1789136175759.png) */}
          {isCreateDropdownOpen && (
            <div className="absolute left-0 top-12 w-64 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-xs font-sans animate-in fade-in slide-in-from-top-2">
              
              {/* Scrollable Items Container */}
              <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 p-1 space-y-1">
                
                {/* SECTION 1: GENERAL */}
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    GENERAL
                  </div>
                  <button
                    onClick={() => {
                      if (onOpenCreateParty) onOpenCreateParty();
                      setIsCreateDropdownOpen(false);
                      navigate(`${basePath || ""}/parties/new`);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-3 transition-colors"
                  >
                    <UserPlus className="w-4 h-4 text-slate-500" />
                    <span>Create Party</span>
                  </button>
                  <button
                    onClick={() => {
                      if (onOpenCreateItem) onOpenCreateItem();
                      setIsCreateDropdownOpen(false);
                      navigate(`${basePath || ""}/items`);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-3 transition-colors"
                  >
                    <PackagePlus className="w-4 h-4 text-slate-500" />
                    <span>Create Item</span>
                  </button>
                </div>

                {/* SECTION 2: SALES TRANSACTIONS */}
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    SALES TRANSACTIONS
                  </div>
                  <button
                    onClick={() => handleCreateType('Quotation')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-3 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                    <span>Quotation</span>
                  </button>
                  <button
                    onClick={() => {
                      if (onOpenCreatePaymentIn) onOpenCreatePaymentIn();
                      setIsCreateDropdownOpen(false);
                      navigate(`${basePath || ""}/payment-in`);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-3 transition-colors"
                  >
                    <Receipt className="w-4 h-4 text-slate-500" />
                    <span>Payment In</span>
                  </button>
                  <button
                    onClick={() => handleCreateType('Sales Invoice')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-3 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 text-slate-500" />
                    <span>Sales Return</span>
                  </button>
                  <button
                    onClick={() => handleCreateType('Credit Note')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-3 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>Credit Note</span>
                  </button>
                  <button
                    onClick={() => handleCreateType('Delivery Challan')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-3 transition-colors"
                  >
                    <Truck className="w-4 h-4 text-slate-500" />
                    <span>Delivery Challan</span>
                  </button>
                  <button
                    onClick={() => handleCreateType('Proforma Invoice')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-3 transition-colors"
                  >
                    <FileCheck className="w-4 h-4 text-slate-500" />
                    <span>Proforma Invoice</span>
                  </button>
                </div>

                {/* SECTION 3: PURCHASE TRANSACTIONS */}
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    PURCHASE TRANSACTIONS
                  </div>
                  <button
                    onClick={() => handleCreateType('Sales Invoice')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-3 transition-colors"
                  >
                    <ShoppingBag className="w-4 h-4 text-slate-500" />
                    <span>Purchase</span>
                  </button>
                  <button
                    onClick={() => {
                      if (onOpenCreatePaymentIn) onOpenCreatePaymentIn();
                      setIsCreateDropdownOpen(false);
                      navigate('/payment-in');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-3 transition-colors"
                  >
                    <CreditCard className="w-4 h-4 text-slate-500" />
                    <span>Payment Out</span>
                  </button>
                  <button
                    onClick={() => handleCreateType('Sales Invoice')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-3 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 text-slate-500" />
                    <span>Purchase Return</span>
                  </button>
                  <button
                    onClick={() => handleCreateType('Sales Invoice')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-3 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>Debit Note</span>
                  </button>
                  <button
                    onClick={() => handleCreateType('Sales Invoice')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-3 transition-colors"
                  >
                    <Package className="w-4 h-4 text-slate-500" />
                    <span>Purchase Orders</span>
                  </button>
                  <button
                    onClick={() => handleCreateType('Sales Invoice')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-3 transition-colors"
                  >
                    <Receipt className="w-4 h-4 text-slate-500" />
                    <span>Create Expense</span>
                  </button>
                </div>

              </div>

              {/* Bottom Sticky Pill */}
              <div className="bg-slate-900 text-white text-[10px] font-bold text-center py-1.5 px-3 flex items-center justify-center gap-1 shadow-inner">
                <span>Scroll for more options</span>
                <span>↓</span>
              </div>
            </div>
          )}
        </div>

        {/* NAVIGATION TREE */}
        <div className="space-y-4 pt-1 text-xs">
          
          {/* GENERAL */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-3 mb-1">
              GENERAL
            </span>
            <div className="space-y-0.5">
              
              <button
                onClick={() => {
                  setActiveDocFilter('Sales Invoice');
                  setActiveTab('list');
                  navigate(`${basePath || ""}/invoices`);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg font-medium flex items-center justify-between transition-all ${
                  activeTab === 'list' && (activeDocFilter === 'Sales Invoice' || activeDocFilter === 'All')
                    ? 'bg-[#1e293b] text-white font-semibold'
                    : 'hover:bg-[#121c3d] text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className="w-4 h-4 text-slate-400" />
                  <span>Dashboard</span>
                </div>
              </button>

              <button
                onClick={() => {
                  if (onOpenParties) onOpenParties();
                  navigate(`${basePath || ""}/parties`);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg font-medium flex items-center justify-between transition-all ${
                  activeTab === 'parties' || activeTab === 'party_form'
                    ? 'bg-[#1e293b] text-white font-semibold'
                    : 'hover:bg-[#121c3d] text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>Parties</span>
                </div>
                {typeof partiesCount === 'number' && partiesCount > 0 ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {partiesCount}
                  </span>
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

              <button
                onClick={() => {
                  if (onOpenItems) onOpenItems();
                  navigate(`${basePath || ""}/items`);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg font-medium flex items-center justify-between transition-all ${
                  activeTab === 'items'
                    ? 'bg-[#1e293b] text-white font-semibold'
                    : 'hover:bg-[#121c3d] text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-slate-400" />
                  <span>Items</span>
                </div>
                {typeof itemsCount === 'number' && itemsCount > 0 ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {itemsCount}
                  </span>
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

            </div>
          </div>

          {/* SALES (Accordion Section matching MyBillBook screenshot 2) */}
          <div>
            <button 
              onClick={() => setIsSalesExpanded(!isSalesExpanded)}
              className="w-full px-3 mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                <span>Sales</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSalesExpanded ? '' : '-rotate-90'}`} />
            </button>

            {isSalesExpanded && (
              <div className="space-y-0.5 pl-2 border-l border-slate-800 ml-3">
                
                {/* Sales Invoices */}
                <button
                  onClick={() => handleSelectDocFilter('Sales Invoice')}
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium flex items-center justify-between transition-all ${
                    activeTab === 'list' && (activeDocFilter === 'Sales Invoice' || activeDocFilter === 'Tax Invoice')
                      ? 'bg-[#3b82f6] text-white font-semibold shadow-md'
                      : 'hover:bg-[#121c3d] text-slate-300'
                  }`}
                >
                  <span>Sales Invoices</span>
                  {typeof invoicesCount === 'number' && invoicesCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-900/60 text-blue-200 border border-blue-500/40 font-mono">
                      {invoicesCount}
                    </span>
                  )}
                </button>

                {/* Quotation / Estimate */}
                <button
                  onClick={() => handleSelectDocFilter('Quotation')}
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium flex items-center justify-between transition-all ${
                    activeTab === 'list' && activeDocFilter === 'Quotation'
                      ? 'bg-[#3b82f6] text-white font-semibold shadow-md'
                      : 'hover:bg-[#121c3d] text-slate-300'
                  }`}
                >
                  <span>Quotation / Estimate</span>
                  {typeof quotationsCount === 'number' && quotationsCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-900/60 text-blue-200 border border-blue-500/40 font-mono">
                      {quotationsCount}
                    </span>
                  )}
                </button>

                {/* Payment In */}
                <button
                  onClick={() => handleSelectDocFilter('Payment In')}
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium flex items-center justify-between transition-all ${
                    activeTab === 'list' && activeDocFilter === 'Payment In'
                      ? 'bg-[#3b82f6] text-white font-semibold shadow-md'
                      : 'hover:bg-[#121c3d] text-slate-300'
                  }`}
                >
                  <span>Payment In</span>
                </button>

                {/* Sales Return */}
                <button
                  onClick={() => handleSelectDocFilter('Sales Invoice')}
                  className="w-full text-left px-3 py-2 rounded-lg font-medium text-slate-400 hover:bg-[#121c3d] hover:text-slate-300 transition-all flex items-center justify-between"
                >
                  <span>Sales Return</span>
                </button>

                {/* Credit Note */}
                <button
                  onClick={() => handleSelectDocFilter('Credit Note')}
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium flex items-center justify-between transition-all ${
                    activeTab === 'list' && activeDocFilter === 'Credit Note'
                      ? 'bg-[#3b82f6] text-white font-semibold shadow-md'
                      : 'hover:bg-[#121c3d] text-slate-300'
                  }`}
                >
                  <span>Credit Note</span>
                </button>

                {/* Delivery Challan */}
                <button
                  onClick={() => handleSelectDocFilter('Delivery Challan')}
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium flex items-center justify-between transition-all ${
                    activeTab === 'list' && activeDocFilter === 'Delivery Challan'
                      ? 'bg-[#3b82f6] text-white font-semibold shadow-md'
                      : 'hover:bg-[#121c3d] text-slate-300'
                  }`}
                >
                  <span>Delivery Challan</span>
                </button>

                {/* Proforma Invoice */}
                <button
                  onClick={() => handleSelectDocFilter('Proforma Invoice')}
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium flex items-center justify-between transition-all ${
                    activeTab === 'list' && activeDocFilter === 'Proforma Invoice'
                      ? 'bg-[#3b82f6] text-white font-semibold shadow-md'
                      : 'hover:bg-[#121c3d] text-slate-300'
                  }`}
                >
                  <span>Proforma Invoice</span>
                </button>

              </div>
            )}
          </div>

          {/* PURCHASES */}
          <div className="pt-1">
            <button 
              onClick={() => handleSelectDocFilter('Sales Invoice')}
              className="w-full text-left px-3 py-2 rounded-lg font-medium flex items-center justify-between hover:bg-[#121c3d] text-slate-300 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="w-4 h-4 text-slate-400" />
                <span>Purchases</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>

          {/* REPORTS */}
          <div>
            <button 
              onClick={() => {
                setActiveDocFilter('Sales Invoice');
                setActiveTab('list');
                navigate(`${basePath || ""}/invoices`);
              }}
              className="w-full text-left px-3 py-2 rounded-lg font-medium flex items-center justify-between hover:bg-[#121c3d] text-slate-300 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-4 h-4 text-slate-400" />
                <span>Reports</span>
              </div>
            </button>
          </div>

          {/* ACCOUNTING SOLUTIONS BADGE */}
          <div className="pt-2">
            <div className="p-2.5 bg-[#121c3d]/60 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">
                ACCOUNTING SOLUTIONS
              </span>
              <button 
                onClick={onOpenBranchModal}
                className="text-[10px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 font-mono transition-colors"
              >
                <span>Scroll for more options</span>
                <span>↓</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* FOOTER BAR WITH SETTINGS & CERTIFICATIONS */}
      <div className="p-3 border-t border-slate-800/80 bg-[#070b1e] space-y-2">
        {/* Backup & Restore Tools */}
        <div className="grid grid-cols-2 gap-1.5 pb-1">
          {onExportBackup && (
            <button
              onClick={onExportBackup}
              className="px-2 py-1.5 rounded-lg text-[11px] font-bold bg-[#121c3d] hover:bg-[#1e293b] text-indigo-200 hover:text-white flex items-center justify-center gap-1.5 transition-all border border-indigo-900/60"
              title="Download full JSON backup of all quotes and parties"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Backup</span>
            </button>
          )}

          {onImportBackup && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onImportBackup(e.target.files[0]);
                    e.target.value = '';
                  }
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2 py-1.5 rounded-lg text-[11px] font-bold bg-[#121c3d] hover:bg-[#1e293b] text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all border border-slate-800"
                title="Restore from a previously saved JSON backup"
              >
                <Upload className="w-3.5 h-3.5 text-slate-400" />
                <span>Restore</span>
              </button>
            </>
          )}
        </div>

        <button
          onClick={onOpenBranchModal}
          className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:bg-[#121c3d] hover:text-white flex items-center gap-2 transition-all"
        >
          <Settings className="w-4 h-4 text-slate-400" />
          <span>Settings</span>
        </button>

        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 px-1">
          <div className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3 h-3" />
            <span>100% Secure</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <Award className="w-3 h-3 text-amber-400" />
            <span>ISO Certified</span>
          </div>
        </div>
      </div>

    </aside>
  );
};

