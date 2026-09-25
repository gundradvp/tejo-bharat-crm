import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  CheckCircle,
  Circle,
  Clock,
  AlertCircle,
  ChevronRight,
  Calendar,
  User
} from 'lucide-react';

interface WorkflowStage {
  id: number;
  stage_code: string;
  stage_name: string;
  stage_order: number;
  stage_category: string;
  description: string;
}

interface WorkflowTransition {
  id: string;
  from_stage_code: string | null;
  to_stage_code: string;
  transition_date: string;
  transitioned_by: string;
  notes: string | null;
  profile: {
    full_name: string;
  };
}

interface Customer {
  id: string;
  name: string;
  current_workflow_stage: string;
  workflow_stage_updated_at: string;
}

interface WorkflowProgressViewProps {
  customerId: string;
}

export default function WorkflowProgressView({ customerId }: WorkflowProgressViewProps) {
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [transitions, setTransitions] = useState<WorkflowTransition[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (customerId) {
      loadWorkflowProgress();
    }
  }, [customerId]);

  const loadWorkflowProgress = async () => {
    try {
      setLoading(true);

      // Load customer
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id, name, current_workflow_stage, workflow_stage_updated_at')
        .eq('id', customerId)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);

      // Load all workflow stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('workflow_stages')
        .select('*')
        .eq('is_active', true)
        .order('stage_order');

      if (stagesError) throw stagesError;
      setStages(stagesData || []);

      // Load workflow transitions
      const { data: transitionsData, error: transitionsError } = await supabase
        .from('customer_workflow_transitions')
        .select(`
          *,
          profile:profiles!customer_workflow_transitions_transitioned_by_fkey(full_name)
        `)
        .eq('customer_id', customerId)
        .order('transition_date', { ascending: false });

      if (transitionsError) throw transitionsError;
      setTransitions(transitionsData || []);
    } catch (err) {
      console.error('Error loading workflow progress:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStageStatus = (stage: WorkflowStage): 'completed' | 'current' | 'pending' => {
    if (!customer) return 'pending';

    const currentStage = stages.find((s) => s.stage_code === customer.current_workflow_stage);
    if (!currentStage) return 'pending';

    if (stage.stage_order < currentStage.stage_order) return 'completed';
    if (stage.stage_code === customer.current_workflow_stage) return 'current';
    return 'pending';
  };

  const getTransitionForStage = (stageCode: string) => {
    return transitions.find((t) => t.to_stage_code === stageCode);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Assessment: 'bg-blue-500',
      Documentation: 'bg-purple-500',
      Commercial: 'bg-green-500',
      Financing: 'bg-yellow-500',
      Installation: 'bg-orange-500',
      Regulatory: 'bg-red-500',
      Subsidy: 'bg-teal-500',
      Closure: 'bg-gray-500',
    };
    return colors[category] || 'bg-gray-500';
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
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Workflow Progress</h3>
        <p className="text-sm text-gray-600 mt-1">
          Track the journey from initial assessment to project completion
        </p>
      </div>

      {/* Progress Timeline */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-6">
          {stages.map((stage, index) => {
            const status = getStageStatus(stage);
            const transition = getTransitionForStage(stage.stage_code);
            const isLast = index === stages.length - 1;

            return (
              <div key={stage.id} className="relative">
                <div className="flex items-start gap-4">
                  {/* Stage Indicator */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                        status === 'completed'
                          ? 'bg-green-500 border-green-500'
                          : status === 'current'
                          ? 'bg-blue-500 border-blue-500'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {status === 'completed' ? (
                        <CheckCircle className="h-6 w-6 text-white" />
                      ) : status === 'current' ? (
                        <Clock className="h-6 w-6 text-white" />
                      ) : (
                        <Circle className="h-6 w-6 text-gray-300" />
                      )}
                    </div>
                    {!isLast && (
                      <div
                        className={`w-0.5 h-16 ${
                          status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                    )}
                  </div>

                  {/* Stage Details */}
                  <div className="flex-1 pb-8">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4
                            className={`font-semibold ${
                              status === 'current'
                                ? 'text-blue-600'
                                : status === 'completed'
                                ? 'text-gray-900'
                                : 'text-gray-400'
                            }`}
                          >
                            {stage.stage_name}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(
                              stage.stage_category
                            )} text-white`}
                          >
                            {stage.stage_category}
                          </span>
                        </div>
                        <p
                          className={`text-sm ${
                            status === 'current' ? 'text-gray-700' : 'text-gray-500'
                          }`}
                        >
                          {stage.description}
                        </p>

                        {/* Transition Info */}
                        {transition && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-4 text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(transition.transition_date).toLocaleDateString()}
                              </div>
                              {transition.profile && (
                                <div className="flex items-center gap-1">
                                  <User className="h-3.5 w-3.5" />
                                  {transition.profile.full_name}
                                </div>
                              )}
                            </div>
                            {transition.notes && (
                              <p className="text-xs text-gray-700 mt-2">{transition.notes}</p>
                            )}
                          </div>
                        )}

                        {/* Current Stage Indicator */}
                        {status === 'current' && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-blue-600">
                            <AlertCircle className="h-4 w-4" />
                            <span className="font-medium">Current Stage</span>
                            {customer?.workflow_stage_updated_at && (
                              <span className="text-gray-500">
                                since{' '}
                                {new Date(customer.workflow_stage_updated_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transition History */}
      {transitions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Stage Transition History</h4>
          <div className="space-y-3">
            {transitions.map((transition) => (
              <div
                key={transition.id}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    {transition.from_stage_code && (
                      <>
                        <span className="font-medium text-gray-700">
                          {stages.find((s) => s.stage_code === transition.from_stage_code)
                            ?.stage_name || transition.from_stage_code}
                        </span>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </>
                    )}
                    <span className="font-medium text-blue-600">
                      {stages.find((s) => s.stage_code === transition.to_stage_code)?.stage_name ||
                        transition.to_stage_code}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{new Date(transition.transition_date).toLocaleString()}</span>
                    {transition.profile && <span>by {transition.profile.full_name}</span>}
                  </div>
                  {transition.notes && (
                    <p className="text-sm text-gray-600 mt-2">{transition.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
