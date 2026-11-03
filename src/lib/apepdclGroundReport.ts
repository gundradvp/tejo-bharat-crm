/**
 * APEPDCL Solar Phase 3 (PM Surya Ghar) Ground Report Service
 * 
 * Fetches and parses comprehensive equipment & inspection data from APEPDCL:
 * - Solar Panel Serial Numbers & Manufacturer
 * - Inverter Make, Model, Rating & Serial Number
 * - Net Meter Serial Number
 * - Vendor Name
 * - CFA Subsidy Breakdown (Central Financial Assistance vs Customer Share)
 * - Installation Site Address & Section Details
 */

import { supabase } from './supabase';

export interface APEGroundReport {
  complain_no: string;                  // S-number (e.g. S32608030989)
  consumer_name: string | null;         // COMP_NAME
  mobile_number: string | null;         // MOBILE_NO
  sc_number: string | null;             // SCNO (16 digits)
  consumer_scno_id: string | null;      // SERIELNUMBER / CONSUMER_SCNO_ID (NP-APEPD...)
  address_installation: string | null;  // Installation address
  pin_installation: string | null;      // PIN code
  district: string | null;              // District
  section_name: string | null;          // Section Name
  section_code: string | null;          // Section Code
  subdiv_name: string | null;           // Sub-division (e.g. ADE PITHAPURAM)
  contract_load: number | null;         // CONTRACT_LOAD (kW)
  approved_cap_kw: number | null;       // APPROVAL_LOWER_CAP (kW)
  module_capacity_kw: number | null;    // TOT_MODULE_CAPACITY (kW)
  solar_panel_quantity: number | null;  // Number of modules
  solar_panel_capacity_wp: number | null;// Wattage per module
  solar_panel_manufacturer: string | null;// Panel OEM (e.g. Mundra, Redren)
  solar_panel_serials: string[];        // Array of individual panel serials
  panel_serials_text: string;           // Comma-separated serials
  inverter_manufacturer: string | null; // Inverter OEM (e.g. POLYCAB)
  inverter_serial_number: string | null;// Inverter serial (e.g. 096203269P)
  inverter_capacity_kw: number | null;  // Inverter rating (kW)
  inverter_quantity: number | null;     // Inverter quantity
  phase: string | null;                 // 1 or 3
  new_mtr_sno: string | null;           // Net meter serial number
  vendor_name: string | null;           // Vendor name (e.g. BHANU PV SOLAR PVT LTD)
  total_installation_amt: number | null;// Total installation cost (₹)
  total_cfa_amt: number | null;         // Central government subsidy (₹)
  net_customer_amt: number | null;      // Consumer share after subsidy (₹)
  comp_date: string | null;             // Application date
  inst_create_date: string | null;      // Inspection date
  safety: {
    earthing: boolean;
    lightningArrester: boolean;
    spd: boolean;
    mcb: boolean;
  };
  raw_json: Record<string, any>;
}

// Default and fallback office/user combinations known to handle APEPDCL circles
export const DEFAULT_OFFICE_ID = '9000-138';
export const DEFAULT_USER_ID = '2000-100';

export const CANDIDATE_OFFICE_USERS = [
  { office: '9000-138', user: '2000-100' }, // Corporate Headquarters (All 11 Districts)
  { office: '4000-20', user: '2000-526' },  // Pithapuram / Kakinada Division
  { office: '9000-138', user: '2000-526' }, // Secondary Corporate
  { office: '4000-10', user: '2000-526' },  // Rajahmundry Division
];

/**
 * Cleanly parse CFA amounts array from APEPDCL response
 */
function parseCfaAmounts(cfaData: any): { installAmt: number | null; cfaAmt: number | null; netAmt: number | null } {
  if (!cfaData) return { installAmt: null, cfaAmt: null, netAmt: null };
  try {
    const list = typeof cfaData === 'string' ? JSON.parse(cfaData) : cfaData;
    if (Array.isArray(list) && list.length > 0) {
      // Prefer FIX type if available, else first item
      const item = list.find((x: any) => x.CALC_TYPE === 'FIX') || list[0];
      const installAmt = item.INSTALLATION_AMT != null ? parseFloat(item.INSTALLATION_AMT) : null;
      const cfaAmt = item.TOTAL_CFA_AMT != null ? parseFloat(item.TOTAL_CFA_AMT) : null;
      const netAmt = item.NET_AMT != null ? parseFloat(item.NET_AMT) : null;
      return { installAmt, cfaAmt, netAmt };
    }
  } catch (err) {
    console.warn('Failed to parse CFA_AMOUNTS:', err);
  }
  return { installAmt: null, cfaAmt: null, netAmt: null };
}

/**
 * Format raw APEPDCL JSON response into a strongly typed APEGroundReport
 */
