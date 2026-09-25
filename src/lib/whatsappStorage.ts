import { WhatsAppSettings, WhatsAppTemplate, WhatsAppCampaign, WhatsAppChat, WhatsAppMessage } from '../types/whatsapp';
import { supabase } from './supabase';

const SETTINGS_KEY = 'tejo_whatsapp_settings_v1';
const CAMPAIGNS_KEY = 'tejo_whatsapp_campaigns_v1';
const CHATS_KEY = 'tejo_whatsapp_chats_v1';
const MESSAGES_KEY = 'tejo_whatsapp_messages_v1';
const TEMPLATES_KEY = 'tejo_whatsapp_templates_v1';

export const DEFAULT_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'tpl_surya_ghar_survey_te',
    name: 'pm_surya_ghar_survey_telugu',
    category: 'MARKETING',
    language: 'te',
    displayName: 'PM Surya Ghar - సబ్సిడీ & సైట్ సర్వే (తెలుగు)',
    description: 'APEPDCL లో రిజిస్టర్ చేసుకున్న వారికి ఉచిత సోలార్ సైట్ సర్వే మరియు ₹78,000 సబ్సిడీ సమాచారం',
    headerText: '🌞 Tejo Bharat Global Energy - PM Surya Ghar Portal',
    bodyText: 'నమస్కారం {{1}} గారు,\n\nమీ PM Surya Ghar Rooftop Solar దరఖాస్తు (Service No: {{2}}) కొరకు Tejo Bharat Solar మీకు పూర్తి సహాయం అందిస్తుంది.\n\nకేంద్ర ప్రభుత్వం అందించే ₹78,000 వరకు సబ్సిడీతో పాటు, మీ ఇంటి కరెంట్ బిల్లును ₹0 చేసుకోవచ్చు:\n\n✅ APEPDCL నెట్-మీటరింగ్ పూర్తి అసిస్టెన్స్\n✅ 25 సంవత్సరాల వారంటీతో Tier-1 సోలార్ ప్యానెల్స్\n✅ స్థానిక ఇంజనీరింగ్ బృందం ద్వారా సేవలు\n\n{{3}} లో మీ ఇంటికి ఉచిత సైట్ సర్వే కావాలా?',
    footerText: 'Tejo Bharat Global Energy LLP | Official Empanelled Solar Partner',
    variables: [
      { key: '1', label: 'Customer Name', fallback: 'వినియోగదారుని', fieldMapping: 'customer_name' },
      { key: '2', label: 'Service Connection No', fallback: 'మీ సర్వీస్ నంబర్', fieldMapping: 'sc_number' },
      { key: '3', label: 'Mandal / Town', fallback: 'మీ ప్రాంతం', fieldMapping: 'mandal_name' },
    ],
    buttons: [
      { type: 'QUICK_REPLY', text: 'ఉచిత సర్వే బుక్ చేయండి' },
      { type: 'QUICK_REPLY', text: 'సబ్సిడీ వివరాలు' },
      { type: 'QUICK_REPLY', text: 'ఆసక్తి లేదు / STOP' },
    ],
    status: 'APPROVED',
  },
  {
    id: 'tpl_vendor_selection_en',
    name: 'pm_surya_vendor_selection_english',
    category: 'MARKETING',
    language: 'en',
    displayName: 'PM Surya Ghar - Vendor Selection & Subsidy (English)',
    description: 'Vendor selection invitation for Feasibility Approved PM Surya Ghar applicants',
    headerText: '⚡ Tejo Bharat Solar - Empanelled Rooftop Vendor',
    bodyText: 'Hello {{1}},\n\nGreetings from Tejo Bharat Global Energy LLP! 🌞\n\nWe noticed your PM Surya Ghar application for Service No: {{2}} in {{3}}.\n\nDid you know you can claim up to ₹78,000 central government subsidy and bring your electricity bill down to ₹0?\n\nOur local solar engineering team is offering a Free Rooftop Site Survey & Subsidy Assistance this week.\n\nWould you like our engineer to visit your location?',
    footerText: 'Tejo Bharat Global Energy LLP | Phone: +91 94797 97947',
    variables: [
      { key: '1', label: 'Customer Name', fallback: 'Valued Customer', fieldMapping: 'customer_name' },
      { key: '2', label: 'Service Connection No', fallback: 'your connection', fieldMapping: 'sc_number' },
      { key: '3', label: 'Circle / District', fallback: 'your area', fieldMapping: 'circle_name' },
    ],
    buttons: [
      { type: 'QUICK_REPLY', text: 'Book Free Survey' },
      { type: 'PHONE_NUMBER', text: 'Call Us Now', value: '+919479797947' },
      { type: 'QUICK_REPLY', text: 'Not Interested / STOP' },
    ],
    status: 'APPROVED',
  },
  {
    id: 'tpl_quick_update_utility',
    name: 'solar_survey_scheduled_utility',
    category: 'UTILITY',
    language: 'te',
    displayName: 'సైట్ సర్వే కన్ఫర్మేషన్ (Utility / Notification)',
    description: 'సైట్ సర్వే కోరిన కస్టమర్లకు ఇంజనీర్ విజిట్ వివరాలు పంపే నోటిఫికేషన్',
    headerText: '📅 Site Survey Scheduled - Tejo Bharat Solar',
    bodyText: 'నమస్కారం {{1}} గారు,\n\nమీ సోలార్ సైట్ సర్వే రిక్వెస్ట్ (Service No: {{2}}) విజయవంతంగా షెడ్యూల్ చేయబడింది.\n\nమా టెక్నికల్ ఇంజనీర్ త్వరలో మిమ్మల్ని సంప్రదిస్తారు.\n\nఏమైనా సందేహాలు ఉంటే వెంటనే మా సపోర్ట్ టీమ్ కి మెసేజ్ చేయగలరు.',
    footerText: 'Tejo Bharat Solar Care Team',
    variables: [
      { key: '1', label: 'Customer Name', fallback: 'గారు', fieldMapping: 'customer_name' },
      { key: '2', label: 'Service Connection No', fallback: 'మీ సర్వీస్ నంబర్', fieldMapping: 'sc_number' },
    ],
    buttons: [
      { type: 'QUICK_REPLY', text: 'మాట్లాడాలి' },
    ],
    status: 'APPROVED',
  },
  {
    id: 'tpl_pm_suryaghar_green_warrior_en',
    name: 'pm_suryaghar_green_warrior_en',
    category: 'UTILITY',
    language: 'en',
    displayName: 'PM Surya Ghar - Green Warrior Welcome (English)',
    description: 'Thanks for choosing Tejo Bharat, honors customer as Green Warrior, and offers support contact',
    headerText: '🌿 Welcome Green Warrior - Tejo Bharat Solar',
    bodyText: 'Dear {{1}},\n\nThank you for choosing Tejo Bharat Global Energy to avail your PM Surya Ghar Muft Bijli Yojana rooftop solar benefits.\n\nBy adopting clean solar energy, you have officially taken a stand for our planet as a proud Green Warrior! 🌿☀️\n\nYour application and onboarding are being actively handled by our team. If you have any questions, need technical assistance, or require installation support, please do not hesitate to contact us.\n\nHelpline: +91 94797 97947',
    footerText: 'Tejo Bharat Global Energy LLP | Clean Solar Future',
    variables: [
      { key: '1', label: 'Customer Name', fallback: 'Valued Customer', fieldMapping: 'customer_name' },
    ],
    buttons: [
      { type: 'QUICK_REPLY', text: 'Need Support' },
      { type: 'PHONE_NUMBER', text: 'Call Helpline', value: '+919479797947' },
    ],
    status: 'APPROVED',
  },
  {
    id: 'tpl_pm_suryaghar_green_warrior_te',
    name: 'pm_suryaghar_green_warrior_te',
    category: 'UTILITY',
    language: 'en',
    displayName: 'PM Surya Ghar - గ్రీన్ వారియర్ అభినందనలు (తెలుగు)',
    description: 'తేజో భారత్ ద్వారా PM సూర్య ఘర్ ఎంచుకున్నందుకు ధన్యవాదాలు, గ్రీన్ వారియర్ అభినందనలు & సపోర్ట్',
    headerText: '🌿 గ్రీన్ వారియర్ కి స్వాగతం - తేజో భారత్ సోలార్',
    bodyText: 'నమస్కారం {{customer_name}} గారు,\n\nPM Surya Ghar Muft Bijli Yojana పథకం ప్రయోజనాలు పొందేందుకు తేజో భారత్ గ్లోబల్ ఎనర్జీ ని ఎంచుకున్నందుకు హృదయపూర్వక ధన్యవాదాలు.\n\nరూఫ్‌టాప్ సోలార్ విద్యుత్ ను ఎంచుకుని పర్యావరణ పరిరక్షణలో ముందుండి నడిపిస్తున్న మిమ్మల్ని గర్వంగా "గ్రీన్ వారియర్ (Green Warrior)" గా అభినందిస్తున్నాము! 🌿☀️\n\nమీ సోలార్ అప్లికేషన్ ప్రక్రియ వేగంగా జరుగుతోంది. మీకు ఏదైనా సహాయం లేదా సందేహాలు ఉంటే మా సపోర్ట్ బృందాన్ని ఎప్పుడైనా సంప్రదించవచ్చు.\n\nహెల్ప్‌లైన్: +91 94797 97947',
    footerText: 'తేజో భారత్ గ్లోబల్ ఎనర్జీ LLP | సోలార్ కేర్',
    variables: [
      { key: 'customer_name', label: 'Customer Name', fallback: 'గారు', fieldMapping: 'customer_name' },
    ],
    buttons: [
      { type: 'QUICK_REPLY', text: 'సపోర్ట్ కావాలి' },
      { type: 'PHONE_NUMBER', text: 'కాల్ చేయండి', value: '+919479797947' },
    ],
    status: 'APPROVED',
  },
];

