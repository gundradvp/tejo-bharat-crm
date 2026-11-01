import React, { useState } from 'react';
import { 
  X, Phone, MessageSquare, Copy, Check, Calendar, Zap, User, 
  MapPin, Sparkles, ArrowRight, ChevronRight
} from 'lucide-react';
import { VendorItem, PipelineStage, Priority, CallOutcome } from '../../types/vendorCRM';
import { formatPhoneDisplay, getTelLink, getWhatsAppLink } from '../../lib/vendorContactsService';
import { FREQUENT_SOLAR_NOTES, SOLAR_PITCH_SCRIPTS } from './SalesPitchDrawer';

interface PowerDialerModalProps {
  queue: VendorItem[];
  onClose: () => void;
  onAddNoteAndAdvance: (
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
}

export const PowerDialerModal: React.FC<PowerDialerModalProps> = ({
  queue,
  onClose,
  onAddNoteAndAdvance
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [outcome, setOutcome] = useState<CallOutcome>('ANSWERED');
  const [noteText, setNoteText] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [stage, setStage] = useState<PipelineStage>('CONTACTED');
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [showPitch, setShowPitch] = useState(false);

  const currentVendor = queue[currentIndex];

  if (!currentVendor) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-3xl">
            🎉
          </div>
          <h3 className="text-xl font-black text-slate-900">Calling Queue Complete!</h3>
          <p className="text-xs text-slate-500">
            You called all leads in the prioritized calling queue.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-teal-700 hover:bg-teal-800 text-white font-extrabold py-3 rounded-2xl text-xs transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleAdvance = () => {
    onAddNoteAndAdvance(currentVendor.uniqueKey, {
      content: noteText || `Power Dialer Call: ${outcome}`,
      callOutcome: outcome,
      nextFollowUpDate: followUpDate || null,
      stageChange: stage,
      priorityChange: priority,
    });

    setNoteText('');
    setFollowUpDate('');
    setOutcome('ANSWERED');
    setStage('CONTACTED');
    setPriority('NORMAL');

    setCurrentIndex(prev => prev + 1);
  };

  const handleSkip = () => {
    setCurrentIndex(prev => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-4 flex items-center justify-between border-b border-teal-800">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
              ⚡
            </span>
            <div>
              <h2 className="text-sm font-black">Power Dialer Mode</h2>
              <p className="text-[11px] text-teal-300">
                Lead {currentIndex + 1} of {queue.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPitch(!showPitch)}
              className="text-xs bg-teal-800/80 hover:bg-teal-700 text-teal-200 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{showPitch ? 'Hide Pitch' : 'View Pitch'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Pitch Helper Subdrawer */}
        {showPitch && (
          <div className="bg-teal-50 border-b border-teal-200 p-3 text-xs max-h-40 overflow-y-auto space-y-2">
            <span className="font-bold text-teal-900 block">Telugu Pitch Cheat Sheet:</span>
            <p className="text-slate-700 font-sans leading-relaxed whitespace-pre-wrap">
              {SOLAR_PITCH_SCRIPTS[0].content}
            </p>
          </div>
        )}

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* Active Vendor Info Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-md">
                  {currentVendor.district}
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1 leading-tight">
                  {currentVendor.vendorName}
                </h3>
                <div className="flex items-center gap-1 text-xs text-slate-600 mt-0.5">
                  <User className="w-3 h-3 text-slate-400" />
                  <span className="font-bold">{currentVendor.contactPersonName || 'Authorized Vendor'}</span>
                </div>
              </div>

              {currentVendor.nationalCapacityKW !== undefined && currentVendor.nationalCapacityKW > 0 && (
                <span className="bg-amber-100 text-amber-800 font-black text-xs px-2.5 py-1 rounded-xl border border-amber-200">
                  {currentVendor.nationalCapacityKW} kW
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 line-clamp-2">
              <MapPin className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
              {currentVendor.address || 'Address on file'}
            </p>
          </div>

          {/* Action Calling Section */}
          <div className="grid grid-cols-2 gap-2.5">
            <a
              href={getTelLink(currentVendor.contactPersonMobile)}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black rounded-2xl text-xs sm:text-sm shadow-md transition-all text-center"
            >
              <Phone className="w-4 h-4" />
              <span>Dial {formatPhoneDisplay(currentVendor.contactPersonMobile)}</span>
            </a>

            <a
              href={getWhatsAppLink(currentVendor.contactPersonMobile, currentVendor.vendorName)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 px-4 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-black rounded-2xl text-xs sm:text-sm shadow-md transition-all text-center"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Pitch</span>
            </a>
          </div>

          {/* Call Outcome Chips */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Call Outcome
            </label>
            <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
              {[
                { key: 'ANSWERED', label: 'Answered' },
                { key: 'BUSY', label: 'Line Busy' },
                { key: 'NO_ANSWER', label: 'No Answer' },
                { key: 'SWITCHED_OFF', label: 'Switched Off' },
                { key: 'CALLBACK_REQUESTED', label: 'Callback' },
                { key: 'WRONG_NUMBER', label: 'Wrong No' },
              ].map(o => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setOutcome(o.key as CallOutcome)}
                  className={`py-2 px-2 rounded-xl border text-center transition-all ${
                    outcome === o.key
                      ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Note Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Call Note
              </label>
              <div className="flex gap-1">
                {FREQUENT_SOLAR_NOTES.slice(0, 2).map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setNoteText(prev => prev ? `${prev}. ${preset}` : preset)}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md"
                  >
                    + {preset.slice(0, 15)}...
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={2}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="What did the vendor say? Any requirement in kW or pricing discussed?"
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            />
          </div>

          {/* Follow-up & Stage Selection */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Follow-up Date</label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full text-xs font-bold rounded-xl border border-slate-300 px-2.5 py-2 bg-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Set Stage</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as PipelineStage)}
                className="w-full text-xs font-bold rounded-xl border border-slate-300 px-2 py-2 bg-white"
              >
                <option value="CONTACTED">Contacted</option>
                <option value="INTERESTED">Interested 🔥</option>
                <option value="QUOTE_SENT">Quote Sent</option>
                <option value="FOLLOW_UP">Follow-up</option>
                <option value="WON">Deals Won 🎉</option>
                <option value="LOST">Lost</option>
              </select>
            </div>
          </div>

        </div>

        {/* Bottom Advance Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleSkip}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 font-bold text-xs"
          >
            Skip Lead
          </button>

          <button
            type="button"
            onClick={handleAdvance}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white font-black rounded-xl text-xs sm:text-sm shadow-md transition-all"
          >
            <span>Save & Dial Next Lead</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
