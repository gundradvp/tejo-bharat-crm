import { supabase } from './supabase';
import type { EBCustomerRow } from './ebParser';
import type { EBBillRow } from './ebBillParser';
import { parseMonthYear } from './ebBillParser';
import { extractAreaCode, findAreaCodesForQuery } from './areaCodeCatalog';

export { extractAreaCode, findAreaCodesForQuery };

export interface EBCustomer {
  id: string;
  tenant_id: string;
  ero_name: string | null;
  section_name: string | null;
  area_name: string | null;
  sc_number: string;
  sur_name: string | null;
  customer_name: string | null;
  fhp_name: string | null;
  address1: string | null;
  address2: string | null;
  address3: string | null;
  address4: string | null;
  category: string | null;
  uksc_number: string | null;
  contracted_load: number | null;
  connected_load: number | null;
  load_unit: string | null;
  phase: string | null;
  sm_mtr: string | null;
  sub_group: string | null;
  trans_struc_code: string | null;
  feeder_no: string | null;
  feeder_name: string | null;
  sub_station_name: string | null;
  feeder_type: string | null;
  pol_no: string | null;
  service_type: string | null;
  supply_release_date: string | null;
  status: string | null;
  phone: string | null;
  sd_amount: number | null;
  multpf: number | null;
  cat_iiib_flag: string | null;
  meter_no: string | null;
  meter_make: string | null;
  meter_capacity: string | null;
  metering_side: string | null;
  mus_flag: string | null;
  colony_name: string | null;
  assembly_constituency: string | null;
  mandal_name: string | null;
  panchayath_name: string | null;
  sc_st_flag: string | null;
  aadhaar_number: string | null;
  mobile_number: string | null;
  ir_flag: string | null;
  call_status: string;
  remark: string | null;
  last_called_at: string | null;
  called_by: string | null;
  follow_up_date: string | null;
  solar_already_installed: boolean;
  import_batch_id: string | null;
  import_batch_label: string | null;
  created_at: string;
  updated_at: string;
  called_by_profile?: { id: string; full_name: string };
}

export interface EBCustomerCall {
  id: string;
  eb_customer_id: string;
  call_status: string;
  remark: string | null;
  called_by: string | null;
  called_at: string;
  follow_up_date: string | null;
  called_by_profile?: { id: string; full_name: string };
}

export const CALL_STATUSES = [
  'not_called',
  'interested',
  'not_interested',
  'call_back_later',
  'wrong_number',
  'switched_off',
  'not_reachable',
  'call_not_answered',
  'solar_already_installed',
  'converted',
  'visit_scheduled',
] as const;

export const CALL_STATUS_LABELS: Record<string, string> = {
  not_called: 'Not Called',
  interested: 'Interested',
  not_interested: 'Not Interested',
  call_back_later: 'Call Back Later',
  wrong_number: 'Wrong Number',
  switched_off: 'Switched Off',
  not_reachable: 'Not Reachable',
  call_not_answered: 'Call Not Answered',
  solar_already_installed: 'Solar Already Installed',
  converted: 'Converted',
  visit_scheduled: 'Visit Scheduled',
};

export const CALL_STATUS_COLORS: Record<string, string> = {
  not_called: 'bg-gray-100 text-gray-600',
  interested: 'bg-green-100 text-green-700',
  not_interested: 'bg-red-100 text-red-700',
  call_back_later: 'bg-yellow-100 text-yellow-700',
  wrong_number: 'bg-gray-200 text-gray-600',
  switched_off: 'bg-orange-100 text-orange-700',
  not_reachable: 'bg-amber-100 text-amber-700',
  call_not_answered: 'bg-orange-100 text-orange-700',
  solar_already_installed: 'bg-cyan-100 text-cyan-700',
  converted: 'bg-emerald-100 text-emerald-700',
  visit_scheduled: 'bg-blue-100 text-blue-700',
};