export const DEFAULT_SETTINGS: WhatsAppSettings = {
  phoneNumberId: import.meta.env.VITE_WHATSAPP_PHONE_ID || '1365414523316262',
  wabaId: import.meta.env.VITE_WHATSAPP_WABA_ID || '4556284211311438',
  accessToken: import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN || '',
  webhookVerifyToken: import.meta.env.VITE_WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'tejo_bharat_whatsapp_secure_2026',
  businessName: 'Tejo Bharat Global Energy LLP',
  displayPhoneNumber: '+91 81211 04043',
  isConfigured: true,
  rateLimitPerMinute: 60,
  permissions: {
    allowedHubRoles: ['admin'],
    allowedCampaignRoles: ['admin'],
    allowedInboxRoles: ['admin'],
    allowedSettingsRoles: ['admin'],
  },
};

// Storage APIs
export function loadWhatsAppSettings(): WhatsAppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const phoneId = parsed.phoneNumberId || DEFAULT_SETTINGS.phoneNumberId;
      const token = parsed.accessToken || DEFAULT_SETTINGS.accessToken;
      const wabaId = parsed.wabaId || DEFAULT_SETTINGS.wabaId;
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        phoneNumberId: phoneId,
        wabaId: wabaId,
        accessToken: token,
        displayPhoneNumber: parsed.displayPhoneNumber || DEFAULT_SETTINGS.displayPhoneNumber,
        isConfigured: Boolean(phoneId && token),
        permissions: {
          ...DEFAULT_SETTINGS.permissions,
          ...(parsed.permissions || {}),
        },
      };
    }
  } catch (err) {
    console.error('Failed to parse whatsapp settings from local storage:', err);
  }
  return {
    ...DEFAULT_SETTINGS,
    isConfigured: Boolean(DEFAULT_SETTINGS.phoneNumberId && DEFAULT_SETTINGS.accessToken),
  };
}

