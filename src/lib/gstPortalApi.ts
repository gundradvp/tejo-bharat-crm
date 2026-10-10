import { supabase } from './supabase';
import * as XLSX from 'xlsx';

export interface GSTInputCredit {
  id: string;
  tenant_id: string;
  return_period: string;
  source_type: 'gstr2b' | 'gstr2a' | 'manual';
  supplier_gstin: string;
  supplier_name: string;
  invoice_number: string;
  invoice_type: string;
  invoice_date: string;
  invoice_value: number;
  taxable_value: number;
  igst_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  cess_amount: number;
  total_tax: number;
  itc_availability: string;
  reconciliation_status: 'matched' | 'unmatched' | 'manually_matched' | 'disputed';
  customer_id?: string | null;
  expense_id?: string | null;
  notes?: string;
  created_at: string;
  updated_at: string;
  customers?: {
    id: string;
    customer_name: string;
    consumer_number?: string;
  };
}

export interface ParsedGSTInvoice {
  return_period: string;
  supplier_gstin: string;
  supplier_name: string;
  invoice_number: string;
  invoice_type: string;
  invoice_date: string;
  invoice_value: number;
  taxable_value: number;
  igst_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  cess_amount: number;
  total_tax: number;
  itc_availability: string;
  raw_data?: any;
}

/**
 * Parses GSTR-2B or GSTR-2A standard JSON payload downloaded from gst.gov.in
 */
export function parseGSTR2BJSON(jsonContent: string | object, defaultPeriod?: string): ParsedGSTInvoice[] {
  const data = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
  const parsedInvoices: ParsedGSTInvoice[] = [];

  const period = data.fp || data.rtn_prd || defaultPeriod || new Date().toISOString().slice(0, 7);

  // Parse B2B Section
  const b2bList = data.data?.docdata?.b2b || data.b2b || [];
  for (const supplier of b2bList) {
    const supplierGstin = supplier.ctin || supplier.gstin || 'UNKNOWN';
    const supplierName = supplier.trdnm || supplier.legal_name || supplier.cname || supplierGstin;

    const invList = supplier.inv || [];
    for (const inv of invList) {
      const invNo = inv.inum || inv.doc_num || 'N/A';
      const invDate = formatDate(inv.idt || inv.doc_dt);
      const invVal = Number(inv.val || inv.tot_val || 0);
      const invType = inv.typ || 'R';
      const itcAvail = inv.itc_avl || inv.itcavl || 'Y';

      let taxable = 0;
      let igst = 0;
      let cgst = 0;
      let sgst = 0;
      let cess = 0;

      const items = inv.items || [];
      for (const item of items) {
        taxable += Number(item.txval || 0);
        igst += Number(item.iamt || 0);
        cgst += Number(item.camt || 0);
        sgst += Number(item.samt || 0);
        cess += Number(item.csamt || 0);
      }

      // If items were flat on invoice level
      if (items.length === 0) {
        taxable = Number(inv.txval || 0);
        igst = Number(inv.iamt || 0);
        cgst = Number(inv.camt || 0);
        sgst = Number(inv.samt || 0);
      }

      const totalTax = igst + cgst + sgst + cess;

      parsedInvoices.push({
        return_period: period,
        supplier_gstin: supplierGstin,
        supplier_name: supplierName,
        invoice_number: invNo,
        invoice_type: invType,
        invoice_date: invDate,
        invoice_value: invVal || (taxable + totalTax),
        taxable_value: taxable,
        igst_amount: igst,
        cgst_amount: cgst,
        sgst_amount: sgst,
        cess_amount: cess,
        total_tax: totalTax,
        itc_availability: itcAvail === 'N' ? 'N' : 'Y',
        raw_data: inv,
      });
    }
  }

  // Parse CDNR (Credit/Debit Notes)
  const cdnrList = data.data?.docdata?.cdnr || data.cdnr || [];
  for (const supplier of cdnrList) {
    const supplierGstin = supplier.ctin || supplier.gstin || 'UNKNOWN';
    const supplierName = supplier.trdnm || supplier.legal_name || supplierGstin;

    const notes = supplier.nt || [];
    for (const note of notes) {
      const docNo = note.nt_num || note.doc_num || 'N/A';
      const docDate = formatDate(note.nt_dt || note.doc_dt);
      const docVal = Number(note.val || 0);
      const docType = note.ntty || 'C'; // C = Credit Note, D = Debit Note
      const itcAvail = note.itc_avl || 'Y';

      let taxable = 0;
      let igst = 0;
      let cgst = 0;
      let sgst = 0;
      let cess = 0;

      for (const item of (note.items || [])) {
        taxable += Number(item.txval || 0);
        igst += Number(item.iamt || 0);
        cgst += Number(item.camt || 0);
        sgst += Number(item.samt || 0);
        cess += Number(item.csamt || 0);
      }

      const mult = docType === 'C' ? -1 : 1;
      const totalTax = (igst + cgst + sgst + cess) * mult;

      parsedInvoices.push({
        return_period: period,
        supplier_gstin: supplierGstin,
        supplier_name: supplierName,
        invoice_number: docNo,
        invoice_type: docType,
        invoice_date: docDate,
        invoice_value: docVal * mult,
        taxable_value: taxable * mult,
        igst_amount: igst * mult,
        cgst_amount: cgst * mult,
        sgst_amount: sgst * mult,
        cess_amount: cess * mult,
        total_tax: totalTax,
        itc_availability: itcAvail === 'N' ? 'N' : 'Y',
        raw_data: note,
      });
    }
  }

  return parsedInvoices;
}

