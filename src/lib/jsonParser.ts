export interface JSONCustomerData {
  appRefNo: string;
  consumerNo: string;
  consumerName: string;
  mobileNo: string;
  districtName: string;
  discomName: string;
  exportStatus: string;
  appliedCapacity: number;
  submittedOnExport?: string;
}

export interface NativeCRMCustomer {
  id?: string;
  customer_name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  application_ref_no?: string | null;
  consumer_number?: string | null;
  discom_name?: string | null;
  district_name?: string | null;
  loan_status?: string;
  document_status?: string;
  installation_status?: string;
  subsidy_status?: string;
  overall_status?: string;
  current_workflow_stage?: string | null;
  remarks?: string | null;
  state_id?: number | null;
  district_id?: number | null;
  constituency_id?: number | null;
  mandal_id?: number | null;
  village_id?: number | null;
  created_at?: string;
}

export function isNativeCRMFormat(jsonContent: string): boolean {
  try {
    const data = JSON.parse(jsonContent);
    return data?._meta?.format === 'tejobharat-crm-export';
  } catch {
    return false;
  }
}

export function parseNativeCRMJSON(jsonContent: string): NativeCRMCustomer[] {
  const data = JSON.parse(jsonContent);
  if (data?._meta?.format !== 'tejobharat-crm-export') {
    throw new Error('Not a valid Tejo Bharat CRM export file');
  }
  if (!Array.isArray(data.customers)) {
    throw new Error('Export file is missing the customers array');
  }
  return data.customers.filter((c: any) => c.customer_name && c.phone);
}

export function parseCustomerJSON(jsonContent: string): JSONCustomerData[] {
  try {
    const data = JSON.parse(jsonContent);

    if (!Array.isArray(data)) {
      throw new Error('JSON must be an array of customer records');
    }

    return data.map((item: any) => ({
      appRefNo: item.appRefNo || '',
      consumerNo: item.consumerNo || '',
      consumerName: item.consumerName || '',
      mobileNo: item.mobileNo || '',
      districtName: item.districtName || '',
      discomName: item.discomName || '',
      exportStatus: item.exportStatus || item.statusName || '',
      appliedCapacity: item.appliedCapacity || 0,
      submittedOnExport: item.submittedOnExport || item.finalSubmissionDate || '',
    })).filter(customer => customer.appRefNo && customer.consumerName);
  } catch (error: any) {
    throw new Error(`Failed to parse JSON: ${error.message}`);
  }
}

export interface PortalWorkflowStep {
  stepName: string;
  isCompleted: boolean;
  completionDate: string | null;
  startDate: string | null;
}

export interface SuryaGharDetailedCustomer {
  applicationNumber: string;
  consumerName: string;
  consumerNo: string;
  mobileNo: string;
  email: string;
  address: string;
  pincode: string;
  gender: string;
  schemeName: string;
  categoryName: string;
  discomName: string;
  circleName: string;
  divisionName: string;
  subDivisionName: string;
  districtName: string;
  stateName: string;
  stateId: string;
  districtId: string;
  sanctionLoad: string;
  approvedCapacity: string;
  appliedCapacity: string;
  existingCapacity: string;
  netEligibleCapacity: string;
  connectionType: string;
  dcrType: string;
  isAutoApproved: boolean;
  approvedOn: string;
  appSubmissionDate: string;
  submittedDate: string;
  feasibilityDate: string;
  feasibilityStatus: string;
  feasibilityApprovedBy: string;
  feasibilityRemarks: string;
  netMeteringDate: string;
  totalInverterCapacity: string;
  totalModuleCapacity: string;
  vendorName: string;
  loanApplicationNumber: string;
  loanSanctionAmount: string;
  loanSanctionDate: string;
  currentLoanStatus: string;
  ulbType: string;
  villagePanchayatName: string;
  developmentBlockName: string;
  urbanLocalBodyName: string;
  nameAsPerBank: string;
  subsidyAmount: string;
  inverterList: any[];
  moduleList: any[];
  workflowSteps: PortalWorkflowStep[];
  currentStepName: string;
  currentStepStatus: string;
  currentStepDate: string;
}

export function isSuryaGharDetailedFormat(jsonContent: string): boolean {
  try {
    const data = JSON.parse(jsonContent);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
    const keys = Object.keys(data);
    if (keys.length === 0) return false;
    const first = data[keys[0]];
    return first && typeof first === 'object' &&
      (first.viewMoreApplicationDetails || first.completionDetails || first.getAllDetailsOfApplication);
  } catch {
    return false;
  }
}

