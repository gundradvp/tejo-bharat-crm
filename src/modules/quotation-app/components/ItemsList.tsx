import React, { useState } from 'react';
import { Item } from '../types/quotation';
import { Search, Plus, Package, Edit2, Trash2, Tag, TrendingUp, AlertTriangle } from 'lucide-react';

interface ItemsListProps {
  items: Item[];
  onOpenCreateItem: () => void;
  onEditItem: (item: Item) => void;
  onDeleteItem: (id?: string) => void;
}

export const ItemsList: React.FC<ItemsListProps> = ({
  items,
  onOpenCreateItem,
  onEditItem,
  onDeleteItem,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  const stockValue = items.reduce((sum, item) => sum + ((item.opening_stock || 0) * (item.purchase_price || item.selling_price || 0)), 0);
  const lowStockCount = items.filter(item => (item.opening_stock || 0) <= (item.low_stock_warning || 0) && (item.opening_stock || 0) > 0).length;

  const filteredItems = items.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.item_code && item.item_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.hsn_code && item.hsn_code.includes(searchTerm));

    const matchesCategory = selectedCategory === 'All Categories' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header Bar */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            <span>Items & Inventory Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage Product packages, Service items, Pricing, Stock QTY, and HSN Codes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenCreateItem}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Item</span>
          </button>
        </div>
      </div>

      {/* Top Overview Cards (MyBillBook Stock Value Cards) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-indigo-50/80 to-white p-5 rounded-2xl border border-indigo-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-600" /> Total Stock Value
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              ₹ {stockValue.toLocaleString('en-IN')}
            </div>
          </div>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full">
            {items.length} Items
          </span>
        </div>

        <div className="bg-gradient-to-br from-amber-50/80 to-white p-5 rounded-2xl border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Low Stock Items
            </span>
            <div className="text-2xl font-black text-amber-700 mt-1">
              {lowStockCount}
            </div>
          </div>
          <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
            Warning Active
          </span>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by SKU Code, Item Name, or HSN Code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="All Categories">All Categories</option>
          <option value="Solar Plant Package">Solar Plant Package</option>
          <option value="Inverters">Inverters</option>
          <option value="Solar Modules">Solar Modules</option>
          <option value="Structure & Cabling">Structure & Cabling</option>
        </select>
      </div>

      {/* Data Table (MyBillBook Design) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[11px] tracking-wider">
              <th className="p-3.5 pl-5 w-10">
                <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              </th>
              <th className="p-3.5">Item Name</th>
              <th className="p-3.5">Item Code</th>
              <th className="p-3.5">Stock QTY</th>
              <th className="p-3.5 text-right">Selling Price</th>
              <th className="p-3.5 text-right">Purchase Price</th>
              <th className="p-3.5 text-center pr-5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredItems.map((item) => (
              <tr key={item.id || item.name} className="hover:bg-slate-50/80 transition-all group">
                <td className="p-3.5 pl-5">
                  <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                </td>

                <td className="p-3.5 font-extrabold text-slate-900">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <div>
                      <span>{item.name}</span>
                      {item.hsn_code && (
                        <span className="block text-[10px] text-slate-400 font-mono font-semibold">
                          HSN: {item.hsn_code} {item.gst_rate_percent ? `(${item.gst_rate_percent}% GST)` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                <td className="p-3.5 font-mono text-slate-600 font-bold">
                  {item.item_code || '-'}
                </td>

                <td className="p-3.5 font-semibold text-slate-700">
                  {item.opening_stock || 0} {item.measuring_unit || 'PCS'}
                </td>

                <td className="p-3.5 text-right font-black text-slate-900">
                  {item.selling_price ? `₹ ${item.selling_price.toLocaleString('en-IN')}` : '-'}
                </td>

                <td className="p-3.5 text-right font-semibold text-slate-500">
                  {item.purchase_price ? `₹ ${item.purchase_price.toLocaleString('en-IN')}` : '-'}
                </td>

                <td className="p-3.5 text-center pr-5">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onEditItem(item)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
                      title="Edit Item"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-all"
                      title="Delete Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};
