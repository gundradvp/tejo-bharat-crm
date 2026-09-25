import * as XLSX from 'xlsx/xlsx.mjs';

export interface ProspectRow {
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
}

const HEADER_MAP: Record<string, keyof ProspectRow> = {
  'sno': 'serial_number',
  's no': 'serial_number',
  's.no': 'serial_number',
  'serial no': 'serial_number',
  'serial number': 'serial_number',
  'circle name': 'circle_name',
  'circle': 'circle_name',
  'division name': 'division_name',
  'division': 'division_name',
  'subdiv name': 'subdiv_name',
  'subdiv': 'subdiv_name',
  'sub division name': 'subdiv_name',
  'sub division': 'subdiv_name',
  'section name': 'section_name',
  'section': 'section_name',
  'scno': 'sc_number',
  'sc no': 'sc_number',
  'sc number': 'sc_number',
  'service no': 'sc_number',
  'service number': 'sc_number',
  'cl (kw)': 'existing_load_kw',
  'cl(kw)': 'existing_load_kw',
  'cl kw': 'existing_load_kw',
  'existing solar load (kw)': 'existing_solar_load_kw',
  'existing solar load(kw)': 'existing_solar_load_kw',
  'applied solar load (kw)': 'applied_solar_load_kw',
  'applied solar load(kw)': 'applied_solar_load_kw',
  'np registration number': 'np_registration_number',
  'np registration no': 'np_registration_number',
  'ep registration number': 'ep_registration_number',
  'ep registration no': 'ep_registration_number',
  'complaint date': 'complaint_date',
  'mobile number': 'mobile_number',
  'mobile no': 'mobile_number',
  'mobile': 'mobile_number',
  'phone': 'mobile_number',
  'e-mail': 'email',
  'email': 'email',
  'mail': 'email',
  'national portal status': 'national_portal_status',
  'epdcl portal status': 'epdcl_portal_status',
  'village name': 'village_name',
  'village': 'village_name',
  'bill amount 1': 'bill_amount_1',
  'bill month 1': 'bill_month_1',
  'bill amount 2': 'bill_amount_2',
  'bill month 2': 'bill_month_2',
  'bill amount 3': 'bill_amount_3',
  'bill month 3': 'bill_month_3',
};

function normalizeHeader(header: string): string {
  return header.toString().trim().toLowerCase().replace(/\s+/g, ' ').replace(/^["']|["']$/g, '');
}

function cleanString(value: any): string {
  if (value === null || value === undefined) return '';
  return value.toString().trim();
}

function toNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = parseFloat(value.toString().replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? undefined : n;
}

function parseDate(value: any): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  const str = value.toString().trim();
  if (!str || str === '-' || str === '--' || str === 'N/A' || str === 'NA') return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.split('T')[0];
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return undefined;
}

export function parseProspectExcel(file: ArrayBuffer): ProspectRow[] {
  const workbook = XLSX.read(file, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '', raw: true });

  if (rawRows.length === 0) return [];

  const firstRow = rawRows[0];
  const colMapping: Record<string, keyof ProspectRow> = {};

  for (const rawHeader of Object.keys(firstRow)) {
    const normalized = normalizeHeader(rawHeader);
    const mapped = HEADER_MAP[normalized];
    if (mapped) {
      colMapping[rawHeader] = mapped;
    }
  }

  const prospects: ProspectRow[] = [];

  for (const rawRow of rawRows) {
    const prospect: ProspectRow = {};
    let hasData = false;

    for (const [rawHeader, value] of Object.entries(rawRow)) {
      const fieldName = colMapping[rawHeader];
      if (!fieldName) continue;

      switch (fieldName) {
        case 'serial_number':
          prospect.serial_number = toNumber(value);
          break;
        case 'existing_load_kw':
        case 'existing_solar_load_kw':
        case 'applied_solar_load_kw':
        case 'bill_amount_1':
        case 'bill_amount_2':
        case 'bill_amount_3':
          prospect[fieldName] = toNumber(value);
          break;
        case 'complaint_date':
          prospect.complaint_date = parseDate(value);
          break;
        default:
          (prospect as any)[fieldName] = cleanString(value);
      }

      if (cleanString(value)) hasData = true;
    }

    if (hasData && (prospect.sc_number || prospect.mobile_number)) {
      prospects.push(prospect);
    }
  }

  return prospects;
}
