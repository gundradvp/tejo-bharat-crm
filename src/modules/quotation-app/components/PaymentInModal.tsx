import React, { useState, useEffect } from 'react';
import { Party, Quotation, PaymentInRecord, SettledInvoice } from '../types/quotation';
import { ArrowLeft, Settings, Keyboard, Search, Calculator, X } from 'lucide-react';

interface PaymentInModalProps {
  isOpen: boolean;
  onClose: () => void;
  parties: Party[];
  quotations: Quotation[];
  onSavePaymentIn: (record: PaymentInRecord) => void;
  nextPaymentNumber?: string;
  invoice?: Quotation | null; // Optional single invoice mode for direct record payment
}

export const PaymentInModal: React.FC<PaymentInModalProps> = ({
  isOpen,
  onClose,
  parties,
  quotations,
  onSavePaymentIn,
  nextPaymentNumber = '215',
  invoice = null
}) => {
  const [selectedPartyName, setSelectedPartyName] = useState<string>('');
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [paymentDiscount, setPaymentDiscount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque' | 'Netbanking'>('Cash');
  const [paymentNumber, setPaymentNumber] = useState<string>(nextPaymentNumber);
  const [notes, setNotes] = useState<string>('');
  const [applyTds, setApplyTds] = useState<boolean>(false);

  const [settlementMap, setSettlementMap] = useState<Record<string, number>>({});
  const [showPartyDropdown, setShowPartyDropdown] = useState<boolean>(false);

  useEffect(() => {
    setPaymentNumber(nextPaymentNumber);
    if (invoice) {
      setSelectedPartyName(invoice.customer_name);
      const pending = Math.max(0, invoice.total_amount - (invoice.amount_received || 0));
      setAmountReceived(pending);
      setSettlementMap({ [invoice.quotation_no]: pending });
    }
  }, [nextPaymentNumber, invoice]);

  if (!isOpen) return null;

  // Single Invoice mode calculations (Matching Screenshot 2 media_1789135438221.png)
  const isSingleInvoice = Boolean(invoice);
  const invoiceTotal = invoice ? invoice.total_amount : 0;
  const invoiceAlreadyPaid = invoice ? (invoice.amount_received || 0) : 0;
  const invoicePendingAmt = invoice ? Math.max(0, invoiceTotal - invoiceAlreadyPaid) : 0;
  const calcBalanceAmt = Math.max(0, invoicePendingAmt - amountReceived - paymentDiscount);

  // Filter open/unpaid invoices for selected party (Multi-invoice mode)
  const partyInvoices = quotations.filter((q) => {
    if (!selectedPartyName) return false;
    const isSameParty = q.customer_name.toLowerCase().trim() === selectedPartyName.toLowerCase().trim();
    const isInvoiceType = q.document_type === 'Sales Invoice' || q.document_type === 'Tax Invoice' || q.document_type === 'Proforma Invoice';
    return isSameParty && isInvoiceType;
  });

  const handleAmountReceivedChange = (val: number) => {
    setAmountReceived(val);
    if (isSingleInvoice && invoice) {
      setSettlementMap({ [invoice.quotation_no]: val });
      return;
    }
    let remaining = val;
    const newMap: Record<string, number> = {};

    partyInvoices.forEach((q) => {
      const invNo = q.quotation_no;
      const invPaid = q.amount_received || 0;
      const totalDue = q.total_amount - invPaid;

      if (remaining > 0 && totalDue > 0) {
        const allocated = Math.min(remaining, totalDue);
        newMap[invNo] = allocated;
        remaining -= allocated;
      } else {
        newMap[invNo] = 0;
      }
    });

    setSettlementMap(newMap);
  };

  const handleSelectParty = (p: Party) => {
    setSelectedPartyName(p.name);
    setShowPartyDropdown(false);
  };

  const handleSave = () => {
    const targetPartyName = invoice ? invoice.customer_name : selectedPartyName;
    if (!targetPartyName) {
      alert('Please select a party name before saving.');
      return;
    }
    if (amountReceived <= 0) {
      alert('Please enter a valid amount received.');
      return;
    }

    const targetInvoices = invoice ? [invoice] : partyInvoices;
    const settledInvoices: SettledInvoice[] = targetInvoices
      .filter((q) => (settlementMap[q.quotation_no] || 0) > 0 || isSingleInvoice)
      .map((q) => {
        const settledAmt = settlementMap[q.quotation_no] || amountReceived;
        const previousPaid = q.amount_received || 0;
        const bal = Math.max(0, q.total_amount - previousPaid - settledAmt - paymentDiscount);
        return {
          invoice_no: q.quotation_no,
          date: q.quotation_date,
          invoice_amount: q.total_amount,
          tds: applyTds ? 1 : 0,
          discount: paymentDiscount,
          amount_settled: settledAmt,
          balance_amount: bal,
        };
      });

    const record: PaymentInRecord = {
      id: `payin-${Date.now()}`,
      payment_number: paymentNumber,
      party_name: targetPartyName,
      payment_date: paymentDate,
      payment_mode: paymentMode,
      amount_received: amountReceived,
      discount: paymentDiscount,
      notes: notes,
      settled_invoices: settledInvoices,
      created_at: new Date().toISOString(),
    };

    onSavePaymentIn(record);
    onClose();
  };

  // RENDER SINGLE INVOICE MODE (Matching Screenshot 2)
  if (isSingleInvoice && invoice) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 overflow-y-auto p-4 flex items-center justify-center animate-in fade-in">
        <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden font-sans text-slate-800 my-auto">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">
              Record Payment For Invoice #{invoice.quotation_no}
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 grid grid-cols-12 gap-6">
            
            {/* Left Inputs (Cols 7) */}
            <div className="col-span-7 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Amount Received
                  </label>
                  <input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => handleAmountReceivedChange(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono font-extrabold text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Payment In Discount ⓘ
                  </label>
                  <input
                    type="number"
                    value={paymentDiscount}
                    onChange={(e) => setPaymentDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="apply-tds"
                  checked={applyTds}
                  onChange={(e) => setApplyTds(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="apply-tds" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Apply TDS
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Netbanking">Netbanking</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter notes..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Right Summary Calculation Card (Cols 5) */}
            <div className="col-span-5 space-y-4">
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="font-extrabold text-slate-900 text-sm">
                  Invoice #{invoice.quotation_no}
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Invoice Amount</span>
                  <span className="font-mono font-bold">₹ {invoiceTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="text-slate-800 font-bold uppercase">
                  {invoice.customer_name}
                </div>
                <div className="text-slate-500">
                  Due Date: {invoice.due_date || invoice.valid_until || '-'}
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs shadow-sm">
                <div className="font-extrabold text-slate-900 text-xs tracking-tight border-b border-slate-100 pb-2">
                  Record Payment Calculation
                </div>
                
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Invoice Pending Amt.</span>
                  <span className="font-mono text-rose-600 font-bold">
                    ₹ {invoicePendingAmt.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Amount Received</span>
                  <span className="font-mono text-slate-900 font-bold">
                    ₹ {amountReceived.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Payment In Discount</span>
                  <span className="font-mono text-slate-900">
                    ₹ {paymentDiscount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between items-center border-t border-slate-100 pt-2 font-extrabold text-slate-900">
                  <span>Balance Amount</span>
                  <span className={`font-mono text-sm ${calcBalanceAmt === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ₹ {calcBalanceAmt.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

            </div>

          </div>

          {/* Footer Buttons */}
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-extrabold text-xs rounded-xl shadow-md transition-all"
            >
              Save
            </button>
          </div>

        </div>
      </div>
    );
  }

  // RENDER MULTI INVOICE MODE
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 overflow-y-auto p-4 sm:p-6 flex items-center justify-center animate-in fade-in">
      <div className="bg-[#f8fafc] rounded-2xl max-w-5xl w-full border border-slate-200 shadow-2xl overflow-hidden font-sans text-slate-800 my-auto">
        
        {/* HEADER BAR */}
        <div className="bg-white px-6 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base font-extrabold text-slate-900">
              Record Payment In #{paymentNumber}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
              <Keyboard className="w-4 h-4" />
            </button>
            <button className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Settings</span>
            </button>
            <button 
              onClick={onClose}
              className="px-4 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="px-6 py-1.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-extrabold text-xs rounded-lg shadow-md transition-all"
            >
              Save
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          
          {/* TOP DUAL CARDS SECTION */}
          <div className="grid grid-cols-12 gap-6">
            
            {/* Left Card: Party & Amounts */}
            <div className="col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              
              {/* Party Name Picker */}
              <div className="relative">
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Party Name
                </label>
                <div 
                  onClick={() => setShowPartyDropdown(!showPartyDropdown)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl cursor-pointer flex items-center justify-between focus:ring-2 focus:ring-indigo-500"
                >
                  <span className={selectedPartyName ? 'text-slate-900 font-bold uppercase' : 'text-slate-400'}>
                    {selectedPartyName || 'Search party by name or number'}
                  </span>
                  <Search className="w-4 h-4 text-slate-400" />
                </div>

                {showPartyDropdown && (
                  <div className="absolute left-0 right-0 top-16 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {parties.map((p) => (
                      <div
                        key={p.id || p.name}
                        onClick={() => handleSelectParty(p)}
                        className="p-3 hover:bg-indigo-50/60 cursor-pointer text-xs space-y-0.5"
                      >
                        <div className="font-bold text-slate-900 uppercase">{p.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{p.mobile_number}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Amount Received & Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Amount Received
                  </label>
                  <input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => handleAmountReceivedChange(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Payment In Discount ⓘ
                  </label>
                  <input
                    type="number"
                    value={paymentDiscount}
                    onChange={(e) => setPaymentDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

            </div>

            {/* Right Card: Date, Mode, No, Notes */}
            <div className="col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full px-2.5 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Netbanking">Netbanking</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Payment In Number
                  </label>
                  <input
                    type="text"
                    value={paymentNumber}
                    onChange={(e) => setPaymentNumber(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

            </div>

          </div>

          {/* BOTTOM SECTION: INVOICES SETTLEMENT AREA */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm min-h-[200px]">
            {!selectedPartyName ? (
              <div className="text-center py-10 space-y-3">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center text-slate-400">
                  <Calculator className="w-8 h-8 text-indigo-500/70" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">
                    No party selected!
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select Party Name to view transactions & settle open invoices
                  </p>
                </div>
                <button
                  onClick={() => setShowPartyDropdown(true)}
                  className="px-5 py-2 bg-[#4f46e5] text-white font-extrabold text-xs rounded-xl shadow transition-all"
                >
                  Select Party
                </button>
              </div>
            ) : partyInvoices.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <p className="text-sm font-bold text-slate-700">No Open Invoices for {selectedPartyName}</p>
                <p className="text-xs text-slate-500">
                  This payment will be recorded as an advance credit on the party account.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">
                  Pending Invoices for {selectedPartyName}
                </h3>
                
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Invoice Number</th>
                      <th className="p-2.5">Invoice Amount</th>
                      <th className="p-2.5">TDS</th>
                      <th className="p-2.5">Discount</th>
                      <th className="p-2.5">Amount Received</th>
                      <th className="p-2.5 text-right">Balance Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium">
                    {partyInvoices.map((q) => {
                      const invNo = q.quotation_no;
                      const prevPaid = q.amount_received || 0;
                      const settled = settlementMap[invNo] || 0;
                      const balance = Math.max(0, q.total_amount - prevPaid - settled);

                      return (
                        <tr key={invNo} className="hover:bg-slate-50">
                          <td className="p-2.5 font-semibold">{q.quotation_date}</td>
                          <td className="p-2.5 font-mono font-bold text-slate-900">{invNo}</td>
                          <td className="p-2.5 font-mono">₹ {q.total_amount.toLocaleString('en-IN')}</td>
                          <td className="p-2.5 font-mono">₹ 0</td>
                          <td className="p-2.5 font-mono">₹ {paymentDiscount}</td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              value={settled}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setSettlementMap({ ...settlementMap, [invNo]: val });
                              }}
                              className="w-28 px-2 py-1 text-xs font-mono font-bold border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-rose-600">
                            ₹ {balance.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