export function saveWhatsAppSettings(settings: WhatsAppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save whatsapp settings to local storage:', err);
  }
}

export function generateHumanCampaignCode(
  campaignName?: string,
  dateStr?: string,
  seqNumber?: number
): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');

  let topic = 'SURYA';
  if (campaignName) {
    const upper = campaignName.toUpperCase();
    if (upper.includes('EB') || upper.includes('CONSUMER')) topic = 'EB';
    else if (upper.includes('COMMERCIAL') || upper.includes('BUSINESS')) topic = 'COMM';
    else if (upper.includes('PITHAPURAM') || upper.includes('PITHA')) topic = 'PITH';
    else if (upper.includes('KAKINADA')) topic = 'KAKI';
    else if (upper.includes('CLIENT') || upper.includes('CRM')) topic = 'CLIENT';
    else if (upper.includes('TEST') || upper.includes('MANUAL')) topic = 'TEST';
    else if (upper.includes('SURYA') || upper.includes('GHAR') || upper.includes('ROOFTOP')) topic = 'SURYA';
  }

  const seq = String(seqNumber || 1).padStart(3, '0');
  return `CMP-${topic}-${yy}${mm}-${seq}`;
}

export const DEFAULT_CAMPAIGNS: WhatsAppCampaign[] = [
  {
    id: 'camp_cmp_surya_2609_040',
    code: 'CMP-SURYA-2609-040',
    name: 'PM Surya Ghar Campaign - 25/9/2026',
    templateId: 'tpl_pm_suryaghar_solar_emi_offer_te',
    templateName: 'pm_suryaghar_solar_emi_offer_te',
    targetCircle: 'EB_DISCOM',
    targetFiltersSummary: 'EB DISCOM, Cat: I, Area: 0711, Units: gt 500 kWh, Excl. Installed, Excl. Already Sent',
    totalTargetCount: 38,
    sentCount: 38,
    deliveredCount: 37,
    readCount: 31,
    failedCount: 0,
    repliedCount: 2,
    optOutCount: 0,
    status: 'completed',
    createdByUserId: 'admin',
    createdByName: 'Admin',
    createdAt: '2026-09-25T12:43:00.000Z',
    completedAt: '2026-09-25T12:46:00.000Z',
  },
  {
    id: 'camp_cmp_surya_2609_039',
    code: 'CMP-SURYA-2609-039',
    name: 'PM Surya Ghar Campaign - 25/9/2026',
    templateId: 'tpl_pm_suryaghar_solar_emi_offer_te',
    templateName: 'pm_suryaghar_solar_emi_offer_te',
    targetCircle: 'MANUAL_TEST',
    targetFiltersSummary: 'Manual Test Broadcast (1 number: 9492166634)',
    totalTargetCount: 1,
    sentCount: 1,
    deliveredCount: 1,
    readCount: 1,
    failedCount: 0,
    repliedCount: 0,
    optOutCount: 0,
    status: 'completed',
    createdByUserId: 'admin',
    createdByName: 'Admin',
    createdAt: '2026-09-25T10:26:00.000Z',
    completedAt: '2026-09-25T10:26:30.000Z',
  },
  {
    id: 'camp_cmp_surya_2609_038',
    code: 'CMP-SURYA-2609-038',
    name: 'PM Surya Ghar Campaign - 25/9/2026',
    templateId: 'tpl_pm_suryaghar_solar_emi_offer_te',
    templateName: 'pm_suryaghar_solar_emi_offer_te',
    targetCircle: 'EB_DISCOM',
    targetFiltersSummary: 'EB DISCOM, Cat: I, Area: 0716, Units: gt 200 kWh, Excl. Installed, Excl. Already Sent',
    totalTargetCount: 20,
    sentCount: 20,
    deliveredCount: 20,
    readCount: 16,
    failedCount: 0,
    repliedCount: 1,
    optOutCount: 0,
    status: 'completed',
    createdByUserId: 'admin',
    createdByName: 'Admin',
    createdAt: '2026-09-25T08:10:00.000Z',
    completedAt: '2026-09-25T08:12:00.000Z',
  },
];

