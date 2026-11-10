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
  dcrLinkedSerials?: string[];
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
  loanSanctionAmount?: number;
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

export interface NationalPortalFilterParams {
  page: number;
  pageSize: number;
  search?: string;
  vendorSearch?: string;
  state?: string;
  district?: string;
  step?: string;
  vendor?: string;
  capacity?: string;
  equipment?: 'ALL' | 'PANELS' | 'INVERTERS' | 'LOAN' | 'SUBSIDY';
}

export interface NationalPortalPageResult {
  items: NationalPortalSummary[];
  total: number;
}

export interface NationalPortalFilterMetadata {
  states: string[];
  stateDistrictMap: Record<string, string[]>;
  steps: string[];
  vendors: { name: string; count: number }[];
}

export function mapRowToSummary(row: any): NationalPortalSummary {
  return {
    id: String(row.id || ''),
    appNum: row.app_num || '',
    name: row.name || '',
    phone: row.phone || '',
    email: row.email || '',
    sc: row.sc || '',
    state: row.state || '',
    district: row.district || '',
    circle: row.circle || '',
    division: row.division || '',
    subdiv: row.subdiv || '',
    village: row.village || '',
    address: row.address || '',
    pincode: row.pincode || '',
    cap: Number(row.cap) || 0,
    sanctionLoad: Number(row.sanction_load) || 0,
    stepId: row.step_id || '',
    step: row.step || '',
    vendor: row.vendor || '',
    subsidyAmt: Number(row.subsidy_amt) || 0,
    subsidyStatus: row.subsidy_status || '',
    modulesCount: Number(row.modules_count) || 0,
    invertersCount: Number(row.inverters_count) || 0,
    docsCount: Number(row.docs_count) || 0,
    hasDcr: Boolean(row.has_dcr),
    panelSerials: Array.isArray(row.panel_serials) ? row.panel_serials : [],
    dcrLinkedSerials:
      row.raw_details && typeof row.raw_details === 'object' && row.raw_details.dcrChains && typeof row.raw_details.dcrChains === 'object'
        ? Object.keys(row.raw_details.dcrChains)
        : [],
    invSerials: Array.isArray(row.inv_serials) ? row.inv_serials : [],
    moduleMfr: row.module_mfr || '',
    invMfr: row.inv_mfr || '',
    loanAppNo: row.loan_app_no || '',
    loanAmt: Number(row.loan_amt) || 0,
    loanStatus: row.loan_status || '',
    loanDate: row.loan_date || '',
    bankName: row.bank_name || '',
    accountNo: row.account_no || '',
    ifsc: row.ifsc || '',
    accountHolder: row.account_holder || '',
    netMeterDate: row.net_meter_date || '',
    submissionDate: row.submission_date || '',
  };
}

let cachedFilterMeta: NationalPortalFilterMetadata | null = null;

export function invalidateNationalPortalCache(): void {
  cachedFilterMeta = null;
  cachedNpIndex = null;
}

/**
 * Fetch filter metadata (States, Districts, Steps, Top Vendors) in a tiny ~34 KB payload
 */
export async function fetchNationalPortalFilters(): Promise<NationalPortalFilterMetadata> {
  if (cachedFilterMeta) return cachedFilterMeta;

  try {
    const res = await fetch(`/national_portal_filters.json?t=${Date.now()}`);
    if (res.ok) {
      cachedFilterMeta = await res.json();
      return cachedFilterMeta!;
    }
  } catch (err) {
    console.warn('Could not load national_portal_filters.json, falling back:', err);
  }

  return {
    states: [],
    stateDistrictMap: {},
    steps: [],
    vendors: []
  };
}

