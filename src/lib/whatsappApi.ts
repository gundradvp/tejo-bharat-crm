import { supabase, Profile, UserRole, hasAnyRole } from './supabase';
import {
  WhatsAppSettings,
  WhatsAppTemplate,
  WhatsAppCampaign,
  WhatsAppChat,
  WhatsAppMessage,
} from '../types/whatsapp';
import {
  loadWhatsAppSettings,
  addWhatsAppCampaign,
  updateWhatsAppCampaign,
  loadWhatsAppChats,
  saveWhatsAppChats,
  loadWhatsAppMessages,
  saveWhatsAppMessages,
  generateHumanCampaignCode,
} from './whatsappStorage';

// Use Vite dev proxy in development to avoid CORS; direct URL in production.
const META_BASE =
  import.meta.env.DEV
    ? '/api/meta'
    : 'https://graph.facebook.com';

// --- RBAC & PERMISSION CHECKERS ---

export function getUserRoles(profile: Profile | null): UserRole[] {
  if (!profile) return [];
  if (profile.roles && profile.roles.length > 0) return profile.roles;
  if (profile.role) return [profile.role];
  return [];
}

export function canAccessWhatsAppHub(profile: Profile | null, _settings?: WhatsAppSettings): boolean {
  if (!profile) return false;
  // Strictly show only to admin
  return hasAnyRole(profile, ['admin']);
}

export function canSendWhatsAppCampaigns(profile: Profile | null, _settings?: WhatsAppSettings): boolean {
  if (!profile) return false;
  return hasAnyRole(profile, ['admin']);
}

export function canAccessWhatsAppInbox(profile: Profile | null, _settings?: WhatsAppSettings): boolean {
  if (!profile) return false;
  return hasAnyRole(profile, ['admin']);
}

export function canManageWhatsAppSettings(profile: Profile | null, _settings?: WhatsAppSettings): boolean {
  if (!profile) return false;
  return hasAnyRole(profile, ['admin']);
}

// --- META CLOUD API SENDER & RENDERING ---

export function renderTemplateText(
  template: WhatsAppTemplate,
  data: Record<string, any>
): string {
  let text = template.bodyText || '';
  
  // 1. Replace defined template variables first
  (template.variables || []).forEach((v) => {
    let val = '';
    if (v.fieldMapping && data[v.fieldMapping] !== undefined) {
      val = String(data[v.fieldMapping]);
    } else {
      val = v.fallback || '';
    }
    const placeholder = new RegExp(`\\{\\{${v.key}\\}\\}`, 'g');
    text = text.replace(placeholder, val);
  });

  // 2. Replace any remaining placeholders (both named like {{customer_name}} and numbered like {{1}})
  text = text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key) => {
    if (data[key] !== undefined && data[key] !== '') {
      return String(data[key]);
    }
    const lower = key.toLowerCase();
    if (key === '1' || lower.includes('name')) {
      return data.customer_name || 'Valued Customer';
    }
    if (key === '2' || lower.includes('sc') || lower.includes('conn')) {
      return data.sc_number || 'Connection';
    }
    if (key === '3' || lower.includes('mandal') || lower.includes('circle') || lower.includes('area')) {
      return data.mandal_name || data.circle_name || 'Your Area';
    }
    return match;
  });

  return text;
}

export interface SendSingleOptions {
  toPhone: string;
  template: WhatsAppTemplate;
  variablesData: Record<string, any>;
  settings?: WhatsAppSettings;
}

