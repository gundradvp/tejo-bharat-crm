import * as XLSX from 'xlsx/xlsx.mjs';

export interface EBCustomerRow {
  ero_name?: string;
  section_name?: string;
  area_name?: string;
  sc_number?: string;
  sur_name?: string;
  customer_name?: string;
  fhp_name?: string;
  address1?: string;
  address2?: string;
  address3?: string;
  address4?: string;
  category?: string;
  uksc_number?: string;
  contracted_load?: number;
  connected_load?: number;
  load_unit?: string;
  phase?: string;
  sm_mtr?: string;
  sub_group?: string;
  trans_struc_code?: string;
  feeder_no?: string;
  feeder_name?: string;
  sub_station_name?: string;
  feeder_type?: string;
  pol_no?: string;
  service_type?: string;
  supply_release_date?: string;
  status?: string;
  phone?: string;
  sd_amount?: number;
  multpf?: number;
  cat_iiib_flag?: string;
  meter_no?: string;
  meter_make?: string;
  meter_capacity?: string;
  metering_side?: string;
  mus_flag?: string;
  colony_name?: string;
  assembly_constituency?: string;
  mandal_name?: string;
  panchayath_name?: string;
  sc_st_flag?: string;
  aadhaar_number?: string;
  mobile_number?: string;
  ir_flag?: string;
}

const HEADER_MAP: Record<string, keyof EBCustomerRow> = {
  'ero name': 'ero_name',
  'ero': 'ero_name',
  'section name': 'section_name',
  'section': 'section_name',
  'area name': 'area_name',
  'area': 'area_name',
  'scno': 'sc_number',
  'sc no': 'sc_number',
  'sc number': 'sc_number',
  'sc no.': 'sc_number',
  'sur name': 'sur_name',
  'name': 'customer_name',
  'customer name': 'customer_name',
  'fhp name': 'fhp_name',
  'address1': 'address1',
  'address2': 'address2',
  'address3': 'address3',
  'address4': 'address4',
  'category': 'category',
  'ukscno': 'uksc_number',
  'uksc no': 'uksc_number',
  'contracted load': 'contracted_load',
  'connected load': 'connected_load',
  'load unit': 'load_unit',
  'phase': 'phase',
  'sm_mtr': 'sm_mtr',
  'subgroup': 'sub_group',
  'sub group': 'sub_group',
  'trans struc code': 'trans_struc_code',
  'feeder no': 'feeder_no',
  'feeder name': 'feeder_name',
  'sub station name': 'sub_station_name',
  'feeder type': 'feeder_type',
  'pol no': 'pol_no',
  'service type': 'service_type',
  'supply release date': 'supply_release_date',
  'status': 'status',
  'phone': 'phone',
  'sd amount': 'sd_amount',
  'multpf': 'multpf',
  'catiiib flag': 'cat_iiib_flag',
  'cat iiib flag': 'cat_iiib_flag',
  'meter no': 'meter_no',
  'meter number': 'meter_no',
  'meter make': 'meter_make',
  'meter capacity': 'meter_capacity',
  'metering side': 'metering_side',
  'musflag': 'mus_flag',
  'colony name': 'colony_name',
  'assembly constency': 'assembly_constituency',
  'assembly constituency': 'assembly_constituency',
  'mandal name': 'mandal_name',
  'mandal': 'mandal_name',
  'panchayath name': 'panchayath_name',
  'panchayath': 'panchayath_name',
  'sc st flag': 'sc_st_flag',
  'aadhaar no': 'aadhaar_number',
  'aadhaar number': 'aadhaar_number',
  'aadhaar': 'aadhaar_number',
  'mobile no': 'mobile_number',
  'mobile number': 'mobile_number',
  'mobile': 'mobile_number',
  'ir flag': 'ir_flag',
  'irflag': 'ir_flag',
};

function normalizeHeader(header: string): string {
  return header
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^["']|["']$/g, '')
    .replace(/\n/g, ' ');
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

export function parseEBExcel(file: ArrayBuffer): EBCustomerRow[] {
  const workbook = XLSX.read(file, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
    defval: '',
    raw: false,
  });

  if (rawRows.length === 0) return [];

  const firstRow = rawRows[0];
  const colMapping: Record<string, keyof EBCustomerRow> = {};

  for (const rawHeader of Object.keys(firstRow)) {
    const normalized = normalizeHeader(rawHeader);
    const mapped = HEADER_MAP[normalized];
    if (mapped) {
      colMapping[rawHeader] = mapped;
    }
  }

  const customers: EBCustomerRow[] = [];

  for (const rawRow of rawRows) {
    const customer: EBCustomerRow = {};
    let hasData = false;

    for (const [rawHeader, value] of Object.entries(rawRow)) {
      const fieldName = colMapping[rawHeader];
      if (!fieldName) continue;

      switch (fieldName) {
        case 'sc_number':
          (customer as any)[fieldName] = value ? String(value).trim() : '';
          break;
        case 'contracted_load':
        case 'connected_load':
        case 'sd_amount':
        case 'multpf':
          customer[fieldName] = toNumber(value);
          break;
        case 'supply_release_date':
          customer.supply_release_date = parseDate(value);
          break;
        default:
          (customer as any)[fieldName] = cleanString(value);
      }

      if (cleanString(value)) hasData = true;
    }

    if (hasData && customer.sc_number) {
      customers.push(customer);
    }
  }

  return customers;
}
