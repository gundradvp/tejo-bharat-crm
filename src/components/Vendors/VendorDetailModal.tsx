import React, { useState } from 'react';
import { 
  X, Phone, MessageSquare, Mail, Copy, Check, Calendar, Clock, 
  MapPin, Zap, Star, ShieldCheck, ChevronRight, ChevronLeft, Flame, 
  PlusCircle, FileText, User, Sparkles, PhoneForwarded, Tag, Network,
  ExternalLink, Building2, TrendingUp, TrendingDown, Factory
} from 'lucide-react';
import { VendorItem, PipelineStage, Priority, CallOutcome } from '../../types/vendorCRM';
import { 
  formatPhoneDisplay, getTelLink, getWhatsAppLink, getEmailLink,
  getStageBadgeClass, getStageLabel, getCallOutcomeBadge 
} from '../../lib/vendorContactsService';
import { FREQUENT_SOLAR_NOTES, SOLAR_PITCH_SCRIPTS } from './SalesPitchDrawer';

interface VendorDetailModalProps {
  vendor: VendorItem | null;
  onClose: () => void;
  onUpdateVendor: (vendorKey: string, updates: Partial<VendorItem>) => void;
  onAddNote: (
    vendorKey: string, 
    noteData: {
      content: string;
      callOutcome?: CallOutcome | string;
      nextFollowUpDate?: string | null;
      stageChange?: PipelineStage;
      priorityChange?: Priority;
      solarRequirement?: VendorItem['solarRequirement'];
    }
  ) => void;
  onOpenSupplyChain?: (vendorName: string) => void;
  onNextVendor?: () => void;
  onPrevVendor?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export const VendorDetailModal: React.FC<VendorDetailModalProps> = ({
  vendor,
  onClose,
  onUpdateVendor,
  onAddNote,
  onOpenSupplyChain,
  onNextVendor,
  onPrevVendor,
  hasNext,
  hasPrev
}) => {
  if (!vendor) return null;

  const [copied, setCopied] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<CallOutcome>('ANSWERED');
  const [noteContent, setNoteContent] = useState('');
  const [followUpDate, setFollowUpDate] = useState(vendor.nextFollowUpDate || '');
  const [targetStage, setTargetStage] = useState<PipelineStage>(vendor.pipelineStage);
  const [targetPriority, setTargetPriority] = useState<Priority>(vendor.priority);
  const [activeTab, setActiveTab] = useState<'notes' | 'pitch' | 'dcr' | 'details'>('notes');

  const [estimatedKW, setEstimatedKW] = useState<number | undefined>(vendor.solarRequirement?.estimatedMonthlyKW);
  const [quotedRate, setQuotedRate] = useState<number | undefined>(vendor.solarRequirement?.quotedPricePerWatt);
  const [preferredType, setPreferredType] = useState<string>(vendor.solarRequirement?.preferredPanelType || 'DCR Mono PERC 550W');

  const handleCopyPhone = () => {
    if (vendor.contactPersonMobile) {
      navigator.clipboard.writeText(vendor.contactPersonMobile);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() && !followUpDate) return;

    onAddNote(vendor.uniqueKey, {
      content: noteContent || 'Logged call & status update',
      callOutcome: selectedOutcome,
      nextFollowUpDate: followUpDate || null,
      stageChange: targetStage,
      priorityChange: targetPriority,
      solarRequirement: {
        estimatedMonthlyKW: estimatedKW,
        quotedPricePerWatt: quotedRate,
        preferredPanelType: preferredType
      }
    });

    setNoteContent('');
  };

  const handleQuickAddNote = (preset: string) => {
    setNoteContent(prev => prev ? `${prev}. ${preset}` : preset);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-4 sm:p-5 flex items-start justify-between border-b border-teal-800">
          <div className="space-y-1 pr-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${getStageBadgeClass(vendor.pipelineStage)}`}>
                {getStageLabel(vendor.pipelineStage)}
              </span>

              {vendor.priority === 'HOT' && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                  <Flame className="w-3 h-3 fill-white" /> HOT LEAD
                </span>
              )}

              <span className="bg-teal-900/80 text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-teal-700">
                {vendor.district}
              </span>

              {vendor.dcrTracked && (
                <span className="bg-indigo-900/90 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-indigo-700 flex items-center gap-1">
                  <Network className="w-3 h-3" /> DCR Supply Chain Verified
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
              {vendor.vendorName}
            </h2>

            <div className="flex items-center gap-3 text-xs text-teal-200/90 pt-0.5">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold text-white">{vendor.contactPersonName || 'Authorized Vendor'}</span>
              </span>

              {vendor.nationalCapacityKW !== undefined && vendor.nationalCapacityKW > 0 && (
                <span className="flex items-center gap-1 text-amber-300">
                  <Zap className="w-3.5 h-3.5" />
                  <span>{vendor.nationalCapacityKW} kW tracked</span>
                </span>
              )}
            </div>
          </div>

          {/* Navigation & Close */}
          <div className="flex items-center gap-1 shrink-0">
            {hasPrev && (
              <button 
                onClick={onPrevVendor}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Previous vendor"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {hasNext && (
              <button 
                onClick={onNextVendor}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Next vendor"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Calling Bar (Sticky Top) */}
        <div className="bg-emerald-50/90 border-b border-emerald-200 px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-black text-slate-900">
              {formatPhoneDisplay(vendor.contactPersonMobile)}
            </span>
            {vendor.contactPersonMobile && (
              <button
                onClick={handleCopyPhone}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-emerald-100 transition-colors"
                title="Copy phone"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {vendor.contactPersonMobile ? (
              <>
                <a
                  href={getTelLink(vendor.contactPersonMobile)}
                  onClick={() => {
                    if (vendor.pipelineStage === 'NEW') {
                      onUpdateVendor(vendor.uniqueKey, { pipelineStage: 'CONTACTED' });
                    }
                  }}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs transition-all shadow-xs"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Direct</span>
                </a>

                <a
                  href={getWhatsAppLink(vendor.contactPersonMobile, vendor.vendorName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs transition-all shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp Pitch</span>
                </a>
              </>
            ) : (
              <span className="text-xs text-rose-500 font-bold">No phone number available</span>
            )}

            {vendor.contactPersonEmail && (
              <a
                href={getEmailLink(vendor.contactPersonEmail, vendor.vendorName)}
                className="p-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
                title="Send Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            )}

            {vendor.dcrTracked && onOpenSupplyChain && (
              <button
                type="button"
                onClick={() => onOpenSupplyChain(vendor.vendorName)}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold rounded-xl text-xs transition-all"
                title="Open verified DCR supply chain tree"
              >
                <Network className="w-3.5 h-3.5" />
                <span>Supply Chain</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center border-b border-slate-200 px-4 bg-slate-50 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('notes')}
            className={`py-2.5 px-3 border-b-2 transition-all ${
              activeTab === 'notes' ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Log Call & Notes ({vendor.notes?.length || 0})
          </button>

          {vendor.dcrTracked && (
            <button
              onClick={() => setActiveTab('dcr')}
              className={`py-2.5 px-3 border-b-2 transition-all flex items-center gap-1 ${
                activeTab === 'dcr' ? 'border-indigo-600 text-indigo-800' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Network className="w-3.5 h-3.5 text-indigo-600" />
              <span>DCR Supply Chain</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('pitch')}
            className={`py-2.5 px-3 border-b-2 transition-all flex items-center gap-1 ${
              activeTab === 'pitch' ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Sales Pitch Helper</span>
          </button>

          <button
            onClick={() => setActiveTab('details')}
            className={`py-2.5 px-3 border-b-2 transition-all ${
              activeTab === 'details' ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Full Profile & Address
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* TAB 1: NOTES & CALL LOGGING */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              
              {/* Add Note Form */}
              <form onSubmit={handleSaveNote} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <PhoneForwarded className="w-4 h-4 text-teal-600" />
                    Log Call Outcome & Follow-up
                  </span>

                  {/* Outcome Selector */}
                  <select
                    value={selectedOutcome}
                    onChange={(e) => setSelectedOutcome(e.target.value as CallOutcome)}
                    className="text-xs font-bold rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="ANSWERED">Answered / Pitched</option>
                    <option value="BUSY">Line Busy</option>
                    <option value="NO_ANSWER">No Answer</option>
                    <option value="SWITCHED_OFF">Switched Off</option>
                    <option value="CALLBACK_REQUESTED">Callback Requested</option>
                    <option value="WRONG_NUMBER">Wrong Number</option>
                  </select>
                </div>

                {/* Quick Preset Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {FREQUENT_SOLAR_NOTES.slice(0, 5).map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuickAddNote(preset)}
                      className="text-[11px] bg-white hover:bg-teal-50 hover:border-teal-300 text-slate-700 px-2 py-1 rounded-lg border border-slate-200 transition-colors"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>

                {/* Note Textarea */}
                <textarea
                  rows={2}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Type call notes, dealer requirements, panel brand preferences..."
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                />

                {/* Status + Priority + Follow Up Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Move Stage</label>
                    <select
                      value={targetStage}
                      onChange={(e) => setTargetStage(e.target.value as PipelineStage)}
                      className="w-full text-xs font-bold rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-800"
                    >
                      <option value="NEW">New Lead</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="INTERESTED">Interested 🔥</option>
                      <option value="QUOTE_SENT">Quote Sent</option>
                      <option value="FOLLOW_UP">Follow-up</option>
                      <option value="NEGOTIATION">Negotiation</option>
                      <option value="WON">Won 🎉</option>
                      <option value="LOST">Lost</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Priority</label>
                    <select
                      value={targetPriority}
                      onChange={(e) => setTargetPriority(e.target.value as Priority)}
                      className="w-full text-xs font-bold rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-800"
                    >
                      <option value="NORMAL">Normal</option>
                      <option value="HOT">Hot 🔥</option>
                      <option value="WARM">Warm</option>
                      <option value="COLD">Cold</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Follow-up Date</label>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full text-xs font-bold rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-800"
                    />
                  </div>
                </div>

                {/* Solar Requirement Row */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Est. Volume (kW)</label>
                    <input
                      type="number"
                      placeholder="e.g. 10"
                      value={estimatedKW || ''}
                      onChange={(e) => setEstimatedKW(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full text-xs rounded-lg border border-slate-300 px-2 py-1 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Quoted (₹/Wp)</label>
                    <input
                      type="number"
                      step="0.05"
                      placeholder="e.g. 21.50"
                      value={quotedRate || ''}
                      onChange={(e) => setQuotedRate(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full text-xs rounded-lg border border-slate-300 px-2 py-1 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Preferred Module</label>
                    <select
                      value={preferredType}
                      onChange={(e) => setPreferredType(e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-300 px-1 py-1 bg-white font-medium"
                    >
                      <option value="DCR Mono PERC 550W">DCR Mono PERC 550W</option>
                      <option value="TOPCon 550W+ Bifacial">TOPCon 550W+ Bifacial</option>
                      <option value="Non-DCR 550W">Non-DCR 550W</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition-all shadow-xs"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Save Note & Update</span>
                  </button>
                </div>
              </form>

              {/* Call History Timeline */}
              <div className="space-y-2">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  Call & Note History ({vendor.notes?.length || 0})
                </span>

                {(!vendor.notes || vendor.notes.length === 0) ? (
                  <div className="bg-slate-50 rounded-xl p-4 text-center text-xs text-slate-400 border border-slate-200">
                    No notes recorded yet. Log your first call above!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {vendor.notes.map((note) => {
                      const outcomeBadge = getCallOutcomeBadge(note.callOutcome);
                      return (
                        <div key={note.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full font-bold border ${outcomeBadge.className}`}>
                                {outcomeBadge.text}
                              </span>
                              <span className="font-semibold text-slate-600">by {note.author || 'Durga'}</span>
                            </div>
                            <span className="text-slate-400 font-mono">
                              {new Date(note.createdAt).toLocaleString('en-IN', {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </div>

                          <p className="text-xs text-slate-800 leading-relaxed pt-0.5">{note.content}</p>

                          {note.nextFollowUpDate && (
                            <div className="flex items-center gap-1 text-[11px] text-amber-700 font-bold pt-1">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Follow-up scheduled: {note.nextFollowUpDate}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: DCR SUPPLY CHAIN INTELLIGENCE */}
          {activeTab === 'dcr' && vendor.dcrTracked && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Network className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-bold text-gray-900">DCR Supply Chain Intelligence</h3>
                  </div>
                  {onOpenSupplyChain && (
                    <button
                      type="button"
                      onClick={() => onOpenSupplyChain(vendor.vendorName)}
                      className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-2xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Full Supply Chain Graph</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                    <span className="text-[10px] text-emerald-700 uppercase font-bold flex items-center justify-center gap-1">
                      <TrendingDown className="w-3 h-3" /> Inbound Purchased
                    </span>
                    <span className="text-xl font-black text-emerald-900 block mt-1">
                      {vendor.dcrInboundPanels || 0} <span className="text-xs font-normal">panels</span>
                    </span>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                    <span className="text-[10px] text-blue-700 uppercase font-bold flex items-center justify-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Outbound Sold / Installed
                    </span>
                    <span className="text-xl font-black text-blue-900 block mt-1">
                      {vendor.dcrOutboundPanels || 0} <span className="text-xs font-normal">panels</span>
                    </span>
                  </div>
                </div>

                {vendor.dcrManufacturers && vendor.dcrManufacturers.length > 0 && (
                  <div className="pt-2">
                    <span className="text-xs font-semibold text-gray-600 block mb-1">Manufacturers / Brands Handled:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {vendor.dcrManufacturers.map((m, idx) => (
                        <span key={idx} className="bg-white border border-gray-200 px-2 py-0.5 rounded-md text-xs font-medium text-gray-800">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {vendor.dcrSuppliers && vendor.dcrSuppliers.length > 0 && (
                  <div className="pt-2">
                    <span className="text-xs font-semibold text-gray-600 block mb-1">Purchasing From (Suppliers):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {vendor.dcrSuppliers.map((s, idx) => (
                        <span key={idx} className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-xs font-medium text-emerald-900">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {vendor.dcrBuyers && vendor.dcrBuyers.length > 0 && (
                  <div className="pt-2">
                    <span className="text-xs font-semibold text-gray-600 block mb-1">Supplying To (Buyers / Resellers):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {vendor.dcrBuyers.map((b, idx) => (
                        <span key={idx} className="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md text-xs font-medium text-blue-900">
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PITCH HELPER */}
          {activeTab === 'pitch' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 block">
                Copy ready-made sales pitch while on the call with {vendor.contactPersonName || vendor.vendorName}:
              </span>

              {SOLAR_PITCH_SCRIPTS.slice(0, 3).map((script) => (
                <div key={script.id} className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        script.language === 'Telugu' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {script.language}
                      </span>
                      {script.title}
                    </span>

                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(script.content)}
                      className="text-[11px] bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold px-2 py-1 rounded-md"
                    >
                      Copy Script
                    </button>
                  </div>

                  <p className="whitespace-pre-wrap text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-sans">
                    {script.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: FULL DETAILS & ADDRESS */}
          {activeTab === 'details' && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Vendor ID</span>
                  <span className="font-mono font-bold text-slate-800">{vendor.vendorId}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">District</span>
                  <span className="font-bold text-slate-800">{vendor.district}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Contact Person</span>
                  <span className="font-bold text-slate-800">{vendor.contactPersonName || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Phone Number</span>
                  <span className="font-mono font-bold text-slate-800">{vendor.contactPersonMobile || 'None'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Email</span>
                  <span className="font-mono text-slate-700">{vendor.contactPersonEmail || 'None'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">National Tracked Installs</span>
                  <span className="font-bold text-slate-800">{vendor.nationalInstallations || 0} sites ({vendor.nationalCapacityKW || 0} kW)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Registered Address</span>
                <p className="text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200 leading-relaxed">
                  {vendor.address || 'Address not listed in portal registry.'}
                </p>
              </div>

              {vendor.brands && vendor.brands.length > 0 && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Associated Brands</span>
                  <div className="flex flex-wrap gap-1">
                    {vendor.brands.map((b, idx) => (
                      <span key={idx} className="bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 px-5 flex items-center justify-between text-xs text-slate-500">
          <span>Unique Key: <code className="font-mono text-[11px] text-slate-700">{vendor.uniqueKey}</code></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
