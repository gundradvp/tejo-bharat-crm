import React from 'react';
import { 
  Phone, MessageSquare, Flame, Zap, ArrowRight, ArrowLeft, User, Network
} from 'lucide-react';
import { VendorItem, PipelineStage } from '../../types/vendorCRM';
import { formatPhoneDisplay, getTelLink, getWhatsAppLink } from '../../lib/vendorContactsService';

interface KanbanBoardProps {
  vendors: VendorItem[];
  selectedDistrict: string;
  onSelectVendor: (vendor: VendorItem) => void;
  onUpdateStage: (vendorKey: string, newStage: PipelineStage) => void;
  onOpenSupplyChain?: (vendorName: string) => void;
}

const STAGES: { key: PipelineStage; title: string; color: string; border: string }[] = [
  { key: 'NEW', title: 'New Leads', color: 'bg-slate-100 text-slate-800', border: 'border-slate-300' },
  { key: 'CONTACTED', title: 'Contacted', color: 'bg-blue-100 text-blue-900', border: 'border-blue-300' },
  { key: 'INTERESTED', title: 'Interested 🔥', color: 'bg-emerald-100 text-emerald-900', border: 'border-emerald-400' },
  { key: 'QUOTE_SENT', title: 'Quote Sent', color: 'bg-amber-100 text-amber-900', border: 'border-amber-400' },
  { key: 'FOLLOW_UP', title: 'Follow-up', color: 'bg-purple-100 text-purple-900', border: 'border-purple-300' },
  { key: 'NEGOTIATION', title: 'Negotiation', color: 'bg-indigo-100 text-indigo-900', border: 'border-indigo-300' },
  { key: 'WON', title: 'Deals Won 🎉', color: 'bg-emerald-600 text-white', border: 'border-emerald-700' },
  { key: 'LOST', title: 'Lost / Closed', color: 'bg-rose-100 text-rose-900', border: 'border-rose-300' }
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  vendors,
  selectedDistrict,
  onSelectVendor,
  onUpdateStage,
  onOpenSupplyChain
}) => {
  const filtered = selectedDistrict === 'all'
    ? vendors
    : vendors.filter(v => v.district.toLowerCase() === selectedDistrict.toLowerCase());

  const getNextStage = (current: PipelineStage): PipelineStage | null => {
    const order: PipelineStage[] = ['NEW', 'CONTACTED', 'INTERESTED', 'QUOTE_SENT', 'FOLLOW_UP', 'NEGOTIATION', 'WON'];
    const idx = order.indexOf(current);
    if (idx >= 0 && idx < order.length - 1) return order[idx + 1];
    return null;
  };

  const getPrevStage = (current: PipelineStage): PipelineStage | null => {
    const order: PipelineStage[] = ['NEW', 'CONTACTED', 'INTERESTED', 'QUOTE_SENT', 'FOLLOW_UP', 'NEGOTIATION', 'WON'];
    const idx = order.indexOf(current);
    if (idx > 0) return order[idx - 1];
    return null;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>Scroll horizontally across sales stages. Click vendor cards to log notes or use arrows to move.</span>
      </div>

      <div className="flex space-x-3 overflow-x-auto pb-4 pt-1 items-start min-h-[65vh]">
        {STAGES.map(stage => {
          const stageVendors = filtered.filter(v => v.pipelineStage === stage.key);

          return (
            <div 
              key={stage.key} 
              className="w-72 shrink-0 bg-slate-100/90 rounded-2xl border border-slate-200 flex flex-col max-h-[75vh] shadow-2xs"
            >
              {/* Column Header */}
              <div className={`p-3 rounded-t-2xl border-b flex items-center justify-between font-bold text-xs ${stage.color} ${stage.border}`}>
                <span>{stage.title}</span>
                <span className="bg-white/80 text-slate-800 px-2 py-0.5 rounded-full text-[10px] font-black border border-slate-300/60">
                  {stageVendors.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="p-2 space-y-2.5 overflow-y-auto flex-1">
                {stageVendors.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    No leads here
                  </div>
                ) : (
                  stageVendors.map(vendor => {
                    const nextStage = getNextStage(vendor.pipelineStage);
                    const prevStage = getPrevStage(vendor.pipelineStage);

                    return (
                      <div 
                        key={vendor.uniqueKey}
                        className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs hover:shadow-md transition-all space-y-2 group"
                      >
                        {/* Title & Badges */}
                        <div 
                          onClick={() => onSelectVendor(vendor)}
                          className="cursor-pointer space-y-1"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-teal-700 transition-colors leading-tight line-clamp-2">
                              {vendor.vendorName}
                            </h4>
                            {vendor.priority === 'HOT' && (
                              <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{vendor.contactPersonName || 'Authorized Vendor'}</span>
                          </div>

                          <div className="flex items-center gap-1 flex-wrap text-[10px]">
                            {vendor.nationalCapacityKW !== undefined && vendor.nationalCapacityKW > 0 && (
                              <span className="bg-amber-50 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-200">
                                {vendor.nationalCapacityKW} kW
                              </span>
                            )}
                            {vendor.dcrTracked && (
                              <span className="bg-indigo-50 text-indigo-700 font-semibold px-1.5 py-0.5 rounded border border-indigo-200 flex items-center gap-0.5">
                                <Network className="w-2.5 h-2.5" /> DCR
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Calling & Move Bar */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <div className="flex items-center gap-1">
                            {vendor.contactPersonMobile ? (
                              <>
                                <a
                                  href={getTelLink(vendor.contactPersonMobile)}
                                  className="p-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                  title="Call"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                                <a
                                  href={getWhatsAppLink(vendor.contactPersonMobile, vendor.vendorName)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200"
                                  title="WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </a>
                              </>
                            ) : (
                              <span className="text-[10px] text-slate-400">No Phone</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {prevStage && (
                              <button
                                type="button"
                                onClick={() => onUpdateStage(vendor.uniqueKey, prevStage)}
                                className="p-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                                title={`Move to ${prevStage}`}
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}
                            {nextStage && (
                              <button
                                type="button"
                                onClick={() => onUpdateStage(vendor.uniqueKey, nextStage)}
                                className="p-1 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 font-bold flex items-center gap-0.5 text-[10px]"
                                title={`Advance to ${nextStage}`}
                              >
                                <span>Next</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
