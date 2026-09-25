import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  CheckCircle,
  Circle,
  Clock,
  XCircle,
  AlertCircle,
  Calendar,
  User,
  Edit2,
  Save,
  X,
  Loader2,
  FileText
} from 'lucide-react';

type WorkflowStep = {
  id: string;
  customer_id: string;
  step_name: string;
  step_type: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  assigned_to: string | null;
  order_index: number;
  estimated_completion_date: string | null;
  actual_completion_date: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  assigned_profile?: {
    full_name: string;
  };
};

type CustomerWorkflowChecklistProps = {
  customerId: string;
};

const statusConfig = {
  not_started: {
    icon: Circle,
    color: 'text-gray-400',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    label: 'Not Started'
  },
  in_progress: {
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'In Progress'
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Completed'
  },
  blocked: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Blocked'
  },
};

export default function CustomerWorkflowChecklist({ customerId }: CustomerWorkflowChecklistProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<WorkflowStep>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadWorkflowSteps();
  }, [customerId]);

  const loadWorkflowSteps = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customer_workflow_steps')
        .select(`
          *,
          assigned_profile:profiles!customer_workflow_steps_assigned_to_fkey(full_name)
        `)
        .eq('customer_id', customerId)
        .order('order_index');

      if (error) throw error;
      setSteps(data || []);
    } catch (error) {
      console.error('Error loading workflow steps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (stepId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('customer_workflow_steps')
        .update({ status: newStatus })
        .eq('id', stepId);

      if (error) throw error;
      await loadWorkflowSteps();
    } catch (error) {
      console.error('Error updating step status:', error);
      alert('Failed to update step status');
    }
  };

  const handleEdit = (step: WorkflowStep) => {
    setEditingStep(step.id);
    setEditData({
      notes: step.notes,
      estimated_completion_date: step.estimated_completion_date,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingStep) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('customer_workflow_steps')
        .update(editData)
        .eq('id', editingStep);

      if (error) throw error;
      await loadWorkflowSteps();
      setEditingStep(null);
      setEditData({});
    } catch (error) {
      console.error('Error updating step:', error);
      alert('Failed to update step');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingStep(null);
    setEditData({});
  };

  const calculateProgress = () => {
    if (steps.length === 0) return 0;
    const completed = steps.filter(s => s.status === 'completed').length;
    return Math.round((completed / steps.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const progress = calculateProgress();
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const inProgressSteps = steps.filter(s => s.status === 'in_progress').length;
  const blockedSteps = steps.filter(s => s.status === 'blocked').length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Project Workflow</h3>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Progress</p>
              <p className="text-2xl font-bold text-blue-600">{progress}%</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>{completedSteps} completed</span>
            {inProgressSteps > 0 && <span>{inProgressSteps} in progress</span>}
            {blockedSteps > 0 && <span className="text-red-600">{blockedSteps} blocked</span>}
            <span>{steps.length} total</span>
          </div>
        </div>

        <div className="space-y-3">
          {steps.map((step, index) => {
            const config = statusConfig[step.status];
            const StatusIcon = config.icon;
            const isEditing = editingStep === step.id;
            const isOverdue = step.estimated_completion_date &&
              new Date(step.estimated_completion_date) < new Date() &&
              step.status !== 'completed';

            return (
              <div
                key={step.id}
                className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4 transition-all hover:shadow-md`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-200">
                      <span className="text-sm font-semibold text-gray-600">{index + 1}</span>
                    </div>

                    <StatusIcon className={`w-5 h-5 ${config.color} flex-shrink-0`} />

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{step.step_name}</h4>
                        {isOverdue && (
                          <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded">
                            <AlertCircle className="w-3 h-3" />
                            Overdue
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-2">
                        <select
                          value={step.status}
                          onChange={(e) => handleStatusChange(step.id, e.target.value)}
                          className={`px-3 py-1 rounded-md border font-medium text-xs ${config.color} ${config.borderColor} bg-white`}
                        >
                          <option value="not_started">Not Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="blocked">Blocked</option>
                        </select>

                        {step.assigned_profile && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-white rounded border border-gray-200">
                            <User className="w-3 h-3" />
                            {step.assigned_profile.full_name}
                          </span>
                        )}

                        {step.estimated_completion_date && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-white rounded border border-gray-200">
                            <Calendar className="w-3 h-3" />
                            Target: {new Date(step.estimated_completion_date).toLocaleDateString()}
                          </span>
                        )}

                        {step.actual_completion_date && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded border border-green-200">
                            <CheckCircle className="w-3 h-3" />
                            Completed: {new Date(step.actual_completion_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-3 mt-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Target Date
                            </label>
                            <input
                              type="date"
                              value={editData.estimated_completion_date || ''}
                              onChange={(e) => setEditData({ ...editData, estimated_completion_date: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Notes
                            </label>
                            <textarea
                              value={editData.notes || ''}
                              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              rows={3}
                              placeholder="Add notes about this step..."
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveEdit}
                              disabled={saving}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                            >
                              <Save className="w-3 h-3" />
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={saving}
                              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium disabled:opacity-50"
                            >
                              <X className="w-3 h-3" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {step.notes && (
                            <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                              <div className="flex items-start gap-2">
                                <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-gray-700">{step.notes}</p>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {!isEditing && (
                    <button
                      onClick={() => handleEdit(step)}
                      className="p-2 text-gray-600 hover:bg-white rounded-lg transition-colors"
                      title="Edit step"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
