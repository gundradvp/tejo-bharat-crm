import { supabase } from './supabase';
import { CSVCustomerData, mapLoanStatus, mapDocumentStatus, mapInstallationStatus, mapSubsidyStatus } from './csvParser';
import { JSONCustomerData, NativeCRMCustomer, mapStatusFromExportStatus, SuryaGharDetailedCustomer } from './jsonParser';

export interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  errors: string[];
  markedLost: number;
  restoredActive: number;
  skipped?: number;
}

export type ImportProgressCallback = (current: number, total: number, currentName: string) => void;

export type ImportType = 'csv' | 'json' | 'native_crm' | 'surya_ghar_detailed';

export interface ImportJob {
  id: string;
  type: ImportType;
  fileName: string;
  total: number;
  current: number;
  currentName: string;
  status: 'running' | 'completed' | 'failed';
  result: ImportResult | null;
  startedAt: number;
  completedAt: number | null;
}

const BATCH_SIZE = 500;

/** Pre-load existing customers matching any of the provided ref numbers, consumer numbers, or phones. */
async function preloadExistingCustomers(
  appRefNos: string[],
  consumerNumbers: string[],
  phones: string[]
): Promise<Map<string, any>> {
  const byKey = new Map<string, any>();
  const seenIds = new Set<string>();

  const addAll = (rows: any[], keyField: string) => {
    for (const row of rows) {
      if (!row || seenIds.has(row.id)) continue;
      seenIds.add(row.id);
      const key = row[keyField]?.toString().trim();
      if (key) byKey.set(`ref:${key}`, row);
      if (row.consumer_number) byKey.set(`cn:${row.consumer_number.toString().trim()}`, row);
      if (row.phone) byKey.set(`ph:${row.phone.toString().trim()}`, row);
    }
  };

  const selectCols = 'id, application_ref_no, consumer_number, phone, email, address, loan_status, document_status, installation_status, subsidy_status, overall_status, remarks, customer_lifecycle_status';

  // Query by application_ref_no in batches
  const uniqueRefs = [...new Set(appRefNos.filter(Boolean))];
  for (let i = 0; i < uniqueRefs.length; i += BATCH_SIZE) {
    const chunk = uniqueRefs.slice(i, i + BATCH_SIZE);
    const { data } = await supabase.from('customers').select(selectCols).in('application_ref_no', chunk);
    if (data) addAll(data, 'application_ref_no');
  }

  // Query by consumer_number in batches
  const uniqueCns = [...new Set(consumerNumbers.filter(Boolean))];
  for (let i = 0; i < uniqueCns.length; i += BATCH_SIZE) {
    const chunk = uniqueCns.slice(i, i + BATCH_SIZE);
    const { data } = await supabase.from('customers').select(selectCols).in('consumer_number', chunk);
    if (data) addAll(data, 'consumer_number');
  }

  // Query by phone in batches
  const uniquePhones = [...new Set(phones.filter(Boolean))];
  for (let i = 0; i < uniquePhones.length; i += BATCH_SIZE) {
    const chunk = uniquePhones.slice(i, i + BATCH_SIZE);
    const { data } = await supabase.from('customers').select(selectCols).in('phone', chunk);
    if (data) addAll(data, 'phone');
  }

  return byKey;
}

function findInMap(
  map: Map<string, any>,
  appRefNo?: string,
  consumerNumber?: string,
  phone?: string
): any | null {
  if (appRefNo) {
    const hit = map.get(`ref:${appRefNo.trim()}`);
    if (hit) return hit;
  }
  if (consumerNumber) {
    const hit = map.get(`cn:${consumerNumber.trim()}`);
    if (hit) return hit;
  }
  if (phone) {
    const hit = map.get(`ph:${phone.trim()}`);
    if (hit) return hit;
  }
  return null;
}

