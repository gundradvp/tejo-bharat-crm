import * as XLSX from 'xlsx/xlsx.mjs';

export interface EBBillRow {
  sc_number: string;
  bill_status?: string;
  bills: EBBillEntry[];
}

export interface EBBillEntry {
  bill_month: string;
  bill_amount: number | null;
  billed_units: number | null;
}

const MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

export function parseMonthYear(monthStr: string): { month: string; year: number; monthIndex: number } | null {
  if (!monthStr) return null;
  const str = monthStr.toString().trim();
  const match = str.match(/^([A-Za-z]{3})[-/](\d{2,4})$/);
  if (!match) return null;

  const monthLower = match[1].toLowerCase();
  const monthIndex = MONTH_MAP[monthLower];
  if (!monthIndex) return null;

  let year = parseInt(match[2], 10);
  if (year < 100) year += 2000;

  return { month: str, year, monthIndex };
}

function toNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = parseFloat(value.toString().replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? null : n;
}

function normalizeHeader(header: string): string {
  return header
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^["']|["']$/g, '');
}

/**
 * Parses a bill file with columns like:
 * Scno, Status, Month_1, Amount_1, Units_1, Month_2, Amount_2, Units_2, ...
 * Each row has up to N months of bill data.
 */
export function parseEBBills(file: ArrayBuffer): EBBillRow[] {
  const workbook = XLSX.read(file, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
    defval: '',
    raw: false,
  });

  if (rawRows.length === 0) return [];

  const headers = Object.keys(rawRows[0]);

  const scCol = headers.find((h) => {
    const n = normalizeHeader(h);
    return n === 'scno' || n === 'sc no' || n === 'sc number' || n === 'sc no.';
  });
  const statusCol = headers.find((h) => {
    const n = normalizeHeader(h);
    return n === 'status' || n === 'bill status';
  });

  const monthColumns: { month: string; amount: string; units: string }[] = [];
  for (let i = 1; i <= 20; i++) {
    const monthCol = headers.find((h) => normalizeHeader(h) === `month_${i}`);
    const amountCol = headers.find((h) => normalizeHeader(h) === `amount_${i}`);
    const unitsCol = headers.find((h) => normalizeHeader(h) === `units_${i}`);
    if (monthCol || amountCol || unitsCol) {
      monthColumns.push({
        month: monthCol || '',
        amount: amountCol || '',
        units: unitsCol || '',
      });
    }
  }

  const results: EBBillRow[] = [];

  for (const row of rawRows) {
    const scNumber = scCol ? String(row[scCol] || '').trim() : '';
    if (!scNumber) continue;

    const bills: EBBillEntry[] = [];
    for (const cols of monthColumns) {
      const monthValue = cols.month ? String(row[cols.month] || '').trim() : '';
      if (!monthValue) continue;

      bills.push({
        bill_month: monthValue,
        bill_amount: cols.amount ? toNumber(row[cols.amount]) : null,
        billed_units: cols.units ? toNumber(row[cols.units]) : null,
      });
    }

    results.push({
      sc_number: scNumber,
      bill_status: statusCol ? String(row[statusCol] || '').trim() || undefined : undefined,
      bills,
    });
  }

  return results;
}
