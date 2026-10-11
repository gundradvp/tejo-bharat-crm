import React, { useState, useEffect } from 'react';
import { Party } from '../types/quotation';
import { fetchGSTDetails, getGSTApiKeyConfig, saveGSTApiKeyConfig } from '../lib/gstLookup';
import { ArrowLeft, Search, Save, Plus, ShieldCheck, Zap, X, Settings, Key } from 'lucide-react';

interface PartyFormProps {
  initialParty?: Party | null;
  onSave: (party: Party, saveAndNew?: boolean) => void;
  onCancel: () => void;
  isModal?: boolean;
}

export const PartyForm: React.FC<PartyFormProps> = ({
  initialParty,
  onSave,
  onCancel,
  isModal = false
}) => {
  const [formData, setFormData] = useState<Party>({
    name: initialParty?.name || '',
    mobile_number: initialParty?.mobile_number || '',
    email: initialParty?.email || '',
    gstin: initialParty?.gstin || '',
    pan_number: initialParty?.pan_number || '',
    party_type: initialParty?.party_type || 'Customer',
    party_category: initialParty?.party_category || '',
    opening_balance: initialParty?.opening_balance || 0,
    opening_balance_type: initialParty?.opening_balance_type || 'To Collect',
    billing_address: initialParty?.billing_address || '',
    shipping_address: initialParty?.shipping_address || '',
    same_as_billing: initialParty?.same_as_billing !== false,
    credit_period_days: initialParty?.credit_period_days || 30,
    credit_limit: initialParty?.credit_limit || 0,
    contact_person_name: initialParty?.contact_person_name || '',
    date_of_birth: initialParty?.date_of_birth || '',
  });

  const [isFetchingGst, setIsFetchingGst] = useState<boolean>(false);
  const [gstStatus, setGstStatus] = useState<string>('');
  
  // API Key Settings Modal State
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [apiConfig, setApiConfig] = useState(() => getGSTApiKeyConfig());
  const [keyInput, setKeyInput] = useState(apiConfig.key);
  const [providerInput, setProviderInput] = useState(apiConfig.provider);

  const handleSaveApiKey = () => {
    saveGSTApiKeyConfig(keyInput.trim(), providerInput);
    setApiConfig({ key: keyInput.trim(), provider: providerInput });
    setShowKeyModal(false);
    setGstStatus('✓ API Key saved successfully!');
  };

  useEffect(() => {
    if (initialParty) {
      setFormData({
        name: initialParty.name || '',
        mobile_number: initialParty.mobile_number || '',
        email: initialParty.email || '',
        gstin: initialParty.gstin || '',
        pan_number: initialParty.pan_number || '',
        party_type: initialParty.party_type || 'Customer',
        party_category: initialParty.party_category || '',
        opening_balance: initialParty.opening_balance || 0,
        opening_balance_type: initialParty.opening_balance_type || 'To Collect',
        billing_address: initialParty.billing_address || '',
        shipping_address: initialParty.shipping_address || '',
        same_as_billing: initialParty.same_as_billing !== false,
        credit_period_days: initialParty.credit_period_days || 30,
        credit_limit: initialParty.credit_limit || 0,
        contact_person_name: initialParty.contact_person_name || '',
        date_of_birth: initialParty.date_of_birth || '',
      });
    }
  }, [initialParty]);

  const handleGstLookup = async () => {
    if (!formData.gstin || formData.gstin.trim().length !== 15) {
      setGstStatus('GSTIN must be exactly 15 characters long (e.g. 37AAYFT4513H1ZO)');
      return;
    }

    setIsFetchingGst(true);
    setGstStatus('Fetching GST details from portal...');

    try {
      const details = await fetchGSTDetails(formData.gstin);
      
      const partyName = details.tradeName || details.legalName || formData.name;
      
      setFormData(prev => ({
        ...prev,
        name: partyName.includes('Registered') ? (prev.name || partyName) : partyName,
        pan_number: details.pan,
        billing_address: details.billingAddress,
        shipping_address: prev.same_as_billing !== false ? details.billingAddress : details.shippingAddress,
        same_as_billing: true,
      }));

      setGstStatus(`✓ Success: Found ${details.legalName} (${details.state})`);
    } catch (err: any) {
      setGstStatus(`Error: ${err.message}`);
    } finally {
      setIsFetchingGst(false);
    }
  };

  const handleSubmit = (e: React.FormEvent, saveAndNew: boolean = false) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Party Name is required.');
      return;
    }
    onSave(formData, saveAndNew);
  };

  const formContent = (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="bg-white p-4 px-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-all"
            title="Back to Parties List"
          >
            {isModal ? <X className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              {initialParty ? 'Edit Party' : 'Create Party'}
            </h2>
            <p className="text-xs text-slate-500">
              Party details with Appyflow / Live GST Auto-Fetch
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isModal && (
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-all border border-slate-300"
            >
              Save & New
            </button>
          )}
          <button
            type="button"
            onClick={(e) => handleSubmit(e, false)}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-md flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Save Party</span>
          </button>
        </div>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        
        {/* Section 1: GSTIN & Basic Details */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-xs text-slate-600 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>GSTIN & Basic Details</span>
            </h3>

            <button
              type="button"
              onClick={() => setShowKeyModal(true)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 transition-all"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{apiConfig.key ? '🔑 Appyflow Key Active' : '+ Set Appyflow Key'}</span>
            </button>
          </div>

          {/* GST Lookup Bar */}
          <div className="p-4 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-teal-500/10 rounded-xl border border-amber-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                Auto-fill Details using Customer GSTIN
              </label>
              {!apiConfig.key && (
                <button
                  type="button"
                  onClick={() => setShowKeyModal(true)}
                  className="text-[11px] text-amber-700 underline font-bold"
                >
                  Paste key secret for 100% accurate lookup
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter 15-digit GSTIN (Ex: 37AAYFT4513H1ZO)"
                value={formData.gstin || ''}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  let pan = formData.pan_number;
                  if (val.length >= 12) {
                    pan = val.substring(2, 12);
                  }
                  setFormData({ ...formData, gstin: val, pan_number: pan });
                }}
                className="flex-1 text-xs font-mono font-bold tracking-wider uppercase px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleGstLookup}
                disabled={isFetchingGst}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-bold text-xs shadow transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{isFetchingGst ? 'Fetching...' : 'Get Details'}</span>
              </button>
            </div>

            {gstStatus && (
              <p className={`text-[11px] font-semibold ${gstStatus.startsWith('✓') ? 'text-emerald-700' : 'text-amber-700'}`}>
                {gstStatus}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Party Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: TEJO BHARAT GLOBAL ENERGY LLP"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Number
              </label>
              <input
                type="text"
                placeholder="Ex: 9479797947"
                value={formData.mobile_number || ''}
                onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                className="w-full text-xs font-mono font-bold text-slate-800 bg-white border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                PAN Number
              </label>
              <input
                type="text"
                placeholder="Auto-extracted from GSTIN"
                value={formData.pan_number || ''}
                onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                className="w-full text-xs font-mono uppercase font-bold text-slate-800 bg-white border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="Ex: customer@domain.com"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Address Details */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="font-extrabold text-xs text-slate-600 uppercase tracking-wider pb-2 border-b border-slate-100">
            Address Details
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Billing Address
              </label>
              <textarea
                rows={2}
                placeholder="Enter complete billing address..."
                value={formData.billing_address || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({
                    ...formData,
                    billing_address: val,
                    shipping_address: formData.same_as_billing ? val : formData.shipping_address,
                  });
                }}
                className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="same-billing"
                checked={formData.same_as_billing !== false}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setFormData({
                    ...formData,
                    same_as_billing: checked,
                    shipping_address: checked ? formData.billing_address : formData.shipping_address,
                  });
                }}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="same-billing" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Shipping address is same as billing address
              </label>
            </div>

            {formData.same_as_billing === false && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Shipping Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter shipping address..."
                  value={formData.shipping_address || ''}
                  onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                  className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Credit Terms & Balance */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="font-extrabold text-xs text-slate-600 uppercase tracking-wider pb-2 border-b border-slate-100">
            Credit Terms & Opening Balance
          </h3>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Opening Balance (₹)
              </label>
              <input
                type="number"
                placeholder="0"
                value={formData.opening_balance || 0}
                onChange={(e) => setFormData({ ...formData, opening_balance: Number(e.target.value) })}
                className="w-full text-xs font-mono font-bold text-slate-800 bg-white border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Balance Type
              </label>
              <select
                value={formData.opening_balance_type || 'To Collect'}
                onChange={(e) => setFormData({ ...formData, opening_balance_type: e.target.value as any })}
                className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="To Collect">To Collect</option>
                <option value="To Pay">To Pay</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Credit Period (Days)
              </label>
              <input
                type="number"
                placeholder="30"
                value={formData.credit_period_days || 30}
                onChange={(e) => setFormData({ ...formData, credit_period_days: Number(e.target.value) })}
                className="w-full text-xs font-mono font-bold text-slate-800 bg-white border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

      </form>

    </div>
  );

  const keySettingsModal = showKeyModal && (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 font-sans text-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-sm">
            <Key className="w-4 h-4" />
            <span>Configure GST API Key (Appyflow)</span>
          </div>
          <button
            onClick={() => setShowKeyModal(false)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600">
          Paste your <strong>Appyflow key_secret</strong> to enable 100% real-time official GST taxpayer details auto-fill.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              API Provider
            </label>
            <select
              value={providerInput}
              onChange={(e) => setProviderInput(e.target.value as any)}
              className="w-full text-xs font-semibold p-2.5 border border-slate-300 rounded-xl bg-white"
            >
              <option value="appyflow">Appyflow (https://appyflow.in/api/verifyGST)</option>
              <option value="rapidapi">RapidAPI (Jamku / GST Insights)</option>
              <option value="sandbox">Sandbox.co.in (Quicko)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Appyflow key_secret / API Key
            </label>
            <input
              type="text"
              placeholder="Paste your key_secret here..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full text-xs font-mono p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowKeyModal(false)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveApiKey}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md"
          >
            Save Key Secret
          </button>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] overflow-y-auto p-4 sm:p-6 flex items-center justify-center animate-in fade-in">
        <div className="bg-[#f8fafc] rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden font-sans text-slate-800 my-auto max-h-[90vh] flex flex-col p-6">
          <div className="overflow-y-auto pr-1">
            {formContent}
          </div>
        </div>
        {keySettingsModal}
      </div>
    );
  }

  return (
    <>
      {formContent}
      {keySettingsModal}
    </>
  );
};
