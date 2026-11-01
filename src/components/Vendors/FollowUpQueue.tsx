import React from 'react';
import { 
  CalendarClock, Phone, MessageSquare, AlertTriangle, User, Zap, Calendar, Network
} from 'lucide-react';
import { VendorItem } from '../../types/vendorCRM';
import { formatPhoneDisplay, getTelLink, getWhatsAppLink, getStageBadgeClass, getStageLabel, getCallOutcomeBadge } from '../../lib/vendorContactsService';

interface FollowUpQueueProps {
  vendors: VendorItem[];
  onSelectVendor: (vendor: VendorItem) => void;
  onQuickCall: (vendor: VendorItem) => void;
}

export const FollowUpQueue: React.FC<FollowUpQueueProps> = ({
  vendors,
  onSelectVendor,
  onQuickCall
}) => {
  const today = new Date().toISOString().slice(0, 10);

  const vendorsWithFollowUp = vendors.filter(v => Boolean(v.nextFollowUpDate));
  const overdue = vendorsWithFollowUp.filter(v => v.nextFollowUpDate! < today);
  const dueToday = vendorsWithFollowUp.filter(v => v.nextFollowUpDate! === today);
  const upcoming = vendorsWithFollowUp.filter(v => v.nextFollowUpDate! > today);

  const renderCard = (vendor: VendorItem, isOverdue: boolean = false) => {
    const outcomeBadge = getCallOutcomeBadge(vendor.lastCallOutcome);

    return (
      <div 
        key={vendor.uniqueKey}
        className={`bg-white rounded-2xl p-4 border transition-all shadow-2xs hover:shadow-md space-y-3 ${
          isOverdue ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStageBadgeClass(vendor.pipelineStage)}`}>
              {getStageLabel(vendor.pipelineStage)}
            </span>
            <h4 
              onClick={() => onSelectVendor(vendor)}
              className="text-sm font-bold text-slate-900 hover:text-teal-700 cursor-pointer pt-1 leading-tight line-clamp-1"
            >
              {vendor.vendorName}
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>{vendor.contactPersonName || 'Authorized Vendor'}</span>
            </div>
          </div>

          <div className="text-right">
            <span className={`text-xs font-black px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
              isOverdue ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}>
              <Calendar className="w-3 h-3" />
              {vendor.nextFollowUpDate}
            </span>
          </div>
        </div>

        {/* Notes preview */}
        {vendor.notes && vendor.notes.length > 0 && (
          <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 line-clamp-2">
            "{vendor.notes[0].content}"
          </p>
        )}

        {/* Action Call Bar */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <span className="font-mono text-xs font-bold text-slate-800">
            {formatPhoneDisplay(vendor.contactPersonMobile)}
          </span>

          <div className="flex items-center gap-1.5">
            {vendor.contactPersonMobile && (
              <>
                <a
                  href={getTelLink(vendor.contactPersonMobile)}
                  onClick={() => onQuickCall(vendor)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  <Phone className="w-3 h-3" />
                  <span>Call</span>
                </a>

                <a
                  href={getWhatsAppLink(vendor.contactPersonMobile, vendor.vendorName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>WhatsApp</span>
                </a>
              </>
            )}

            <button
              type="button"
              onClick={() => onSelectVendor(vendor)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
            >
              Log
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-transparent p-4 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Follow-up Call Center</h2>
            <p className="text-xs text-slate-500">Scheduled callbacks & pending solar quotation discussions</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-200">
            {overdue.length} Overdue
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
            {dueToday.length} Due Today
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
            {upcoming.length} Upcoming
          </span>
        </div>
      </div>

      {/* OVERDUE */}
      {overdue.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-rose-700 tracking-wider">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Overdue Follow-ups ({overdue.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {overdue.map(v => renderCard(v, true))}
          </div>
        </div>
      )}

      {/* DUE TODAY */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-amber-700 tracking-wider">
          <Calendar className="w-4 h-4 text-amber-600" />
          <span>Due Today ({dueToday.length})</span>
        </div>

        {dueToday.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-400">
            No follow-ups due today. Great work!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dueToday.map(v => renderCard(v, false))}
          </div>
        )}
      </div>

      {/* UPCOMING */}
      {upcoming.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-slate-600 tracking-wider">
            <span>Upcoming Scheduled Calls ({upcoming.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcoming.map(v => renderCard(v, false))}
          </div>
        </div>
      )}

    </div>
  );
};
