import { useState, useEffect } from 'react';
import { supabase, WorkflowStage, LoanApplication, MaterialShipment, DiscomSubmission, DiscomInspection, SubsidyApplication, WarrantyRegistration, InstallationMilestone } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { CheckCircle, Clock, AlertCircle, ChevronRight, DollarSign, Package, FileText, Shield, Award, Wrench, X } from 'lucide-react';

interface ProjectWorkflowManagerProps {
  customerId: string;
  currentStage?: string;
  onStageChange?: (newStage: string) => void;
  onClose?: () => void;
}

export default function ProjectWorkflowManager({ customerId, currentStage, onStageChange, onClose }: ProjectWorkflowManagerProps) {
  const { profile } = useAuth();
  const { currentTenant } = useTenant();
  const [workflowStages, setWorkflowStages] = useState<WorkflowStage[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>(currentStage || 'site_survey');
  const [loading, setLoading] = useState(true);
  const [loanData, setLoanData] = useState<LoanApplication | null>(null);
  const [materialData, setMaterialData] = useState<MaterialShipment[]>([]);
  const [discomData, setDiscomData] = useState<DiscomSubmission | null>(null);
  const [inspectionData, setInspectionData] = useState<DiscomInspection | null>(null);
  const [subsidyData, setSubsidyData] = useState<SubsidyApplication | null>(null);
  const [warrantyData, setWarrantyData] = useState<WarrantyRegistration[]>([]);
  const [milestones, setMilestones] = useState<InstallationMilestone[]>([]);

  useEffect(() => {
    loadWorkflowStages();
    loadWorkflowData();
  }, [customerId]);

  const loadWorkflowStages = async () => {
    try {
      const { data, error } = await supabase
        .from('workflow_stages')
        .select('*')
        .eq('tenant_id', currentTenant?.id)
        .eq('is_active', true)
        .order('stage_order');

      if (error) throw error;
      setWorkflowStages(data || []);
    } catch (error) {
      console.error('Error loading workflow stages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkflowData = async () => {
    try {
      const [loanRes, materialRes, discomRes, inspectionRes, subsidyRes, warrantyRes, milestonesRes] = await Promise.all([
        supabase.from('loan_applications').select('*').eq('customer_id', customerId).maybeSingle(),
        supabase.from('material_shipments').select('*').eq('customer_id', customerId),
        supabase.from('discom_submissions').select('*').eq('customer_id', customerId).maybeSingle(),
        supabase.from('discom_inspections').select('*').eq('customer_id', customerId).maybeSingle(),
        supabase.from('subsidy_applications').select('*').eq('customer_id', customerId).maybeSingle(),
        supabase.from('warranty_registrations').select('*').eq('customer_id', customerId),
        supabase.from('installation_milestones').select('*').eq('customer_id', customerId).order('milestone_type'),
      ]);

      setLoanData(loanRes.data);
      setMaterialData(materialRes.data || []);
      setDiscomData(discomRes.data);
      setInspectionData(inspectionRes.data);
      setSubsidyData(subsidyRes.data);
      setWarrantyData(warrantyRes.data || []);
      setMilestones(milestonesRes.data || []);
    } catch (error) {
      console.error('Error loading workflow data:', error);
    }
  };

  const handleStageChange = async (newStage: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          current_workflow_stage: newStage,
          workflow_stage_updated_at: new Date().toISOString()
        })
        .eq('id', customerId);

      if (error) throw error;

      setSelectedStage(newStage);
      if (onStageChange) onStageChange(newStage);
    } catch (error) {
      console.error('Error updating workflow stage:', error);
      alert('Failed to update workflow stage');
    }
  };

  const getStageIcon = (category: string) => {
    switch (category) {
      case 'Financing': return DollarSign;
      case 'Installation': return Wrench;
      case 'Regulatory': return FileText;
      case 'Subsidy': return Award;
      case 'Closure': return Shield;
      default: return CheckCircle;
    }
  };

  const getStageStatus = (stage: WorkflowStage) => {
    const currentOrder = workflowStages.find(s => s.stage_code === selectedStage)?.stage_order || 0;
    if (stage.stage_order < currentOrder) return 'completed';
    if (stage.stage_code === selectedStage) return 'current';
    return 'pending';
  };

  const groupedStages = workflowStages.reduce((acc, stage) => {
    if (!acc[stage.stage_category]) {
      acc[stage.stage_category] = [];
    }
    acc[stage.stage_category].push(stage);
    return acc;
  }, {} as Record<string, WorkflowStage[]>);

  if (loading) {
    return <div className="text-center py-8">Loading workflow...</div>;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Project Workflow Manager</h2>
            <p className="text-sm text-gray-600 mt-1">Track project progress through all stages</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-8">
          {Object.entries(groupedStages).map(([category, stages]) => {
            const Icon = getStageIcon(category);
            return (
              <div key={category} className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <Icon className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stages.map((stage) => {
                    const status = getStageStatus(stage);
                    return (
                      <button
                        key={stage.id}
                        onClick={() => handleStageChange(stage.stage_code)}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          status === 'completed'
                            ? 'bg-green-50 border-green-300'
                            : status === 'current'
                            ? 'bg-blue-50 border-blue-500 shadow-md'
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {status === 'completed' ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : status === 'current' ? (
                                <Clock className="w-5 h-5 text-blue-600" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-gray-400" />
                              )}
                              <span className={`text-sm font-medium ${
                                status === 'current' ? 'text-blue-700' : 'text-gray-700'
                              }`}>
                                {stage.stage_name}
                              </span>
                            </div>
                            {stage.description && (
                              <p className="text-xs text-gray-500 mt-1">{stage.description}</p>
                            )}
                          </div>
                          {status === 'current' && (
                            <ChevronRight className="w-5 h-5 text-blue-600 flex-shrink-0 ml-2" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t px-6 py-4 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Current Stage: <span className="font-semibold">{workflowStages.find(s => s.stage_code === selectedStage)?.stage_name}</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
