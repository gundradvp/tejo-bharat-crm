import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { GitBranch, Plus, CreditCard as Edit2, Trash2, ChevronRight, AlertCircle, CheckCircle, Clock, Settings } from 'lucide-react';

interface WorkflowStage {
  id: number;
  stage_code: string;
  stage_name: string;
  stage_order: number;
  stage_category: string;
  description: string;
  is_active: boolean;
}

interface WorkflowStats {
  total_customers: number;
  stage_distribution: { stage_name: string; count: number }[];
}

export default function WorkflowManagement() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingStage, setEditingStage] = useState<WorkflowStage | null>(null);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentTenant) {
      loadWorkflowData();
    }
  }, [currentTenant]);

  const loadWorkflowData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load workflow stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('workflow_stages')
        .select('*')
        .order('stage_order');

      if (stagesError) throw stagesError;
      setStages(stagesData || []);

      // Load workflow statistics
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('current_workflow_stage');

      if (customersError) throw customersError;

      // Calculate stage distribution
      const distribution = stagesData?.map((stage) => ({
        stage_name: stage.stage_name,
        count: customersData?.filter((c) => c.current_workflow_stage === stage.stage_code).length || 0,
      })) || [];

      setStats({
        total_customers: customersData?.length || 0,
        stage_distribution: distribution,
      });
    } catch (err: any) {
      console.error('Error loading workflow data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStage = async (stageData: Partial<WorkflowStage>) => {
    try {
      setError('');

      if (editingStage) {
        // Update existing stage
        const { error: updateError } = await supabase
          .from('workflow_stages')
          .update({
            stage_name: stageData.stage_name,
            stage_order: stageData.stage_order,
            stage_category: stageData.stage_category,
            description: stageData.description,
            is_active: stageData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingStage.id);

        if (updateError) throw updateError;
      } else {
        // Insert new stage
        const { error: insertError } = await supabase
          .from('workflow_stages')
          .insert({
            ...stageData,
            tenant_id: currentTenant?.id,
          });

        if (insertError) throw insertError;
      }

      setEditingStage(null);
      setIsAddingStage(false);
      await loadWorkflowData();
    } catch (err: any) {
      console.error('Error saving stage:', err);
      setError(err.message);
    }
  };

  const handleDeleteStage = async (stageId: number) => {
    if (!confirm('Are you sure you want to delete this workflow stage?')) return;

    try {
      setError('');
      const { error: deleteError } = await supabase
        .from('workflow_stages')
        .delete()
        .eq('id', stageId);

      if (deleteError) throw deleteError;
      await loadWorkflowData();
    } catch (err: any) {
      console.error('Error deleting stage:', err);
      setError(err.message);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Assessment: 'bg-blue-100 text-blue-800',
      Documentation: 'bg-purple-100 text-purple-800',
      Commercial: 'bg-green-100 text-green-800',
      Financing: 'bg-yellow-100 text-yellow-800',
      Installation: 'bg-orange-100 text-orange-800',
      Regulatory: 'bg-red-100 text-red-800',
      Subsidy: 'bg-teal-100 text-teal-800',
      Closure: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GitBranch className="h-7 w-7 text-blue-600" />
            Workflow Management
          </h2>
          <p className="text-gray-600 mt-1">
            Configure and manage your solar installation workflow stages
          </p>
        </div>
        <button
          onClick={() => setIsAddingStage(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Add Stage
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Statistics Overview */}
      {stats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-600">{stats.total_customers}</div>
              <div className="text-sm text-gray-600 mt-1">Total Customers</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-600">{stages.filter(s => s.is_active).length}</div>
              <div className="text-sm text-gray-600 mt-1">Active Stages</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-600">
                {new Set(stages.map(s => s.stage_category)).size}
              </div>
              <div className="text-sm text-gray-600 mt-1">Categories</div>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Stages List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Workflow Stages</h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage the stages customers move through during installation
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {stages.map((stage, index) => {
            const customerCount = stats?.stage_distribution.find(
              (s) => s.stage_name === stage.stage_name
            )?.count || 0;

            return (
              <div
                key={stage.id}
                className={`p-6 hover:bg-gray-50 transition-colors ${
                  !stage.is_active ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 rounded-lg font-semibold">
                      {stage.stage_order}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {stage.stage_name}
                        </h4>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(
                            stage.stage_category
                          )}`}
                        >
                          {stage.stage_category}
                        </span>
                        {!stage.is_active && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-3">{stage.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-500">
                          <Clock className="h-4 w-4" />
                          Code: {stage.stage_code}
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <CheckCircle className="h-4 w-4" />
                          {customerCount} customers
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setEditingStage(stage)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteStage(stage.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      disabled={customerCount > 0}
                      title={customerCount > 0 ? 'Cannot delete stage with customers' : 'Delete stage'}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                {index < stages.length - 1 && (
                  <div className="flex justify-center mt-4">
                    <ChevronRight className="h-5 w-5 text-gray-400 rotate-90" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit/Add Stage Modal */}
      {(editingStage || isAddingStage) && (
        <StageEditorModal
          stage={editingStage}
          onSave={handleSaveStage}
          onCancel={() => {
            setEditingStage(null);
            setIsAddingStage(false);
          }}
        />
      )}
    </div>
  );
}

interface StageEditorModalProps {
  stage: WorkflowStage | null;
  onSave: (stage: Partial<WorkflowStage>) => void;
  onCancel: () => void;
}

function StageEditorModal({ stage, onSave, onCancel }: StageEditorModalProps) {
  const [formData, setFormData] = useState<Partial<WorkflowStage>>({
    stage_code: stage?.stage_code || '',
    stage_name: stage?.stage_name || '',
    stage_order: stage?.stage_order || 1,
    stage_category: stage?.stage_category || 'Assessment',
    description: stage?.description || '',
    is_active: stage?.is_active ?? true,
  });

  const categories = [
    'Assessment',
    'Documentation',
    'Commercial',
    'Financing',
    'Installation',
    'Regulatory',
    'Subsidy',
    'Closure',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">
            {stage ? 'Edit Workflow Stage' : 'Add Workflow Stage'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stage Code *
            </label>
            <input
              type="text"
              value={formData.stage_code}
              onChange={(e) => setFormData({ ...formData, stage_code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
              disabled={!!stage}
            />
            <p className="text-xs text-gray-500 mt-1">
              Unique identifier (e.g., site_survey). Cannot be changed after creation.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stage Name *
            </label>
            <input
              type="text"
              value={formData.stage_name}
              onChange={(e) => setFormData({ ...formData, stage_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stage Order *
              </label>
              <input
                type="number"
                value={formData.stage_order}
                onChange={(e) => setFormData({ ...formData, stage_order: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                value={formData.stage_category}
                onChange={(e) => setFormData({ ...formData, stage_category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Active Stage
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {stage ? 'Update Stage' : 'Create Stage'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