export interface EBImportResult {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface EBPaginatedResult {
  customers: EBCustomer[];
  total: number;
}

const PAGE_SIZE = 50;

function sanitizeDate(value: any): string | null {
  if (!value) return null;
  const str = String(value).trim();
  if (!str || str === '-' || str === '--' || str === 'N/A' || str === 'NA') return null;
  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split('T')[0];
}

function rowToPayload(row: EBCustomerRow): Record<string, any> {
  return {
    ero_name: row.ero_name || null,
    section_name: row.section_name || null,
    area_name: row.area_name || null,
    sc_number: row.sc_number ? String(row.sc_number).trim() : null,
    sur_name: row.sur_name || null,
    customer_name: row.customer_name || null,
    fhp_name: row.fhp_name || null,
    address1: row.address1 || null,
    address2: row.address2 || null,
    address3: row.address3 || null,
    address4: row.address4 || null,
    category: row.category || null,
    uksc_number: row.uksc_number || null,
    contracted_load: row.contracted_load ?? null,
    connected_load: row.connected_load ?? null,
    load_unit: row.load_unit || null,
    phase: row.phase || null,
    sm_mtr: row.sm_mtr || null,
    sub_group: row.sub_group || null,
    trans_struc_code: row.trans_struc_code || null,
    feeder_no: row.feeder_no || null,
    feeder_name: row.feeder_name || null,
    sub_station_name: row.sub_station_name || null,
    feeder_type: row.feeder_type || null,
    pol_no: row.pol_no || null,
    service_type: row.service_type || null,
    supply_release_date: sanitizeDate(row.supply_release_date),
    status: row.status || null,
    phone: row.phone || null,
    sd_amount: row.sd_amount ?? null,
    multpf: row.multpf ?? null,
    cat_iiib_flag: row.cat_iiib_flag || null,
    meter_no: row.meter_no || null,
    meter_make: row.meter_make || null,
    meter_capacity: row.meter_capacity || null,
    metering_side: row.metering_side || null,
    mus_flag: row.mus_flag || null,
    colony_name: row.colony_name || null,
    assembly_constituency: row.assembly_constituency || null,
    mandal_name: row.mandal_name || null,
    panchayath_name: row.panchayath_name || null,
    sc_st_flag: row.sc_st_flag || null,
    aadhaar_number: row.aadhaar_number || null,
    mobile_number: row.mobile_number || null,
    ir_flag: row.ir_flag || null,
  };
}

const IMPORT_BATCH_SIZE = 250;
const MAX_RETRIES = 3;

export async function importEBCustomers(
  rows: EBCustomerRow[],
  onProgress?: (current: number, total: number) => void,
  batchLabel?: string
): Promise<EBImportResult> {
  const result: EBImportResult = {
    total: rows.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  const batchId = crypto.randomUUID();
  const label = batchLabel || `Import ${new Date().toLocaleString('en-IN')}`;

  // Build payloads, tracking how many are skipped due to missing SC number
  const payloads: Record<string, any>[] = [];
  // Deduplicate by SC number within this import
  const seenSc = new Set<string>();
  let duplicateSkipped = 0;
  for (const row of rows) {
    const payload = rowToPayload(row);
    if (!payload.sc_number) {
      result.skipped++;
      continue;
    }
    if (seenSc.has(payload.sc_number)) {
      duplicateSkipped++;
      continue;
    }
    seenSc.add(payload.sc_number);
    payload.import_batch_id = batchId;
    payload.import_batch_label = label;
    payloads.push(payload);
  }

  if (duplicateSkipped > 0) {
    result.errors.push(`${duplicateSkipped} duplicate SC number${duplicateSkipped > 1 ? 's' : ''} skipped within this import`);
  }

  // Process batches sequentially with retry to avoid overwhelming the DB
  for (let i = 0; i < payloads.length; i += IMPORT_BATCH_SIZE) {
    const batch = payloads.slice(i, i + IMPORT_BATCH_SIZE);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const { error } = await supabase
        .from('eb_customers')
        .upsert(batch, { onConflict: 'tenant_id,sc_number' });

      if (!error) {
        result.inserted += batch.length;
        break;
      }

      if (attempt === MAX_RETRIES) {
        result.errors.push(
          `Batch ${Math.floor(i / IMPORT_BATCH_SIZE) + 1} failed after ${MAX_RETRIES} retries: ${error.message}`
        );
      }
    }

    const processed = Math.min(i + IMPORT_BATCH_SIZE, payloads.length);
    onProgress?.(processed, payloads.length);
  }

  // Sync solar_already_installed flag from lead_prospects for imported SC numbers
  if (payloads.length > 0) {
    try {
      const importedScs = payloads.map((p) => p.sc_number).filter(Boolean) as string[];
      for (let i = 0; i < importedScs.length; i += 500) {
        const chunk = importedScs.slice(i, i + 500);
        const { data: solarProspects } = await supabase
          .from('lead_prospects')
          .select('sc_number')
          .in('sc_number', chunk)
          .eq('call_status', 'solar_already_installed');
        if (solarProspects && solarProspects.length > 0) {
          const solarScs = solarProspects.map((p) => p.sc_number).filter(Boolean);
          await supabase
            .from('eb_customers')
            .update({ solar_already_installed: true })
            .in('sc_number', solarScs);
        }
      }
    } catch (err) {
      result.errors.push(`Solar flag sync warning: ${(err as Error).message}`);
    }
  }

  onProgress?.(payloads.length, payloads.length);
  return result;
}

export type FilterOperator = 'gte' | 'gt' | 'lte' | 'lt' | 'eq' | 'between';

export interface BillFilter {
  operator: FilterOperator;
  value: number;
  maxValue?: number;
}

export type EBSortOption =
  | 'units_desc'
  | 'units_asc'
  | 'created_at_desc'
  | 'created_at_asc'
  | 'name_asc'
  | 'name_desc'
  | 'load_desc'
  | 'load_asc';

export interface EBFilterOptions {
  search?: string;
  eros?: string[];
  sections?: string[];
  statuses?: string[];
  callStatuses?: string[];
  categories?: string[];
  mandals?: string[];
  subStations?: string[];
  areas?: string[];
  areaCodes?: string[];
  excludeSolar?: boolean;
  importBatchId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  billAmountMin?: number | null;
  billAmountMax?: number | null;
  billUnitsMin?: number | null;
  billUnitsMax?: number | null;
  billAmount?: BillFilter | null;
  billUnits?: BillFilter | null;
  followUpDue?: boolean;
  calledOnly?: boolean;
  jspMobiles?: string[];
  sortBy?: EBSortOption;
  page?: number;
  pageSize?: number;
}

export async function fetchEBCustomers(
  filters: EBFilterOptions
): Promise<EBPaginatedResult> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  if (filters.jspMobiles !== undefined) {
    if (!filters.jspMobiles || filters.jspMobiles.length === 0) {
      return { customers: [], total: 0 };
    }
  }

  const billConditions: { column: string; op: FilterOperator; value: number; maxValue?: number }[] = [];

  if (filters.billAmountMin != null && filters.billAmountMin > 0)
    billConditions.push({ column: 'bill_amount', op: 'gte', value: filters.billAmountMin });
  if (filters.billAmountMax != null && filters.billAmountMax > 0)
    billConditions.push({ column: 'bill_amount', op: 'lte', value: filters.billAmountMax });
  if (filters.billUnitsMin != null && filters.billUnitsMin > 0)
    billConditions.push({ column: 'billed_units', op: 'gte', value: filters.billUnitsMin });
  if (filters.billUnitsMax != null && filters.billUnitsMax > 0)
    billConditions.push({ column: 'billed_units', op: 'lte', value: filters.billUnitsMax });

