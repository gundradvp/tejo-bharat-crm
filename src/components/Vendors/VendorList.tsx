import React, { useState, useMemo } from 'react';
import { 
  Phone, MessageSquare, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, 
  MapPin, Zap, Flame, Star, ExternalLink, Calendar, LayoutGrid, Table as TableIcon,
  RotateCcw, Mail, Network, User, Check
} from 'lucide-react';
import { VendorItem, PipelineStage, Priority } from '../../types/vendorCRM';
import { 
  formatPhoneDisplay, getTelLink, getWhatsAppLink, getStageBadgeClass, 
  getStageLabel, getCallOutcomeBadge 
} from '../../lib/vendorContactsService';

interface VendorListProps {
  vendors: VendorItem[];
  selectedDistrict: string;
  onSelectVendor: (vendor: VendorItem) => void;
  onQuickCall: (vendor: VendorItem) => void;
  onUpdateStage: (vendorKey: string, newStage: PipelineStage) => void;
  onOpenSupplyChain?: (vendorName: string) => void;
}

export type SortOption = 
  | 'capacity-desc' 
  | 'capacity-asc' 
  | 'name' 
  | 'lastContacted' 
  | 'priority';

export const VendorList: React.FC<VendorListProps> = ({
  vendors,
  selectedDistrict,
  onSelectVendor,
  onQuickCall,
  onUpdateStage,
  onOpenSupplyChain
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [callStatusFilter, setCallStatusFilter] = useState<string>('all');
  const [dcrFilter, setDcrFilter] = useState<'all' | 'dcr-only' | 'not-dcr'>('all');
  const [minCapacity, setMinCapacity] = useState<number>(0);
  const [onlyFollowUps, setOnlyFollowUps] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [sortBy, setSortBy] = useState<SortOption>('capacity-desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 50;

  const today = new Date().toISOString().slice(0, 10);

  // Filtered and Sorted Vendors
  const processedVendors = useMemo(() => {
    let list = selectedDistrict === 'all'
      ? vendors
      : vendors.filter(v => v.district.toLowerCase() === selectedDistrict.toLowerCase());

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(v => 
        v.vendorName.toLowerCase().includes(q) ||
        (v.contactPersonName && v.contactPersonName.toLowerCase().includes(q)) ||
        (v.contactPersonMobile && v.contactPersonMobile.includes(q)) ||
        (v.address && v.address.toLowerCase().includes(q)) ||
        (v.brands && v.brands.some(b => b.toLowerCase().includes(q)))
      );
    }

    // Pipeline Stage
    if (stageFilter !== 'all') {
      list = list.filter(v => v.pipelineStage === stageFilter);
    }

    // Priority
    if (priorityFilter !== 'all') {
      list = list.filter(v => v.priority === priorityFilter);
    }

    // Call status
    if (callStatusFilter !== 'all') {
      if (callStatusFilter === 'CALLED') {
        list = list.filter(v => Boolean(v.lastCallOutcome));
      } else if (callStatusFilter === 'NOT_CALLED') {
        list = list.filter(v => !v.lastCallOutcome);
      } else {
        list = list.filter(v => v.lastCallOutcome === callStatusFilter);
      }
    }

    // DCR Filter
    if (dcrFilter === 'dcr-only') {
      list = list.filter(v => v.dcrTracked);
    } else if (dcrFilter === 'not-dcr') {
      list = list.filter(v => !v.dcrTracked);
    }

    // Min capacity
    if (minCapacity > 0) {
      list = list.filter(v => (v.nationalCapacityKW || 0) >= minCapacity);
    }

    // Follow-ups due
    if (onlyFollowUps) {
      list = list.filter(v => v.nextFollowUpDate === today);
    }

    // Sorting
    list = [...list].sort((a, b) => {
      if (sortBy === 'capacity-desc') {
        return (b.nationalCapacityKW || 0) - (a.nationalCapacityKW || 0);
      }
      if (sortBy === 'capacity-asc') {
        return (a.nationalCapacityKW || 0) - (b.nationalCapacityKW || 0);
      }
      if (sortBy === 'name') {
        return a.vendorName.localeCompare(b.vendorName);
      }
      if (sortBy === 'lastContacted') {
        return (b.lastContactedAt || '').localeCompare(a.lastContactedAt || '');
      }
      if (sortBy === 'priority') {
        const order: Record<string, number> = { HOT: 3, WARM: 2, NORMAL: 1, COLD: 0 };
        return (order[b.priority] || 0) - (order[a.priority] || 0);
      }
      return 0;
    });

    return list;
  }, [
    vendors,
    selectedDistrict,
    searchQuery,
    stageFilter,
    priorityFilter,
    callStatusFilter,
    dcrFilter,
    minCapacity,
    onlyFollowUps,
    sortBy,
    today
  ]);

  // Pagination slice
  const totalPages = Math.ceil(processedVendors.length / pageSize) || 1;
  const paginatedVendors = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedVendors.slice(start, start + pageSize);
  }, [processedVendors, currentPage, pageSize]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setStageFilter('all');
    setPriorityFilter('all');
    setCallStatusFilter('all');
    setDcrFilter('all');
    setMinCapacity(0);
    setOnlyFollowUps(false);
    setSortBy('capacity-desc');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      
      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
        
        {/* Top Search Input */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search vendor name, contact person, mobile number, address, or brands..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium text-slate-800"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-end sm:self-auto shrink-0">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === 'cards' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === 'table' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          
          {/* Stage Filter */}
          <div>
            <select
              value={stageFilter}
              onChange={(e) => { setStageFilter(e.target.value); setCurrentPage(1); }}
              className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-700"
            >
              <option value="all">All Stages</option>
              <option value="NEW">New Leads</option>
              <option value="CONTACTED">Contacted</option>
              <option value="INTERESTED">Interested 🔥</option>
              <option value="QUOTE_SENT">Quote Sent</option>
              <option value="FOLLOW_UP">Follow-up</option>
              <option value="NEGOTIATION">Negotiation</option>
              <option value="WON">Deals Won 🎉</option>
              <option value="LOST">Lost</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
              className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-700"
            >
              <option value="all">All Priorities</option>
              <option value="HOT">Hot Leads 🔥</option>
              <option value="WARM">Warm</option>
              <option value="NORMAL">Normal</option>
              <option value="COLD">Cold</option>
            </select>
          </div>

          {/* Call Status */}
          <div>
            <select
              value={callStatusFilter}
              onChange={(e) => { setCallStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-700"
            >
              <option value="all">All Call Status</option>
              <option value="ANSWERED">Answered</option>
              <option value="BUSY">Line Busy</option>
              <option value="NO_ANSWER">No Answer</option>
              <option value="CALLBACK_REQUESTED">Callback</option>
              <option value="NOT_CALLED">Not Called Yet</option>
              <option value="CALLED">Already Called</option>
            </select>
          </div>

          {/* DCR Intelligence Filter */}
          <div>
            <select
              value={dcrFilter}
              onChange={(e) => { setDcrFilter(e.target.value as any); setCurrentPage(1); }}
              className="w-full text-xs font-bold rounded-xl border border-indigo-200 bg-indigo-50/50 px-2.5 py-2 text-indigo-900"
            >
              <option value="all">DCR: All Vendors</option>
              <option value="dcr-only">DCR Verified Only</option>
              <option value="not-dcr">Not in DCR Chain</option>
            </select>
          </div>

          {/* Sorting */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-700"
            >
              <option value="capacity-desc">Capacity: High to Low</option>
              <option value="capacity-asc">Capacity: Low to High</option>
              <option value="name">Name (A-Z)</option>
              <option value="lastContacted">Recently Called</option>
              <option value="priority">Priority</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          <div>
            <button
              onClick={handleResetFilters}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

        </div>

        {/* Quick summary counts */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong>{processedVendors.length.toLocaleString('en-IN')}</strong> matching vendors
            {selectedDistrict !== 'all' && ` in ${selectedDistrict}`}
          </span>
          <span className="font-mono text-[11px]">
            Page {currentPage} of {totalPages}
          </span>
        </div>

      </div>

      {/* CARD VIEW */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {paginatedVendors.map((vendor) => {
            const outcomeBadge = getCallOutcomeBadge(vendor.lastCallOutcome);

            return (
              <div 
                key={vendor.uniqueKey}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-all space-y-3 flex flex-col justify-between group"
              >
                <div className="space-y-2">
                  
                  {/* Top Badges */}
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStageBadgeClass(vendor.pipelineStage)}`}>
                        {getStageLabel(vendor.pipelineStage)}
                      </span>

                      {vendor.priority === 'HOT' && (
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <Flame className="w-2.5 h-2.5 fill-rose-500 text-rose-500" /> HOT
                        </span>
                      )}

                      <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                        {vendor.district}
                      </span>
                    </div>

                    {vendor.nationalCapacityKW !== undefined && vendor.nationalCapacityKW > 0 && (
                      <span className="bg-amber-50 text-amber-900 border border-amber-200 text-xs font-black px-2 py-0.5 rounded-lg shrink-0">
                        {vendor.nationalCapacityKW} kW
                      </span>
                    )}
                  </div>

                  {/* Vendor Title */}
                  <h3 
                    onClick={() => onSelectVendor(vendor)}
                    className="text-sm font-black text-slate-900 group-hover:text-teal-700 cursor-pointer transition-colors leading-tight line-clamp-2"
                  >
                    {vendor.vendorName}
                  </h3>

                  {/* Contact Person */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold">{vendor.contactPersonName || 'Authorized Vendor'}</span>
                  </div>

                  {/* Address */}
                  {vendor.address && (
                    <p className="text-[11px] text-slate-500 line-clamp-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{vendor.address}</span>
                    </p>
                  )}

                  {/* DCR Badge if tracked */}
                  {vendor.dcrTracked && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2 flex items-center justify-between text-xs text-indigo-900">
                      <div className="flex items-center gap-1 font-bold">
                        <Network className="w-3.5 h-3.5 text-indigo-600" />
                        <span>DCR: {vendor.dcrInboundPanels || 0} in / {vendor.dcrOutboundPanels || 0} out</span>
                      </div>
                      {onOpenSupplyChain && (
                        <button
                          type="button"
                          onClick={() => onOpenSupplyChain(vendor.vendorName)}
                          className="text-[10px] text-indigo-700 hover:text-indigo-900 font-extrabold underline flex items-center gap-0.5"
                        >
                          <span>Trace</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Last call outcome pill if exists */}
                  {vendor.lastCallOutcome && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className={`px-2 py-0.5 rounded-full font-bold border ${outcomeBadge.className}`}>
                        {outcomeBadge.text}
                      </span>
                      {vendor.nextFollowUpDate && (
                        <span className="text-amber-700 font-semibold flex items-center gap-0.5">
                          <Calendar className="w-3 h-3" /> {vendor.nextFollowUpDate}
                        </span>
                      )}
                    </div>
                  )}

                </div>

                {/* Bottom Action Calling Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-1.5">
                  <span className="font-mono text-xs font-bold text-slate-800 truncate">
                    {formatPhoneDisplay(vendor.contactPersonMobile)}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {vendor.contactPersonMobile ? (
                      <>
                        <a
                          href={getTelLink(vendor.contactPersonMobile)}
                          onClick={() => onQuickCall(vendor)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs transition-all shadow-2xs"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </a>

                        <a
                          href={getWhatsAppLink(vendor.contactPersonMobile, vendor.vendorName)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-extrabold text-xs transition-all shadow-2xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400">No Phone</span>
                    )}

                    <button
                      type="button"
                      onClick={() => onSelectVendor(vendor)}
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                      title="Open Profile & Log Call"
                    >
                      Log
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-black tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Vendor & District</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Mobile & Quick Dial</th>
                  <th className="py-3 px-4">Tracked Capacity</th>
                  <th className="py-3 px-4">DCR Supply Chain</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedVendors.map((vendor) => (
                  <tr key={vendor.uniqueKey} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Name */}
                    <td className="py-3 px-4 font-bold text-slate-900 max-w-xs">
                      <div 
                        onClick={() => onSelectVendor(vendor)}
                        className="cursor-pointer hover:text-teal-700 transition-colors"
                      >
                        <div className="leading-tight">{vendor.vendorName}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{vendor.district}</div>
                      </div>
                    </td>

                    {/* Contact Person */}
                    <td className="py-3 px-4 text-slate-700 font-semibold">
                      {vendor.contactPersonName || 'Authorized Vendor'}
                    </td>

                    {/* Mobile & Call */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span>{formatPhoneDisplay(vendor.contactPersonMobile)}</span>
                        {vendor.contactPersonMobile && (
                          <div className="flex items-center gap-1">
                            <a
                              href={getTelLink(vendor.contactPersonMobile)}
                              onClick={() => onQuickCall(vendor)}
                              className="p-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              title="Call"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={getWhatsAppLink(vendor.contactPersonMobile, vendor.vendorName)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded-md bg-teal-50 text-teal-700 hover:bg-teal-100"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Capacity */}
                    <td className="py-3 px-4 font-bold text-amber-800">
                      {vendor.nationalCapacityKW ? `${vendor.nationalCapacityKW} kW` : '-'}
                    </td>

                    {/* DCR Supply Chain */}
                    <td className="py-3 px-4">
                      {vendor.dcrTracked ? (
                        <div className="flex items-center gap-1.5">
                          <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                            <Network className="w-3 h-3" />
                            {vendor.dcrInboundPanels || 0} / {vendor.dcrOutboundPanels || 0}
                          </span>
                          {onOpenSupplyChain && (
                            <button
                              type="button"
                              onClick={() => onOpenSupplyChain(vendor.vendorName)}
                              className="text-indigo-600 hover:text-indigo-800 p-1"
                              title="View DCR Supply Chain"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-[10px]">Unlinked</span>
                      )}
                    </td>

                    {/* Stage */}
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStageBadgeClass(vendor.pipelineStage)}`}>
                        {getStageLabel(vendor.pipelineStage)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectVendor(vendor)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                      >
                        Profile & Notes
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-2xl p-3 px-4 border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500">
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 text-xs font-bold flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev</span>
            </button>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 text-xs font-bold flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
