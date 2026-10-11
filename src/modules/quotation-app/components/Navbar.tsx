import React from 'react';
import { Sun, FileText, PlusCircle, ListFilter, Building2, ExternalLink } from 'lucide-react';

interface NavbarProps {
  activeTab: 'create' | 'list';
  setActiveTab: (tab: 'create' | 'list') => void;
  onOpenBranchModal: () => void;
  onNewQuotation: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenBranchModal,
  onNewQuotation
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-xl no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border-2 border-amber-400 p-1 shadow-md">
            <img 
              src="file:///Users/durgajo/Desktop/Tejo%20Bharat/logo.png" 
              alt="Tejo Bharat"
              className="w-full h-full object-contain"
              onError={(e) => {
                // Fallback icon if logo image not accessible
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <Sun className="w-6 h-6 text-amber-500 hidden" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-amber-400 leading-none tracking-wide">
              TEJO BHARAT
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Solar Quotation & Billing Engine</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('create');
              onNewQuotation();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'create'
                ? 'bg-teal-700 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-teal-300" />
            <span>New Quotation</span>
          </button>

          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'list'
                ? 'bg-teal-700 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <ListFilter className="w-4 h-4 text-teal-300" />
            <span>Quotations History</span>
          </button>

          <button
            onClick={onOpenBranchModal}
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 transition-all border border-slate-700 ml-2"
            title="Manage Branch Offices & GST details"
          >
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>Branches & GST</span>
          </button>
        </div>

      </div>
    </header>
  );
};
