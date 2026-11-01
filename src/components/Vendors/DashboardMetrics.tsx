import React from 'react';
import { Users, PhoneOutgoing, Flame, Calendar, Trophy, Zap, Network } from 'lucide-react';
import { VendorItem } from '../../types/vendorCRM';

interface DashboardMetricsProps {
  vendors: VendorItem[];
  districtName: string;
}

export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ vendors, districtName }) => {
  const total = vendors.length;
  const contacted = vendors.filter(v => v.pipelineStage !== 'NEW').length;
  const contactedPercent = total > 0 ? Math.round((contacted / total) * 100) : 0;
  
  const hotLeads = vendors.filter(v => v.priority === 'HOT' || v.pipelineStage === 'INTERESTED').length;
  const today = new Date().toISOString().slice(0, 10);
  const followUpsDue = vendors.filter(v => v.nextFollowUpDate === today).length;
  const dealsWon = vendors.filter(v => v.pipelineStage === 'WON').length;
  const dcrTrackedCount = vendors.filter(v => v.dcrTracked).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mb-4">
      
      {/* 1. Total Vendors */}
      <div className="bg-white rounded-2xl p-3 shadow-2xs border border-slate-200">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider">Total Vendors</span>
          <Users className="w-4 h-4 text-teal-600" />
        </div>
        <div className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
          {total.toLocaleString('en-IN')}
        </div>
        <p className="text-[10px] text-slate-400 truncate mt-0.5">{districtName}</p>
      </div>

      {/* 2. Contacted / Called */}
      <div className="bg-white rounded-2xl p-3 shadow-2xs border border-slate-200">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider">Called / Pitched</span>
          <PhoneOutgoing className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl sm:text-2xl font-black text-blue-700 leading-tight">
            {contacted}
          </span>
          <span className="text-[10px] font-bold text-blue-600">
            ({contactedPercent}%)
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
          <div 
            className="bg-blue-600 h-1 rounded-full transition-all duration-500" 
            style={{ width: `${contactedPercent}%` }}
          />
        </div>
      </div>

      {/* 3. Hot Leads */}
      <div className="bg-white rounded-2xl p-3 shadow-2xs border border-slate-200">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Hot Leads</span>
          <Flame className="w-4 h-4 text-rose-500" />
        </div>
        <div className="text-xl sm:text-2xl font-black text-rose-600 leading-tight">
          {hotLeads}
        </div>
        <p className="text-[10px] text-rose-500 font-semibold truncate mt-0.5">High Intent</p>
      </div>

      {/* 4. Follow-ups Due */}
      <div className="bg-white rounded-2xl p-3 shadow-2xs border border-slate-200">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider">Follow-ups</span>
          <Calendar className="w-4 h-4 text-amber-600" />
        </div>
        <div className={`text-xl sm:text-2xl font-black leading-tight ${followUpsDue > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
          {followUpsDue}
        </div>
        <p className="text-[10px] text-slate-400 truncate mt-0.5">Due today</p>
      </div>

      {/* 5. Deals Won */}
      <div className="bg-white rounded-2xl p-3 shadow-2xs border border-slate-200">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Deals Won</span>
          <Trophy className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="text-xl sm:text-2xl font-black text-emerald-600 leading-tight">
          {dealsWon}
        </div>
        <p className="text-[10px] text-emerald-600 font-semibold truncate mt-0.5">Closed Partners</p>
      </div>

      {/* 6. DCR Supply Chain Linked */}
      <div className="bg-white rounded-2xl p-3 shadow-2xs border border-slate-200">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">DCR Linked</span>
          <Network className="w-4 h-4 text-indigo-600" />
        </div>
        <div className="text-xl sm:text-2xl font-black text-indigo-700 leading-tight">
          {dcrTrackedCount}
        </div>
        <p className="text-[10px] text-indigo-500 font-semibold truncate mt-0.5">Tracked in DCR Hub</p>
      </div>

    </div>
  );
};