  if (filters.billAmount && filters.billAmount.value > 0)
    billConditions.push({ column: 'bill_amount', op: filters.billAmount.operator, value: filters.billAmount.value, maxValue: filters.billAmount.maxValue });
  if (filters.billUnits && filters.billUnits.value > 0)
    billConditions.push({ column: 'billed_units', op: filters.billUnits.operator, value: filters.billUnits.value, maxValue: filters.billUnits.maxValue });

  const hasBillCond = billConditions.length > 0;

  if (hasBillCond) {
    // Use RPC for bill-filtered queries (send comma-separated values for multi-select)
    const rpcParams = {
      p_search: filters.search || null,
      p_ero: filters.eros && filters.eros.length > 0 ? filters.eros.join(',') : null,
      p_section: filters.sections && filters.sections.length > 0 ? filters.sections.join(',') : null,
      p_status: filters.statuses && filters.statuses.length > 0 ? filters.statuses.join(',') : null,
      p_call_status: filters.callStatuses && filters.callStatuses.length > 0 ? filters.callStatuses.join(',') : null,
      p_category: filters.categories && filters.categories.length > 0 ? filters.categories.join(',') : null,
      p_mandal: filters.mandals && filters.mandals.length > 0 ? filters.mandals.join(',') : null,
      p_sub_station: filters.subStations && filters.subStations.length > 0 ? filters.subStations.join(',') : null,
      p_area: (filters.areas && filters.areas.length > 0 ? filters.areas : filters.areaCodes)?.join(',') || null,
      p_exclude_solar: filters.excludeSolar || false,
      p_import_batch_id: filters.importBatchId || null,
      p_date_from: filters.dateFrom || null,
      p_date_to: filters.dateTo || null,
      bill_conditions: billConditions.map((c) => ({ column: c.column, operator: c.op, value: c.value, max_value: c.maxValue ?? null })),
      p_page_size: pageSize,
      p_page_offset: offset,
    };

    const { data: rpcData, error: rpcError } = await supabase.rpc('search_eb_customers', rpcParams);
    if (rpcError) throw rpcError;
    const result = rpcData[0];
    let rows = (result.rows || []) as EBCustomer[];
    const rpcTotal = Number(result.total_count) || 0;
    let total = rpcTotal > 0 ? rpcTotal : rows.length;

    if (filters.areaCodes && filters.areaCodes.length > 0) {
      const allowedCodes = new Set(filters.areaCodes);
      rows = rows.filter((c) => {
        const code = extractAreaCode(c.sc_number);
        return code && allowedCodes.has(code);
      });
      if (rpcTotal === 0) {
        total = rows.length;
      }
    }
    return { customers: rows, total: Math.max(total, rows.length) };
  }

  // If sorting by billed units and no search/JSP mobile filters are applied, try querying top bills
  if ((filters.sortBy === 'units_desc' || filters.sortBy === 'units_asc') && !filters.search && !filters.jspMobiles) {
    const isAsc = filters.sortBy === 'units_asc';
    try {
      let billQuery = supabase
        .from('eb_customer_bills')
        .select(`
          billed_units,
          eb_customer_id,
          eb_customers!inner(*, called_by_profile:profiles!eb_customers_called_by_fkey(id, full_name))
        `)
        .not('billed_units', 'is', null)
        .gt('billed_units', 0)
        .order('billed_units', { ascending: isAsc })
        .range(offset, offset + Math.max(pageSize * 3, 150) - 1);

      if (filters.eros && filters.eros.length > 0) billQuery = billQuery.in('eb_customers.ero_name', filters.eros);
      if (filters.sections && filters.sections.length > 0) billQuery = billQuery.in('eb_customers.section_name', filters.sections);
      if (filters.statuses && filters.statuses.length > 0) billQuery = billQuery.in('eb_customers.status', filters.statuses);
      if (filters.callStatuses && filters.callStatuses.length > 0) billQuery = billQuery.in('eb_customers.call_status', filters.callStatuses);
      if (filters.categories && filters.categories.length > 0) billQuery = billQuery.in('eb_customers.category', filters.categories);
      if (filters.mandals && filters.mandals.length > 0) billQuery = billQuery.in('eb_customers.mandal_name', filters.mandals);
      if (filters.subStations && filters.subStations.length > 0) billQuery = billQuery.in('eb_customers.sub_station_name', filters.subStations);
      if (filters.areas && filters.areas.length > 0) billQuery = billQuery.in('eb_customers.area_name', filters.areas);
      if (filters.areaCodes && filters.areaCodes.length > 0) {
        if (filters.areaCodes.length === 1) {
          billQuery = billQuery.like('eb_customers.sc_number', `%${filters.areaCodes[0]}______`);
        } else {
          const orConds = filters.areaCodes.map((c) => `eb_customers.sc_number.like.%${c}______`).join(',');
          billQuery = billQuery.or(orConds);
        }
      }
      if (filters.excludeSolar) {
        billQuery = billQuery.eq('eb_customers.solar_already_installed', false).neq('eb_customers.call_status', 'solar_already_installed');
      }

      const { data: billData, error: billError } = await billQuery;
      if (!billError && billData && billData.length > 0) {
        const seenIds = new Set<string>();
        const customers: EBCustomer[] = [];
        for (const row of billData as any[]) {
          const cust = row.eb_customers as EBCustomer;
          if (cust && cust.id && !seenIds.has(cust.id)) {
            seenIds.add(cust.id);
            customers.push(cust);
            if (customers.length >= pageSize) break;
          }
        }
        if (customers.length > 0) {
          const { count } = await supabase
            .from('eb_customers')
            .select('id', { count: 'exact', head: true });
          return { customers, total: count ?? customers.length };
        }
      }
    } catch (e) {
      console.warn('Bill units sort query fallback to standard query:', e);
    }
  }

  // Native Supabase query on eb_customers
  let query = supabase
    .from('eb_customers')
    .select('*, called_by_profile:profiles!eb_customers_called_by_fkey(id, full_name)', { count: 'exact' })
    .range(offset, offset + pageSize - 1);