function applyNationalPortalQueryFilters(
  query: any,
  params: Omit<NationalPortalFilterParams, 'page' | 'pageSize'>
): any {
  const { search, vendorSearch, state, district, step, vendor, capacity, equipment } = params;

  if (search && search.trim()) {
    const s = search.trim();
    query = query.or(`name.ilike.%${s}%,app_num.ilike.%${s}%,id.ilike.%${s}%,sc.ilike.%${s}%,phone.ilike.%${s}%,district.ilike.%${s}%,vendor.ilike.%${s}%`);
  }
  if (vendorSearch && vendorSearch.trim()) {
    query = query.ilike('vendor', `%${vendorSearch.trim()}%`);
  }
  if (state && state !== 'ALL') query = query.eq('state', state);
  if (district && district !== 'ALL') query = query.eq('district', district);
  if (step && step !== 'ALL') query = query.eq('step', step);
  if (vendor && vendor !== 'ALL') query = query.eq('vendor', vendor);

  if (capacity && capacity !== 'ALL') {
    if (capacity === '1') query = query.gte('cap', 0.5).lte('cap', 1.5);
    else if (capacity === '2') query = query.gt('cap', 1.5).lte('cap', 2.5);
    else if (capacity === '3') query = query.gt('cap', 2.5).lte('cap', 3.5);
    else if (capacity === '1-3') query = query.gte('cap', 1).lte('cap', 3);
    else if (capacity === '3-5') query = query.gt('cap', 3).lte('cap', 5);
    else if (capacity === '4-10') query = query.gt('cap', 3.5).lte('cap', 10);
    else if (capacity === '5-10') query = query.gt('cap', 5).lte('cap', 10);
    else if (capacity === '10+') query = query.gt('cap', 10);
  }

  if (equipment === 'PANELS') query = query.gt('modules_count', 0);
  else if (equipment === 'INVERTERS') query = query.gt('inverters_count', 0);
  else if (equipment === 'LOAN') query = query.gt('loan_amt', 0);
  else if (equipment === 'SUBSIDY') query = query.gt('subsidy_amt', 0);

  return query;
}

/**
 * Server-side Paginated Query via Supabase
 * Replaces client-side 103 MB JSON loading with lightweight 50-row queries.
 */
export async function fetchNationalPortalPaginated(
  params: NationalPortalFilterParams
): Promise<NationalPortalPageResult> {
  const { page, pageSize } = params;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('national_portal_applications')
    .select('*', { count: 'exact' });

  query = applyNationalPortalQueryFilters(query, params)
    .order('id', { ascending: false })
    .range(offset, offset + pageSize - 1);

  const { data, count, error } = await query;
  if (error) {
    console.error('Error querying Supabase national_portal_applications:', error);
    return { items: [], total: 0 };
  }

  const items = (data || []).map(mapRowToSummary);
  return { items, total: count ?? items.length };
}

export interface ExportPanelSerialItem {
  serial: string;
  appId: string;
  appNum: string;
  consumerName: string;
  vendor: string;
  sc: string;
  step: string;
  cap: number;
}

/**
 * Fetches panel serial numbers for all National Portal apps matching active filters.
 */
