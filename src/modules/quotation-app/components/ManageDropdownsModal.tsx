import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Sliders, 
  Check, 
  Layers, 
  Zap, 
  Sun, 
  Maximize2, 
  ShieldCheck, 
  ArrowUpRight,
  Copy,
  Edit2,
  Save,
  FileText,
  CheckCircle2,
  ClipboardList
} from 'lucide-react';
import { 
  INVERTER_BRANDS, 
  INVERTER_PHASES, 
  STRUCTURE_GRIDS, 
  STRUCTURE_HEIGHTS, 
  STRUCTURE_TYPES, 
  PANEL_BRANDS, 
  CABLE_BRANDS 
} from '../types/quotation';

export interface BomDropdownOptions {
  inverterBrands: string[];
  inverterPhases: string[];
  structureGrids: string[];
  structureHeights: string[];
  structureTypes: string[];
  panelBrands: string[];
  cableBrands: string[];
}

export const DEFAULT_BOM_DROPDOWN_OPTIONS: BomDropdownOptions = {
  inverterBrands: INVERTER_BRANDS,
  inverterPhases: INVERTER_PHASES,
  structureGrids: STRUCTURE_GRIDS,
  structureHeights: STRUCTURE_HEIGHTS,
  structureTypes: STRUCTURE_TYPES,
  panelBrands: PANEL_BRANDS,
  cableBrands: CABLE_BRANDS,
};

interface ManageDropdownsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: BomDropdownOptions;
  onSaveOptions: (updated: BomDropdownOptions) => void;
}

type TabType = 'inverters' | 'phases' | 'grids' | 'heights' | 'structures' | 'panels' | 'cables';

