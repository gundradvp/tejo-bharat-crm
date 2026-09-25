import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
  });
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

const customFetch = (url: RequestInfo | URL, options: RequestInit = {}) => {
  console.log('Custom fetch called:', { url, options });

  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  headers.set('Content-Type', 'application/json');

  const modifiedOptions = {
    ...options,
    headers,
    mode: 'cors' as RequestMode,
    credentials: 'omit' as RequestCredentials,
  };

  console.log('Modified fetch options:', modifiedOptions);

  return fetch(url, modifiedOptions)
    .then(response => {
      console.log('Fetch response received:', {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      });
      return response;
    })
    .catch(error => {
      console.error('Fetch error in customFetch:', error);
      throw error;
    });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-application-name': 'tejo-bharat-crm',
    },
    fetch: customFetch,
  },
});

export type UserRole =
  | 'admin' | 'lead_generator' | 'lead_generator_access' | 'employee' | 'finance'
  | 'jsp_admin' | 'jsp_parliament_incharge' | 'jsp_assembly_incharge'
  | 'jsp_mandal_incharge' | 'jsp_village_incharge' | 'jsp_booth_incharge' | 'jsp_sadhak';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  roles?: UserRole[];
  phone?: string;
  is_active: boolean;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  preferences?: Record<string, any>;
  theme?: string;
}

export interface Role {
  id: string;
  name: UserRole;
  display_name: string;
  description?: string;
  created_at: string;
}

export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  assigned_at: string;
}

export const hasRole = (profile: Profile | null, roleName: UserRole): boolean => {
  if (!profile) return false;
  if (profile.roles && profile.roles.length > 0) {
    return profile.roles.includes(roleName);
  }
  return profile.role === roleName;
};

export const hasAnyRole = (profile: Profile | null, roleNames: UserRole[]): boolean => {
  if (!profile) return false;
  if (profile.roles && profile.roles.length > 0) {
    return roleNames.some(role => profile.roles!.includes(role));
  }
  return roleNames.includes(profile.role);
};

export const isAdmin = (profile: Profile | null): boolean => {
  return hasRole(profile, 'admin');
};

export const isLeadGenerator = (profile: Profile | null): boolean => {
  return hasRole(profile, 'lead_generator');
};

export const isEmployee = (profile: Profile | null): boolean => {
  return hasRole(profile, 'employee');
};

export const isFinance = (profile: Profile | null): boolean => {
  return hasRole(profile, 'finance');
};

export const isLeadGeneratorAccess = (profile: Profile | null): boolean => {
  return hasRole(profile, 'lead_generator_access');
};

export const JSP_ROLES: UserRole[] = [
  'jsp_admin', 'jsp_parliament_incharge', 'jsp_assembly_incharge',
  'jsp_mandal_incharge', 'jsp_village_incharge', 'jsp_booth_incharge', 'jsp_sadhak',
];

export const isJSPUser = (profile: Profile | null): boolean => {
  return hasAnyRole(profile, JSP_ROLES);
};

export const isJSPAdmin = (profile: Profile | null): boolean => {
  return hasRole(profile, 'jsp_admin');
};

export const isSolarUser = (profile: Profile | null): boolean =>
  hasAnyRole(profile, ['admin', 'lead_generator', 'lead_generator_access', 'employee', 'finance']);

export const canManageLeadGenerators = (profile: Profile | null): boolean => {
  return isAdmin(profile) || isLeadGeneratorAccess(profile);
};

/**
 * Checks if a profile belongs to Nagarjuna (by full_name or email).
 */
export const isNagarjunaUser = (profile: Profile | null): boolean => {
  if (!profile) return false;
  const name = (profile.full_name || '').toLowerCase();
  const email = (profile.email || '').toLowerCase();
  return name.includes('nagarjuna') || email.includes('nagarjuna');
};

/**
 * Checks if a user has permission to import PM Surya Ghar leads/data.
 * Explicitly granted to Admins, Nagarjuna, Employees, and Lead Generators.
 */
