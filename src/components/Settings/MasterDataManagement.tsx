import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { Plus, Edit2, Trash2, Save, X, Loader2, Package, Zap } from 'lucide-react';

interface PVModuleMake {
  id: string;
  make_name: string;
  model_numbers: string[];
  is_active: boolean;
  created_at: string;
}

interface InverterMake {
  id: string;
  make_name: string;
  model_numbers: string[];
  is_active: boolean;
  created_at: string;
}

type TabType = 'pv_modules' | 'inverters';

export default function MasterDataManagement() {
  const { profile } = useAuth();
  const { currentTenant } = useTenant();
  const [activeTab, setActiveTab] = useState<TabType>('pv_modules');
  const [pvModules, setPvModules] = useState<PVModuleMake[]>([]);
  const [inverters, setInverters] = useState<InverterMake[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    make_name: '',
    model_numbers: '',
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab, currentTenant]);

  const loadData = async () => {
    try {
      setLoading(true);

      if (activeTab === 'pv_modules') {
        const { data, error } = await supabase
          .from('pv_module_makes')
          .select('*')
          .order('make_name');

        if (error) throw error;
        setPvModules(data || []);
      } else {
        const { data, error } = await supabase
          .from('inverter_makes')
          .select('*')
          .order('make_name');

        if (error) throw error;
        setInverters(data || []);
      }
    } catch (error) {
      console.error('Error loading master data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant?.id) return;

    setSubmitting(true);
    try {
      const modelNumbers = formData.model_numbers
        .split(',')
        .map(m => m.trim())
        .filter(m => m.length > 0);

      const table = activeTab === 'pv_modules' ? 'pv_module_makes' : 'inverter_makes';

      if (editingId) {
        const { error } = await supabase
          .from(table)
          .update({
            make_name: formData.make_name,
            model_numbers: modelNumbers,
            is_active: formData.is_active,
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(table)
          .insert({
            tenant_id: currentTenant.id,
            make_name: formData.make_name,
            model_numbers: modelNumbers,
            is_active: formData.is_active,
            created_by: profile?.id,
          });

        if (error) throw error;
      }

      setFormData({ make_name: '', model_numbers: '', is_active: true });
      setEditingId(null);
      setShowAddForm(false);
      loadData();
    } catch (error: any) {
      console.error('Error saving data:', error);
      alert(error.message || 'Failed to save data');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: PVModuleMake | InverterMake) => {
    setFormData({
      make_name: item.make_name,
      model_numbers: item.model_numbers.join(', '),
      is_active: item.is_active,
    });
    setEditingId(item.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const table = activeTab === 'pv_modules' ? 'pv_module_makes' : 'inverter_makes';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error: any) {
      console.error('Error deleting data:', error);
      alert(error.message || 'Failed to delete item');
    }
  };

  const handleCancel = () => {
    setFormData({ make_name: '', model_numbers: '', is_active: true });
    setEditingId(null);
    setShowAddForm(false);
  };

  const currentData = activeTab === 'pv_modules' ? pvModules : inverters;

  if (profile?.role !== 'admin') {
    return (
      <div className="text-center py-8 text-gray-500">
        Only administrators can manage master data.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Master Data Management</h2>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add New
          </button>
        )}
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('pv_modules')}
            className={`flex items-center gap-2 pb-3 px-2 border-b-2 transition-colors ${
              activeTab === 'pv_modules'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Package className="w-5 h-5" />
            PV Module Makes
          </button>
          <button
            onClick={() => setActiveTab('inverters')}
            className={`flex items-center gap-2 pb-3 px-2 border-b-2 transition-colors ${
              activeTab === 'inverters'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Zap className="w-5 h-5" />
            Inverter Makes
          </button>
        </nav>
      </div>

      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit' : 'Add New'} {activeTab === 'pv_modules' ? 'PV Module Make' : 'Inverter Make'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Manufacturer Name *
              </label>
              <input
                type="text"
                required
                value={formData.make_name}
                onChange={(e) => setFormData({ ...formData, make_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Tata, Longi, Waaree"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model Numbers (comma-separated)
              </label>
              <textarea
                value={formData.model_numbers}
                onChange={(e) => setFormData({ ...formData, model_numbers: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Model A, Model B, Model C"
                rows={3}
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter model numbers separated by commas
              </p>
            </div>

            <div className="flex items-center gap-2">
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

            <div className="flex gap-3">
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
      ) : currentData.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            No {activeTab === 'pv_modules' ? 'PV module' : 'inverter'} makes added yet.
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Click "Add New" to create your first entry.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Manufacturer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model Numbers
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
              {currentData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.make_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {item.model_numbers.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.model_numbers.slice(0, 3).map((model, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                            >
                              {model}
                            </span>
                          ))}
                          {item.model_numbers.length > 3 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                              +{item.model_numbers.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">No models added</span>
                      )}
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
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
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
    </div>
  );
}