export async function fetchNationalPortalPanelSerialsForExport(
  params: Omit<NationalPortalFilterParams, 'page' | 'pageSize'>,
  options: {
    limit?: number;
    excludeSerials?: Set<string>;
    excludeSupabaseLinked?: boolean;
    includeMetadata?: boolean;
    onProgress?: (count: number) => void;
  } = {}
): Promise<ExportPanelSerialItem[]> {
  const {
    limit,
    excludeSerials,
    excludeSupabaseLinked = !excludeSerials || excludeSerials.size === 0,
    includeMetadata = false,
    onProgress,
  } = options;
  const results: ExportPanelSerialItem[] = [];
  const seen = new Set<string>();

  let excludeUpper: Set<string> | null = null;
  if (excludeSerials && excludeSerials.size > 0) {
    // Fast-path: getDcrSerialsSet() is already trimmed & uppercased; avoid cloning 480k+ entries
    let isPreNormalized = true;
    let checked = 0;
    for (const s of excludeSerials) {
      if (s !== s.trim().toUpperCase()) {
        isPreNormalized = false;
        break;
      }
      if (++checked >= 20) break;
    }
    excludeUpper = isPreNormalized
      ? excludeSerials
      : new Set(Array.from(excludeSerials).map((s) => String(s || '').trim().toUpperCase()).filter(Boolean));
  }

  const BATCH_SIZE = 1000;
  const selectCols = includeMetadata
    ? excludeSupabaseLinked
      ? 'id, app_num, name, vendor, sc, step, cap, panel_serials, dcr_chains:raw_details->dcrChains'
      : 'id, app_num, name, vendor, sc, step, cap, panel_serials'
    : excludeSupabaseLinked
    ? 'id, panel_serials, dcr_chains:raw_details->dcrChains'
    : 'id, panel_serials';

  // Use primary-key keyset pagination (ascending) so Postgres uses the PK index (O(log N))
  // instead of slow OFFSET scans, and hits unlinked records immediately instead of wading through 70k+ linked rows.
  let lastId = '';

  while (limit == null || results.length < limit) {
    let query = supabase
      .from('national_portal_applications')
      .select(selectCols)
      .gt('modules_count', 0);

    query = applyNationalPortalQueryFilters(query, params)
      .order('id', { ascending: true })
      .limit(BATCH_SIZE);

    if (lastId) {
      query = query.gt('id', lastId);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) break;

    lastId = String((data[data.length - 1] as any).id || '');

    for (const row of data as any[]) {
      const dbLinkedUpper =
        excludeSupabaseLinked && row.dcr_chains && typeof row.dcr_chains === 'object'
          ? new Set(Object.keys(row.dcr_chains).map((k) => String(k || '').trim().toUpperCase()).filter(Boolean))
          : null;

      const serials = Array.isArray(row.panel_serials) ? row.panel_serials : [];
      for (const rawS of serials) {
        const serial = String(rawS || '').trim();
        if (!serial) continue;
        const upper = serial.toUpperCase();
        if (seen.has(upper)) continue;
        if (excludeUpper && excludeUpper.has(upper)) continue;
        if (dbLinkedUpper && dbLinkedUpper.has(upper)) continue;
        seen.add(upper);
        results.push({
          serial,
          appId: String(row.id || ''),
          appNum: includeMetadata ? row.app_num || '' : '',
          consumerName: includeMetadata ? row.name || '' : '',
          vendor: includeMetadata ? row.vendor || '' : '',
          sc: includeMetadata ? row.sc || '' : '',
          step: includeMetadata ? row.step || '' : '',
          cap: includeMetadata ? Number(row.cap) || 0 : 0,
        });
        if (limit != null && results.length >= limit) break;
      }
      if (limit != null && results.length >= limit) break;
    }

    onProgress?.(results.length);
    if (data.length < BATCH_SIZE) break;
  }

  return limit != null ? results.slice(0, limit) : results;
}

/**
 * Lightweight fetch for legacy components: returns top 100 rows instead of 103 MB!
 */
export async function fetchNationalPortalSummary(_forceRefresh = false): Promise<NationalPortalSummary[]> {
  try {
    const res = await fetchNationalPortalPaginated({ page: 1, pageSize: 100 });
    return res.items;
  } catch {
    return [];
  }
}

/**
 * Fetch detail for a single application from Supabase (< 2 KB instead of 378 MB!)
 */
