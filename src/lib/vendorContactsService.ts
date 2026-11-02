import { VendorContact, ContactsMasterData, PipelineStage, CallOutcome } from '../types/vendorCRM';

let cachedMaster: ContactsMasterData | null = null;
let dcrMasterCache: Record<string, any> | null = null;
let loadPromise: Promise<ContactsMasterData | null> | null = null;

export function normalizeVendorName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(private|pvt|limited|ltd|llp|inc|co|corp|solutions|enterprises|energy|solar|systems|power|tech|technologies)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export async function getDCRSupplyChainMaster(): Promise<Record<string, any> | null> {
  if (dcrMasterCache) return dcrMasterCache;
  try {
    const res = await fetch('/dcr_supply_chain_master.json');
    if (res.ok) {
      const data = await res.json();
      dcrMasterCache = data.vendor_intelligence || {};
      return dcrMasterCache;
    }
  } catch (err) {
    console.error('Failed to load dcr_supply_chain_master.json:', err);
  }
  return null;
}

export async function loadVendorContactsMaster(): Promise<ContactsMasterData | null> {
  if (cachedMaster) return cachedMaster;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const res = await fetch('/vendor_contacts_master.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ContactsMasterData = await res.json();

      // Optionally enrich with DCR intelligence
      const dcrData = await getDCRSupplyChainMaster();
      if (dcrData) {
        // Create normalized DCR lookup
        const dcrNormMap: Record<string, any> = {};
        for (const [vName, vObj] of Object.entries(dcrData)) {
          const norm = normalizeVendorName(vName);
          if (norm && !dcrNormMap[norm]) {
            dcrNormMap[norm] = vObj;
          }
        }

        for (const v of data.vendors) {
          const norm = normalizeVendorName(v.vendorName);
          const dcrMatch = dcrNormMap[norm];
          if (dcrMatch) {
            v.dcrTracked = true;
            v.dcrInboundPanels = dcrMatch.total_inbound_panels;
            v.dcrOutboundPanels = dcrMatch.b2b_outbound_panels ?? dcrMatch.total_outbound_panels;
            v.dcrManufacturers = Object.keys(dcrMatch.manufacturers_handled || {});
            v.dcrSuppliers = (dcrMatch.suppliers || []).map((s: any) => s.supplier_name);
            v.dcrBuyers = (dcrMatch.buyers || []).map((b: any) => b.buyer_name);
          }
        }
      }

      cachedMaster = data;
      return data;
    } catch (err) {
      console.error('Failed to load vendor contacts master data:', err);
      return null;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/**
 * Instant lookup of vendor contact by name.
 * Searches:
 * 1. Exact lowercase match
 * 2. Normalized vendor name match
 * 3. Fuzzy substring match
 */
export function lookupVendorContact(name: string, master?: ContactsMasterData | null): VendorContact | null {
  const m = master || cachedMaster;
  if (!m || !name) return null;

  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  // 1. Exact lowercase index
  if (m.indices.by_exact_lower[lower] !== undefined) {
    return m.vendors[m.indices.by_exact_lower[lower]] || null;
  }

  // 2. Normalized name index
  const norm = normalizeVendorName(trimmed);
  if (norm && m.indices.by_norm_name[norm] !== undefined) {
    return m.vendors[m.indices.by_norm_name[norm]] || null;
  }

  // 3. Substring match fallback
  for (const v of m.vendors) {
    const vLower = v.vendorName.toLowerCase();
    if (vLower.includes(lower) || lower.includes(vLower)) {
      return v;
    }
  }

  return null;
}

export const DISTRICT_RULES = [
  { district: 'Kakinada', keywords: ['kakinada', 'pithapuram', 'samalkot', 'samalkota', 'peddapuram', 'tuni', 'kirlampudi', 'gollaprolu', 'karapa', 'pedapudi', 'thallarevu', 'kajuluru', 'yeleswaram', 'prathipadu', 'sankhavaram', 'kotananduru', 'rauthalapudi', 'uppada', 'vakalapudi', 'rayudupalem', 'ramanayyapeta', 'valasapakala', 'atchampeta', 'surampalem', 'thammavaram', 'raparthi', 'sampara', 'kattamuru', 'adb road'] },
  { district: 'East Godavari', keywords: ['east godavari', 'rajamahendravaram', 'rajahmundry', 'rajamundry', 'bommuru', 'korukonda', 'rajanagaram', 'kovvur', 'kovvuru', 'kadiam', 'anaparthi', 'biccavolu', 'gokavaram', 'devarapalli', 'chagallu', 'tallapudi', 'seethanagaram', 'nidadavole', 'dommeru', 'gorakshana', 'hukumpeta', 'konthamuru', 'rajavolu', 'malakapalle', 'burugupudi'] },
  { district: 'Dr. B.R. Ambedkar Konaseema', keywords: ['konaseema', 'amalapuram', 'ravulapalem', 'kothapeta', 'mandapeta', 'ramachandrapuram', 'razole', 'mummidivaram', 'alamuru', 'atreyapuram', 'ainavilli', 'allavaram', 'ambajipeta', 'katrenikona', 'malikipuram', 'sakinetipalli', 'uppalaguptam', 'vadapalem', 'bhatnavilli', 'settipeta', 'ithapudi'] },
  { district: 'Visakhapatnam', keywords: ['visakhapatnam', 'vizag', 'gvmc', 'pendurthi', 'gajuwaka', 'akkayyapalem', 'seethammadhara', 'madhurawada', 'mvp colony', 'bhimunipatnam', 'bheemili', 'rushikonda', 'kurmannapalem', 'steel plant', 'jagannadhapuram', 'aganampudi', 'simhachalam', 'kancharapalem', 'muralinagar', 'sujathanagar'] },
  { district: 'Anakapalli', keywords: ['anakapalli', 'anakapalle', 'narsipatnam', 'chodavaram', 'yelamanchili', 'yellamanchilli', 'munagapaka', 'payakaraopeta', 'payakarao peta', 'kasimkota', 'parawada', 'achutapuram', 'pisinikada', 'devarapalle', 'madugula', 'k.kotapadu', 'kotauratla', 'makavarapalem', 'nathavaram', 'ravikamatham', 'rolugunta', 's.rayavaram', 'rambilli', 'aratla', 'thimmarajupeta'] },
  { district: 'West Godavari', keywords: ['west godavari', 'bhimavaram', 'tadepalligudem', 'tanuku', 'narasapuram', 'narsapur', 'palakollu', 'palakol', 'akividu', 'attili', 'iragavaram', 'penugonda', 'penumantra', 'undrajavaram', 'mogalthur', 'ganapavaram', 'veeravasaram', 'kalla', 'chilakapadu', 'thogummi', 'peda tadepalli'] },
  { district: 'Eluru', keywords: ['eluru', 'jangareddygudem', 'nuzvid', 'chintalapudi', 'denduluru', 'pedavegi', 'pedapadu', 'unguturu', 'dwarakatirumala', 'kamavarapukota', 'polavaram', 'kukunoor', 'velairpadu', 'koyyalagudem', 'jeelugumilli', 'buttayagudem', 'lingapalem', 't.narasapuram'] },
  { district: 'Krishna / NTR', keywords: ['vijayawada', 'krishna', 'ntr', 'machilipatnam', 'gudivada', 'vuyyuru', 'kanchikanacherla', 'ibrahimpatnam', 'kondapalli', 'jaggayyapeta', 'tiruvuru', 'mylavaram', 'nandigama', 'patamata', 'poranki', 'penamaluru', 'autonagar', 'ramavarappadu', 'pedana', 'bhavanipuram', 'gollapudi', 'nandamuru'] },
  { district: 'Guntur / Palnadu', keywords: ['guntur', 'palnadu', 'mangalagiri', 'tenali', 'narasaraopet', 'chilakaluripet', 'macherla', 'sattenapalle', 'tadepalle', 'amaravati', 'vinukonda', 'piduguralla', 'gurazala', 'ponnur', 'jonnalagadda'] },
  { district: 'Srikakulam', keywords: ['srikakulam', 'ranasthalam', 'pydibhimavaram', 'palasa', 'amadalavalasa', 'tekkali', 'sompeta', 'ichchapuram', 'narasannapeta'] },
  { district: 'Vizianagaram / Manyam', keywords: ['vizianagaram', 'vizianagarm', 'parvathipuram', 'bobbili', 'salur', 'cheepurupalle', 'gajapathinagaram', 'nellimarla', 'kothavalasa', 'srungavarapukota', 's.kota', 'denkada'] },
  { district: 'Nellore / Prakasam / Bapatla', keywords: ['nellore', 'prakasam', 'ongole', 'bapatla', 'chirala', 'kavali', 'gudur', 'kandukur', 'markapur', 'podili', 'chejarla', 'vinjamur', 'uppugundur', 'chillakuru'] },
  { district: 'Tirupati / Chittoor', keywords: ['tirupati', 'chittoor', 'renigunta', 'srikalahasti', 'puttur', 'nagari', 'palamaner', 'kuppam'] },
  { district: 'Rayalaseema (Kurnool / Kadapa / Anantapur)', keywords: ['kurnool', 'nandyal', 'anantapur', 'anantapuramu', 'kadapa', 'ysr', 'hindupur', 'proddatur', 'rayachoti', 'pulivendula', 'jammalamadugu', 'moragudi'] },
  { district: 'Telangana / Hyderabad', keywords: ['hyderabad', 'hyd', 'secunderabad', 'kukatpally', 'medchal', 'malkajgiri', 'madhapur', 'gachibowli', 'kondapur', 'telangana', 'rangareddy', 'khammam', 'warangal', 'karimnagar', 'moosapet', 'pragathi nagar'] },
  { district: 'Other States / National', keywords: ['delhi', 'noida', 'gurgaon', 'bangalore', 'bengaluru', 'chennai', 'mumbai', 'pune', 'gujarat', 'ahmedabad', 'surat', 'vadodara', 'deesa', 'nadiad', 'jalna', 'rajasthan', 'jaipur', 'haryana', 'karnal', 'uttar pradesh', 'agra', 'maharashtra', 'kolkata', 'kerala', 'ernakulam', 'aluva', 'chhattisgarh', 'raipur'] }
];

export function detectVendorDistrict(address?: string | null, vendorName?: string | null): string {
  const text = `${address || ''} ${vendorName || ''}`.toLowerCase();
  for (const rule of DISTRICT_RULES) {
    if (rule.keywords.some(k => text.includes(k))) {
      return rule.district;
    }
  }
  return 'Anakapalli';
}

export function cleanPhoneNumber(rawPhone?: string | null): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits.length === 10 ? digits : digits.slice(-10);
}

export function formatPhoneDisplay(rawPhone?: string | null): string {
  const clean = cleanPhoneNumber(rawPhone);
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return rawPhone || 'No Phone';
}

export function getTelLink(rawPhone?: string | null): string {
  const clean = cleanPhoneNumber(rawPhone);
  if (!clean) return '#';
  return `tel:+91${clean}`;
}

export function getWhatsAppLink(rawPhone?: string | null, vendorName?: string, customPitch?: string): string {
  const clean = cleanPhoneNumber(rawPhone);
  if (!clean) return '#';

  const defaultText = customPitch || 
    `Namaskaram ${vendorName ? vendorName + ' ' : ''}garu, this is Durga from Tejo Bharat Global Energy LLP.\n\n` +
    `We are direct distributors of Tier-1 DCR & Non-DCR Solar Modules (Mono PERC / TOPCon 550W+) for PM Surya Ghar rooftop projects across Andhra Pradesh with immediate regional dispatch and best wholesale dealer margins.\n\n` +
    `Would you like to review our latest dealer price list and available stock?`;

  return `https://wa.me/91${clean}?text=${encodeURIComponent(defaultText)}`;
}

export function getEmailLink(email?: string | null, vendorName?: string): string {
  if (!email) return '#';
  const subject = encodeURIComponent(`Solar Modules & EPC Partner Supply | Tejo Bharat Global Energy LLP`);
  const body = encodeURIComponent(
    `Dear ${vendorName || 'Partner'},\n\n` +
    `Greetings from Tejo Bharat Global Energy LLP.\n\n` +
    `We are a leading renewable energy provider & distributor specializing in rooftop solar installations, PM Surya Ghar compliant DCR modules, and high-efficiency solar modules.\n\n` +
    `We supply Tier-1 solar modules, inverters, and BOS to ongoing projects with high dealer margins and rapid logistics.\n\n` +
    `Let us know your current requirements or reach us directly at +91 94797 97947.\n\n` +
    `Warm regards,\n` +
    `Tejo Bharat Global Energy LLP\n` +
    `https://www.tejobharat.com/`
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

export function getStageBadgeClass(stage: PipelineStage): string {
  switch (stage) {
    case 'NEW':
      return 'bg-slate-100 text-slate-700 border-slate-300';
    case 'CONTACTED':
      return 'bg-blue-50 text-blue-700 border-blue-300';
    case 'INTERESTED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-400 font-semibold';
    case 'QUOTE_SENT':
      return 'bg-amber-50 text-amber-800 border-amber-300';
    case 'FOLLOW_UP':
      return 'bg-purple-50 text-purple-700 border-purple-300';
    case 'NEGOTIATION':
      return 'bg-indigo-50 text-indigo-700 border-indigo-300';
    case 'WON':
      return 'bg-emerald-600 text-white border-emerald-700 font-bold';
    case 'LOST':
      return 'bg-rose-50 text-rose-700 border-rose-300';
    case 'DO_NOT_CALL':
      return 'bg-gray-200 text-gray-500 border-gray-300';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-300';
  }
}

export function getStageLabel(stage: PipelineStage): string {
  switch (stage) {
    case 'NEW': return 'New Lead';
    case 'CONTACTED': return 'Contacted';
    case 'INTERESTED': return 'Interested 🔥';
    case 'QUOTE_SENT': return 'Quote Sent';
    case 'FOLLOW_UP': return 'Follow-up';
    case 'NEGOTIATION': return 'Negotiation';
    case 'WON': return 'Deals Won 🎉';
    case 'LOST': return 'Lost / Closed';
    case 'DO_NOT_CALL': return 'Do Not Call';
    default: return stage;
  }
}

export function getCallOutcomeBadge(outcome?: CallOutcome | string | null): { text: string; className: string } {
  switch (outcome) {
    case 'ANSWERED':
      return { text: 'Answered', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    case 'BUSY':
      return { text: 'Line Busy', className: 'bg-amber-100 text-amber-800 border-amber-300' };
    case 'NO_ANSWER':
      return { text: 'No Answer', className: 'bg-orange-100 text-orange-800 border-orange-300' };
    case 'SWITCHED_OFF':
      return { text: 'Switched Off', className: 'bg-rose-100 text-rose-800 border-rose-300' };
    case 'CALLBACK_REQUESTED':
      return { text: 'Callback Requested', className: 'bg-blue-100 text-blue-800 border-blue-300' };
    case 'WRONG_NUMBER':
      return { text: 'Wrong Number', className: 'bg-gray-100 text-gray-600 border-gray-300' };
    default:
      return { text: 'Not Called', className: 'bg-slate-100 text-slate-600 border-slate-200' };
  }
}
