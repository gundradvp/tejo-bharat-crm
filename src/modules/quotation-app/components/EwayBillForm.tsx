import React, { useState } from 'react';
import { Quotation, Branch } from '../types/quotation';
import { ArrowLeft, Truck, Check, Building2, User } from 'lucide-react';

interface EwayBillFormProps {
  quotation: Quotation;
  branch: Branch;
  onSave: (ewayBillData: any) => void;
  onCancel: () => void;
}

export const EwayBillForm: React.FC<EwayBillFormProps> = ({
  quotation,
  branch,
  onSave,
  onCancel
}) => {
  const [transactionType, setTransactionType] = useState<string>('Regular');
  
  // Seller Details
  const [sellerGstin, setSellerGstin] = useState<string>(branch.gstin || '37AAYFT4513H1ZO');
  const [sellerAddress, setSellerAddress] = useState<string>(branch.address || 'Anantha Lakshmi Nilayam, Beside Reddy Raja Kalyana Mandapam, Seethayyagari Thota, Pithapuram');
  const [sellerState, setSellerState] = useState<string>(branch.state || 'Andhra Pradesh');
  const [sellerPincode, setSellerPincode] = useState<string>(branch.pincode || '533449');
  const [sellerCity, setSellerCity] = useState<string>(branch.city || 'East Godavari');

  // Buyer Details
  const [buyerName, setBuyerName] = useState<string>(quotation.customer_name || '');
  const [buyerGstin, setBuyerGstin] = useState<string>(quotation.customer_gstin || '');
  const [buyerAddress, setBuyerAddress] = useState<string>(quotation.customer_address || quotation.customer_billing_address || '');
  const [buyerState, setBuyerState] = useState<string>('Andhra Pradesh');
  const [buyerPincode, setBuyerPincode] = useState<string>('533449');
  const [buyerCity, setBuyerCity] = useState<string>(quotation.customer_location || '');

  // Transportation Details
  const [transporterId, setTransporterId] = useState<string>('');
  const [transporterName, setTransporterName] = useState<string>('');
  const [approxDistance, setApproxDistance] = useState<number>(0);

  // Part B Details
  const [transportMode, setTransportMode] = useState<string>('Road');
  const [vehicleType, setVehicleType] = useState<string>('Regular');
  const [vehicleNo, setVehicleNo] = useState<string>('');
  const [transporterDocNo, setTransporterDocNo] = useState<string>('');
  const [transporterDocDate, setTransporterDocDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [generatedEwayNo, setGeneratedEwayNo] = useState<string | null>(quotation.eway_bill_no || null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Generate mock 12-digit E-way Bill Number if not provided
    const mockEwayNo = generatedEwayNo || `2410${Math.floor(10000000 + Math.random() * 90000000)}`;
    const ewayData = {
      eway_bill_no: mockEwayNo,
      transaction_type: transactionType,
      seller_gstin: sellerGstin,
      seller_address: sellerAddress,
      buyer_name: buyerName,
      buyer_gstin: buyerGstin,
      buyer_address: buyerAddress,
      transporter_id: transporterId,
      transporter_name: transporterName,
      approx_distance_km: approxDistance,
      transport_mode: transportMode,
      vehicle_no: vehicleNo,
      transporter_doc_no: transporterDocNo,
      generated_at: new Date().toISOString()
    };

    setGeneratedEwayNo(mockEwayNo);
    setIsSuccess(true);
    setTimeout(() => {
      onSave(ewayData);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 pb-16">
      
      {/* Top Header Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-600" />
              <span>Generate E-way Bill ({quotation.document_type || 'Tax Invoice'})</span>
            </h1>
            <p className="text-xs text-slate-500 font-mono">Invoice #{quotation.quotation_no}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <Truck className="w-4 h-4" />
            <span>Generate E-way Bill</span>
          </button>
        </div>
      </div>

      {isSuccess && (
        <div className="max-w-6xl mx-auto mt-4 px-4">
          <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl flex items-center gap-3 shadow-md animate-in fade-in">
            <Check className="w-6 h-6 text-emerald-600" />
            <div>
              <p className="font-extrabold text-sm">E-way Bill Generated Successfully!</p>
              <p className="text-xs font-mono">E-Way Bill No: <strong>{generatedEwayNo}</strong></p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-6xl mx-auto p-6 space-y-6">
        
        {/* Section 1: Voucher Details */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
            Voucher Details
          </h2>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Transaction Type <span className="text-red-500">*</span>
            </label>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              className="w-72 px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Regular">Regular</option>
              <option value="Bill To - Ship To">Bill To - Ship To</option>
              <option value="Bill From - Dispatch From">Bill From - Dispatch From</option>
              <option value="Combination of 2 and 3">Combination of 2 and 3</option>
            </select>
          </div>
        </div>

        {/* Section 2: Seller Details & Buyer Details (2 Columns) */}
        <div className="grid grid-cols-2 gap-6">
          
          {/* Seller Details */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Seller Details
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  GSTIN No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={sellerGstin}
                  onChange={(e) => setSellerGstin(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs font-mono font-bold uppercase bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Street Address
                </label>
                <textarea
                  rows={2}
                  value={sellerAddress}
                  onChange={(e) => setSellerAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">State</label>
                  <select
                    value={sellerState}
                    onChange={(e) => setSellerState(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Puducherry">Puducherry</option>
                    <option value="Karnataka">Karnataka</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={sellerPincode}
                    onChange={(e) => setSellerPincode(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">City</label>
                <input
                  type="text"
                  value={sellerCity}
                  onChange={(e) => setSellerCity(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Buyer Details */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-emerald-600" />
              <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Buyer Details
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Name</label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Enter buyer name"
                  className="w-full px-3 py-2 text-xs font-extrabold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 uppercase"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">GSTIN No</label>
                <input
                  type="text"
                  value={buyerGstin}
                  onChange={(e) => setBuyerGstin(e.target.value.toUpperCase())}
                  placeholder="Enter party GSTIN"
                  className="w-full px-3 py-2 text-xs font-mono uppercase font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Street Address</label>
                <textarea
                  rows={2}
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  placeholder="Enter address"
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">State</label>
                  <select
                    value={buyerState}
                    onChange={(e) => setBuyerState(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Puducherry">Puducherry</option>
                    <option value="Karnataka">Karnataka</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={buyerPincode}
                    onChange={(e) => setBuyerPincode(e.target.value)}
                    placeholder="Enter party pincode"
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">City</label>
                <input
                  type="text"
                  value={buyerCity}
                  onChange={(e) => setBuyerCity(e.target.value)}
                  placeholder="Enter City"
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Section 3: Transportation Details */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
            Transportation Details
          </h2>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Transporter ID</label>
              <input
                type="text"
                placeholder="eg. 22AAA AA000 0A1Z5"
                value={transporterId}
                onChange={(e) => setTransporterId(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Transporter Name</label>
              <input
                type="text"
                placeholder="Enter Name"
                value={transporterName}
                onChange={(e) => setTransporterName(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Approx Distance (In KM) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={approxDistance}
                onChange={(e) => setApproxDistance(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Use the Distance Calculator to measure the distance between the place of dispatch and delivery.
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: PART B */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
            PART B
          </h2>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Mode of Transport</label>
              <select
                value={transportMode}
                onChange={(e) => setTransportMode(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Road">Road</option>
                <option value="Rail">Rail</option>
                <option value="Air">Air</option>
                <option value="Ship">Ship</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Vehicle Type</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Regular">Regular</option>
                <option value="Over Dimensional Cargo">Over Dimensional Cargo</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Vehicle No</label>
              <input
                type="text"
                placeholder="eg. AP 05 XX 1234"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs font-mono font-bold uppercase bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Doc No & Date</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Doc No."
                  value={transporterDocNo}
                  onChange={(e) => setTransporterDocNo(e.target.value)}
                  className="w-1/2 px-2.5 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="date"
                  value={transporterDocDate}
                  onChange={(e) => setTransporterDocDate(e.target.value)}
                  className="w-1/2 px-2 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

      </form>

    </div>
  );
};