  const sortBy = filters.sortBy || 'created_at_desc';
  if (sortBy === 'created_at_asc') {
    query = query.order('created_at', { ascending: true });
  } else if (sortBy === 'name_asc') {
    query = query.order('customer_name', { ascending: true, nullsFirst: false });
  } else if (sortBy === 'name_desc') {
    query = query.order('customer_name', { ascending: false, nullsFirst: false });
  } else if (sortBy === 'load_desc') {
    query = query.order('contracted_load', { ascending: false, nullsFirst: false });
  } else if (sortBy === 'load_asc') {
    query = query.order('contracted_load', { ascending: true, nullsFirst: false });
  } else {
    // created_at_desc or default/fallback
    query = query.order('created_at', { ascending: false });
  }

  if (filters.search) {
    const searchTrimmed = filters.search.trim();
    const matchedAreaCodes = findAreaCodesForQuery(searchTrimmed, 12);
    let searchCond = `sc_number.ilike.%${searchTrimmed}%,customer_name.ilike.%${searchTrimmed}%,mobile_number.ilike.%${searchTrimmed}%,phone.ilike.%${searchTrimmed}%,meter_no.ilike.%${searchTrimmed}%,area_name.ilike.%${searchTrimmed}%,address1.ilike.%${searchTrimmed}%,address2.ilike.%${searchTrimmed}%,address3.ilike.%${searchTrimmed}%,address4.ilike.%${searchTrimmed}%`;
    if (matchedAreaCodes.length > 0) {
      const areaConds = matchedAreaCodes.map((c) => `sc_number.like.%${c}______`).join(',');
      searchCond += `,${areaConds}`;
    }
    query = query.or(searchCond);
  }
  if (filters.areaCodes && filters.areaCodes.length > 0) {
    if (filters.areaCodes.length === 1) {
      query = query.like('sc_number', `%${filters.areaCodes[0]}______`);
    } else {
      const orConds = filters.areaCodes.map((c) => `sc_number.like.%${c}______`).join(',');
      query = query.or(orConds);
    }
  }
  if (filters.jspMobiles && filters.jspMobiles.length > 0) {
    const mobilesCsv = filters.jspMobiles.join(',');
    query = query.or(`mobile_number.in.(${mobilesCsv}),phone.in.(${mobilesCsv})`);
  }
  if (filters.eros && filters.eros.length > 0) query = query.in('ero_name', filters.eros);
  if (filters.sections && filters.sections.length > 0) query = query.in('section_name', filters.sections);
  if (filters.statuses && filters.statuses.length > 0) query = query.in('status', filters.statuses);
  if (filters.callStatuses && filters.callStatuses.length > 0) query = query.in('call_status', filters.callStatuses);
  if (filters.categories && filters.categories.length > 0) query = query.in('category', filters.categories);
  if (filters.mandals && filters.mandals.length > 0) query = query.in('mandal_name', filters.mandals);
  if (filters.subStations && filters.subStations.length > 0) query = query.in('sub_station_name', filters.subStations);
  if (filters.areas && filters.areas.length > 0) query = query.in('area_name', filters.areas);
  if (filters.excludeSolar) {
    query = query.eq('solar_already_installed', false).neq('call_status', 'solar_already_installed');
  }
  if (filters.importBatchId) query = query.eq('import_batch_id', filters.importBatchId);
  if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
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

  let customers = (data as any) || [];
  let totalCount = count ?? 0;

  if (filters.followUpDue) {
    const today = new Date().toISOString().split('T')[0];
    customers = customers.filter((c: any) =>
      c.follow_up_date && c.follow_up_date <= today &&
      !['converted', 'not_interested'].includes(c.call_status)
    );
    totalCount = customers.length;
  }

  return { customers, total: totalCount };
}

export async function fetchEBFilterValues(selectedFilters?: {
  eros?: string[];
  sections?: string[];
}): Promise<{
  eros: string[];
  sections: string[];
  statuses: string[];
  categories: string[];
  mandals: string[];
  subStations: string[];
  areas: string[];
}> {
  const hasEroFilter = selectedFilters?.eros && selectedFilters.eros.length > 0;
  const hasSectionFilter = selectedFilters?.sections && selectedFilters.sections.length > 0;

  if (!hasEroFilter && !hasSectionFilter) {
    const { data, error } = await supabase.rpc('get_eb_filter_values');

    if (error) throw error;

    if (!data || data.length === 0) {
      return { eros: [], sections: [], statuses: [], categories: [], mandals: [], subStations: [], areas: [] };
    }

    const row = data[0];
    const sorted = (arr: string[] | null) =>
      arr ? [...arr].sort((a, b) => a.localeCompare(b)) : [];

    return {
      eros: sorted(row.eros),
      sections: sorted(row.sections),
      statuses: sorted(row.statuses),
      categories: sorted(row.categories),
      mandals: sorted(row.mandals),
      subStations: sorted(row.sub_stations),
      areas: sorted(row.areas),
    };
  }

  // Dependent cascading lookup when ERO or Section is selected
  let query = supabase.from('eb_customers').select('ero_name, section_name, sub_station_name, mandal_name, area_name, status, category').limit(2000);
  if (hasEroFilter) {
    query = query.in('ero_name', selectedFilters!.eros!);
  }
  if (hasSectionFilter) {
    query = query.in('section_name', selectedFilters!.sections!);
  }

  const { data, error } = await query;
  if (error) throw error;

  const eros = new Set<string>();
  const sections = new Set<string>();
  const statuses = new Set<string>();
  const categories = new Set<string>();
  const mandals = new Set<string>();
  const subStations = new Set<string>();
  const areas = new Set<string>();

  (data || []).forEach((row: any) => {
    if (row.ero_name) eros.add(row.ero_name);
    if (row.section_name) sections.add(row.section_name);
    if (row.status) statuses.add(row.status);
    if (row.category) categories.add(row.category);
    if (row.mandal_name) mandals.add(row.mandal_name);
    if (row.sub_station_name) subStations.add(row.sub_station_name);
    if (row.area_name) areas.add(row.area_name);
  });

  // Fetch full ERO list so the ERO dropdown always lists all ERO choices
  let allEros = Array.from(eros);
  try {
    const { data: allEroData } = await supabase.rpc('get_eb_filter_values');
    if (allEroData && allEroData.length > 0 && allEroData[0].eros) {
      allEros = allEroData[0].eros;
    }
  } catch { /* use filtered eros fallback */ }

  const sorted = (set: Set<string>) => Array.from(set).sort((a, b) => a.localeCompare(b));

  return {
    eros: [...allEros].sort((a, b) => a.localeCompare(b)),
    sections: sorted(sections),
    statuses: sorted(statuses),
    categories: sorted(categories),
    mandals: sorted(mandals),
    subStations: sorted(subStations),
    areas: sorted(areas),
  };
}