/**
 * Parses GSTR-2B or GSTR-2A Excel file (.xlsx or .xls) downloaded from GST portal
 */
export async function parseGSTR2BExcel(file: File, defaultPeriod?: string): Promise<ParsedGSTInvoice[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Find sheet: "B2B", "B2B - Invoices", "GSTR-2B", or the first sheet
  const sheetNames = workbook.SheetNames;
  let targetSheetName = sheetNames.find(s => /b2b/i.test(s)) || sheetNames[0];
  const worksheet = workbook.Sheets[targetSheetName];

  if (!worksheet) return [];

  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  if (rawRows.length < 2) return [];

  // Find header row by scanning for "GSTIN" or "Supplier" or "Invoice"
  let headerIndex = -1;
  for (let i = 0; i < Math.min(15, rawRows.length); i++) {
    const rowStr = (rawRows[i] || []).join(' ').toLowerCase();
    if (rowStr.includes('gstin') || rowStr.includes('invoice number') || rowStr.includes('supplier')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) headerIndex = 0;

  const headers: string[] = (rawRows[headerIndex] || []).map((h: any) => String(h || '').trim());
  const rows = rawRows.slice(headerIndex + 1);

  // Column index helpers
  const findCol = (terms: string[]) => {
    return headers.findIndex(h => {
      const lower = h.toLowerCase();
      return terms.some(t => lower.includes(t.toLowerCase()));
    });
  };

  const gstinIdx = findCol(['gstin', 'ctin']);
  const nameIdx = findCol(['trade', 'legal name', 'supplier', 'party']);
  const invNoIdx = findCol(['invoice number', 'inv no', 'doc number', 'doc no', 'invoice no']);
  const dateIdx = findCol(['invoice date', 'inv date', 'doc date', 'date']);
  const valIdx = findCol(['invoice value', 'inv value', 'total value', 'gross']);
  const taxableIdx = findCol(['taxable value', 'taxable val', 'txval']);
  const igstIdx = findCol(['integrated tax', 'igst']);
  const cgstIdx = findCol(['central tax', 'cgst']);
  const sgstIdx = findCol(['state/ut tax', 'state tax', 'sgst', 'utgst']);
  const cessIdx = findCol(['cess']);
  const itcIdx = findCol(['itc availability', 'itc eligible', 'itc']);

  const period = defaultPeriod || new Date().toISOString().slice(0, 7);
  const parsed: ParsedGSTInvoice[] = [];

  for (const r of rows) {
    if (!r || r.length === 0) continue;
    const gstin = String(r[gstinIdx] || '').trim();
    const invNo = String(r[invNoIdx] || '').trim();

    if (!gstin || !invNo || gstin.toLowerCase().includes('total')) continue;

    const supplierName = String(r[nameIdx] || gstin).trim();
    const invDate = formatDate(r[dateIdx]);
    const taxableVal = Number(r[taxableIdx] || 0);
    const igst = Number(r[igstIdx] || 0);
    const cgst = Number(r[cgstIdx] || 0);
    const sgst = Number(r[sgstIdx] || 0);
    const cess = Number(r[cessIdx] || 0);
    const totalTax = igst + cgst + sgst + cess;
    const invVal = Number(r[valIdx] || (taxableVal + totalTax));
    const itcAvail = String(r[itcIdx] || 'Y').toUpperCase().includes('N') ? 'N' : 'Y';

    parsed.push({
      return_period: period,
      supplier_gstin: gstin,
      supplier_name: supplierName,
      invoice_number: invNo,
      invoice_type: 'R',
      invoice_date: invDate,
      invoice_value: invVal,
      taxable_value: taxableVal,
      igst_amount: igst,
      cgst_amount: cgst,
      sgst_amount: sgst,
      cess_amount: cess,
      total_tax: totalTax,
      itc_availability: itcAvail,
    });
  }

  return parsed;
}

function formatDate(raw: any): string {
  if (!raw) return new Date().toISOString().split('T')[0];
  if (typeof raw === 'number') {
    // Excel date serial number
    const date = new Date(Math.round((raw - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }
  const str = String(raw).trim();
  // DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (ddmmyyyy) {
    return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
  }
  // YYYY-MM-DD
  const yyyymmdd = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (yyyymmdd) {
    return `${yyyymmdd[1]}-${yyyymmdd[2].padStart(2, '0')}-${yyyymmdd[3].padStart(2, '0')}`;
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Batch saves parsed GST input invoices to Supabase
 */
export async function saveGSTInputCredits(
  tenantId: string,
  invoices: ParsedGSTInvoice[]
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;

  for (const inv of invoices) {
    try {
      const { error } = await supabase
        .from('gst_input_credits')
        .upsert({
          tenant_id: tenantId,
          return_period: inv.return_period,
          source_type: 'gstr2b',
          supplier_gstin: inv.supplier_gstin,
          supplier_name: inv.supplier_name,
          invoice_number: inv.invoice_number,
          invoice_type: inv.invoice_type,
          invoice_date: inv.invoice_date,
          invoice_value: inv.invoice_value,
          taxable_value: inv.taxable_value,
          igst_amount: inv.igst_amount,
          cgst_amount: inv.cgst_amount,
          sgst_amount: inv.sgst_amount,
          cess_amount: inv.cess_amount,
          total_tax: inv.total_tax,
          itc_availability: inv.itc_availability,
          raw_data: inv.raw_data || {},
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'tenant_id, supplier_gstin, invoice_number, return_period',
        });

      if (error) {
        console.error('Error saving GST invoice:', error);
        errors++;
      } else {
        inserted++;
      }
    } catch (e) {
      errors++;
    }
  }

  return { inserted, errors };
}

/**
 * Fetches all GST Input Credits for tenant with customer links
 */
export async function getGSTInputCredits(tenantId: string, period?: string): Promise<GSTInputCredit[]> {
  let query = supabase
    .from('gst_input_credits')
    .select('*, customers(id, customer_name, consumer_number)')
    .eq('tenant_id', tenantId)
    .order('invoice_date', { ascending: false });

  if (period && period !== 'all') {
    query = query.eq('return_period', period);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Reconciles GST Input Credits with recorded customer expenses
 */
export async function runGSTReconciliation(tenantId: string): Promise<{ matched: number }> {
  const [creditsRes, expensesRes] = await Promise.all([
    supabase.from('gst_input_credits').select('*').eq('tenant_id', tenantId),
    supabase.from('customer_expenses').select('*')
  ]);

  const credits = creditsRes.data || [];
  const expenses = expensesRes.data || [];
  let matchedCount = 0;

  for (const credit of credits) {
    if (credit.reconciliation_status === 'matched') continue;

    const matchedExpense = expenses.find(exp => {
      const matchVendor = exp.vendor_name && (
        exp.vendor_name.toLowerCase().includes(credit.supplier_name.toLowerCase()) ||
        credit.supplier_name.toLowerCase().includes(exp.vendor_name.toLowerCase())
      );
      const matchAmt = Math.abs(Number(exp.amount) - Number(credit.invoice_value)) < 5 ||
                       Math.abs(Number(exp.base_amount) - Number(credit.taxable_value)) < 5;
      return matchVendor && matchAmt;
    });

    if (matchedExpense) {
      await supabase
        .from('gst_input_credits')
        .update({
          reconciliation_status: 'matched',
          customer_id: matchedExpense.customer_id || null,
          expense_id: matchedExpense.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', credit.id);
      matchedCount++;
    }
  }

  return { matched: matchedCount };
}

/**
 * Links a GST Input Credit record to a specific customer project
 */
export async function linkGSTCreditToCustomer(
  creditId: string,
  customerId: string,
  createExpense: boolean = false
): Promise<void> {
  let createdExpId: string | null = null;

  if (createExpense) {
    const { data: credit } = await supabase
      .from('gst_input_credits')
      .select('*')
      .eq('id', creditId)
      .single();

    if (credit) {
      const { data: exp } = await supabase
        .from('customer_expenses')
        .insert({
          customer_id: customerId,
          expense_type: 'materials',
          description: `Vendor Bill (${credit.supplier_name} # ${credit.invoice_number})`,
          amount: credit.invoice_value,
          base_amount: credit.taxable_value,
          gst_amount: credit.total_tax,
          gst_percentage: credit.taxable_value > 0 ? Math.round((credit.total_tax / credit.taxable_value) * 100) : 18,
          expense_date: credit.invoice_date || new Date().toISOString().split('T')[0],
          vendor_name: credit.supplier_name,
          payment_status: 'paid',
          remarks: `GSTIN: ${credit.supplier_gstin} | Period: ${credit.return_period}`
        })
        .select('id')
        .single();

      if (exp) {
        createdExpId = exp.id;
      }
    }
  }

  await supabase
    .from('gst_input_credits')
    .update({
      customer_id: customerId,
      expense_id: createdExpId,
      reconciliation_status: 'manually_matched',
      updated_at: new Date().toISOString()
    })
    .eq('id', creditId);
}
