import React, { useState } from 'react';
import { Item } from '../types/quotation';
import { X, Box, Tag, DollarSign, Users, Layers, Sparkles } from 'lucide-react';

interface ItemModalProps {
  isOpen: boolean;
  initialItem?: Item | null;
  onClose: () => void;
  onSave: (item: Item, saveAndNew?: boolean) => void;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  initialItem,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'stock' | 'pricing'>('basic');
  const [formData, setFormData] = useState<Item>({
    item_type: initialItem?.item_type || 'Product',
    name: initialItem?.name || '',
    category: initialItem?.category || 'Solar Plant Package',
    item_code: initialItem?.item_code || '',
    hsn_code: initialItem?.hsn_code || '85414011',
    measuring_unit: initialItem?.measuring_unit || 'Pieces(PCS)',
    selling_price: initialItem?.selling_price || 0,
    selling_price_tax_type: initialItem?.selling_price_tax_type || 'With Tax',
    purchase_price: initialItem?.purchase_price || 0,
    gst_rate_percent: initialItem?.gst_rate_percent || 12,
    opening_stock: initialItem?.opening_stock || 0,
    as_of_date: initialItem?.as_of_date || new Date().toISOString().slice(0, 10),
    low_stock_warning: initialItem?.low_stock_warning || 0,
    description: initialItem?.description || '',
  });

  if (!isOpen) return null;

  const handleGenerateBarcode = () => {
    const randomCode = `ITM${Math.floor(10000 + Math.random() * 90000)}`;
    setFormData(prev => ({ ...prev, item_code: randomCode }));
  };

  const handleSubmit = (e: React.FormEvent, saveAndNew: boolean = false) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Item Name is required.');
      return;
    }
    onSave(formData, saveAndNew);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-base font-extrabold text-slate-900">
            {initialItem ? 'Edit Item' : 'Create New Item'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with Left Tabs */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Navigation Tabs (MyBillBook Modal Tabs) */}
          <div className="w-56 bg-slate-50 p-4 border-r border-slate-200 space-y-2 select-none">
            
            <button
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 transition-all ${
                activeTab === 'basic'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs'
                  : 'hover:bg-slate-200/60 text-slate-600'
              }`}
            >
              <Tag className="w-4 h-4 text-indigo-600" />
              <span>Basic Details *</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stock')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 transition-all ${
                activeTab === 'stock'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs'
                  : 'hover:bg-slate-200/60 text-slate-600'
              }`}
            >
              <Box className="w-4 h-4 text-indigo-600" />
              <span>Stock Details</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pricing')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 transition-all ${
                activeTab === 'pricing'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs'
                  : 'hover:bg-slate-200/60 text-slate-600'
              }`}
            >
              <DollarSign className="w-4 h-4 text-indigo-600" />
              <span>Pricing Details</span>
            </button>

          </div>

          {/* Right Form Fields */}
          <div className="flex-1 p-6 overflow-y-auto">
            
            {/* TAB 1: BASIC DETAILS */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                
                {/* Item Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Item Type *
                  </label>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        name="itemType"
                        checked={formData.item_type === 'Product'}
                        onChange={() => setFormData({ ...formData, item_type: 'Product' })}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      Product
                    </label>

                    <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        name="itemType"
                        checked={formData.item_type === 'Service'}
                        onChange={() => setFormData({ ...formData, item_type: 'Service' })}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      Service
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Category */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="Solar Plant Package">Solar Plant Package</option>
                      <option value="Inverters">Inverters</option>
                      <option value="Solar Modules">Solar Modules</option>
                      <option value="Structure & Cabling">Structure & Cabling</option>
                    </select>
                  </div>

                  {/* Item Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Item Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="ex: 07 kw on grid solar system"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Sales Price & Tax Rate */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Sales Price</label>
                    <div className="flex gap-1">
                      <span className="inline-flex items-center px-3 bg-slate-100 border border-slate-300 text-xs font-bold text-slate-500 rounded-l-xl">₹</span>
                      <input
                        type="number"
                        placeholder="ex: 480000"
                        value={formData.selling_price || 0}
                        onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })}
                        className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 px-2 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <select
                        value={formData.selling_price_tax_type || 'With Tax'}
                        onChange={(e) => setFormData({ ...formData, selling_price_tax_type: e.target.value as any })}
                        className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded-r-xl px-2 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="With Tax">With Tax</option>
                        <option value="Without Tax">Without Tax</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">GST Tax Rate(%)</label>
                    <select
                      value={formData.gst_rate_percent !== undefined ? formData.gst_rate_percent : 8.9}
                      onChange={(e) => setFormData({ ...formData, gst_rate_percent: Number(e.target.value) })}
                      className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value={8.9}>8.9% GST (Solar Composite Rate: 70%@12% + 30%@18%)</option>
                      <option value={0}>None (0%)</option>
                      <option value={5}>5% GST</option>
                      <option value={12}>12% GST (Equipment Concession)</option>
                      <option value={18}>18% GST (Services Standard)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Measuring Unit</label>
                    <select
                      value={formData.measuring_unit}
                      onChange={(e) => setFormData({ ...formData, measuring_unit: e.target.value })}
                      className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="Pieces(PCS)">Pieces(PCS)</option>
                      <option value="Sets">Sets</option>
                      <option value="KW">KW (Kilowatts)</option>
                      <option value="Watts">Watts</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Stock</label>
                    <div className="flex">
                      <input
                        type="number"
                        placeholder="ex: 150"
                        value={formData.opening_stock || 0}
                        onChange={(e) => setFormData({ ...formData, opening_stock: Number(e.target.value) })}
                        className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-l-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <span className="inline-flex items-center px-3 bg-slate-100 border border-l-0 border-slate-300 text-xs font-bold text-slate-600 rounded-r-xl">
                        {formData.measuring_unit?.replace('Pieces(', '').replace(')', '') || 'PCS'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: STOCK DETAILS */}
            {activeTab === 'stock' && (
              <div className="space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Item Code */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Item Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="ex: ITM12549"
                        value={formData.item_code || ''}
                        onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                        className="w-full text-xs font-bold font-mono text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleGenerateBarcode}
                        className="px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-xs font-bold rounded-xl transition-all whitespace-nowrap"
                      >
                        Generate Barcode
                      </button>
                    </div>
                  </div>

                  {/* HSN Code */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">HSN Code</label>
                    <input
                      type="text"
                      placeholder="ex: 85414011"
                      value={formData.hsn_code || ''}
                      onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                      className="w-full text-xs font-bold font-mono text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Stock</label>
                    <input
                      type="number"
                      value={formData.opening_stock || 0}
                      onChange={(e) => setFormData({ ...formData, opening_stock: Number(e.target.value) })}
                      className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">As of Date</label>
                    <input
                      type="date"
                      value={formData.as_of_date || new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setFormData({ ...formData, as_of_date: e.target.value })}
                      className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Enter Description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                  />
                </div>

              </div>
            )}

            {/* TAB 3: PRICING DETAILS */}
            {activeTab === 'pricing' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Selling Price (₹)</label>
                    <input
                      type="number"
                      value={formData.selling_price || 0}
                      onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })}
                      className="w-full text-xs font-extrabold text-slate-900 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Price (₹)</label>
                    <input
                      type="number"
                      value={formData.purchase_price || 0}
                      onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value) })}
                      className="w-full text-xs font-extrabold text-slate-900 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs transition-all border border-slate-300"
          >
            Cancel
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-all border border-slate-300"
            >
              Save & New
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, false)}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-md"
            >
              Save Item
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