export async function bulkImportCustomers(
  customers: CSVCustomerData[],
  agentId: string,
  onProgress?: ImportProgressCallback
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    created: 0,
    updated: 0,
    errors: [],
    markedLost: 0,
    restoredActive: 0,
  };

  const { data: agentProfile, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', agentId)
    .maybeSingle();

  if (!agentProfile?.tenant_id) {
    result.errors.push(`Unable to determine tenant. Error: ${profileError?.message || 'none'}`);
    result.success = false;
    return result;
  }

  const tenantId = agentProfile.tenant_id;
  const importStartTime = new Date();
  const now = new Date().toISOString();

  // Pre-load all existing customers in batch queries
  const appRefNos = customers.map((c) => c.applicationNumber).filter(Boolean) as string[];
  const consumerNumbers = customers.map((c) => c.consumerRegistrationNumber).filter(Boolean) as string[];
  const phones = customers.map((c) => c.mobileNo).filter(Boolean) as string[];

  onProgress?.(0, customers.length, 'Loading existing customers...');
  const existingMap = await preloadExistingCustomers(appRefNos, consumerNumbers, phones);

  // Build all payloads
  interface PreparedRow {
    payload: Record<string, any>;
    existing: any | null;
    name: string;
  }

  const toInsert: PreparedRow[] = [];
  const toUpdate: PreparedRow[] = [];

  for (const customer of customers) {
    const existing = findInMap(
      existingMap,
      customer.applicationNumber,
      customer.consumerRegistrationNumber,
      customer.mobileNo
    );

    const loanStatus = mapLoanStatus(customer.loanStatus);
    const documentStatus = mapDocumentStatus(customer.inspectionStatus || '');
    const installationStatus = mapInstallationStatus(
      customer.installationDate || '',
      customer.inspectionStatus || ''
    );
    const subsidyStatus = mapSubsidyStatus(
      customer.subsidyAmount || '',
      customer.subsidyDisbursedDate || '',
      customer.subsidyVerifiedDate || ''
    );

    if (existing) {
      toUpdate.push({
        existing,
        name: customer.consumerName,
        payload: {
          application_ref_no: customer.applicationNumber?.trim() || existing.application_ref_no,
          customer_name: customer.consumerName,
          consumer_number: customer.consumerRegistrationNumber || existing.consumer_number,
          phone: customer.mobileNo || existing.phone,
          email: customer.email || existing.email,
          address: customer.address || existing.address,
          loan_status: loanStatus,
          document_status: documentStatus,
          installation_status: installationStatus,
          subsidy_status: subsidyStatus,
          import_source: 'pm_surya_ghar',
          last_import_date: now,
          customer_lifecycle_status: 'active',
          updated_at: now,
        },
      });
    } else {
      if (!customer.mobileNo && !customer.consumerRegistrationNumber) {
        result.errors.push(`Skipping ${customer.consumerName}: No phone number or consumer number provided`);
        continue;
      }

      toInsert.push({
        existing: null,
        name: customer.consumerName,
        payload: {
          tenant_id: tenantId,
          assigned_agent_id: agentId,
          application_ref_no: customer.applicationNumber?.trim() || null,
          consumer_number: customer.consumerRegistrationNumber || null,
          customer_name: customer.consumerName,
          phone: customer.mobileNo || null,
          email: customer.email || null,
          address: customer.address || null,
          loan_status: loanStatus,
          document_status: documentStatus,
          installation_status: installationStatus,
          subsidy_status: subsidyStatus,
          overall_status: 'new',
          import_source: 'pm_surya_ghar',
          last_import_date: now,
          customer_lifecycle_status: 'active',
          remarks: `Imported from CSV. App #: ${customer.applicationNumber}`,
        },
      });
    }
  }

  // Run inserts via upsert (onConflict application_ref_no) in parallel batches
  let processed = 0;
  const insertBatches: PreparedRow[][] = [];
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    insertBatches.push(toInsert.slice(i, i + BATCH_SIZE));
  }

  const insertPromises = insertBatches.map(async (batch) => {
    const payloads = batch.map((r) => r.payload);
    const { error } = await supabase
      .from('customers')
      .upsert(payloads, { onConflict: 'application_ref_no' });
    if (error) {
      result.errors.push(`Insert batch error: ${error.message}`);
    } else {
      result.created += batch.length;
    }
    processed += batch.length;
    onProgress?.(processed + result.updated, customers.length, batch[batch.length - 1]?.name || '');
  });

  // Run updates in parallel batches of 50
  const UPDATE_BATCH = 50;
  const updateBatches: PreparedRow[][] = [];
  for (let i = 0; i < toUpdate.length; i += UPDATE_BATCH) {
    updateBatches.push(toUpdate.slice(i, i + UPDATE_BATCH));
  }

  const updatePromises = updateBatches.map(async (batch) => {
    await Promise.all(
      batch.map(async (r) => {
        const { error } = await supabase.from('customers').update(r.payload).eq('id', r.existing.id);
        if (error) {
          result.errors.push(`Error updating ${r.name}: ${error.message}`);
        } else {
          result.updated++;
          if (r.existing.customer_lifecycle_status === 'lost') result.restoredActive++;
        }
        processed++;
        onProgress?.(processed + result.created, customers.length, r.name);
      })
    );
  });

  await Promise.all([...insertPromises, ...updatePromises]);

  result.success = result.errors.length === 0;
  await markMissingCustomersAsLost(tenantId, importStartTime, result);
  onProgress?.(customers.length, customers.length, 'Finalizing...');
  return result;
}

