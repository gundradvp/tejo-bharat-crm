import { supabase } from './supabase';
import { extractAreaCode, findAreaCodesForQuery } from './areaCodeCatalog';
export { extractAreaCode, findAreaCodesForQuery };

export const HIGH_USAGE_THRESHOLD = 500;

export interface LeadProspect {
  id: string;
  tenant_id: string;
  serial_number?: number;
  circle_name?: string;
  division_name?: string;
  subdiv_name?: string;
  section_name?: string;
  sc_number?: string;
  existing_load_kw?: number;
  existing_solar_load_kw?: number;
  applied_solar_load_kw?: number;
  np_registration_number?: string;
  ep_registration_number?: string;
  complaint_date?: string;
  mobile_number?: string;
  email?: string;
  national_portal_status?: string;
  epdcl_portal_status?: string;
  village_name?: string;
  bill_amount_1?: number;
  bill_month_1?: string;
  bill_amount_2?: number;
  bill_month_2?: string;
  bill_amount_3?: number;
  bill_month_3?: string;
  call_status: string;
  remark?: string;
  last_called_at?: string;
  called_by?: string;
  follow_up_date?: string;
  is_existing_customer: boolean;
  linked_customer_id?: string;
  created_at: string;
  updated_at: string;
  called_by_profile?: { id: string; full_name: string };
  ero_name?: string;
  mandal_name?: string;
  sub_station_name?: string;
  category?: string;
  customer_name?: string;
  area_name?: string;
  contracted_load?: number;
  connected_load?: number;
  load_unit?: string;
  phase?: string;
  eb_status?: string;
  meter_no?: string;
  feeder_name?: string;
  panchayath_name?: string;
  assembly_constituency?: string;
}

export type FilterOperator = 'gte' | 'gt' | 'lte' | 'lt' | 'eq' | 'between';

export interface BillFilter {
  operator: FilterOperator;
  value: number;
  maxValue?: number;
}

export type ProspectSortOption =
  | 'units_desc'
  | 'units_asc'
  | 'created_at_desc'
  | 'created_at_asc'
  | 'name_asc'
  | 'name_desc'
  | 'load_desc'
  | 'load_asc';

export interface ProspectFilterOptions {
  search?: string;
  circles?: string[];
  divisions?: string[];
  subdivs?: string[];
  eros?: string[];
  sections?: string[];
  statuses?: string[];
  callStatuses?: string[];
  categories?: string[];
  mandals?: string[];
  subStations?: string[];
  areaCodes?: string[];
  hideSuryaGhar?: boolean;
  hideSolarInstalled?: boolean;
  billAmount?: BillFilter | null;
  billUnits?: BillFilter | null;
  importBatchId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  followUpDue?: boolean;
  calledOnly?: boolean;
  sortBy?: ProspectSortOption;
  page?: number;
  pageSize?: number;
}

export interface ProspectPaginatedResult {
  prospects: LeadProspect[];
  total: number;
}

const PROSPECT_PAGE_SIZE = 50;

export interface LeadProspectCall {
  id: string;
  prospect_id: string;
  call_status: string;
  remark?: string;
  called_by?: string;
  called_at: string;
  follow_up_date?: string;
  called_by_profile?: { id: string; full_name: string };
}

export const CALL_STATUSES = [
  'not_called',
  'interested',
  'not_interested',
  'call_back_later',
  'wrong_number',
  'switched_off',
  'already_installed',
  'not_reachable',
  'converted',
] as const;

export const CALL_STATUS_LABELS: Record<string, string> = {
  not_called: 'Not Called',
  interested: 'Interested',
  not_interested: 'Not Interested',
  call_back_later: 'Call Back Later',
  wrong_number: 'Wrong Number',
  switched_off: 'Switched Off',
  already_installed: 'Already Installed',
  solar_already_installed: 'Solar Already Installed',
  not_reachable: 'Not Reachable',
  converted: 'Converted',
};

export const CALL_STATUS_COLORS: Record<string, string> = {
  not_called: 'bg-gray-100 text-gray-600',
  interested: 'bg-green-100 text-green-700',
  not_interested: 'bg-red-100 text-red-700',
  call_back_later: 'bg-yellow-100 text-yellow-700',
  wrong_number: 'bg-gray-200 text-gray-600',
  switched_off: 'bg-orange-100 text-orange-700',
  already_installed: 'bg-blue-100 text-blue-700',
  solar_already_installed: 'bg-indigo-100 text-indigo-700',
  not_reachable: 'bg-amber-100 text-amber-700',
  converted: 'bg-emerald-100 text-emerald-700',
};

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  existingCustomerMatches: number;
  errors: string[];
}

