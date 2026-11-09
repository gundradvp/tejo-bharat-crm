import { supabase } from './supabase';

export interface NationalPortalSummary {
  id: string;
  appNum: string;
  name: string;
  phone: string;
  email: string;
  sc: string;
  state: string;
  district: string;
  circle: string;
  division: string;
  subdiv: string;
  village: string;
  address: string;
  pincode: string;
  cap: number;
  sanctionLoad: number;
  stepId: string;
  step: string;
  vendor: string;
  subsidyAmt: number;
  subsidyStatus: string;
  modulesCount: number;
  invertersCount: number;
  docsCount: number;
  hasDcr: boolean;
  panelSerials?: string[];
  invSerials?: string[];
  moduleMfr?: string;
  invMfr?: string;
  loanAppNo?: string;
  loanAmt?: number;
  loanStatus?: string;
  loanDate?: string;
  bankName?: string;
  accountNo?: string;
  ifsc?: string;
  accountHolder?: string;
  netMeterDate: string;
  submissionDate: string;
}

export interface InverterItem {
  id?: number | string;
  capacity?: number;
  qty?: number;
  manufacturerCode?: string;
  manufacturerName?: string;
  phaseName?: string | null;
  serialNumbers?: string[];
  dcrCertificateNumber?: string | null;
  moduleNumber?: string | null;
}

export interface ModuleItem {
  id?: number | string;
  capacity?: number;
  qty?: number;
  manufacturerCode?: string;
  manufacturerName?: string;
  serialNumbers?: string[];
  dcrCertificateNumber?: string | null;
}

export interface DocumentItem {
  fileName?: string;
  filePath?: string;
  docTypeId?: string;
  documentId?: string;
  documentType?: string;
  createdAt?: string;
  fileSize?: string | null;
  docGroup?: string;
}

export interface NationalPortalFullDetail {
  appId: number | string;
  applicationNumber?: string;
  registrationNumber?: string;
  consumerName?: string;
  consumerNo?: string;
  mobile?: string;
  email?: string | null;
  address?: string;
  pinCode?: number | string;
  stateName?: string;
  districtName?: string;
  circleName?: string;
  divisionName?: string;
  subDivisionName?: string;
  villageName?: string;
  villagePanchayatName?: string;
  developmentBlockName?: string;
  urbanLocalBodyName?: string;
  sanctionLoad?: string | number;
  sanctionAmount?: number;
  sanctionDate?: string;
  connectionType?: string;
  categoryName?: string;
  schemeName?: string;
  appliedCapacity?: number;
  pvCapacity?: number | null;
  totalInverterCapacity?: number;
  totalModuleCapacity?: number;
  vendorName?: string;
  stepId?: string | number;
  stepName?: string;
  subsidyAmount?: number;
  subsidyStatus?: string | null;
  loanApplicationNumber?: string | null;
  currentLoanStatus?: string | null;
  netMeteringDate?: string | null;
  inspectionDate?: string | null;
  inspectionByName?: string | null;
  inspectionRemark?: string | null;
  designation?: string | null;
  ifscCode?: string;
  accountHolderName?: string;
  accountNumber?: string;
  bankName?: string;
  bankRemark?: string;
  dcrType?: string;
  isAutoApproved?: string;
  feasibilityDate?: string;
  feasibilityStatus?: string;
  feasibilityPerson?: string;
  inverterList?: InverterItem[];
  moduleList?: ModuleItem[];
  documentList?: DocumentItem[];
  checklistFilledAtInspection?: { checklistName: string; status: string }[];
  appSubmissionDate?: string;
  submittedDate?: string;
}

// In-memory cache for fast responsive UI
let cachedSummaryList: NationalPortalSummary[] | null = null;
let cachedFullCatalog: Record<string, NationalPortalFullDetail> | null = null;

export function invalidateNationalPortalCache(): void {
  cachedSummaryList = null;
  cachedFullCatalog = null;
  cachedNpIndex = null;
}

