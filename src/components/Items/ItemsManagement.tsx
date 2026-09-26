import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { Plus, Edit, Trash2, X, Search } from 'lucide-react';

interface Item {
  id: string;
  item_type: string;
  item_name: string;
  category: string;
  description: string;
  specifications: string;
  sales_price: number;
  tax_rate: number;
  measuring_unit: string;
  opening_stock: number;
  show_in_online_store: boolean;
}

export default function ItemsManagement() {
  const { currentTenant } = useTenant();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('basic');

  const [formData, setFormData] = useState({
    item_type: 'product',
    item_name: '',
    category: '',
    description: '',
    specifications: '',
    sales_price: 0,
    tax_rate: 0,
    measuring_unit: 'PCS',
    opening_stock: 0,
    show_in_online_store: false
  });

  useEffect(() => {
    if (currentTenant) {
      loadItems();
    }
  }, [currentTenant]);

  const loadItems = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('item_name');

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentTenant) return;

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('items')
          .update(formData)
          .eq('id', editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('items')
          .insert({
            ...formData,
            tenant_id: currentTenant.id
          });

        if (error) throw error;
      }

      await loadItems();
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving item:', error);
      alert('Failed to save item: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadItems();
    } catch (error: any) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item: ' + error.message);
    }
  };

  const handleOpenModal = (item?: Item) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        item_type: item.item_type,
        item_name: item.item_name,
        category: item.category || '',
        description: item.description || '',
        specifications: item.specifications || '',
        sales_price: item.sales_price,
        tax_rate: item.tax_rate,
        measuring_unit: item.measuring_unit,
        opening_stock: item.opening_stock,
        show_in_online_store: item.show_in_online_store
      });
    } else {
      setEditingItem(null);
      setFormData({
        item_type: 'product',
        item_name: '',
        category: '',
        description: '',
        specifications: '',
        sales_price: 0,
        tax_rate: 0,
        measuring_unit: 'PCS',
        opening_stock: 0,
        show_in_online_store: false
      });
    }
    setShowModal(true);
    setActiveTab('basic');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setActiveTab('basic');
  };

  const filteredItems = items.filter(item =>
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Items Management</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Create New Item
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items by name or category..."
            className="w-full pl-10 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Item Name</th>
                <th className="text-left py-3 px-4">Category</th>
                <th className="text-right py-3 px-4">Sales Price</th>
                <th className="text-right py-3 px-4">Tax Rate</th>
                <th className="text-center py-3 px-4">Unit</th>
                <th className="text-center py-3 px-4">Stock</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      item.item_type === 'product' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {item.item_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium">{item.item_name}</td>
                  <td className="py-3 px-4 text-gray-600">{item.category || '-'}</td>
                  <td className="py-3 px-4 text-right">₹ {item.sales_price.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-right">{item.tax_rate}%</td>
                  <td className="py-3 px-4 text-center">{item.measuring_unit}</td>
                  <td className="py-3 px-4 text-center">{item.opening_stock}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    No items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold">
                {editingItem ? 'Edit Item' : 'Create New Item'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex">
              <div className="w-64 border-r bg-gray-50 p-4">
                <button
                  onClick={() => setActiveTab('basic')}
                  className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors ${
                    activeTab === 'basic' ? 'bg-blue-100 text-blue-800 font-medium' : 'hover:bg-gray-100'
                  }`}
                >
                  📋 Basic Details *
                </button>
                <button
                  onClick={() => setActiveTab('stock')}
                  className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors ${
                    activeTab === 'stock' ? 'bg-blue-100 text-blue-800 font-medium' : 'hover:bg-gray-100'
                  }`}
                >
                  📦 Stock Details
                </button>
                <button
                  onClick={() => setActiveTab('pricing')}
                  className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors ${
                    activeTab === 'pricing' ? 'bg-blue-100 text-blue-800 font-medium' : 'hover:bg-gray-100'
                  }`}
                >
                  ₹ Pricing Details
                </button>
              </div>

              <div className="flex-1 p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {activeTab === 'basic' && (
                  <div>
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Item Type *
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              value="product"
                              checked={formData.item_type === 'product'}
                              onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                              className="w-4 h-4"
                            />
                            <span>Product</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              value="service"
                              checked={formData.item_type === 'service'}
                              onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                              className="w-4 h-4"
                            />
                            <span>Service</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Category
                        </label>
                        <input
                          type="text"
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Select Category"
                        />
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Item Name *
                      </label>
                      <input
                        type="text"
                        value={formData.item_name}
                        onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="ex: Maggie 20gm"
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Item description"
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Specifications
                      </label>
                      <textarea
                        value={formData.specifications}
                        onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Technical specifications"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.show_in_online_store}
                          onChange={(e) => setFormData({ ...formData, show_in_online_store: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">Show Item in Online Store</span>
                      </label>
                    </div>
                  </div>
                )}

                {activeTab === 'stock' && (
                  <div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Measuring Unit
                        </label>
                        <select
                          value={formData.measuring_unit}
                          onChange={(e) => setFormData({ ...formData, measuring_unit: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="PCS">Pieces(PCS)</option>
                          <option value="KG">Kilograms(KG)</option>
                          <option value="L">Liters(L)</option>
                          <option value="M">Meters(M)</option>
                          <option value="NOS">Numbers(NOS)</option>
                          <option value="KW">Kilowatts(KW)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Opening Stock
                        </label>
                        <input
                          type="number"
                          value={formData.opening_stock}
                          onChange={(e) => setFormData({ ...formData, opening_stock: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="ex: 150 PCS"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'pricing' && (
                  <div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sales Price
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            ₹
                          </span>
                          <input
                            type="number"
                            value={formData.sales_price}
                            onChange={(e) => setFormData({ ...formData, sales_price: Number(e.target.value) })}
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="ex: 200"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          GST Tax Rate(%)
                        </label>
                        <select
                          value={formData.tax_rate}
                          onChange={(e) => setFormData({ ...formData, tax_rate: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="0">None</option>
                          <option value="0.1">0.1%</option>
                          <option value="0.25">0.25%</option>
                          <option value="3">3%</option>
                          <option value="5">5%</option>
                          <option value="8.9">8.9%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={handleCloseModal}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.item_name}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