export async function fetchEBCustomerStats(): Promise<{
  total: number;
  called: number;
  interested: number;
  followUpsDue: number;
  live: number;
}> {
  const { count: total } = await supabase
    .from('eb_customers')
    .select('id', { count: 'exact', head: true });

  const { count: called } = await supabase
    .from('eb_customers')
    .select('id', { count: 'exact', head: true })
    .neq('call_status', 'not_called');

  const { count: interested } = await supabase
    .from('eb_customers')
    .select('id', { count: 'exact', head: true })
    .in('call_status', ['interested', 'converted']);

  const today = new Date().toISOString().split('T')[0];
  const { count: followUpsDue } = await supabase
    .from('eb_customers')
    .select('id', { count: 'exact', head: true })
    .lte('follow_up_date', today)
    .not('call_status', 'in', '("converted","not_interested")');

  const { count: live } = await supabase
    .from('eb_customers')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'LIVE');

  return {
    total: total ?? 0,
    called: called ?? 0,
    interested: interested ?? 0,
    followUpsDue: followUpsDue ?? 0,
    live: live ?? 0,
  };
}

export async function updateEBCustomerCallStatus(
  customerId: string,
  callStatus: string,
  remark: string | null,
  followUpDate: string | null,
  userId: string
): Promise<void> {
  const updatePayload: Record<string, any> = {
    call_status: callStatus,
    remark: remark || null,
    follow_up_date: followUpDate || null,
  };

  if (callStatus !== 'not_called') {
    updatePayload.last_called_at = new Date().toISOString();
    updatePayload.called_by = userId;
  }

  const { error: updateError } = await supabase
    .from('eb_customers')
    .update(updatePayload)
    .eq('id', customerId);

  if (updateError) throw updateError;

  const { error: callError } = await supabase.from('eb_customer_calls').insert({
    eb_customer_id: customerId,
    call_status: callStatus,
    remark: remark || null,
    called_by: userId,
    follow_up_date: followUpDate || null,
  });

  if (callError) throw callError;
}

export async function fetchEBCallHistory(customerId: string): Promise<EBCustomerCall[]> {
  const { data, error } = await supabase
    .from('eb_customer_calls')
    .select('*, called_by_profile:profiles!eb_customer_calls_called_by_fkey(id, full_name)')
    .eq('eb_customer_id', customerId)
    .order('called_at', { ascending: false });

  if (error) throw error;
  return (data as any) || [];
}