function sanitizeDate(value: any): string | null {
  if (!value) return null;
  const str = String(value).trim();
  if (!str || str === '-' || str === '--' || str === 'N/A' || str === 'NA') return null;
  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split('T')[0];
}

const BATCH_SIZE = 500;

export async function importProspects(
  rows: any[],
  onProgress?: (current: number, total: number) => void,
  batchLabel?: string
): Promise<ImportResult> {
  const result: ImportResult = {
    total: rows.length,
    created: 0,
    updated: 0,
    existingCustomerMatches: 0,
    errors: [],
  };

  const batchId = crypto.randomUUID();
  const batchName = batchLabel || `Import ${new Date().toLocaleString('en-IN')}`;

  const scNumbers = rows
    .map((r) => r.sc_number)
    .filter((s) => s && String(s).trim()) as string[];

  // Match against existing Surya Ghar customers
  let existingCustomers: { consumer_number: string; id: string }[] = [];
  if (scNumbers.length > 0) {
    const uniqueScs = [...new Set(scNumbers)];
    for (let i = 0; i < uniqueScs.length; i += 500) {
      const chunk = uniqueScs.slice(i, i + 500);
      const { data: matched } = await supabase
        .from('customers')
        .select('id, consumer_number')
        .in('consumer_number', chunk);
      if (matched) existingCustomers.push(...(matched.filter((m) => m.consumer_number) as any));
    }
  }

  const customerBySc = new Map<string, string>();
  for (const c of existingCustomers) {
    customerBySc.set(c.consumer_number, c.id);
  }

  // Build all payloads, deduplicating by SC number within the import set
  const seenScNumbers = new Set<string>();
  const payloads: Record<string, any>[] = [];
  let duplicateSkipped = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const scNumber = row.sc_number ? String(row.sc_number).trim() : '';

    // Skip duplicate SC numbers within this import — only the first occurrence is kept
    if (scNumber) {
      if (seenScNumbers.has(scNumber)) {
        duplicateSkipped++;
        continue;
      }
      seenScNumbers.add(scNumber);
    }

    const linkedCustomerId = scNumber ? customerBySc.get(scNumber) : undefined;
    const isExisting = !!linkedCustomerId;

    if (isExisting) result.existingCustomerMatches++;

    payloads.push({
      serial_number: row.serial_number || null,
      circle_name: row.circle_name || null,
      division_name: row.division_name || null,
      subdiv_name: row.subdiv_name || null,
      section_name: row.section_name || null,
      sc_number: scNumber || null,
      existing_load_kw: row.existing_load_kw ?? null,
      existing_solar_load_kw: row.existing_solar_load_kw ?? null,
      applied_solar_load_kw: row.applied_solar_load_kw ?? null,
      np_registration_number: row.np_registration_number || null,
      ep_registration_number: (row.ep_registration_number && row.ep_registration_number.trim() !== '' && row.ep_registration_number.trim() !== '-' && row.ep_registration_number.trim() !== '--') ? row.ep_registration_number.trim() : null,
      complaint_date: sanitizeDate(row.complaint_date),
      mobile_number: row.mobile_number || null,
      email: row.email || null,
      national_portal_status: row.national_portal_status || null,
      epdcl_portal_status: row.epdcl_portal_status || null,
      village_name: row.village_name || null,
      bill_amount_1: row.bill_amount_1 ?? null,
      bill_month_1: row.bill_month_1 || null,
      bill_amount_2: row.bill_amount_2 ?? null,
      bill_month_2: row.bill_month_2 || null,
      bill_amount_3: row.bill_amount_3 ?? null,
      bill_month_3: row.bill_month_3 || null,
      is_existing_customer: isExisting,
      linked_customer_id: linkedCustomerId || null,
      call_status: (row.ep_registration_number && row.ep_registration_number.trim() !== '' && row.ep_registration_number.trim() !== '-' && row.ep_registration_number.trim() !== '--') ? 'solar_already_installed' : 'not_called',
      import_batch_id: batchId,
      import_batch_label: batchName,
    });
  }

  if (duplicateSkipped > 0) {
    result.errors.push(`${duplicateSkipped} duplicate SC number${duplicateSkipped > 1 ? 's' : ''} skipped within this import`);
  }

  // Find which SC numbers already exist in lead_prospects (for created/updated count)
  const existingScSet = new Set<string>();
  if (scNumbers.length > 0) {
    const uniqueScs = [...new Set(scNumbers)];
    for (let i = 0; i < uniqueScs.length; i += 500) {
      const chunk = uniqueScs.slice(i, i + 500);
      const { data: existing } = await supabase
        .from('lead_prospects')
        .select('sc_number')
        .in('sc_number', chunk);
      for (const p of existing || []) {
        if (p.sc_number) existingScSet.add(p.sc_number);
      }
    }
  }

  // Upsert sequentially — parallel batches deadlock on the sc_number unique index
  let processed = 0;
  for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
    const batch = payloads.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('lead_prospects')
      .upsert(batch, { onConflict: 'sc_number' });

    if (error) {
      // Fallback: insert rows one at a time, skipping any that still fail
      for (const p of batch) {
        const { error: rowError } = await supabase
          .from('lead_prospects')
          .upsert(p, { onConflict: 'sc_number' });
        if (rowError) {
          result.errors.push(`Row error (SC: ${p.sc_number || 'N/A'}): ${rowError.message}`);
        } else {
          const isExisting = p.sc_number && existingScSet.has(p.sc_number);
          if (isExisting) result.updated++;
          else result.created++;
        }
      }
    } else {
      const batchExisting = batch.filter((p) => p.sc_number && existingScSet.has(p.sc_number)).length;
      result.updated += batchExisting;
      result.created += batch.length - batchExisting;
    }

    processed += batch.length;
    onProgress?.(processed, payloads.length);
  }

  onProgress?.(payloads.length, payloads.length);
  return result;
}