export async function fetchNationalPortalSummary(forceRefresh = false): Promise<NationalPortalSummary[]> {
  if (!forceRefresh && cachedSummaryList && cachedSummaryList.length > 0) {
    return cachedSummaryList;
  }
  if (forceRefresh) {
    cachedSummaryList = null;
    cachedFullCatalog = null;
    cachedNpIndex = null;
  }

  try {
    const res = await fetch(`/national_portal_summary.json?t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: NationalPortalSummary[] = await res.json();
    cachedSummaryList = data;
    return data;
  } catch (err) {
    console.error('Failed to load national_portal_summary.json:', err);
    return [];
  }
}

export async function fetchNationalPortalDetail(appId: string): Promise<NationalPortalFullDetail | null> {
  // 1. Check in-memory catalog
  if (cachedFullCatalog && cachedFullCatalog[appId]) {
    return cachedFullCatalog[appId];
  }

  // 2. Fetch full catalog if not loaded
  try {
    const res = await fetch('/national_portal_catalog.json');
    if (res.ok) {
      cachedFullCatalog = await res.json();
      if (cachedFullCatalog && cachedFullCatalog[appId]) {
        return cachedFullCatalog[appId];
      }
    }
  } catch (err) {
    console.warn('Could not load national_portal_catalog.json:', err);
  }

  return null;
}

/** Check if this application matches an existing customer in Tejo Bharat CRM */
export async function findMatchingCustomerInCRM(
  appNum?: string,
  sc?: string,
  phone?: string
): Promise<{ exists: boolean; customer: any | null }> {
  try {
    const filters: string[] = [];
    if (appNum) filters.push(`application_ref_no.eq.${appNum.trim()}`);
    if (sc) filters.push(`consumer_number.eq.${sc.trim()}`);
    if (phone) filters.push(`phone.eq.${phone.trim()}`);

    if (filters.length === 0) return { exists: false, customer: null };

    const { data, error } = await supabase
      .from('customers')
      .select('id, customer_name, application_ref_no, consumer_number, phone, overall_status, subsidy_status, installation_status')
      .or(filters.join(','))
      .limit(1);

    if (error || !data || data.length === 0) {
      return { exists: false, customer: null };
    }

    return { exists: true, customer: data[0] };
  } catch (err) {
    return { exists: false, customer: null };
  }
}

/** Sync or promote this National Portal application directly into Tejo Bharat CRM Customers table */
export async function syncApplicationToCRMCustomer(
  detail: NationalPortalFullDetail,
  tenantId: string,
  existingCustomerId?: string
): Promise<{ success: boolean; customerId?: string; error?: string }> {
  try {
    const now = new Date().toISOString();

    const payload: Record<string, any> = {
      customer_name: detail.consumerName || 'Portal Customer',
      application_ref_no: detail.applicationNumber || (detail.appId ? `NP-${detail.appId}` : null),
      consumer_number: detail.consumerNo || null,
      phone: detail.mobile || null,
      email: detail.email || null,
      address: detail.address || null,
      pincode: detail.pinCode ? String(detail.pinCode) : null,
      district_name: detail.districtName || null,
      eb_distribution: detail.circleName || null,
      discom_division: detail.divisionName || null,
      discom_subdivision: detail.subDivisionName || null,
      sanction_load: detail.sanctionLoad ? String(detail.sanctionLoad) : null,
      applied_capacity: detail.appliedCapacity ? String(detail.appliedCapacity) : null,
      connection_type: detail.connectionType || null,
      category_name: detail.categoryName || 'Residential',
      scheme_name: detail.schemeName || 'PM Surya Ghar',
      vendor_name: detail.vendorName || 'Tejo Bharat Global Energy LLP',
      subsidy_amount: detail.subsidyAmount || null,
      subsidy_status: detail.subsidyStatus || 'Pending',
      net_metering_date: detail.netMeteringDate || null,
      loan_application_number: detail.loanApplicationNumber || null,
      current_loan_status: detail.currentLoanStatus || null,
      portal_inverter_list: detail.inverterList && detail.inverterList.length > 0 ? detail.inverterList : null,
      portal_module_list: detail.moduleList && detail.moduleList.length > 0 ? detail.moduleList : null,
      portal_current_step_name: detail.stepName || null,
      portal_current_step_status: detail.stepName || null,
      portal_current_step_date: detail.appSubmissionDate || detail.submittedDate || now,
      import_source: 'pm_surya_ghar_national_portal',
      customer_lifecycle_status: 'active',
      updated_at: now
    };

    if (existingCustomerId) {
      // Update existing customer
      const { error } = await supabase
        .from('customers')
        .update(payload)
        .eq('id', existingCustomerId);

      if (error) throw error;
      return { success: true, customerId: existingCustomerId };
    } else {
      // Create new customer
      payload.tenant_id = tenantId;
      payload.created_at = now;
      payload.overall_status = 'in_progress';
      payload.document_status = 'partial';
      payload.installation_status = detail.stepName?.toLowerCase().includes('installation') || detail.stepName?.toLowerCase().includes('inspection') ? 'completed' : 'pending';

      const { data, error } = await supabase
        .from('customers')
        .insert([payload])
        .select('id')
        .single();

      if (error) throw error;
      return { success: true, customerId: data.id };
    }
  } catch (err: any) {
    console.error('Error syncing to CRM customer:', err);
    return { success: false, error: err.message || 'Sync failed' };
  }
}

export interface NationalPortalIndex {
  bySc: Map<string, NationalPortalSummary>;
  byNpNum: Map<string, NationalPortalSummary>;
  byPhone: Map<string, NationalPortalSummary>;
  allScSet: Set<string>;
}

let cachedNpIndex: NationalPortalIndex | null = null;

export async function getNationalPortalIndex(forceRefresh = false): Promise<NationalPortalIndex> {
  if (!forceRefresh && cachedNpIndex) {
    return cachedNpIndex;
  }

  const list = await fetchNationalPortalSummary(forceRefresh);
  const bySc = new Map<string, NationalPortalSummary>();
  const byNpNum = new Map<string, NationalPortalSummary>();
  const byPhone = new Map<string, NationalPortalSummary>();
  const allScSet = new Set<string>();

  list.forEach((item) => {
    if (item.sc) {
      const scClean = item.sc.trim();
      if (scClean) {
        bySc.set(scClean, item);
        allScSet.add(scClean);
      }
    }
    if (item.appNum) {
      const appClean = item.appNum.trim().toUpperCase();
      if (appClean) byNpNum.set(appClean, item);
    }
    if (item.id) {
      const idClean = item.id.trim().toUpperCase();
      if (idClean) byNpNum.set(idClean, item);
    }
    if (item.phone) {
      const phoneDigits = item.phone.replace(/\D/g, '').slice(-10);
      if (phoneDigits.length === 10) {
        byPhone.set(phoneDigits, item);
      }
    }
  });

  cachedNpIndex = { bySc, byNpNum, byPhone, allScSet };
  return cachedNpIndex;
}

/**
 * Intelligent Multi-Key Matcher:
 * 1. Primary: Exact SC Number match (DISCOM Service Connection)
 * 2. Secondary: NP Registration / App Number match
 * 3. Tertiary: 10-digit mobile number match
 */
export function matchProspectWithNationalPortal(
  prospect: {
    sc_number?: string | null;
    np_registration_number?: string | null;
    mobile_number?: string | null;
    phone?: string | null;
  },
  index: NationalPortalIndex | null
): NationalPortalSummary | null {
  if (!index) return null;

  // 1. SC Number (Highest confidence, unique consumer electricity service)
  if (prospect.sc_number) {
    const scClean = prospect.sc_number.trim();
    if (scClean && index.bySc.has(scClean)) {
      return index.bySc.get(scClean)!;
    }
  }

  // 2. National Portal Registration / App ID
  if (prospect.np_registration_number) {
    const npClean = prospect.np_registration_number.trim().toUpperCase();
    if (npClean && index.byNpNum.has(npClean)) {
      return index.byNpNum.get(npClean)!;
    }
  }

  // 3. Mobile Number (10 digits)
  const phone = (prospect.mobile_number || prospect.phone || '').replace(/\D/g, '').slice(-10);
  if (phone.length === 10 && index.byPhone.has(phone)) {
    return index.byPhone.get(phone)!;
  }

  return null;
}

export function hasNationalPortalInfo(
  prospect: {
    sc_number?: string | null;
    np_registration_number?: string | null;
    national_portal_status?: string | null;
    mobile_number?: string | null;
    phone?: string | null;
  },
  index: NationalPortalIndex | null
): boolean {
  if (!index) return false;
  return matchProspectWithNationalPortal(prospect, index) !== null;
}