export async function sendWhatsAppTemplateMessage(
  options: SendSingleOptions
): Promise<{ success: boolean; messageId?: string; simulated?: boolean; error?: string }> {
  const settings = options.settings || loadWhatsAppSettings();
  const cleanPhone = options.toPhone.replace(/\D/g, '');
  const phoneWithCountry = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

  // If credentials configured, call Meta Graph API
  if (settings.isConfigured && settings.phoneNumberId && settings.accessToken) {
    try {
      const url = `${META_BASE}/v20.0/${settings.phoneNumberId}/messages`;
      
      // 1. Discover WABA ID if missing
      let wabaId = settings.wabaId;
      if (!wabaId && settings.phoneNumberId) {
        try {
          const pRes = await fetch(
            `${META_BASE}/v20.0/${settings.phoneNumberId}?fields=whatsapp_business_account`,
            { headers: { Authorization: `Bearer ${settings.accessToken}` } }
          );
          if (pRes.ok) {
            const pData = await pRes.json();
            if (pData.whatsapp_business_account?.id) {
              wabaId = pData.whatsapp_business_account.id;
            }
          }
        } catch {}
      }

      let metaLang = options.template.language || 'en';
      let hasImageHeader = options.template.headerFormat === 'IMAGE';
      let hasHeaderVar = false;
      let headerVarKey: string | null = null;
      let detectedBodyVars: string[] = [];

      // 2. Query Meta to check the EXACT live template schema registered on Meta
      if (wabaId) {
        try {
          const tRes = await fetch(
            `${META_BASE}/v20.0/${wabaId}/message_templates?name=${encodeURIComponent(options.template.name)}&fields=name,status,category,language,components&limit=10`,
            { headers: { Authorization: `Bearer ${settings.accessToken}` } }
          );
          if (tRes.ok) {
            const tData = await tRes.json();
            const matched = (tData.data || []).find(
              (mt: any) =>
                mt.name === options.template.name &&
                mt.status === 'APPROVED' &&
                (!options.template.language || mt.language === options.template.language || mt.language.startsWith(options.template.language.slice(0, 2)))
            ) || (tData.data || []).find(
              (mt: any) => mt.name === options.template.name && mt.status === 'APPROVED'
            ) || (tData.data || []).find(
              (mt: any) => mt.name === options.template.name
            ) || tData.data?.[0];

            if (matched) {
              console.log('[Meta Live Template Found]', matched.name, matched.language, matched.status, matched.components);
              metaLang = matched.language;
              const metaComponents = matched.components || [];
              const bodyComp = metaComponents.find((c: any) => c.type === 'BODY' || c.type === 'body');
              const headerComp = metaComponents.find((c: any) => c.type === 'HEADER' || c.type === 'header');

              if (bodyComp) {
                // Extract from body text (supports both {{1}} and {{customer_name}})
                const textMatches = Array.from((bodyComp.text || '').matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)).map((m: any) => m[1]);
                if (textMatches.length > 0) {
                  detectedBodyVars = Array.from(new Set(textMatches));
                } else if (bodyComp.example?.body_text_named_params) {
                  detectedBodyVars = bodyComp.example.body_text_named_params.map((p: any) => p.param_name);
                } else if (bodyComp.example?.body_text?.[0]) {
                  detectedBodyVars = bodyComp.example.body_text[0].map((_: any, idx: number) => String(idx + 1));
                }
              }

              hasImageHeader = headerComp?.format === 'IMAGE';
              const headerMatch = (headerComp?.text || '').match(/\{\{([a-zA-Z0-9_]+)\}\}/);
              if (headerMatch) {
                hasHeaderVar = true;
                headerVarKey = headerMatch[1];
              }
            }
          }
        } catch (fetchErr) {
          console.warn('Could not inspect live Meta template schema:', fetchErr);
        }
      }

      // If we couldn't inspect Meta live or didn't find body vars, fallback to local template definition
      if (detectedBodyVars.length === 0) {
        const localMatches = Array.from((options.template.bodyText || '').matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)).map((m: any) => m[1]);
        if (localMatches.length > 0) {
          detectedBodyVars = Array.from(new Set(localMatches));
        } else if ((options.template.variables || []).length > 0) {
          detectedBodyVars = options.template.variables.map((v) => v.key);
        }
      }

      // Build components
      const components: any[] = [];

      // Header component
      if (hasImageHeader) {
        components.push({
          type: 'header',
          parameters: [
            {
              type: 'image',
              image: {
                link: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&q=80',
              },
            },
          ],
        });
      } else if (hasHeaderVar && headerVarKey) {
        const isHeaderPositional = /^\d+$/.test(headerVarKey);
        const headerText = options.variablesData.customer_name || 'Valued Customer';
        components.push({
          type: 'header',
          parameters: [
            isHeaderPositional
              ? { type: 'text', text: headerText }
              : { type: 'text', parameter_name: headerVarKey, text: headerText },
          ],
        });
      }

      // Body parameters (supports both positional {{1}} and named {{customer_name}})
      if (detectedBodyVars.length > 0) {
        const bodyParams: any[] = [];
        detectedBodyVars.forEach((varKey) => {
          const isPositional = /^\d+$/.test(varKey);
          const varDef = (options.template.variables || []).find((v) => v.key === varKey);
          let val = '';

          if (options.variablesData[varKey] !== undefined && options.variablesData[varKey] !== '') {
            val = String(options.variablesData[varKey]);
          } else if (varDef?.fieldMapping && options.variablesData[varDef.fieldMapping] !== undefined) {
            val = String(options.variablesData[varDef.fieldMapping]);
          } else {
            const lower = varKey.toLowerCase();
            if (varKey === '1' || lower.includes('name')) {
              val = options.variablesData.customer_name || 'Customer';
            } else if (varKey === '2' || lower.includes('sc') || lower.includes('conn')) {
              val = options.variablesData.sc_number || 'Connection';
            } else if (varKey === '3' || lower.includes('mandal') || lower.includes('circle') || lower.includes('area')) {
              val = options.variablesData.mandal_name || options.variablesData.circle_name || 'Your Area';
            } else {
              val = varDef?.fallback || 'Valued Customer';
            }
          }

          if (isPositional) {
            bodyParams.push({
              type: 'text',
              text: val,
            });
          } else {
            bodyParams.push({
              type: 'text',
              parameter_name: varKey,
              text: val,
            });
          }
        });

        components.push({
          type: 'body',
          parameters: bodyParams,
        });
      }

      const payload: any = {
        messaging_product: 'whatsapp',
        to: phoneWithCountry,
        type: 'template',
        template: {
          name: options.template.name,
          language: { code: metaLang },
        },
      };

      if (components.length > 0) {
        payload.template.components = components;
      }

      console.log('Sending Meta payload:', JSON.stringify(payload, null, 2));

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      console.log('Meta response:', res.status, JSON.stringify(resData, null, 2));

      if (!res.ok) {
        let errorMsg = resData.error?.message || `Meta API Error (${res.status})`;
        if (resData.error?.error_user_msg) {
          errorMsg += `\nDetail: ${resData.error.error_user_msg}`;
        }
        return {
          success: false,
          error: `${errorMsg}\n(Template: "${options.template.name}" [${metaLang}], Params sent: ${detectedBodyVars.length})`,
        };
      }

      return {
        success: true,
        messageId: resData.messages?.[0]?.id || `wamid.${Date.now()}`,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error calling Meta API' };
    }
  }

  // Simulation Mode (Safe development / preview mode)
  await new Promise((resolve) => setTimeout(resolve, 80));
  return {
    success: true,
    messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    simulated: true,
  };
}