function safeStr(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function parseDateField(val: any): string {
  if (!val) return '';
  const s = safeStr(val);
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  return d.toISOString();
}

function genderToString(val: any): string {
  const s = safeStr(val);
  if (!s) return '';
  if (s === '1' || s.toLowerCase() === 'male') return 'Male';
  if (s === '2' || s.toLowerCase() === 'female') return 'Female';
  return s;
}

function parseYesNo(val: any): boolean {
  if (val === true) return true;
  const s = safeStr(val).toUpperCase();
  return s === 'Y' || s === 'YES' || s === 'TRUE';
}

export function parseSuryaGharDetailedJSON(jsonContent: string): SuryaGharDetailedCustomer[] {
  const data = JSON.parse(jsonContent);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Detailed export JSON must be an object keyed by application ID');
  }

  const results: SuryaGharDetailedCustomer[] = [];

  for (const appKey of Object.keys(data)) {
    const entry = data[appKey];
    if (!entry || typeof entry !== 'object') continue;

    const viewMore = entry.viewMoreApplicationDetails || {};
    const completion = entry.completionDetails || {};
    const allDetails = entry.getAllDetailsOfApplication || {};

    const applicationNumber = safeStr(viewMore.applicationNumber || allDetails.applicationNumber || appKey);
    const consumerName = safeStr(allDetails.consumerName || viewMore.consumerName);
    const consumerNo = safeStr(allDetails.consumerNo || viewMore.consumerNo || viewMore.registrationNumber);

    if (!applicationNumber || !consumerName) continue;

    const stepDetails = Array.isArray(completion.stepDetails) ? completion.stepDetails : [];
    const workflowSteps: PortalWorkflowStep[] = stepDetails.map((step: any) => ({
      stepName: safeStr(step.stepName || step.name),
      isCompleted: Boolean(step.isCompleted ?? step.completed),
      completionDate: parseDateField(step.completionDate || step.completedDate),
      startDate: parseDateField(step.startDate || step.date),
    }));

    // Use explicit currentStepName/currentStageStatusName from completionDetails
    // (the portal's authoritative fields), falling back to derivation from stepDetails
    const explicitStepName = safeStr(completion.currentStepName);
    const explicitStepStatus = safeStr(completion.currentStageStatusName);

    let currentStepName = explicitStepName;
    let currentStepStatus = explicitStepStatus;

    // Find the matching step's startDate as the currentStepDate
    let currentStepDate = '';
    if (currentStepName) {
      const matchingStep = workflowSteps.find(s => s.stepName === currentStepName);
      if (matchingStep) {
        currentStepDate = matchingStep.startDate || matchingStep.completionDate || '';
      }
    }

    // Fallback: derive from stepDetails if explicit fields are missing
    if (!currentStepName) {
      const lastCompleted = [...workflowSteps].reverse().find(s => s.isCompleted);
      const firstPending = workflowSteps.find(s => !s.isCompleted);

      if (firstPending) {
        currentStepName = firstPending.stepName;
        currentStepStatus = currentStepStatus || 'Pending';
        currentStepDate = firstPending.startDate || (lastCompleted?.completionDate || '');
      } else if (lastCompleted) {
        currentStepName = lastCompleted.stepName;
        currentStepStatus = currentStepStatus || 'Completed';
        currentStepDate = lastCompleted.completionDate || lastCompleted.startDate || '';
      }
    }

    const inverterList = Array.isArray(allDetails.inverterList) ? allDetails.inverterList :
      Array.isArray(viewMore.inverterList) ? viewMore.inverterList : [];
    const moduleList = Array.isArray(allDetails.moduleList) ? allDetails.moduleList :
      Array.isArray(viewMore.moduleList) ? viewMore.moduleList : [];

    results.push({
      applicationNumber,
      consumerName,
      consumerNo,
      mobileNo: safeStr(allDetails.mobile || viewMore.mobileNo),
      email: safeStr(allDetails.email || viewMore.email),
      address: safeStr(allDetails.address || viewMore.address),
      pincode: safeStr(allDetails.pinCode || viewMore.pincode),
      gender: genderToString(allDetails.gender || viewMore.gender),
      schemeName: safeStr(allDetails.schemeName || viewMore.schemeName),
      categoryName: safeStr(allDetails.categoryName || viewMore.categoryName),
      discomName: safeStr(allDetails.discomName || viewMore.discomName),
      circleName: safeStr(allDetails.circleName || viewMore.circleName),
      divisionName: safeStr(allDetails.divisionName || viewMore.divisionName),
      subDivisionName: safeStr(allDetails.subDivisionName || viewMore.subDivName),
      districtName: safeStr(allDetails.districtName || viewMore.districtName),
      stateName: safeStr(allDetails.stateName || viewMore.stateName),
      stateId: safeStr(viewMore.stateId || allDetails.stateId),
      districtId: safeStr(viewMore.districtId || allDetails.districtId),
      sanctionLoad: safeStr(allDetails.sanctionLoad || viewMore.sanctionLoad),
      approvedCapacity: safeStr(allDetails.approvedCapacity || viewMore.approvedCapacity),
      appliedCapacity: safeStr(allDetails.appliedCapacity || viewMore.appliedCapacity),
      existingCapacity: safeStr(allDetails.existingCapacity || viewMore.existingCapacity),
      netEligibleCapacity: safeStr(allDetails.netEligibleCapacity || viewMore.netEligibleCapacity),
      connectionType: safeStr(allDetails.connectionType || viewMore.connectionType),
      dcrType: safeStr(allDetails.dcrType || viewMore.dcrType),
      isAutoApproved: parseYesNo(allDetails.isAutoApproved || viewMore.isAutoApproved),
      approvedOn: parseDateField(allDetails.approvedOn || viewMore.approvedOn),
      appSubmissionDate: parseDateField(allDetails.appSubmissionDate || viewMore.appSubmissionDate),
      submittedDate: parseDateField(allDetails.submittedDate || viewMore.submittedDate),
      feasibilityDate: parseDateField(allDetails.feasibilityDate || viewMore.feasibilityDate),
      feasibilityStatus: safeStr(allDetails.feasibilityStatus || viewMore.feasibilityStatus),
      feasibilityApprovedBy: safeStr(allDetails.feasibilityPerson || allDetails.feasibilityApprovedBy || viewMore.feasibilityApprovedBy),
      feasibilityRemarks: safeStr(allDetails.feasibilityRemarks || viewMore.feasibilityRemarks),
      netMeteringDate: parseDateField(allDetails.netMeteringDate || viewMore.netMeteringDate),
      totalInverterCapacity: safeStr(allDetails.totalInverterCapacity || viewMore.totalInverterCapacity),
      totalModuleCapacity: safeStr(allDetails.totalModuleCapacity || viewMore.totalModuleCapacity),
      vendorName: safeStr(allDetails.vendorName || viewMore.vendorOrganizationName),
      loanApplicationNumber: safeStr(allDetails.loanApplicationNumber || viewMore.loanApplicationNumber),
      loanSanctionAmount: safeStr(allDetails.sanctionAmount || viewMore.sanctionAmount),
      loanSanctionDate: parseDateField(allDetails.sanctionDate || viewMore.sanctionDate),
      currentLoanStatus: safeStr(allDetails.currentLoanStatus || viewMore.currentLoanStatus),
      ulbType: safeStr(allDetails.ulbType || viewMore.ulbType),
      villagePanchayatName: safeStr(allDetails.villagePanchayatName || viewMore.villagePanchayatName),
      developmentBlockName: safeStr(allDetails.developmentBlockName || viewMore.developmentBlockName),
      urbanLocalBodyName: safeStr(allDetails.urbanLocalBodyName || viewMore.urbanLocalBodyName),
      nameAsPerBank: safeStr(allDetails.nameAsPerBank || viewMore.nameAsPerBank),
      subsidyAmount: safeStr(allDetails.subsidyAmount || viewMore.subsidyAmount),
      inverterList,
      moduleList,
      workflowSteps,
      currentStepName,
      currentStepStatus,
      currentStepDate,
    });
  }

  return results;
}

export function mapStatusFromExportStatus(exportStatus: string): {
  documentStatus: 'not_submitted' | 'partial' | 'complete' | 'verified';
  overallStatus: 'new' | 'in_progress' | 'completed' | 'on_hold';
} {
  const normalized = exportStatus.toLowerCase();

  if (normalized.includes('pending')) {
    return {
      documentStatus: 'partial',
      overallStatus: 'in_progress'
    };
  }

  if (normalized.includes('approved') || normalized.includes('verified')) {
    return {
      documentStatus: 'verified',
      overallStatus: 'completed'
    };
  }

  return {
    documentStatus: 'not_submitted',
    overallStatus: 'new'
  };
}