export function formatAPEGroundReport(raw: Record<string, any>): APEGroundReport {
  const serialsRaw = raw.SOLAR_PANEL_PRODUCT_SERIAL_NUMBER || '';
  const serials = serialsRaw
    ? serialsRaw
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0)
    : [];

  const cfa = parseCfaAmounts(raw.CFA_AMOUNTS);

  return {
    complain_no: raw.COMP_NO || raw.COMPLAINT_NO || raw.COMPLAIN_NO || raw.complain_no || raw.epdcl_reg_no || raw.SMAPI_COM || raw.sno || '',
    consumer_name: raw.COMP_NAME || raw.NAME || raw.consumer_name || raw.name || null,
    mobile_number: raw.MOBILE_NO || raw.MOBILE || raw.mobile || raw.mobile_number || null,
    sc_number: (raw.SCNO || raw.scno || raw.sc_number) ? String(raw.SCNO || raw.scno || raw.sc_number).replace(/^['"]+/, '').trim() : null,
    consumer_scno_id: raw.SERIELNUMBER || raw.CONSUMER_SCNO_ID || raw.np_reg_no || null,
    address_installation: raw.ADDRESS_INSTALLATION || null,
    pin_installation: raw.PIN_INSTALLATION || null,
    district: raw.DISTRICT_INSTALLATION || raw.circle || raw.district || null,
    section_name: raw.SEC_NAME || raw.SECNAME || raw.section || raw.section_name || null,
    section_code: raw.SEC_CODE || null,
    subdiv_name: raw.SUBDIV_NAME || raw.subdivision || raw.subdiv_name || null,
    contract_load: raw.CONTRACT_LOAD != null ? parseFloat(raw.CONTRACT_LOAD) : (raw.connected_load_kw != null ? parseFloat(raw.connected_load_kw) : null),
    approved_cap_kw: raw.APPROVAL_LOWER_CAP != null ? parseFloat(raw.APPROVAL_LOWER_CAP) : (raw.applied_solar_kw != null ? parseFloat(raw.applied_solar_kw) : null),
    module_capacity_kw: raw.TOT_MODULE_CAPACITY != null ? parseFloat(raw.TOT_MODULE_CAPACITY) : (raw.applied_solar_kw != null ? parseFloat(raw.applied_solar_kw) : null),
    solar_panel_quantity: raw.SOLAR_PANEL_QUANTITY != null ? parseInt(raw.SOLAR_PANEL_QUANTITY, 10) : null,
    solar_panel_capacity_wp: raw.SOLAR_PANEL_CAPACITY != null ? parseFloat(raw.SOLAR_PANEL_CAPACITY) : null,
    solar_panel_manufacturer: raw.SOLAR_PANEL_PRODUCT_MANUFACTURER || null,
    solar_panel_serials: serials,
    panel_serials_text: serialsRaw,
    inverter_manufacturer: raw.INVERTER_PRODUCT_MANUFACTURER || null,
    inverter_serial_number: raw.INVERTER_PRODUCT_SERIAL_NUMBER || null,
    inverter_capacity_kw: raw.INVERTER_CAPACITY != null ? parseFloat(raw.INVERTER_CAPACITY) : null,
    inverter_quantity: raw.INVERTER_QUANTITY != null ? parseInt(raw.INVERTER_QUANTITY, 10) : null,
    phase: raw.PHASE != null ? String(raw.PHASE) : null,
    new_mtr_sno: raw.NEW_MTR_SNO || null,
    vendor_name: raw.VENDOR_NAME && raw.VENDOR_NAME !== '-' ? raw.VENDOR_NAME : null,
    total_installation_amt: cfa.installAmt,
    total_cfa_amt: cfa.cfaAmt,
    net_customer_amt: cfa.netAmt,
    comp_date: raw.COMP_DATE || raw.COMPDATE || raw.registration_date || null,
    inst_create_date: raw.INST_CREATE_DATE || raw.CREATE_DATE || null,
    safety: {
      earthing: raw.IS_EARTHING_AVAILABLE === '1',
      lightningArrester: raw.IS_LIGHTNING_ARRESTER === '1',
      spd: raw.IS_SPD_AVAILABLE === '1',
      mcb: raw.IS_MCB_AVAILABLE === '1',
    },
    raw_json: raw,
  };
}

/**
 * Fetch a single S-Number Ground Report from APEPDCL.
 * Tries primary office/user, then known candidate pairs if not found.
 */
export async function fetchAPEGroundReport(
  complainNo: string,
  officeId = DEFAULT_OFFICE_ID,
  userId = DEFAULT_USER_ID
): Promise<APEGroundReport | null> {
  const cleanSnum = complainNo.trim();
  if (!cleanSnum.startsWith('S')) return null;

  // Build candidate office/user pairs to try (primary first)
  const candidatePairs: { office: string; user: string }[] = [{ office: officeId, user: userId }];
  for (const pair of CANDIDATE_OFFICE_USERS) {
    if (pair.office !== officeId || pair.user !== userId) {
      candidatePairs.push(pair);
    }
  }

  for (const candidate of candidatePairs) {
    try {
      // Use proxy in browser environment, direct URL in Node
      const isBrowser = typeof window !== 'undefined';
      const baseUrl = isBrowser
        ? '/api/apepdcl/jw/web/json/plugin/com.phoenix.services.WebserviceRevisedSolarP3GroundReport/service'
        : 'https://epccbopn.apeasternpower.com/jw/web/json/plugin/com.phoenix.services.WebserviceRevisedSolarP3GroundReport/service';

      const url = `${baseUrl}?complain_no=${encodeURIComponent(cleanSnum)}&office_id=${encodeURIComponent(candidate.office)}&user_id=${encodeURIComponent(candidate.user)}`;

      const response = await fetch(url, {
        headers: {
          Accept: '*/*',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      if (!response.ok) continue;

      const data = await response.json();
      if (data && data.status !== 'false' && (data.COMP_NO || data.SMAPI_COM || data.SOLAR_PANEL_PRODUCT_SERIAL_NUMBER)) {
        return formatAPEGroundReport(data);
      }
    } catch (err) {
      console.warn(`Attempt failed for ${cleanSnum} with ${candidate.office}/${candidate.user}:`, err);
    }
  }

  return null;
}

/**
 * Fetch ground reports in parallel batches with rate-limiting and progress tracking
 */
export async function fetchAPEGroundReportsBatch(
  sNumbers: string[],
  concurrency = 8,
  onProgress?: (done: number, total: number, currentSnum?: string) => void,
  officeId = DEFAULT_OFFICE_ID,
  userId = DEFAULT_USER_ID,
  onReport?: (report: APEGroundReport) => void
): Promise<Map<string, APEGroundReport>> {
  const results = new Map<string, APEGroundReport>();
  const total = sNumbers.length;
  let done = 0;

  const queue = [...sNumbers];
  const workers = Array.from({ length: Math.min(concurrency, total) }, async () => {
    while (queue.length > 0) {
      const snum = queue.shift();
      if (!snum) break;
      try {
        const report = await fetchAPEGroundReport(snum, officeId, userId);
        if (report) {
          results.set(snum, report);
          onReport?.(report);
        }
      } catch (e) {
        console.error(`Error fetching ground report for ${snum}:`, e);
      } finally {
        done++;
        onProgress?.(done, total, snum);
      }
    }
  });

  await Promise.all(workers);
  return results;
}

/**
 * Save / Enrich ground report into Supabase lead_prospects record
 */
export async function saveGroundReportToProspect(
  prospectId: string,
  report: APEGroundReport
): Promise<boolean> {
  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  // Safe existing columns
  if (report.new_mtr_sno) {
    updatePayload.meter_no = report.new_mtr_sno;
  }
  if (report.consumer_name) {
    updatePayload.customer_name = report.consumer_name;
  }

  // Attempt to write newly supported columns (with fallback if migration is pending)
  const extendedPayload = {
    ...updatePayload,
    panel_serial_numbers: report.panel_serials_text || null,
    inverter_manufacturer: report.inverter_manufacturer || null,
    inverter_serial_number: report.inverter_serial_number || null,
    vendor_name: report.vendor_name || null,
    total_cfa_amt: report.total_cfa_amt,
    ground_report: report.raw_json,
  };

  const { error } = await supabase.from('lead_prospects').update(extendedPayload).eq('id', prospectId);

  if (error) {
    // If column doesn't exist yet, gracefully fall back to base update payload
    console.warn('Extended columns failed, falling back to base columns:', error.message);
    const { error: fallbackError } = await supabase.from('lead_prospects').update(updatePayload).eq('id', prospectId);
    return !fallbackError;
  }

  return true;
}

/**
 * Cache Ground Reports in LocalStorage as instant client-side cache
 */
export function cacheGroundReport(snum: string, report: APEGroundReport): void {
  try {
    const key = `ground_report_${snum}`;
    localStorage.setItem(key, JSON.stringify(report));
  } catch (e) {
    // ignore quota exceeded
  }
}

export function getCachedGroundReport(snum: string): APEGroundReport | null {
  try {
    const key = `ground_report_${snum}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return null;
}

/**
 * Check if a Ground Report already contains downloaded equipment details
 * (panel serial numbers, inverter manufacturer / serial number).
 */
export function isGroundReportEnriched(r?: APEGroundReport | null): boolean {
  if (!r) return false;
  const hasPanels = Boolean(
    (r.panel_serials_text && r.panel_serials_text.trim() && r.panel_serials_text !== '-' && r.panel_serials_text.toUpperCase() !== 'NULL') ||
    (Array.isArray(r.solar_panel_serials) && r.solar_panel_serials.some((s) => s && s.trim() && s !== '-' && s.toUpperCase() !== 'NULL'))
  );
  const hasInverter = Boolean(
    (r.inverter_serial_number && r.inverter_serial_number.trim() && r.inverter_serial_number !== '-' && r.inverter_serial_number.toUpperCase() !== 'NULL') ||
    (r.inverter_manufacturer && r.inverter_manufacturer.trim() && r.inverter_manufacturer !== '-' && r.inverter_manufacturer.toUpperCase() !== 'NULL')
  );
  return hasPanels || hasInverter;
}