export const canImportSuryaGharLeads = (profile: Profile | null): boolean => {
  if (!profile) return false;
  if (isAdmin(profile)) return true;
  if (isNagarjunaUser(profile)) return true;
  return hasAnyRole(profile, ['employee', 'lead_generator', 'lead_generator_access']);
};

export interface ProjectFinancialSummary {
  id: string;
  customer_id: string;
  agreed_project_cost: number;
  quotation_to_bank: number;
  bank_loan_percentage: number;
  bank_loan_amount: number;
  customer_margin: number;
  margin_provided: number;
  margin_pending: number;
  loan_from_bank_received: number;
  customer_payment_received: number;
  notes: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface MarginTransaction {
  id: string;
  customer_id: string;
  amount: number;
  transaction_date: string;
  description: string;
  collected_back: boolean;
  collected_date: string | null;
  created_by: string;
  tenant_id: string;
  created_at: string;
}

export interface Customer {
  id: string;
  agent_id: string;
  customer_name: string;
  phone: string;
  email?: string;
  address?: string;
  loan_status: 'pending' | 'approved' | 'rejected' | 'not_applicable';
  document_status: 'not_submitted' | 'partial' | 'complete' | 'verified';
  installation_status: 'not_started' | 'scheduled' | 'in_progress' | 'completed';
  subsidy_status: 'not_claimed' | 'claimed' | 'received' | 'rejected';
  overall_status: 'new' | 'in_progress' | 'pending_docs' | 'completed' | 'on_hold';
  current_workflow_stage?: string;
  workflow_stage_updated_at?: string;
  remarks: string;
  state_id?: number;
  district_id?: number;
  constituency_id?: number;
  mandal_id?: number;
  village_id?: number;
  gdrive_folder_url?: string;
  customer_lifecycle_status?: 'active' | 'lost';
  lost_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  customer_id: string;
  assigned_to: string;
  assigned_by: string;
  title: string;
  description?: string;
  task_type: 'document_collection' | 'eb_change' | 'follow_up' | 'installation' | 'verification' | 'other';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  started_at?: string;
  completed_at?: string;
  estimated_duration_minutes?: number;
  remarks: string;
  created_at: string;
  updated_at: string;
}

export interface TaskCustomer {
  id: string;
  task_id: string;
  customer_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  order_index: number;
  notes?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: 'create' | 'update' | 'delete' | 'assign' | 'login' | 'logout';
  entity_type: 'customer' | 'task' | 'profile' | 'template' | 'auth';
  entity_id?: string;
  changes?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  template_type: 'agreement' | 'letter' | 'certificate' | 'notice' | 'report';
  content: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type NoteType = 'general' | 'follow_up' | 'phone_call' | 'meeting' | 'email' | 'issue' | 'resolution' | 'document';

export interface CustomerNote {
  id: string;
  customer_id: string;
  user_id: string;
  note_text: string;
  note_type: NoteType;
  is_pinned: boolean;
  is_private: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface TaskNote {
  id: string;
  task_id: string;
  user_id: string;
  note_text: string;
  note_type: NoteType;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export type ActivityType = 'note_added' | 'status_change' | 'task_assigned' | 'task_completed' | 'document_uploaded' | 'payment_received' | 'customer_created' | 'customer_updated';

export interface ActivityLog {
  id: string;
  entity_type: 'customer' | 'task';
  entity_id: string;
  user_id: string | null;
  activity_type: ActivityType;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
  profiles?: Profile;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  tenant_id: string;
  check_in_time: string;
  check_out_time?: string;
  check_in_location?: {
    latitude: number;
    longitude: number;
  };
  check_out_location?: {
    latitude: number;
    longitude: number;
  };
  status: AttendanceStatus;
  notes: string;
  total_hours?: number;
  date: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface TaskTimeLog {
  id: string;
  task_id: string;
  user_id: string;
  tenant_id: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  task?: Task;
  profiles?: Profile;
}

export type LeaveType = 'casual' | 'sick' | 'vacation' | 'unpaid' | 'maternity' | 'paternity' | 'bereavement' | 'compensatory';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveApplication {
  id: string;
  tenant_id: string;
  user_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  number_of_days: number;
  is_half_day: boolean;
  reason: string;
  status: LeaveStatus;
  applied_date: string;
  reviewed_by?: string;
  reviewed_at?: string;
  reviewer_comments?: string;
  supporting_document_url?: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  reviewer?: Profile;
}

export type TaskCategory = 'project_work' | 'meeting' | 'admin' | 'travel' | 'training' | 'support' | 'general';
export type TaskCompletionStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

export interface DailyTaskEntry {
  id: string;
  tenant_id: string;
  attendance_record_id: string;
  user_id: string;
  task_name: string;
  task_description?: string;
  task_category: TaskCategory;
  estimated_hours: number;
  actual_hours: number;
  completion_status: TaskCompletionStatus;
  linked_task_id?: string;
  linked_customer_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  task?: Task;
  customer?: Customer;
}

export interface LeaveBalance {
  id: string;
  tenant_id: string;
  user_id: string;
  leave_type: LeaveType;
  year: number;
  total_days: number;
  used_days: number;
  remaining_days: number;
  carried_forward_days: number;
  created_at: string;
  updated_at: string;
}

export interface GeoFenceLocation {
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
}

export interface AttendanceValidationRule {
  id: string;
  tenant_id: string;
  rule_name: string;
  late_threshold_minutes: number;
  grace_period_minutes: number;
  min_work_hours: number;
  max_work_hours: number;
  standard_work_start_time: string;
  standard_work_end_time: string;
  geo_fence_enabled: boolean;
  geo_fence_locations: GeoFenceLocation[];
  geo_fence_radius_meters: number;
  is_active: boolean;
  applies_to_roles: string[];
  created_at: string;
  updated_at: string;
}

export interface Holiday {
  id: string;
  tenant_id: string;
  holiday_name: string;
  holiday_date: string;
  is_optional: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export type WorkflowStageCategory = 'Assessment' | 'Documentation' | 'Commercial' | 'Financing' | 'Installation' | 'Regulatory' | 'Subsidy' | 'Closure';

export interface WorkflowStage {
  id: number;
  stage_code: string;
  stage_name: string;
  stage_order: number;
  stage_category: WorkflowStageCategory;
  description?: string;
  is_active: boolean;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerWorkflowTransition {
  id: string;
  customer_id: string;
  from_stage_code?: string;
  to_stage_code: string;
  transition_date: string;
  transitioned_by?: string;
  notes?: string;
  tenant_id: string;
  created_at: string;
  profiles?: Profile;
}

export type LoanStatus = 'not_required' | 'preparing' | 'applied' | 'under_review' | 'sanctioned' | 'rejected' | 'disbursed';
export type DisbursementStatus = 'pending' | 'partial' | 'completed';
export type DisbursementType = 'full' | 'partial';

export interface LoanApplication {
  id: string;
  customer_id: string;
  bank_name?: string;
  bank_branch?: string;
  loan_type: string;
  application_number?: string;
  application_date?: string;
  loan_amount_requested?: number;
  loan_amount_sanctioned?: number;
  sanction_date?: string;
  sanction_letter_url?: string;
  disbursement_type: DisbursementType;
  total_disbursed_amount: number;
  disbursement_status: DisbursementStatus;
  loan_status: LoanStatus;
  documents_submitted_date?: string;
  documents_acknowledged: boolean;
  completion_docs_submitted_date?: string;
  completion_docs_acknowledged: boolean;
  final_disbursement_requested_date?: string;
  remarks?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface LoanDisbursement {
  id: string;
  loan_application_id: string;
  disbursement_number: number;
  disbursement_amount: number;
  disbursement_date?: string;
  disbursement_reference?: string;
  received_in_account: boolean;
  receipt_url?: string;
  notes?: string;
  tenant_id: string;
  created_at: string;
}

export type ShipmentStatus = 'ordered' | 'in_transit' | 'delivered' | 'verified' | 'issues';

export interface MaterialShipment {
  id: string;
  customer_id: string;
  supplier_name?: string;
  order_date?: string;
  order_reference?: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  tracking_number?: string;
  shipment_status: ShipmentStatus;
  items_json?: any;
  delivery_location?: string;
  received_by?: string;
  inspection_completed: boolean;
  inspection_notes?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  received_by_profile?: Profile;
}

export type DiscomSubmissionStatus = 'pending' | 'submitted' | 'acknowledged' | 'approved' | 'rejected' | 'resubmission_required';

export interface DiscomSubmission {
  id: string;
  customer_id: string;
  submission_date?: string;
  submission_reference?: string;
  submitted_by?: string;
  documents_submitted?: string[];
  acknowledgment_received: boolean;
  acknowledgment_number?: string;
  acknowledgment_date?: string;
  submission_status: DiscomSubmissionStatus;
  rejection_reason?: string;
  resubmission_date?: string;
  approval_date?: string;
  approval_reference?: string;
  notes?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  submitted_by_profile?: Profile;
}

export type InspectionStatus = 'pending' | 'scheduled' | 'in_progress' | 'passed' | 'failed' | 'resubmission_required';

export interface DiscomInspection {
  id: string;
  customer_id: string;
  discom_submission_id?: string;
  inspection_scheduled_date?: string;
  inspection_actual_date?: string;
  inspector_name?: string;
  inspector_contact?: string;
  inspection_status: InspectionStatus;
  inspection_result?: string;
  inspection_report_url?: string;
  meter_number?: string;
  meter_installation_date?: string;
  net_metering_approved: boolean;
  net_metering_agreement_url?: string;
  issues_found?: string[];
  corrective_actions_required?: string[];
  reinspection_required: boolean;
  reinspection_date?: string;
  notes?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export type SubsidyApplicationStatus = 'not_claimed' | 'eligible' | 'preparing' | 'submitted' | 'under_review' | 'approved' | 'disbursed' | 'rejected';

export interface SubsidyApplication {
  id: string;
  customer_id: string;
  application_number?: string;
  application_date?: string;
  applied_by?: string;
  subsidy_scheme_name: string;
  eligible_amount?: number;
  claimed_amount?: number;
  approved_amount?: number;
  application_status: SubsidyApplicationStatus;
  documents_submitted?: string[];
  submission_portal?: string;
  submission_reference?: string;
  review_date?: string;
  approval_date?: string;
  approval_reference?: string;
  disbursement_date?: string;
  disbursement_reference?: string;
  disbursed_to_account?: string;
  rejection_reason?: string;
  appeal_filed: boolean;
  appeal_date?: string;
  notes?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  applied_by_profile?: Profile;
}

export type EquipmentType = 'panel' | 'inverter' | 'structure' | 'battery' | 'meter' | 'other';
export type WarrantyStatus = 'pending' | 'registered' | 'active' | 'expired' | 'claimed';

export interface WarrantyRegistration {
  id: string;
  customer_id: string;
  equipment_type: EquipmentType;
  manufacturer_name?: string;
  model_number?: string;
  serial_numbers?: string[];
  installation_date?: string;
  warranty_start_date?: string;
  warranty_period_years?: number;
  warranty_expiry_date?: string;
  registration_date?: string;
  registration_number?: string;
  registration_portal_url?: string;
  warranty_certificate_url?: string;
  registered_by?: string;
  warranty_status: WarrantyStatus;
  warranty_terms?: string;
  amc_included: boolean;
  amc_start_date?: string;
  amc_end_date?: string;
  notes?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  registered_by_profile?: Profile;
}

export type MilestoneType = 'site_prep' | 'structure_mounting' | 'panel_installation' | 'inverter_installation' | 'wiring' | 'earthing' | 'testing' | 'commissioning';
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'issues';

export interface InstallationMilestone {
  id: string;
  customer_id: string;
  milestone_type: MilestoneType;
  milestone_name: string;
  planned_date?: string;
  actual_date?: string;
  completed_by?: string;
  status: MilestoneStatus;
  photos?: string[];
  verification_required: boolean;
  verified_by?: string;
  verification_date?: string;
  quality_check_passed?: boolean;
  issues_found?: string;
  notes?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  completed_by_profile?: Profile;
  verified_by_profile?: Profile;
}