export const ManageDropdownsModal: React.FC<ManageDropdownsModalProps> = ({
  isOpen,
  onClose,
  options,
  onSaveOptions
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('inverters');
  const [localOptions, setLocalOptions] = useState<BomDropdownOptions>(options);
  const [newItemInput, setNewItemInput] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  
  // Copy & Edit & Bulk States
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedCategory, setCopiedCategory] = useState<boolean>(false);
  const [copiedAllJson, setCopiedAllJson] = useState<boolean>(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [isBulkMode, setIsBulkMode] = useState<boolean>(false);
  const [bulkInput, setBulkInput] = useState<string>('');

  useEffect(() => {
    setLocalOptions(options);
  }, [options, isOpen]);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  const getActiveListKey = (): keyof BomDropdownOptions => {
    switch (activeTab) {
      case 'inverters': return 'inverterBrands';
      case 'phases': return 'inverterPhases';
      case 'grids': return 'structureGrids';
      case 'heights': return 'structureHeights';
      case 'structures': return 'structureTypes';
      case 'panels': return 'panelBrands';
      case 'cables': return 'cableBrands';
    }
  };

  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = newItemInput.trim();
    if (!val) return;

    const listKey = getActiveListKey();
    const currentList = localOptions[listKey];

    if (currentList.includes(val)) {
      alert(`"${val}" already exists in this dropdown list.`);
      return;
    }

    const updatedList = [...currentList, val];
    const updatedOptions = { ...localOptions, [listKey]: updatedList };

    setLocalOptions(updatedOptions);
    onSaveOptions(updatedOptions);
    setNewItemInput('');
    showNotification(`Saved "${val}" to ${activeTab} dropdown options`);
  };

  const handleDeleteItem = (indexToDelete: number) => {
    const listKey = getActiveListKey();
    const currentList = localOptions[listKey];

    if (currentList.length <= 1) {
      alert('Must keep at least 1 option in the list.');
      return;
    }

    const itemVal = currentList[indexToDelete];
    const updatedList = currentList.filter((_, i) => i !== indexToDelete);
    const updatedOptions = { ...localOptions, [listKey]: updatedList };

    setLocalOptions(updatedOptions);
    onSaveOptions(updatedOptions);
    if (editingIndex === indexToDelete) {
      setEditingIndex(null);
    }
    showNotification(`Removed "${itemVal}"`);
  };

  const handleCopyItem = (val: string, idx: number) => {
    navigator.clipboard.writeText(val);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1800);
    showNotification(`Copied "${val}" to clipboard`);
  };

  const handleStartEdit = (idx: number, val: string) => {
    setEditingIndex(idx);
    setEditingValue(val);
  };

  const handleSaveEdit = (idx: number) => {
    const trimmed = editingValue.trim();
    if (!trimmed) return;

    const listKey = getActiveListKey();
    const currentList = [...localOptions[listKey]];
    const oldVal = currentList[idx];

    if (trimmed !== oldVal && currentList.includes(trimmed)) {
      alert(`"${trimmed}" already exists in this list.`);
      return;
    }

    currentList[idx] = trimmed;
    const updatedOptions = { ...localOptions, [listKey]: currentList };
    setLocalOptions(updatedOptions);
    onSaveOptions(updatedOptions);
    setEditingIndex(null);
    showNotification(`Updated option to "${trimmed}"`);
  };

  const handleCopyCategoryAll = () => {
    const listKey = getActiveListKey();
    const currentList = localOptions[listKey];
    navigator.clipboard.writeText(currentList.join('\n'));
    setCopiedCategory(true);
    setTimeout(() => setCopiedCategory(false), 2000);
    showNotification(`Copied all ${currentList.length} values to clipboard`);
  };

  const handleBulkAddAndSave = () => {
    const raw = bulkInput.trim();
    if (!raw) return;

    const items = raw
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (items.length === 0) return;

    const listKey = getActiveListKey();
    const currentList = localOptions[listKey];
    const newItems = items.filter(item => !currentList.includes(item));

    if (newItems.length === 0) {
      alert('All pasted items already exist in this dropdown category.');
      return;
    }

    const updatedList = [...currentList, ...newItems];
    const updatedOptions = { ...localOptions, [listKey]: updatedList };
    setLocalOptions(updatedOptions);
    onSaveOptions(updatedOptions);
    setBulkInput('');
    setIsBulkMode(false);
    showNotification(`Added & saved ${newItems.length} new dropdown options!`);
  };

  const handleCopyAllConfigJson = () => {
    navigator.clipboard.writeText(JSON.stringify(localOptions, null, 2));
    setCopiedAllJson(true);
    setTimeout(() => setCopiedAllJson(false), 2000);
    showNotification('Copied all dropdown configurations as JSON');
  };

  const handleResetCategory = () => {
    if (!window.confirm(`Reset ${activeTab.toUpperCase()} dropdown options back to factory defaults?`)) return;

    const listKey = getActiveListKey();
    const defaultList = DEFAULT_BOM_DROPDOWN_OPTIONS[listKey];

    const updatedOptions = { ...localOptions, [listKey]: defaultList };
    setLocalOptions(updatedOptions);
    onSaveOptions(updatedOptions);
    showNotification(`Reset ${activeTab} to factory defaults`);
  };

  const handleResetAllToDefaults = () => {
    if (!window.confirm('Reset ALL BOM dropdown categories to factory defaults?')) return;
    setLocalOptions(DEFAULT_BOM_DROPDOWN_OPTIONS);
    onSaveOptions(DEFAULT_BOM_DROPDOWN_OPTIONS);
    showNotification('All dropdown options restored to factory defaults');
  };

  const tabs = [
    { id: 'inverters' as TabType, label: 'Inverter Brands', icon: Zap, count: localOptions.inverterBrands.length },
    { id: 'phases' as TabType, label: 'Inverter Phases', icon: Sliders, count: localOptions.inverterPhases.length },
    { id: 'grids' as TabType, label: 'Structure Grids (3x5...)', icon: Maximize2, count: localOptions.structureGrids.length },
    { id: 'heights' as TabType, label: 'Structure Heights', icon: ArrowUpRight, count: localOptions.structureHeights.length },
    { id: 'structures' as TabType, label: 'Structure Types', icon: Layers, count: localOptions.structureTypes.length },
    { id: 'panels' as TabType, label: 'Solar Panel Brands', icon: Sun, count: localOptions.panelBrands.length },
    { id: 'cables' as TabType, label: 'Cables & Protection', icon: ShieldCheck, count: localOptions.cableBrands.length },
  ];

  const currentList = localOptions[getActiveListKey()];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-700 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-900/60 text-teal-400 rounded-xl border border-teal-700/50">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white tracking-tight flex items-center gap-2">
                <span>Manage BOM & Equipment Dropdown Values</span>
                <span className="text-[10px] bg-teal-950 text-teal-400 px-2 py-0.5 rounded-full border border-teal-800 font-bold">
                  Copy & Save Enabled
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Copy, save, edit, and bulk add custom inverter models, structure grids, heights, panel makes & cables
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-all"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Container */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Category Sidebar Tabs */}
          <div className="w-64 bg-slate-950/60 border-r border-slate-800 p-3 space-y-1 overflow-y-auto">
            <div className="text-[10px] font-extrabold uppercase text-slate-500 px-2 py-1 tracking-wider">
              BOM Categories
            </div>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setNewItemInput('');
                    setEditingIndex(null);
                    setIsBulkMode(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all ${
                    isActive 
                      ? 'bg-teal-700 text-white shadow-sm border border-teal-500' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{tab.label}</span>
                  </div>
                  <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-teal-900 text-amber-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Category Options Panel */}
          <div className="flex-1 p-5 flex flex-col justify-between overflow-hidden bg-slate-900">
            
            <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
              
              {/* Category Action Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                <div>
                  <h4 className="text-sm font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <span>{tabs.find(t => t.id === activeTab)?.label}</span>
                    <span className="text-[11px] text-slate-400 lowercase font-normal">
                      ({currentList.length} options)
                    </span>
                  </h4>
                  <span className="text-xs text-slate-400">
                    Copy values to clipboard or add & save new options
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Copy All Category Values */}
                  <button
                    onClick={handleCopyCategoryAll}
                    className="px-2.5 py-1 text-xs font-bold text-teal-300 hover:text-white bg-teal-950/60 hover:bg-teal-900 border border-teal-700/60 rounded-lg flex items-center gap-1.5 transition-all shadow-xs"
                    title="Copy all values of this category to clipboard"
                  >
                    {copiedCategory ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied All!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-teal-400" />
                        <span>Copy All Values</span>
                      </>
                    )}
                  </button>

                  {/* Toggle Bulk Paste Mode */}
                  <button
                    onClick={() => setIsBulkMode(!isBulkMode)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 border transition-all ${
                      isBulkMode
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold'
                        : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                    }`}
                    title="Bulk paste multiple values and save at once"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>{isBulkMode ? 'Single Add' : 'Bulk Paste'}</span>
                  </button>

                  {/* Reset Category */}
                  <button
                    onClick={handleResetCategory}
                    className="px-2 py-1 text-xs font-bold text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg flex items-center gap-1 border border-slate-700 transition-all"
                    title="Reset this category to default list"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                </div>
              </div>

              {/* Add New Item Form OR Bulk Paste Area */}
              {isBulkMode ? (
                <div className="bg-slate-950 p-3 rounded-xl border border-amber-500/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-amber-300 flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5" />
                      Bulk Paste Multiple Values to Save:
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      One per line or comma-separated
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    placeholder={`e.g.\nWaaree 550W Bifacial\nVikram Solar 580W\nPremier 550W TOPCon`}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsBulkMode(false)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkAddAndSave}
                      disabled={!bulkInput.trim()}
                      className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save All Values</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAddItem} className="flex gap-2">
                  <input
                    type="text"
                    value={newItemInput}
                    onChange={(e) => setNewItemInput(e.target.value)}
                    placeholder={`+ Add & save new ${tabs.find(t => t.id === activeTab)?.label.toLowerCase()} (e.g. 3x6 Table / Deye 12kW)...`}
                    className="flex-1 px-3.5 py-2 text-xs font-bold bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  <button
                    type="submit"
                    disabled={!newItemInput.trim()}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Save Option</span>
                  </button>
                </form>
              )}

              {/* Notification Toast */}
              {successMsg && (
                <div className="bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold animate-fade-in shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Current List Items Scroll Container */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[380px]">
                {currentList.map((item, idx) => {
                  const isEditing = editingIndex === idx;
                  const isCopied = copiedIndex === idx;

                  return (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-between text-xs font-bold text-slate-200 transition-all group"
                    >
                      {isEditing ? (
                        <div className="flex-1 flex items-center gap-2 mr-2">
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(idx);
                              if (e.key === 'Escape') setEditingIndex(null);
                            }}
                            autoFocus
                            className="flex-1 px-2.5 py-1 text-xs bg-slate-900 border border-teal-500 rounded-lg text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(idx)}
                            className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/60 rounded-md"
                            title="Save edited value"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingIndex(null)}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md"
                            title="Cancel edit"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 truncate pr-2 flex-1">
                          <span className="text-[10px] font-mono text-slate-500 w-6">#{idx + 1}</span>
                          <span className="truncate text-white select-all">{item}</span>
                        </div>
                      )}

                      {!isEditing && (
                        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                          {/* Copy Item Button */}
                          <button
                            type="button"
                            onClick={() => handleCopyItem(item, idx)}
                            className={`px-2 py-1 text-[11px] rounded-lg transition-all flex items-center gap-1 ${
                              isCopied 
                                ? 'bg-emerald-900/80 text-emerald-300 font-extrabold border border-emerald-600' 
                                : 'text-slate-400 hover:text-teal-300 hover:bg-slate-700/80'
                            }`}
                            title="Copy this dropdown value to clipboard"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Copy</span>
                              </>
                            )}
                          </button>

                          {/* Edit Item Button */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(idx, item)}
                            className="p-1 text-slate-400 hover:text-amber-300 hover:bg-slate-700/80 rounded-lg transition-all"
                            title="Edit / Rename option"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Item Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(idx)}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition-all"
                            title="Remove option"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="pt-4 mt-2 border-t border-slate-800 flex items-center justify-between text-xs flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetAllToDefaults}
                  className="text-slate-500 hover:text-slate-300 underline font-bold"
                >
                  Factory Defaults
                </button>
                <span className="text-slate-700">•</span>
                <button
                  type="button"
                  onClick={handleCopyAllConfigJson}
                  className="text-slate-400 hover:text-teal-300 flex items-center gap-1 font-bold"
                  title="Copy full dropdown configuration JSON for backup"
                >
                  {copiedAllJson ? (
                    <span className="text-emerald-400 font-bold">✓ Copied JSON!</span>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5 text-teal-400" />
                      <span>Copy All JSON</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSaveOptions(localOptions);
                    showNotification('✓ All dropdown values saved successfully!');
                    setTimeout(() => onClose(), 400);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl transition-all shadow-md flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save & Apply Changes</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl transition-all border border-slate-700"
                >
                  Close
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