export async function deleteAllEBCustomers(): Promise<void> {
  const { error } = await supabase.from('eb_customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
}

export interface EBImportBatch {
  batch_id: string;
  batch_label: string;
  row_count: number;
  latest_created_at: string;
}

export async function fetchEBImportBatches(): Promise<EBImportBatch[]> {
  const { data, error } = await supabase
    .from('eb_customers')
    .select('import_batch_id, import_batch_label, created_at')
    .not('import_batch_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(2000);

  if (error) throw error;

  const batchMap = new Map<string, EBImportBatch>();
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

export async function updateEBSolarFlag(
  customerId: string,
  solarInstalled: boolean
): Promise<void> {
  const { error } = await supabase
    .from('eb_customers')
    .update({ solar_already_installed: solarInstalled })
    .eq('id', customerId);
  if (error) throw error;
}

export interface EBBillRecord {
  id: string;
  eb_customer_id: string | null;
  sc_number: string;
  bill_month: string | null;
  bill_year: number | null;
  bill_month_index: number | null;
  billed_units: number | null;
  bill_amount: number | null;
  bill_status: string | null;
  created_at: string;
}

export interface EBBillImportResult {
  total: number;
  matched: number;
  unmatched: number;
  billsInserted: number;
  errors: string[];
}

export async function importEBBills(
  rows: EBBillRow[],
  onProgress?: (current: number, total: number) => void
): Promise<EBBillImportResult> {
  const result: EBBillImportResult = {
    total: rows.length,
    matched: 0,
    unmatched: 0,
    billsInserted: 0,
    errors: [],
  };

  const scNumbers = [...new Set(rows.map((r) => r.sc_number).filter(Boolean))];
  const customerMap = new Map<string, string>();

  const BATCH_SIZE = 500;
  for (let i = 0; i < scNumbers.length; i += BATCH_SIZE) {
    const batch = scNumbers.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('eb_customers')
      .select('id, sc_number')
      .in('sc_number', batch);

    if (error) {
      result.errors.push(`Failed to look up SC numbers batch: ${error.message}`);
      continue;
    }

    for (const c of data || []) {
      customerMap.set(c.sc_number, c.id);
    }
  }

  const billPayloads: Record<string, any>[] = [];

  for (const row of rows) {
    const customerId = customerMap.get(row.sc_number);
    if (customerId) {
      result.matched++;
    } else {
      result.unmatched++;
    }

    for (const bill of row.bills) {
      const parsed = parseMonthYear(bill.bill_month);
      billPayloads.push({
        eb_customer_id: customerId || null,
        sc_number: row.sc_number,
        bill_month: bill.bill_month,
        bill_year: parsed?.year ?? null,
        bill_month_index: parsed?.monthIndex ?? null,
        billed_units: bill.billed_units,
        bill_amount: bill.bill_amount,
        bill_status: row.bill_status || null,
      });
    }
  }

  for (let i = 0; i < billPayloads.length; i += BATCH_SIZE) {
    const batch = billPayloads.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('eb_customer_bills')
      .upsert(batch, { onConflict: 'tenant_id,sc_number,bill_month' });

    if (error) {
      result.errors.push(`Bill batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${error.message}`);
    } else {
      result.billsInserted += batch.length;
    }

    onProgress?.(Math.min(i + BATCH_SIZE, billPayloads.length), billPayloads.length);
  }

  onProgress?.(billPayloads.length, billPayloads.length);
  return result;
}

export async function fetchEBBillsForCustomer(customerId: string): Promise<EBBillRecord[]> {
  const { data, error } = await supabase
    .from('eb_customer_bills')
    .select('*')
    .eq('eb_customer_id', customerId)
    .order('bill_year', { ascending: false })
    .order('bill_month_index', { ascending: false });

  if (error) throw error;
  return (data as any) || [];
}

export async function fetchBillsByScNumber(scNumber: string): Promise<EBBillRecord[]> {
  const { data, error } = await supabase
    .from('eb_customer_bills')
    .select('*')
    .eq('sc_number', scNumber)
    .order('bill_year', { ascending: false })
    .order('bill_month_index', { ascending: false });

  if (error) throw error;
  return (data as any) || [];
}

export interface EBBillSummary {
  eb_customer_id: string;
  max_billed_units: number | null;
  max_units_bill_amount: number | null;
  max_bill_amount: number | null;
  latest_bill_month: string | null;
  latest_units: number | null;
  latest_bill_amount: number | null;
  recent_units: number | null;
  recent_bill_amount: number | null;
  recent_bill_month: string | null;
  high_usage: boolean;
}

export const HIGH_USAGE_THRESHOLD = 500;

function billSortKey(year: number | null, monthIndex: number | null): number {
  return (year ?? 0) * 100 + (monthIndex ?? 0);
}

export async function fetchEBBillSummaries(
  customerIds: string[]
): Promise<Map<string, EBBillSummary>> {
  const map = new Map<string, EBBillSummary>();
  const latestKeyMap = new Map<string, number>();
  if (customerIds.length === 0) return map;

  const BATCH = 50;
  for (let i = 0; i < customerIds.length; i += BATCH) {
    const batch = customerIds.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from('eb_customer_bills')
      .select(`
        eb_customer_id,
        billed_units,
        bill_amount,
        bill_month,
        bill_year,
        bill_month_index
      `)
      .in('eb_customer_id', batch);

    if (error) throw error;

    for (const row of data || []) {
      const cid = row.eb_customer_id as string;
      if (!cid) continue;
      const units = row.billed_units != null ? Number(row.billed_units) : null;
      const amount = row.bill_amount != null ? Number(row.bill_amount) : null;
      const month = row.bill_month ?? null;
      const sortKey = billSortKey(row.bill_year as number | null, row.bill_month_index as number | null);
      const existing = map.get(cid);
      if (!existing) {
        map.set(cid, {
          eb_customer_id: cid,
          max_billed_units: units,
          max_units_bill_amount: amount,
          max_bill_amount: amount,
          latest_bill_month: month,
          latest_units: units,
          latest_bill_amount: amount,
          recent_units: units,
          recent_bill_amount: amount,
          recent_bill_month: month,
          high_usage: units != null && units > HIGH_USAGE_THRESHOLD,
        });
        latestKeyMap.set(cid, sortKey);
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
        if (sortKey > 0 && sortKey >= (latestKeyMap.get(cid) ?? 0)) {
          existing.latest_bill_month = month;
          existing.latest_units = units;
          existing.latest_bill_amount = amount;
          existing.recent_units = units;
          existing.recent_bill_amount = amount;
          existing.recent_bill_month = month;
          latestKeyMap.set(cid, sortKey);
        }
      }
    }
  }
  return map;
}

export async function fetchExistingSuryaGharSCNumbers(
  scNumbers: string[]
): Promise<Set<string>> {
  const result = new Set<string>();
  if (scNumbers.length === 0) return result;

  const BATCH = 500;
  for (let i = 0; i < scNumbers.length; i += BATCH) {
    const batch = scNumbers.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from('customers')
      .select('consumer_number')
      .in('consumer_number', batch)
      .not('consumer_number', 'is', null);

    if (error) throw error;
    for (const row of data || []) {
      if (row.consumer_number) result.add(row.consumer_number);
    }
  }
  return result;
}

export async function fetchProspectSCNumbers(
  scNumbers: string[]
): Promise<Set<string>> {
  const result = new Set<string>();
  if (scNumbers.length === 0) return result;

  const BATCH = 500;
  for (let i = 0; i < scNumbers.length; i += BATCH) {
    const batch = scNumbers.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from('lead_prospects')
      .select('sc_number')
      .in('sc_number', batch)
      .not('sc_number', 'is', null);

    if (error) throw error;
    for (const row of data || []) {
      if (row.sc_number) result.add(row.sc_number);
    }
  }
  return result;
}

export interface EBExportRow {
  sc_number: string;
  customer_name: string | null;
  mobile_number: string | null;
  phone: string | null;
  ero_name: string | null;
  section_name: string | null;
  sub_station_name: string | null;
  area_name: string | null;
  mandal_name: string | null;
  panchayath_name: string | null;
  category: string | null;
  status: string | null;
  phase: string | null;
  contracted_load: number | null;
  connected_load: number | null;
  load_unit: string | null;
  meter_no: string | null;
  meter_make: string | null;
  service_type: string | null;
  supply_release_date: string | null;
  call_status: string;
  remark: string | null;
  follow_up_date: string | null;
  last_called_at: string | null;
  solar_already_installed: boolean;
  address: string | null;
  max_billed_units: number | null;
  max_units_bill_amount: number | null;
  max_bill_amount: number | null;
  latest_bill_month: string | null;
  latest_units: number | null;
  latest_bill_amount: number | null;
  recent_units: number | null;
  recent_bill_amount: number | null;
  recent_bill_month: string | null;
  bills: { bill_month: string | null; billed_units: number | null; bill_amount: number | null; bill_status: string | null }[];
}

export async function fetchEBCustomersForExport(
  filters: EBFilterOptions,
  limit?: number
): Promise<EBExportRow[]> {
  const allCustomers: EBCustomer[] = [];
  let currentPage = 1;
  const exportPageSize = 500;
  let totalCount = 0;

  do {
    const remaining = limit != null ? limit - allCustomers.length : undefined;
    const pageSize = remaining != null ? Math.min(exportPageSize, remaining) : exportPageSize;
    if (remaining != null && remaining <= 0) break;

    const result = await fetchEBCustomers({
      ...filters,
      page: currentPage,
      pageSize,
    });
    allCustomers.push(...result.customers);
    totalCount = result.total;
    currentPage++;
  } while (allCustomers.length < totalCount && allCustomers.length > 0 && (limit == null || allCustomers.length < limit));

  const exportCustomers = limit != null ? allCustomers.slice(0, limit) : allCustomers;

  const customerIds = exportCustomers.map((c) => c.id);
  const billSummaries = await fetchEBBillSummaries(customerIds);

  const allBillsMap = new Map<string, EBBillRecord[]>();
  for (let i = 0; i < customerIds.length; i += 200) {
    const batch = customerIds.slice(i, i + 200);
    const { data: billsData, error: billsError } = await supabase
      .from('eb_customer_bills')
      .select('*')
      .in('eb_customer_id', batch)
      .order('bill_year', { ascending: true })
      .order('bill_month_index', { ascending: true });

    if (billsError) throw billsError;

    for (const bill of billsData || []) {
      const cid = bill.eb_customer_id as string;
      if (!allBillsMap.has(cid)) allBillsMap.set(cid, []);
      allBillsMap.get(cid)!.push(bill as EBBillRecord);
    }
  }

  if (filters.sortBy === 'units_desc') {
    exportCustomers.sort((a, b) => {
      const aUnits = billSummaries.get(a.id)?.max_billed_units ?? (billSummaries.get(a.id)?.recent_units ?? 0);
      const bUnits = billSummaries.get(b.id)?.max_billed_units ?? (billSummaries.get(b.id)?.recent_units ?? 0);
      return bUnits - aUnits;
    });
  } else if (filters.sortBy === 'units_asc') {
    exportCustomers.sort((a, b) => {
      const aUnits = billSummaries.get(a.id)?.max_billed_units ?? (billSummaries.get(a.id)?.recent_units ?? 0);
      const bUnits = billSummaries.get(b.id)?.max_billed_units ?? (billSummaries.get(b.id)?.recent_units ?? 0);
      return aUnits - bUnits;
    });
  }

  return exportCustomers.map((c) => {
    const summary = billSummaries.get(c.id);
    const bills = allBillsMap.get(c.id) || [];
    return {
      sc_number: c.sc_number,
      customer_name: c.customer_name,
      mobile_number: c.mobile_number,
      phone: c.phone,
      ero_name: c.ero_name,
      section_name: c.section_name,
      sub_station_name: c.sub_station_name,
      area_name: c.area_name,
      mandal_name: c.mandal_name,
      panchayath_name: c.panchayath_name,
      category: c.category,
      status: c.status,
      phase: c.phase,
      contracted_load: c.contracted_load != null ? Number(c.contracted_load) : null,
      connected_load: c.connected_load != null ? Number(c.connected_load) : null,
      load_unit: c.load_unit,
      meter_no: c.meter_no,
      meter_make: c.meter_make,
      service_type: c.service_type,
      supply_release_date: c.supply_release_date,
      call_status: CALL_STATUS_LABELS[c.call_status] || c.call_status,
      remark: c.remark,
      follow_up_date: c.follow_up_date,
      last_called_at: c.last_called_at,
      solar_already_installed: c.solar_already_installed || false,
      address: [c.address1, c.address2, c.address3, c.address4].filter(Boolean).join(', ') || null,
      max_billed_units: summary?.max_billed_units ?? null,
      max_units_bill_amount: summary?.max_units_bill_amount ?? null,
      max_bill_amount: summary?.max_bill_amount ?? null,
      latest_bill_month: summary?.latest_bill_month ?? null,
      latest_units: summary?.latest_units ?? null,
      latest_bill_amount: summary?.latest_bill_amount ?? null,
      recent_units: summary?.recent_units ?? null,
      recent_bill_amount: summary?.recent_bill_amount ?? null,
      recent_bill_month: summary?.recent_bill_month ?? null,
      bills: bills.map((b) => ({
        bill_month: b.bill_month,
        billed_units: b.billed_units != null ? Number(b.billed_units) : null,
        bill_amount: b.bill_amount != null ? Number(b.bill_amount) : null,
        bill_status: b.bill_status,
      })),
    };
  });
}

export interface JSPMemberLink {
  id: number;
  jsp_id: string | null;
  name: string | null;
  mobile: string | null;
  constituency_name: string | null;
  mandal_name: string | null;
  panchayat_name: string | null;
  volunteername: string | null;
  volunteer_mobile: string | null;
  status: string | null;
}

export async function fetchJSPMembersForEBCustomers(
  mobiles: string[]
): Promise<Record<string, JSPMemberLink>> {
  if (!mobiles || mobiles.length === 0) return {};

  const cleanMobiles = Array.from(
    new Set(
      mobiles
        .filter(Boolean)
        .map((m) => m.replace(/\D/g, '').slice(-10))
        .filter((m) => m.length === 10)
    )
  );

  if (cleanMobiles.length === 0) return {};

  try {
    const { data, error } = await supabase
      .from('jsp_kriya_members')
      .select('id, jsp_id, name, mobile, constituency_name, mandal_name, panchayat_name, volunteername, volunteer_mobile, status')
      .in('mobile', cleanMobiles);

    if (error || !data) {
      console.error('Error fetching JSP member links:', error);
      return {};
    }

    const resultMap: Record<string, JSPMemberLink> = {};
    data.forEach((member) => {
      if (member.mobile) {
        const cleanKey = member.mobile.replace(/\D/g, '').slice(-10);
        resultMap[cleanKey] = member;
      }
    });

    return resultMap;
  } catch (err) {
    console.error('Error in fetchJSPMembersForEBCustomers:', err);
    return {};
  }
}

export async function fetchJSPVolunteers(assembly?: string): Promise<string[]> {
  try {
    let query = supabase
      .from('jsp_kriya_members')
      .select('volunteername')
      .not('volunteername', 'is', null);

    if (assembly && assembly.trim()) {
      query = query.eq('constituency_name', assembly.trim());
    }

    const { data, error } = await query.limit(2000);

    if (error || !data) return [];
    const set = new Set<string>();
    data.forEach((r: any) => {
      if (r.volunteername && r.volunteername.trim()) {
        set.add(r.volunteername.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  } catch (err) {
    console.error('Error fetching JSP volunteers:', err);
    return [];
  }
}

export async function fetchMobilesForVolunteer(
  volunteerName?: string,
  assembly?: string
): Promise<string[]> {
  try {
    const hasVolunteer = volunteerName && volunteerName.trim();
    const hasAssembly = assembly && assembly.trim();

    // Guard: Do not query without at least a volunteer or assembly filter.
    // Fetching thousands of unrestricted mobiles builds an oversized GET URL (78KB+) that crashes PostgREST with 414 URI Too Long.
    if (!hasVolunteer && !hasAssembly) {
      return [];
    }

    let query = supabase
      .from('jsp_kriya_members')
      .select('mobile')
      .not('mobile', 'is', null);

    if (hasVolunteer) {
      query = query.eq('volunteername', volunteerName!.trim());
    }
    if (hasAssembly) {
      query = query.eq('constituency_name', assembly!.trim());
    }

    // Cap to 120 numbers to keep URL length well within Cloudflare/Supabase 8KB limit
    const { data, error } = await query.limit(120);
    if (error || !data) return [];

    const set = new Set<string>();
    data.forEach((r: any) => {
      if (r.mobile) {
        const clean = r.mobile.replace(/\D/g, '').slice(-10);
        if (clean.length === 10) set.add(clean);
      }
    });
    return Array.from(set);
  } catch (err) {
    console.error('Error fetching mobiles for volunteer:', err);
    return [];
  }
}

export async function fetchEBSCOnlyForExport(
  filters: EBFilterOptions,
  limit?: number
): Promise<string[]> {
  const billConditions: { column: string; op: FilterOperator; value: number; maxValue?: number }[] = [];

  if (filters.billAmountMin != null && filters.billAmountMin > 0)
    billConditions.push({ column: 'bill_amount', op: 'gte', value: filters.billAmountMin });
  if (filters.billAmountMax != null && filters.billAmountMax > 0)
    billConditions.push({ column: 'bill_amount', op: 'lte', value: filters.billAmountMax });
  if (filters.billUnitsMin != null && filters.billUnitsMin > 0)
    billConditions.push({ column: 'billed_units', op: 'gte', value: filters.billUnitsMin });
  if (filters.billUnitsMax != null && filters.billUnitsMax > 0)
    billConditions.push({ column: 'billed_units', op: 'lte', value: filters.billUnitsMax });

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

      const result = await fetchEBCustomers({
        ...filters,
        page: currentPage,
        pageSize: curPageSize,
      });

      for (const c of result.customers) {
        if (c.sc_number) allScNumbers.push(c.sc_number);
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
      .from('eb_customers')
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
      query = query.order('contracted_load', { ascending: false, nullsFirst: false });
    } else if (sortBy === 'load_asc') {
      query = query.order('contracted_load', { ascending: true, nullsFirst: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (filters.search) {
      query = query.or(
        `sc_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,mobile_number.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,meter_no.ilike.%${filters.search}%,area_name.ilike.%${filters.search}%,address1.ilike.%${filters.search}%,address2.ilike.%${filters.search}%,address3.ilike.%${filters.search}%,address4.ilike.%${filters.search}%`
      );
    }
    if (filters.jspMobiles && filters.jspMobiles.length > 0) {
      const mobilesCsv = filters.jspMobiles.join(',');
      query = query.or(`mobile_number.in.(${mobilesCsv}),phone.in.(${mobilesCsv})`);
    }
    if (filters.eros && filters.eros.length > 0) query = query.in('ero_name', filters.eros);
    if (filters.sections && filters.sections.length > 0) query = query.in('section_name', filters.sections);
    if (filters.statuses && filters.statuses.length > 0) query = query.in('status', filters.statuses);
    if (filters.callStatuses && filters.callStatuses.length > 0) query = query.in('call_status', filters.callStatuses);
    if (filters.categories && filters.categories.length > 0) query = query.in('category', filters.categories);
    if (filters.mandals && filters.mandals.length > 0) query = query.in('mandal_name', filters.mandals);
    if (filters.subStations && filters.subStations.length > 0) query = query.in('sub_station_name', filters.subStations);
    if (filters.areas && filters.areas.length > 0) query = query.in('area_name', filters.areas);
    if (filters.excludeSolar) {
      query = query.eq('solar_already_installed', false).neq('call_status', 'solar_already_installed');
    }
    if (filters.importBatchId) query = query.eq('import_batch_id', filters.importBatchId);
    if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
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