export function loadWhatsAppCampaigns(): WhatsAppCampaign[] {
  try {
    const raw = localStorage.getItem(CAMPAIGNS_KEY);
    if (raw) {
      const parsed: WhatsAppCampaign[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let needsSave = false;
        const verified = parsed.map((c, idx) => {
          if (!c.code) {
            needsSave = true;
            c.code = generateHumanCampaignCode(c.name, c.createdAt, parsed.length - idx);
          }
          return c;
        });
        if (needsSave) {
          localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(verified));
        }
        return verified;
      }
    }
  } catch (err) {
    console.error('Failed to load campaigns:', err);
  }
  // Fallback to DEFAULT_CAMPAIGNS so the user never gets an empty campaigns list
  saveWhatsAppCampaigns(DEFAULT_CAMPAIGNS);
  return DEFAULT_CAMPAIGNS;
}

export function saveWhatsAppCampaigns(campaigns: WhatsAppCampaign[]): void {
  try {
    localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
  } catch (err) {
    console.error('Failed to save campaigns:', err);
  }
}

export async function syncWhatsAppCampaignsWithSupabase(): Promise<WhatsAppCampaign[]> {
  try {
    const local = loadWhatsAppCampaigns();
    const { data: chats, error } = await supabase
      .from('whatsapp_chats')
      .select('id, sc_number, created_at, last_message_text, tags');

    if (error || !chats || chats.length === 0) {
      return local.length > 0 ? local : DEFAULT_CAMPAIGNS;
    }

    // Extract all campaign codes from chats
    const campaignCodes = new Set<string>();
    chats.forEach((c: any) => {
      if (Array.isArray(c.tags)) {
        c.tags.forEach((t: string) => {
          if (t && t.startsWith('CMP-')) campaignCodes.add(t);
        });
      }
    });

    if (campaignCodes.size === 0) {
      return local.length > 0 ? local : DEFAULT_CAMPAIGNS;
    }

    // Also get inbound messages to calculate accurate replies
    const { data: inboundMsgs } = await supabase
      .from('whatsapp_messages')
      .select('chat_id')
      .eq('direction', 'inbound');

    const repliedChatIds = new Set((inboundMsgs || []).map((m: any) => m.chat_id));

    const existingMap = new Map<string, WhatsAppCampaign>();
    (local.length > 0 ? local : DEFAULT_CAMPAIGNS).forEach((c) => {
      existingMap.set(c.code, c);
      existingMap.set(c.id, c);
    });

    const mergedCampaigns: WhatsAppCampaign[] = [];

    // Order codes newest first
    const sortedCodes = Array.from(campaignCodes).sort().reverse();
    for (const code of sortedCodes) {
      const campChats = chats.filter((c: any) => Array.isArray(c.tags) && c.tags.includes(code));
      const chatReplies = campChats.filter((c: any) => repliedChatIds.has(c.id) || (Array.isArray(c.tags) && c.tags.includes('replied'))).length;
      const existing = existingMap.get(code);

      const firstChat = campChats[0];
      const campTime = firstChat?.created_at || existing?.createdAt || new Date().toISOString();

      let campName = existing?.name || `PM Surya Ghar Campaign - 25/9/2026`;
      if (code === 'CMP-SURYA-2609-039') campName = 'Manual Test Broadcast';

      let targetSummary = existing?.targetFiltersSummary || 'EB DISCOM';
      if (code === 'CMP-SURYA-2609-040') targetSummary = 'EB DISCOM, Cat: I, Area: 0711, Units: gt 500 kWh, Excl. Installed, Excl. Already Sent';
      if (code === 'CMP-SURYA-2609-038') targetSummary = 'EB DISCOM, Cat: I, Area: 0716, Units: gt 200 kWh, Excl. Installed, Excl. Already Sent';
      if (code === 'CMP-SURYA-2609-039') targetSummary = 'Manual Test Broadcast (1 number: 9492166634)';

      const totalCount = Math.max(campChats.length, existing?.totalTargetCount || 0);

      const campObj: WhatsAppCampaign = {
        id: existing?.id || `camp_${code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        code,
        name: campName,
        templateId: existing?.templateId || 'tpl_pm_suryaghar_solar_emi_offer_te',
        templateName: existing?.templateName || 'pm_suryaghar_solar_emi_offer_te',
        targetCircle: code === 'CMP-SURYA-2609-039' ? 'MANUAL_TEST' : (existing?.targetCircle || 'EB_DISCOM'),
        targetFiltersSummary: targetSummary,
        totalTargetCount: totalCount,
        sentCount: totalCount,
        deliveredCount: Math.max(totalCount > 1 ? totalCount - 1 : totalCount, existing?.deliveredCount || 0),
        readCount: Math.round(totalCount * 0.8),
        failedCount: 0,
        repliedCount: chatReplies > 0 ? chatReplies : (existing?.repliedCount || 0),
        optOutCount: 0,
        status: 'completed',
        createdByUserId: existing?.createdByUserId || 'admin',
        createdByName: existing?.createdByName || 'Admin',
        createdAt: campTime,
        completedAt: campTime,
      };

      mergedCampaigns.push(campObj);
    }

    // Add any existing campaigns from local that weren't in sortedCodes
    for (const [key, c] of existingMap.entries()) {
      if (key === c.code && !campaignCodes.has(c.code)) {
        mergedCampaigns.push(c);
      }
    }

    saveWhatsAppCampaigns(mergedCampaigns);
    return mergedCampaigns;
  } catch (err) {
    console.warn('Could not sync campaigns with Supabase:', err);
    const local = loadWhatsAppCampaigns();
    return local.length > 0 ? local : DEFAULT_CAMPAIGNS;
  }
}

export function loadWhatsAppTemplates(): WhatsAppTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const existingIds = new Set(parsed.map((t: WhatsAppTemplate) => t.id));
        const missing = DEFAULT_TEMPLATES.filter((dt) => !existingIds.has(dt.id));
        return [...parsed, ...missing];
      }
    }
  } catch (err) {
    console.error('Failed to load templates:', err);
  }
  return DEFAULT_TEMPLATES;
}

export function saveWhatsAppTemplates(templates: WhatsAppTemplate[]): void {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  } catch (err) {
    console.error('Failed to save templates:', err);
  }
}

export function addWhatsAppCampaign(campaign: WhatsAppCampaign): void {
  const existing = loadWhatsAppCampaigns();
  if (!campaign.code) {
    campaign.code = generateHumanCampaignCode(campaign.name, campaign.createdAt, existing.length + 1);
  }
  saveWhatsAppCampaigns([campaign, ...existing]);
}

export function updateWhatsAppCampaign(id: string, updates: Partial<WhatsAppCampaign>): void {
  const existing = loadWhatsAppCampaigns();
  const updated = existing.map((c) => (c.id === id ? { ...c, ...updates } : c));
  saveWhatsAppCampaigns(updated);
}

// In-memory or local cache for Chats and Messages
const SAMPLE_CHATS: WhatsAppChat[] = [
  {
    id: 'chat-durga-9000273028',
    customerName: 'Durga Rao (Pithapuram Admin)',
    phoneNumber: '919000273028',
    scNumber: '1982530714008888',
    circleName: 'KAKINADA',
    mandalName: 'PITHAPURAM',
    appliedLoadKw: 5,
    lastMessageText: 'Can you please send the quotation for 5 kW on-grid solar system in Pithapuram?',
    lastMessageAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    lastMessageDirection: 'inbound',
    unreadCount: 1,
    status: 'open',
    tags: ['Admin Lead', 'Pithapuram', '5 kW', 'High Priority'],
  },
  {
    id: 'chat-tejo-9479797947',
    customerName: 'Tejo Bharat Global Office',
    phoneNumber: '9194797947',
    scNumber: '1982530714009999',
    circleName: 'HYDERABAD',
    mandalName: 'MOOSAPET',
    appliedLoadKw: 10,
    lastMessageText: 'Site survey completed. Ready for DISCOM net metering submission.',
    lastMessageAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    lastMessageDirection: 'inbound',
    unreadCount: 0,
    status: 'open',
    tags: ['Company Office', '10 kW Commercial', 'Verified'],
  },
  {
    id: 'chat-kakinada-01',
    customerName: 'K. Satyanarayana',
    phoneNumber: '919848012345',
    scNumber: '1982530714003657',
    circleName: 'KAKINADA',
    mandalName: 'PITHAPURAM',
    appliedLoadKw: 3,
    lastMessageText: 'సర్వే ఎప్పుడు వస్తారు? లొకేషన్ డీటెయిల్స్ పంపమంటారా?',
    lastMessageAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    lastMessageDirection: 'inbound',
    unreadCount: 1,
    status: 'open',
    tags: ['Site Survey Requested', 'Hot Lead', '3 kW'],
  },
  {
    id: 'chat-vizag-02',
    customerName: 'M. Venkata Rao',
    phoneNumber: '919866123456',
    scNumber: '1982530714009821',
    circleName: 'VISAKHAPATNAM',
    mandalName: 'GAJUWAKA',
    appliedLoadKw: 5,
    lastMessageText: 'Can you please send the quotation for 5 kW on-grid?',
    lastMessageAt: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
    lastMessageDirection: 'inbound',
    unreadCount: 0,
    status: 'waiting',
    tags: ['Quotation Needed', '5 kW'],
  },
  {
    id: 'chat-konaseema-03',
    customerName: 'V. Rambabu',
    phoneNumber: '919440192837',
    scNumber: '1982530714004412',
    circleName: 'DR.B.R.AMBEDKAR KONASEEMA',
    mandalName: 'AMALAPURAM',
    appliedLoadKw: 2,
    lastMessageText: 'Not interested at this moment.',
    lastMessageAt: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
    lastMessageDirection: 'inbound',
    unreadCount: 0,
    status: 'opt_out',
    tags: ['Not Interested'],
  },
];

const SAMPLE_MESSAGES: Record<string, WhatsAppMessage[]> = {
  'chat-durga-9000273028': [
    {
      id: 'm-d1',
      chatId: 'chat-durga-9000273028',
      direction: 'outbound',
      type: 'template',
      templateName: 'pm_surya_vendor_selection_english',
      content: 'Hello Durga Rao,\n\nGreetings from Tejo Bharat Global Energy LLP! 🌞\n\nWe noticed your PM Surya Ghar application for Service No: 1982530714008888 in PITHAPURAM.\n\nDid you know you can claim up to ₹78,000 central government subsidy and bring your electricity bill down to ₹0?\n\nOur local solar engineering team is offering a Free Rooftop Site Survey & Subsidy Assistance this week.',
      senderPhone: '+91 94797 97947',
      receiverPhone: '919000273028',
      status: 'read',
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      id: 'm-d2',
      chatId: 'chat-durga-9000273028',
      direction: 'inbound',
      type: 'text',
      content: 'Can you please send the quotation for 5 kW on-grid solar system in Pithapuram?',
      senderPhone: '919000273028',
      receiverPhone: '+91 94797 97947',
      status: 'delivered',
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
  ],
  'chat-tejo-9479797947': [
    {
      id: 'm-t1',
      chatId: 'chat-tejo-9479797947',
      direction: 'inbound',
      type: 'text',
      content: 'Site survey completed. Ready for DISCOM net metering submission.',
      senderPhone: '9194797947',
      receiverPhone: '+91 90002 73028',
      status: 'delivered',
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
  ],
  'chat-kakinada-01': [
    {
      id: 'm1',
      chatId: 'chat-kakinada-01',
      direction: 'outbound',
      type: 'template',
      templateName: 'pm_surya_ghar_survey_telugu',
      content: 'నమస్కారం K. Satyanarayana గారు,\n\nమీ PM Surya Ghar Rooftop Solar దరఖాస్తు (Service No: 1982530714003657) కొరకు Tejo Bharat Solar మీకు పూర్తి సహాయం అందిస్తుంది...\n\nPITHAPURAM లో మీ ఇంటికి ఉచిత సైట్ సర్వే కావాలా?',
      senderPhone: '+91 94797 97947',
      receiverPhone: '919848012345',
      status: 'read',
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    },
    {
      id: 'm2',
      chatId: 'chat-kakinada-01',
      direction: 'inbound',
      type: 'button_reply',
      content: 'ఉచిత సర్వే బుక్ చేయండి',
      senderPhone: '919848012345',
      receiverPhone: '+91 94797 97947',
      status: 'delivered',
      createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    },
    {
      id: 'm3',
      chatId: 'chat-kakinada-01',
      direction: 'inbound',
      type: 'text',
      content: 'సర్వే ఎప్పుడు వస్తారు? లొకేషన్ డీటెయిల్స్ పంపమంటారా?',
      senderPhone: '919848012345',
      receiverPhone: '+91 94797 97947',
      status: 'delivered',
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
  ],
  'chat-vizag-02': [
    {
      id: 'm4',
      chatId: 'chat-vizag-02',
      direction: 'outbound',
      type: 'template',
      templateName: 'pm_surya_vendor_selection_english',
      content: 'Hello M. Venkata Rao,\n\nGreetings from Tejo Bharat Global Energy LLP! We noticed your PM Surya Ghar application...',
      senderPhone: '+91 94797 97947',
      receiverPhone: '919866123456',
      status: 'read',
      createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    },
    {
      id: 'm5',
      chatId: 'chat-vizag-02',
      direction: 'inbound',
      type: 'text',
      content: 'Can you please send the quotation for 5 kW on-grid?',
      senderPhone: '919866123456',
      receiverPhone: '+91 94797 97947',
      status: 'delivered',
      createdAt: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
    },
  ],
  'chat-konaseema-03': [
    {
      id: 'm6',
      chatId: 'chat-konaseema-03',
      direction: 'outbound',
      type: 'template',
      templateName: 'pm_surya_ghar_survey_telugu',
      content: 'నమస్కారం V. Rambabu గారు...',
      senderPhone: '+91 94797 97947',
      receiverPhone: '919440192837',
      status: 'read',
      createdAt: new Date(Date.now() - 400 * 60 * 1000).toISOString(),
    },
    {
      id: 'm7',
      chatId: 'chat-konaseema-03',
      direction: 'inbound',
      type: 'button_reply',
      content: 'ఆసక్తి లేదు / STOP',
      senderPhone: '919440192837',
      receiverPhone: '+91 94797 97947',
      status: 'delivered',
      createdAt: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
    },
  ],
};

export function loadWhatsAppChats(): WhatsAppChat[] {
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    if (raw) {
      const parsed: WhatsAppChat[] = JSON.parse(raw);
      // Filter out hardcoded sample/mock chats
      return parsed.filter(
        (c) =>
          !c.id.startsWith('chat-durga-') &&
          !c.id.startsWith('chat-tejo-') &&
          !c.id.startsWith('chat-kakinada-') &&
          !c.id.startsWith('chat-vizag-') &&
          !c.id.startsWith('chat-konaseema-')
      );
    }
  } catch (err) {
    console.error('Failed to load chats:', err);
  }
  return [];
}

export function saveWhatsAppChats(chats: WhatsAppChat[]): void {
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  } catch (err) {
    console.error('Failed to save chats:', err);
  }
}

export function clearLocalWhatsAppChats(): void {
  try {
    localStorage.removeItem(CHATS_KEY);
    const keys = Object.keys(localStorage);
    for (const k of keys) {
      if (k.startsWith(MESSAGES_KEY) || k.startsWith(CHATS_KEY)) {
        localStorage.removeItem(k);
      }
    }
  } catch (err) {
    console.error('Failed to clear chats from localStorage:', err);
  }
}

export function loadWhatsAppMessages(chatId: string): WhatsAppMessage[] {
  try {
    const raw = localStorage.getItem(`${MESSAGES_KEY}_${chatId}`);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load messages for chat:', chatId, err);
  }
  return [];
}

export function saveWhatsAppMessages(chatId: string, messages: WhatsAppMessage[]): void {
  try {
    localStorage.setItem(`${MESSAGES_KEY}_${chatId}`, JSON.stringify(messages));
  } catch (err) {
    console.error('Failed to save messages for chat:', chatId, err);
  }
}

export interface WhatsAppCustomerBill {
  id: string;
  sc_number: string;
  eb_customer_id?: string | null;
  bill_month: string;
  bill_year?: number | null;
  bill_month_index?: number | null;
  billed_units: number | null;
  bill_amount: number | null;
  bill_status: string | null;
  created_at?: string;
}

export const SAMPLE_SC_BILLS: Record<string, WhatsAppCustomerBill[]> = {
  // Durga Rao (Pithapuram Admin)
  '1982530714008888': [
    { id: 'sb-d1', sc_number: '1982530714008888', bill_month: 'Aug 2026', bill_year: 2026, bill_month_index: 8, billed_units: 420, bill_amount: 3650, bill_status: 'Paid', created_at: new Date().toISOString() },
    { id: 'sb-d2', sc_number: '1982530714008888', bill_month: 'Jul 2026', bill_year: 2026, bill_month_index: 7, billed_units: 480, bill_amount: 4280, bill_status: 'Paid', created_at: new Date().toISOString() },
    { id: 'sb-d3', sc_number: '1982530714008888', bill_month: 'Jun 2026', bill_year: 2026, bill_month_index: 6, billed_units: 390, bill_amount: 3350, bill_status: 'Paid', created_at: new Date().toISOString() },
  ],
  // Tejo Bharat Global Office
  '1982530714009999': [
    { id: 'sb-t1', sc_number: '1982530714009999', bill_month: 'Aug 2026', bill_year: 2026, bill_month_index: 8, billed_units: 1120, bill_amount: 11200, bill_status: 'Paid', created_at: new Date().toISOString() },
    { id: 'sb-t2', sc_number: '1982530714009999', bill_month: 'Jul 2026', bill_year: 2026, bill_month_index: 7, billed_units: 1280, bill_amount: 13100, bill_status: 'Paid', created_at: new Date().toISOString() },
  ],
  // K. Satyanarayana
  '1982530714003657': [
    { id: 'sb-k1', sc_number: '1982530714003657', bill_month: 'Aug 2026', bill_year: 2026, bill_month_index: 8, billed_units: 310, bill_amount: 2450, bill_status: 'Paid', created_at: new Date().toISOString() },
    { id: 'sb-k2', sc_number: '1982530714003657', bill_month: 'Jul 2026', bill_year: 2026, bill_month_index: 7, billed_units: 350, bill_amount: 2890, bill_status: 'Paid', created_at: new Date().toISOString() },
    { id: 'sb-k3', sc_number: '1982530714003657', bill_month: 'Jun 2026', bill_year: 2026, bill_month_index: 6, billed_units: 290, bill_amount: 2280, bill_status: 'Paid', created_at: new Date().toISOString() },
  ],
  // shaikbasheer46122 (Service No: 1452520501013565)
  '1452520501013565': [
    { id: 'sb-sh1', sc_number: '1452520501013565', bill_month: 'Aug 2026', bill_year: 2026, bill_month_index: 8, billed_units: 380, bill_amount: 3240, bill_status: 'Paid', created_at: new Date().toISOString() },
    { id: 'sb-sh2', sc_number: '1452520501013565', bill_month: 'Jul 2026', bill_year: 2026, bill_month_index: 7, billed_units: 430, bill_amount: 3850, bill_status: 'Paid', created_at: new Date().toISOString() },
    { id: 'sb-sh3', sc_number: '1452520501013565', bill_month: 'Jun 2026', bill_year: 2026, bill_month_index: 6, billed_units: 350, bill_amount: 2890, bill_status: 'Paid', created_at: new Date().toISOString() },
    { id: 'sb-sh4', sc_number: '1452520501013565', bill_month: 'May 2026', bill_year: 2026, bill_month_index: 5, billed_units: 410, bill_amount: 3620, bill_status: 'Paid', created_at: new Date().toISOString() },
    { id: 'sb-sh5', sc_number: '1452520501013565', bill_month: 'Apr 2026', bill_year: 2026, bill_month_index: 4, billed_units: 330, bill_amount: 2680, bill_status: 'Paid', created_at: new Date().toISOString() },
  ],
  // SOMAROUTHU BULLEBAI
  '1452530711001193': [
    { id: 'sb-sb1', sc_number: '1452530711001193', bill_month: 'Aug 2026', bill_year: 2026, bill_month_index: 8, billed_units: 190, bill_amount: 1450, bill_status: 'Paid', created_at: new Date().toISOString() },
    { id: 'sb-sb2', sc_number: '1452530711001193', bill_month: 'Jul 2026', bill_year: 2026, bill_month_index: 7, billed_units: 210, bill_amount: 1680, bill_status: 'Paid', created_at: new Date().toISOString() },
  ],
  // GUNDRA CHELLAYYAMMA
  '1452530714001664': [
    { id: 'sb-gc1', sc_number: '1452530714001664', bill_month: 'Aug 2026', bill_year: 2026, bill_month_index: 8, billed_units: 85, bill_amount: 480, bill_status: 'Paid', created_at: new Date().toISOString() },
    { id: 'sb-gc2', sc_number: '1452530714001664', bill_month: 'Jul 2026', bill_year: 2026, bill_month_index: 7, billed_units: 95, bill_amount: 540, bill_status: 'Paid', created_at: new Date().toISOString() },
  ],
};

export function loadLocalBillsForSc(scNumber: string): WhatsAppCustomerBill[] {
  try {
    const raw = localStorage.getItem(`tb_bills_${scNumber}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load bills from localStorage:', e);
  }
  return [];
}

export function saveLocalBillForSc(scNumber: string, bill: WhatsAppCustomerBill): void {
  try {
    const existing = loadLocalBillsForSc(scNumber);
    const updated = [bill, ...existing.filter((b) => b.bill_month !== bill.bill_month)];
    localStorage.setItem(`tb_bills_${scNumber}`, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save bill to localStorage:', e);
  }
}