export async function bulkImportCustomersJSON(
  customers: JSONCustomerData[],
  agentId: string,
  onProgress?: ImportProgressCallback
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    created: 0,
    updated: 0,
    errors: [],
    markedLost: 0,
    restoredActive: 0,
  };

  const { data: agentProfile, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', agentId)
    .maybeSingle();

  if (!agentProfile?.tenant_id) {
    result.errors.push(`Unable to determine tenant. Error: ${profileError?.message || 'none'}`);
    result.success = false;
    return result;
  }

  const tenantId = agentProfile.tenant_id;
  const importStartTime = new Date();
  const now = new Date().toISOString();

  // Pre-load all existing customers
  const appRefNos = customers.map((c) => c.appRefNo).filter(Boolean) as string[];
  const consumerNumbers = customers.map((c) => c.consumerNo).filter(Boolean) as string[];
  const phones = customers.map((c) => c.mobileNo).filter(Boolean) as string[];

  onProgress?.(0, customers.length, 'Loading existing customers...');
  const existingMap = await preloadExistingCustomers(appRefNos, consumerNumbers, phones);

  interface PreparedRow {
    payload: Record<string, any>;
    existing: any | null;
    name: string;
  }

  const toInsert: PreparedRow[] = [];
  const toUpdate: PreparedRow[] = [];

  for (const customer of customers) {
    const existing = findInMap(existingMap, customer.appRefNo, customer.consumerNo, customer.mobileNo);
    const { documentStatus, overallStatus } = mapStatusFromExportStatus(customer.exportStatus);

    if (existing) {
      toUpdate.push({
        existing,
        name: customer.consumerName,
        payload: {
          application_ref_no: customer.appRefNo?.trim() || existing.application_ref_no,
          customer_name: customer.consumerName,
          consumer_number: customer.consumerNo || existing.consumer_number,
          phone: customer.mobileNo || existing.phone,
          document_status: documentStatus,
          overall_status: overallStatus,
          discom_name: customer.discomName || null,
          district_name: customer.districtName || null,
          import_source: 'pm_surya_ghar',
          last_import_date: now,
          customer_lifecycle_status: 'active',
          updated_at: now,
        },
      });
    } else {
      if (!customer.mobileNo && !customer.consumerNo) {
        result.errors.push(`Skipping ${customer.consumerName}: No phone number or consumer number provided`);
        continue;
      }

      toInsert.push({
        existing: null,
        name: customer.consumerName,
        payload: {
          tenant_id: tenantId,
          assigned_agent_id: agentId,
          application_ref_no: customer.appRefNo?.trim() || null,
          consumer_number: customer.consumerNo || null,
          customer_name: customer.consumerName,
          phone: customer.mobileNo || null,
          email: null,
          address: null,
          discom_name: customer.discomName || null,
          district_name: customer.districtName || null,
          loan_status: 'not_applicable',
          document_status: documentStatus,
          installation_status: 'not_started',
          subsidy_status: 'not_claimed',
          overall_status: overallStatus,
          import_source: 'pm_surya_ghar',
          last_import_date: now,
          customer_lifecycle_status: 'active',
          remarks: `Imported from JSON. App #: ${customer.appRefNo}, Consumer #: ${customer.consumerNo}`,
        },
      });
    }
  }

  let processed = 0;
  const insertBatches: PreparedRow[][] = [];
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    insertBatches.push(toInsert.slice(i, i + BATCH_SIZE));
  }

  const insertPromises = insertBatches.map(async (batch) => {
    const payloads = batch.map((r) => r.payload);
    const { error } = await supabase
      .from('customers')
      .upsert(payloads, { onConflict: 'application_ref_no' });
    if (error) {
      result.errors.push(`Insert batch error: ${error.message}`);
    } else {
      result.created += batch.length;
    }
    processed += batch.length;
    onProgress?.(processed + result.updated, customers.length, batch[batch.length - 1]?.name || '');
  });

  const UPDATE_BATCH = 50;
  const updateBatches: PreparedRow[][] = [];
  for (let i = 0; i < toUpdate.length; i += UPDATE_BATCH) {
    updateBatches.push(toUpdate.slice(i, i + UPDATE_BATCH));
  }

  const updatePromises = updateBatches.map(async (batch) => {
    await Promise.all(
      batch.map(async (r) => {
        const { error } = await supabase.from('customers').update(r.payload).eq('id', r.existing.id);
        if (error) {
          result.errors.push(`Error updating ${r.name}: ${error.message}`);
        } else {
          result.updated++;
          if (r.existing.customer_lifecycle_status === 'lost') result.restoredActive++;
        }
        processed++;
        onProgress?.(processed + result.created, customers.length, r.name);
      })
    );
  });

  await Promise.all([...insertPromises, ...updatePromises]);

  result.success = result.errors.length === 0;
  await markMissingCustomersAsLost(tenantId, importStartTime, result);
  onProgress?.(customers.length, customers.length, 'Finalizing...');
  return result;
}

