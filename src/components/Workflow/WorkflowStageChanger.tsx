import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { GitBranch, ChevronDown, Save, X } from 'lucide-react';

interface WorkflowStage {
  id: number;
  stage_code: string;
  stage_name: string;
  stage_order: number;
  stage_category: string;
}

interface WorkflowStageChangerProps {
  customerId: string;
  currentStage: string;
  onStageChanged?: () => void;
  compact?: boolean;
}

export default function WorkflowStageChanger({
  customerId,
  currentStage,
  onStageChanged,
  compact = false,
}: WorkflowStageChangerProps) {
  const { user } = useAuth();
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [selectedStage, setSelectedStage] = useState(currentStage);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    loadStages();
  }, []);

  useEffect(() => {
    setSelectedStage(currentStage);
  }, [currentStage]);

  const loadStages = async () => {
    try {
      const { data, error: stagesError } = await supabase
        .from('workflow_stages')
        .select('*')
        .eq('is_active', true)
        .order('stage_order');

      if (stagesError) throw stagesError;
      setStages(data || []);
    } catch (err: any) {
      console.error('Error loading stages:', err);
    }
  };

  const handleStageChange = async () => {
    if (selectedStage === currentStage) {
      setShowNotes(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Update customer's current workflow stage
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          current_workflow_stage: selectedStage,
          workflow_stage_updated_at: new Date().toISOString(),
        })
        .eq('id', customerId);

      if (updateError) throw updateError;

      // The trigger will automatically create the transition record
      // But we can add notes if provided
      if (notes.trim()) {
        // Find the most recent transition for this customer
        const { data: transitions, error: transitionError } = await supabase
          .from('customer_workflow_transitions')
          .select('id')
          .eq('customer_id', customerId)
          .eq('to_stage_code', selectedStage)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!transitionError && transitions && transitions.length > 0) {
          await supabase
            .from('customer_workflow_transitions')
            .update({ notes: notes.trim() })
            .eq('id', transitions[0].id);
        }
      }

      setShowNotes(false);
      setNotes('');
      if (onStageChanged) onStageChanged();
    } catch (err: any) {
      console.error('Error changing stage:', err);
      setError(err.message);
      setSelectedStage(currentStage); // Revert on error
    } finally {
      setLoading(false);
    }
  };

  const currentStageData = stages.find((s) => s.stage_code === selectedStage);
  const hasChanges = selectedStage !== currentStage;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <select
          value={selectedStage}
          onChange={(e) => {
            setSelectedStage(e.target.value);
            setShowNotes(true);
          }}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        >
          {stages.map((stage) => (
            <option key={stage.id} value={stage.stage_code}>
              {stage.stage_name}
            </option>
          ))}
        </select>
        {hasChanges && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleStageChange}
              disabled={loading}
              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
              title="Save changes"
            >
              <Save className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setSelectedStage(currentStage);
                setShowNotes(false);
                setNotes('');
              }}
              disabled={loading}
              className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <GitBranch className="h-5 w-5 text-blue-600" />
        <h4 className="font-semibold text-gray-900">Change Workflow Stage</h4>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select New Stage
          </label>
          <div className="relative">
            <select
              value={selectedStage}
              onChange={(e) => {
                setSelectedStage(e.target.value);
                setShowNotes(true);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg appearance-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              {stages.map((stage) => (
                <option key={stage.id} value={stage.stage_code}>
                  {stage.stage_order}. {stage.stage_name} ({stage.stage_category})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {showNotes && hasChanges && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this stage transition..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              disabled={loading}
            />
          </div>
        )}

        {currentStageData && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Current:</span> {currentStageData.stage_name}
            </p>
          </div>
        )}

        {hasChanges && (
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleStageChange}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Update Stage
                </>
              )}
            </button>
            <button
              onClick={() => {
                setSelectedStage(currentStage);
                setShowNotes(false);
                setNotes('');
              }}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