export async function fetchNationalPortalDetail(appId: string): Promise<NationalPortalFullDetail | null> {
  if (!appId) return null;

  try {
    const { data, error } = await supabase
      .from('national_portal_applications')
      .select('*')
      .eq('id', String(appId).trim())
      .maybeSingle();

    if (!error && data) {
      const raw = data.raw_details;
      if (raw && typeof raw === 'object' && (raw.appId || raw.consumerName || raw.moduleList)) {
        return raw as NationalPortalFullDetail;
      }

      return {
        appId: data.id,
        applicationNumber: data.app_num || undefined,
        registrationNumber: data.app_num || undefined,
        consumerName: data.name || undefined,
        consumerNo: data.sc || undefined,
        mobile: data.phone || undefined,
        email: data.email || null,
        address: data.address || undefined,
        pinCode: data.pincode || undefined,
        stateName: data.state || undefined,
        districtName: data.district || undefined,
        circleName: data.circle || undefined,
        divisionName: data.division || undefined,
        subDivisionName: data.subdiv || undefined,
        villageName: data.village || undefined,
        sanctionLoad: data.sanction_load || undefined,
        appliedCapacity: data.cap || undefined,
        vendorName: data.vendor || undefined,
        stepId: data.step_id || undefined,
        stepName: data.step || undefined,
        subsidyAmount: data.subsidy_amt || undefined,
        subsidyStatus: data.subsidy_status || null,
        loanApplicationNumber: data.loan_app_no || null,
        loanSanctionAmount: data.loan_amt || undefined,
        currentLoanStatus: data.loan_status || null,
        netMeteringDate: data.net_meter_date || null,
        bankName: data.bank_name || undefined,
        accountNumber: data.account_no || undefined,
        ifscCode: data.ifsc || undefined,
        accountHolderName: data.account_holder || undefined,
        appSubmissionDate: data.submission_date || undefined,
        submittedDate: data.submission_date || undefined,
        moduleList: (data.panel_serials || []).map((s: string, idx: number) => ({
          id: idx + 1,
          serialNumbers: [s],
          manufacturerName: data.module_mfr || undefined
        })),
        inverterList: (data.inv_serials || []).map((s: string, idx: number) => ({
          id: idx + 1,
          serialNumbers: [s],
          manufacturerName: data.inv_mfr || undefined
        })),
        ...(data.raw_details && typeof data.raw_details === 'object' && data.raw_details.dcrChains
          ? { dcrChains: data.raw_details.dcrChains }
          : {}),
      };
    }
  } catch (err) {
    console.warn('Failed to fetch detail from Supabase:', err);
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
  } catch {
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
      const { error } = await supabase
        .from('customers')
        .update(payload)
        .eq('id', existingCustomerId);

      if (error) throw error;
      return { success: true, customerId: existingCustomerId };
    } else {
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

/**
 * Lightweight stub: returns an empty map immediately so background callers
 * never block or download 103 MB into browser memory!
 */
export async function getNationalPortalIndex(_forceRefresh = false): Promise<NationalPortalIndex> {
  if (cachedNpIndex) return cachedNpIndex;
  cachedNpIndex = {
    bySc: new Map(),
    byNpNum: new Map(),
    byPhone: new Map(),
    allScSet: new Set()
  };
  return cachedNpIndex;
}

/**
 * Batch lookup matching National Portal applications for SC numbers visible on screen
 */
export function extractNpAppId(npReg?: string | null): string | null {
  if (!npReg) return null;
  let str = String(npReg).trim();
  if (!str || str === '-' || str === '--' || str === 'N/A' || str === 'NA') return null;
  str = str.replace(/\/\d{2,4}$/, '');
  const lastHyphen = str.lastIndexOf('-');
  if (lastHyphen !== -1) str = str.slice(lastHyphen + 1).trim();
  const slashIdx = str.indexOf('/');
  if (slashIdx !== -1) str = str.slice(0, slashIdx).trim();
  return str.length > 0 ? str : null;
}

/**
 * Batch lookup matching National Portal applications for prospects visible on screen
 * by Service Number (sc) AND NP Registration Number (app_num / extracted id).
 */
export async function fetchNationalPortalForProspects(
  prospects: Array<{ sc_number?: string | null; np_registration_number?: string | null }>
): Promise<NationalPortalIndex> {
  const index: NationalPortalIndex = {
    bySc: new Map(),
    byNpNum: new Map(),
    byPhone: new Map(),
    allScSet: new Set(),
  };
  if (!prospects || prospects.length === 0) return index;

  const cleanScs = Array.from(new Set(prospects.map((p) => p.sc_number?.trim()).filter(Boolean) as string[]));
  const cleanNpRegs = Array.from(new Set(prospects.map((p) => p.np_registration_number?.trim()).filter(Boolean) as string[]));
  const cleanNpIds = Array.from(
    new Set(
      cleanNpRegs
        .flatMap((reg) => {
          const extracted = extractNpAppId(reg);
          if (!extracted) return [];
          const stripped = extracted.replace(/^0+/, '');
          return stripped && stripped !== extracted ? [extracted, stripped] : [extracted];
        })
    )
  );

  const indexRow = (row: any) => {
    const summary = mapRowToSummary(row);
    if (summary.sc) {
      index.bySc.set(summary.sc.trim(), summary);
      index.allScSet.add(summary.sc.trim());
    }
    if (summary.appNum) {
      index.byNpNum.set(summary.appNum.trim().toUpperCase(), summary);
    }
    if (summary.id) {
      const idStr = String(summary.id).trim();
      index.byNpNum.set(idStr.toUpperCase(), summary);
      const stripped = idStr.replace(/^0+/, '');
      if (stripped) index.byNpNum.set(stripped.toUpperCase(), summary);
    }
  };

  const runBatchQuery = async (column: 'sc' | 'app_num' | 'id', values: string[]) => {
    const BATCH = 150;
    const chunks: string[][] = [];
    for (let i = 0; i < values.length; i += BATCH) {
      chunks.push(values.slice(i, i + BATCH));
    }
    const CONCURRENCY = 6;
    for (let i = 0; i < chunks.length; i += CONCURRENCY) {
      const group = chunks.slice(i, i + CONCURRENCY);
      await Promise.all(
        group.map(async (chunk) => {
          const { data, error } = await supabase
            .from('national_portal_applications')
            .select('*')
            .in(column, chunk);
          if (!error && data) {
            for (const row of data) indexRow(row);
          }
        })
      );
    }
  };

  await Promise.all([
    cleanScs.length > 0 ? runBatchQuery('sc', cleanScs) : Promise.resolve(),
    cleanNpRegs.length > 0 ? runBatchQuery('app_num', cleanNpRegs) : Promise.resolve(),
    cleanNpIds.length > 0 ? runBatchQuery('id', cleanNpIds) : Promise.resolve(),
  ]);

  return index;
}

export async function fetchNationalPortalByScBatch(scList: string[]): Promise<Map<string, NationalPortalSummary>> {
  const idx = await fetchNationalPortalForProspects(scList.map((sc) => ({ sc_number: sc })));
  return idx.bySc;
}

export async function fetchNationalPortalBySc(sc: string, npRegNumber?: string | null): Promise<NationalPortalSummary | null> {
  const cleanSc = sc?.trim();
  if (cleanSc) {
    const { data, error } = await supabase
      .from('national_portal_applications')
      .select('*')
      .eq('sc', cleanSc)
      .limit(1)
      .maybeSingle();

    if (!error && data) return mapRowToSummary(data);
  }

  const cleanNp = npRegNumber?.trim();
  if (cleanNp) {
    const { data: byAppNum } = await supabase
      .from('national_portal_applications')
      .select('*')
      .eq('app_num', cleanNp)
      .limit(1)
      .maybeSingle();
    if (byAppNum) return mapRowToSummary(byAppNum);

    const extracted = extractNpAppId(cleanNp);
    if (extracted) {
      const candidates = [extracted, extracted.replace(/^0+/, '')].filter(Boolean);
      const { data: byId } = await supabase
        .from('national_portal_applications')
        .select('*')
        .in('id', candidates)
        .limit(1)
        .maybeSingle();
      if (byId) return mapRowToSummary(byId);
    }
  }

  return null;
}

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
  if (prospect.sc_number) {
    const scClean = prospect.sc_number.trim();
    if (scClean && index.bySc.has(scClean)) return index.bySc.get(scClean)!;
  }
  if (prospect.np_registration_number) {
    const npClean = prospect.np_registration_number.trim().toUpperCase();
    if (npClean && index.byNpNum.has(npClean)) return index.byNpNum.get(npClean)!;
    const extracted = extractNpAppId(prospect.np_registration_number);
    if (extracted) {
      const extUpper = extracted.toUpperCase();
      if (index.byNpNum.has(extUpper)) return index.byNpNum.get(extUpper)!;
      const stripped = extUpper.replace(/^0+/, '');
      if (stripped && index.byNpNum.has(stripped)) return index.byNpNum.get(stripped)!;
    }
  }
  const phone = (prospect.mobile_number || prospect.phone || '').replace(/\D/g, '').slice(-10);
  if (phone.length === 10 && index.byPhone.has(phone)) return index.byPhone.get(phone)!;

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
  if (prospect.national_portal_status && prospect.national_portal_status.trim() !== '') return true;
  if (prospect.np_registration_number && prospect.np_registration_number.trim() !== '') return true;
  if (!index) return false;
  return matchProspectWithNationalPortal(prospect, index) !== null;
}

function extractSerials(list: any[]): string[] {
  if (!Array.isArray(list)) return [];
  const serials: string[] = [];
  for (const item of list) {
    if (!item) continue;
    if (Array.isArray(item.serialNumbers)) {
      for (const s of item.serialNumbers) {
        if (typeof s === 'string') {
          const t = s.trim(); if (t) serials.push(t);
        } else if (s && typeof s === 'object' && s.serialNumber) {
          const t = String(s.serialNumber).trim(); if (t) serials.push(t);
        }
      }
    } else if (item.serialNumber && typeof item.serialNumber === 'string') {
      const t = item.serialNumber.trim(); if (t) serials.push(t);
    }
  }
  return Array.from(new Set(serials));
}

/**
 * Direct Browser-to-Supabase Importer
 * Runs parallel batch upserts and parallel prospect enrichment (by SC # and NP Reg #)
 * with automatic sub-batch fallback so zero records are lost.
 */
export async function importNationalPortalRecordsToSupabase(
  records: any[],
  onProgress?: (processed: number, total: number) => void
): Promise<{ added: number; updated: number; skipped: number; total: number; prospectsUpdated: number; customersUpdated: number }> {
  let added = 0;
  const updated = 0;
  let skipped = 0;
  let prospectsUpdated = 0;
  const customersUpdated = 0;

  // Deduplicate by appId upfront (keeping the latest occurrence)
  const dedupedMap = new Map<string, any>();
  for (const d of records) {
    if (!d || d.error || !d.appId) {
      skipped++;
      continue;
    }
    dedupedMap.set(String(d.appId), d);
  }
  const validRecords = Array.from(dedupedMap.values());
  const totalToProcess = validRecords.length;
  let processed = 0;

  const upsertBatchWithFallback = async (rows: any[]): Promise<void> => {
    const { error } = await supabase
      .from('national_portal_applications')
      .upsert(rows, { onConflict: 'id' });

    if (!error) return;

    // If batch payload was too large or timed out, split into smaller sub-batches automatically
    if (rows.length > 25) {
      const mid = Math.ceil(rows.length / 2);
      await upsertBatchWithFallback(rows.slice(0, mid));
      await upsertBatchWithFallback(rows.slice(mid));
      return;
    }

    console.error('Error upserting batch to Supabase:', error.message);
    throw new Error(`Database error: ${error.message}`);
  };

  const BATCH_SIZE = 120;
  const chunks: any[][] = [];
  for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
    chunks.push(validRecords.slice(i, i + BATCH_SIZE));
  }

  const CONCURRENCY = 4;
  for (let c = 0; c < chunks.length; c += CONCURRENCY) {
    const group = chunks.slice(c, c + CONCURRENCY);

    await Promise.all(
      group.map(async (chunk) => {
        const dbRows: any[] = [];
        const scToRecord = new Map<string, any>();
        const npToRecord = new Map<string, any>();
        const nowIso = new Date().toISOString();

        for (const d of chunk) {
          const pSerials = extractSerials(d.moduleList);
          const iSerials = extractSerials(d.inverterList);
          const sc = (d.consumerNo || d.consumerNumber || '').trim();
          const appNum = (d.applicationNumber || d.registrationNumber || '').trim();
          if (sc && sc.length > 5) scToRecord.set(sc, d);
          if (appNum) npToRecord.set(appNum.toUpperCase(), d);

          dbRows.push({
            id: String(d.appId),
            app_num: appNum || null,
            name: d.consumerName || d.applicantName || null,
            phone: (d.mobile || '').replace(/\D/g, '').slice(-10) || null,
            email: d.email || null,
            sc: sc || null,
            state: d.stateName || null,
            district: d.districtName || null,
            circle: d.circleName || null,
            division: d.divisionName || null,
            subdiv: d.subDivisionName || null,
            village: d.villagePanchayatName || d.villageName || null,
            address: d.address || null,
            pincode: d.pinCode ? String(d.pinCode) : null,
            cap: Number(d.appliedCapacity) || Number(d.pvCapacity) || 0,
            sanction_load: Number(d.sanctionLoad) || 0,
            step_id: d.stepId ? String(d.stepId) : null,
            step: d.stepName || null,
            vendor: d.vendorName || null,
            subsidy_amt: Number(d.subsidyAmount) || 0,
            subsidy_status: d.subsidyStatus || null,
            modules_count: (d.moduleList || []).length,
            inverters_count: (d.inverterList || []).length,
            docs_count: (d.documentList || []).length,
            has_dcr: Boolean(d.dcrType || d.hasDcr),
            panel_serials: pSerials,
            inv_serials: iSerials,
            module_mfr: d.brand || null,
            loan_app_no: d.loanApplicationNumber || null,
            loan_amt: Number(d.sanctionAmount) || 0,
            loan_status: d.currentLoanStatus || null,
            bank_name: d.bankName || null,
            account_no: d.accountNumber || null,
            ifsc: d.ifscCode || null,
            account_holder: d.accountHolderName || null,
            net_meter_date: d.netMeteringDate || null,
            submission_date: d.appSubmissionDate || d.submittedDate || null,
            raw_details: d,
            updated_at: nowIso,
          });
        }

        if (dbRows.length > 0) {
          await upsertBatchWithFallback(dbRows);
          added += dbRows.length;
        }

        // Enrich matching lead_prospects in parallel (by SC number AND NP Registration Number)
        const scList = Array.from(scToRecord.keys());
        const npList = Array.from(new Set(chunk.map((d) => (d.applicationNumber || d.registrationNumber || '').trim()).filter(Boolean)));
        if (scList.length > 0 || npList.length > 0) {
          try {
            const [byScRes, byNpRes] = await Promise.all([
              scList.length > 0
                ? supabase
                    .from('lead_prospects')
                    .select('id, sc_number, customer_name, np_registration_number, national_portal_status, applied_solar_load_kw, mobile_number, email, village_name, remark')
                    .in('sc_number', scList)
                : Promise.resolve({ data: [] as any[] }),
              npList.length > 0
                ? supabase
                    .from('lead_prospects')
                    .select('id, sc_number, customer_name, np_registration_number, national_portal_status, applied_solar_load_kw, mobile_number, email, village_name, remark')
                    .in('np_registration_number', npList)
                : Promise.resolve({ data: [] as any[] }),
            ]);

            const prospectMap = new Map<string, any>();
            for (const p of [...(byScRes.data || []), ...(byNpRes.data || [])]) {
              prospectMap.set(p.id, p);
            }

            const matchedProspects = Array.from(prospectMap.values());
            if (matchedProspects.length > 0) {
              const updatePromises: PromiseLike<void>[] = [];

              for (const p of matchedProspects) {
                const d =
                  (p.sc_number ? scToRecord.get(p.sc_number.trim()) : undefined) ||
                  (p.np_registration_number ? npToRecord.get(p.np_registration_number.trim().toUpperCase()) : undefined);
                if (!d) continue;

                const step = d.stepName || 'Registered on National Portal';
                const npNum = (d.applicationNumber || d.registrationNumber || (d.appId ? `NP-${d.appId}` : '')).trim();
                const name = (d.consumerName || d.applicantName || '').trim();
                const cap = Number(d.appliedCapacity) || Number(d.pvCapacity) || 0;
                const phone = (d.mobile || '').replace(/\D/g, '').slice(-10);
                const email = (d.email || '').trim();
                const village = (d.villagePanchayatName || d.villageName || '').trim();
                const vendor = (d.vendorName || '').trim();

                const updates: Record<string, any> = {};
                if (step && p.national_portal_status !== step) updates.national_portal_status = step;
                if (npNum && (!p.np_registration_number || p.np_registration_number.trim() === '')) updates.np_registration_number = npNum;
                if (name && (!p.customer_name || p.customer_name.trim() === '')) updates.customer_name = name;
                if (cap > 0 && (!p.applied_solar_load_kw || p.applied_solar_load_kw === 0)) updates.applied_solar_load_kw = cap;
                if (phone.length === 10 && (!p.mobile_number || p.mobile_number.length < 10)) updates.mobile_number = phone;
                if (email && email !== '-' && (!p.email || p.email.trim() === '')) updates.email = email;
                if (village && village !== '0' && (!p.village_name || p.village_name === '0')) updates.village_name = village;
                if (vendor && (!p.remark || !p.remark.includes(vendor))) {
                  const vendorTag = `[NP Vendor: ${vendor}]`;
                  updates.remark = p.remark ? `${p.remark} ${vendorTag}` : vendorTag;
                }

                if (Object.keys(updates).length > 0) {
                  updates.updated_at = nowIso;
                  updatePromises.push(
                    supabase
                      .from('lead_prospects')
                      .update(updates)
                      .eq('id', p.id)
                      .then(({ error: upErr }) => {
                        if (!upErr) prospectsUpdated++;
                      })
                  );
                }
              }

              if (updatePromises.length > 0) {
                await Promise.all(updatePromises);
              }
            }
          } catch (prospectErr) {
            console.warn('Could not enrich prospects for batch:', prospectErr);
          }
        }

        processed += chunk.length;
        if (onProgress) {
          onProgress(Math.min(processed, totalToProcess), totalToProcess);
        }
      })
    );
  }

  // Get total in database
  const { count: totalInDb } = await supabase
    .from('national_portal_applications')
    .select('id', { count: 'exact', head: true });

  return {
    added,
    updated,
    skipped,
    total: totalInDb ?? added,
    prospectsUpdated,
    customersUpdated,
  };
}