export async function bulkImportNativeCRM(
  customers: NativeCRMCustomer[],
  agentId: string,
  onProgress?: ImportProgressCallback
): Promise<ImportResult> {
  const result: ImportResult = { success: true, created: 0, updated: 0, errors: [], markedLost: 0, restoredActive: 0 };

  const { data: agentProfile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', agentId)
    .maybeSingle();

  if (!agentProfile?.tenant_id) {
    result.errors.push('Unable to determine tenant. Please refresh and try again.');
    result.success = false;
    return result;
  }

  const tenantId = agentProfile.tenant_id;
  const now = new Date().toISOString();

  // Pre-load all existing customers
  const appRefNos = customers.map((c) => c.application_ref_no).filter(Boolean) as string[];
  const consumerNumbers = customers.map((c) => c.consumer_number).filter(Boolean) as string[];
  const phones = customers.map((c) => c.phone).filter(Boolean) as string[];

  onProgress?.(0, customers.length, 'Loading existing customers...');
  const existingMap = await preloadExistingCustomers(appRefNos, consumerNumbers, phones);

  interface PreparedRow {
    payload: Record<string, any>;
    existing: any | null;
    name: string;
  }

  const toInsert: PreparedRow[] = [];
  const toUpdate: PreparedRow[] = [];

  for (const customer of customers) {
    const existing = findInMap(existingMap, customer.application_ref_no, customer.consumer_number, customer.phone);

    const fields: any = {
      customer_name: customer.customer_name,
      phone: customer.phone,
      email: customer.email ?? null,
      address: customer.address ?? null,
      application_ref_no: customer.application_ref_no ?? null,
      consumer_number: customer.consumer_number ?? null,
      discom_name: customer.discom_name ?? null,
      district_name: customer.district_name ?? null,
      loan_status: customer.loan_status ?? 'not_applicable',
      document_status: customer.document_status ?? 'not_submitted',
      installation_status: customer.installation_status ?? 'not_started',
      subsidy_status: customer.subsidy_status ?? 'not_claimed',
      overall_status: customer.overall_status ?? 'new',
      current_workflow_stage: customer.current_workflow_stage ?? null,
      remarks: customer.remarks ?? null,
      state_id: customer.state_id ?? null,
      district_id: customer.district_id ?? null,
      constituency_id: customer.constituency_id ?? null,
      mandal_id: customer.mandal_id ?? null,
      village_id: customer.village_id ?? null,
      import_source: 'native_crm_import',
      last_import_date: now,
      customer_lifecycle_status: 'active',
      updated_at: now,
    };

    if (existing) {
      toUpdate.push({ existing, name: customer.customer_name, payload: fields });
    } else {
      toInsert.push({
        existing: null,
        name: customer.customer_name,
        payload: { ...fields, tenant_id: tenantId, assigned_agent_id: agentId },
      });
    }
  }

  let processed = 0;
  const insertBatches: PreparedRow[][] = [];
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    insertBatches.push(toInsert.slice(i, i + BATCH_SIZE));
  }

  const insertPromises = insertBatches.map(async (batch) => {
    const payloads = batch.map((r) => r.payload);
    const { error } = await supabase
      .from('customers')
      .upsert(payloads, { onConflict: 'application_ref_no' });
    if (error) {
      result.errors.push(`Insert batch error: ${error.message}`);
    } else {
      result.created += batch.length;
    }
    processed += batch.length;
    onProgress?.(processed + result.updated, customers.length, batch[batch.length - 1]?.name || '');
  });

  const UPDATE_BATCH = 50;
  const updateBatches: PreparedRow[][] = [];
  for (let i = 0; i < toUpdate.length; i += UPDATE_BATCH) {
    updateBatches.push(toUpdate.slice(i, i + UPDATE_BATCH));
  }

  const updatePromises = updateBatches.map(async (batch) => {
    await Promise.all(
      batch.map(async (r) => {
        const { error } = await supabase.from('customers').update(r.payload).eq('id', r.existing.id);
        if (error) {
          result.errors.push(`Error updating ${r.name}: ${error.message}`);
        } else {
          result.updated++;
        }
        processed++;
        onProgress?.(processed + result.created, customers.length, r.name);
      })
    );
  });

  await Promise.all([...insertPromises, ...updatePromises]);

  result.success = result.errors.length === 0;
  onProgress?.(customers.length, customers.length, 'Finalizing...');
  return result;
}

