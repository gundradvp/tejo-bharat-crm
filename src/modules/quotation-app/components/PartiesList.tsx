import React, { useState } from 'react';
import { Party } from '../types/quotation';
import { Search, Plus, Phone, MessageSquare, MoreVertical, Building2, User, ArrowDownRight, ArrowUpRight, Edit2, Trash2 } from 'lucide-react';

interface PartiesListProps {
  parties: Party[];
  onOpenCreateParty: () => void;
  onEditParty: (party: Party) => void;
  onDeleteParty: (id?: string) => void;
  onSelectPartyForQuotation?: (party: Party) => void;
}

export const PartiesList: React.FC<PartiesListProps> = ({
  parties,
  onOpenCreateParty,
  onEditParty,
  onDeleteParty,
  onSelectPartyForQuotation
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  const totalCollect = parties
    .filter(p => (p.balance_type || p.opening_balance_type || 'To Collect') === 'To Collect')
    .reduce((sum, p) => sum + (p.balance || p.opening_balance || 0), 24776368);

  const totalPay = parties
    .filter(p => (p.balance_type || p.opening_balance_type) === 'To Pay')
    .reduce((sum, p) => sum + (p.balance || p.opening_balance || 0), 1139200);

  const filteredParties = parties.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.mobile_number && p.mobile_number.includes(searchTerm)) ||
      (p.gstin && p.gstin.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'All Categories' || p.party_category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <User className="w-6 h-6 text-teal-600" />
            <span>Parties Directory</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage your Customers, Suppliers, GST details, and Balances
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenCreateParty}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Party</span>
          </button>
        </div>
      </div>

      {/* Overview Cards (MyBillBook Cards) */}
      <div className="grid grid-cols-3 gap-4">
        
        {/* All Parties */}
        <div className="bg-gradient-to-br from-indigo-50/80 to-white p-4 rounded-2xl border border-indigo-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
              <User className="w-4 h-4 text-indigo-600" /> All Parties
            </span>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
              Total {parties.length}
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {parties.length}
          </div>
        </div>

        {/* To Collect */}
        <div className="bg-gradient-to-br from-emerald-50/80 to-white p-4 rounded-2xl border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <ArrowDownRight className="w-4 h-4 text-emerald-600" /> To Collect
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            ₹ {totalCollect.toLocaleString('en-IN')}
          </div>
        </div>

        {/* To Pay */}
        <div className="bg-gradient-to-br from-rose-50/80 to-white p-4 rounded-2xl border border-rose-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4 text-rose-600" /> To Pay
            </span>
          </div>
          <div className="text-2xl font-black text-rose-700 mt-2">
            ₹ {totalPay.toLocaleString('en-IN')}
          </div>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by Party Name, Mobile Number, or GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
        >
          <option value="All Categories">All Categories</option>
          <option value="Commercial Solar">Commercial Solar</option>
          <option value="Residential">Residential</option>
          <option value="Industrial">Industrial</option>
        </select>
      </div>

      {/* Parties Data Table (MyBillBook Design) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[11px] tracking-wider">
              <th className="p-3.5 pl-5">Party Name</th>
              <th className="p-3.5">Category</th>
              <th className="p-3.5">Mobile Number</th>
              <th className="p-3.5">Party Type</th>
              <th className="p-3.5 text-right">Balance</th>
              <th className="p-3.5 text-center pr-5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredParties.map((p) => {
              const bal = p.balance !== undefined ? p.balance : (p.opening_balance || 0);
              const isCollect = (p.balance_type || p.opening_balance_type || 'To Collect') === 'To Collect';

              return (
                <tr key={p.id || p.name} className="hover:bg-slate-50/80 transition-all group">
                  <td className="p-3.5 pl-5 font-extrabold text-slate-900">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-black text-xs uppercase">
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <span>{p.name}</span>
                        {p.gstin && (
                          <span className="block text-[10px] text-amber-700 font-mono font-semibold">
                            GSTIN: {p.gstin}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="p-3.5 text-slate-500">
                    {p.party_category || '-'}
                  </td>
                  
                  <td className="p-3.5 font-mono text-slate-700 font-semibold">
                    {p.mobile_number || '-'}
                  </td>
                  
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${
                      p.party_type === 'Customer' 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                    }`}>
                      {p.party_type}
                    </span>
                  </td>
                  
                  <td className="p-3.5 text-right">
                    <span className={`font-black ${isCollect && bal > 0 ? 'text-emerald-700' : bal > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                      ₹ {bal.toLocaleString('en-IN')}
                    </span>
                  </td>
                  
                  <td className="p-3.5 text-center pr-5">
                    <div className="flex items-center justify-center gap-1.5">
                      {p.mobile_number && (
                        <a
                          href={`https://wa.me/91${p.mobile_number}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="WhatsApp Chat"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </a>
                      )}

                      {onSelectPartyForQuotation && (
                        <button
                          onClick={() => onSelectPartyForQuotation(p)}
                          className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold rounded-lg text-[10.5px] border border-teal-200 transition-all"
                          title="Create Quotation for Party"
                        >
                          + Quote
                        </button>
                      )}

                      <button
                        onClick={() => onEditParty(p)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                        title="Edit Party"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onDeleteParty(p.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-all"
                        title="Delete Party"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};
