import React, { useState } from 'react';
import { X, Sparkles, Copy, Check, MessageSquare, Phone, ShieldCheck, Zap } from 'lucide-react';

export interface ScriptItem {
  id: string;
  title: string;
  language: 'Telugu' | 'English';
  content: string;
}

export const SOLAR_PITCH_SCRIPTS: ScriptItem[] = [
  {
    id: 'telugu-intro',
    title: 'Telugu Direct Intro (Best for AP Vendors)',
    language: 'Telugu',
    content: `నమస్కారం సార్! నా పేరు దుర్గ, తేజో భారత్ గ్లోబల్ ఎనర్జీ (Tejo Bharat Global Energy) నుండి మాట్లాడుతున్నాను.

మీరు అనకాపల్లి / కోస్తా ఆంధ్రలో సోలార్ ఇన్స్టాలేషన్స్ మరియు పిఎం సూర్య ఘర్ ప్రాజెక్ట్స్ చేస్తున్నట్లు చూశాము. 
మేము డైరెక్ట్ గా సోలార్ ప్యానెల్స్ (Tier-1 DCR & Non-DCR Mono PERC, TOPCon 550W+) డీలర్ మరియు హోల్‌సేల్ ప్రైస్‌కే సప్లై చేస్తున్నాము. 

మీ రాబోయే ప్రాజెక్ట్స్ కోసం రెడీ స్టాక్ మరియు బెస్ట్ రేట్స్ కావాలంటే వెంటనే డిస్పాచ్ చేయగలం సార్. మీ కరెంట్ రిక్వైర్మెంట్ ఏమైనా ఉందా సార్?`
  },
  {
    id: 'english-intro',
    title: 'English Professional Pitch',
    language: 'English',
    content: `Hello Sir/Madam! This is Durga calling from Tejo Bharat Global Energy LLP.

I noticed your active solar installations under PM Surya Ghar and rooftop projects in Andhra Pradesh. 
We are supplying Tier-1 DCR and Non-DCR Solar Modules (Mono PERC & TOPCon 550Wp+) directly to solar contractors with verified ALMM compliance, 25-year warranty, and prompt delivery across Andhra Pradesh.

We are currently offering very attractive wholesale margins for registered solar vendors. May I share our latest price list on WhatsApp?`
  },
  {
    id: 'objection-existing-supplier',
    title: 'Objection: "We already have a regular distributor"',
    language: 'Telugu',
    content: `చాలా బాగుంది సార్! ఖచ్చితంగా మీరు ఆల్రెడీ ఒకరి దగ్గర తీసుకుంటుంటారు. కానీ తేజో భారత్ నుండి మేము ఇచ్చే అడ్వాంటేజ్ ఏంటంటే:
1. లోకల్ ఆంధ్రప్రదేశ్ లోనే రెడీ స్టాక్ ఉంటుంది - ట్రాన్స్‌పోర్ట్ డిలేస్ ఉండవు.
2. పక్కా జీఎస్టీ బిల్లింగ్ (8.9% GST compliant for solar) మరియు పిఎం సూర్య ఘర్ డిబిటి అప్రూవల్స్ కి పూర్తి డాక్యుమెంటేషన్.
3. మీ రెగ్యులర్ రేటు కంటే వాట్ కి 30-50 పైసలు బెటర్ మార్జిన్ ఇవ్వగలం.

ఒక్కసారి మా కొటేషన్ చూడండి సార్, నచ్చితేనే ఒక చిన్న ఆర్డర్ తో టెస్ట్ చేయండి.`
  },
  {
    id: 'objection-pricing',
    title: 'Objection: "What is your rate per watt?"',
    language: 'English',
    content: `Our rates depend on whether you need DCR (for PM Surya Ghar residential subsidy claims) or Non-DCR (for commercial/industrial roofs):
• DCR Mono PERC 545W/550W: Best market-competitive dealer rate with full ALMM certificate.
• Non-DCR TOPCon 550W+ Bifacial: Ultra high efficiency up to 22.5% at aggressive bulk pallet pricing.
• Immediate dispatch from our regional AP hub.

If you share your quantity (kW or pallets), I will immediately WhatsApp the exact quote with GST breakdown!`
  },
  {
    id: 'whatsapp-quick-text',
    title: 'WhatsApp Follow-Up Text Template',
    language: 'English',
    content: `*Tejo Bharat Global Energy LLP - Solar Modules Price & Stock Offer* 🌞

Dear Partner,
Thank you for speaking with us. Here is our solar module availability for your PM Surya Ghar & Rooftop projects:

✅ Tier-1 ALMM & BIS Approved
✅ DCR Compliant (540W - 550W Mono PERC)
✅ High-Efficiency TOPCon Bifacial
✅ 25-Year Performance Warranty
✅ Ready Stock in Andhra Pradesh & Telangana

📞 Call/WhatsApp: +91 94797 97947
🌐 Web: www.tejobharat.com
Address: Tejo Bharat Global Energy LLP`
  }
];

export const FREQUENT_SOLAR_NOTES = [
  "Interested in 10kW DCR panels for upcoming PM Surya Ghar installation",
  "Requested dealer quotation on WhatsApp",
  "Line busy - Call back in the evening",
  "Already has stock, asked to follow up next month",
  "Looking for TOPCon 550W+ Bifacial panels",
  "Asked to share ALMM certificate and datasheet",
  "Working exclusively on commercial rooftops (Non-DCR)",
  "Deal finalized - Agreed on wholesale rate"
];

interface SalesPitchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SalesPitchDrawer: React.FC<SalesPitchDrawerProps> = ({ isOpen, onClose }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col border-l border-slate-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 flex items-center justify-between border-b border-teal-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-black">Tejo Bharat Solar Sales Guide</h2>
              <p className="text-xs text-teal-300/80">Scripts, Objections & Module Specifications</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Highlights Bar */}
        <div className="bg-teal-50 border-b border-teal-100 p-3.5 text-xs text-teal-900 flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <span>ALMM & BIS Approved Tier-1 Panels</span>
          </div>
          <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-teal-200 text-teal-800 font-bold">
            +91 94797 97947
          </span>
        </div>

        {/* Scrollable Pitch Cards */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1.5">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
              Tejo Bharat Value Proposition
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li><b>Ready Stock in Andhra Pradesh:</b> Fast dispatch to Anakapalli, Vizag, Kakinada, etc.</li>
              <li><b>PM Surya Ghar Compliance:</b> Certified DCR Mono PERC for full customer DBT subsidy.</li>
              <li><b>High Dealer Margins:</b> Direct wholesale factory rate without intermediaries.</li>
              <li><b>25-Year Performance Warranty:</b> Guaranteed long-term peace of mind.</li>
            </ul>
          </div>

          {SOLAR_PITCH_SCRIPTS.map(script => (
            <div key={script.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    script.language === 'Telugu' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {script.language}
                  </span>
                  <span>{script.title}</span>
                </span>

                <button
                  type="button"
                  onClick={() => handleCopy(script.id, script.content)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold transition-all"
                >
                  {copiedId === script.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === script.id ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <pre className="whitespace-pre-wrap font-sans text-slate-700 bg-slate-50 p-3 rounded-lg text-xs leading-relaxed border border-slate-100">
                {script.content}
              </pre>
            </div>
          ))}

        </div>

      </div>
    </div>
  );
};