export async function bulkImportSuryaGharDetailed(
  customers: SuryaGharDetailedCustomer[],
  agentId: string,
  onProgress?: ImportProgressCallback
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    created: 0,
    updated: 0,
    errors: [],
    markedLost: 0,
    restoredActive: 0,
    skipped: 0,
  };

  const { data: agentProfile, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', agentId)
    .maybeSingle();

  if (!agentProfile?.tenant_id) {
    result.errors.push(`Unable to determine tenant. Error: ${profileError?.message || 'none'}`);
    result.success = false;
    return result;
  }

  const now = new Date().toISOString();

  // Only match by application_ref_no — skip unmatched
  const appRefNos = customers.map((c) => c.applicationNumber).filter(Boolean);

  onProgress?.(0, customers.length, 'Loading existing customers...');

  const existingMap = new Map<string, any>();
  const selectCols = 'id, application_ref_no, customer_lifecycle_status';
  for (let i = 0; i < appRefNos.length; i += BATCH_SIZE) {
    const chunk = appRefNos.slice(i, i + BATCH_SIZE);
    const { data } = await supabase.from('customers').select(selectCols).in('application_ref_no', chunk);
    if (data) {
      for (const row of data) {
        const key = row.application_ref_no?.toString().trim();
        if (key) existingMap.set(key, row);
      }
    }
  }

  interface PreparedUpdate {
    payload: Record<string, any>;
    existingId: string;
    name: string;
  }

  const toUpdate: PreparedUpdate[] = [];
  let skippedCount = 0;

  for (const customer of customers) {
    const existing = existingMap.get(customer.applicationNumber.trim());

    if (!existing) {
      skippedCount++;
      continue;
    }

    const payload: Record<string, any> = {
      customer_name: customer.consumerName,
      consumer_number: customer.consumerNo || undefined,
      phone: customer.mobileNo || undefined,
      email: customer.email || undefined,
      address: customer.address || undefined,
      pincode: customer.pincode || undefined,
      gender: customer.gender || undefined,
      scheme_name: customer.schemeName || undefined,
      category_name: customer.categoryName || undefined,
      discom_name: customer.discomName || undefined,
      eb_distribution: customer.circleName || undefined,
      discom_division: customer.divisionName || undefined,
      discom_subdivision: customer.subDivisionName || undefined,
      district_name: customer.districtName || undefined,
      sanction_load: customer.sanctionLoad || undefined,
      approved_capacity: customer.approvedCapacity || undefined,
      applied_capacity: customer.appliedCapacity || undefined,
      existing_capacity: customer.existingCapacity || undefined,
      net_eligible_capacity: customer.netEligibleCapacity || undefined,
      connection_type: customer.connectionType || undefined,
      dcr_type: customer.dcrType || undefined,
      is_auto_approved: customer.isAutoApproved,
      approved_on: customer.approvedOn || undefined,
      app_submission_date: customer.appSubmissionDate || undefined,
      submitted_date: customer.submittedDate || undefined,
      feasibility_date: customer.feasibilityDate || undefined,
      feasibility_status: customer.feasibilityStatus || undefined,
      feasibility_approved_by: customer.feasibilityApprovedBy || undefined,
      feasibility_remarks: customer.feasibilityRemarks || undefined,
      net_metering_date: customer.netMeteringDate || undefined,
      total_inverter_capacity: customer.totalInverterCapacity || undefined,
      total_module_capacity: customer.totalModuleCapacity || undefined,
      vendor_name: customer.vendorName || undefined,
      loan_application_number: customer.loanApplicationNumber || undefined,
      loan_sanction_amount: customer.loanSanctionAmount ? parseFloat(customer.loanSanctionAmount) : undefined,
      loan_sanction_date: customer.loanSanctionDate || undefined,
      loan_sanctioned_amount: customer.loanSanctionAmount ? parseFloat(customer.loanSanctionAmount) : undefined,
      loan_sanctioned_date: customer.loanSanctionDate || undefined,
      loan_status: customer.currentLoanStatus || undefined,
      current_loan_status: customer.currentLoanStatus || undefined,
      ulb_type: customer.ulbType || undefined,
      village_panchayat_name: customer.villagePanchayatName || undefined,
      development_block_name: customer.developmentBlockName || undefined,
      urban_local_body_name: customer.urbanLocalBodyName || undefined,
      name_as_per_bank: customer.nameAsPerBank || undefined,
      portal_inverter_list: customer.inverterList.length > 0 ? JSON.stringify(customer.inverterList) : undefined,
      portal_module_list: customer.moduleList.length > 0 ? JSON.stringify(customer.moduleList) : undefined,
      portal_workflow_steps: customer.workflowSteps.length > 0 ? JSON.stringify(customer.workflowSteps) : undefined,
      portal_current_step_name: customer.currentStepName || undefined,
      portal_current_step_status: customer.currentStepStatus || undefined,
      portal_current_step_date: customer.currentStepDate || undefined,
      import_source: 'pm_surya_ghar_detailed',
      last_import_date: now,
      customer_lifecycle_status: 'active',
      updated_at: now,
    };

    // Remove undefined values so we don't overwrite existing data with null
    const cleanPayload: Record<string, any> = {};
    for (const [k, v] of Object.entries(payload)) {
      if (v !== undefined) cleanPayload[k] = v;
    }

    toUpdate.push({ existingId: existing.id, name: customer.consumerName, payload: cleanPayload });
  }

  result.skipped = skippedCount;

  let processed = 0;
  const UPDATE_BATCH = 50;
  const updateBatches: PreparedUpdate[][] = [];
  for (let i = 0; i < toUpdate.length; i += UPDATE_BATCH) {
    updateBatches.push(toUpdate.slice(i, i + UPDATE_BATCH));
  }

  const updatePromises = updateBatches.map(async (batch) => {
    await Promise.all(
      batch.map(async (r) => {
        const { error } = await supabase.from('customers').update(r.payload).eq('id', r.existingId);
        if (error) {
          result.errors.push(`Error updating ${r.name}: ${error.message}`);
        } else {
          result.updated++;
          await syncLoanApplication(r.existingId, r.payload);
        }
        processed++;
        onProgress?.(processed + skippedCount, customers.length, r.name);
      })
    );
  });

  await Promise.all(updatePromises);

  result.success = result.errors.length === 0;
  onProgress?.(customers.length, customers.length, 'Finalizing...');
  return result;
}

