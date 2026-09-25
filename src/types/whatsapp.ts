import { UserRole } from '../lib/supabase';

export interface WhatsAppRolePermissions {
  allowedHubRoles: UserRole[];        // Roles that can view WhatsApp tab (Default: ['admin', 'employee'])
  allowedCampaignRoles: UserRole[];   // Roles that can launch bulk campaigns (Default: ['admin'])
  allowedInboxRoles: UserRole[];      // Roles that can view & chat in shared inbox (Default: ['admin', 'employee'])
  allowedSettingsRoles: UserRole[];   // Roles that can configure API credentials (Default: ['admin'])
}

export interface WhatsAppSettings {
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  webhookVerifyToken: string;
  businessName: string;
  displayPhoneNumber: string;
  isConfigured: boolean;
  rateLimitPerMinute: number;         // Max messages per minute to throttle safely
  permissions: WhatsAppRolePermissions;
  updatedAt?: string;
  updatedBy?: string;
}

export interface WhatsAppTemplateVariable {
  key: string;
  label: string;
  fallback: string;
  fieldMapping?: 'customer_name' | 'sc_number' | 'circle_name' | 'mandal_name' | 'section_name' | 'applied_solar_load_kw' | 'subsidy_amount';
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: 'MARKETING' | 'UTILITY';
  language: 'te' | 'en' | 'en_US';
  displayName: string;
  description: string;
  bodyText: string;
  headerText?: string;
  headerFormat?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  footerText?: string;
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'PHONE_NUMBER' | 'URL';
    text: string;
    value?: string;
  }>;
  variables: WhatsAppTemplateVariable[];
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'CUSTOM';
}

export interface WhatsAppMessage {
  id: string;
  chatId: string;
  prospectId?: string;
  direction: 'inbound' | 'outbound';
  type: 'text' | 'template' | 'button_reply' | 'interactive' | 'internal_note';
  content: string;
  templateName?: string;
  senderName?: string;
  senderPhone: string;
  receiverPhone: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  errorMessage?: string;
  metaMessageId?: string;
  estimatedCostInr?: number;
  quotedMessage?: {
    id: string;
    content: string;
    senderName?: string;
  };
  createdAt: string;
  readAt?: string;
  deliveredAt?: string;
}

export interface WhatsAppChat {
  id: string;
  campaignId?: string;
  campaignCode?: string;       // Human-identifiable campaign code (e.g. 'CMP-SURYA-2609-001')
  campaignName?: string;
  prospectId?: string;
  scNumber?: string;
  customerName: string;
  phoneNumber: string;
  circleName?: string;
  mandalName?: string;
  appliedLoadKw?: number;
  lastMessageText: string;
  lastMessageAt: string;
  lastMessageDirection: 'inbound' | 'outbound';
  unreadCount: number;
  assignedToUserId?: string;
  assignedToName?: string;
  status: 'open' | 'resolved' | 'waiting' | 'opt_out';
  tags: string[];
  createdAt?: string;
}

export interface WhatsAppCampaign {
  id: string;
  code: string;                // Human-identifiable unique identifier (e.g. 'CMP-SURYA-2609-001')
  name: string;
  templateId: string;
  templateName: string;
  targetCircle?: string;
  targetFiltersSummary: string;
  totalTargetCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  repliedCount: number;
  optOutCount: number;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'failed';
  lastError?: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  completedAt?: string;
}