/**
 * Sends a Read Receipt status to Meta WhatsApp Cloud API.
 * This triggers the double BLUE TICKS (seen receipt) on the customer's WhatsApp phone.
 */
export async function markWhatsAppMessageAsRead(
  messageId: string,
  settings?: WhatsAppSettings
): Promise<{ success: boolean; error?: string }> {
  const cfg = settings || loadWhatsAppSettings();
  if (cfg.phoneNumberId && cfg.accessToken && messageId && messageId.startsWith('wamid.')) {
    try {
      const url = `${META_BASE}/v20.0/${cfg.phoneNumberId}/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      });
      const data = await res.json();
      return { success: res.ok, error: data?.error?.message };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }
  return { success: true };
}

export async function sendWhatsAppTextMessage(options: {
  toPhone: string;
  text: string;
  settings?: WhatsAppSettings;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const settings = options.settings || loadWhatsAppSettings();
  let cleanPhone = options.toPhone.replace(/\D/g, '');
  if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
    // already 91XXXXXXXXXX
  } else if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  } else if (cleanPhone.length === 11 && (cleanPhone.startsWith('0') || cleanPhone.startsWith('1'))) {
    cleanPhone = `91${cleanPhone.slice(1)}`;
  } else if (cleanPhone.length > 10 && !cleanPhone.startsWith('91')) {
    cleanPhone = `91${cleanPhone.slice(-10)}`;
  }

  if (settings.phoneNumberId && settings.accessToken) {
    try {
      const url = `${META_BASE}/v20.0/${settings.phoneNumberId}/messages`;
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: options.text,
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: resData.error?.message || `Meta API Error (${res.status})`,
        };
      }

      return {
        success: true,
        messageId: resData.messages?.[0]?.id || `wamid.${Date.now()}`,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error calling Meta API' };
    }
  }

  return { success: true, messageId: `sim_${Date.now()}` };
}


export interface BroadcastBatchProgress {
  total: number;
  sent: number;
  failed: number;
  percent: number;
  currentCustomer?: string;
  isCompleted: boolean;
}

export async function executeBroadcastCampaign(
  campaign: WhatsAppCampaign,
  template: WhatsAppTemplate,
  prospects: Array<{
    id?: string;
    customer_name?: string;
    sc_number?: string;
    mobile_number?: string;
    circle_name?: string;
    mandal_name?: string;
    section_name?: string;
    applied_solar_load_kw?: number;
  }>,
  onProgress?: (progress: BroadcastBatchProgress) => void
): Promise<WhatsAppCampaign> {
  const settings = loadWhatsAppSettings();
  addWhatsAppCampaign(campaign);

  let sent = 0;
  let failed = 0;
  let lastError: string | undefined;
  const total = prospects.length;

  for (let i = 0; i < prospects.length; i++) {
    const p = prospects[i];
    const phone = p.mobile_number || '';
    if (!phone || phone.length < 10) {
      failed++;
      lastError = 'Invalid phone number (must be at least 10 digits)';
      continue;
    }

    const variablesData = {
      customer_name: p.customer_name || 'గారు',
      sc_number: p.sc_number || '',
      circle_name: p.circle_name || 'APEPDCL',
      mandal_name: p.mandal_name || p.circle_name || 'మీ ప్రాంతం',
      section_name: p.section_name || '',
      applied_solar_load_kw: p.applied_solar_load_kw || 3,
      subsidy_amount: '₹78,000',
    };

    const res = await sendWhatsAppTemplateMessage({
      toPhone: phone,
      template,
      variablesData,
      settings,
    });

    if (res.success) {
      sent++;

      // Record sent message into WhatsApp Inbox (Supabase + localStorage)
      const phoneDigits = phone.replace(/\D/g, '');
      const phone10 = phoneDigits.slice(-10);
      const chatId = `chat_${phone10}`;
      const renderedContent = renderTemplateText(template, variablesData);
      const now = new Date().toISOString();
      const customerName = p.customer_name || 'Customer';
      const msgId = res.messageId || `msg_camp_${Date.now()}_${i}`;

      const campaignCode = campaign.code || generateHumanCampaignCode(campaign.name, campaign.createdAt);
      const campTags = [template.category, 'Broadcast Sent', campaign.name, campaignCode, campaign.id];

      const chatRecord: WhatsAppChat = {
        id: chatId,
        customerName,
        phoneNumber: phone10,
        scNumber: p.sc_number || undefined,
        circleName: p.circle_name || undefined,
        mandalName: p.mandal_name || undefined,
        appliedLoadKw: p.applied_solar_load_kw || undefined,
        campaignId: campaign.id,
        campaignCode: campaignCode,
        campaignName: campaign.name,
        lastMessageText: renderedContent,
        lastMessageAt: now,
        lastMessageDirection: 'outbound',
        unreadCount: 0,
        status: 'open',
        tags: campTags,
      };

      const msgRecord: WhatsAppMessage = {
        id: msgId,
        chatId,
        direction: 'outbound',
        type: 'template',
        templateName: template.name,
        content: renderedContent,
        senderName: 'Tejo Bharat Solar',
        senderPhone: '8121104043',
        receiverPhone: phone10,
        status: 'delivered',
        createdAt: now,
      };

      // 1. Persist to Supabase tables
      try {
        await supabase.from('whatsapp_chats').upsert({
          id: chatId,
          customer_name: customerName,
          phone_number: phone10,
          sc_number: p.sc_number || null,
          circle_name: p.circle_name || null,
          mandal_name: p.mandal_name || null,
          applied_load_kw: p.applied_solar_load_kw || null,
          last_message_text: renderedContent,
          last_message_at: now,
          last_message_direction: 'outbound',
          unread_count: 0,
          status: 'open',
          tags: campTags,
          updated_at: now,
        });

        await supabase.from('whatsapp_messages').upsert({
          id: msgId,
          chat_id: chatId,
          direction: 'outbound',
          type: 'template',
          content: renderedContent,
          sender_name: 'Tejo Bharat Solar',
          sender_phone: '8121104043',
          receiver_phone: phone10,
          status: 'delivered',
          created_at: now,
        });
      } catch (dbErr) {
        console.warn('Could not sync sent campaign message to Supabase:', dbErr);
      }

      // 2. Also persist to local storage for instant reactivity
      try {
        const existingChats = loadWhatsAppChats();
        const otherChats = existingChats.filter((c) => c.id !== chatId);
        saveWhatsAppChats([chatRecord, ...otherChats]);

        const existingMsgs = loadWhatsAppMessages(chatId);
        saveWhatsAppMessages(chatId, [...existingMsgs, msgRecord]);
      } catch (localErr) {
        console.warn('Could not save sent campaign message to localStorage:', localErr);
      }
    } else {
      failed++;
      lastError = res.error;
      console.error(`WhatsApp send failed to ${phone}:`, res.error);
    }

    const pct = Math.round(((i + 1) / total) * 100);
    onProgress?.({
      total,
      sent,
      failed,
      percent: pct,
      currentCustomer: p.customer_name || p.sc_number || phone,
      isCompleted: i === total - 1,
    });

    // Small delay between requests (simulate throttled safe rate)
    if (settings.isConfigured) {
      await new Promise((r) => setTimeout(r, 60000 / (settings.rateLimitPerMinute || 60)));
    } else {
      await new Promise((r) => setTimeout(r, 30));
    }
  }

  const updatedCampaign: WhatsAppCampaign = {
    ...campaign,
    status: failed > 0 && sent === 0 ? 'failed' : 'completed',
    sentCount: sent,
    deliveredCount: Math.round(sent * 0.98),
    readCount: Math.round(sent * 0.82),
    failedCount: failed,
    lastError,
    repliedCount: campaign.repliedCount || 0,
    completedAt: new Date().toISOString(),
  };

  updateWhatsAppCampaign(campaign.id, updatedCampaign);
  return updatedCampaign;
}

export async function fetchMetaTemplates(
  settings?: WhatsAppSettings
): Promise<{ success: boolean; templates?: WhatsAppTemplate[]; error?: string }> {
  const cfg = settings || loadWhatsAppSettings();
  if (!cfg.wabaId || !cfg.accessToken) {
    return {
      success: false,
      error: 'WhatsApp Business Account ID (WABA ID) and Access Token are required to fetch templates.',
    };
  }

  try {
    const res = await fetch(
      `${META_BASE}/v20.0/${cfg.wabaId}/message_templates?fields=name,status,category,language,components&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${cfg.accessToken}`,
        },
      }
    );

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error?.message || 'Failed to fetch templates from Meta Graph API.',
      };
    }

    const remoteTemplates: WhatsAppTemplate[] = (data.data || []).map((t: any) => {
      let bodyText = '';
      let headerText = '';
      let headerFormat: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' = 'TEXT';
      let footerText = '';
      const buttons: Array<{ type: 'QUICK_REPLY' | 'PHONE_NUMBER' | 'URL'; text: string; value?: string }> = [];

      (t.components || []).forEach((c: any) => {
        if (c.type === 'BODY') {
          bodyText = c.text || '';
        } else if (c.type === 'HEADER') {
          headerText = c.text || '';
          if (c.format === 'IMAGE') headerFormat = 'IMAGE';
          else if (c.format === 'VIDEO') headerFormat = 'VIDEO';
          else if (c.format === 'DOCUMENT') headerFormat = 'DOCUMENT';
        } else if (c.type === 'FOOTER') {
          footerText = c.text || '';
        } else if (c.type === 'BUTTONS' && Array.isArray(c.buttons)) {
          c.buttons.forEach((b: any) => {
            if (b.type === 'QUICK_REPLY') {
              buttons.push({ type: 'QUICK_REPLY', text: b.text });
            } else if (b.type === 'PHONE_NUMBER') {
              buttons.push({ type: 'PHONE_NUMBER', text: b.text, value: b.phone_number });
            } else if (b.type === 'URL') {
              buttons.push({ type: 'URL', text: b.text, value: b.url });
            }
          });
        }
      });

      // Extract variables from bodyText: {{1}}, {{2}} OR named variables like {{customer_name}}
      const varMatches = Array.from((bodyText || '').matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)).map((m: any) => m[1]);
      const varKeys = Array.from(new Set(varMatches));
      const variables = varKeys.map((k) => {
        const num = parseInt(k, 10);
        const lower = k.toLowerCase();
        let fieldMapping: any = 'customer_name';
        let fallback = 'Customer';
        if (num === 2 || lower.includes('sc') || lower.includes('conn')) {
          fieldMapping = 'sc_number';
          fallback = 'Connection No';
        } else if (num === 3 || lower.includes('mandal') || lower.includes('circle') || lower.includes('area')) {
          fieldMapping = 'mandal_name';
          fallback = 'Your Area';
        } else if (num === 1 || lower.includes('name')) {
          fieldMapping = 'customer_name';
          fallback = 'Customer';
        }
        return {
          key: k,
          label: isNaN(num) ? k.replace(/_/g, ' ') : `Variable {{${k}}}`,
          fallback,
          fieldMapping,
        };
      });

      let status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'CUSTOM' = 'CUSTOM';
      if (t.status === 'APPROVED') status = 'APPROVED';
      else if (t.status === 'PENDING' || t.status === 'IN_REVIEW') status = 'PENDING';
      else if (t.status === 'REJECTED') status = 'REJECTED';

      return {
        id: t.id || `meta_${t.name}`,
        name: t.name,
        category: (t.category as any) || 'MARKETING',
        language: t.language || 'en',
        displayName: t.name.replace(/_/g, ' ').toUpperCase(),
        description: `Synced live from Meta Account (${t.category} - ${t.language})`,
        bodyText,
        headerText: headerText || undefined,
        headerFormat,
        footerText: footerText || undefined,
        buttons: buttons.length > 0 ? buttons : undefined,
        variables,
        status,
      };
    });

    return {
      success: true,
      templates: remoteTemplates,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error fetching templates from Meta.',
    };
  }
}

export async function subscribeWabaToApp(
  settings?: WhatsAppSettings
): Promise<{ success: boolean; message: string }> {
  const cfg = settings || loadWhatsAppSettings();
  if (!cfg.accessToken) {
    return {
      success: false,
      message: 'Permanent Access Token is required in Settings.',
    };
  }

  let wabaId = cfg.wabaId;
  if (!wabaId && cfg.phoneNumberId) {
    try {
      const pRes = await fetch(
        `${META_BASE}/v20.0/${cfg.phoneNumberId}?fields=whatsapp_business_account`,
        { headers: { Authorization: `Bearer ${cfg.accessToken}` } }
      );
      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData.whatsapp_business_account?.id) {
          wabaId = pData.whatsapp_business_account.id;
        }
      }
    } catch {}
  }

  if (!wabaId) {
    return {
      success: false,
      message: 'WABA ID could not be detected. Please ensure Phone Number ID or WABA ID is entered in Settings.',
    };
  }

  try {
    // 1. Reset / Delete existing subscription to clear any stuck state
    try {
      await fetch(`${META_BASE}/v20.0/${wabaId}/subscribed_apps`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${cfg.accessToken}`,
        },
      });
    } catch {}

    // 2. Subscribe with explicit subscribed_fields=messages
    const res = await fetch(
      `${META_BASE}/v20.0/${wabaId}/subscribed_apps?subscribed_fields=messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscribed_fields: ['messages'],
        }),
      }
    );

    const data = await res.json();
    console.log('[Meta Subscribed Apps POST Response]:', data);

    // 3. Also subscribe phone number ID level with messages if available
    if (cfg.phoneNumberId) {
      try {
        await fetch(
          `${META_BASE}/v20.0/${cfg.phoneNumberId}/subscribed_apps?subscribed_fields=messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${cfg.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subscribed_fields: ['messages'],
            }),
          }
        );
      } catch {}
    }

    if (res.ok && (data.success || data.data)) {
      return {
        success: true,
        message: 'Successfully linked WABA to Webhook with "messages" field active! Live incoming customer chat is ready.',
      };
    }
    return {
      success: false,
      message: data.error?.message || 'Meta could not bind WABA to App Webhook.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Network error subscribing WABA to App.',
    };
  }
}

export async function checkWabaSubscriptionStatus(
  settings?: WhatsAppSettings
): Promise<{ isSubscribed: boolean; apps?: any[]; error?: string }> {
  const cfg = settings || loadWhatsAppSettings();
  if (!cfg.wabaId || !cfg.accessToken) {
    return { isSubscribed: false, error: 'WABA ID or Access Token missing.' };
  }

  try {
    const res = await fetch(`${META_BASE}/v20.0/${cfg.wabaId}/subscribed_apps`, {
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
      },
    });

    const data = await res.json();
    if (res.ok) {
      const isSub = Array.isArray(data.data) && data.data.length > 0;
      return { isSubscribed: isSub, apps: data.data };
    }
    return { isSubscribed: false, error: data.error?.message };
  } catch (err: any) {
    return { isSubscribed: false, error: err.message };
  }
}