function mapLoanStatusToDisbursement(status: string | undefined): string | null {
  if (!status) return null;
  const s = status.toLowerCase().trim();
  if (s.includes('fully') || s.includes('completed') || s.includes('disbursed')) return 'fully_disbursed';
  if (s.includes('partial') || s.includes('part')) return 'partially_disbursed';
  if (s.includes('sanction')) return 'sanctioned';
  if (s.includes('pending') || s.includes('applied') || s.includes('submitted')) return 'pending';
  if (s.includes('reject')) return 'rejected';
  if (s.includes('not') || s.includes('na') || s.includes('n/a')) return 'not_applied';
  return null;
}

async function syncLoanApplication(customerId: string, payload: Record<string, any>): Promise<void> {
  const sanctionAmount = payload.loan_sanctioned_amount ?? payload.loan_sanction_amount;
  const sanctionDate = payload.loan_sanctioned_date ?? payload.loan_sanction_date;
  const appNumber = payload.loan_application_number;
  const loanStatus = payload.loan_status ?? payload.current_loan_status;

  if (!sanctionAmount && !sanctionDate && !appNumber && !loanStatus) return;

  const { data: existing } = await supabase
    .from('loan_applications')
    .select('id')
    .eq('customer_id', customerId)
    .maybeSingle();

  const disbursementStatus = mapLoanStatusToDisbursement(loanStatus);

  const loanPayload: Record<string, any> = {};
  if (sanctionAmount != null) loanPayload.loan_amount_sanctioned = sanctionAmount;
  if (sanctionDate) loanPayload.sanction_date = sanctionDate;
  if (appNumber) loanPayload.application_number = appNumber;
  if (loanStatus) loanPayload.loan_status = loanStatus;
  if (disbursementStatus) loanPayload.disbursement_status = disbursementStatus;

  if (existing) {
    await supabase.from('loan_applications').update(loanPayload).eq('id', existing.id);
  } else {
    loanPayload.customer_id = customerId;
    loanPayload.disbursement_type = 'tranche';
    if (!loanPayload.loan_status) loanPayload.loan_status = loanStatus || 'sanctioned';
    await supabase.from('loan_applications').insert(loanPayload);
  }
}

