import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MessageSquare,
  Search,
  Check,
  CheckCheck,
  Send,
  Phone,
  User,
  Zap,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  Tag,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Filter,
  RefreshCw,
  Loader2,
  Database,
  Copy,
  AlertCircle,
  X,
  DollarSign,
  Users,
  UserCheck,
  StickyNote,
  TrendingUp,
  Wallet,
  Info,
  CheckCircle2,
  Reply,
  Receipt,
  Plus,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  ClipboardList,
} from 'lucide-react';
import { WhatsAppChat, WhatsAppMessage, WhatsAppCampaign } from '../../types/whatsapp';
import {
  loadWhatsAppChats,
  loadWhatsAppMessages,
  saveWhatsAppMessages,
  saveWhatsAppChats,
  DEFAULT_TEMPLATES,
  loadWhatsAppSettings,
  clearLocalWhatsAppChats,
  loadWhatsAppCampaigns,
  syncWhatsAppCampaignsWithSupabase,
  generateHumanCampaignCode,
  loadLocalBillsForSc,
  saveLocalBillForSc,
  SAMPLE_SC_BILLS,
  WhatsAppCustomerBill,
} from '../../lib/whatsappStorage';
import {
  sendWhatsAppTextMessage,
  sendWhatsAppTemplateMessage,
  markWhatsAppMessageAsRead,
} from '../../lib/whatsappApi';
import { fetchBillsByScNumber, extractAreaCode } from '../../lib/ebApi';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';

const SQL_TABLE_SETUP = `-- Run this in Supabase SQL Editor to enable live WhatsApp Inbox:
CREATE TABLE IF NOT EXISTS public.whatsapp_chats (
  id TEXT PRIMARY KEY,
  customer_name TEXT,
  phone_number TEXT NOT NULL,
  sc_number TEXT,
  circle_name TEXT,
  mandal_name TEXT,
  applied_load_kw NUMERIC,
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_direction TEXT DEFAULT 'inbound',
  unread_count INT DEFAULT 1,
  status TEXT DEFAULT 'open',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES public.whatsapp_chats(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  content TEXT NOT NULL,
  sender_name TEXT,
  sender_phone TEXT,
  receiver_phone TEXT,
  status TEXT DEFAULT 'delivered',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all whatsapp_chats" ON public.whatsapp_chats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all whatsapp_messages" ON public.whatsapp_messages FOR ALL USING (true) WITH CHECK (true);
`;

export type WhatsAppInboxFilter = 'all' | 'replied' | 'needs_reply' | 'open' | 'waiting' | 'opt_out';

