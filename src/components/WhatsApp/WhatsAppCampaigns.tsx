import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Send,
  Plus,
  Play,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Users,
  Eye,
  MessageSquare,
  ShieldAlert,
  Loader2,
  BarChart2,
  Sparkles,
  Filter,
  Smartphone,
  Phone,
  Building2,
  Search,
  RotateCcw,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Zap,
  Check,
  X,
  UserCheck,
  UserMinus,
  ArrowRight,
  Receipt,
  IndianRupee,
  Layers,
  ArrowUpRight,
  Tag,
  ExternalLink,
} from 'lucide-react';
import { WhatsAppCampaign, WhatsAppTemplate } from '../../types/whatsapp';
import {
  loadWhatsAppCampaigns,
  syncWhatsAppCampaignsWithSupabase,
  loadWhatsAppTemplates,
  DEFAULT_TEMPLATES,
  loadWhatsAppSettings,
  loadWhatsAppChats,
  generateHumanCampaignCode,
} from '../../lib/whatsappStorage';
import { canSendWhatsAppCampaigns, executeBroadcastCampaign, renderTemplateText } from '../../lib/whatsappApi';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { APEPDCL_CIRCLES } from '../../lib/pmsuryaWebSync';
import AreaCodeFilter from '../Prospects/AreaCodeFilter';
import { extractAreaCode } from '../../lib/areaCodeCatalog';
import { fetchEBBillSummaries } from '../../lib/ebApi';
import { fetchProspectBillSummaries } from '../../lib/prospectApi';

function parseManualNumbers(input: string): string[] {
  return input
    .split(/[\n,; ]+/)
    .map((s) => s.replace(/\D/g, ''))
    .filter((s) => s.length >= 10);
}

export type AudienceSource = 'prospects' | 'eb_customers' | 'customers' | 'manual';
export type UnitFilterOperator = 'all' | 'lte' | 'lt' | 'gte' | 'gt' | 'between' | 'eq';

function normalizeCategory(cat: string): string {
  if (!cat || cat === 'all') return 'all';
  const lower = cat.toLowerCase();
  if (lower === 'cat-i' || lower === 'i' || lower.includes('cat-1') || lower.includes('domestic')) return 'I';
  if (lower === 'cat-ii' || lower === 'ii' || lower.includes('cat-2') || lower.includes('commercial')) return 'II';
  if (lower === 'cat-iii' || lower === 'iii' || lower.includes('cat-3') || lower.includes('industrial')) return 'III';
  if (lower === 'cat-iv' || lower === 'iv' || lower.includes('cat-4') || lower.includes('cottage')) return 'IV';
  if (lower === 'cat-v' || lower === 'v' || lower.includes('cat-5') || lower.includes('agriculture')) return 'V';
  return cat;
}

interface WhatsAppCampaignsViewProps {
  onViewReplies?: (campaignCode: string) => void;
}

