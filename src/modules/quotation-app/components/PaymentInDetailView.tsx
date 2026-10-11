import React from 'react';
import { PaymentInRecord } from '../types/quotation';
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  Share2, 
  Edit2, 
  Trash2, 
  Keyboard, 
  ChevronDown 
} from 'lucide-react';

interface PaymentInDetailViewProps {
  record: PaymentInRecord;
  onBack: () => void;
  onDelete?: (id: string) => void;
  onEdit?: (record: PaymentInRecord) => void;
}

export const PaymentInDetailView: React.FC<PaymentInDetailViewProps> = ({
  record,
  onBack,
  onDelete,
  onEdit
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 font-sans text-slate-800 pb-12">
      
      {/* HEADER BAR (Matching MyBillBook Screenshot 3) */}
      <div className="bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-extrabold text-slate-900">
            Payment In #{record.payment_number}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Download PDF */}
          <button 
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download PDF</span>
          </button>

          {/* Print PDF */}
          <button 
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print PDF</span>
          </button>

          {/* Share */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm">
            <Share2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Share</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Edit */}
          <button 
            onClick={() => onEdit && onEdit(record)}
            className="p-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          {/* Delete */}
          <button 
            onClick={() => onDelete && onDelete(record.id)}
            className="p-2 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Keyboard Icon */}
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PRINTABLE OFFICIAL PAYMENT RECEIPT SHEET */}
      <div className="quotation-print-area flex justify-center">
        <div className="page bg-white shadow-xl border border-slate-300 rounded-2xl overflow-hidden text-slate-800 font-sans w-full max-w-4xl">
          
          {/* HEADER */}
          <div className="header bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 flex items-center justify-between relative overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center border-2 border-amber-400 p-1 shadow-lg flex-shrink-0">
                <img 
                  src="/logo.png" 
                  alt="Tejo Bharat Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-amber-400 tracking-wide leading-tight">
                  TEJO BHARAT GLOBAL ENERGY LLP
                </h1>
                <p className="text-[10px] text-slate-300 font-medium mt-0.5">
                  MNRE Authorized Empanelled Vendor · DISCOM Installer · AP, Telangana & Puducherry
                </p>
                <div className="text-[10px] text-slate-200 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>📞 <strong className="text-fuchsia-300">+91 91212 16369</strong></span>
                  <span>🌐 <strong className="text-fuchsia-300">www.tejobharat.com</strong></span>
                </div>
              </div>
            </div>

            <div className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-center flex-shrink-0 shadow-md">
              <div className="text-[9.5px] font-bold uppercase tracking-wider opacity-90">
                PAYMENT RECEIPT
              </div>
              <div className="text-sm font-extrabold mt-0.5">#{record.payment_number}</div>
              <div className="text-[9.5px] opacity-90 mt-0.5">{record.payment_date}</div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* SECTION 1: PAYMENT DETAILS CARD */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider pb-1.5 border-b border-slate-200 flex items-center justify-between">
                <span>💳 Payment Summary</span>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  Mode: {record.payment_mode}
                </span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Received From</span>
                  <span className="font-extrabold text-slate-900 uppercase block text-sm">{record.party_name}</span>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Payment Date</span>
                  <span className="font-bold text-slate-800 font-mono block">{record.payment_date}</span>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Amount Received</span>
                  <span className="font-mono font-black text-emerald-700 block text-base">₹ {record.amount_received.toLocaleString('en-IN')}</span>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Discount Offered</span>
                  <span className="font-mono font-bold text-slate-800 block">₹ {record.discount || 0}</span>
                </div>
              </div>

              {record.notes && (
                <div className="pt-2 border-t border-slate-200 text-xs text-slate-600">
                  <span className="font-semibold text-slate-500">Remarks / Reference: </span>
                  {record.notes}
                </div>
              )}
            </div>

            {/* SECTION 2: INVOICES SETTLED WITH THIS PAYMENT */}
            <div className="border border-slate-200 rounded-xl overflow-hidden space-y-2 p-4 bg-white">
              <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100">
                Invoices Settled With This Payment
              </h2>

              {!record.settled_invoices || record.settled_invoices.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs font-semibold">
                  No specific invoices linked to this payment entry.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase">
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Invoice Number</th>
                      <th className="p-2.5">Invoice Amount</th>
                      <th className="p-2.5">Amount Settled</th>
                      <th className="p-2.5 text-right">Balance Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {record.settled_invoices.map((inv) => (
                      <tr key={inv.invoice_no} className="hover:bg-slate-50">
                        <td className="p-2.5 font-semibold text-slate-700">{inv.date}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-900">{inv.invoice_no}</td>
                        <td className="p-2.5 font-mono">₹ {inv.invoice_amount.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 font-mono font-bold text-emerald-700">₹ {inv.amount_settled.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">₹ {inv.balance_amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* THANKS NOTE BANNER */}
            <div className="pdf-section bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3 text-xs text-emerald-900">
              <span className="text-xl">💚</span>
              <span className="font-medium text-[11px] leading-tight">
                <strong>Thank you for your payment to Tejo Bharat Global Energy LLP!</strong> We appreciate your prompt business and look forward to serving your clean solar energy needs.
              </span>
            </div>

            {/* AUTHORIZED DIGITAL SIGNATURE & STAMP */}
            <div className="pdf-section pt-2">
              <div className="grid grid-cols-2 gap-4 items-end">
                <div className="border border-dashed border-slate-300 rounded-xl p-3 text-center h-28 flex flex-col justify-between">
                  <div className="border-t border-slate-300 pt-1 text-[10px] text-slate-500">Payer Signature / Stamp</div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 uppercase">{record.party_name}</div>
                    <div className="text-[9px] text-slate-400 font-medium">Received with Thanks</div>
                  </div>
                </div>

                <div className="border border-slate-300 bg-slate-50/80 rounded-xl p-2.5 flex flex-col justify-between h-28 relative overflow-hidden text-center shadow-xs">
                  <div className="text-[9px] font-extrabold text-slate-700 uppercase tracking-wider">
                    For Tejo Bharat Global Energy LLP
                  </div>
                  <div className="my-auto py-0.5 flex flex-col items-center justify-center">
                    <img 
                      src="/signature.png" 
                      alt="Authorized Signature" 
                      className="h-10 max-h-10 object-contain mx-auto my-0.5"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="font-serif italic font-extrabold text-teal-950 text-xs tracking-wide">
                      Authorized Signatory
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-0.5 text-[8.5px] text-slate-500 font-mono">
                    Ref: REC-{record.payment_number} | {record.payment_date}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
};
