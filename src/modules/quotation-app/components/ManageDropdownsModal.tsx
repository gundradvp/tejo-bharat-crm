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
  ArrowUpRight 
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
    showNotification(`Added "${val}" to ${activeTab} list`);
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
    showNotification(`Removed "${itemVal}"`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sliders className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="font-extrabold text-base text-white tracking-tight">
                Manage BOM & Equipment Dropdown Values
              </h3>
              <p className="text-xs text-slate-400">
                Add custom inverter models, structure grids (3x5/etc.), heights, panel makes & cabling options
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-all"
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
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-extrabold text-amber-400 uppercase tracking-wider">
                    {tabs.find(t => t.id === activeTab)?.label}
                  </h4>
                  <span className="text-xs text-slate-400">
                    Add new custom items or manage preset dropdown values below
                  </span>
                </div>

                <button
                  onClick={handleResetCategory}
                  className="px-2.5 py-1 text-xs font-bold text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg flex items-center gap-1 border border-slate-700 transition-all"
                  title="Reset this category to default list"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Category</span>
                </button>
              </div>

              {/* Add New Item Form */}
              <form onSubmit={handleAddItem} className="flex gap-2">
                <input
                  type="text"
                  value={newItemInput}
                  onChange={(e) => setNewItemInput(e.target.value)}
                  placeholder={`+ Add new ${tabs.find(t => t.id === activeTab)?.label.toLowerCase()} (e.g. 3x6 Table / Microtek / etc.)`}
                  className="flex-1 px-3.5 py-2 text-xs font-bold bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                <button
                  type="submit"
                  disabled={!newItemInput.trim()}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Option</span>
                </button>
              </form>

              {/* Notification Toast */}
              {successMsg && (
                <div className="bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold animate-fade-in">
                  <Check className="w-4 h-4" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Current List Items Scroll Container */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[380px]">
                {currentList.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-between text-xs font-bold text-slate-200 transition-all group"
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <span className="text-[10px] font-mono text-slate-500 w-5">#{idx + 1}</span>
                      <span className="truncate text-white">{item}</span>
                    </div>

                    <button
                      onClick={() => handleDeleteItem(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition-all opacity-80 group-hover:opacity-100"
                      title="Remove option"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="pt-4 mt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <button
                onClick={handleResetAllToDefaults}
                className="text-slate-500 hover:text-slate-300 underline font-bold"
              >
                Reset All Dropdowns to Factory Defaults
              </button>

              <button
                onClick={onClose}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all border border-slate-700"
              >
                Done / Close
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
