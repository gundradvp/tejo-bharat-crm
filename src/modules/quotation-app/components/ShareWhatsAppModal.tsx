import React, { useState } from 'react';
import html2pdf from 'html2pdf.js';
import { Quotation, Branch, Party } from '../types/quotation';
import { supabase } from '../lib/supabase';
import { X, Send, Copy, Check, MessageSquare, Phone, User, Building2, ExternalLink, FileText, Share2, Loader2, Info, Download, UploadCloud } from 'lucide-react';

interface ShareWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation;
  branch: Branch;
  parties?: Party[];
}

export const ShareWhatsAppModal: React.FC<ShareWhatsAppModalProps> = ({
  isOpen,
  onClose,
  quotation,
  branch,
  parties = []
}) => {
  const [targetType, setTargetType] = useState<'customer' | 'party' | 'custom'>('customer');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [customPhone, setCustomPhone] = useState<string>('');
  const [customRecipientName, setCustomRecipientName] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfNote, setPdfNote] = useState<string | null>(null);
  const [pdfCloudUrl, setPdfCloudUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Determine active recipient phone number & name
  let targetPhone = '';
  let targetName = quotation.customer_name || 'Customer';

  if (targetType === 'customer') {
    targetPhone = quotation.customer_phone || '';
    targetName = quotation.customer_name || 'Customer';
  } else if (targetType === 'party') {
    const p = parties.find(party => party.id === selectedPartyId || party.name === selectedPartyId);
    if (p) {
      targetPhone = p.mobile_number || '';
      targetName = p.name;
    }
  } else if (targetType === 'custom') {
    targetPhone = customPhone;
    targetName = customRecipientName.trim() || 'Sir/Madam';
  }

  // Clean phone number for WhatsApp API link (needs 91 prefix for India if 10 digits)
  const formatPhoneForWhatsApp = (rawPhone: string) => {
    let cleaned = rawPhone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    return cleaned;
  };

  const formattedWhatsAppPhone = formatPhoneForWhatsApp(targetPhone);

  // 2. Calculations for Message Text
  const effectiveRate = quotation.total_amount ? (quotation.total_amount / quotation.system_capacity_kw) : (quotation.rate_per_kw || 55000);
  const grossCost = quotation.total_amount || (quotation.system_capacity_kw * effectiveRate);
  
  const normCat = (quotation.category || '').toLowerCase();
  let subsidyAmount = 0;
  if (normCat.includes('residential') || normCat.includes('home')) {
    if (quotation.system_capacity_kw <= 2) subsidyAmount = quotation.system_capacity_kw * 30000;
    else if (quotation.system_capacity_kw < 3) subsidyAmount = 60000 + ((quotation.system_capacity_kw - 2) * 18000);
    else subsidyAmount = 78000;
  } else if (normCat.includes('group') || normCat.includes('ghs') || normCat.includes('housing')) {
    subsidyAmount = Math.min(quotation.system_capacity_kw * 18000, 500 * 18000);
  }
  const netPayable = Math.max(0, grossCost - subsidyAmount);

  const rawInverter = quotation.inverter_brand || 'Deye Inverter';
  const cleanInverterBrand = rawInverter.replace(/3-Phase|1-Phase|Single Phase|\(1-Phase\)|\(3-Phase\)/gi, '').replace(/\s+/g, ' ').trim() || 'Deye Inverter';
  const displayInverterPhase = quotation.inverter_phase || (quotation.system_capacity_kw >= 5 ? '3-Phase' : '1-Phase');
  const displayStructureGrid = quotation.structure_grid ? `${quotation.structure_grid.split(' ')[0]} Layout` : '3x5 Layout';
  const displayStructureHeight = quotation.structure_height || 'Elevated Superstructure (6ft–10ft Height)';

  // Build WhatsApp text message with optional PDF cloud URL link
  const buildMessageText = (cloudUrl?: string | null) => {
    let msg = `*Tejo Bharat Global Energy LLP — Solar Proposal* ☀️

Dear *${targetName}*,

Greetings from Tejo Bharat Global Energy! Here are the details of your customized rooftop solar proposal:

📋 *Proposal Reference:* #${quotation.quotation_no}
⚡ *System Capacity:* ${quotation.system_capacity_kw} kW On-Grid Solar Plant
🏷️ *Turnkey System Cost:* ₹ ${grossCost.toLocaleString('en-IN')}${subsidyAmount > 0 ? `\n🏛️ *PM Surya Ghar Subsidy:* ₹ ${subsidyAmount.toLocaleString('en-IN')} (Direct Bank Credit)\n💰 *Net Effective Cost:* ₹ ${netPayable.toLocaleString('en-IN')}` : ''}

*Technical Equipment Highlights:*
• *Solar Panels:* ${quotation.panel_brand || (normCat.includes('commercial') || normCat.includes('industrial') || normCat.includes('institutional') ? 'Tier-1 Non-DCR (NDCR) 500+ W High-Efficiency Modules' : 'Premier / Waaree 500+ W DCR Mono PERC')}
• *Solar Inverter:* ${cleanInverterBrand} (${displayInverterPhase})
• *Mounting Structure:* ${displayStructureGrid} (${displayStructureHeight})
• *Est. Monthly Generation:* ~${(quotation.monthly_units || quotation.system_capacity_kw * 120).toLocaleString('en-IN')} Units / month
• *Est. Monthly Savings:* ~₹ ${(quotation.monthly_savings_rs || quotation.system_capacity_kw * 900).toLocaleString('en-IN')} / month
• *Warranty:* 25-Year Performance Guarantee`;

    if (cloudUrl) {
      msg += `\n\n📄 *View / Download PDF Proposal Document:* \n${cloudUrl}`;
    }

    msg += `\n\n📍 *Branch Office:* ${branch.address || 'Seethayya Gari Thota, Pithapuram'}
📞 *Contact:* ${branch.phone || '+91 94797 97947'}
🌐 *Website:* www.tejobharat.com

_We look forward to helping you switch to clean solar energy & achieve ₹0 electricity bills!_`;

    return msg;
  };

  const messageText = buildMessageText(pdfCloudUrl);

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    if (!formattedWhatsAppPhone) {
      alert('Please select or enter a valid mobile number first.');
      return;
    }
    const encodedText = encodeURIComponent(messageText);
    const waUrl = `https://api.whatsapp.com/send?phone=${formattedWhatsAppPhone}&text=${encodedText}`;
    window.open(waUrl, '_blank');
  };

  // 4. PDF File Generation & WhatsApp Sharing
  const handleSharePDF = async () => {
    if (!formattedWhatsAppPhone) {
      alert('Please select or enter a valid mobile number first.');
      return;
    }

    const element = document.querySelector('.quotation-print-area') as HTMLElement | null;
    if (!element) {
      alert('Quotation view not found to generate PDF.');
      handleOpenWhatsApp();
      return;
    }

    setIsGeneratingPdf(true);
    setPdfNote(null);

    const partyName = (quotation.customer_name || 'Customer').replace(/[/\\?%*:|"<>]/g, '').trim();
    const capacity = quotation.system_capacity_kw || 0;
    const docNo = quotation.quotation_no || '';
    const filename = `${partyName}_${capacity}kW_Solar_Proposal_${docNo}.pdf`;

    const opt = {
      margin: 0,
      filename: filename,
      image: { type: 'jpeg' as const, quality: 0.85 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: false,
        scrollX: 0,
        scrollY: 0,
        logging: false
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    try {
      // Step A: Render PDF Blob
      const pdfBlob = await (html2pdf() as any).set(opt).from(element).output('blob');
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

      // Step B: Attempt Supabase Storage Upload for Direct PDF Cloud Link
      let uploadedUrl: string | null = null;
      try {
        const filePath = `quotations/${docNo}_${Date.now()}.pdf`;
        const { data, error } = await supabase.storage.from('quotation-pdfs').upload(filePath, pdfFile, {
          cacheControl: '3600',
          upsert: true
        });

        if (!error && data) {
          const { data: publicUrlData } = supabase.storage.from('quotation-pdfs').getPublicUrl(filePath);
          if (publicUrlData?.publicUrl) {
            uploadedUrl = publicUrlData.publicUrl;
            setPdfCloudUrl(uploadedUrl);
          }
        }
      } catch (storageErr) {
        console.info('Supabase PDF storage upload optional fallback:', storageErr);
      }

      const finalMsg = buildMessageText(uploadedUrl || pdfCloudUrl);

      // Step C: Check Web Share API (Mobile phones / tablets with file share support)
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Solar Quotation #${docNo}`,
          text: finalMsg
        });
        setIsGeneratingPdf(false);
      } else {
        // Step D: Desktop Web Browser behavior
        // 1. Download PDF file directly to user's device
        (html2pdf() as any).set(opt).from(element).save();
        
        // 2. Launch WhatsApp Web with prefilled chat text (including PDF Link if uploaded)
        const encodedText = encodeURIComponent(finalMsg);
        const waUrl = `https://api.whatsapp.com/send?phone=${formattedWhatsAppPhone}&text=${encodedText}`;
        window.open(waUrl, '_blank');

        setIsGeneratingPdf(false);
        setPdfNote(
          `📄 PDF downloaded to your computer! WhatsApp Web opened in a new tab.\n` +
          `📌 To attach the actual PDF file in WhatsApp Web: Click the 📎 icon -> select Documents -> pick '${filename}'.`
        );
      }
    } catch (err: any) {
      console.warn('PDF Share Error:', err);
      setIsGeneratingPdf(false);
      handleOpenWhatsApp();
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 no-print">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-700 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-emerald-950 border-b border-emerald-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white tracking-tight flex items-center gap-2">
                <span>Share PDF Quotation on WhatsApp</span>
                <span className="text-[10px] bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full font-bold">PDF Document</span>
              </h3>
              <p className="text-xs text-emerald-300/80">
                1st priority: Quotation phone number pre-selected by default
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-400 hover:text-white p-1 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Priority Recipient Selector */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-emerald-400 tracking-wider block">
              1. Select Recipient Mobile Number
            </label>

            <div className="grid grid-cols-3 gap-2">
              {/* Option 1: Quotation Customer (1st Priority) */}
              <button
                type="button"
                onClick={() => setTargetType('customer')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  targetType === 'customer'
                    ? 'border-emerald-500 bg-emerald-950/60 shadow-sm'
                    : 'border-slate-800 bg-slate-800/60 hover:bg-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-white mb-1">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate">1st Priority (Quote)</span>
                </div>
                <div className="text-[11px] font-bold text-slate-300 truncate">
                  {quotation.customer_name || 'Customer'}
                </div>
                <div className="text-[11px] font-mono text-emerald-400 font-bold truncate">
                  {quotation.customer_phone || 'No Phone Set'}
                </div>
              </button>

              {/* Option 2: Choose from Parties List */}
              <button
                type="button"
                onClick={() => setTargetType('party')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  targetType === 'party'
                    ? 'border-emerald-500 bg-emerald-950/60 shadow-sm'
                    : 'border-slate-800 bg-slate-800/60 hover:bg-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-white mb-1">
                  <Building2 className="w-3.5 h-3.5 text-teal-400" />
                  <span className="truncate">Saved Party</span>
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  Select from CRM
                </div>
              </button>

              {/* Option 3: Type Custom Mobile Number */}
              <button
                type="button"
                onClick={() => setTargetType('custom')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  targetType === 'custom'
                    ? 'border-emerald-500 bg-emerald-950/60 shadow-sm'
                    : 'border-slate-800 bg-slate-800/60 hover:bg-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-white mb-1">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span className="truncate">Custom Number</span>
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  Type new number
                </div>
              </button>
            </div>
          </div>

          {/* Conditional Input Fields */}
          {targetType === 'party' && (
            <div className="space-y-1.5 bg-slate-800/70 p-3 rounded-xl border border-slate-700">
              <label className="text-[11px] font-bold text-slate-300">Choose CRM Party:</label>
              <select
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-slate-900 border border-slate-600 rounded-lg text-white"
              >
                <option value="">-- Select Party from list --</option>
                {parties.map((p) => (
                  <option key={p.id || p.name} value={p.id || p.name}>
                    {p.name} ({p.mobile_number || 'No Phone'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetType === 'custom' && (
            <div className="grid grid-cols-2 gap-2 bg-slate-800/70 p-3 rounded-xl border border-slate-700">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Recipient Name:</label>
                <input
                  type="text"
                  value={customRecipientName}
                  onChange={(e) => setCustomRecipientName(e.target.value)}
                  placeholder="e.g. Mr. Sharma"
                  className="w-full px-3 py-1.5 text-xs font-bold bg-slate-900 border border-slate-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Mobile Number:</label>
                <input
                  type="text"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-slate-900 border border-slate-600 rounded-lg text-emerald-400"
                />
              </div>
            </div>
          )}

          {/* Active Target Banner */}
          <div className="bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-bold">
            <span className="text-slate-400">Target Recipient:</span>
            <div className="flex items-center gap-2">
              <span className="text-white">{targetName}</span>
              <span className="text-emerald-400 font-mono font-extrabold bg-emerald-950/80 px-2.5 py-0.5 rounded-md border border-emerald-800">
                {targetPhone ? `+91 ${targetPhone.replace(/^91/, '')}` : '⚠️ No Number Selected'}
              </span>
            </div>
          </div>

          {/* PDF Guidance Note */}
          {pdfNote && (
            <div className="bg-emerald-950/90 border border-emerald-600 text-emerald-200 p-3 rounded-xl text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed font-semibold">
                {pdfNote}
              </div>
            </div>
          )}

          {/* Message Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-extrabold uppercase text-slate-400 tracking-wider">
                2. Formatted Proposal Text Summary Preview
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Text'}</span>
              </button>
            </div>

            <div className="bg-slate-950 text-emerald-200/90 font-mono text-[11px] p-3.5 rounded-xl border border-slate-800 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed shadow-inner">
              {messageText}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 px-6 py-3.5 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenWhatsApp}
              disabled={!targetPhone || isGeneratingPdf}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
              title="Open WhatsApp with text summary only"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Text Only</span>
            </button>

            <button
              onClick={handleSharePDF}
              disabled={!targetPhone || isGeneratingPdf}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 transition-all shadow-lg"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 text-emerald-200" />
                  <span>Share PDF on WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

