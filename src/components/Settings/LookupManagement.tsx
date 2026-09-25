import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { Plus, CreditCard as Edit2, Trash2, Save, X, Loader2, List, AlertCircle } from 'lucide-react';

interface LookupValue {
  id: string;
  category: string;
  value: string;
  display_label: string;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
}

const CATEGORIES = [
  { value: 'expense_types', label: 'Expense Types', description: 'Types of expenses tracked per customer project' },
  { value: 'task_type', label: 'Task Types', description: 'Types of tasks that can be assigned' },
  { value: 'task_status', label: 'Task Status', description: 'Status values for tasks' },
  { value: 'priority', label: 'Priority Levels', description: 'Priority levels for tasks' },
  { value: 'connection_type', label: 'Connection Types', description: 'Types of electrical connections' },
  { value: 'installation_type', label: 'Installation Types', description: 'Types of solar installations' },
  { value: 'payment_method', label: 'Payment Methods', description: 'Methods of payment' },
  { value: 'document_type', label: 'Document Types', description: 'Types of documents' },
];

export default function LookupManagement() {
  const { profile } = useAuth();
  const { currentTenant } = useTenant();
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].value);
  const [lookupValues, setLookupValues] = useState<LookupValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    value: '',
    display_label: '',
    description: '',
    is_active: true,
    sort_order: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadLookupValues();
  }, [selectedCategory, currentTenant]);

  const loadLookupValues = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lookup_values')
        .select('*')
        .eq('category', selectedCategory)
        .order('sort_order');

      if (error) throw error;
      setLookupValues(data || []);
    } catch (error) {
      console.error('Error loading lookup values:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant?.id) return;

    setSubmitting(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('lookup_values')
          .update({
            value: formData.value,
            display_label: formData.display_label,
            description: formData.description || null,
            is_active: formData.is_active,
            sort_order: formData.sort_order,
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lookup_values')
          .insert({
            tenant_id: currentTenant.id,
            category: selectedCategory,
            value: formData.value,
            display_label: formData.display_label,
            description: formData.description || null,
            is_active: formData.is_active,
            is_system: false,
            sort_order: formData.sort_order,
          });

        if (error) throw error;
      }

      setFormData({ value: '', display_label: '', description: '', is_active: true, sort_order: 0 });
      setEditingId(null);
      setShowAddForm(false);
      loadLookupValues();
    } catch (error: any) {
      console.error('Error saving lookup value:', error);
      alert(error.message || 'Failed to save lookup value');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: LookupValue) => {
    setFormData({
      value: item.value,
      display_label: item.display_label,
      description: item.description || '',
      is_active: item.is_active,
      sort_order: item.sort_order,
    });
    setEditingId(item.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string, isSystem: boolean) => {
    if (isSystem) {
      alert('System values cannot be deleted.');
      return;
    }

    if (!confirm('Are you sure you want to delete this lookup value?')) return;

    try {
      const { error } = await supabase
        .from('lookup_values')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadLookupValues();
    } catch (error: any) {
      console.error('Error deleting lookup value:', error);
      alert(error.message || 'Failed to delete lookup value');
    }
  };

  const handleCancel = () => {
    setFormData({ value: '', display_label: '', description: '', is_active: true, sort_order: 0 });
    setEditingId(null);
    setShowAddForm(false);
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="text-center py-8 text-gray-500">
        Only administrators can manage lookup values.
      </div>
    );
  }

  const currentCategoryInfo = CATEGORIES.find(c => c.value === selectedCategory);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lookup Value Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage dropdown values used throughout the system</p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add New Value
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Category
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setShowAddForm(false);
            setEditingId(null);
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        {currentCategoryInfo?.description && (
          <p className="mt-2 text-sm text-gray-500">{currentCategoryInfo.description}</p>
        )}
      </div>

      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit' : 'Add New'} Lookup Value
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Value (Code) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., site_visit"
                  disabled={!!editingId}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Used in code (lowercase, underscores)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Label *
                </label>
                <input
                  type="text"
                  required
                  value={formData.display_label}
                  onChange={(e) => setFormData({ ...formData, display_label: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Site Visit"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Shown to users in dropdowns
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Optional description"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Lower numbers appear first
                </p>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {submitting ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-2 bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : lookupValues.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <List className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">
            No values added for this category yet.
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Click "Add New Value" to create your first entry.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Display Label
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lookupValues.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono text-gray-500">{item.sort_order}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono text-gray-900">{item.value}</div>
                    {item.is_system && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800 mt-1">
                        System
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.display_label}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {item.description || <span className="text-gray-400 italic">No description</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.is_system)}
                        className={`p-2 rounded transition-colors ${
                          item.is_system
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-red-600 hover:text-red-900 hover:bg-red-50'
                        }`}
                        title={item.is_system ? 'System values cannot be deleted' : 'Delete'}
                        disabled={item.is_system}
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
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Important Notes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>System values (marked with purple badge) cannot be deleted</li>
              <li>Value codes should be lowercase with underscores (e.g., site_visit)</li>
              <li>Display labels are shown to users in dropdown menus</li>
              <li>Changes to lookup values take effect immediately</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