export default function WhatsAppCampaignsView({ onViewReplies }: WhatsAppCampaignsViewProps = {}) {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<WhatsAppTemplate[]>(() => loadWhatsAppTemplates());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [canSend, setCanSend] = useState(false);

  // New Campaign Form State
  const [campaignName, setCampaignName] = useState('');
  const [campaignCode, setCampaignCode] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    () => (loadWhatsAppTemplates()[0]?.id || DEFAULT_TEMPLATES[0].id)
  );

  // Audience Source Selector: 'prospects' | 'eb_customers' | 'customers' | 'manual'
  const [audienceType, setAudienceType] = useState<AudienceSource>('prospects');

  // Search across audience data
  const [searchQuery, setSearchQuery] = useState('');
  // Target contacts selection count ('all' or number of contacts to select from results)
  const [targetSelectCount, setTargetSelectCount] = useState<number | 'all'>('all');
  // Recipient selection set
  const [selectedTargetIds, setSelectedTargetIds] = useState<Set<string>>(new Set());
  // Show / hide recipient list preview
  const [showRecipientList, setShowRecipientList] = useState(true);

  const applySelectionCount = (count: number | 'all', list = matchingProspects) => {
    setTargetSelectCount(count);
    if (count === 'all') {
      setSelectedTargetIds(new Set(list.map((p) => p.id)));
    } else if (count === 0) {
      setSelectedTargetIds(new Set());
    } else {
      const subset = list.slice(0, count);
      setSelectedTargetIds(new Set(subset.map((p) => p.id)));
    }
  };

  // Exclude already contacted / sent users option
  const [excludeAlreadySent, setExcludeAlreadySent] = useState<boolean>(true);
  const [excludedAlreadySentCount, setExcludedAlreadySentCount] = useState<number>(0);

  // Finalize & confirm count modal overlay before launch
  const [showFinalizeModal, setShowFinalizeModal] = useState<boolean>(false);
  const [finalizeTargetCap, setFinalizeTargetCap] = useState<number>(0);

  // Manual test numbers
  const [manualPhoneNumbers, setManualPhoneNumbers] = useState('9000273028, 9479797947');
  const [manualCustomerName, setManualCustomerName] = useState('Durga Rao');

  // PM Surya Ghar Prospects Filters
  const [selectedCircle, setSelectedCircle] = useState('ALL');
  const [prospectCategory, setProspectCategory] = useState<string>('all');
  const [prospectConstituency, setProspectConstituency] = useState<string>('');
  const [prospectMandal, setProspectMandal] = useState('');
  const [prospectAreaCodes, setProspectAreaCodes] = useState<string[]>([]);
  const [minLoad, setMinLoad] = useState<number>(0);
  const [prospectStage, setProspectStage] = useState<string>('all');
  const [prospectPhase, setProspectPhase] = useState<string>('all');
  const [unitsOperator, setUnitsOperator] = useState<UnitFilterOperator>('all');
  const [unitsValue, setUnitsValue] = useState<number>(300);
  const [unitsValueMax, setUnitsValueMax] = useState<number>(500);
  const [excludeInstalled, setExcludeInstalled] = useState(true);
  const [hideSuryaGhar, setHideSuryaGhar] = useState(false);

  // EB Customers (DISCOM) Filters
  const [ebCategory, setEbCategory] = useState<string>('all');
  const [ebCallStatus, setEbCallStatus] = useState<string>('all');
  const [ebConstituency, setEbConstituency] = useState<string>('');
  const [ebEro, setEbEro] = useState<string>('');
  const [ebMandal, setEbMandal] = useState<string>('');
  const [ebAreaCodes, setEbAreaCodes] = useState<string[]>([]);
  const [ebMinLoad, setEbMinLoad] = useState<number>(0);
  const [ebPhase, setEbPhase] = useState<string>('all');
  const [ebUnitsOperator, setEbUnitsOperator] = useState<UnitFilterOperator>('all');
  const [ebUnitsValue, setEbUnitsValue] = useState<number>(300);
  const [ebUnitsValueMax, setEbUnitsValueMax] = useState<number>(500);

  // Template Filtering
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<'all' | 'UTILITY' | 'MARKETING'>('all');

  // Existing CRM Customers Filters
  const [customerOverallStatus, setCustomerOverallStatus] = useState<string>('all');
  const [customerInstallStatus, setCustomerInstallStatus] = useState<string>('all');
  const [customerSubsidyStatus, setCustomerSubsidyStatus] = useState<string>('all');
  const [customerLoanStatus, setCustomerLoanStatus] = useState<string>('all');
  const [customerCity, setCustomerCity] = useState<string>('');
  const [customerMinCapacity, setCustomerMinCapacity] = useState<number>(0);

  // Target preview & launch state
  const [matchingProspects, setMatchingProspects] = useState<any[]>([]);
  const [loadingCount, setLoadingCount] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ sent: number; total: number; percent: number; current?: string } | null>(null);

  useEffect(() => {
    setCampaigns(loadWhatsAppCampaigns());
    setCanSend(canSendWhatsAppCampaigns(profile));
    syncWhatsAppCampaignsWithSupabase().then((synced) => {
      if (synced && synced.length > 0) {
        setCampaigns(synced);
      }
    });
  }, [profile]);

  // Synchronize incoming searchParams from Prospects / EB Customers list pages
  useEffect(() => {
    const shouldOpen = searchParams.get('openModal') === 'true';
    if (shouldOpen) {
      setIsModalOpen(true);
      const src = searchParams.get('source');
      if (src === 'prospects' || src === 'eb_customers' || src === 'customers' || src === 'manual') {
        setAudienceType(src as AudienceSource);
      }
      const search = searchParams.get('search');
      if (search) setSearchQuery(search);
      const circle = searchParams.get('circle');
      if (circle) setSelectedCircle(circle);
      const mandal = searchParams.get('mandal');
      if (mandal) {
        setProspectMandal(mandal);
        setEbMandal(mandal);
      }
      const category = searchParams.get('category');
      if (category) {
        const norm = normalizeCategory(category);
        setEbCategory(norm);
        setProspectCategory(norm);
      }
      const constituency = searchParams.get('constituency');
      if (constituency) {
        setEbConstituency(constituency);
        setProspectConstituency(constituency);
      }
      const ero = searchParams.get('ero');
      if (ero) setEbEro(ero);
      const unitsOp = searchParams.get('unitsOp');
      if (unitsOp && ['lte', 'lt', 'gte', 'gt', 'between', 'eq', 'all'].includes(unitsOp)) {
        setUnitsOperator(unitsOp as UnitFilterOperator);
        setEbUnitsOperator(unitsOp as UnitFilterOperator);
      }
      const unitsVal = searchParams.get('unitsVal');
      if (unitsVal) {
        setUnitsValue(Number(unitsVal));
        setEbUnitsValue(Number(unitsVal));
      }
      const unitsMax = searchParams.get('unitsMax');
      if (unitsMax) {
        setUnitsValueMax(Number(unitsMax));
        setEbUnitsValueMax(Number(unitsMax));
      }
      const areaParam = searchParams.get('areaCodes') || searchParams.get('area');
      if (areaParam) {
        const codes = areaParam.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
        if (codes.length > 0) {
          setProspectAreaCodes(codes);
          setEbAreaCodes(codes);
        }
      }
      const phaseParam = searchParams.get('phase');
      if (phaseParam) {
        setProspectPhase(phaseParam);
        setEbPhase(phaseParam);
      }
      const callStatusParam = searchParams.get('callStatus');
      if (callStatusParam) {
        setProspectStage(callStatusParam);
        setEbCallStatus(callStatusParam);
      }
      const loadParam = searchParams.get('load');
      if (loadParam) {
        setMinLoad(Number(loadParam));
        setEbMinLoad(Number(loadParam));
      }
      const hideSolarParam = searchParams.get('hideSolar');
      if (hideSolarParam !== null) {
        setExcludeInstalled(hideSolarParam === 'true');
      }
      const hideSuryaGharParam = searchParams.get('hideSuryaGhar');
      if (hideSuryaGharParam !== null) {
        setHideSuryaGhar(hideSuryaGharParam === 'true');
      }
    }
  }, [searchParams]);

  // Query database count whenever audience filters change
  useEffect(() => {
    if (!isModalOpen) return;
    setAvailableTemplates(loadWhatsAppTemplates());

    let isMounted = true;
    const fetchAudienceCount = async () => {
      if (audienceType === 'manual') {
        setMatchingProspects([]);
        setSelectedTargetIds(new Set());
        setExcludedAlreadySentCount(0);
        setLoadingCount(false);
        return;
      }

      setLoadingCount(true);
      try {
        // Gather sent mobile numbers if "Exclude Already Sent" is enabled
        const sentPhoneSet = new Set<string>();
        if (excludeAlreadySent) {
          try {
            const { data: sentMsgs } = await supabase
              .from('whatsapp_messages')
              .select('receiver_phone')
              .eq('direction', 'outbound')
              .limit(10000);
            if (sentMsgs) {
              sentMsgs.forEach((m: any) => {
                const p = (m.receiver_phone || '').replace(/\D/g, '').slice(-10);
                if (p.length === 10) sentPhoneSet.add(p);
              });
            }
          } catch (e) {
            console.warn('Could not fetch outbound whatsapp_messages for exclusion:', e);
          }
          try {
            loadWhatsAppChats().forEach((c) => {
              const p = (c.phoneNumber || '').replace(/\D/g, '').slice(-10);
              if (p.length === 10) sentPhoneSet.add(p);
            });
          } catch {}
        }

        if (audienceType === 'prospects') {
          let q = supabase
            .from('lead_prospects')
            .select('id, customer_name, sc_number, mobile_number, circle_name, mandal_name, section_name, area_name, village_name, applied_solar_load_kw, ep_registration_number, call_status, phase, bill_amount_1, bill_amount_2, bill_amount_3, national_portal_status, category, assembly_constituency, is_existing_customer')
            .not('mobile_number', 'is', null)
            .limit(5000);

          if (selectedCircle !== 'ALL') {
            q = q.eq('circle_name', selectedCircle);
          }
          const normProspectCat = normalizeCategory(prospectCategory);
          if (normProspectCat !== 'all') {
            q = q.eq('category', normProspectCat);
          }
          if (prospectConstituency.trim()) {
            q = q.ilike('assembly_constituency', `%${prospectConstituency.trim()}%`);
          }
          if (minLoad > 0) {
            q = q.gte('applied_solar_load_kw', minLoad);
          }
          if (prospectStage !== 'all') {
            q = q.eq('call_status', prospectStage);
          }
          if (prospectPhase !== 'all') {
            q = q.ilike('phase', `%${prospectPhase}%`);
          }
          if (prospectMandal.trim()) {
            q = q.ilike('mandal_name', `%${prospectMandal.trim()}%`);
          }
          if (prospectAreaCodes.length > 0) {
            if (prospectAreaCodes.length === 1) {
              q = q.like('sc_number', `%${prospectAreaCodes[0]}______`);
            } else {
              const orConds = prospectAreaCodes
                .map((c) => `sc_number.like.%${c}______`)
                .join(',');
              q = q.or(orConds);
            }
          }
          if (unitsOperator === 'lte' && unitsValue > 0) {
            const billApprox = Math.round(unitsValue * 7.5);
            q = q.or(`billed_units.lte.${unitsValue},bill_amount_1.lte.${billApprox}`);
          } else if (unitsOperator === 'lt' && unitsValue > 0) {
            const billApprox = Math.round(unitsValue * 7.5);
            q = q.or(`billed_units.lt.${unitsValue},bill_amount_1.lt.${billApprox}`);
          } else if (unitsOperator === 'gte' && unitsValue > 0) {
            const billApprox = Math.round(unitsValue * 7.5);
            q = q.or(`billed_units.gte.${unitsValue},bill_amount_1.gte.${billApprox}`);
          } else if (unitsOperator === 'gt' && unitsValue > 0) {
            const billApprox = Math.round(unitsValue * 7.5);
            q = q.or(`billed_units.gt.${unitsValue},bill_amount_1.gt.${billApprox}`);
          } else if (unitsOperator === 'between' && unitsValue > 0 && unitsValueMax > unitsValue) {
            const billMin = Math.round(unitsValue * 7.5);
            const billMax = Math.round(unitsValueMax * 7.5);
            q = q.gte('bill_amount_1', billMin).lte('bill_amount_1', billMax);
          } else if (unitsOperator === 'eq' && unitsValue > 0) {
            const billApprox = Math.round(unitsValue * 7.5);
            q = q.or(`billed_units.eq.${unitsValue},bill_amount_1.eq.${billApprox}`);
          }
          if (searchQuery.trim()) {
            const term = searchQuery.trim();
            q = q.or(`customer_name.ilike.%${term}%,sc_number.ilike.%${term}%,mobile_number.ilike.%${term}%`);
          }
          if (excludeInstalled) {
            q = q.is('ep_registration_number', null).neq('call_status', 'solar_already_installed');
          }
          if (hideSuryaGhar) {
            q = q.eq('is_existing_customer', false);
          }

          const { data, error } = await q;
          if (!error && data && isMounted) {
            let rawList = data.map((p) => {
              const b1 = p.bill_amount_1 ? Number(p.bill_amount_1) : 0;
              const b2 = p.bill_amount_2 ? Number(p.bill_amount_2) : 0;
              const b3 = p.bill_amount_3 ? Number(p.bill_amount_3) : 0;
              const maxB = Math.max(b1, b2, b3);
              const recB = b1 || b2 || b3 || 0;
              return {
                id: p.id,
                source: 'prospect',
                customer_name: p.customer_name || 'వినియోగదారుని',
                sc_number: p.sc_number || '',
                mobile_number: p.mobile_number,
                circle_name: p.circle_name || 'APEPDCL',
                mandal_name: p.mandal_name || p.circle_name || 'మీ ప్రాంతం',
                area_name: extractAreaCode(p.sc_number) || p.area_name || p.village_name || p.section_name || '',
                section_name: p.section_name || '',
                applied_solar_load_kw: p.applied_solar_load_kw || 3,
                raw_status: p.call_status || 'lead',
                units: p.billed_units || (recB > 0 ? Math.round(recB / 7.5) : undefined),
                phase: p.phase || '1',
                max_units: p.billed_units || (maxB > 0 ? Math.round(maxB / 7.5) : undefined),
                max_bill: maxB > 0 ? maxB : undefined,
                recent_units: p.billed_units || (recB > 0 ? Math.round(recB / 7.5) : undefined),
                recent_bill: recB > 0 ? recB : undefined,
              };
            });

            if (prospectAreaCodes.length > 0) {
              const allowedSet = new Set(prospectAreaCodes);
              rawList = rawList.filter((p) => {
                const code = extractAreaCode(p.sc_number);
                return Boolean(code && allowedSet.has(code));
              });
            }

            let excludedCount = 0;
            const valid: any[] = [];
            for (const p of rawList) {
              const cleanPhone = (p.mobile_number || '').replace(/\D/g, '').slice(-10);
              if (cleanPhone.length < 10) continue;
              if (excludeAlreadySent && sentPhoneSet.has(cleanPhone)) {
                excludedCount++;
                continue;
              }
              valid.push(p);
            }

            if (valid.length > 0) {
              const scs = valid.slice(0, 150).map((v) => v.sc_number).filter(Boolean);
              try {
                const billMap = await fetchProspectBillSummaries(scs);
                valid.forEach((p) => {
                  const bs = billMap.get(p.sc_number);
                  if (bs) {
                    if (bs.max_billed_units != null) p.max_units = bs.max_billed_units;
                    if (bs.max_units_bill_amount != null || bs.max_bill_amount != null) {
                      p.max_bill = bs.max_units_bill_amount ?? bs.max_bill_amount;
                    }
                    if (bs.recent_units != null || bs.latest_units != null) {
                      p.recent_units = bs.recent_units ?? bs.latest_units;
                    }
                    if (bs.recent_bill_amount != null || bs.latest_bill_amount != null) {
                      p.recent_bill = bs.recent_bill_amount ?? bs.latest_bill_amount;
                    }
                  }
                });
              } catch (e) {
                console.warn('Could not enrich prospect bills:', e);
              }
            }

            setExcludedAlreadySentCount(excludedCount);
            setMatchingProspects(valid);
            if (targetSelectCount === 'all') {
              setSelectedTargetIds(new Set(valid.map((p) => p.id)));
            } else {
              const count = typeof targetSelectCount === 'number' ? targetSelectCount : valid.length;
              setSelectedTargetIds(new Set(valid.slice(0, count).map((p) => p.id)));
            }
          }
        } else if (audienceType === 'eb_customers') {
          const normCat = normalizeCategory(ebCategory);

          // If units filter is requested, use the optimized search_eb_customers RPC (indexed & fast)
          if (ebUnitsOperator !== 'all' && ebUnitsValue > 0) {
            const rpcParams = {
              p_search: searchQuery.trim() || null,
              p_ero: ebEro.trim() || null,
              p_section: null,
              p_status: null,
              p_call_status: ebCallStatus !== 'all' ? ebCallStatus : null,
              p_category: normCat !== 'all' ? normCat : null,
              p_mandal: ebMandal.trim() || null,
              p_sub_station: null,
              p_area: ebAreaCodes.length > 0 ? ebAreaCodes.join(',') : null,
              p_exclude_solar: excludeInstalled,
              p_import_batch_id: null,
              p_date_from: null,
              p_date_to: null,
              bill_conditions: [
                {
                  column: 'billed_units',
                  operator: ebUnitsOperator,
                  value: ebUnitsValue,
                  max_value: ebUnitsOperator === 'between' ? ebUnitsValueMax : null,
                },
              ],
              p_page_size: 5000,
              p_page_offset: 0,
            };

            const { data: rpcData, error: rpcError } = await supabase.rpc('search_eb_customers', rpcParams);
            if (rpcError) {
              console.error('Error in search_eb_customers RPC:', rpcError);
            }

            if (!rpcError && rpcData && isMounted) {
              const rows = (rpcData[0]?.rows || []) as any[];
              let rawList = rows.map((c: any) => ({
                id: c.id,
                source: 'eb',
                customer_name: c.customer_name || c.sur_name || 'వినియోగదారుని',
                sc_number: c.sc_number || '',
                mobile_number: c.mobile_number || c.phone || '',
                circle_name: c.ero_name || 'APEPDCL',
                mandal_name: c.mandal_name || c.section_name || 'మీ ప్రాంతం',
                area_name: extractAreaCode(c.sc_number) || c.area_name || c.section_name || c.sub_station_name || '',
                section_name: c.section_name || '',
                applied_solar_load_kw: c.connected_load || c.contracted_load || 3,
                raw_status: c.category ? `CAT-${c.category}` : (c.call_status || 'EB'),
                phase: c.phase || '1',
                connected_load: c.connected_load,
                assembly_constituency: c.assembly_constituency,
                max_units: undefined as number | undefined,
                max_bill: undefined as number | undefined,
                recent_units: undefined as number | undefined,
                recent_bill: undefined as number | undefined,
              }));

              // Apply client-side filters for fields not handled directly by the RPC
              if (ebMinLoad > 0) {
                rawList = rawList.filter((c) => Number(c.applied_solar_load_kw || 0) >= ebMinLoad);
              }
              if (ebPhase !== 'all') {
                rawList = rawList.filter((c) => String(c.phase || '').toLowerCase().includes(ebPhase.toLowerCase()));
              }
              if (ebConstituency.trim()) {
                const term = ebConstituency.trim().toLowerCase();
                rawList = rawList.filter((c) => String(c.assembly_constituency || '').toLowerCase().includes(term));
              }
              if (ebAreaCodes.length > 0) {
                const allowedSet = new Set(ebAreaCodes);
                rawList = rawList.filter((c) => {
                  const code = extractAreaCode(c.sc_number) || c.area_name;
                  return Boolean(code && allowedSet.has(code));
                });
              }

              let excludedSent = 0;
              const valid: any[] = [];
              for (const p of rawList) {
                const clean = (p.mobile_number || '').replace(/\D/g, '').slice(-10);
                if (clean.length < 10) continue;
                if (excludeAlreadySent && sentPhoneSet.has(clean)) {
                  excludedSent++;
                  continue;
                }
                valid.push(p);
              }

              if (valid.length > 0) {
                try {
                  const billMap = await fetchEBBillSummaries(valid.slice(0, 150).map((v) => v.id));
                  valid.forEach((p) => {
                    const bs = billMap.get(p.id);
                    if (bs) {
                      if (bs.max_billed_units != null) p.max_units = bs.max_billed_units;
                      if (bs.max_units_bill_amount != null || bs.max_bill_amount != null) {
                        p.max_bill = bs.max_units_bill_amount ?? bs.max_bill_amount;
                      }
                      if (bs.recent_units != null || bs.latest_units != null) {
                        p.recent_units = bs.recent_units ?? bs.latest_units;
                      }
                      if (bs.recent_bill_amount != null || bs.latest_bill_amount != null) {
                        p.recent_bill = bs.recent_bill_amount ?? bs.latest_bill_amount;
                      }
                    }
                  });
                } catch (e) {
                  console.warn('Could not enrich EB bills:', e);
                }
              }

              setExcludedAlreadySentCount(excludedSent);
              setMatchingProspects(valid);
              if (targetSelectCount === 'all') {
                setSelectedTargetIds(new Set(valid.map((p) => p.id)));
              } else {
                const count = typeof targetSelectCount === 'number' ? targetSelectCount : valid.length;
                setSelectedTargetIds(new Set(valid.slice(0, count).map((p) => p.id)));
              }
              return;
            } else {
              setExcludedAlreadySentCount(0);
              setMatchingProspects([]);
              setSelectedTargetIds(new Set());
              return;
            }
          } else {
            // Directly query eb_customers when unitsOperator is 'all'
            let q = supabase
              .from('eb_customers')
              .select('id, customer_name, sur_name, sc_number, mobile_number, phone, connected_load, contracted_load, category, ero_name, mandal_name, section_name, area_name, sub_station_name, call_status, solar_already_installed, phase, assembly_constituency')
              .limit(5000);

            if (normCat !== 'all') {
              q = q.eq('category', normCat);
            }
            if (ebMinLoad > 0) {
              q = q.gte('connected_load', ebMinLoad);
            }
          if (ebCallStatus !== 'all') {
            q = q.eq('call_status', ebCallStatus);
          }
          if (ebConstituency.trim()) {
            q = q.ilike('assembly_constituency', `%${ebConstituency.trim()}%`);
          }
          if (ebEro.trim()) {
            q = q.ilike('ero_name', `%${ebEro.trim()}%`);
          }
          if (ebMandal.trim()) {
            const term = ebMandal.trim();
            q = q.or(`mandal_name.ilike.%${term}%,section_name.ilike.%${term}%,ero_name.ilike.%${term}%`);
          }
          if (ebAreaCodes.length > 0) {
            if (ebAreaCodes.length === 1) {
              q = q.like('sc_number', `%${ebAreaCodes[0]}______`);
            } else {
              const orConds = ebAreaCodes
                .map((c) => `sc_number.like.%${c}______`)
                .join(',');
              q = q.or(orConds);
            }
          }
          if (ebPhase !== 'all') {
            q = q.ilike('phase', `%${ebPhase}%`);
          }
          if (searchQuery.trim()) {
            const term = searchQuery.trim();
            q = q.or(`customer_name.ilike.%${term}%,sur_name.ilike.%${term}%,sc_number.ilike.%${term}%,mobile_number.ilike.%${term}%,phone.ilike.%${term}%`);
          }
          if (excludeInstalled) {
            q = q.eq('solar_already_installed', false).neq('call_status', 'solar_already_installed');
          }

          const { data, error } = await q;
          if (!error && data && isMounted) {
            let rawList = data.map((c) => ({
              id: c.id,
              source: 'eb',
              customer_name: c.customer_name || c.sur_name || 'వినియోగదారుని',
              sc_number: c.sc_number || '',
              mobile_number: c.mobile_number || c.phone || '',
              circle_name: c.ero_name || 'APEPDCL',
              mandal_name: c.mandal_name || c.section_name || 'మీ ప్రాంతం',
              area_name: extractAreaCode(c.sc_number) || c.area_name || c.section_name || c.sub_station_name || '',
              section_name: c.section_name || '',
              applied_solar_load_kw: c.connected_load || c.contracted_load || 3,
              raw_status: c.category ? `CAT-${c.category}` : (c.call_status || 'EB'),
              phase: c.phase || '1',
              max_units: undefined as number | undefined,
              max_bill: undefined as number | undefined,
              recent_units: undefined as number | undefined,
              recent_bill: undefined as number | undefined,
            }));

            if (ebAreaCodes.length > 0) {
              const allowedSet = new Set(ebAreaCodes);
              rawList = rawList.filter((c) => {
                const code = extractAreaCode(c.sc_number);
                return Boolean(code && allowedSet.has(code));
              });
            }

            let excludedSent = 0;
            const valid: any[] = [];
            for (const p of rawList) {
              const clean = (p.mobile_number || '').replace(/\D/g, '').slice(-10);
              if (clean.length < 10) continue;
              if (excludeAlreadySent && sentPhoneSet.has(clean)) {
                excludedSent++;
                continue;
              }
              valid.push(p);
            }

            if (valid.length > 0) {
              try {
                const billMap = await fetchEBBillSummaries(valid.slice(0, 150).map((v) => v.id));
                valid.forEach((p) => {
                  const bs = billMap.get(p.id);
                  if (bs) {
                    if (bs.max_billed_units != null) p.max_units = bs.max_billed_units;
                    if (bs.max_units_bill_amount != null || bs.max_bill_amount != null) {
                      p.max_bill = bs.max_units_bill_amount ?? bs.max_bill_amount;
                    }
                    if (bs.recent_units != null || bs.latest_units != null) {
                      p.recent_units = bs.recent_units ?? bs.latest_units;
                    }
                    if (bs.recent_bill_amount != null || bs.latest_bill_amount != null) {
                      p.recent_bill = bs.recent_bill_amount ?? bs.latest_bill_amount;
                    }
                  }
                });
              } catch (e) {
                console.warn('Could not enrich fallback EB bills:', e);
              }
            }

            setExcludedAlreadySentCount(excludedSent);
            setMatchingProspects(valid);
            if (targetSelectCount === 'all') {
              setSelectedTargetIds(new Set(valid.map((p) => p.id)));
            } else {
              const count = typeof targetSelectCount === 'number' ? targetSelectCount : valid.length;
              setSelectedTargetIds(new Set(valid.slice(0, count).map((p) => p.id)));
            }
          }
        }
      } else if (audienceType === 'customers') {
          let q = supabase
            .from('customers')
            .select('id, customer_name, name, sc_number, consumer_number, phone, mobile_number, status, overall_status, installation_status, subsidy_status, loan_status, current_workflow_stage, system_capacity_kw, sanctioned_load, district, mandal, city')
            .limit(5000);

          if (customerOverallStatus !== 'all') {
            q = q.eq('overall_status', customerOverallStatus);
          }
          if (customerInstallStatus !== 'all') {
            q = q.eq('installation_status', customerInstallStatus);
          }
          if (customerSubsidyStatus !== 'all') {
            q = q.eq('subsidy_status', customerSubsidyStatus);
          }
          if (customerLoanStatus !== 'all') {
            q = q.eq('loan_status', customerLoanStatus);
          }
          if (customerMinCapacity > 0) {
            q = q.gte('system_capacity_kw', customerMinCapacity);
          }
          if (customerCity.trim()) {
            const term = customerCity.trim();
            q = q.or(`mandal.ilike.%${term}%,city.ilike.%${term}%,district.ilike.%${term}%`);
          }
          if (searchQuery.trim()) {
            const term = searchQuery.trim();
            q = q.or(`customer_name.ilike.%${term}%,name.ilike.%${term}%,consumer_number.ilike.%${term}%,sc_number.ilike.%${term}%,phone.ilike.%${term}%`);
          }

          const { data, error } = await q;
          if (!error && data && isMounted) {
            const rawList = data.map((c: any) => ({
              id: c.id,
              source: 'crm',
              customer_name: c.customer_name || c.name || 'వినియోగదారుని',
              sc_number: c.consumer_number || c.sc_number || '',
              mobile_number: c.phone || c.mobile_number || '',
              circle_name: c.district || 'APEPDCL',
              mandal_name: c.mandal || c.city || 'మీ ప్రాంతం',
              area_name: c.city || '',
              section_name: '',
              applied_solar_load_kw: c.system_capacity_kw || c.sanctioned_load || 3,
              raw_status: c.overall_status || c.status || 'Active',
              phase: '1',
            }));

            let excludedSent = 0;
            const valid: any[] = [];
            for (const p of rawList) {
              const clean = (p.mobile_number || '').replace(/\D/g, '').slice(-10);
              if (clean.length < 10) continue;
              if (excludeAlreadySent && sentPhoneSet.has(clean)) {
                excludedSent++;
                continue;
              }
              valid.push(p);
            }
            setExcludedAlreadySentCount(excludedSent);
            setMatchingProspects(valid);
            if (targetSelectCount === 'all') {
              setSelectedTargetIds(new Set(valid.map((p) => p.id)));
            } else {
              const count = typeof targetSelectCount === 'number' ? targetSelectCount : valid.length;
              setSelectedTargetIds(new Set(valid.slice(0, count).map((p) => p.id)));
            }
          }
        }
      } catch (err) {
        console.error('Error counting audience:', err);
      } finally {
        if (isMounted) setLoadingCount(false);
      }
    };

    fetchAudienceCount();
    return () => {
      isMounted = false;
    };
  }, [
    isModalOpen,
    audienceType,
    searchQuery,
    excludeAlreadySent,
    selectedCircle,
    prospectCategory,
    prospectConstituency,
    prospectMandal,
    prospectAreaCodes,
    minLoad,
    prospectStage,
    prospectPhase,
    unitsOperator,
    unitsValue,
    unitsValueMax,
    excludeInstalled,
    hideSuryaGhar,
    ebCategory,
    ebCallStatus,
    ebConstituency,
    ebEro,
    ebMandal,
    ebAreaCodes,
    ebMinLoad,
    ebPhase,
    ebUnitsOperator,
    ebUnitsValue,
    ebUnitsValueMax,
    customerOverallStatus,
    customerInstallStatus,
    customerSubsidyStatus,
    customerLoanStatus,
    customerCity,
    customerMinCapacity,
  ]);

  const selectedTemplate =
    availableTemplates.find((t) => t.id === selectedTemplateId) ||
    availableTemplates[0] ||
    DEFAULT_TEMPLATES[0];

  const resetFilters = () => {
    setSearchQuery('');
    setExcludeAlreadySent(true);
    if (audienceType === 'prospects') {
      setSelectedCircle('ALL');
      setProspectCategory('all');
      setProspectConstituency('');
      setProspectMandal('');
      setProspectAreaCodes([]);
      setMinLoad(0);
      setProspectStage('all');
      setProspectPhase('all');
      setUnitsOperator('all');
      setUnitsValue(300);
      setUnitsValueMax(500);
      setExcludeInstalled(true);
      setHideSuryaGhar(false);
    } else if (audienceType === 'eb_customers') {
      setEbCategory('all');
      setEbConstituency('');
      setEbEro('');
      setEbMandal('');
      setEbAreaCodes([]);
      setEbMinLoad(0);
      setEbPhase('all');
      setEbCallStatus('all');
      setEbUnitsOperator('all');
      setEbUnitsValue(300);
      setEbUnitsValueMax(500);
      setExcludeInstalled(true);
    } else if (audienceType === 'customers') {
      setCustomerOverallStatus('all');
      setCustomerInstallStatus('all');
      setCustomerSubsidyStatus('all');
      setCustomerLoanStatus('all');
      setCustomerCity('');
      setCustomerMinCapacity(0);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedTargetIds.size === matchingProspects.length) {
      setSelectedTargetIds(new Set());
    } else {
      setSelectedTargetIds(new Set(matchingProspects.map((p) => p.id)));
    }
  };

  const handleToggleTarget = (id: string) => {
    setSelectedTargetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleLaunchCampaign = async () => {
    if (!canSend) return;

    let targets: any[] = [];
    let filterSummary = '';
    let targetCircle = selectedCircle;

    if (audienceType === 'manual') {
      const parsed = parseManualNumbers(manualPhoneNumbers);
      if (parsed.length === 0) {
        alert('Please enter at least one valid 10-digit mobile number for the test campaign.');
        return;
      }
      targets = parsed.map((phone, idx) => ({
        id: `manual_${idx}_${Date.now()}`,
        customer_name: manualCustomerName || `Test Contact ${idx + 1}`,
        mobile_number: phone,
        sc_number: `TEST-SC-${1000 + idx}`,
        circle_name: 'KAKINADA',
        mandal_name: 'PITHAPURAM',
        section_name: 'TOWN',
        applied_solar_load_kw: 3,
      }));
      filterSummary = `Manual Test Broadcast (${targets.length} number${targets.length > 1 ? 's' : ''}: ${targets.map((t) => t.mobile_number).slice(0, 3).join(', ')}${targets.length > 3 ? '...' : ''})`;
      targetCircle = 'MANUAL_TEST';
    } else {
      const chosen = matchingProspects.filter((p) => selectedTargetIds.has(p.id));
      if (chosen.length === 0) {
        alert('Please select at least one recipient checkbox to launch the campaign.');
        return;
      }
      targets = chosen;

      if (audienceType === 'prospects') {
        const parts = [`Surya Ghar: Circle ${selectedCircle}`];
        if (prospectCategory !== 'all') parts.push(`Cat: ${prospectCategory.toUpperCase()}`);
        if (prospectConstituency.trim()) parts.push(`Const: ${prospectConstituency.trim()}`);
        if (prospectMandal.trim()) parts.push(`Mandal: ${prospectMandal.trim()}`);
        if (prospectAreaCodes.length > 0) parts.push(`Area: ${prospectAreaCodes.join(', ')}`);
        if (minLoad > 0) parts.push(`Load ≥ ${minLoad} kW`);
        if (prospectStage !== 'all') parts.push(`Stage: ${prospectStage}`);
        if (prospectPhase !== 'all') parts.push(`Phase: ${prospectPhase}P`);
        if (unitsOperator !== 'all' && unitsValue > 0) {
          parts.push(`Units: ${unitsOperator} ${unitsValue}${unitsOperator === 'between' ? '-' + unitsValueMax : ''} kWh`);
        }
        if (searchQuery.trim()) parts.push(`Search: "${searchQuery.trim()}"`);
        if (excludeInstalled) parts.push('Excl. Installed');
        if (excludeAlreadySent) parts.push('Excl. Already Sent');
        filterSummary = parts.join(', ');
        targetCircle = selectedCircle;
      } else if (audienceType === 'eb_customers') {
        const parts = ['EB DISCOM'];
        if (ebCategory !== 'all') parts.push(`Cat: ${ebCategory.toUpperCase()}`);
        if (ebConstituency.trim()) parts.push(`Const: ${ebConstituency.trim()}`);
        if (ebMandal.trim()) parts.push(`Mandal: ${ebMandal.trim()}`);
        if (ebAreaCodes.length > 0) parts.push(`Area: ${ebAreaCodes.join(', ')}`);
        if (ebMinLoad > 0) parts.push(`Load ≥ ${ebMinLoad} kW`);
        if (ebPhase !== 'all') parts.push(`Phase: ${ebPhase}P`);
        if (ebCallStatus !== 'all') parts.push(`Status: ${ebCallStatus}`);
        if (ebUnitsOperator !== 'all' && ebUnitsValue > 0) {
          parts.push(`Units: ${ebUnitsOperator} ${ebUnitsValue}${ebUnitsOperator === 'between' ? '-' + ebUnitsValueMax : ''} kWh`);
        }
        if (searchQuery.trim()) parts.push(`Search: "${searchQuery.trim()}"`);
        if (excludeInstalled) parts.push('Excl. Installed');
        if (excludeAlreadySent) parts.push('Excl. Already Sent');
        filterSummary = parts.join(', ');
        targetCircle = 'EB_DISCOM';
      } else if (audienceType === 'customers') {
        const parts = ['CRM Clients'];
        if (customerOverallStatus !== 'all') parts.push(`Status: ${customerOverallStatus}`);
        if (customerInstallStatus !== 'all') parts.push(`Install: ${customerInstallStatus}`);
        if (customerSubsidyStatus !== 'all') parts.push(`Subsidy: ${customerSubsidyStatus}`);
        if (customerLoanStatus !== 'all') parts.push(`Loan: ${customerLoanStatus}`);
        if (customerCity.trim()) parts.push(`City: ${customerCity.trim()}`);
        if (customerMinCapacity > 0) parts.push(`Cap ≥ ${customerMinCapacity} kW`);
        if (searchQuery.trim()) parts.push(`Search: "${searchQuery.trim()}"`);
        if (excludeAlreadySent) parts.push('Excl. Already Sent');
        filterSummary = parts.join(', ');
        targetCircle = 'CRM_CLIENTS';
      }
    }

    const campaignId = `camp_${Date.now()}`;
    const defaultTitle =
      audienceType === 'manual'
        ? `Test Broadcast - ${selectedTemplate.displayName} (${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})`
        : audienceType === 'eb_customers'
        ? `EB Consumers - ${selectedTemplate.displayName} (${new Date().toLocaleDateString('en-IN')})`
        : audienceType === 'customers'
        ? `CRM Clients - ${selectedTemplate.displayName} (${new Date().toLocaleDateString('en-IN')})`
        : `${selectedTemplate.displayName} - ${selectedCircle} (${new Date().toLocaleDateString('en-IN')})`;

    const finalName = campaignName || defaultTitle;
    const finalCode = (campaignCode.trim() || generateHumanCampaignCode(finalName, undefined, campaigns.length + 1)).toUpperCase();

    const newCamp: WhatsAppCampaign = {
      id: campaignId,
      code: finalCode,
      name: finalName,
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      targetCircle,
      targetFiltersSummary: filterSummary,
      totalTargetCount: targets.length,
      sentCount: 0,
      deliveredCount: 0,
      readCount: 0,
      failedCount: 0,
      repliedCount: 0,
      optOutCount: 0,
      status: 'running',
      createdByUserId: profile?.id || 'admin',
      createdByName: profile?.full_name || 'Admin',
      createdAt: new Date().toISOString(),
    };

    setIsSending(true);
    try {
      const result = await executeBroadcastCampaign(newCamp, selectedTemplate, targets, (prog) => {
        setSendProgress({
          sent: prog.sent,
          total: prog.total,
          percent: prog.percent,
          current: prog.currentCustomer,
        });
      });

      setCampaigns(loadWhatsAppCampaigns());
      setIsModalOpen(false);
      setSendProgress(null);

      if (result.status === 'failed' || (result.failedCount > 0 && result.sentCount === 0)) {
        alert(
          `⚠️ WhatsApp Message Delivery Failed!\n\nMeta Response: ${
            result.lastError || 'Message was rejected by Meta API.'
          }\n\nPlease check your Access Token, phone number, and template variables.`
        );
      } else if (result.sentCount > 0) {
        alert(`✅ WhatsApp campaign sent successfully to ${result.sentCount} recipient(s)!`);
      }
    } catch (err: any) {
      alert(`Campaign Error: ${err.message || 'Failed to complete campaign.'}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Send className="w-5 h-5 text-emerald-600" />
            WhatsApp Broadcast Campaigns
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Send Meta-approved Telugu & English templates to targeted PM Surya Ghar rooftop solar leads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://business.facebook.com/wa/manage/message-templates"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
            title="Open Meta WhatsApp Manager to view approved templates and account"
          >
            Meta Manager
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>

          {canSend ? (
            <button
              onClick={() => {
                const initTitle = `PM Surya Ghar Campaign - ${new Date().toLocaleDateString('en-IN')}`;
                setCampaignName(initTitle);
                setCampaignCode(generateHumanCampaignCode(initTitle, undefined, campaigns.length + 1));
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-sm font-semibold shadow-md transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Create Campaign
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Campaign Creation Restricted to Admin Roles</span>
            </div>
          )}
        </div>
      </div>

      {/* Campaigns Metrics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-xs text-gray-500 block">Total Campaigns</span>
          <span className="text-xl font-bold text-gray-900 mt-1 block">{campaigns.length}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-xs text-gray-500 block">Messages Delivered</span>
          <span className="text-xl font-bold text-emerald-600 mt-1 block">
            {campaigns.reduce((acc, c) => acc + c.deliveredCount, 0).toLocaleString('en-IN')}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-xs text-gray-500 block">Messages Read</span>
          <span className="text-xl font-bold text-blue-600 mt-1 block">
            {campaigns.reduce((acc, c) => acc + c.readCount, 0).toLocaleString('en-IN')}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-xs text-gray-500 block">Customer Inquiries / Replies</span>
          <span className="text-xl font-bold text-purple-600 mt-1 block">
            {campaigns.reduce((acc, c) => acc + c.repliedCount, 0).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-600" />
            Broadcast Campaign History
          </h3>
          <span className="text-xs text-gray-500">{campaigns.length} total</span>
        </div>

        {campaigns.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium">No campaigns launched yet.</p>
            <p className="text-xs text-gray-400 mt-0.5">Click "Create Campaign" to start your first WhatsApp broadcast.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Campaign Name</th>
                  <th className="py-3 px-4 font-semibold">Target / Circle</th>
                  <th className="py-3 px-4 font-semibold text-center">Audience</th>
                  <th className="py-3 px-4 font-semibold text-center">Delivered</th>
                  <th className="py-3 px-4 font-semibold text-center">Read Rate</th>
                  <th className="py-3 px-4 font-semibold text-center">Replies</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.map((c) => {
                  const readRate = c.sentCount > 0 ? Math.round((c.readCount / c.sentCount) * 100) : 0;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <span className="font-mono text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 px-1.5 py-0.2 rounded inline-flex items-center gap-1 shadow-2xs">
                            <Tag className="w-2.5 h-2.5 text-purple-600" />
                            {c.code || generateHumanCampaignCode(c.name, c.createdAt)}
                          </span>
                        </div>
                        <span className="text-xs text-gray-900 font-bold block">{c.name}</span>
                        <span className="text-[10px] text-gray-400 block font-normal font-mono">
                          {c.templateName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-700">
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                          {c.targetCircle || 'All'}
                        </span>
                        <span className="text-[10px] text-gray-500 block mt-0.5">
                          {c.targetFiltersSummary}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-gray-900">
                        {c.totalTargetCount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-emerald-700">
                        {c.deliveredCount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-blue-700">
                        {readRate}%
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1 justify-center">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
                              {c.repliedCount}
                            </span>
                            {c.repliedCount > 0 && (
                              <span
                                className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-0.5"
                                title="Customer responses received"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Active
                              </span>
                            )}
                          </div>
                          {onViewReplies && (
                            <button
                              type="button"
                              onClick={() => onViewReplies(c.code || c.id)}
                              className="text-[10px] font-bold text-purple-700 hover:text-purple-900 hover:underline inline-flex items-center gap-0.5 transition-colors cursor-pointer"
                              title="Filter replies for this campaign in Shared Inbox"
                            >
                              View Replies
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            c.status === 'failed' || (c.failedCount > 0 && c.sentCount === 0)
                              ? 'bg-red-100 text-red-800'
                              : c.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'running'
                              ? 'bg-blue-100 text-blue-800 animate-pulse'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {c.status === 'failed' || (c.failedCount > 0 && c.sentCount === 0)
                            ? 'FAILED'
                            : c.status}
                        </span>
                        {c.lastError && (
                          <span
                            title={c.lastError}
                            className="text-[10px] text-red-600 block mt-1 max-w-[200px] truncate font-medium"
                          >
                            ⚠️ {c.lastError}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 text-[11px]">
                        {new Date(c.createdAt).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[94vh] overflow-y-auto border border-gray-200 flex flex-col justify-between">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">New WhatsApp Broadcast Campaign</h3>
                  <p className="text-xs text-gray-500">Filter PM Surya Ghar prospects, EB consumers, or CRM clients</p>
                </div>
              </div>
              <button
                onClick={() => !isSending && setIsModalOpen(false)}
                disabled={isSending}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Campaign Title & Unique Identifier */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Campaign Title
                  </label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCampaignName(val);
                      if (!campaignCode || campaignCode.startsWith('CMP-')) {
                        setCampaignCode(generateHumanCampaignCode(val, undefined, campaigns.length + 1));
                      }
                    }}
                    placeholder="e.g. Kakinada 3kW Subsidy Awareness Broadcast"
                    disabled={isSending}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                    <span>Unique Code</span>
                    <span className="text-[10px] text-purple-600 font-semibold font-mono">Human ID</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={campaignCode}
                      onChange={(e) => setCampaignCode(e.target.value.toUpperCase())}
                      placeholder="e.g. CMP-SURYA-2609-001"
                      disabled={isSending}
                      className="w-full px-3 py-2 font-mono font-bold text-purple-800 bg-purple-50/60 border border-purple-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none uppercase"
                    />
                    <Tag className="w-3 h-3 text-purple-400 absolute right-2.5 top-2.5" />
                  </div>
                  <span className="text-[9px] text-gray-400 block mt-0.5">
                    Used to track & filter replies in Shared Inbox
                  </span>
                </div>
              </div>

              {/* Target Audience Mode Switcher & Configuration */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-emerald-600" />
                    Target Audience Data Source
                  </span>

                  <div className="flex items-center gap-2">
                    {audienceType !== 'manual' && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        disabled={isSending}
                        className="text-[11px] text-gray-500 hover:text-gray-800 flex items-center gap-1 font-medium bg-white px-2 py-0.5 rounded border border-gray-200"
                        title="Reset all filters to defaults"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset Filters
                      </button>
                    )}

                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      {audienceType === 'manual'
                        ? `${parseManualNumbers(manualPhoneNumbers).length} Test Number${parseManualNumbers(manualPhoneNumbers).length === 1 ? '' : 's'}`
                        : loadingCount
                        ? 'Counting...'
                        : `${selectedTargetIds.size} Selected / ${matchingProspects.length} Matching`}
                    </span>
                  </div>
                </div>

                {/* 4 Audience Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-gray-200/70 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setAudienceType('prospects')}
                    disabled={isSending}
                    className={`py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      audienceType === 'prospects'
                        ? 'bg-white text-emerald-800 shadow-xs border border-gray-200'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    PM Surya Ghar Prospects
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudienceType('eb_customers')}
                    disabled={isSending}
                    className={`py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      audienceType === 'eb_customers'
                        ? 'bg-white text-amber-800 shadow-xs border border-gray-200'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    EB Consumers
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudienceType('customers')}
                    disabled={isSending}
                    className={`py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      audienceType === 'customers'
                        ? 'bg-white text-blue-800 shadow-xs border border-gray-200'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    CRM Clients
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudienceType('manual')}
                    disabled={isSending}
                    className={`py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      audienceType === 'manual'
                        ? 'bg-white text-purple-800 shadow-xs border border-gray-200'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                    Manual Test
                  </button>
                </div>

                {/* Quick Presets Row */}
                {audienceType === 'prospects' && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] uppercase font-bold text-gray-400 mr-1 flex items-center gap-0.5">
                      <Zap className="w-3 h-3 text-amber-500" />
                      Quick Presets:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCircle('ALL');
                        setMinLoad(3);
                        setProspectStage('all');
                        setProspectMandal('');
                        setProspectMinBill(0);
                        setExcludeInstalled(true);
                      }}
                      className="px-2 py-0.5 bg-white border border-gray-300 hover:border-emerald-500 hover:text-emerald-700 rounded text-[10px] font-medium text-gray-700 transition-colors shadow-2xs"
                    >
                      ⚡ 3kW Subsidy Sweetspot
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProspectStage('feasibility_approved');
                        setExcludeInstalled(true);
                      }}
                      className="px-2 py-0.5 bg-white border border-gray-300 hover:border-emerald-500 hover:text-emerald-700 rounded text-[10px] font-medium text-gray-700 transition-colors shadow-2xs"
                    >
                      🔥 Feasibility Approved
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCircle('KAKINADA');
                        setProspectMandal('PITHAPURAM');
                        setExcludeInstalled(true);
                      }}
                      className="px-2 py-0.5 bg-white border border-gray-300 hover:border-emerald-500 hover:text-emerald-700 rounded text-[10px] font-medium text-gray-700 transition-colors shadow-2xs"
                    >
                      📍 Pithapuram Leads
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProspectStage('not_called');
                        setExcludeInstalled(true);
                      }}
                      className="px-2 py-0.5 bg-white border border-gray-300 hover:border-emerald-500 hover:text-emerald-700 rounded text-[10px] font-medium text-gray-700 transition-colors shadow-2xs"
                    >
                      📞 Fresh Uncontacted
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProspectMinBill(2500);
                        setExcludeInstalled(true);
                      }}
                      className="px-2 py-0.5 bg-white border border-gray-300 hover:border-emerald-500 hover:text-emerald-700 rounded text-[10px] font-medium text-gray-700 transition-colors shadow-2xs"
                    >
                      💰 High Bills (≥ ₹2,500)
                    </button>
                  </div>
                )}

                {audienceType === 'eb_customers' && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] uppercase font-bold text-gray-400 mr-1 flex items-center gap-0.5">
                      <Zap className="w-3 h-3 text-amber-500" />
                      Quick Presets:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEbCategory('cat-i');
                        setEbMinLoad(3);
                        setEbCallStatus('all');
                        setEbConstituency('all');
                        setEbMandal('');
                        setEbPhase('all');
                        setExcludeInstalled(true);
                      }}
                      className="px-2 py-0.5 bg-white border border-gray-300 hover:border-amber-500 hover:text-amber-800 rounded text-[10px] font-medium text-gray-700 transition-colors shadow-2xs"
                    >
                      🏠 Domestic 3kW+ (Cat-I)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEbCategory('cat-ii');
                        setEbMinLoad(5);
                        setEbCallStatus('all');
                        setEbConstituency('all');
                        setEbMandal('');
                        setExcludeInstalled(true);
                      }}
                      className="px-2 py-0.5 bg-white border border-gray-300 hover:border-amber-500 hover:text-amber-800 rounded text-[10px] font-medium text-gray-700 transition-colors shadow-2xs"
                    >
                      🏢 Commercial Cat-II (≥5kW)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEbConstituency('Pithapuram');
                        setExcludeInstalled(true);
                      }}
                      className="px-2 py-0.5 bg-white border border-gray-300 hover:border-amber-500 hover:text-amber-800 rounded text-[10px] font-medium text-gray-700 transition-colors shadow-2xs"
                    >
                      🎯 Pithapuram Constituency
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEbCallStatus('not_called');
                        setExcludeInstalled(true);
                      }}
                      className="px-2 py-0.5 bg-white border border-gray-300 hover:border-amber-500 hover:text-amber-800 rounded text-[10px] font-medium text-gray-700 transition-colors shadow-2xs"
                    >
                      📞 Fresh EB Raw Leads
                    </button>
                  </div>
                )}

                {audienceType === 'customers' && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] uppercase font-bold text-gray-400 mr-1 flex items-center gap-0.5">
                      <Zap className="w-3 h-3 text-amber-500" />
                      Quick Presets:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerOverallStatus('completed');
                        setCustomerSubsidyStatus('received');
                        setCustomerInstallStatus('completed');
                      }}
                      className="px-2 py-0.5 bg-white border border-gray-300 hover:border-blue-500 hover:text-blue-800 rounded text-[10px] font-medium text-gray-700 transition-colors shadow-2xs"
                    >
                      🎉 Commissioned (Ask Referral)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerOverallStatus('in_progress');
                        setCustomerInstallStatus('in_progress');
                      }}
                      className="px-2 py-0.5 bg-white border border-gray-300 hover:border-blue-500 hover:text-blue-800 rounded text-[10px] font-medium text-gray-700 transition-colors shadow-2xs"
                    >
                      ⏳ In Progress Installs
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerOverallStatus('pending_docs');
                        setCustomerSubsidyStatus('all');
                      }}
                      className="px-2 py-0.5 bg-white border border-gray-300 hover:border-blue-500 hover:text-blue-800 rounded text-[10px] font-medium text-gray-700 transition-colors shadow-2xs"
                    >
                      📑 Pending Documents
                    </button>
                  </div>
                )}

                {/* Search Box across active audience source */}
                {audienceType !== 'manual' && (
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Quick search by Name, Phone, or SC Number..."
                      disabled={isSending}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* 1. PM Surya Ghar Prospects Filters */}
                {audienceType === 'prospects' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Circle / District
                      </label>
                      <select
                        value={selectedCircle}
                        onChange={(e) => setSelectedCircle(e.target.value)}
                        disabled={isSending}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none"
                      >
                        <option value="ALL">🌐 ALL Circles (11 Districts)</option>
                        {APEPDCL_CIRCLES.filter((c) => !c.isAll).map((c) => (
                          <option key={c.id} value={c.id}>
                            📍 {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Tariff Category
                      </label>
                      <select
                        value={prospectCategory}
                        onChange={(e) => setProspectCategory(e.target.value)}
                        disabled={isSending}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none"
                      >
                        <option value="all">All Tariff Categories</option>
                        <option value="I">Category-I (Domestic / Residential)</option>
                        <option value="II">Category-II (Commercial / Non-Domestic)</option>
                        <option value="III">Category-III (Industrial)</option>
                        <option value="IV">Category-IV (Institutional / Cottage)</option>
                        <option value="V">Category-V (Agriculture)</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-gray-600">
                          Assembly Constituency
                        </label>
                        {prospectConstituency && (
                          <button
                            type="button"
                            onClick={() => setProspectConstituency('')}
                            className="text-[10px] text-gray-400 hover:text-gray-600"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={prospectConstituency}
                        onChange={(e) => setProspectConstituency(e.target.value)}
                        placeholder="e.g. Pithapuram, Kakinada"
                        disabled={isSending}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {[
                          { label: 'All', val: '' },
                          { label: 'Pithapuram', val: 'Pithapuram' },
                          { label: 'Kakinada', val: 'Kakinada' },
                          { label: 'Peddapuram', val: 'Peddapuram' },
                          { label: 'Tuni', val: 'Tuni' },
                        ].map((chip) => (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => setProspectConstituency(chip.val)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                              (chip.val === '' && !prospectConstituency) ||
                              prospectConstituency.toLowerCase() === chip.val.toLowerCase()
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                            }`}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Mandal / Tahsil
                      </label>
                      <input
                        type="text"
                        value={prospectMandal}
                        onChange={(e) => setProspectMandal(e.target.value)}
                        placeholder="e.g. Pithapuram, Samalkota"
                        disabled={isSending}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none"
                      />
                    </div>

                    <div>
                      <AreaCodeFilter
                        label="Area / Village"
                        selected={prospectAreaCodes}
                        onChange={(codes) => setProspectAreaCodes(codes)}
                        disabled={isSending}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Solar Load (kW)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={minLoad || ''}
                          onChange={(e) => setMinLoad(e.target.value === '' ? 0 : Number(e.target.value))}
                          placeholder="Min kW (0 = All)"
                          disabled={isSending}
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                        <span className="absolute right-2.5 top-1.5 text-[11px] text-gray-400 font-semibold">kW</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {[
                          { label: 'All', val: 0 },
                          { label: '2 kW', val: 2 },
                          { label: '3 kW', val: 3 },
                          { label: '5 kW', val: 5 },
                          { label: '10 kW', val: 10 },
                        ].map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => setMinLoad(item.val)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                              minLoad === item.val
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Application Stage / Status
                      </label>
                      <select
                        value={prospectStage}
                        onChange={(e) => setProspectStage(e.target.value)}
                        disabled={isSending}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none"
                      >
                        <option value="all">All Stages</option>
                        <option value="feasibility_approved">Feasibility Approved</option>
                        <option value="vendor_selection">Vendor Selection Pending</option>
                        <option value="interested">Marked Interested</option>
                        <option value="not_called">Not Called Yet</option>
                        <option value="call_back_later">Call Back Later</option>
                        <option value="site_visit_requested">Site Visit Requested</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Meter Phase
                      </label>
                      <div className="grid grid-cols-3 gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                        {[
                          { id: 'all', label: 'All' },
                          { id: '1', label: '1-Phase' },
                          { id: '3', label: '3-Phase' },
                        ].map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setProspectPhase(p.id)}
                            disabled={isSending}
                            className={`py-1 text-center rounded-md text-[11px] font-semibold transition-all ${
                              prospectPhase === p.id
                                ? 'bg-white text-emerald-700 shadow-xs border border-gray-200'
                                : 'text-gray-500 hover:text-gray-900'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Max Units Selection Operators */}
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                          ⚡ Units Consumed (kWh / Month)
                        </label>
                        <span className="text-[10px] text-gray-400">DISCOM Billed Units</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <div className="inline-flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                          {[
                            { id: 'all', label: 'Any Units' },
                            { id: 'lte', label: '≤ Max' },
                            { id: 'lt', label: '< Less' },
                            { id: 'gte', label: '≥ Min' },
                            { id: 'gt', label: '> More' },
                            { id: 'between', label: 'Between' },
                            { id: 'eq', label: '= Exact' },
                          ].map((op) => (
                            <button
                              key={op.id}
                              type="button"
                              onClick={() => setUnitsOperator(op.id as any)}
                              disabled={isSending}
                              className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-all ${
                                unitsOperator === op.id
                                  ? 'bg-white text-emerald-700 shadow-xs border border-gray-200'
                                  : 'text-gray-500 hover:text-gray-900'
                              }`}
                            >
                              {op.label}
                            </button>
                          ))}
                        </div>

                        {unitsOperator !== 'all' && (
                          <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                            {unitsOperator === 'between' ? (
                              <div className="flex items-center gap-1 w-full">
                                <input
                                  type="number"
                                  min={0}
                                  placeholder="Min"
                                  value={unitsValue || ''}
                                  onChange={(e) => setUnitsValue(e.target.value === '' ? 0 : Number(e.target.value))}
                                  className="w-full px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none"
                                />
                                <span className="text-xs text-gray-400 font-medium">to</span>
                                <input
                                  type="number"
                                  min={0}
                                  placeholder="Max"
                                  value={unitsValueMax || ''}
                                  onChange={(e) => setUnitsValueMax(e.target.value === '' ? 0 : Number(e.target.value))}
                                  className="w-full px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none"
                                />
                                <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">kWh</span>
                              </div>
                            ) : (
                              <div className="relative flex-1">
                                <input
                                  type="number"
                                  min={0}
                                  placeholder={unitsOperator === 'lte' || unitsOperator === 'lt' ? 'e.g. 300' : 'Units'}
                                  value={unitsValue || ''}
                                  onChange={(e) => setUnitsValue(e.target.value === '' ? 0 : Number(e.target.value))}
                                  className="w-full pl-2.5 pr-9 py-1 bg-white border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none"
                                />
                                <span className="absolute right-2 top-1 text-[11px] text-gray-400 font-medium">kWh</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-gray-400 font-medium mr-0.5">Presets:</span>
                        {[
                          { label: '≤ 150 Units', op: 'lte', val: 150, max: 0 },
                          { label: '≤ 300 Units (Free Solar)', op: 'lte', val: 300, max: 0 },
                          { label: '150 - 300 Units', op: 'between', val: 150, max: 300 },
                          { label: '≥ 300 Units', op: 'gte', val: 300, max: 0 },
                          { label: '≥ 500 Units', op: 'gte', val: 500, max: 0 },
                        ].map((chip) => (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => {
                              setUnitsOperator(chip.op as any);
                              setUnitsValue(chip.val);
                              setUnitsValueMax(chip.max);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                              unitsOperator === chip.op && unitsValue === chip.val && (chip.op !== 'between' || unitsValueMax === chip.max)
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Select Contacts from Results
                      </label>
                      <select
                        value={targetSelectCount}
                        onChange={(e) => {
                          const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                          applySelectionCount(val);
                        }}
                        disabled={isSending}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-emerald-500"
                      >
                        <option value="all">All Matching ({matchingProspects.length})</option>
                        <option value={25}>First 25 contacts (Test)</option>
                        <option value={50}>First 50 contacts</option>
                        <option value={100}>First 100 contacts (Recommended)</option>
                        <option value={250}>First 250 contacts</option>
                        <option value={500}>First 500 contacts</option>
                        <option value={1000}>First 1,000 contacts</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Exclusions
                      </label>
                      <div className="space-y-1.5 mt-1">
                        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={excludeAlreadySent}
                            onChange={(e) => setExcludeAlreadySent(e.target.checked)}
                            disabled={isSending}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                            Exclude Already Sent Users
                            {excludedAlreadySentCount > 0 && (
                              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                -{excludedAlreadySentCount}
                              </span>
                            )}
                          </span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={excludeInstalled}
                            onChange={(e) => setExcludeInstalled(e.target.checked)}
                            disabled={isSending}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Hide Solar Installed / EP</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hideSuryaGhar}
                            onChange={(e) => setHideSuryaGhar(e.target.checked)}
                            disabled={isSending}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Hide Existing Customers ('Surya Ghar')</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. EB Customers Filters */}
                {audienceType === 'eb_customers' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Tariff Category
                      </label>
                      <select
                        value={ebCategory}
                        onChange={(e) => setEbCategory(e.target.value)}
                        disabled={isSending}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none"
                      >
                        <option value="all">All Tariff Categories</option>
                        <option value="I">Category-I (Domestic / Residential)</option>
                        <option value="II">Category-II (Commercial / Non-Domestic)</option>
                        <option value="III">Category-III (Industrial)</option>
                        <option value="IV">Category-IV (Institutional / Cottage)</option>
                        <option value="V">Category-V (Agriculture)</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-gray-600">
                          Assembly Constituency
                        </label>
                        {ebConstituency && (
                          <button
                            type="button"
                            onClick={() => setEbConstituency('')}
                            className="text-[10px] text-gray-400 hover:text-gray-600"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={ebConstituency}
                        onChange={(e) => setEbConstituency(e.target.value)}
                        placeholder="e.g. Pithapuram, Kakinada"
                        disabled={isSending}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {[
                          { label: 'All', val: '' },
                          { label: 'Pithapuram', val: 'Pithapuram' },
                          { label: 'Kakinada', val: 'Kakinada' },
                          { label: 'Peddapuram', val: 'Peddapuram' },
                          { label: 'Tuni', val: 'Tuni' },
                        ].map((chip) => (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => setEbConstituency(chip.val)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                              (chip.val === '' && !ebConstituency) ||
                              ebConstituency.toLowerCase() === chip.val.toLowerCase()
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                            }`}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Mandal / ERO
                      </label>
                      <input
                        type="text"
                        value={ebMandal}
                        onChange={(e) => setEbMandal(e.target.value)}
                        placeholder="e.g. Pithapuram, Town, Rural"
                        disabled={isSending}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none"
                      />
                    </div>

                    <div>
                      <AreaCodeFilter
                        label="Area / Village"
                        selected={ebAreaCodes}
                        onChange={(codes) => setEbAreaCodes(codes)}
                        disabled={isSending}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Connected Load (kW)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={ebMinLoad || ''}
                          onChange={(e) => setEbMinLoad(e.target.value === '' ? 0 : Number(e.target.value))}
                          placeholder="Min kW (0 = All)"
                          disabled={isSending}
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                        <span className="absolute right-2.5 top-1.5 text-[11px] text-gray-400 font-semibold">kW</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {[
                          { label: 'All', val: 0 },
                          { label: '2 kW', val: 2 },
                          { label: '3 kW', val: 3 },
                          { label: '5 kW', val: 5 },
                          { label: '10 kW', val: 10 },
                        ].map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => setEbMinLoad(item.val)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                              ebMinLoad === item.val
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Meter Phase
                      </label>
                      <div className="grid grid-cols-3 gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                        {[
                          { id: 'all', label: 'All' },
                          { id: '1', label: '1-Phase' },
                          { id: '3', label: '3-Phase' },
                        ].map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setEbPhase(p.id)}
                            disabled={isSending}
                            className={`py-1 text-center rounded-md text-[11px] font-semibold transition-all ${
                              ebPhase === p.id
                                ? 'bg-white text-emerald-700 shadow-xs border border-gray-200'
                                : 'text-gray-500 hover:text-gray-900'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        EB Call Status
                      </label>
                      <select
                        value={ebCallStatus}
                        onChange={(e) => setEbCallStatus(e.target.value)}
                        disabled={isSending}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none"
                      >
                        <option value="all">All EB Consumers</option>
                        <option value="not_called">Not Called Yet (Raw Data)</option>
                        <option value="interested">Interested in Solar</option>
                        <option value="call_back_later">Call Back Later</option>
                        <option value="converted_to_lead">Converted to Lead</option>
                        <option value="ringing_no_response">Ringing / No Response</option>
                      </select>
                    </div>

                    {/* EB Max Units Selection Operators */}
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                          ⚡ Units Consumed (kWh / Month)
                        </label>
                        <span className="text-[10px] text-gray-400">DISCOM Billed Units</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <div className="inline-flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                          {[
                            { id: 'all', label: 'Any Units' },
                            { id: 'lte', label: '≤ Max' },
                            { id: 'lt', label: '< Less' },
                            { id: 'gte', label: '≥ Min' },
                            { id: 'gt', label: '> More' },
                            { id: 'between', label: 'Between' },
                            { id: 'eq', label: '= Exact' },
                          ].map((op) => (
                            <button
                              key={op.id}
                              type="button"
                              onClick={() => setEbUnitsOperator(op.id as any)}
                              disabled={isSending}
                              className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-all ${
                                ebUnitsOperator === op.id
                                  ? 'bg-white text-emerald-700 shadow-xs border border-gray-200'
                                  : 'text-gray-500 hover:text-gray-900'
                              }`}
                            >
                              {op.label}
                            </button>
                          ))}
                        </div>

                        {ebUnitsOperator !== 'all' && (
                          <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                            {ebUnitsOperator === 'between' ? (
                              <div className="flex items-center gap-1 w-full">
                                <input
                                  type="number"
                                  min={0}
                                  placeholder="Min"
                                  value={ebUnitsValue || ''}
                                  onChange={(e) => setEbUnitsValue(e.target.value === '' ? 0 : Number(e.target.value))}
                                  className="w-full px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none"
                                />
                                <span className="text-xs text-gray-400 font-medium">to</span>
                                <input
                                  type="number"
                                  min={0}
                                  placeholder="Max"
                                  value={ebUnitsValueMax || ''}
                                  onChange={(e) => setEbUnitsValueMax(e.target.value === '' ? 0 : Number(e.target.value))}
                                  className="w-full px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none"
                                />
                                <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">kWh</span>
                              </div>
                            ) : (
                              <div className="relative flex-1">
                                <input
                                  type="number"
                                  min={0}
                                  placeholder={ebUnitsOperator === 'lte' || ebUnitsOperator === 'lt' ? 'e.g. 300' : 'Units'}
                                  value={ebUnitsValue || ''}
                                  onChange={(e) => setEbUnitsValue(e.target.value === '' ? 0 : Number(e.target.value))}
                                  className="w-full pl-2.5 pr-9 py-1 bg-white border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none"
                                />
                                <span className="absolute right-2 top-1 text-[11px] text-gray-400 font-medium">kWh</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-gray-400 font-medium mr-0.5">Presets:</span>
                        {[
                          { label: '≤ 150 Units', op: 'lte', val: 150, max: 0 },
                          { label: '≤ 300 Units (Free Solar)', op: 'lte', val: 300, max: 0 },
                          { label: '150 - 300 Units', op: 'between', val: 150, max: 300 },
                          { label: '≥ 300 Units', op: 'gte', val: 300, max: 0 },
                          { label: '≥ 500 Units', op: 'gte', val: 500, max: 0 },
                        ].map((chip) => (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => {
                              setEbUnitsOperator(chip.op as any);
                              setEbUnitsValue(chip.val);
                              setEbUnitsValueMax(chip.max);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                              ebUnitsOperator === chip.op && ebUnitsValue === chip.val && (chip.op !== 'between' || ebUnitsValueMax === chip.max)
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Select Contacts from Results
                      </label>
                      <select
                        value={targetSelectCount}
                        onChange={(e) => {
                          const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                          applySelectionCount(val);
                        }}
                        disabled={isSending}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-emerald-500"
                      >
                        <option value="all">All Matching ({matchingProspects.length})</option>
                        <option value={25}>First 25 contacts (Test)</option>
                        <option value={50}>First 50 contacts</option>
                        <option value={100}>First 100 contacts (Recommended)</option>
                        <option value={250}>First 250 contacts</option>
                        <option value={500}>First 500 contacts</option>
                        <option value={1000}>First 1,000 contacts</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Exclusions
                      </label>
                      <div className="space-y-1.5 mt-1">
                        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={excludeAlreadySent}
                            onChange={(e) => setExcludeAlreadySent(e.target.checked)}
                            disabled={isSending}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                            Exclude Already Sent Users
                            {excludedAlreadySentCount > 0 && (
                              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                -{excludedAlreadySentCount}
                              </span>
                            )}
                          </span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={excludeInstalled}
                            onChange={(e) => setExcludeInstalled(e.target.checked)}
                            disabled={isSending}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Hide Solar Installed / EP</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hideSuryaGhar}
                            onChange={(e) => setHideSuryaGhar(e.target.checked)}
                            disabled={isSending}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Hide Existing Customers ('Surya Ghar')</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Existing CRM Customers Filters */}
                {audienceType === 'customers' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Overall Workflow Status
                      </label>
                      <select
                        value={customerOverallStatus}
                        onChange={(e) => setCustomerOverallStatus(e.target.value)}
                        disabled={isSending}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none"
                      >
                        <option value="all">All CRM Customers</option>
                        <option value="new">New Leads</option>
                        <option value="in_progress">In Progress (Active Workflows)</option>
                        <option value="pending_docs">Pending Documents</option>
                        <option value="completed">Completed / Commissioned</option>
                        <option value="on_hold">On Hold</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Installation Status
                      </label>
                      <select
                        value={customerInstallStatus}
                        onChange={(e) => setCustomerInstallStatus(e.target.value)}
                        disabled={isSending}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none"
                      >
                        <option value="all">All Installation Statuses</option>
                        <option value="not_started">Not Started</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Subsidy Status
                      </label>
                      <select
                        value={customerSubsidyStatus}
                        onChange={(e) => setCustomerSubsidyStatus(e.target.value)}
                        disabled={isSending}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none"
                      >
                        <option value="all">All Subsidy Statuses</option>
                        <option value="not_claimed">Not Claimed</option>
                        <option value="claimed">Claimed (Awaiting ₹78k DBT)</option>
                        <option value="received">Received (Subsidy Credited)</option>
                        <option value="rejected">Rejected / Needs Action</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Loan / Finance Status
                      </label>
                      <select
                        value={customerLoanStatus}
                        onChange={(e) => setCustomerLoanStatus(e.target.value)}
                        disabled={isSending}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none"
                      >
                        <option value="all">All Finance Types</option>
                        <option value="pending">Loan Application Pending</option>
                        <option value="approved">Loan Sanctioned / Approved</option>
                        <option value="rejected">Loan Rejected</option>
                        <option value="not_applicable">Self-Financed / Cash</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        City / Mandal / District
                      </label>
                      <input
                        type="text"
                        value={customerCity}
                        onChange={(e) => setCustomerCity(e.target.value)}
                        placeholder="e.g. Kakinada, Pithapuram"
                        disabled={isSending}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Min Capacity (kW)
                      </label>
                      <select
                        value={customerMinCapacity}
                        onChange={(e) => setCustomerMinCapacity(Number(e.target.value))}
                        disabled={isSending}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none"
                      >
                        <option value={0}>All Capacities</option>
                        <option value={2}>≥ 2 kW</option>
                        <option value={3}>≥ 3 kW</option>
                        <option value={5}>≥ 5 kW</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Select Contacts from Results
                      </label>
                      <select
                        value={targetSelectCount}
                        onChange={(e) => {
                          const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                          applySelectionCount(val);
                        }}
                        disabled={isSending}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-emerald-500"
                      >
                        <option value="all">All Matching ({matchingProspects.length})</option>
                        <option value={25}>First 25 contacts (Test)</option>
                        <option value={50}>First 50 contacts</option>
                        <option value={100}>First 100 contacts (Recommended)</option>
                        <option value={250}>First 250 contacts</option>
                        <option value={500}>First 500 contacts</option>
                        <option value={1000}>First 1,000 contacts</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Exclusions
                      </label>
                      <div className="space-y-1.5 mt-1">
                        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={excludeAlreadySent}
                            onChange={(e) => setExcludeAlreadySent(e.target.checked)}
                            disabled={isSending}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                            Exclude Already Sent Users
                            {excludedAlreadySentCount > 0 && (
                              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                -{excludedAlreadySentCount}
                              </span>
                            )}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Manual Numbers Input UI */}
                {audienceType === 'manual' && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Test Mobile Number(s)
                      </label>
                      <textarea
                        rows={2}
                        value={manualPhoneNumbers}
                        onChange={(e) => setManualPhoneNumbers(e.target.value)}
                        placeholder="e.g. 9479797947, 8121104043 (comma or newline separated)"
                        disabled={isSending}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">
                        Enter any 10-digit mobile numbers. You can paste multiple numbers separated by commas or lines.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[10px] text-gray-400 font-semibold uppercase">Quick Fill:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const current = parseManualNumbers(manualPhoneNumbers);
                          if (!current.includes('9000273028')) {
                            setManualPhoneNumbers((prev) => (prev ? `${prev}, 9000273028` : '9000273028'));
                          }
                        }}
                        className="px-2 py-0.5 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded text-[10px] font-medium text-emerald-800 shadow-2xs"
                      >
                        + Admin (90002 73028)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const current = parseManualNumbers(manualPhoneNumbers);
                          if (!current.includes('9479797947')) {
                            setManualPhoneNumbers((prev) => (prev ? `${prev}, 9479797947` : '9479797947'));
                          }
                        }}
                        className="px-2 py-0.5 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded text-[10px] font-medium text-emerald-800 shadow-2xs"
                      >
                        + Office (94797 97947)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setManualPhoneNumbers('9000273028, 9479797947');
                        }}
                        className="px-2 py-0.5 bg-blue-50 border border-blue-300 hover:bg-blue-100 rounded text-[10px] font-medium text-blue-800 shadow-2xs"
                      >
                        + Both (9000273028, 9479797947)
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Test Customer Name (for {'{{1}}'} placeholder)
                      </label>
                      <input
                        type="text"
                        value={manualCustomerName}
                        onChange={(e) => setManualCustomerName(e.target.value)}
                        placeholder="e.g. Durga Rao"
                        disabled={isSending}
                        className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Interactive Target Recipient Selection Table */}
                {audienceType !== 'manual' && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <div className="p-2.5 bg-gray-50 border-b border-gray-200 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowRecipientList((prev) => !prev)}
                            className="font-bold text-gray-800 flex items-center gap-1.5 hover:text-emerald-700 text-xs"
                          >
                            {showRecipientList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            Matching Recipients ({matchingProspects.length})
                          </button>
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            {selectedTargetIds.size} of {matchingProspects.length} Selected
                          </span>
                        </div>

                        {/* Quick Selection Buttons */}
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[11px] text-gray-500 font-semibold mr-1">Select:</span>
                          <button
                            type="button"
                            onClick={() => applySelectionCount('all')}
                            disabled={matchingProspects.length === 0}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all border ${
                              selectedTargetIds.size === matchingProspects.length && matchingProspects.length > 0
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            All ({matchingProspects.length})
                          </button>
                          {[25, 50, 100, 250, 500, 1000].map((cap) => {
                            if (cap > matchingProspects.length && matchingProspects.length <= 25) return null;
                            const isCurrent = selectedTargetIds.size === Math.min(cap, matchingProspects.length);
                            return (
                              <button
                                key={cap}
                                type="button"
                                onClick={() => applySelectionCount(cap)}
                                disabled={matchingProspects.length === 0}
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all border ${
                                  isCurrent
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                }`}
                              >
                                First {cap}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => applySelectionCount(0)}
                            disabled={matchingProspects.length === 0 || selectedTargetIds.size === 0}
                            className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:underline px-1.5 py-0.5"
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>

                      {/* Custom Count Selector */}
                      {matchingProspects.length > 0 && (
                        <div className="flex items-center gap-2 pt-1 border-t border-gray-200/70">
                          <span className="text-[11px] text-gray-600 font-medium">Or choose exact count from results:</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              max={matchingProspects.length}
                              placeholder="e.g. 150"
                              value={typeof targetSelectCount === 'number' && targetSelectCount > 0 ? targetSelectCount : ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : Number(e.target.value);
                                if (val > 0) {
                                  applySelectionCount(Math.min(val, matchingProspects.length));
                                } else {
                                  applySelectionCount('all');
                                }
                              }}
                              className="w-24 px-2 py-0.5 bg-white border border-gray-300 rounded text-xs font-semibold focus:outline-none focus:border-emerald-500"
                            />
                            <span className="text-[11px] text-gray-400">contacts from top</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {showRecipientList && (
                      <div className="max-h-52 overflow-y-auto divide-y divide-gray-100">
                        {loadingCount ? (
                          <div className="py-8 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                            Loading matching prospects...
                          </div>
                        ) : matchingProspects.length === 0 ? (
                          <div className="py-8 text-center text-xs text-gray-400">
                            No records found matching these criteria. Try adjusting your filters.
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50/70 text-gray-500 sticky top-0 text-[10px] uppercase font-semibold">
                              <tr>
                                <th className="py-1.5 px-3 w-8 text-center">
                                  <input
                                    type="checkbox"
                                    checked={matchingProspects.length > 0 && selectedTargetIds.size === matchingProspects.length}
                                    onChange={handleToggleSelectAll}
                                    className="rounded text-emerald-600 focus:ring-emerald-500"
                                  />
                                </th>
                                <th className="py-1.5 px-2">Name</th>
                                <th className="py-1.5 px-2">Mobile (+91)</th>
                                <th className="py-1.5 px-2">SC Number</th>
                                <th className="py-1.5 px-2">Location / Mandal</th>
                                <th className="py-1.5 px-2 text-center">Max Units / Bill</th>
                                <th className="py-1.5 px-2 text-center">Recent Units / Bill</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                              {matchingProspects.map((p) => {
                                const isChecked = selectedTargetIds.has(p.id);
                                return (
                                  <tr
                                    key={p.id}
                                    onClick={() => handleToggleTarget(p.id)}
                                    className={`cursor-pointer transition-colors ${
                                      isChecked ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'opacity-40 hover:opacity-75 hover:bg-gray-50'
                                    }`}
                                  >
                                    <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleToggleTarget(p.id)}
                                        className="rounded text-emerald-600 focus:ring-emerald-500"
                                      />
                                    </td>
                                    <td className="py-2 px-2 font-sans font-semibold text-gray-900 truncate max-w-[130px]">
                                      {p.customer_name}
                                    </td>
                                    <td className="py-2 px-2 text-emerald-700 font-medium">
                                      {p.mobile_number}
                                    </td>
                                    <td className="py-2 px-2 text-gray-600 truncate max-w-[110px]">
                                      {p.sc_number}
                                    </td>
                                    <td className="py-2 px-2 font-sans text-gray-600 truncate max-w-[130px]">
                                      <div className="flex flex-col">
                                        <span className="font-medium text-gray-800">{p.mandal_name}</span>
                                        {p.area_name && (
                                          <span className="text-[10px] text-emerald-700 font-semibold">{p.area_name}</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2 px-2 text-center font-sans font-medium">
                                      {p.max_units != null ? (
                                        <div className="flex flex-col items-center">
                                          <span className="font-semibold text-gray-900 flex items-center gap-0.5">
                                            ⚡ {p.max_units} <span className="text-[10px] text-gray-500 font-normal">U</span>
                                          </span>
                                          {p.max_bill != null && (
                                            <span className="text-[10px] text-emerald-700 font-semibold">
                                              ₹{Math.round(Number(p.max_bill)).toLocaleString('en-IN')}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-gray-400 text-[11px]">-</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-2 text-center font-sans font-medium">
                                      {p.recent_units != null ? (
                                        <div className="flex flex-col items-center">
                                          <span className="font-semibold text-gray-900 flex items-center gap-0.5">
                                            ⚡ {p.recent_units} <span className="text-[10px] text-gray-500 font-normal">U</span>
                                          </span>
                                          {p.recent_bill != null && (
                                            <span className="text-[10px] text-blue-700 font-semibold">
                                              ₹{Math.round(Number(p.recent_bill)).toLocaleString('en-IN')}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-gray-400 text-[11px]">-</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Template Picker - Separated Utility vs Marketing */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-800">
                      Select WhatsApp Message Template
                    </label>
                    <span className="text-[11px] text-gray-500">
                      Pricing and conversation tier depends on Meta category approval.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href="https://business.facebook.com/wa/manage/message-templates"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md transition-colors"
                    >
                      Manage in Meta
                      <ArrowUpRight className="w-3 h-3" />
                    </a>

                    {/* Category Filter Tabs */}
                    <div className="inline-flex bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setTemplateCategoryFilter('all')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                        templateCategoryFilter === 'all'
                          ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      All ({availableTemplates.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateCategoryFilter('UTILITY')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                        templateCategoryFilter === 'UTILITY'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-gray-600 hover:text-emerald-700'
                      }`}
                    >
                      <span>⚡ Utility</span>
                      <span className="text-[10px] opacity-90">(~₹0.12)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateCategoryFilter('MARKETING')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                        templateCategoryFilter === 'MARKETING'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-gray-600 hover:text-purple-700'
                      }`}
                    >
                      <span>📢 Marketing</span>
                      <span className="text-[10px] opacity-90">(~₹0.80)</span>
                    </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {availableTemplates
                    .filter((t) => {
                      if (templateCategoryFilter === 'all') return true;
                      return (t.category || 'UTILITY').toUpperCase() === templateCategoryFilter;
                    })
                    .map((t) => {
                      const isUtility = (t.category || 'UTILITY').toUpperCase() === 'UTILITY';
                      const isSelected = selectedTemplateId === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTemplateId(t.id)}
                          disabled={isSending}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? isUtility
                                ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/30'
                                : 'border-purple-600 bg-purple-50/60 ring-2 ring-purple-500/30'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-xs text-gray-900 truncate">{t.displayName}</span>
                            <span className="text-[10px] uppercase font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                              {t.language}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            {isUtility ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                ⚡ UTILITY · ~₹0.12/msg
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                                📢 MARKETING · ~₹0.80/msg
                              </span>
                            )}
                            <span className="text-[10px] text-gray-400 font-mono truncate">
                              {t.name}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 line-clamp-2">{t.description}</p>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Live Preview with Real Sample Data */}
              <div>
                <span className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Live Message Preview ({audienceType === 'manual' ? 'Test Recipient' : 'Sample Recipient'}):
                </span>
                <div className="bg-[#efeae2]/40 p-4 rounded-xl border border-gray-200">
                  <div className="max-w-md bg-white p-3.5 rounded-2xl rounded-tl-sm shadow-xs border border-gray-200 text-xs text-gray-800 whitespace-pre-wrap">
                    {renderTemplateText(selectedTemplate, {
                      customer_name:
                        audienceType === 'manual'
                          ? manualCustomerName || 'Durga Rao'
                          : matchingProspects[0]?.customer_name || 'K. Satyanarayana',
                      sc_number:
                        audienceType === 'manual'
                          ? 'TEST-12345'
                          : matchingProspects[0]?.sc_number || '1982530714003657',
                      circle_name: selectedCircle === 'ALL' ? 'KAKINADA' : selectedCircle,
                      mandal_name:
                        audienceType === 'manual'
                          ? 'PITHAPURAM'
                          : matchingProspects[0]?.mandal_name || selectedCircle,
                    })}
                    {selectedTemplate.buttons && (
                      <div className="pt-2 border-t border-gray-100 mt-2 space-y-1">
                        {selectedTemplate.buttons.map((b, idx) => (
                          <div
                            key={idx}
                            className="py-1 px-2 bg-gray-50 border border-gray-200 rounded text-center text-[11px] font-semibold text-emerald-700"
                          >
                            {b.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sending Progress Bar with Live Cost */}
              {isSending && sendProgress && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      Broadcasting: {sendProgress.current || 'Sending...'}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-800 bg-white/90 px-2 py-0.5 rounded border border-emerald-200 font-mono text-[11px]">
                        Incurred: ₹{(sendProgress.sent * (selectedTemplate.category === 'MARKETING' ? 0.80 : 0.12)).toFixed(2)}
                      </span>
                      <span>
                        {sendProgress.sent} / {sendProgress.total} ({sendProgress.percent}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-emerald-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full transition-all duration-300"
                      style={{ width: `${sendProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Estimated Cost */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 rounded-b-2xl">
              <div className="flex items-center gap-3">
                {/* Live Estimated Meta Cost Box */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white shadow-2xs">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">
                      Estimated Meta Cost
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-extrabold text-emerald-800 font-mono">
                        ₹{((audienceType === 'manual' ? parseManualNumbers(manualPhoneNumbers).length : selectedTargetIds.size) * (selectedTemplate.category === 'MARKETING' ? 0.80 : 0.12)).toFixed(2)}
                      </span>
                      <span className="text-[10px] font-medium text-gray-500">
                        ({audienceType === 'manual' ? parseManualNumbers(manualPhoneNumbers).length : selectedTargetIds.size} × ₹{selectedTemplate.category === 'MARKETING' ? '0.80' : '0.12'})
                      </span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                    selectedTemplate.category === 'MARKETING'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {selectedTemplate.category || 'UTILITY'}
                  </span>
                </div>

                <span className="text-[11px] text-gray-400 hidden sm:inline">
                  Safe rate: 60 msgs/min
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSending}
                  className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (audienceType === 'manual') {
                      handleLaunchCampaign();
                    } else {
                      setShowFinalizeModal(true);
                    }
                  }}
                  disabled={
                    isSending ||
                    (audienceType === 'manual'
                      ? parseManualNumbers(manualPhoneNumbers).length === 0
                      : selectedTargetIds.size === 0)
                  }
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : audienceType === 'manual' ? (
                    <Play className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {isSending
                    ? 'Sending Campaign...'
                    : audienceType === 'manual'
                    ? `Send Test (${parseManualNumbers(manualPhoneNumbers).length} ${
                        parseManualNumbers(manualPhoneNumbers).length === 1 ? 'Number' : 'Numbers'
                      }) · ₹${(parseManualNumbers(manualPhoneNumbers).length * (selectedTemplate.category === 'MARKETING' ? 0.80 : 0.12)).toFixed(2)}`
                    : `Review & Finalize (${selectedTargetIds.size} Selected) · ₹${(selectedTargetIds.size * (selectedTemplate.category === 'MARKETING' ? 0.80 : 0.12)).toFixed(2)}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Finalize Count & Confirmation Modal Overlay */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-emerald-100" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Finalize Campaign & Confirm Count
                  </h3>
                  <p className="text-xs text-emerald-100">
                    Review your verified recipient count and budget before sending
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFinalizeModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Campaign & Template Specs */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Campaign Name:</span>
                  <span className="font-bold text-gray-900 truncate max-w-[260px]">
                    {campaignName || (audienceType === 'eb_customers' ? 'EB Consumers Broadcast' : 'PM Surya Ghar Broadcast')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Audience Source:</span>
                  <span className="font-bold text-emerald-700 uppercase">
                    {audienceType === 'eb_customers' ? '⚡ EB Consumers (DISCOM)' : audienceType === 'prospects' ? '☀️ PM Surya Ghar Leads' : '👥 CRM Clients'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Template:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-gray-800">{selectedTemplate.displayName}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                      selectedTemplate.category === 'MARKETING'
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}>
                      {selectedTemplate.category || 'UTILITY'} (~₹{selectedTemplate.category === 'MARKETING' ? '0.80' : '0.12'}/msg)
                    </span>
                  </div>
                </div>
              </div>

              {/* Verified Count Metrics Breakdown */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                    Total Matched
                  </span>
                  <span className="text-xl font-extrabold text-blue-900 mt-0.5 block">
                    {matchingProspects.length + excludedAlreadySentCount}
                  </span>
                  <span className="text-[10px] text-blue-600 block mt-0.5">Contacts in Filter</span>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                    Already Sent
                  </span>
                  <span className="text-xl font-extrabold text-amber-900 mt-0.5 block">
                    {excludeAlreadySent ? `-${excludedAlreadySentCount}` : '0'}
                  </span>
                  <span className="text-[10px] text-amber-700 block mt-0.5">
                    {excludeAlreadySent ? 'Excluded (Fresh)' : 'Included'}
                  </span>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 ring-2 ring-emerald-500/20">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                    Final Target
                  </span>
                  <span className="text-xl font-extrabold text-emerald-900 mt-0.5 block">
                    {selectedTargetIds.size}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">Ready to Send</span>
                </div>
              </div>

              {/* Quick Count Adjustment / Cap Buttons */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    Finalize Target Send Count:
                  </label>
                  <span className="text-[11px] text-gray-500">
                    Currently selected: <strong>{selectedTargetIds.size}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-gray-400 font-medium">Quick Cap:</span>
                  {[25, 50, 100, 250, 500].map((cap) => {
                    const available = Math.min(cap, matchingProspects.length);
                    const isCurrent = selectedTargetIds.size === available;
                    return (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => {
                          const topSubset = matchingProspects.slice(0, cap);
                          setSelectedTargetIds(new Set(topSubset.map((p) => p.id)));
                        }}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all border ${
                          isCurrent
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        First {cap}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setSelectedTargetIds(new Set(matchingProspects.map((p) => p.id)))}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all border ${
                      selectedTargetIds.size === matchingProspects.length
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    All ({matchingProspects.length})
                  </button>
                </div>
              </div>

              {/* Cost & Speed Summary Banner */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                    Total Estimated Broadcast Cost
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl font-extrabold text-emerald-950 font-mono">
                      ₹{(selectedTargetIds.size * (selectedTemplate.category === 'MARKETING' ? 0.80 : 0.12)).toFixed(2)}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-medium">
                      ({selectedTargetIds.size} × ₹{selectedTemplate.category === 'MARKETING' ? '0.80' : '0.12'})
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 font-medium block">Estimated Time</span>
                  <span className="text-xs font-bold text-gray-800">
                    ~{Math.max(1, Math.ceil(selectedTargetIds.size / 60))} minute{Math.ceil(selectedTargetIds.size / 60) > 1 ? 's' : ''}
                  </span>
                  <span className="text-[10px] text-gray-400 block">Safe 60 msgs/min</span>
                </div>
              </div>

              {/* Sample Recipients Preview (First 3) */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-gray-700 block">
                  Sample Target Recipients ({Math.min(3, selectedTargetIds.size)} of {selectedTargetIds.size}):
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto divide-y divide-gray-100 bg-gray-50/60 rounded-xl p-2 border border-gray-200">
                  {matchingProspects
                    .filter((p) => selectedTargetIds.has(p.id))
                    .slice(0, 3)
                    .map((p, idx) => (
                      <div key={p.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-semibold text-gray-900">{p.customer_name}</span>
                            <span className="text-[11px] text-emerald-700 font-mono ml-2">{p.mobile_number}</span>
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-gray-500">
                          <span>{p.mandal_name || p.circle_name}</span>
                          {p.units && (
                            <span className="text-emerald-700 font-semibold ml-1.5">⚡ {p.units} kWh</span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowFinalizeModal(false)}
                disabled={isSending}
                className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
              >
                ← Back to Filters
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowFinalizeModal(false);
                  handleLaunchCampaign();
                }}
                disabled={isSending || selectedTargetIds.size === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-md transition-all disabled:opacity-50"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>
                  Confirm & Launch Broadcast ({selectedTargetIds.size} Contacts · ₹
                  {(selectedTargetIds.size * (selectedTemplate.category === 'MARKETING' ? 0.80 : 0.12)).toFixed(2)})
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