async function markMissingCustomersAsLost(
  tenantId: string,
  importDate: Date,
  result: ImportResult
): Promise<void> {
  try {
    const { data: lostCandidates, error: queryError } = await supabase
      .from('customers')
      .select('id, customer_lifecycle_status')
      .eq('tenant_id', tenantId)
      .eq('import_source', 'pm_surya_ghar')
      .neq('customer_lifecycle_status', 'lost')
      .lt('last_import_date', importDate.toISOString());

    if (queryError || !lostCandidates || lostCandidates.length === 0) return;

    const idsToUpdate = lostCandidates.map((c: any) => c.id);
    const nowIso = new Date().toISOString();

    // Attempt update with lost_at timestamp; fallback safely if column migration is pending
    let { error: updateError } = await supabase
      .from('customers')
      .update({ customer_lifecycle_status: 'lost', lost_at: nowIso, updated_at: nowIso })
      .in('id', idsToUpdate);

    if (updateError && updateError.message?.toLowerCase().includes('lost_at')) {
      const retry = await supabase
        .from('customers')
        .update({ customer_lifecycle_status: 'lost', updated_at: nowIso })
        .in('id', idsToUpdate);
      updateError = retry.error;
    }

    if (!updateError) {
      result.markedLost = idsToUpdate.length;
    }
  } catch (err) {
    console.error('Error marking missing customers as lost:', err);
  }
}
