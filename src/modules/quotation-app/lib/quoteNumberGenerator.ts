import { Branch, DocumentType, Quotation } from '../types/quotation';

export type NumberFormatType = 'fy_serial' | 'branch_date_serial' | 'custom_hash';

export interface NumberGeneratorOptions {
  format?: NumberFormatType;
  branchCode?: string;
  customPrefix?: string;
  serialNumber?: number;
  docType?: DocumentType;
}

/**
 * Clean & sanitize document/invoice number for 100% E-Way Bill compliance:
 * - Pure Alphanumeric (A-Z, 0-9 ONLY)
 * - No slashes (/), hyphens (-), underscores (_), spaces or special characters
 * - Max length: 16 characters
 */
export function sanitizeInvoiceNumberForEway(rawNo: string): string {
  return rawNo.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 16);
}

/**
 * Auto-Increment Generator starting from 001:
 * Scans existing records, finds the highest sequence for the current FY & Document Type,
 * and increments by 1 (001 -> 002 -> 003...).
 */
export function getNextSequentialNumber(
  docType: DocumentType = 'Sales Invoice',
  existingRecords: Quotation[] = []
): string {
  const date = new Date();
  const year = date.getFullYear();
  const currentMonth = date.getMonth(); // 0-11
  const fyStart = currentMonth >= 3 ? year : year - 1;
  const fyStartShort = String(fyStart).slice(-2);
  const fyEndShort = String(fyStart + 1).slice(-2);
  const fyCode = `${fyStartShort}${fyEndShort}`; // e.g. 2627

  let typeCode = 'INV';
  if (docType === 'Quotation') typeCode = 'Q';
  else if (docType === 'Proforma Invoice') typeCode = 'PI';
  else if (docType === 'Credit Note') typeCode = 'CN';
  else if (docType === 'Delivery Challan') typeCode = 'DC';

  const prefix = `TBGE${fyCode}${typeCode}`;

  // Find all existing quotation numbers matching prefix or type code
  let maxSeq = 0;
  for (const record of existingRecords) {
    const rawNo = (record.quotation_no || '').trim().toUpperCase();
    if (rawNo.startsWith(prefix) || rawNo.includes(typeCode)) {
      // Extract trailing digits
      const match = rawNo.match(/(\d+)$/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > maxSeq && val < 999999) {
          maxSeq = val;
        }
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const seqPadded = String(nextSeq).padStart(3, '0'); // Starts at 001

  return sanitizeInvoiceNumberForEway(`${prefix}${seqPadded}`);
}

export function generateQuotationNumber(options: NumberGeneratorOptions = {}, branch?: Branch): string {
  return getNextSequentialNumber(options.docType || 'Sales Invoice', []);
}




