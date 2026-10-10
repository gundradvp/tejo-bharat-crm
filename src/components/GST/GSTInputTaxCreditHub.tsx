import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { 
  Receipt, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Search, 
  Download, 
  RefreshCw, 
  Link2, 
  Building, 
  IndianRupee, 
  Filter, 
  X,
  FileCode,
  Layers,
  HelpCircle
} from 'lucide-react';
import { 
  parseGSTR2BJSON, 
  parseGSTR2BExcel, 
  saveGSTInputCredits, 
  getGSTInputCredits, 
  runGSTReconciliation, 
  linkGSTCreditToCustomer,
  type GSTInputCredit,
  type ParsedGSTInvoice
} from '../../lib/gstPortalApi';
import * as XLSX from 'xlsx';

export default function GSTInputTaxCreditHub() {
  const { currentTenant } = useTenant();
  const { isAdmin } = useAuth();
  const isAdminUser = isAdmin();

  const [credits, setCredits] = useState<GSTInputCredit[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPeriod, setUploadPeriod] = useState<string>('04-2026');
  const [parsedPreview, setParsedPreview] = useState<ParsedGSTInvoice[]>([]);
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState<string>('');

  // Link Customer Modal State
  const [linkingCredit, setLinkingCredit] = useState<GSTInputCredit | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [autoCreateExpense, setAutoCreateExpense] = useState(true);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentTenant, selectedPeriod]);

  const loadData = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);
      const [creditsData, custsRes] = await Promise.all([
        getGSTInputCredits(currentTenant.id, selectedPeriod),
        supabase.from('customers').select('id, customer_name, consumer_number').order('customer_name')
      ]);
      setCredits(creditsData);
      setCustomers(custsRes.data || []);
    } catch (err) {
      console.error('Error loading GST input credits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    setUploadError('');
    setUploadSuccess('');

    try {
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const parsed = parseGSTR2BJSON(text, uploadPeriod);
        setParsedPreview(parsed);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        const parsed = await parseGSTR2BExcel(file, uploadPeriod);
        setParsedPreview(parsed);
      } else {
        setUploadError('Please select a valid GSTR-2B JSON or Excel (.xlsx) file.');
      }
    } catch (err: any) {
      console.error('Error reading file:', err);
      setUploadError('Failed to parse file: ' + (err.message || 'Unknown format'));
    }
  };

  const handleImportSubmit = async () => {
    if (!currentTenant || parsedPreview.length === 0) return;

    try {
      setImporting(true);
      setUploadError('');
      const res = await saveGSTInputCredits(currentTenant.id, parsedPreview);
      setUploadSuccess(`Successfully imported ${res.inserted} vendor GST invoices into the CRM!`);
      
      // Auto run reconciliation
      await runGSTReconciliation(currentTenant.id);

      setTimeout(() => {
        setShowUploadModal(false);
        setUploadFile(null);
        setParsedPreview([]);
        loadData();
      }, 1500);
    } catch (err: any) {
      console.error('Import error:', err);
      setUploadError(err.message || 'Failed to import invoices');
    } finally {
      setImporting(false);
    }
  };

  const handleRunReconciliation = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);
      const res = await runGSTReconciliation(currentTenant.id);
      alert(`Auto-reconciliation complete! Matched ${res.matched} invoices with recorded project expenses.`);
      await loadData();
    } catch (err: any) {
      console.error('Reconciliation error:', err);
      alert('Error running reconciliation: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingCredit || !selectedCustomerId) return;

    try {
      setLinking(true);
      await linkGSTCreditToCustomer(linkingCredit.id, selectedCustomerId, autoCreateExpense);
      setLinkingCredit(null);
      setSelectedCustomerId('');
      await loadData();
    } catch (err: any) {
      console.error('Error linking credit:', err);
      alert('Failed to link credit: ' + err.message);
    } finally {
      setLinking(false);
    }
  };

  const handleExportReconciliationExcel = () => {
    if (filteredCredits.length === 0) {
      alert('No records to export');
      return;
    }

    const exportRows = filteredCredits.map((c, i) => ({
      'S.No': i + 1,
      'Return Period': c.return_period,
      'Supplier GSTIN': c.supplier_gstin,
      'Supplier Name': c.supplier_name,
      'Invoice Number': c.invoice_number,
      'Invoice Date': c.invoice_date,
      'Taxable Value (₹)': c.taxable_value,
      'IGST (₹)': c.igst_amount,
      'CGST (₹)': c.cgst_amount,
      'SGST (₹)': c.sgst_amount,
      'Total Available ITC (₹)': c.total_tax,
      'Total Invoice Value (₹)': c.invoice_value,
      'ITC Eligible': c.itc_availability,
      'Status': c.reconciliation_status,
      'Linked Customer': c.customers?.customer_name || 'Unassigned'
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'GSTR-2B Available ITC');
    XLSX.writeFile(wb, `GSTR2B_Input_Tax_Credit_${selectedPeriod}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Filtered Records
  const filteredCredits = credits.filter(c => {
    const matchesSearch = !searchTerm ||
      c.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.supplier_gstin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.customers?.customer_name && c.customers.customer_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || c.reconciliation_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // KPI Calculations
  const totalAvailableITC = filteredCredits.reduce((sum, c) => sum + (Number(c.total_tax) || 0), 0);
  const totalTaxablePurchases = filteredCredits.reduce((sum, c) => sum + (Number(c.taxable_value) || 0), 0);
  const matchedCount = filteredCredits.filter(c => c.reconciliation_status === 'matched' || c.reconciliation_status === 'manually_matched').length;
  const unclaimedCount = filteredCredits.filter(c => c.reconciliation_status === 'unmatched').length;

  const periodsList = Array.from(new Set(credits.map(c => c.return_period))).sort().reverse();

  if (!isAdminUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 bg-white rounded-xl border border-gray-200 p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-bold text-gray-900">Access Restricted</h2>
        <p className="text-sm text-gray-500 max-w-md">
          Only administrators have permission to access the GST Input Tax Credit (ITC) Hub and vendor tax reconciliation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-7 h-7 text-teal-600" />
            GST Portal Input Tax Credit (ITC) Hub
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Import GSTR-2B / GSTR-2A from GST portal to find claimable vendor input tax and match with customer project expenses.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleRunReconciliation}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
            title="Auto-match GSTR-2B bills with recorded project expenses"
          >
            <RefreshCw className="w-4 h-4 text-teal-600" />
            Auto-Reconcile
          </button>

          <button
            onClick={handleExportReconciliationExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
            title="Export reconciliation sheet for GSTR-3B filing"
          >
            <Download className="w-4 h-4 text-green-600" />
            Export CA Sheet
          </button>

          <button
            onClick={() => {
              setUploadFile(null);
              setParsedPreview([]);
              setUploadError('');
              setUploadSuccess('');
              setShowUploadModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors text-sm font-semibold shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Import GSTR-2B (Portal File)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 border border-teal-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">Available Input Tax (ITC)</span>
            <IndianRupee className="w-5 h-5 text-teal-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-teal-950 mt-2">
            ₹{totalAvailableITC.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-teal-700 mt-1 font-medium">Claimable against Output GST</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Taxable Purchases</span>
            <Building className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-blue-950 mt-2">
            ₹{totalTaxablePurchases.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-blue-700 mt-1 font-medium">B2B Vendor Invoices</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">Matched to Projects</span>
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-green-950 mt-2">{matchedCount} Invoices</p>
          <p className="text-xs text-green-700 mt-1 font-medium">Linked to Customer Expenses</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Unassigned / Unclaimed</span>
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-amber-950 mt-2">{unclaimedCount} Invoices</p>
          <p className="text-xs text-amber-700 mt-1 font-medium">Ready to allocate to projects</p>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by vendor name, GSTIN, invoice #, or customer name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 font-medium"
          >
            <option value="all">All Return Periods</option>
            {periodsList.map(p => (
              <option key={p} value={p}>Period: {p}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="matched">🟢 Matched</option>
            <option value="unmatched">🟡 Unassigned</option>
            <option value="manually_matched">🔵 Manually Linked</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-teal-600" />
            Portal Input Invoices & Tax Breakdown ({filteredCredits.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : filteredCredits.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Receipt className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <h4 className="text-base font-semibold text-gray-800">No GST Input records found</h4>
            <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
              Download your monthly GSTR-2B JSON or Excel file from the GST portal and click "Import GSTR-2B" to see your claimable tax credits.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Supplier & GSTIN</th>
                  <th className="py-3 px-4">Invoice # & Date</th>
                  <th className="py-3 px-4 text-right">Taxable Value</th>
                  <th className="py-3 px-4 text-right">Available ITC (Tax)</th>
                  <th className="py-3 px-4 text-right">Invoice Value</th>
                  <th className="py-3 px-4 text-center">Period</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCredits.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900">{c.supplier_name}</div>
                      <div className="text-xs font-mono text-gray-500 mt-0.5">{c.supplier_gstin}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-gray-800">{c.invoice_number}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {c.invoice_date ? new Date(c.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-medium text-gray-700">
                      ₹{(c.taxable_value || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-teal-800">
                      ₹{(c.total_tax || 0).toLocaleString('en-IN')}
                      <div className="text-[10px] text-gray-400 font-normal">
                        {c.igst_amount > 0 && `IGST: ₹${c.igst_amount.toLocaleString()}`}
                        {c.cgst_amount > 0 && `CGST: ₹${c.cgst_amount.toLocaleString()} | SGST: ₹${c.sgst_amount.toLocaleString()}`}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-semibold text-gray-900">
                      ₹{(c.invoice_value || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-mono font-medium">
                        {c.return_period}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {c.reconciliation_status === 'matched' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Matched
                        </span>
                      ) : c.reconciliation_status === 'manually_matched' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                          <Link2 className="w-3 h-3" /> Linked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                          <AlertCircle className="w-3 h-3" /> Unassigned
                        </span>
                      )}
                      {c.customers?.customer_name && (
                        <div className="text-[11px] text-gray-500 mt-1 font-medium truncate max-w-[130px]" title={c.customers.customer_name}>
                          👤 {c.customers.customer_name}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setLinkingCredit(c);
                          setSelectedCustomerId(c.customer_id || '');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-xs font-semibold transition-colors border border-teal-200"
                        title="Link invoice to a customer project"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        {c.customer_id ? 'Re-link' : 'Link to Project'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-teal-50/50">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-teal-700" />
                <h3 className="text-lg font-bold text-gray-900">Import GSTR-2B from GST Portal</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {uploadError}
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  {uploadSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  GST Return Period (Month-Year)
                </label>
                <input
                  type="text"
                  value={uploadPeriod}
                  onChange={(e) => setUploadPeriod(e.target.value)}
                  placeholder="e.g. 04-2026 or 05-2026"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Upload GSTR-2B JSON or Excel File (.xlsx)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center hover:border-teal-500 transition-colors bg-gray-50/50">
                  <FileSpreadsheet className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    {uploadFile ? uploadFile.name : 'Drag & drop GSTR-2B file here or click to browse'}
                  </p>
                  <p className="text-xs text-gray-500 mb-3">Supports official GST portal JSON and B2B Excel formats</p>
                  <input
                    type="file"
                    accept=".json,.xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="gst-file-input"
                  />
                  <label
                    htmlFor="gst-file-input"
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold cursor-pointer hover:bg-gray-50 transition-colors shadow-xs"
                  >
                    Select File
                  </label>
                </div>
              </div>

              {parsedPreview.length > 0 && (
                <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    File Parsed Successfully!
                  </div>
                  <div>• Found <strong>{parsedPreview.length}</strong> B2B Vendor Invoices</div>
                  <div>• Total Claimable Input GST: <strong>₹{parsedPreview.reduce((s, p) => s + p.total_tax, 0).toLocaleString('en-IN')}</strong></div>
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  onClick={handleImportSubmit}
                  disabled={importing || parsedPreview.length === 0}
                  className="flex-1 bg-teal-600 text-white py-2.5 rounded-xl font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-sm"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing into CRM...
                    </>
                  ) : (
                    `Save & Import ${parsedPreview.length} Records`
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link to Customer Project Modal */}
      {linkingCredit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-teal-600" />
                Link Vendor Bill to Customer Project
              </h3>
              <button onClick={() => setLinkingCredit(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 p-3.5 rounded-xl text-xs space-y-1 border border-gray-200">
              <div><strong>Supplier:</strong> {linkingCredit.supplier_name} ({linkingCredit.supplier_gstin})</div>
              <div><strong>Invoice:</strong> {linkingCredit.invoice_number} | <strong>Date:</strong> {linkingCredit.invoice_date}</div>
              <div><strong>Taxable:</strong> ₹{linkingCredit.taxable_value.toLocaleString()} | <strong>Tax (ITC):</strong> ₹{linkingCredit.total_tax.toLocaleString()} | <strong>Total:</strong> ₹{linkingCredit.invoice_value.toLocaleString()}</div>
            </div>

            <form onSubmit={handleLinkSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Select Customer Project *
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500"
                  required
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.customer_name} {c.consumer_number ? `(SC: ${c.consumer_number})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={autoCreateExpense}
                  onChange={(e) => setAutoCreateExpense(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                />
                <span>Also add as material expense in customer's cost sheet</span>
              </label>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={linking || !selectedCustomerId}
                  className="flex-1 bg-teal-600 text-white py-2.5 rounded-xl font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-sm"
                >
                  {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Link to Project'}
                </button>
                <button
                  type="button"
                  onClick={() => setLinkingCredit(null)}
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