export default function WhatsAppInboxView() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCampaign = searchParams.get('campaign') || 'all';
  const initialFilter = (searchParams.get('filter') as WhatsAppInboxFilter) || 'all';

  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>(() => loadWhatsAppCampaigns());
  const [selectedChatId, setSelectedChatId] = useState<string>('');
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [inputText, setInputText] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<WhatsAppInboxFilter>(initialFilter);
  const [campaignFilter, setCampaignFilter] = useState<string>(initialCampaign);
  const [campaignRepliesOnly, setCampaignRepliesOnly] = useState<boolean>(initialFilter === 'replied');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'mine' | 'unassigned'>('all');
  const [repliedChatIds, setRepliedChatIds] = useState<Set<string>>(new Set());
  const [newIncomingAlert, setNewIncomingAlert] = useState<{
    customerName: string;
    phone: string;
    text: string;
    chatId: string;
  } | null>(null);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };
  const previousLatestMsgRef = useRef<string | null>(null);

  useEffect(() => {
    const camp = searchParams.get('campaign');
    if (camp) {
      setCampaignFilter(camp);
    }
    const flt = searchParams.get('filter');
    if (flt) {
      setStatusFilter(flt as WhatsAppInboxFilter);
      if (flt === 'replied') {
        setCampaignRepliesOnly(true);
      }
    }
  }, [searchParams]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; fullName: string; role: string }[]>([]);
  const [showCostModal, setShowCostModal] = useState(false);
  const [sendMode, setSendMode] = useState<'message' | 'internal_note'>('message');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasCopiedSql, setHasCopiedSql] = useState(false);
  const [dbTablesReady, setDbTablesReady] = useState<boolean | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<WhatsAppMessage | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Customer DISCOM Bill History State
  const [customerBills, setCustomerBills] = useState<WhatsAppCustomerBill[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [showAllBills, setShowAllBills] = useState(false);
  const [showAddBillModal, setShowAddBillModal] = useState(false);
  const [newBillMonth, setNewBillMonth] = useState('Aug 2026');
  const [newBillUnits, setNewBillUnits] = useState('');
  const [newBillAmount, setNewBillAmount] = useState('');
  const [newBillStatus, setNewBillStatus] = useState('Paid');
  const [savingBill, setSavingBill] = useState(false);

  const [usageStats, setUsageStats] = useState({
    totalOutbound: 0,
    totalInbound: 0,
    marketingCount: 0,
    utilityCount: 0,
    serviceConversations: 0,
    freeConversationsUsed: 0,
    totalEstimatedInr: 0,
  });

  // Calculate Meta Cloud API Cost & Usage
  useEffect(() => {
    if (!showCostModal) return;
    const computeUsage = async () => {
      try {
        const { data, error } = await supabase
          .from('whatsapp_messages')
          .select('direction, type, created_at');

        let outCount = 0;
        let inCount = 0;
        let marketing = 0;
        let utility = 0;

        if (!error && data && data.length > 0) {
          data.forEach((m: any) => {
            if (m.direction === 'outbound') {
              outCount++;
              if (m.type === 'marketing') marketing++;
              else utility++;
            } else {
              inCount++;
            }
          });
        }

        const serviceConversations = chats.length;
        const freeUsed = Math.min(serviceConversations, 1000);
        const billableService = Math.max(0, serviceConversations - 1000);
        // Meta India pricing: Marketing ~₹0.80, Utility ~₹0.12, Billable Service ~₹0.35
        const estCost = marketing * 0.8 + utility * 0.12 + billableService * 0.35;

        setUsageStats({
          totalOutbound: outCount,
          totalInbound: inCount,
          marketingCount: marketing,
          utilityCount: utility,
          serviceConversations,
          freeConversationsUsed: freeUsed,
          totalEstimatedInr: parseFloat(estCost.toFixed(2)),
        });
      } catch (err) {
        console.warn('Failed to compute usage stats:', err);
      }
    };
    computeUsage();
  }, [showCostModal, chats.length]);

  // Fetch team members for chat assignment
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .in('role', ['admin', 'employee'])
          .order('full_name', { ascending: true });
        if (!error && data) {
          setTeamMembers(
            data.map((d: any) => ({
              id: d.id,
              fullName: d.full_name || d.email || 'Staff Member',
              role: d.role,
            }))
          );
        }
      } catch (err) {
        console.warn('Could not load team members:', err);
      }
    };
    fetchTeam();

    // Sync broadcast campaigns from Supabase chats so campaigns are always populated
    syncWhatsAppCampaignsWithSupabase().then((synced) => {
      if (synced && synced.length > 0) {
        setCampaigns(synced);
      }
    });
  }, []);

  // Fetch chats from Supabase or fallback to local
  const fetchChats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_chats')
        .select('*')
        .order('last_message_at', { ascending: false });

      // Check which chats have received customer replies in Supabase
      try {
        const { data: inboundRows } = await supabase
          .from('whatsapp_messages')
          .select('chat_id')
          .eq('direction', 'inbound');

        if (inboundRows && inboundRows.length > 0) {
          const ids = new Set<string>(inboundRows.map((m: any) => m.chat_id));
          setRepliedChatIds((prev) => new Set([...prev, ...ids]));
        }
      } catch (inboundErr) {
        // non-fatal
      }

      if (!error && data) {
        setDbTablesReady(true);
        const mapped: WhatsAppChat[] = data.map((c: any) => {
          const campCodeFromTags = Array.isArray(c.tags)
            ? c.tags.find((t: string) => t.startsWith('CMP-'))
            : undefined;
          return {
            id: c.id,
            customerName: c.customer_name || 'Customer',
            phoneNumber: c.phone_number,
            scNumber: c.sc_number || undefined,
            circleName: c.circle_name || undefined,
            mandalName: c.mandal_name || undefined,
            appliedLoadKw: c.applied_load_kw || undefined,
            lastMessageText: c.last_message_text || '',
            lastMessageAt: c.last_message_at || c.created_at,
            lastMessageDirection: c.last_message_direction || 'inbound',
            unreadCount: c.unread_count || 0,
            status: c.status || 'open',
            tags: c.tags || [],
            assignedToUserId: c.assigned_to_user_id || undefined,
            assignedToName: c.assigned_to_name || undefined,
            campaignCode: c.campaign_code || campCodeFromTags || undefined,
            campaignId: c.campaign_id || undefined,
            campaignName: c.campaign_name || undefined,
            createdAt: c.created_at || c.last_message_at,
          };
        });

        // Detect new incoming message alert
        if (mapped.length > 0) {
          const latestChat = mapped[0];
          const latestKey = `${latestChat.id}_${latestChat.lastMessageAt}_${latestChat.lastMessageDirection}`;
          if (
            previousLatestMsgRef.current &&
            previousLatestMsgRef.current !== latestKey &&
            latestChat.lastMessageDirection === 'inbound'
          ) {
            setNewIncomingAlert({
              customerName: latestChat.customerName,
              phone: latestChat.phoneNumber,
              text: latestChat.lastMessageText,
              chatId: latestChat.id,
            });
          }
          previousLatestMsgRef.current = latestKey;
        }

        setChats(mapped);
        if (mapped.length > 0) {
          if (!selectedChatId || !mapped.some((c) => c.id === selectedChatId)) {
            setSelectedChatId(mapped[0].id);
          }
        } else {
          setSelectedChatId('');
          setMessages([]);
        }
        return;
      } else if (error) {
        console.warn('whatsapp_chats table error:', error.message);
        setDbTablesReady(false);
      }
    } catch (err: any) {
      console.warn('Error fetching whatsapp_chats:', err);
      setDbTablesReady(false);
    }

    // Fallback to local storage (only real local chats, no sample mock chats)
    const loaded = loadWhatsAppChats();
    loaded.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    const localReplied = new Set<string>();
    loaded.forEach((c) => {
      if (c.lastMessageDirection === 'inbound') {
        localReplied.add(c.id);
      } else {
        const msgs = loadWhatsAppMessages(c.id);
        if (msgs.some((m) => m.direction === 'inbound')) {
          localReplied.add(c.id);
        }
      }
    });
    setRepliedChatIds((prev) => new Set([...prev, ...localReplied]));

    setChats(loaded);
    if (loaded.length > 0) {
      if (!selectedChatId || !loaded.some((c) => c.id === selectedChatId)) {
        setSelectedChatId(loaded[0].id);
      }
    } else {
      setSelectedChatId('');
      setMessages([]);
    }
  }, [selectedChatId]);

  // Fetch messages for selected chat
  const fetchMessages = useCallback(async (chatId: string) => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        const mapped: WhatsAppMessage[] = data.map((m: any) => ({
          id: m.id,
          chatId: m.chat_id,
          direction: m.direction,
          type: m.type || 'text',
          content: m.content,
          quotedMessage: m.quoted_message
            ? typeof m.quoted_message === 'string'
              ? JSON.parse(m.quoted_message)
              : m.quoted_message
            : undefined,
          senderName: m.sender_name || undefined,
          senderPhone: m.sender_phone || undefined,
          receiverPhone: m.receiver_phone || undefined,
          status: m.status || 'delivered',
          createdAt: m.created_at,
        }));
        setMessages(mapped);

        // Trigger Blue Ticks to customer's WhatsApp by marking inbound messages as read
        const inbounds = mapped.filter((m) => m.direction === 'inbound' && m.id && m.id.startsWith('wamid.'));
        if (inbounds.length > 0) {
          inbounds.forEach((inMsg) => {
            markWhatsAppMessageAsRead(inMsg.id).catch(() => {});
          });
        }
        return;
      }
    } catch {
      // Fallback
    }

    const localMsgs = loadWhatsAppMessages(chatId);
    setMessages(localMsgs);
  }, []);

  useEffect(() => {
    // Automatically purge legacy sample mock chats if present in browser localStorage
    try {
      const raw = localStorage.getItem('tejo_whatsapp_chats_v1');
      if (raw && (raw.includes('chat-durga-') || raw.includes('chat-tejo-') || raw.includes('chat-kakinada-') || raw.includes('chat-vizag-') || raw.includes('chat-konaseema-'))) {
        clearLocalWhatsAppChats();
      }
    } catch {
      // ignore
    }
    fetchChats();
  }, [fetchChats]);

  useEffect(() => {
    if (selectedChatId) {
      fetchMessages(selectedChatId);
      // Reset unread count locally and in db
      setChats((prev) =>
        prev.map((c) => (c.id === selectedChatId ? { ...c, unreadCount: 0 } : c))
      );
      supabase
        .from('whatsapp_chats')
        .update({ unread_count: 0 })
        .eq('id', selectedChatId)
        .then(() => {});
    }
  }, [selectedChatId, fetchMessages]);

  // Real-time polling & subscription
  useEffect(() => {
    const interval = setInterval(() => {
      fetchChats();
      if (selectedChatId) fetchMessages(selectedChatId);
    }, 4000);

    return () => clearInterval(interval);
  }, [fetchChats, fetchMessages, selectedChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isChatReplied = useCallback(
    (c: WhatsAppChat) => {
      return (
        c.lastMessageDirection === 'inbound' ||
        repliedChatIds.has(c.id) ||
        (c.unreadCount !== undefined && c.unreadCount > 0) ||
        (Array.isArray(c.tags) && (c.tags.includes('replied') || c.tags.includes('inbound')))
      );
    },
    [repliedChatIds]
  );

  const getChatCampaign = useCallback(
    (chat: WhatsAppChat): WhatsAppCampaign | undefined => {
      if (!chat) return undefined;
      // 1. Direct campaign fields
      if (chat.campaignCode) {
        const found = campaigns.find((c) => c.code === chat.campaignCode);
        if (found) return found;
      }
      if (chat.campaignId) {
        const found = campaigns.find((c) => c.id === chat.campaignId);
        if (found) return found;
      }

      // 2. Direct tags matching
      if (chat.tags && Array.isArray(chat.tags)) {
        for (const camp of campaigns) {
          if (
            (camp.code && chat.tags.includes(camp.code)) ||
            (camp.id && chat.tags.includes(camp.id)) ||
            (camp.name && chat.tags.includes(camp.name))
          ) {
            return camp;
          }
        }
        // Match code inside tags (e.g. CMP-SURYA-2609-040)
        const tagCode = chat.tags.find((t) => t.startsWith('CMP-'));
        if (tagCode) {
          const found = campaigns.find((c) => c.code === tagCode);
          if (found) return found;
        }
      }

      // 3. Message body matching
      if (chat.lastMessageText) {
        for (const camp of campaigns) {
          if (
            (camp.code && chat.lastMessageText.includes(camp.code)) ||
            (camp.name && chat.lastMessageText.includes(camp.name))
          ) {
            return camp;
          }
        }
      }

      // 4. Match by SC Number / Area code for campaigns with Area filters (e.g. 0711 -> CMP-SURYA-2609-040, 0716 -> CMP-SURYA-2609-038)
      if (chat.scNumber) {
        for (const camp of campaigns) {
          if (camp.targetFiltersSummary) {
            const summary = camp.targetFiltersSummary;
            if (summary.includes('0711') && chat.scNumber.includes('0711')) return camp;
            if (summary.includes('0716') && chat.scNumber.includes('0716')) return camp;
          }
        }
      }

      // 5. Correlate broadcast chats by timestamp for legacy broadcasts
      const chatTime = new Date(chat.createdAt || (chat as any).created_at || chat.lastMessageAt).getTime();
      if (!isNaN(chatTime) && chat.tags && Array.isArray(chat.tags) && chat.tags.includes('Broadcast Sent')) {
        let closestCamp: WhatsAppCampaign | undefined;
        let minDiff = 2 * 60 * 60 * 1000; // within 2 hour window of broadcast

        for (const camp of campaigns) {
          const campTime = new Date(camp.completedAt || camp.createdAt).getTime();
          if (!isNaN(campTime)) {
            const diff = Math.abs(chatTime - campTime);
            if (diff < minDiff) {
              minDiff = diff;
              closestCamp = camp;
            }
          }
        }
        if (closestCamp) return closestCamp;
      }

      return undefined;
    },
    [campaigns]
  );

  const repliedChatsCount = chats.filter(isChatReplied).length;
  const needsReplyCount = chats.filter((c) => c.lastMessageDirection === 'inbound').length;
  const openChatsCount = chats.filter((c) => c.status === 'open').length;
  const waitingChatsCount = chats.filter((c) => c.status === 'waiting').length;
  const optOutChatsCount = chats.filter((c) => c.status === 'opt_out').length;

  // Filter campaigns to only show those with at least one customer reply
  const campaignsWithReplies = useMemo(() => {
    return campaigns
      .map((camp) => {
        const campChats = chats.filter((c) => {
          const chCamp = getChatCampaign(c);
          return (
            chCamp?.id === camp.id ||
            chCamp?.code === camp.code ||
            c.campaignCode === camp.code ||
            c.campaignId === camp.id ||
            (Array.isArray(c.tags) && (c.tags.includes(camp.code) || c.tags.includes(camp.id)))
          );
        });
        const chatReplies = campChats.filter(isChatReplied).length;
        // Count from live chats or from campaign's stored repliedCount
        const replyCount = chatReplies > 0 ? chatReplies : (camp.repliedCount || 0);
        const unansweredChats = campChats.filter(
          (c) => isChatReplied(c) && (c.lastMessageDirection === 'inbound' || (c.unreadCount && c.unreadCount > 0))
        );

        return {
          campaign: camp,
          replyCount,
          liveReplies: chatReplies,
          unansweredCount: unansweredChats.length,
          totalChats: Math.max(camp.sentCount || camp.deliveredCount || 0, campChats.length),
        };
      })
      .filter((item) => item.replyCount > 0);
  }, [campaigns, chats, getChatCampaign, isChatReplied]);

  // Options for campaign filter dropdown: strictly campaigns with >= 1 reply,
  // plus the active campaign if currently selected via URL
  const campaignFilterOptions = useMemo(() => {
    const list = [...campaignsWithReplies];
    if (campaignFilter !== 'all') {
      const alreadyPresent = list.some(
        (item) => item.campaign.code === campaignFilter || item.campaign.id === campaignFilter
      );
      if (!alreadyPresent) {
        const selectedCamp = campaigns.find(
          (c) => c.code === campaignFilter || c.id === campaignFilter
        );
        if (selectedCamp) {
          const campChats = chats.filter((c) => {
            const chCamp = getChatCampaign(c);
            return (
              chCamp?.id === selectedCamp.id ||
              chCamp?.code === selectedCamp.code ||
              c.campaignCode === selectedCamp.code ||
              c.campaignId === selectedCamp.id ||
              (Array.isArray(c.tags) && (c.tags.includes(selectedCamp.code) || c.tags.includes(selectedCamp.id)))
            );
          });
          const chatReplies = campChats.filter(isChatReplied).length;
          const replyCount = chatReplies > 0 ? chatReplies : (selectedCamp.repliedCount || 0);
          const unansweredChats = campChats.filter(
            (c) => isChatReplied(c) && (c.lastMessageDirection === 'inbound' || (c.unreadCount && c.unreadCount > 0))
          );
          list.push({
            campaign: selectedCamp,
            replyCount,
            liveReplies: chatReplies,
            unansweredCount: unansweredChats.length,
            totalChats: Math.max(selectedCamp.sentCount || selectedCamp.deliveredCount || 0, campChats.length),
          });
        }
      }
    }
    return list;
  }, [campaignsWithReplies, campaignFilter, campaigns, chats, getChatCampaign, isChatReplied]);

  // Quick stats for the currently active campaign filter
  const selectedCampaignStats = useMemo(() => {
    if (campaignFilter === 'all') return null;
    const found = campaignFilterOptions.find(
      (item) => item.campaign.code === campaignFilter || item.campaign.id === campaignFilter
    );
    if (found) return found;

    const campChats = chats.filter((c) => {
      const chCamp = getChatCampaign(c);
      return (
        chCamp?.id === campaignFilter ||
        chCamp?.code === campaignFilter ||
        c.campaignCode === campaignFilter ||
        (Array.isArray(c.tags) && c.tags.includes(campaignFilter))
      );
    });
    const chatReplies = campChats.filter(isChatReplied).length;
    const campObj = campaigns.find((c) => c.code === campaignFilter || c.id === campaignFilter);
    const replyCount = chatReplies > 0 ? chatReplies : (campObj?.repliedCount || 0);
    const unanswered = campChats.filter(
      (c) => isChatReplied(c) && (c.lastMessageDirection === 'inbound' || (c.unreadCount && c.unreadCount > 0))
    ).length;
    return {
      campaign: campObj,
      replyCount,
      liveReplies: chatReplies,
      unansweredCount: unanswered,
      totalChats: Math.max(campObj?.sentCount || campObj?.deliveredCount || 0, campChats.length),
    };
  }, [campaignFilter, campaignFilterOptions, chats, getChatCampaign, isChatReplied, campaigns]);

  const activeChat = chats.find((c) => c.id === selectedChatId) || chats[0];
  const activeChatCamp = activeChat ? getChatCampaign(activeChat) : undefined;

  // Load DISCOM EB Bill history for active customer
  useEffect(() => {
    let isCancelled = false;
    const sc = activeChat?.scNumber;

    if (!sc) {
      setCustomerBills([]);
      return;
    }

    setLoadingBills(true);

    const loadBills = async () => {
      try {
        // 1. Fetch from Supabase eb_customer_bills
        const dbBills = await fetchBillsByScNumber(sc).catch(() => []);

        // 2. Fetch locally stored bills for this SC
        const localBills = loadLocalBillsForSc(sc);

        // Merge DB bills and local bills
        const mergedMap = new Map<string, WhatsAppCustomerBill>();
        (dbBills as WhatsAppCustomerBill[]).forEach((b) => {
          const key = b.bill_month ? b.bill_month.trim().toLowerCase() : b.id;
          mergedMap.set(key, b);
        });
        localBills.forEach((b) => {
          const key = b.bill_month ? b.bill_month.trim().toLowerCase() : b.id;
          if (!mergedMap.has(key)) {
            mergedMap.set(key, b);
          }
        });

        let combined = Array.from(mergedMap.values());

        // 3. Fallback to sample bills if neither Supabase nor local has records yet
        if (combined.length === 0 && SAMPLE_SC_BILLS[sc]) {
          combined = SAMPLE_SC_BILLS[sc];
        }

        if (!isCancelled) {
          setCustomerBills(combined);
        }
      } catch (err) {
        console.warn('Failed to load bills for SC:', sc, err);
        if (!isCancelled) setCustomerBills([]);
      } finally {
        if (!isCancelled) setLoadingBills(false);
      }
    };

    loadBills();

    return () => {
      isCancelled = true;
    };
  }, [activeChat?.scNumber, activeChat?.id]);

  // Compute bill stats (Average bill, units, highest usage month, recommended kW)
  const billStats = useMemo(() => {
    if (!customerBills || customerBills.length === 0) return null;

    const validUnits = customerBills
      .filter((b) => b.billed_units != null && !isNaN(Number(b.billed_units)))
      .map((b) => Number(b.billed_units));

    const validAmounts = customerBills
      .filter((b) => b.bill_amount != null && !isNaN(Number(b.bill_amount)))
      .map((b) => Number(b.bill_amount));

    const avgUnits = validUnits.length > 0 ? Math.round(validUnits.reduce((a, b) => a + b, 0) / validUnits.length) : null;
    const avgAmount = validAmounts.length > 0 ? Math.round(validAmounts.reduce((a, b) => a + b, 0) / validAmounts.length) : null;
    const maxUnits = validUnits.length > 0 ? Math.max(...validUnits) : 0;
    const latestBill = customerBills[0];

    let recommendedSolarKw = 3;
    if (avgUnits) {
      if (avgUnits <= 160) recommendedSolarKw = 1;
      else if (avgUnits <= 260) recommendedSolarKw = 2;
      else if (avgUnits <= 390) recommendedSolarKw = 3;
      else if (avgUnits <= 550) recommendedSolarKw = 4;
      else recommendedSolarKw = 5;
    }

    return {
      count: customerBills.length,
      latestBill,
      avgUnits,
      avgAmount,
      maxUnits,
      recommendedSolarKw,
    };
  }, [customerBills]);

  const maxBilledUnits = useMemo(() => {
    if (!customerBills || customerBills.length === 0) return 0;
    return Math.max(...customerBills.map((b) => (b.billed_units != null ? Number(b.billed_units) : 0)));
  }, [customerBills]);

  // Converts English uppercase letters to Blue Unicode regional indicator letters (BlueWords / Stylish Text style)
  const toBlueLetters = (str: string): string => {
    return str.split('').map((char) => {
      const code = char.toUpperCase().charCodeAt(0);
      if (code >= 65 && code <= 90) {
        return String.fromCodePoint(0x1F1E6 + (code - 65)) + '\u200B';
      }
      return char;
    }).join('');
  };

  // Converts digits to math bold unicode characters (𝟏 𝟐 𝟑...)
  const toMathBoldDigits = (str: string): string => {
    return str.split('').map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 48 && code <= 57) {
        return String.fromCodePoint(0x1D7CE + (code - 48));
      }
      return char;
    }).join('');
  };

  const handleCopyWhatsApp = (targetChat?: WhatsAppChat) => {
    const chat = targetChat || activeChat;
    if (!chat) return;
    const areaCode = chat.scNumber ? extractAreaCode(chat.scNumber) : null;
    const parts = [
      `👤 *Customer:* ${chat.customerName || '-'}`,
      `⚡ *SC Number:* ${chat.scNumber || '-'}`,
      areaCode ? `🏢 *Area Code:* ${areaCode}` : null,
      `📱 *Mobile:* +${chat.phoneNumber || '-'}`,
      chat.appliedLoadKw ? `🔌 *Sanctioned Load:* ${chat.appliedLoadKw} KW` : null,
      chat.circleName || chat.mandalName
        ? `📍 *Location:* ${[chat.circleName, chat.mandalName].filter(Boolean).join(', ')}`
        : null,
    ].filter(Boolean);

    const billsToUse = chat.id === activeChat?.id ? customerBills : (chat.scNumber ? loadLocalBillsForSc(chat.scNumber) : []);
    const billLines = billsToUse.map((b) => {
      const month = b.bill_month || '-';
      const rawUnits = b.billed_units != null ? Number(b.billed_units) : null;
      const isMax = rawUnits != null && rawUnits > 0 && rawUnits === maxBilledUnits;
      const amount = b.bill_amount != null ? `₹${Number(b.bill_amount).toLocaleString('en-IN')}` : null;
      if (isMax) {
        const blueMaxBadge = toBlueLetters('MAX UNITS');
        const boldUnits = toMathBoldDigits(rawUnits.toLocaleString('en-IN'));
        const parts = [`🔥 🔵 *[${blueMaxBadge}] ${month}* - *${boldUnits} units*`];
        if (amount) parts.push(`*${amount}* ⚡`);
        return parts.join(' - ');
      }
      const p = [`• ${month}`];
      if (rawUnits != null) p.push(`${rawUnits.toLocaleString('en-IN')} units`);
      if (amount) p.push(amount);
      return p.join(' - ');
    });

    if (billLines.length > 0) {
      parts.push('', '📊 *BILL HISTORY:*', ...billLines);
    }

    navigator.clipboard.writeText(parts.join('\n'));
    setCopiedField(`whatsapp-full-${chat.id}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyAll = (targetChat?: WhatsAppChat) => {
    const chat = targetChat || activeChat;
    if (!chat) return;
    const areaCode = chat.scNumber ? extractAreaCode(chat.scNumber) : null;
    const parts = [
      `Name: ${chat.customerName || '-'}`,
      `SC Number: ${chat.scNumber || '-'}`,
      areaCode ? `Area Code: ${areaCode}` : null,
      `Mobile: +${chat.phoneNumber || '-'}`,
      chat.circleName || chat.mandalName
        ? `Location: ${[chat.circleName, chat.mandalName].filter(Boolean).join(', ')}`
        : null,
    ].filter(Boolean);

    const billsToUse = chat.id === activeChat?.id ? customerBills : (chat.scNumber ? loadLocalBillsForSc(chat.scNumber) : []);
    const billLines = billsToUse.map((b) => {
      const month = b.bill_month || '-';
      const rawUnits = b.billed_units != null ? `${Number(b.billed_units).toLocaleString('en-IN')} units` : null;
      const amount = b.bill_amount != null ? `₹${Number(b.bill_amount).toLocaleString('en-IN')}` : null;
      const p = [month];
      if (rawUnits) p.push(rawUnits);
      if (amount) p.push(amount);
      return p.join(' - ');
    });

    if (billLines.length > 0) {
      parts.push('Bill History:', ...billLines);
    }

    navigator.clipboard.writeText(parts.join('\n'));
    setCopiedField(`all-full-${chat.id}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Handle saving new bill
  const handleSaveNewBill = async () => {
    if (!activeChat?.scNumber) {
      alert('A valid Service Connection Number (SC) is required to record a bill.');
      return;
    }
    const units = parseFloat(newBillUnits) || 0;
    const amount = parseFloat(newBillAmount) || 0;
    if (!amount) {
      alert('Please enter a valid bill amount.');
      return;
    }

    setSavingBill(true);
    try {
      const billPayload: WhatsAppCustomerBill = {
        id: `bill_${Date.now()}`,
        sc_number: activeChat.scNumber,
        eb_customer_id: null,
        bill_month: newBillMonth.trim(),
        bill_year: new Date().getFullYear(),
        bill_month_index: new Date().getMonth() + 1,
        billed_units: units,
        bill_amount: amount,
        bill_status: newBillStatus,
        created_at: new Date().toISOString(),
      };

      try {
        await supabase.from('eb_customer_bills').insert([
          {
            sc_number: activeChat.scNumber,
            bill_month: billPayload.bill_month,
            bill_year: billPayload.bill_year,
            bill_month_index: billPayload.bill_month_index,
            billed_units: units,
            bill_amount: amount,
            bill_status: newBillStatus,
          },
        ]);
      } catch (dbErr) {
        console.warn('Supabase bill insert fallback:', dbErr);
      }

      saveLocalBillForSc(activeChat.scNumber, billPayload);
      setCustomerBills((prev) => [billPayload, ...prev.filter((b) => b.bill_month !== billPayload.bill_month)]);
      setShowAddBillModal(false);
      setNewBillUnits('');
      setNewBillAmount('');
    } catch (err: any) {
      alert('Failed to save bill: ' + (err?.message || 'Unknown error'));
    } finally {
      setSavingBill(false);
    }
  };

  const filteredChats = chats.filter((c) => {
    const matchesSearch =
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phoneNumber.includes(searchQuery) ||
      (c.scNumber && c.scNumber.includes(searchQuery));

    let matchesStatus = true;
    if (statusFilter === 'replied') {
      matchesStatus = isChatReplied(c);
    } else if (statusFilter === 'needs_reply') {
      matchesStatus = c.lastMessageDirection === 'inbound';
    } else if (statusFilter === 'open') {
      matchesStatus = c.status === 'open';
    } else if (statusFilter === 'waiting') {
      matchesStatus = c.status === 'waiting';
    } else if (statusFilter === 'opt_out') {
      matchesStatus = c.status === 'opt_out';
    } else if (statusFilter === 'all') {
      matchesStatus = true;
    }

    let matchesCampaign = true;
    if (campaignFilter !== 'all') {
      const chatCamp = getChatCampaign(c);
      matchesCampaign =
        chatCamp?.code === campaignFilter ||
        chatCamp?.id === campaignFilter ||
        c.campaignCode === campaignFilter ||
        c.campaignId === campaignFilter ||
        (Array.isArray(c.tags) && (c.tags.includes(campaignFilter)));

      // If user selected "Only Chats with Replies", filter to replied chats
      if (matchesCampaign && campaignRepliesOnly) {
        matchesCampaign = isChatReplied(c);
      }
    }

    const matchesAssignment =
      assignmentFilter === 'all' ||
      (assignmentFilter === 'mine' && (c.assignedToUserId === profile?.id || c.assignedToName === profile?.full_name)) ||
      (assignmentFilter === 'unassigned' && !c.assignedToUserId && !c.assignedToName);

    return matchesSearch && matchesStatus && matchesCampaign && matchesAssignment;
  });

  const handleAssignAgent = async (chatId: string, memberId: string, memberName: string) => {
    const assignedUserId = memberId || null;
    const assignedName = memberName || null;

    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? {
              ...c,
              assignedToUserId: assignedUserId || undefined,
              assignedToName: assignedName || undefined,
            }
          : c
      )
    );

    try {
      await supabase
        .from('whatsapp_chats')
        .update({
          assigned_to_user_id: assignedUserId,
          assigned_to_name: assignedName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', chatId);
    } catch (err) {
      console.error('Error assigning chat:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeChat || isSending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    if (sendMode === 'internal_note') {
      const newNote: WhatsAppMessage = {
        id: `note_${Date.now()}`,
        chatId: activeChat.id,
        direction: 'outbound',
        type: 'internal_note',
        content: textToSend,
        senderName: profile?.full_name || 'Staff Member',
        senderPhone: '+91 81211 04043',
        receiverPhone: activeChat.phoneNumber,
        status: 'delivered',
        createdAt: new Date().toISOString(),
      };

      const updatedMsgs = [...messages, newNote];
      setMessages(updatedMsgs);
      saveWhatsAppMessages(activeChat.id, updatedMsgs);

      try {
        await supabase.from('whatsapp_messages').insert({
          id: newNote.id,
          chat_id: activeChat.id,
          direction: 'outbound',
          type: 'internal_note',
          content: textToSend,
          sender_name: profile?.full_name || 'Staff Member',
          sender_phone: '8121104043',
          receiver_phone: activeChat.phoneNumber,
          status: 'delivered',
          created_at: newNote.createdAt,
        });
      } catch (err) {
        console.error('Error saving internal note:', err);
      } finally {
        setIsSending(false);
      }
      return;
    }

    const currentQuote = replyingToMessage;
    setReplyingToMessage(null);
    setSendError(null);

    const newMsg: WhatsAppMessage = {
      id: `msg_${Date.now()}`,
      chatId: activeChat.id,
      direction: 'outbound',
      type: 'text',
      content: textToSend,
      quotedMessage: currentQuote
        ? {
            id: currentQuote.id,
            content: currentQuote.content,
            senderName: currentQuote.senderName,
          }
        : undefined,
      senderName: profile?.full_name || 'Tejo Bharat Solar',
      senderPhone: '+91 81211 04043',
      receiverPhone: activeChat.phoneNumber,
      status: 'sent',
      createdAt: new Date().toISOString(),
    };

    // 1. Optimistic UI update
    const updatedMsgs = [...messages, newMsg];
    setMessages(updatedMsgs);
    saveWhatsAppMessages(activeChat.id, updatedMsgs);

    const updatedChats = chats.map((c) =>
      c.id === activeChat.id
        ? {
            ...c,
            lastMessageText: textToSend,
            lastMessageAt: newMsg.createdAt,
            lastMessageDirection: 'outbound' as const,
          }
        : c
    );
    setChats(updatedChats);
    saveWhatsAppChats(updatedChats);

    try {
      // 2. Send via Meta API
      const res = await sendWhatsAppTextMessage({
        toPhone: activeChat.phoneNumber,
        text: textToSend,
      });

      if (!res.success) {
        console.warn('Meta API text delivery warning:', res.error);
        setSendError(res.error || 'Failed to deliver message via WhatsApp.');
      }

      // 3. Persist to Supabase if tables exist
      await supabase.from('whatsapp_messages').insert({
        id: res.messageId || newMsg.id,
        chat_id: activeChat.id,
        direction: 'outbound',
        type: 'text',
        content: textToSend,
        sender_name: profile?.full_name || 'Tejo Bharat Solar',
        sender_phone: '8121104043',
        receiver_phone: activeChat.phoneNumber,
        status: res.success ? 'sent' : 'failed',
        created_at: newMsg.createdAt,
      });

      await supabase
        .from('whatsapp_chats')
        .update({
          last_message_text: textToSend,
          last_message_at: newMsg.createdAt,
          last_message_direction: 'outbound',
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeChat.id);
    } catch (err: any) {
      console.error('Error sending message:', err);
      setSendError(err.message || 'Network error sending WhatsApp message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendUtilityTemplate = async () => {
    if (!activeChat) return;
    const template = DEFAULT_TEMPLATES.find((t) => t.category === 'UTILITY') || DEFAULT_TEMPLATES[0];
    setIsSending(true);
    setSendError(null);
    try {
      const res = await sendWhatsAppTemplateMessage({
        toPhone: activeChat.phoneNumber,
        template,
        variablesData: {
          customer_name: activeChat.customerName || 'Valued Customer',
          sc_number: activeChat.scNumber || 'APEPDCL-Connection',
          mandal_name: activeChat.mandalName || 'Pithapuram',
        },
      });
      if (res.success) {
        const tplMsg: WhatsAppMessage = {
          id: res.messageId || `msg_${Date.now()}`,
          chatId: activeChat.id,
          direction: 'outbound',
          type: 'template',
          templateName: template.name,
          content: template.bodyText,
          senderName: 'Tejo Bharat Solar',
          senderPhone: '+91 81211 04043',
          receiverPhone: activeChat.phoneNumber,
          status: 'sent',
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, tplMsg]);
        await supabase.from('whatsapp_messages').insert({
          id: tplMsg.id,
          chat_id: activeChat.id,
          direction: 'outbound',
          type: 'template',
          content: template.bodyText,
          sender_name: 'Tejo Bharat Solar',
          sender_phone: '8121104043',
          receiver_phone: activeChat.phoneNumber,
          status: 'sent',
          created_at: tplMsg.createdAt,
        });
      } else {
        setSendError(res.error || 'Failed to send template message.');
      }
    } catch (e: any) {
      setSendError(e.message || 'Error sending utility template.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSimulateIncomingReply = (targetPhone: string = '9000273028') => {
    const is9000 = targetPhone.includes('9000273028');
    const testChatId = is9000 ? 'chat_9000273028' : 'chat_9479797947';
    const testPhone = is9000 ? '9000273028' : '9479797947';
    const testName = is9000 ? 'Durga Rao (Pithapuram)' : 'Tejo Bharat Office';
    const sampleText = is9000
      ? 'నమస్కారం! మా ఇంటికి 3 kW సోలార్ సైట్ సర్వే ఎప్పుడు వస్తారు? లొకేషన్ డీటెయిల్స్ పంపమంటారా?'
      : 'Site survey completed. Please proceed with DISCOM net metering documentation.';

    const newInboundMsg: WhatsAppMessage = {
      id: `msg_${Date.now()}`,
      chatId: testChatId,
      direction: 'inbound',
      type: 'text',
      content: sampleText,
      senderName: testName,
      senderPhone: `+91 ${testPhone}`,
      receiverPhone: '+91 81211 04043',
      status: 'delivered',
      createdAt: new Date().toISOString(),
    };

    setRepliedChatIds((prev) => new Set([...prev, testChatId]));

    setChats((prev) => {
      const existing = prev.find((c) => c.id === testChatId);
      const existingTags = existing?.tags || [];
      const updatedTags = Array.from(new Set([...existingTags, 'replied']));
      const updatedChat: WhatsAppChat = existing
        ? {
            ...existing,
            lastMessageText: sampleText,
            lastMessageAt: newInboundMsg.createdAt,
            lastMessageDirection: 'inbound',
            unreadCount: (existing.unreadCount || 0) + 1,
            status: 'open',
            tags: updatedTags,
          }
        : {
            id: testChatId,
            customerName: testName,
            phoneNumber: testPhone,
            scNumber: is9000 ? '1982530714008888' : '1982530714009999',
            circleName: is9000 ? 'KAKINADA' : 'HYDERABAD',
            mandalName: is9000 ? 'PITHAPURAM' : 'MOOSAPET',
            appliedLoadKw: is9000 ? 5 : 10,
            lastMessageText: sampleText,
            lastMessageAt: newInboundMsg.createdAt,
            lastMessageDirection: 'inbound',
            unreadCount: 1,
            status: 'open',
            tags: [is9000 ? 'Surya Ghar 5kW' : 'Commercial 10kW', is9000 ? 'Pithapuram' : 'Office', 'replied'],
          };

      const others = prev.filter((c) => c.id !== testChatId);
      const combined = [updatedChat, ...others];
      saveWhatsAppChats(combined);
      return combined;
    });

    setSelectedChatId(testChatId);

    setMessages(() => {
      const existingMsgs = loadWhatsAppMessages(testChatId);
      const updated = [...existingMsgs, newInboundMsg];
      saveWhatsAppMessages(testChatId, updated);
      return updated;
    });
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_TABLE_SETUP);
    setHasCopiedSql(true);
    setTimeout(() => setHasCopiedSql(false), 3000);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[80vh]">
      {/* Persistent Cloud Sync Status Header Bar */}
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {dbTablesReady === true ? (
            <span className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-100/90 px-2.5 py-0.5 rounded-full text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Cloud Sync Connected
            </span>
          ) : dbTablesReady === false ? (
            <span className="flex items-center gap-1.5 text-amber-800 font-semibold bg-amber-100/90 px-2.5 py-0.5 rounded-full text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              Supabase Tables Missing
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-gray-600 bg-gray-200 px-2.5 py-0.5 rounded-full text-[11px]">
              <Loader2 className="w-3 h-3 animate-spin" />
              Checking Cloud Connection...
            </span>
          )}
          <span className="text-gray-300 hidden sm:inline">|</span>
          <span className="text-[11px] text-gray-500 hidden sm:inline">
            Receiving messages sent to <strong className="text-gray-700 font-mono">+91 81211 04043</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSimulateIncomingReply()}
            className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-md flex items-center gap-1.5 shadow-2xs transition-colors"
            title="Simulate receiving an incoming WhatsApp message"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            + Test Incoming Reply
          </button>

          <button
            type="button"
            onClick={() => setShowCostModal(true)}
            className="px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            Cost & Usage (₹)
          </button>

          <button
            type="button"
            onClick={() => setShowSqlModal(true)}
            className="px-2.5 py-1 text-xs font-semibold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-purple-600" />
            Supabase SQL Setup
          </button>
        </div>
      </div>

      {/* Real-time Incoming Message Alert Banner */}
      {newIncomingAlert && (
        <div className="px-4 py-2 bg-emerald-700 text-white text-xs flex items-center justify-between gap-3 shadow-md border-b border-emerald-800">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 bg-white/20 rounded-full flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            </span>
            <div className="truncate">
              <span className="font-bold">New message from {newIncomingAlert.customerName}</span>
              <span className="font-mono text-emerald-200 ml-1">(+{newIncomingAlert.phone})</span>:
              <span className="italic ml-1 opacity-95">"{newIncomingAlert.text}"</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => {
                setSelectedChatId(newIncomingAlert.chatId);
                setStatusFilter('all');
                setNewIncomingAlert(null);
              }}
              className="px-2.5 py-1 bg-white text-emerald-800 rounded font-bold hover:bg-emerald-50 text-[11px] shadow-2xs transition-colors"
            >
              Open Chat
            </button>
            <button
              onClick={() => setNewIncomingAlert(null)}
              className="text-white/80 hover:text-white p-1"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Conversation List */}
        <div className="w-full sm:w-80 md:w-96 border-r border-gray-200 flex flex-col bg-gray-50/50 flex-shrink-0">
          {/* Search & Filter Header */}
          <div className="p-3 border-b border-gray-200 bg-white space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search name, phone, or SC number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 bg-gray-100/70 border border-gray-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  clearLocalWhatsAppChats();
                  setChats([]);
                  setMessages([]);
                  setSelectedChatId('');
                  setIsLoading(true);
                  fetchChats().finally(() => setTimeout(() => setIsLoading(false), 400));
                }}
                title="Clear demo mock data and refresh live inbox"
                className="px-2 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-[11px] font-medium flex items-center gap-1 whitespace-nowrap shadow-2xs"
              >
                Clear Demo Data
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsLoading(true);
                  fetchChats().finally(() => setTimeout(() => setIsLoading(false), 500));
                }}
                disabled={isLoading}
                title="Refresh Inbox"
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 text-[11px] overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-1 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                  statusFilter === 'all'
                    ? 'bg-gray-800 text-white shadow-2xs font-semibold'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                All
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${statusFilter === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  {chats.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('replied')}
                className={`px-2 py-1 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                  statusFilter === 'replied'
                    ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                    : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-medium border border-emerald-200/80'
                }`}
                title="Filter conversations where customers have replied"
              >
                <Reply className="w-3 h-3 text-emerald-600" />
                With Replies
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${statusFilter === 'replied' ? 'bg-emerald-800 text-white' : 'bg-emerald-600 text-white'}`}>
                  {repliedChatsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('needs_reply')}
                className={`px-2 py-1 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                  statusFilter === 'needs_reply'
                    ? 'bg-amber-600 text-white shadow-2xs font-semibold'
                    : 'text-amber-800 bg-amber-50 hover:bg-amber-100 font-medium border border-amber-200/80'
                }`}
                title="Customer sent the last message - waiting for your reply"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                Needs Reply
                {needsReplyCount > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold animate-pulse ${statusFilter === 'needs_reply' ? 'bg-amber-800 text-white' : 'bg-amber-500 text-white'}`}>
                    {needsReplyCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('open')}
                className={`px-2 py-1 rounded-md capitalize font-medium whitespace-nowrap transition-colors ${
                  statusFilter === 'open'
                    ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Open ({openChatsCount})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('waiting')}
                className={`px-2 py-1 rounded-md capitalize font-medium whitespace-nowrap transition-colors ${
                  statusFilter === 'waiting'
                    ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Waiting ({waitingChatsCount})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('opt_out')}
                className={`px-2 py-1 rounded-md capitalize font-medium whitespace-nowrap transition-colors ${
                  statusFilter === 'opt_out'
                    ? 'bg-red-600 text-white shadow-2xs font-semibold'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Opt-Out ({optOutChatsCount})
              </button>
            </div>

            {/* Campaign Filter Row */}
            <div className="pt-1.5 border-t border-gray-100 flex items-center gap-1.5 text-[11px]">
              <span className="text-[10px] text-purple-700 font-bold flex items-center gap-1 flex-shrink-0">
                <Tag className="w-3 h-3 text-purple-600" /> Campaign:
              </span>
              <select
                value={campaignFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setCampaignFilter(val);
                  if (val === 'all') {
                    setCampaignRepliesOnly(false);
                  } else {
                    const stats = campaignFilterOptions.find((o) => o.campaign.code === val || o.campaign.id === val);
                    setCampaignRepliesOnly((stats?.replyCount ?? 0) > 0);
                  }
                }}
                className={`flex-1 min-w-0 rounded px-2 py-1 text-[11px] font-semibold border transition-colors cursor-pointer truncate ${
                  campaignFilter !== 'all'
                    ? 'bg-purple-50 text-purple-900 border-purple-300 ring-1 ring-purple-400'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
                title="Filter conversations by Broadcast Campaigns with replies"
              >
                <option value="all">
                  {campaignsWithReplies.length > 0
                    ? `📢 All Campaigns with Replies (${campaignsWithReplies.length})`
                    : '📢 All Campaigns (0 with replies)'}
                </option>
                {campaignFilterOptions.map(({ campaign: camp, replyCount, unansweredCount }) => (
                  <option key={camp.id} value={camp.code || camp.id}>
                    [{camp.code}] {camp.name} ({replyCount} {replyCount === 1 ? 'reply' : 'replies'}{(unansweredCount ?? 0) > 0 ? ` • 🔴 ${unansweredCount} unreplied` : ''})
                  </option>
                ))}
              </select>
              {campaignFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setCampaignFilter('all')}
                  className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors cursor-pointer"
                  title="Clear Campaign Filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sub-filter: Only with Replies vs All Broadcast Chats */}
            {campaignFilter !== 'all' && (
              <div className="pt-1.5 pb-0.5 flex flex-col gap-1.5 border-t border-purple-100">
                <div className="flex items-center gap-1 bg-purple-50/80 p-1 rounded-lg border border-purple-200">
                  <button
                    type="button"
                    onClick={() => setCampaignRepliesOnly(true)}
                    className={`flex-1 py-1 px-2 rounded-md font-semibold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      campaignRepliesOnly
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'text-purple-700 hover:bg-purple-100'
                    }`}
                    title="Show only contacts that replied to this broadcast"
                  >
                    <Reply className="w-3 h-3" />
                    Only Replies ({selectedCampaignStats?.replyCount || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCampaignRepliesOnly(false)}
                    className={`flex-1 py-1 px-2 rounded-md font-semibold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      !campaignRepliesOnly
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'text-purple-700 hover:bg-purple-100'
                    }`}
                    title="Show all contacts broadcasted in this campaign"
                  >
                    <Users className="w-3 h-3" />
                    All Broadcast ({selectedCampaignStats?.totalChats || 0})
                  </button>
                </div>

                {selectedCampaignStats && (
                  <div className="flex items-center justify-between px-1 text-[10px]">
                    <span className="text-purple-800 font-mono font-bold truncate">
                      {selectedCampaignStats.campaign?.code || campaignFilter}
                    </span>
                    {(selectedCampaignStats.unansweredCount ?? 0) > 0 ? (
                      <span className="text-red-700 font-bold bg-red-100 px-1.5 py-0.2 rounded-full border border-red-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        {selectedCampaignStats.unansweredCount} awaiting reply
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> All replied
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Assignment Filter Tabs */}
            <div className="flex items-center gap-1 text-[11px] pt-1.5 border-t border-gray-100">
              <span className="text-[10px] text-gray-400 font-semibold mr-1 flex items-center gap-1">
                <Users className="w-3 h-3 text-gray-500" /> Team:
              </span>
              {(['all', 'mine', 'unassigned'] as const).map((af) => (
                <button
                  key={af}
                  onClick={() => setAssignmentFilter(af)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    assignmentFilter === af
                      ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {af === 'all' ? 'All' : af === 'mine' ? 'Mine' : 'Unassigned'}
                </button>
              ))}
            </div>
          </div>

          {/* Chat List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredChats.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400 space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-gray-300" />
                {campaignFilter !== 'all' ? (
                  campaignRepliesOnly ? (
                    <div className="space-y-2">
                      <p className="font-semibold text-gray-700">
                        No customer replies received yet for [{campaignFilter}].
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {selectedCampaignStats?.totalChats || 0} broadcast messages were sent to recipients.
                      </p>
                      <button
                        type="button"
                        onClick={() => setCampaignRepliesOnly(false)}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 text-white hover:bg-purple-800 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        View All {selectedCampaignStats?.totalChats || 0} Broadcast Contacts
                      </button>
                    </div>
                  ) : (
                    <p className="font-semibold text-gray-600">
                      No conversations matching campaign [{campaignFilter}].
                    </p>
                  )
                ) : (
                  <p className="font-semibold text-gray-600">
                    {statusFilter === 'replied'
                      ? 'No conversations with customer replies found.'
                      : statusFilter === 'needs_reply'
                      ? 'No chats waiting for reply — all caught up!'
                      : 'No conversations found.'}
                  </p>
                )}
                {campaignFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => {
                      setCampaignFilter('all');
                      setCampaignRepliesOnly(false);
                    }}
                    className="text-xs text-purple-700 hover:text-purple-900 font-semibold underline block mx-auto pt-1"
                  >
                    Clear Campaign Filter
                  </button>
                )}
                <p className="text-[10px] text-gray-400">
                  {statusFilter === 'replied'
                    ? 'When leads reply to WhatsApp broadcasts, their chats will appear here.'
                    : 'Send a WhatsApp message from your phone to +91 81211 04043 to test live chats!'}
                </p>
                <button
                  type="button"
                  onClick={() => handleSimulateIncomingReply()}
                  className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors border border-emerald-200"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Simulate Test Incoming Reply
                </button>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = chat.id === selectedChatId;
                const isReplied = isChatReplied(chat);
                const isCustomerLatest = chat.lastMessageDirection === 'inbound';
                const chatCamp = getChatCampaign(chat);

                return (
                  <div
                    key={chat.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedChatId(chat.id)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors relative cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/70 border-l-4 border-emerald-600'
                        : isCustomerLatest
                        ? 'bg-amber-50/30 hover:bg-amber-50/60 border-l-4 border-amber-500'
                        : isReplied
                        ? 'hover:bg-gray-100/70 border-l-2 border-emerald-300'
                        : 'hover:bg-gray-100/70'
                    }`}
                  >
                    <div className="relative">
                      <div
                        className={`w-10 h-10 rounded-full font-bold flex items-center justify-center flex-shrink-0 text-xs shadow-2xs ${
                          isCustomerLatest
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {chat.customerName.charAt(0)}
                      </div>
                      {isCustomerLatest && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-amber-500 border-2 border-white rounded-full"
                          title="Customer waiting for reply"
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-gray-900 truncate flex items-center gap-1.5">
                          {chat.customerName}
                          {isCustomerLatest && (
                            <span className="text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300/80 px-1.5 py-0.2 rounded-full inline-flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                              Reply Received
                            </span>
                          )}
                          {!isCustomerLatest && isReplied && (
                            <span className="text-[9px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 py-0.2 rounded inline-flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              Replied
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          {new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-gray-500 block">
                          +{chat.phoneNumber}
                        </span>

                        {chat.scNumber && (
                          <span className="text-[10px] font-mono text-purple-700 font-semibold block">
                            SC: {chat.scNumber}
                          </span>
                        )}

                        {chatCamp && (
                          <span
                            className="text-[9px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200/80 px-1.5 py-0.2 rounded inline-flex items-center gap-1 shadow-2xs"
                            title={`Originating Campaign: ${chatCamp.name}`}
                          >
                            <Tag className="w-2.5 h-2.5 text-purple-600" />
                            {chatCamp.code}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-600 truncate mt-0.5">
                        {isCustomerLatest ? (
                          <span className="font-semibold text-emerald-700 inline-flex items-center gap-1">
                            <Reply className="w-3 h-3 rotate-180 text-emerald-600 flex-shrink-0" />
                            {chat.lastMessageText || 'Customer replied'}
                          </span>
                        ) : (
                          <span className="text-gray-500">
                            {chat.lastMessageDirection === 'outbound' ? 'You: ' : ''}
                            {chat.lastMessageText}
                          </span>
                        )}
                      </p>

                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {chat.mandalName && (
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded">
                            {chat.mandalName}
                          </span>
                        )}
                        {chat.appliedLoadKw && (
                          <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                            {chat.appliedLoadKw} kW
                          </span>
                        )}
                        {chat.assignedToName ? (
                          <span className="text-[9px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 rounded px-1.5 py-0.2 flex items-center gap-1">
                            <UserCheck className="w-2.5 h-2.5" />
                            {chat.assignedToName.split(' ')[0]}
                          </span>
                        ) : (
                          <span className="text-[9px] text-gray-400 italic">Unassigned</span>
                        )}
                        {chat.unreadCount > 0 && (
                          <span className="ml-auto text-[10px] font-bold bg-emerald-600 text-white rounded-full px-1.5 py-0.2 shadow-2xs">
                            {chat.unreadCount} new
                          </span>
                        )}
                      </div>

                      {/* Copy options for WhatsApp & plain text on the left card */}
                      <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleCopyWhatsApp(chat)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                            copiedField === `whatsapp-full-${chat.id}`
                              ? 'bg-green-100 text-green-700 font-bold'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                          }`}
                          title="Copy for WhatsApp (formatted with bill history)"
                        >
                          {copiedField === `whatsapp-full-${chat.id}` ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <MessageCircle className="w-3 h-3 text-emerald-600" />
                          )}
                          {copiedField === `whatsapp-full-${chat.id}` ? 'Copied WA!' : 'Copy WA'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyAll(chat)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                            copiedField === `all-full-${chat.id}`
                              ? 'bg-green-100 text-green-700 font-bold'
                              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
                          }`}
                          title="Copy All (Plain text name, SC, mobile, bills)"
                        >
                          {copiedField === `all-full-${chat.id}` ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <ClipboardList className="w-3 h-3 text-blue-600" />
                          )}
                          {copiedField === `all-full-${chat.id}` ? 'Copied All!' : 'Copy All'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CENTER COLUMN: Realtime Live Chat */}
        {activeChat ? (
          <div className="flex-1 flex flex-col bg-[#efeae2]/30 min-w-0">
            {/* Chat Header */}
            <div className="p-3.5 bg-white border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                  {activeChat.customerName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                    {activeChat.customerName}
                    <span className="text-[10px] font-mono font-normal text-gray-500">
                      (+{activeChat.phoneNumber})
                    </span>
                    <a
                      href={`tel:${activeChat.phoneNumber}`}
                      className="p-1 rounded-md hover:bg-green-50 text-green-600 transition-colors"
                      title="Click to Call"
                    >
                      <Phone className="w-3 h-3" />
                    </a>
                    <button
                      onClick={() => copyToClipboard(activeChat.phoneNumber, 'header-phone')}
                      className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                      title="Copy Phone Number"
                    >
                      {copiedField === 'header-phone' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                    {activeChat.lastMessageDirection === 'inbound' && (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.2 rounded-full flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                        Awaiting Your Reply
                      </span>
                    )}
                    {activeChat.lastMessageDirection !== 'inbound' && isChatReplied(activeChat) && (
                      <span className="text-[10px] font-medium text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.2 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                        Customer Engaged
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Online via WhatsApp Cloud API
                    </span>
                    {activeChatCamp && (
                      <span
                        className="text-[10px] font-medium text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.2 rounded-md flex items-center gap-1"
                        title={`Broadcast Campaign: ${activeChatCamp.name}`}
                      >
                        <Tag className="w-2.5 h-2.5 text-purple-600" />
                        Campaign: <strong className="font-mono">{activeChatCamp.code}</strong>
                        <span className="text-purple-400">·</span>
                        <span className="truncate max-w-[160px]">{activeChatCamp.name}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Copy for WhatsApp & Copy All in active chat header */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopyWhatsApp(activeChat)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border ${
                      copiedField === `whatsapp-full-${activeChat.id}`
                        ? 'bg-green-100 text-green-700 border-green-300'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                    }`}
                    title="Copy formatted customer info & bill history ready for WhatsApp"
                  >
                    {copiedField === `whatsapp-full-${activeChat.id}` ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    {copiedField === `whatsapp-full-${activeChat.id}` ? 'Copied for WhatsApp!' : 'Copy for WhatsApp'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyAll(activeChat)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border ${
                      copiedField === `all-full-${activeChat.id}`
                        ? 'bg-green-100 text-green-700 border-green-300'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                    }`}
                    title="Copy name, SC number, mobile, address and bill history (plain text)"
                  >
                    {copiedField === `all-full-${activeChat.id}` ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
                    )}
                    {copiedField === `all-full-${activeChat.id}` ? 'Copied All!' : 'Copy All'}
                  </button>
                </div>

                {/* Agent Assignment Selector */}
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs">
                  <Users className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-[10px] text-gray-500 font-medium">Assigned:</span>
                  <select
                    value={activeChat.assignedToUserId || ''}
                    onChange={(e) => {
                      const selected = teamMembers.find((t) => t.id === e.target.value);
                      handleAssignAgent(activeChat.id, e.target.value, selected?.fullName || '');
                    }}
                    className="bg-transparent text-gray-800 text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="">👤 Unassigned</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 24-hr Service Window Indicator */}
                {activeChat.lastMessageDirection === 'inbound' ? (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200"
                    title="Customer messaged recently. Freeform two-way replies are completely free!"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    24h Window Active
                  </span>
                ) : (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 flex items-center gap-1 border border-gray-200"
                    title="Customer has not replied in 24 hours. Send a utility template to re-engage."
                  >
                    <Clock className="w-3 h-3 text-gray-500" />
                    24h Window Inactive
                  </span>
                )}

                {/* Status Ticks Legend */}
                <div
                  className="hidden xl:flex items-center gap-2 text-[10px] text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md"
                  title="Official WhatsApp Status Ticks"
                >
                  <span className="flex items-center gap-0.5 text-gray-500" title="Sent to WhatsApp Cloud">
                    <Check className="w-3 h-3 text-gray-400" /> Sent
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5 text-gray-500" title="Delivered to customer phone">
                    <CheckCheck className="w-3 h-3 text-gray-400 stroke-[2]" /> Delivered
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5 font-bold text-[#53bdeb]" title="Read / Seen by customer">
                    <CheckCheck className="w-3 h-3 text-[#53bdeb] stroke-[2.5]" /> Read (Blue)
                  </span>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    activeChat.status === 'opt_out'
                      ? 'bg-red-100 text-red-800'
                      : activeChat.status === 'waiting'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {activeChat.status}
                </span>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => {
                if (m.type === 'internal_note') {
                  return (
                    <div
                      key={m.id}
                      className="mx-auto max-w-lg w-full bg-amber-50/90 border border-amber-300/80 rounded-xl p-3 text-xs shadow-2xs my-1"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 mb-1 border-b border-amber-200/80 pb-1">
                        <span className="flex items-center gap-1.5">
                          <StickyNote className="w-3.5 h-3.5 text-amber-700" />
                          Internal Staff Note • {m.senderName || 'Staff Member'}
                        </span>
                        <span className="text-[10px] text-amber-700 font-normal">
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-amber-950 font-medium whitespace-pre-wrap">{m.content}</p>
                      <div className="mt-1 text-[9px] text-amber-700/80 italic flex items-center gap-1">
                        🔒 Visible only to internal CRM team (customer cannot see this)
                      </div>
                    </div>
                  );
                }

                const isOutbound = m.direction === 'outbound';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col group relative ${isOutbound ? 'items-end' : 'items-start'}`}
                  >
                    <div className="relative group max-w-md">
                      {/* Hover Action Menu for Quick Reply and Copy */}
                      <div
                        className={`absolute top-1 z-10 hidden group-hover:flex items-center gap-0.5 bg-white/95 border border-gray-200 shadow-sm rounded-md px-1 py-0.5 transition-opacity ${
                          isOutbound ? '-left-16' : '-right-16'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingToMessage(m);
                            inputRef.current?.focus();
                          }}
                          className="p-1 hover:bg-emerald-50 hover:text-emerald-700 text-gray-500 rounded transition-colors"
                          title="Reply to this message"
                        >
                          <Reply className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(m.content);
                            setCopiedMsgId(m.id);
                            setTimeout(() => setCopiedMsgId(null), 2000);
                          }}
                          className="p-1 hover:bg-emerald-50 hover:text-emerald-700 text-gray-500 rounded transition-colors"
                          title="Copy text"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>

                      {copiedMsgId === m.id && (
                        <span className="absolute -top-5 right-0 text-[10px] bg-gray-800 text-white px-1.5 py-0.5 rounded shadow z-20">
                          Copied!
                        </span>
                      )}

                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-xs shadow-2xs whitespace-pre-wrap ${
                          isOutbound
                            ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-xs'
                            : 'bg-white text-gray-900 rounded-tl-xs border border-gray-100'
                        }`}
                      >
                        {/* Quoted Message Header if this is a reply */}
                        {m.quotedMessage && (
                          <div className="mb-2 p-1.5 rounded-lg bg-black/[0.05] border-l-3 border-emerald-600 text-[11px] overflow-hidden">
                            <span className="font-bold text-emerald-800 text-[10px] block">
                              {m.quotedMessage.senderName || 'Customer'}
                            </span>
                            <p className="line-clamp-2 text-gray-700 italic text-[10px]">
                              "{m.quotedMessage.content}"
                            </p>
                          </div>
                        )}

                        {m.type === 'button_reply' && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded mb-1.5 w-fit">
                            <Check className="w-3 h-3" /> Button Clicked
                          </div>
                        )}

                        <p className="leading-relaxed">{m.content}</p>

                        <div className="flex items-center justify-end gap-1.5 mt-1 text-[9px] text-gray-400">
                          <span>
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isOutbound && (
                            <div className="flex items-center">
                              {m.status === 'read' ? (
                                <span title="Read by customer (Blue double tick)" className="flex items-center text-[#53bdeb]">
                                  <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                                </span>
                              ) : m.status === 'delivered' ? (
                                <span title="Delivered to phone (Double grey tick)" className="flex items-center text-gray-400">
                                  <CheckCheck className="w-3.5 h-3.5 stroke-[2]" />
                                </span>
                              ) : m.status === 'failed' ? (
                                <span title="Delivery failed" className="flex items-center text-red-500">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                </span>
                              ) : (
                                <span title="Sent to WhatsApp Cloud (Single grey tick)" className="flex items-center text-gray-400">
                                  <Check className="w-3.5 h-3.5 stroke-[2]" />
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Mode Switcher */}
            <div className="px-4 py-1.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSendMode('message')}
                  className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-colors ${
                    sendMode === 'message'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-gray-600 hover:bg-gray-200/70'
                  }`}
                >
                  <MessageSquare className="w-3 h-3" />
                  WhatsApp Reply
                </button>
                <button
                  type="button"
                  onClick={() => setSendMode('internal_note')}
                  className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-colors ${
                    sendMode === 'internal_note'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-gray-600 hover:bg-gray-200/70'
                  }`}
                >
                  <StickyNote className="w-3 h-3" />
                  Internal Staff Note
                </button>
              </div>

              {sendMode === 'internal_note' && (
                <span className="text-[10px] text-amber-700 font-medium hidden sm:inline flex items-center gap-1">
                  🔒 Handover notes visible only inside CRM
                </span>
              )}
            </div>

            {/* Quick Templates Chips (Only show if sendMode is message) */}
            {sendMode === 'message' && (
              <div className="px-4 py-1.5 bg-white/80 border-t border-gray-100 flex items-center gap-2 overflow-x-auto text-[11px]">
                <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" /> Quick Replies:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setInputText(
                      'నమస్కారం! మీ సైట్ సర్వే రేపు ఉదయం 10:00 గంటలకు షెడ్యూల్ చేయబడింది. మా ఇంజనీర్ లొకేషన్ కు వస్తారు.'
                    )
                  }
                  className="px-2 py-0.5 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 rounded text-gray-700 whitespace-nowrap transition-colors"
                >
                  📅 Schedule Survey (Telugu)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setInputText(
                      'Hello! Here are the details for your 3 kW Rooftop Solar system with ₹78,000 subsidy.'
                    )
                  }
                  className="px-2 py-0.5 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 rounded text-gray-700 whitespace-nowrap transition-colors"
                >
                  ⚡ 3kW Subsidy Details (English)
                </button>
              </div>
            )}

            {/* WhatsApp Quoted Reply Banner */}
            {replyingToMessage && (
              <div className="px-4 py-2 bg-emerald-50/90 border-t border-emerald-200 flex items-center justify-between text-xs animate-in fade-in duration-150">
                <div className="flex items-start gap-2 border-l-3 border-emerald-600 pl-2.5 overflow-hidden">
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-1 font-bold text-emerald-800 text-[11px]">
                      <Reply className="w-3 h-3" />
                      <span>Replying to {replyingToMessage.senderName || 'Customer'}</span>
                    </div>
                    <p className="text-[11px] text-gray-600 truncate max-w-lg">
                      "{replyingToMessage.content}"
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingToMessage(null)}
                  className="text-gray-400 hover:text-gray-700 p-1 rounded-md"
                  title="Cancel reply"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Error / 24h Window Notice Banner */}
            {sendError && (
              <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-[11px] leading-tight">{sendError}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSendUtilityTemplate}
                    disabled={isSending}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow-2xs transition-colors flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3" /> Send Utility Template
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendError(null)}
                    className="text-amber-500 hover:text-amber-800 p-0.5"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Text Input Footer */}
            <div
              className={`p-3 border-t transition-colors flex items-center gap-2 ${
                sendMode === 'internal_note'
                  ? 'bg-amber-50/70 border-amber-200'
                  : 'bg-white border-gray-200'
              }`}
            >
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={
                  sendMode === 'internal_note'
                    ? `Add an internal staff note for ${activeChat.customerName}... (not sent to customer)`
                    : replyingToMessage
                    ? `Replying to ${replyingToMessage.senderName || 'Customer'}...`
                    : `Message ${activeChat.customerName}... (Sends via WhatsApp)`
                }
                disabled={isSending}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 ${
                  sendMode === 'internal_note'
                    ? 'bg-white border border-amber-300 focus:ring-amber-500 text-amber-950 placeholder-amber-400'
                    : 'bg-gray-50 border border-gray-200 focus:bg-white focus:ring-emerald-500'
                }`}
              />

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isSending}
                className={`p-2.5 rounded-lg shadow-sm transition-colors disabled:opacity-50 text-white font-medium ${
                  sendMode === 'internal_note'
                    ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                }`}
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : sendMode === 'internal_note' ? (
                  <StickyNote className="w-4 h-4" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/40">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-gray-800 mb-1">WhatsApp Shared Inbox</h3>
            <p className="text-xs text-gray-500 max-w-sm mb-3">
              No conversation selected or no live customer messages yet.
            </p>
            <p className="text-[11px] text-gray-400 max-w-md">
              When customers message your registered WhatsApp number (<strong>+91 81211 04043</strong>), live chats will automatically appear here.
            </p>
          </div>
        )}

        {/* RIGHT COLUMN: PM Surya Ghar Customer Context Panel */}
        {activeChat && (
          <div className="hidden lg:flex w-72 xl:w-80 border-l border-gray-200 bg-white flex-col p-5 overflow-y-auto space-y-5 flex-shrink-0">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-lg shadow-sm mx-auto mb-2">
                {activeChat.customerName.charAt(0)}
              </div>
              <h4 className="font-bold text-sm text-gray-900">{activeChat.customerName}</h4>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="text-xs text-gray-600 font-mono">+{activeChat.phoneNumber}</span>
                <a
                  href={`tel:${activeChat.phoneNumber}`}
                  className="p-1 rounded-md bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                  title="Click to Call"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => copyToClipboard(activeChat.phoneNumber, 'chat-phone')}
                  className="p-1 rounded-md bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors"
                  title="Copy Phone Number"
                >
                  {copiedField === 'chat-phone' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Copy for WhatsApp and Copy All in Profile panel */}
              <div className="flex items-center justify-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => handleCopyWhatsApp(activeChat)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                    copiedField === `whatsapp-full-${activeChat.id}`
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                  }`}
                  title="Copy formatted customer info & bill history ready for WhatsApp"
                >
                  {copiedField === `whatsapp-full-${activeChat.id}` ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  {copiedField === `whatsapp-full-${activeChat.id}` ? 'Copied!' : 'WhatsApp'}
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyAll(activeChat)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                    copiedField === `all-full-${activeChat.id}`
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                  }`}
                  title="Copy name, SC number, mobile, address and bill history (plain text)"
                >
                  {copiedField === `all-full-${activeChat.id}` ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  {copiedField === `all-full-${activeChat.id}` ? 'Copied!' : 'Copy All'}
                </button>
              </div>
            </div>

            {/* PM Surya Ghar Details Card with Integrated Bill History */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2 text-xs">
              <span className="font-bold text-amber-950 flex items-center justify-between border-b border-amber-200/60 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  Customer Solar Profile
                </span>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full border border-amber-300">
                  PM Surya Ghar
                </span>
              </span>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Service No:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold font-mono text-gray-900">{activeChat.scNumber || '-'}</span>
                  {activeChat.scNumber && (
                    <button
                      onClick={() => copyToClipboard(activeChat.scNumber!, 'chat-sc')}
                      className="p-1 rounded-md bg-amber-100/70 text-amber-800 hover:bg-amber-200 transition-colors"
                      title="Copy Service Number"
                    >
                      {copiedField === 'chat-sc' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Applied Load:</span>
                <span className="font-bold text-emerald-800">{activeChat.appliedLoadKw || 3} kW</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Max Subsidy:</span>
                <span className="font-bold text-emerald-800">₹78,000</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Circle / District:</span>
                <span className="font-medium text-gray-800">{activeChat.circleName || 'APEPDCL'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Mandal:</span>
                <span className="font-medium text-gray-800">{activeChat.mandalName || 'Pithapuram'}</span>
              </div>

              {/* Integrated DISCOM Bill History Section */}
              <div className="border-t border-amber-200/80 pt-2.5 mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-amber-700" />
                    Bill History
                  </span>
                  <div className="flex items-center gap-1.5">
                    {customerBills.length > 0 && (
                      <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                        {customerBills.length} {customerBills.length === 1 ? 'Month' : 'Months'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowAddBillModal(true)}
                      title="Record Electricity Bill"
                      className="text-[10px] font-medium text-amber-800 hover:text-amber-950 bg-amber-100/80 hover:bg-amber-200 px-1.5 py-0.5 rounded transition-colors flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Add
                    </button>
                  </div>
                </div>

                {loadingBills ? (
                  <div className="flex items-center justify-center py-2 text-gray-400 gap-1.5 text-[11px]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                    <span>Loading bill records...</span>
                  </div>
                ) : customerBills.length > 0 && billStats ? (
                  <div className="space-y-2">
                    {/* Compact Metrics Row */}
                    <div className="grid grid-cols-2 gap-1.5 bg-white/80 rounded-lg p-2 border border-amber-200/50 shadow-2xs">
                      <div>
                        <span className="text-[10px] text-gray-400 block">Avg Monthly Bill</span>
                        <span className="font-bold text-gray-900 text-xs">
                          {billStats.avgAmount != null ? `₹${billStats.avgAmount.toLocaleString('en-IN')}` : '—'}
                        </span>
                        {billStats.avgUnits != null && (
                          <span className="text-[10px] text-gray-500 block">
                            ~{billStats.avgUnits} Units / mo
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block">Optimal Solar Plant</span>
                        <span className="font-bold text-emerald-700 text-xs flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                          {billStats.recommendedSolarKw} kW System
                        </span>
                        <span className="text-[10px] text-emerald-600 block">
                          ₹0 Net Bill Offset
                        </span>
                      </div>
                    </div>

                    {/* Bills List / Table */}
                    <div className="bg-white/90 rounded-lg border border-amber-200/60 overflow-hidden shadow-2xs">
                      <div className="grid grid-cols-12 text-[10px] font-bold text-gray-500 uppercase px-2.5 py-1.5 bg-amber-100/40 border-b border-amber-100">
                        <span className="col-span-4">Month</span>
                        <span className="col-span-3 text-right">Units</span>
                        <span className="col-span-5 text-right">Bill Amount</span>
                      </div>

                      <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                        {(showAllBills ? customerBills : customerBills.slice(0, 3)).map((b, idx) => {
                          const isMax = billStats.maxUnits > 0 && b.billed_units != null && Number(b.billed_units) === billStats.maxUnits;
                          return (
                            <div key={b.id || idx} className={`grid grid-cols-12 text-xs px-2.5 py-1.5 items-center hover:bg-amber-50/40 transition-colors ${isMax ? 'bg-amber-50/40' : ''}`}>
                              <span className="col-span-4 font-medium text-gray-800 flex items-center gap-1 truncate text-[11px]">
                                {b.bill_month || '—'}
                                {isMax && (
                                  <span className="text-[8px] bg-red-100 text-red-700 font-bold px-1 py-0.2 rounded leading-tight">
                                    PEAK
                                  </span>
                                )}
                              </span>
                              <span className="col-span-3 text-right text-gray-600 font-mono text-[11px]">
                                {b.billed_units != null ? `${Number(b.billed_units).toLocaleString('en-IN')} U` : '—'}
                              </span>
                              <span className="col-span-5 text-right font-bold text-gray-900 font-mono text-[11px]">
                                {b.bill_amount != null ? `₹${Number(b.bill_amount).toLocaleString('en-IN')}` : '—'}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {customerBills.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setShowAllBills(!showAllBills)}
                          className="w-full text-center text-[10px] font-semibold text-amber-800 hover:text-amber-900 bg-amber-50/50 hover:bg-amber-100/60 py-1 transition-colors flex items-center justify-center gap-1 border-t border-amber-100 cursor-pointer"
                        >
                          {showAllBills ? (
                            <>
                              <ChevronUp className="w-3 h-3" /> Show recent 3 months
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3" /> View all {customerBills.length} months
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/60 rounded-lg p-2.5 border border-dashed border-amber-200 text-center space-y-1.5">
                    <p className="text-[11px] text-gray-500">
                      No electricity bill history on record for this SC.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setShowAddBillModal(true)}
                        className="text-[10px] font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Record Bill
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/eb-customers/import-bills')}
                        className="text-[10px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" /> Import Bills
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Sales Actions
              </span>

              <button
                type="button"
                onClick={() => {
                  alert(`Site Survey Booked for ${activeChat.customerName}! Assigned to local field team.`);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Calendar className="w-3.5 h-3.5" />
                Book Site Survey
              </button>

              <button
                type="button"
                onClick={() => navigate('/quotations/create')}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Generate Quotation
              </button>

              <button
                type="button"
                onClick={() => {
                  setChats((prev) =>
                    prev.map((c) => (c.id === activeChat.id ? { ...c, status: 'opt_out' } : c))
                  );
                  alert(`${activeChat.customerName} marked as Opt-Out (DND).`);
                }}
                className="w-full py-1.5 text-center text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
              >
                Mark as Not Interested (STOP)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Add Bill Modal */}
      {showAddBillModal && activeChat && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-gray-900 text-sm">Record DISCOM Electricity Bill</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBillModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-amber-50/60 border border-amber-200/60 rounded-lg p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-semibold text-gray-900">{activeChat.customerName}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-gray-600">Service No (SC):</span>
                  <span className="font-mono font-bold text-gray-900">{activeChat.scNumber || 'N/A'}</span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Bill Month & Year</label>
                <input
                  type="text"
                  placeholder="e.g. Aug 2026, Sep 2026"
                  value={newBillMonth}
                  onChange={(e) => setNewBillMonth(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Billed Units (kWh)</label>
                  <input
                    type="number"
                    placeholder="e.g. 380"
                    value={newBillUnits}
                    onChange={(e) => setNewBillUnits(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">Bill Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 3200"
                    value={newBillAmount}
                    onChange={(e) => setNewBillAmount(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Payment Status</label>
                <select
                  value={newBillStatus}
                  onChange={(e) => setNewBillStatus(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending / Due</option>
                  <option value="Partial">Partial</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowAddBillModal(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingBill || !newBillAmount || !newBillMonth}
                onClick={handleSaveNewBill}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {savingBill && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Bill Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SQL Setup Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-gray-900">
                  Supabase Live WhatsApp Cloud Tables Setup
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              When customers reply to <strong>+91 81211 04043</strong>, the Meta Webhook saves their conversations into Supabase. Run this one-time SQL script in your Supabase project to ensure the tables exist:
            </p>

            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-[11px] font-mono overflow-x-auto max-h-56 leading-relaxed">
                {SQL_TABLE_SETUP}
              </pre>
              <button
                type="button"
                onClick={handleCopySql}
                className="absolute top-2 right-2 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded text-xs font-semibold flex items-center gap-1 border border-gray-700 shadow-sm"
              >
                <Copy className="w-3.5 h-3.5" />
                {hasCopiedSql ? 'Copied to Clipboard!' : 'Copy SQL'}
              </button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-gray-500">
                After clicking Run in Supabase, your CRM will automatically detect the tables.
              </span>
              <div className="flex items-center gap-2">
                <a
                  href="https://supabase.com/dashboard/project/rlwcqmlspvddfscyngfw/sql/new"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  Open Supabase SQL Editor <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cost & Usage Estimator Modal */}
      {showCostModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    WhatsApp Cloud API Cost & Usage Estimator
                  </h3>
                  <p className="text-xs text-gray-500">
                    Live tracking based on Meta India Rate Card · Phone:{' '}
                    <strong className="text-gray-700 font-mono">+91 81211 04043</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCostModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide">
                  Est. Spend (Current)
                </span>
                <div className="my-1">
                  <span className="text-2xl font-black text-emerald-700">
                    ₹{usageStats.totalEstimatedInr.toFixed(2)}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-600 font-medium">
                  Direct billing via Meta Business
                </span>
              </div>

              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wide">
                    Free Service Tier
                  </span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                    Meta Free Quota
                  </span>
                </div>
                <div className="my-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-blue-700">
                      {usageStats.freeConversationsUsed}
                    </span>
                    <span className="text-xs text-blue-500 font-semibold">/ 1,000</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{
                        width: `${Math.min(100, (usageStats.freeConversationsUsed / 1000) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-blue-600 font-medium">
                  {1000 - usageStats.freeConversationsUsed} free inbound chats left this month
                </span>
              </div>

              <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-3.5 flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-purple-800 uppercase tracking-wide">
                  Messages Logged
                </span>
                <div className="my-1">
                  <span className="text-2xl font-black text-purple-700">
                    {usageStats.totalOutbound + usageStats.totalInbound}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-purple-600 font-medium">
                  <span>
                    Out: <strong>{usageStats.totalOutbound}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    In: <strong>{usageStats.totalInbound}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Official Meta Rate Breakdown (India / INR)
              </h4>

              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden text-xs">
                {/* 1. Inbound Service */}
                <div className="p-3 bg-white flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-gray-900">
                      <span>Service Conversations (Customer Inbound)</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                        1,000 Free / mo
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      When a customer writes to you, a 24-hr customer service window opens. All two-way
                      replies inside 24 hours are free of charge.
                    </p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <span className="font-bold text-emerald-600 block text-sm">₹0.00</span>
                    <span className="text-[10px] text-gray-400">Within free tier</span>
                  </div>
                </div>

                {/* 2. Utility Messages */}
                <div className="p-3 bg-white flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-gray-900">
                      <span>Utility & Operational Notifications</span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                        ~₹0.12 / msg
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      PM Surya Ghar quote alerts, site survey booking confirmations, installation
                      updates, and subsidy receipts.
                    </p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <span className="font-bold text-gray-900 block text-sm">
                      ₹{(usageStats.utilityCount * 0.12).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {usageStats.utilityCount} msgs × ₹0.12
                    </span>
                  </div>
                </div>

                {/* 3. Marketing Messages */}
                <div className="p-3 bg-white flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-gray-900">
                      <span>Marketing & Promotional Broadcasts</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                        ~₹0.80 / msg
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Solar festive discounts, referral offers, and mass outbound outreach
                      campaigns.
                    </p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <span className="font-bold text-gray-900 block text-sm">
                      ₹{(usageStats.marketingCount * 0.8).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {usageStats.marketingCount} msgs × ₹0.80
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Cost-Saving Tips */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">Tejo Bharat Cost Optimization Tips:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-800">
                  <li>
                    <strong>Respond within 24 hours:</strong> Inbound conversations allow unlimited
                    free agent replies within the 24-hr customer service window.
                  </li>
                  <li>
                    <strong>Always use Utility templates:</strong> PM Surya Ghar quote
                    notifications cost only ₹0.12 vs ₹0.80 for marketing templates (85% savings!).
                  </li>
                  <li>
                    <strong>Unified Billing:</strong> You can add multiple phone numbers to your
                    WABA in Meta Business Manager anytime without extra subscription charges.
                  </li>
                </ul>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-[11px] text-gray-500">
                Official invoices are generated on the 1st of every month in Meta Business Suite.
              </span>
              <div className="flex items-center gap-2">
                <a
                  href="https://business.facebook.com/billing_hub/payment_settings"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  Meta Billing Settings <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setShowCostModal(false)}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
