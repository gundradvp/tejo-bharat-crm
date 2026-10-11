import React, { useState } from 'react';
import { Branch } from '../types/quotation';
import { Building2, X, Plus, Check, Edit2, Trash2, Eye } from 'lucide-react';

interface BranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: Branch[];
  selectedBranchId: string;
  onSelectBranch: (branchId: string) => void;
  onAddBranch: (branch: Branch) => void;
  onUpdateBranch?: (branch: Branch) => void;
  onDeleteBranch?: (branchId: string) => void;
}

export const BranchModal: React.FC<BranchModalProps> = ({
  isOpen,
  onClose,
  branches,
  selectedBranchId,
  onSelectBranch,
  onAddBranch,
  onUpdateBranch,
  onDeleteBranch
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [companyName, setCompanyName] = useState('TEJO BHARAT GLOBAL ENERGY LLP');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Telangana');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('+91 94797 97947');
  const [email, setEmail] = useState('contact@tejobharat.com');
  const [website, setWebsite] = useState('www.tejobharat.com');
  const [gstin, setGstin] = useState('');
  const [cin, setCin] = useState('ACQ-2334');
  const [pan, setPan] = useState('AAYFT4513H');
  const [signatoryTitle, setSignatoryTitle] = useState('Authorized Signatory');

  if (!isOpen) return null;

  const handleOpenAddForm = () => {
    setEditingBranchId(null);
    setName('');
    setCode('');
    setCompanyName('TEJO BHARAT GLOBAL ENERGY LLP');
    setAddress('');
    setCity('');
    setState('Telangana');
    setPincode('');
    setPhone('+91 94797 97947');
    setEmail('contact@tejobharat.com');
    setWebsite('www.tejobharat.com');
    setGstin('');
    setCin('ACQ-2334');
    setPan('AAYFT4513H');
    setSignatoryTitle('Authorized Signatory');
    setShowForm(true);
  };

  const handleOpenEditForm = (b: Branch) => {
    setEditingBranchId(b.id);
    setName(b.name);
    setCode(b.code);
    setCompanyName(b.company_name || 'TEJO BHARAT GLOBAL ENERGY LLP');
    setAddress(b.address);
    setCity(b.city || '');
    setState(b.state || 'Telangana');
    setPincode(b.pincode || '');
    setPhone(b.phone || '+91 94797 97947');
    setEmail(b.email || 'contact@tejobharat.com');
    setWebsite(b.website || 'www.tejobharat.com');
    setGstin(b.gstin);
    setCin(b.cin || 'ACQ-2334');
    setPan(b.pan || (b.gstin && b.gstin.length >= 12 ? b.gstin.substring(2, 12) : 'AAYFT4513H'));
    setSignatoryTitle(b.signatory_title || 'Authorized Signatory');
    setShowForm(true);
  };

  const handleGstinChange = (val: string) => {
    const upper = val.toUpperCase();
    setGstin(upper);
    if (upper.length >= 12 && (!pan || pan.length <= 10)) {
      setPan(upper.substring(2, 12));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address || !gstin) {
      alert('Please fill in Branch Name, Address, and GSTIN');
      return;
    }

    const branchObj: Branch = {
      id: editingBranchId || ('branch-' + Date.now()),
      code: (code || 'BR').toUpperCase(),
      name,
      company_name: companyName.trim() || 'TEJO BHARAT GLOBAL ENERGY LLP',
      address,
      city,
      state,
      pincode,
      phone,
      email,
      website: website.trim() || 'www.tejobharat.com',
      gstin: gstin.trim().toUpperCase(),
      cin: cin.trim().toUpperCase() || 'ACQ-2334',
      pan: pan.trim().toUpperCase() || (gstin.length >= 12 ? gstin.substring(2, 12).toUpperCase() : 'AAYFT4513H'),
      signatory_title: signatoryTitle.trim() || 'Authorized Signatory',
      is_default: branches.find(b => b.id === editingBranchId)?.is_default,
    };

    if (editingBranchId && onUpdateBranch) {
      onUpdateBranch(branchObj);
    } else {
      onAddBranch(branchObj);
    }

    onSelectBranch(branchObj.id);
    setShowForm(false);
  };

  const formatCinDisplay = (cinVal: string) => {
    if (!cinVal) return 'LLPIN: ACQ-2334';
    if (cinVal.includes(':')) return cinVal;
    if (cinVal.toUpperCase().startsWith('ACQ') || cinVal.length <= 10) return `LLPIN: ${cinVal}`;
    return `CIN: ${cinVal}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 no-print">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base">
                {showForm ? (editingBranchId ? 'Edit Office & Printed Footer Details' : 'Add New Office Branch') : 'Manage Office Addresses & Printed Footer'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Configure legal entity, address, GSTIN, CIN/LLPIN and contact info printed on quotations & invoices
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

        <div className="p-6 overflow-y-auto flex-1">
          {!showForm ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-slate-500">
                  Select an active office address or click the pencil icon to edit any information printed in the footer:
                </p>
              </div>

              <div className="space-y-3">
                {branches.map((b) => (
                  <div
                    key={b.id}
                    className={`p-4 rounded-xl border-2 transition-all flex items-start justify-between ${
                      selectedBranchId === b.id
                        ? 'border-teal-600 bg-teal-50/50 shadow-sm ring-2 ring-teal-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div 
                      onClick={() => {
                        onSelectBranch(b.id);
                        onClose();
                      }}
                      className="flex-1 cursor-pointer pr-3"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900">{b.name}</span>
                        <span className="bg-slate-200 text-slate-700 text-[10px] font-mono font-extrabold px-2 py-0.5 rounded">
                          {b.code}
                        </span>
                        {b.is_default && (
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full">
                            Default HQ
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                          {b.company_name || 'TEJO BHARAT GLOBAL ENERGY LLP'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 font-medium">📍 {b.address}{b.pincode ? ` - ${b.pincode}` : ''}</p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 text-[11px] text-slate-600 font-mono bg-white/70 p-2 rounded-lg border border-slate-200/60">
                        <div>GSTIN: <strong className="text-slate-900">{b.gstin}</strong></div>
                        <div>{formatCinDisplay(b.cin || 'ACQ-2334')}</div>
                        {b.pan && <div>PAN: <strong className="text-slate-900">{b.pan}</strong></div>}
                        <div>📞 {b.phone}</div>
                        <div className="truncate">✉️ {b.email}</div>
                        <div>🌐 {b.website || 'www.tejobharat.com'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0 pt-1">
                      <button
                        onClick={() => handleOpenEditForm(b)}
                        className="px-2.5 py-1.5 text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-300 transition-all flex items-center gap-1"
                        title="Edit All Printed Footer & Office Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      {onDeleteBranch && !b.is_default && branches.length > 1 && (
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete branch "${b.name}"?`)) {
                              onDeleteBranch(b.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-all"
                          title="Delete Branch"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      {selectedBranchId === b.id && (
                        <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center flex-shrink-0 ml-1 shadow-xs" title="Currently Selected">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleOpenAddForm}
                className="mt-4 w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 border border-slate-300 transition-all"
              >
                <Plus className="w-4 h-4 text-teal-700" />
                <span>Add New Office Branch Address</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              {/* Live Preview of the Printed Footer */}
              <div className="bg-amber-50/70 border-2 border-dashed border-amber-300 rounded-xl p-3 text-center space-y-1">
                <div className="flex items-center justify-center gap-1 text-[10px] font-black text-amber-900 uppercase tracking-wider">
                  <Eye className="w-3.5 h-3.5 text-amber-600" />
                  <span>Live Footer Print Preview</span>
                </div>
                <div className="font-black text-teal-950 text-xs tracking-wide">
                  {companyName.trim() || 'TEJO BHARAT GLOBAL ENERGY LLP'}
                </div>
                <div className="text-[10.5px] text-slate-700">
                  📍 {address.trim() || '[Full Street Address]'}{city ? `, ${city}` : ''}{state ? `, ${state}` : ''}{pincode ? ` - ${pincode}` : ''}
                </div>
                <div className="text-[10.5px] text-slate-600 font-medium">
                  📞 {phone.trim() || '+91 94797 97947'} | ✉️ {email.trim() || 'contact@tejobharat.com'} | 🌐 {website.trim() || 'www.tejobharat.com'}
                </div>
                <div className="text-[9.5px] text-slate-500 font-mono font-bold pt-0.5">
                  GSTIN: {gstin.trim().toUpperCase() || '37AAYFT4513H1ZO'} | {formatCinDisplay(cin.trim().toUpperCase())}{pan ? ` | PAN: ${pan.trim().toUpperCase()}` : ''}
                </div>
              </div>

              {/* SECTION 1: Company & Branch Identification */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
                <div className="text-[11px] font-black text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1">
                  1. Company & Office Identification
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Legal Entity / Company Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TEJO BHARAT GLOBAL ENERGY LLP"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Branch Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. PITH"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Office / Branch Display Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tejo Bharat Pithapuram Branch"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* SECTION 2: Address Details */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
                <div className="text-[11px] font-black text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1">
                  2. Office Address (Printed in Footer)
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Street Address <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Door No, Street Name, Landmark, Area"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      placeholder="e.g. Pithapuram"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
                    <input
                      type="text"
                      placeholder="e.g. Andhra Pradesh"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Pincode</label>
                    <input
                      type="text"
                      placeholder="e.g. 533450"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Tax, CIN / LLPIN, & Registration */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
                <div className="text-[11px] font-black text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1">
                  3. Tax & Corporate Registration (Printed in Footer)
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      GSTIN Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="37AAYFT4513H1ZO"
                      value={gstin}
                      onChange={(e) => handleGstinChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none uppercase font-mono font-bold text-teal-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      CIN / LLPIN Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ACQ-2334"
                      value={cin}
                      onChange={(e) => setCin(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none uppercase font-mono font-bold text-indigo-900"
                    />
                    <span className="text-[9.5px] text-slate-400 mt-0.5 block">Ex: ACQ-2334</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">PAN Number</label>
                    <input
                      type="text"
                      placeholder="AAYFT4513H"
                      value={pan}
                      onChange={(e) => setPan(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none uppercase font-mono font-bold"
                    />
                    <span className="text-[9.5px] text-slate-400 mt-0.5 block">Auto from GSTIN</span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Contact & Signatory Details */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
                <div className="text-[11px] font-black text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1">
                  4. Contact & Signatory Details
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Website URL</label>
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Authorized Signatory Title</label>
                  <input
                    type="text"
                    value={signatoryTitle}
                    onChange={(e) => setSignatoryTitle(e.target.value)}
                    placeholder="Authorized Signatory"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-semibold"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 justify-end pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-extrabold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingBranchId ? 'Update Office & Footer' : 'Save New Office'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};

