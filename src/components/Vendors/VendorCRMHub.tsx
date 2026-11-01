import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sun, Phone, PhoneForwarded, MessageSquare, Download, Upload, 
  Sparkles, Layers, CalendarClock, ListFilter, RotateCcw, 
  Loader2, CheckCircle2, ShieldCheck, Network, ChevronDown, Plus
} from 'lucide-react';
import { VendorItem, DistrictSummary, PipelineStage, Priority, CallOutcome } from '../../types/vendorCRM';
import { 
  initializeVendorCRM, updateVendorInDB, addVendorNoteInDB, saveDistrictsToDB 
} from '../../lib/vendorCRMStorage';
import { DashboardMetrics } from './DashboardMetrics';
import { VendorList } from './VendorList';
import { KanbanBoard } from './KanbanBoard';
import { FollowUpQueue } from './FollowUpQueue';
import { VendorDetailModal } from './VendorDetailModal';
import { PowerDialerModal } from './PowerDialerModal';
import { SalesPitchDrawer } from './SalesPitchDrawer';
import { ImportDistrictModal } from './ImportDistrictModal';
import { ExportBackupModal } from './ExportBackupModal';
import VendorSupplyChainModal from '../SNumbers/VendorSupplyChainModal';

export default function VendorCRMHub() {
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [districts, setDistricts] = useState<DistrictSummary[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<'list' | 'kanban' | 'followups'>('list');

  // Modals state
  const [selectedVendorKey, setSelectedVendorKey] = useState<string | null>(null);
  const [isPowerDialerOpen, setIsPowerDialerOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isPitchOpen, setIsPitchOpen] = useState(false);

  // Cross-link to DCR Supply Chain modal
  const [supplyChainVendor, setSupplyChainVendor] = useState<string | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Initial load
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const { vendors: loadedVendors, districts: loadedDistricts } = await initializeVendorCRM();
        setVendors(loadedVendors);
        setDistricts(loadedDistricts);
        if (loadedDistricts.length > 0 && selectedDistrict === 'all') {
          // Keep 'all' or default to first district
        }
      } catch (err) {
        console.error('Failed to load vendor CRM data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtered vendors for currently active district
  const districtVendors = useMemo(() => {
    if (selectedDistrict === 'all') return vendors;
    return vendors.filter(v => v.district.toLowerCase() === selectedDistrict.toLowerCase());
  }, [vendors, selectedDistrict]);

  // Selected vendor object
  const selectedVendor = useMemo(() => {
    if (!selectedVendorKey) return null;
    return vendors.find(v => v.uniqueKey === selectedVendorKey) || null;
  }, [vendors, selectedVendorKey]);

  // Counts for Badges
  const today = new Date().toISOString().slice(0, 10);
  const dueFollowUpCount = useMemo(() => {
    return districtVendors.filter(v => v.nextFollowUpDate === today).length;
  }, [districtVendors, today]);

  const hotLeadsCount = useMemo(() => {
    return districtVendors.filter(v => v.priority === 'HOT' || v.pipelineStage === 'INTERESTED').length;
  }, [districtVendors]);

  // Power dialer queue: prioritized leads
  const dialerQueue = useMemo(() => {
    const pool = [...districtVendors];
    pool.sort((a, b) => {
      if (a.pipelineStage === 'NEW' && b.pipelineStage !== 'NEW') return -1;
      if (b.pipelineStage === 'NEW' && a.pipelineStage !== 'NEW') return 1;
      if (a.priority === 'HOT' && b.priority !== 'HOT') return -1;
      if (b.priority === 'HOT' && a.priority !== 'HOT') return 1;
      return 0;
    });
    return pool;
  }, [districtVendors]);

  // Modal navigation index
  const currentVendorIndex = useMemo(() => {
    if (!selectedVendorKey) return -1;
    return districtVendors.findIndex(v => v.uniqueKey === selectedVendorKey);
  }, [districtVendors, selectedVendorKey]);

  const handleNextVendor = () => {
    if (currentVendorIndex >= 0 && currentVendorIndex < districtVendors.length - 1) {
      setSelectedVendorKey(districtVendors[currentVendorIndex + 1].uniqueKey);
    }
  };

  const handlePrevVendor = () => {
    if (currentVendorIndex > 0) {
      setSelectedVendorKey(districtVendors[currentVendorIndex - 1].uniqueKey);
    }
  };

  // Update Vendor in DB & state
  const handleUpdateVendor = async (vendorKey: string, updates: Partial<VendorItem>) => {
    await updateVendorInDB(vendorKey, updates);
    setVendors(prev => prev.map(v => v.uniqueKey === vendorKey ? { ...v, ...updates } : v));
    showToast('Vendor updated');
  };

  // Add Note in DB & state
  const handleAddNote = async (
    vendorKey: string,
    noteData: {
      content: string;
      callOutcome?: CallOutcome | string;
      nextFollowUpDate?: string | null;
      stageChange?: PipelineStage;
      priorityChange?: Priority;
      solarRequirement?: VendorItem['solarRequirement'];
    }
  ) => {
    const updated = await addVendorNoteInDB(vendorKey, noteData);
    if (updated) {
      setVendors(prev => prev.map(v => v.uniqueKey === vendorKey ? updated : v));
      showToast('Call note logged successfully');
    }
  };

  // Quick call triggers stage move to 'CONTACTED'
  const handleQuickCall = (vendor: VendorItem) => {
    if (vendor.pipelineStage === 'NEW') {
      handleUpdateVendor(vendor.uniqueKey, { pipelineStage: 'CONTACTED' });
    }
  };

  // Import district completion
  const handleImportComplete = (districtName: string, newVendors: VendorItem[]) => {
    setVendors(prev => {
      const existingKeys = new Set(newVendors.map(nv => nv.uniqueKey));
      const filtered = prev.filter(p => !existingKeys.has(p.uniqueKey));
      return [...filtered, ...newVendors];
    });

    const districtId = districtName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    setDistricts(prev => {
      const existing = prev.filter(d => d.id !== districtId);
      return [
        ...existing,
        {
          id: districtId,
          name: districtName,
          totalVendors: newVendors.length,
          contactedCount: 0,
          interestedCount: 0,
          fileName: `${districtId}.json`,
          importedAt: new Date().toISOString()
        }
      ];
    });

    setSelectedDistrict(districtName);
    showToast(`Imported ${newVendors.length.toLocaleString('en-IN')} vendors for ${districtName}!`);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 p-3 sm:p-6 space-y-4">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Title & Badge */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-teal-700 text-white flex items-center justify-center shadow-md shadow-teal-700/20">
              <Sun className="w-6 h-6 animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Solar Vendor Sales & Calling CRM
                </h1>
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Admin Restricted
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Tejo Bharat B2B Vendor Calling • 1-Click WhatsApp Pitch • DCR Supply Chain Intelligence • Multi-District
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* District Selector */}
            <div className="relative">
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-300 font-extrabold text-xs text-slate-800 py-2.5 pl-3.5 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer shadow-2xs"
              >
                <option value="all">All Districts ({vendors.length})</option>
                {districts.map(d => (
                  <option key={d.id} value={d.name}>
                    {d.name} ({vendors.filter(v => v.district.toLowerCase() === d.name.toLowerCase()).length})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Power Dialer */}
            <button
              onClick={() => setIsPowerDialerOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-95 text-white font-black text-xs transition-all shadow-xs"
              title="Launch rapid calling queue"
            >
              <span>⚡</span>
              <span>Power Dialer</span>
            </button>

            {/* Sales Pitch Drawer */}
            <button
              onClick={() => setIsPitchOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xs transition-all shadow-xs"
              title="View Telugu & English sales scripts"
            >
              <Sparkles className="w-4 h-4" />
              <span>Sales Pitch</span>
            </button>

            {/* DCR Supply Chain Hub Button */}
            <button
              onClick={() => setSupplyChainVendor('Venkata Siri')}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 font-black text-xs transition-all shadow-2xs"
              title="Open full DCR supply chain tracker"
            >
              <Network className="w-4 h-4 text-indigo-600" />
              <span>DCR Supply Chain</span>
            </button>

            {/* Add District */}
            <button
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-1 px-3 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all"
              title="Upload new district JSON"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ District</span>
            </button>

            {/* Export */}
            <button
              onClick={() => setIsExportOpen(true)}
              className="p-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors"
              title="Export Excel or JSON backup"
            >
              <Download className="w-4 h-4" />
            </button>

          </div>

        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="py-12 text-center space-y-2">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Loading vendor database from IndexedDB...</p>
          </div>
        )}

        {/* Dashboard Metrics */}
        {!isLoading && (
          <DashboardMetrics 
            vendors={districtVendors}
            districtName={selectedDistrict === 'all' ? 'All Districts' : selectedDistrict}
          />
        )}

        {/* View Tabs */}
        {!isLoading && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
              
              <button
                onClick={() => setActiveView('list')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeView === 'list' 
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5 text-teal-600" />
                <span>All Vendors ({districtVendors.length.toLocaleString('en-IN')})</span>
              </button>

              <button
                onClick={() => setActiveView('kanban')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeView === 'kanban' 
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Kanban Pipeline</span>
              </button>

              <button
                onClick={() => setActiveView('followups')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeView === 'followups' 
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
                <span>Follow-ups Queue</span>
                {dueFollowUpCount > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                    {dueFollowUpCount}
                  </span>
                )}
              </button>

            </div>

            <span className="text-xs text-slate-400 font-medium">
              Data synchronized locally with IndexedDB
            </span>
          </div>
        )}

      </div>

      {/* Main Content Area */}
      {!isLoading && (
        <div>
          {activeView === 'list' && (
            <VendorList
              vendors={districtVendors}
              selectedDistrict={selectedDistrict}
              onSelectVendor={(v) => setSelectedVendorKey(v.uniqueKey)}
              onQuickCall={handleQuickCall}
              onUpdateStage={(k, s) => handleUpdateVendor(k, { pipelineStage: s })}
              onOpenSupplyChain={(vName) => setSupplyChainVendor(vName)}
            />
          )}

          {activeView === 'kanban' && (
            <KanbanBoard
              vendors={districtVendors}
              selectedDistrict={selectedDistrict}
              onSelectVendor={(v) => setSelectedVendorKey(v.uniqueKey)}
              onUpdateStage={(k, s) => handleUpdateVendor(k, { pipelineStage: s })}
              onOpenSupplyChain={(vName) => setSupplyChainVendor(vName)}
            />
          )}

          {activeView === 'followups' && (
            <FollowUpQueue
              vendors={districtVendors}
              onSelectVendor={(v) => setSelectedVendorKey(v.uniqueKey)}
              onQuickCall={handleQuickCall}
            />
          )}
        </div>
      )}

      {/* MODALS */}

      {/* 1. Vendor Detail / Call Logging Modal */}
      {selectedVendor && (
        <VendorDetailModal
          vendor={selectedVendor}
          onClose={() => setSelectedVendorKey(null)}
          onUpdateVendor={handleUpdateVendor}
          onAddNote={handleAddNote}
          onOpenSupplyChain={(vName) => setSupplyChainVendor(vName)}
          onNextVendor={handleNextVendor}
          onPrevVendor={handlePrevVendor}
          hasNext={currentVendorIndex < districtVendors.length - 1}
          hasPrev={currentVendorIndex > 0}
        />
      )}

      {/* 2. Power Dialer Modal */}
      {isPowerDialerOpen && (
        <PowerDialerModal
          queue={dialerQueue}
          onClose={() => setIsPowerDialerOpen(false)}
          onAddNoteAndAdvance={handleAddNote}
        />
      )}

      {/* 3. Sales Pitch Guide Drawer */}
      <SalesPitchDrawer
        isOpen={isPitchOpen}
        onClose={() => setIsPitchOpen(false)}
      />

      {/* 4. Import District Modal */}
      <ImportDistrictModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={handleImportComplete}
      />

      {/* 5. Export Backup Modal */}
      <ExportBackupModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        vendors={districtVendors}
        districtName={selectedDistrict === 'all' ? 'All_Districts' : selectedDistrict}
      />

      {/* 6. DCR Supply Chain Tracker Modal */}
      {supplyChainVendor && (
        <VendorSupplyChainModal
          isOpen={Boolean(supplyChainVendor)}
          onClose={() => setSupplyChainVendor(null)}
          initialVendor={supplyChainVendor}
        />
      )}

    </div>
  );
}
