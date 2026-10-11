import React, { useState } from 'react';
import { Item, LineItem } from '../types/quotation';
import { Search, Scan, Plus, Minus, X } from 'lucide-react';

interface AddItemsToBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  onAddSelectedItemsToBill: (selectedLineItems: LineItem[]) => void;
  onOpenCreateItem?: () => void;
}

export const AddItemsToBillModal: React.FC<AddItemsToBillModalProps> = ({
  isOpen,
  onClose,
  items,
  onAddSelectedItemsToBill,
  onOpenCreateItem
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});

  if (!isOpen) return null;

  const categories = Array.from(new Set(items.map(i => i.category).filter(Boolean)));

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.hsn_code?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleUpdateQty = (itemId: string, delta: number) => {
    const current = selectedQuantities[itemId] || 0;
    const next = Math.max(0, current + delta);
    setSelectedQuantities({ ...selectedQuantities, [itemId]: next });
  };

  const selectedItemIds = Object.keys(selectedQuantities).filter(id => selectedQuantities[id] > 0);
  const selectedCount = selectedItemIds.length;

  const totalPrice = selectedItemIds.reduce((sum, id) => {
    const item = items.find(i => i.id === id || i.item_code === id);
    const qty = selectedQuantities[id];
    return sum + ((item?.selling_price || 0) * qty);
  }, 0);

  const totalQty = selectedItemIds.reduce((sum, id) => sum + selectedQuantities[id], 0);

  const handleAddItemsToBill = () => {
    const lineItemsToAdd: LineItem[] = selectedItemIds.map((id) => {
      const item = items.find(i => i.id === id || i.item_code === id)!;
      const qty = selectedQuantities[id];
      const sellingPrice = item.selling_price || 0;
      const gstRate = item.gst_rate_percent || 12;
      
      // Calculate tax exclusive price and tax amount
      const lineTotal = sellingPrice * qty;
      const basePricePerItem = Math.round((sellingPrice / (1 + gstRate / 100)) * 100) / 100;
      const totalTax = lineTotal - (basePricePerItem * qty);

      return {
        id: `line-${Date.now()}-${Math.random()}`,
        name: item.name,
        description: item.description || '',
        hsn_code: item.hsn_code || '85414011',
        qty: qty,
        unit: 'PCS',
        price_per_item: basePricePerItem,
        update_sales_price: false,
        discount_rs: 0,
        discount_percent: 0,
        tax_rate_percent: gstRate,
        tax_amount: Math.round(totalTax * 100) / 100,
        total_amount: lineTotal,
      };
    });

    onAddSelectedItemsToBill(lineItemsToAdd);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 overflow-y-auto p-4 sm:p-6 flex items-center justify-center animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden font-sans text-slate-800 my-auto flex flex-col max-h-[90vh]">
        
        {/* HEADER BAR (Matching MyBillBook Screenshot 1) */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900">
            Add Items to Bill
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by Item/ Serial no./ HSN code/ SKU/ Custom Field / Category"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-xs font-medium border border-indigo-300 rounded-xl focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
            <Scan className="w-4 h-4 text-slate-400 absolute right-3 top-3 cursor-pointer" />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white"
          >
            <option value="All">Select Category</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Create New Item Button */}
          <button
            onClick={() => onOpenCreateItem && onOpenCreateItem()}
            className="px-4 py-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-extrabold text-xs rounded-xl shadow-md transition-all whitespace-nowrap"
          >
            Create New Item
          </button>
        </div>

        {/* ITEMS LIST TABLE */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider sticky top-0">
                <th className="p-3">Item Name</th>
                <th className="p-3 w-28">Item Code</th>
                <th className="p-3 w-24">Stock</th>
                <th className="p-3 w-32">Sales Price</th>
                <th className="p-3 w-32">Purchase Price</th>
                <th className="p-3 w-32 text-center">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredItems.map((item) => {
                const itemId = item.id || item.item_code || item.name;
                const qty = selectedQuantities[itemId] || 0;

                return (
                  <tr 
                    key={itemId}
                    className={`hover:bg-slate-50 transition-colors ${qty > 0 ? 'bg-indigo-50/40' : ''}`}
                  >
                    <td className="p-3 font-bold text-slate-900">
                      {item.name}
                    </td>
                    <td className="p-3 font-mono text-slate-500">
                      {item.item_code || '–'}
                    </td>
                    <td className="p-3 font-mono font-semibold text-slate-700">
                      {item.opening_stock || 0} PCS
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900">
                      ₹ {(item.selling_price || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 font-mono text-slate-500">
                      ₹ {(item.purchase_price || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-center">
                      {qty === 0 ? (
                        <button
                          onClick={() => handleUpdateQty(itemId, 1)}
                          className="w-full py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 font-extrabold border border-sky-200 rounded-xl transition-all flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      ) : (
                        <div className="flex items-center justify-center gap-2 bg-indigo-100 border border-indigo-300 rounded-xl p-1">
                          <button
                            onClick={() => handleUpdateQty(itemId, -1)}
                            className="p-1 text-indigo-800 hover:bg-indigo-200 rounded"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono font-extrabold text-indigo-900 px-2">
                            {qty}
                          </span>
                          <button
                            onClick={() => handleUpdateQty(itemId, 1)}
                            className="p-1 text-indigo-800 hover:bg-indigo-200 rounded"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* SELECTED ITEMS SUMMARY ROW */}
        <div className="bg-slate-100 px-6 py-2 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
          <div className="text-indigo-700">
            Show {selectedCount} Item(s) Selected
          </div>
          <div className="flex items-center gap-8 font-mono">
            <span>Total Price: ₹ {totalPrice.toLocaleString('en-IN')}</span>
            <span>Total Quantity: {totalQty}</span>
          </div>
        </div>

        {/* FOOTER BAR (Matching MyBillBook Screenshot 1) */}
        <div className="bg-white px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-3">
            <span>Keyboard Shortcuts :</span>
            <span>Change Quantity <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono">Enter</kbd></span>
            <span>Move between items <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono">↑</kbd> <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono">↓</kbd></span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel [ESC]
            </button>
            <button
              onClick={handleAddItemsToBill}
              disabled={selectedCount === 0}
              className="px-6 py-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-extrabold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              Add to Bill [F7]
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