/** Load ALL prospects, paginating past Supabase's 1000-row default limit. */
export async function loadAllProspects(): Promise<LeadProspect[]> {
  const PAGE_SIZE = 1000;
  let all: LeadProspect[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('lead_prospects')
      .select('*, called_by_profile:profiles!lead_prospects_called_by_fkey(id, full_name)')
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    const page = (data as any) || [];
    all = all.concat(page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
}

export async function fetchProspects(
  filters: ProspectFilterOptions
): Promise<ProspectPaginatedResult> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? PROSPECT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  const billConditions: { column: string; op: FilterOperator; value: number; maxValue?: number }[] = [];
  if (filters.billAmount && filters.billAmount.value > 0)
    billConditions.push({ column: 'bill_amount', op: filters.billAmount.operator, value: filters.billAmount.value, maxValue: filters.billAmount.maxValue });
  if (filters.billUnits && filters.billUnits.value > 0)
    billConditions.push({ column: 'billed_units', op: filters.billUnits.operator, value: filters.billUnits.value, maxValue: filters.billUnits.maxValue });

  const hasBillCond = billConditions.length > 0;

  if (hasBillCond) {
    const rpcParams = {
      p_search: filters.search || null,
      p_circle: filters.circles && filters.circles.length > 0 ? filters.circles.join(',') : null,
      p_division: filters.divisions && filters.divisions.length > 0 ? filters.divisions.join(',') : null,
      p_subdiv: filters.subdivs && filters.subdivs.length > 0 ? filters.subdivs.join(',') : null,
      p_ero: filters.eros && filters.eros.length > 0 ? filters.eros.join(',') : null,
      p_section: filters.sections && filters.sections.length > 0 ? filters.sections.join(',') : null,
      p_status: filters.statuses && filters.statuses.length > 0 ? filters.statuses.join(',') : null,
      p_call_status: filters.callStatuses && filters.callStatuses.length > 0 ? filters.callStatuses.join(',') : null,
      p_category: filters.categories && filters.categories.length > 0 ? filters.categories.join(',') : null,
      p_mandal: filters.mandals && filters.mandals.length > 0 ? filters.mandals.join(',') : null,
      p_sub_station: filters.subStations && filters.subStations.length > 0 ? filters.subStations.join(',') : null,
      p_date_from: filters.dateFrom || null,
      p_date_to: filters.dateTo || null,
      bill_conditions: billConditions.map((c) => ({ column: c.column, operator: c.op, value: c.value, max_value: c.maxValue ?? null })),
      p_page_size: pageSize,
      p_page_offset: offset,
    };

    const { data: rpcData, error: rpcError } = await supabase.rpc('search_prospects', rpcParams);
    if (rpcError) throw rpcError;
    if (!rpcData || rpcData.length === 0) return { prospects: [], total: 0 };
    const result = rpcData[0];
    let rows = (result.rows || []) as LeadProspect[];
    const rpcTotal = Number(result.total_count) || 0;
    let total = rpcTotal > 0 ? rpcTotal : rows.length;

    if (filters.areaCodes && filters.areaCodes.length > 0) {
      rows = rows.filter((p) => {
        const code = extractAreaCode(p.sc_number);
        return code && filters.areaCodes!.includes(code);
      });
      if (rpcTotal === 0) total = rows.length;
    }
    if (filters.hideSuryaGhar) {
      rows = rows.filter((p) => !p.is_existing_customer);
      if (rpcTotal === 0) total = rows.length;
    }
    if (filters.hideSolarInstalled) {
      rows = rows.filter((p) => {
        if (p.call_status === 'solar_already_installed' || p.call_status === 'already_installed') return false;
        if (p.ep_registration_number && p.ep_registration_number.trim() && p.ep_registration_number.trim() !== '-' && p.ep_registration_number.trim() !== '--') return false;
        if (p.existing_solar_load_kw != null && p.existing_solar_load_kw > 0) return false;
        return true;
      });
      if (rpcTotal === 0) total = rows.length;
    }
    return { prospects: rows, total: Math.max(total, rows.length) };
  }

  let query = supabase
    .from('lead_prospects')
    .select('*, called_by_profile:profiles!lead_prospects_called_by_fkey(id, full_name)', { count: 'exact' })
    .range(offset, offset + pageSize - 1);

  const sortBy = filters.sortBy || 'created_at_desc';
  if (sortBy === 'created_at_asc') {
    query = query.order('created_at', { ascending: true });
  } else if (sortBy === 'name_asc') {
    query = query.order('customer_name', { ascending: true, nullsFirst: false });
  } else if (sortBy === 'name_desc') {
    query = query.order('customer_name', { ascending: false, nullsFirst: false });
  } else if (sortBy === 'load_desc') {
    query = query.order('applied_solar_load_kw', { ascending: false, nullsFirst: false });
  } else if (sortBy === 'load_asc') {
    query = query.order('applied_solar_load_kw', { ascending: true, nullsFirst: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  if (filters.search) {
    const searchTrimmed = filters.search.trim();
    const matchedAreaCodes = findAreaCodesForQuery(searchTrimmed, 12);
    let searchCond = `sc_number.ilike.%${searchTrimmed}%,customer_name.ilike.%${searchTrimmed}%,meter_no.ilike.%${searchTrimmed}%,np_registration_number.ilike.%${searchTrimmed}%,ep_registration_number.ilike.%${searchTrimmed}%,village_name.ilike.%${searchTrimmed}%`;
    if (matchedAreaCodes.length > 0) {
      const areaConds = matchedAreaCodes.map((c) => `sc_number.like.%${c}______`).join(',');
      searchCond += `,${areaConds}`;
    }
    query = query.or(searchCond);
  }
  if (filters.circles && filters.circles.length > 0) query = query.in('circle_name', filters.circles);
  if (filters.divisions && filters.divisions.length > 0) query = query.in('division_name', filters.divisions);
  if (filters.subdivs && filters.subdivs.length > 0) query = query.in('subdiv_name', filters.subdivs);
  if (filters.eros && filters.eros.length > 0) query = query.in('ero_name', filters.eros);
  if (filters.sections && filters.sections.length > 0) query = query.in('section_name', filters.sections);
  if (filters.statuses && filters.statuses.length > 0) query = query.in('eb_status', filters.statuses);
  if (filters.callStatuses && filters.callStatuses.length > 0) query = query.in('call_status', filters.callStatuses);
  if (filters.categories && filters.categories.length > 0) query = query.in('category', filters.categories);
  if (filters.mandals && filters.mandals.length > 0) query = query.in('mandal_name', filters.mandals);
  if (filters.subStations && filters.subStations.length > 0) query = query.in('sub_station_name', filters.subStations);
  if (filters.areaCodes && filters.areaCodes.length > 0) {
    if (filters.areaCodes.length === 1) {
      query = query.like('sc_number', `%${filters.areaCodes[0]}______`);
    } else {
      const orConds = filters.areaCodes.map((c) => `sc_number.like.%${c}______`).join(',');
      query = query.or(orConds);
    }
  }
  if (filters.hideSuryaGhar) {
    query = query.eq('is_existing_customer', false);
  }
  if (filters.hideSolarInstalled) {
    query = query
      .not('call_status', 'in', '("solar_already_installed","already_installed")')
      .is('ep_registration_number', null);
  }
  if (filters.importBatchId) query = query.eq('import_batch_id', filters.importBatchId);
  if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom + 'T00:00:00');
  if (filters.dateTo) query = query.lte('created_at', filters.dateTo + 'T23:59:59');
  if (filters.followUpDue) {
    const today = new Date().toISOString().split('T')[0];
    query = query.lte('follow_up_date', today).not('call_status', 'in', '("converted","not_interested")');
  }
  if (filters.calledOnly) {
    query = query.neq('call_status', 'not_called');
  }

  const { data, error, count } = await query;
  if (error) throw error;

  let prospects = (data as any) || [];
  let totalCount = count ?? 0;

  if (filters.followUpDue) {
    const today = new Date().toISOString().split('T')[0];
    prospects = prospects.filter((p: any) =>
      p.follow_up_date && p.follow_up_date <= today &&
      !['converted', 'not_interested'].includes(p.call_status)
    );
    totalCount = prospects.length;
  }

  return { prospects, total: totalCount };
}

export async function fetchProspectFilterValues(): Promise<{
  eros: string[];
  sections: string[];
  statuses: string[];
  categories: string[];
  mandals: string[];
  subStations: string[];
  circles: string[];
  divisions: string[];
  subdivs: string[];
}> {
  const { data, error } = await supabase.rpc('get_prospect_filter_values');
  if (error) throw error;
  if (!data || data.length === 0) return { eros: [], sections: [], statuses: [], categories: [], mandals: [], subStations: [], circles: [], divisions: [], subdivs: [] };

  const row = data[0];
  const sorted = (arr: string[] | null) => arr ? [...arr].sort((a, b) => a.localeCompare(b)) : [];
  return {
    eros: sorted(row.eros),
    sections: sorted(row.sections),
    statuses: sorted(row.statuses),
    categories: sorted(row.categories),
    mandals: sorted(row.mandals),
    subStations: sorted(row.sub_stations),
    circles: sorted(row.circles),
    divisions: sorted(row.divisions),
    subdivs: sorted(row.subdivs),
  };
}

export interface ImportBatch {
  batch_id: string;
  batch_label: string;
  row_count: number;
  latest_created_at: string;
}

export async function fetchImportBatches(): Promise<ImportBatch[]> {
  const { data, error } = await supabase
    .from('lead_prospects')
    .select('import_batch_id, import_batch_label, created_at')
    .not('import_batch_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(2000);

  if (error) throw error;

  const batchMap = new Map<string, ImportBatch>();
  for (const row of data || []) {
    const id = row.import_batch_id as string;
    if (!id) continue;
    if (!batchMap.has(id)) {
      batchMap.set(id, {
        batch_id: id,
        batch_label: row.import_batch_label || 'Unnamed Import',
        row_count: 0,
        latest_created_at: row.created_at,
      });
    }
    const batch = batchMap.get(id)!;
    batch.row_count++;
    if (row.created_at > batch.latest_created_at) batch.latest_created_at = row.created_at;
  }

  return Array.from(batchMap.values()).sort((a, b) =>
    b.latest_created_at.localeCompare(a.latest_created_at)
  );
}

export interface ProspectBillRecord {
  bill_month: string | null;
  bill_year: number | null;
  bill_month_index: number | null;
  billed_units: number | null;
  bill_amount: number | null;
  bill_status: string | null;
  created_at: string;
}

export async function fetchProspectBillHistory(prospectId: string): Promise<ProspectBillRecord[]> {
  const { data, error } = await supabase.rpc('get_prospect_bill_history', { p_prospect_id: prospectId });
  if (error) throw error;
  return (data as any) || [];
}

export async function fetchProspectStats(): Promise<{
  total: number;
  called: number;
  interested: number;
  followUpsDue: number;
  live: number;
}> {
  const { count: total } = await supabase
    .from('lead_prospects').select('id', { count: 'exact', head: true });
  const { count: called } = await supabase
    .from('lead_prospects').select('id', { count: 'exact', head: true }).neq('call_status', 'not_called');
  const { count: interested } = await supabase
    .from('lead_prospects').select('id', { count: 'exact', head: true }).in('call_status', ['interested', 'converted']);
  const today = new Date().toISOString().split('T')[0];
  const { count: followUpsDue } = await supabase
    .from('lead_prospects').select('id', { count: 'exact', head: true })
    .lte('follow_up_date', today).not('call_status', 'in', '("converted","not_interested")');
  const { count: live } = await supabase
    .from('lead_prospects').select('id', { count: 'exact', head: true }).eq('eb_status', 'LIVE');

  return { total: total ?? 0, called: called ?? 0, interested: interested ?? 0, followUpsDue: followUpsDue ?? 0, live: live ?? 0 };
}

export interface ProspectBillSummary {
  sc_number: string;
  max_billed_units: number | null;
  max_units_bill_amount: number | null;
  max_bill_amount: number | null;
  latest_units: number | null;
  latest_bill_amount: number | null;
  latest_bill_month: string | null;
  recent_units: number | null;
  recent_bill_amount: number | null;
  recent_bill_month: string | null;
  high_usage: boolean;
}

export async function fetchProspectBillSummaries(
  scNumbers: string[]
): Promise<Map<string, ProspectBillSummary>> {
  const map = new Map<string, ProspectBillSummary>();
  const latestKeyMap = new Map<string, number>();
  if (scNumbers.length === 0) return map;

  const BATCH = 50;
  for (let i = 0; i < scNumbers.length; i += BATCH) {
    const batch = scNumbers.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from('eb_customer_bills')
      .select('sc_number, billed_units, bill_amount, bill_month, bill_year, bill_month_index')
      .in('sc_number', batch);

    if (error) throw error;

    for (const row of data || []) {
      const sc = row.sc_number as string;
      if (!sc) continue;
      const units = row.billed_units != null ? Number(row.billed_units) : null;
      const amount = row.bill_amount != null ? Number(row.bill_amount) : null;
      const month = row.bill_month ?? null;
      const sortKey = (row.bill_year ?? 0) * 100 + (row.bill_month_index ?? 0);
      const existing = map.get(sc);
      if (!existing) {
        map.set(sc, {
          sc_number: sc,
          max_billed_units: units,
          max_units_bill_amount: amount,
          max_bill_amount: amount,
          latest_units: units,
          latest_bill_amount: amount,
          latest_bill_month: month,
          recent_units: units,
          recent_bill_amount: amount,
          recent_bill_month: month,
          high_usage: units != null && units > HIGH_USAGE_THRESHOLD,
        });
        latestKeyMap.set(sc, sortKey);
      } else {
        if (units != null) {
          if (existing.max_billed_units == null || units > existing.max_billed_units) {
            existing.max_billed_units = units;
            existing.max_units_bill_amount = amount;
          }
          if (units > HIGH_USAGE_THRESHOLD) existing.high_usage = true;
        }
        if (amount != null) {
          if (existing.max_bill_amount == null || amount > existing.max_bill_amount) {
            existing.max_bill_amount = amount;
          }
        }
        if (sortKey > 0 && sortKey >= (latestKeyMap.get(sc) ?? 0)) {
          existing.latest_units = units;
          existing.latest_bill_amount = amount;
          existing.latest_bill_month = month;
          existing.recent_units = units;
          existing.recent_bill_amount = amount;
          existing.recent_bill_month = month;
          latestKeyMap.set(sc, sortKey);
        }
      }
    }
  }
  return map;
}

export interface ProspectExportRow {
  sc_number: string | null;
  customer_name: string | null;
  circle_name: string | null;
  division_name: string | null;
  subdiv_name: string | null;
  ero_name: string | null;
  section_name: string | null;
  mandal_name: string | null;
  sub_station_name: string | null;
  area_name: string | null;
  village_name: string | null;
  category: string | null;
  eb_status: string | null;
  phase: string | null;
  contracted_load: number | null;
  connected_load: number | null;
  load_unit: string | null;
  meter_no: string | null;
  feeder_name: string | null;
  panchayath_name: string | null;
  assembly_constituency: string | null;
  mobile_number: string | null;
  email: string | null;
  existing_load_kw: number | null;
  existing_solar_load_kw: number | null;
  applied_solar_load_kw: number | null;
  np_registration_number: string | null;
  ep_registration_number: string | null;
  complaint_date: string | null;
  national_portal_status: string | null;
  epdcl_portal_status: string | null;
  bill_amount_1: number | null;
  bill_month_1: string | null;
  bill_amount_2: number | null;
  bill_month_2: string | null;
  bill_amount_3: number | null;
  bill_month_3: string | null;
  call_status: string;
  remark: string | null;
  follow_up_date: string | null;
  last_called_at: string | null;
  called_by_name: string | null;
  is_existing_customer: boolean;
  created_at: string;
  max_billed_units: number | null;
  max_units_bill_amount: number | null;
  max_bill_amount: number | null;
  latest_units: number | null;
  latest_bill_amount: number | null;
  latest_bill_month: string | null;
  recent_units: number | null;
  recent_bill_amount: number | null;
  recent_bill_month: string | null;
  high_usage: boolean;
}

export async function fetchProspectsForExport(
  filters: ProspectFilterOptions,
  limit?: number
): Promise<ProspectExportRow[]> {
  const allProspects: LeadProspect[] = [];
  let currentPage = 1;
  const exportPageSize = 500;
  let totalCount = 0;

  do {
    const remaining = limit != null ? limit - allProspects.length : undefined;
    const pageSize = remaining != null ? Math.min(exportPageSize, remaining) : exportPageSize;
    if (remaining != null && remaining <= 0) break;

    const result = await fetchProspects({
      ...filters,
      page: currentPage,
      pageSize,
    });
    allProspects.push(...result.prospects);
    totalCount = result.total;
    currentPage++;
  } while (allProspects.length < totalCount && allProspects.length > 0 && (limit == null || allProspects.length < limit));

  const exportProspects = limit != null ? allProspects.slice(0, limit) : allProspects;

  const scNumbers = exportProspects.map((p) => p.sc_number).filter(Boolean) as string[];
  const billSummaries = scNumbers.length > 0 ? await fetchProspectBillSummaries(scNumbers) : new Map<string, ProspectBillSummary>();

  if (filters.sortBy === 'units_desc') {
    exportProspects.sort((a, b) => {
      const aUnits = (a.sc_number ? billSummaries.get(a.sc_number)?.max_billed_units : null) ?? 0;
      const bUnits = (b.sc_number ? billSummaries.get(b.sc_number)?.max_billed_units : null) ?? 0;
      return bUnits - aUnits;
    });
  } else if (filters.sortBy === 'units_asc') {
    exportProspects.sort((a, b) => {
      const aUnits = (a.sc_number ? billSummaries.get(a.sc_number)?.max_billed_units : null) ?? 0;
      const bUnits = (b.sc_number ? billSummaries.get(b.sc_number)?.max_billed_units : null) ?? 0;
      return aUnits - bUnits;
    });
  }

  return exportProspects.map((p) => {
    const bs = p.sc_number ? billSummaries.get(p.sc_number) : undefined;
    return {
      sc_number: p.sc_number || null,
      customer_name: p.customer_name || null,
      circle_name: p.circle_name || null,
      division_name: p.division_name || null,
      subdiv_name: p.subdiv_name || null,
      ero_name: p.ero_name || null,
      section_name: p.section_name || null,
      mandal_name: p.mandal_name || null,
      sub_station_name: p.sub_station_name || null,
      area_name: p.area_name || null,
      village_name: p.village_name || null,
      category: p.category || null,
      eb_status: p.eb_status || null,
      phase: p.phase || null,
      contracted_load: p.contracted_load ?? null,
      connected_load: p.connected_load ?? null,
      load_unit: p.load_unit || null,
      meter_no: p.meter_no || null,
      feeder_name: p.feeder_name || null,
      panchayath_name: p.panchayath_name || null,
      assembly_constituency: p.assembly_constituency || null,
      mobile_number: p.mobile_number || null,
      email: p.email || null,
      existing_load_kw: p.existing_load_kw ?? null,
      existing_solar_load_kw: p.existing_solar_load_kw ?? null,
      applied_solar_load_kw: p.applied_solar_load_kw ?? null,
      np_registration_number: p.np_registration_number || null,
      ep_registration_number: p.ep_registration_number || null,
      complaint_date: p.complaint_date || null,
      national_portal_status: p.national_portal_status || null,
      epdcl_portal_status: p.epdcl_portal_status || null,
      bill_amount_1: p.bill_amount_1 ?? null,
      bill_month_1: p.bill_month_1 || null,
      bill_amount_2: p.bill_amount_2 ?? null,
      bill_month_2: p.bill_month_2 || null,
      bill_amount_3: p.bill_amount_3 ?? null,
      bill_month_3: p.bill_month_3 || null,
      call_status: CALL_STATUS_LABELS[p.call_status] || p.call_status,
      remark: p.remark || null,
      follow_up_date: p.follow_up_date || null,
      last_called_at: p.last_called_at || null,
      called_by_name: p.called_by_profile?.full_name || null,
      is_existing_customer: p.is_existing_customer,
      created_at: p.created_at,
      max_billed_units: bs?.max_billed_units ?? null,
      max_units_bill_amount: bs?.max_units_bill_amount ?? null,
      max_bill_amount: bs?.max_bill_amount ?? null,
      latest_units: bs?.latest_units ?? null,
      latest_bill_amount: bs?.latest_bill_amount ?? null,
      latest_bill_month: bs?.latest_bill_month ?? null,
      recent_units: bs?.recent_units ?? null,
      recent_bill_amount: bs?.recent_bill_amount ?? null,
      recent_bill_month: bs?.recent_bill_month ?? null,
      high_usage: bs?.high_usage ?? false,
    };
  });
}

export async function fetchProspectSCOnlyForExport(
  filters: ProspectFilterOptions,
  limit?: number
): Promise<string[]> {
  const billConditions: { column: string; op: FilterOperator; value: number; maxValue?: number }[] = [];
  if (filters.billAmount && filters.billAmount.value > 0)
    billConditions.push({ column: 'bill_amount', op: filters.billAmount.operator, value: filters.billAmount.value, maxValue: filters.billAmount.maxValue });
  if (filters.billUnits && filters.billUnits.value > 0)
    billConditions.push({ column: 'billed_units', op: filters.billUnits.operator, value: filters.billUnits.value, maxValue: filters.billUnits.maxValue });

  if (billConditions.length > 0) {
    const allScNumbers: string[] = [];
    let currentPage = 1;
    const pageSize = 1000;
    let totalCount = 0;

    do {
      const remaining = limit != null ? limit - allScNumbers.length : undefined;
      const curPageSize = remaining != null ? Math.min(pageSize, remaining) : pageSize;
      if (remaining != null && remaining <= 0) break;

      const result = await fetchProspects({
        ...filters,
        page: currentPage,
        pageSize: curPageSize,
      });

      for (const p of result.prospects) {
        if (p.sc_number) allScNumbers.push(p.sc_number);
      }

      totalCount = result.total;
      currentPage++;
    } while (allScNumbers.length < totalCount && (limit == null || allScNumbers.length < limit));

    return limit != null ? allScNumbers.slice(0, limit) : allScNumbers;
  }

  const allScNumbers: string[] = [];
  const pageSize = 1000;
  let offset = 0;
  let totalCount = 0;

  do {
    const remaining = limit != null ? limit - allScNumbers.length : undefined;
    const curPageSize = remaining != null ? Math.min(pageSize, remaining) : pageSize;
    if (remaining != null && remaining <= 0) break;
    if (totalCount > 0 && offset >= totalCount) break;

    let query = supabase
      .from('lead_prospects')
      .select('sc_number', { count: 'exact' })
      .range(offset, offset + curPageSize - 1);

    const sortBy = filters.sortBy || 'created_at_desc';
    if (sortBy === 'created_at_asc') {
      query = query.order('created_at', { ascending: true });
    } else if (sortBy === 'name_asc') {
      query = query.order('customer_name', { ascending: true, nullsFirst: false });
    } else if (sortBy === 'name_desc') {
      query = query.order('customer_name', { ascending: false, nullsFirst: false });
    } else if (sortBy === 'load_desc') {
      query = query.order('applied_solar_load_kw', { ascending: false, nullsFirst: false });
    } else if (sortBy === 'load_asc') {
      query = query.order('applied_solar_load_kw', { ascending: true, nullsFirst: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (filters.search) {
      const searchTrimmed = filters.search.trim();
      const matchedAreaCodes = findAreaCodesForQuery(searchTrimmed, 12);
      let searchCond = `sc_number.ilike.%${searchTrimmed}%,customer_name.ilike.%${searchTrimmed}%,meter_no.ilike.%${searchTrimmed}%,np_registration_number.ilike.%${searchTrimmed}%,ep_registration_number.ilike.%${searchTrimmed}%,village_name.ilike.%${searchTrimmed}%`;
      if (matchedAreaCodes.length > 0) {
        const areaConds = matchedAreaCodes.map((c) => `sc_number.like.%${c}______`).join(',');
        searchCond += `,${areaConds}`;
      }
      query = query.or(searchCond);
    }
    if (filters.circles && filters.circles.length > 0) query = query.in('circle_name', filters.circles);
    if (filters.divisions && filters.divisions.length > 0) query = query.in('division_name', filters.divisions);
    if (filters.subdivs && filters.subdivs.length > 0) query = query.in('subdiv_name', filters.subdivs);
    if (filters.eros && filters.eros.length > 0) query = query.in('ero_name', filters.eros);
    if (filters.sections && filters.sections.length > 0) query = query.in('section_name', filters.sections);
    if (filters.statuses && filters.statuses.length > 0) query = query.in('eb_status', filters.statuses);
    if (filters.callStatuses && filters.callStatuses.length > 0) query = query.in('call_status', filters.callStatuses);
    if (filters.categories && filters.categories.length > 0) query = query.in('category', filters.categories);
    if (filters.mandals && filters.mandals.length > 0) query = query.in('mandal_name', filters.mandals);
    if (filters.subStations && filters.subStations.length > 0) query = query.in('sub_station_name', filters.subStations);
    if (filters.areaCodes && filters.areaCodes.length > 0) {
      if (filters.areaCodes.length === 1) {
        query = query.like('sc_number', `%${filters.areaCodes[0]}______`);
      } else {
        const orConds = filters.areaCodes.map((c) => `sc_number.like.%${c}______`).join(',');
        query = query.or(orConds);
      }
    }
    if (filters.hideSuryaGhar) {
      query = query.eq('is_existing_customer', false);
    }
    if (filters.hideSolarInstalled) {
      query = query
        .not('call_status', 'in', '("solar_already_installed","already_installed")')
        .is('ep_registration_number', null);
    }
    if (filters.importBatchId) query = query.eq('import_batch_id', filters.importBatchId);
    if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom + 'T00:00:00');
    if (filters.dateTo) query = query.lte('created_at', filters.dateTo + 'T23:59:59');
    if (filters.followUpDue) {
      const today = new Date().toISOString().split('T')[0];
      query = query.lte('follow_up_date', today).not('call_status', 'in', '("converted","not_interested")');
    }
    if (filters.calledOnly) {
      query = query.neq('call_status', 'not_called');
    }

    const { data, error, count } = await query;
    if (error) throw error;

    if (count != null) totalCount = count;
    const rows = data || [];
    if (rows.length === 0) break;

    for (const r of rows) {
      if (r.sc_number) allScNumbers.push(r.sc_number);
    }

    offset += rows.length;
  } while (allScNumbers.length < totalCount && (limit == null || allScNumbers.length < limit));

  return limit != null ? allScNumbers.slice(0, limit) : allScNumbers;
}

