import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import React, { useState, useEffect } from 'react';
import { 
  Quotation, 
  Branch, 
  PaymentInRecord, 
  Party, 
  LineItem, 
  DEFAULT_SCOPE_ITEMS, 
  ProposalSection,
  INITIAL_PROPOSAL_SECTIONS,
  PAGE_TITLES,
  DEFAULT_SECTION_CONTENT,
  SectionContentConfig
} from '../types/quotation';
import { ShareWhatsAppModal } from './ShareWhatsAppModal';
import { calculateSolarYieldAndCO2 } from '../lib/solarYieldLookup';
import { autoFitSections, calculatePageOverflow } from '../lib/autoFitProposal';
import { downloadWordBlob, TEJO_BHARAT_17KW_DOCX_BASE64 } from '../lib/wordTemplateExporter';
import { 
  Printer, 
  Download, 
  Save, 
  CheckCircle2, 
  ArrowLeft, 
  Truck, 
  FileText, 
  Share2, 
  Info, 
  ChevronDown, 
  ChevronUp,
  ArrowUp,
  ArrowDown,
  ArrowLeftRight,
  X,
  CreditCard,
  Receipt,
  BookOpen,
  Layers,
  ShieldCheck,
  Zap,
  Award,
  Sun,
  Clock,
  TrendingUp,
  FileCheck,
  Activity,
  Sliders,
  Check,
  MessageSquare,
  Eye,
  EyeOff, 
  RotateCcw, 
  Edit3,
  Edit2,
  Plus,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface QuotationPreviewProps {
  quotation: Quotation;
  branch: Branch;
  onChangeQuotation?: (updated: Quotation) => void;
  onSaveToSupabase?: () => void;
  isSaving?: boolean;
  onOpenRecordPayment?: () => void;
  onOpenEwayBill?: () => void;
  onOpenBranchModal?: () => void;
  payments?: PaymentInRecord[];
  parties?: Party[];
  onBackToList?: () => void;
}

export const QuotationPreview: React.FC<QuotationPreviewProps> = ({
  quotation,
  branch,
  onChangeQuotation,
  onSaveToSupabase,
  isSaving,
  onOpenRecordPayment,
  onOpenEwayBill,
  onOpenBranchModal,
  payments = [],
  parties = [],
  onBackToList
}) => {
  const [showPaymentPanel, setShowPaymentPanel] = useState<boolean>(true);
  const [quoteFormat, setQuoteFormat] = useState<'2_page' | '5_page'>(quotation.quote_format || '5_page');
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);
  const [isPdfDropdownOpen, setIsPdfDropdownOpen] = useState<boolean>(false);
  const [isGeneratingDirectPdf, setIsGeneratingDirectPdf] = useState<boolean>(false);

  // Proposal Section Page Layout State with persistence
  const [sections, setSections] = useState<ProposalSection[]>(() => {
    if (quotation.proposal_sections && Array.isArray(quotation.proposal_sections) && quotation.proposal_sections.length > 0) {
      return quotation.proposal_sections;
    }
    try {
      const saved = localStorage.getItem('tb_proposal_sections_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged: ProposalSection[] = [];
          parsed.forEach((s: any) => {
            const initial = INITIAL_PROPOSAL_SECTIONS.find(d => d.id === s.id);
            if (initial) {
              merged.push({
                ...initial,
                page: typeof s.page === 'number' ? s.page : initial.defaultPage,
                visible: typeof s.visible === 'boolean' ? s.visible : true,
                customTitle: s.customTitle,
                customSubtitle: s.customSubtitle,
                customText: s.customText,
                customBullets: s.customBullets,
                customNote: s.customNote,
              });
            } else if (s.id && typeof s.id === 'string' && s.id.startsWith('custom_')) {
              merged.push(s);
            }
          });
          INITIAL_PROPOSAL_SECTIONS.forEach(d => {
            if (!merged.some(m => m.id === d.id)) {
              merged.push(d);
            }
          });
          return merged;
        }
      }
    } catch (e) {
      console.warn('Error reading saved proposal sections order:', e);
    }
    return INITIAL_PROPOSAL_SECTIONS;
  });

  // Dynamic Proposal Page Count State (minimum 5, can expand to 6, 7, 8...)
  const [pageCount, setPageCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('tb_proposal_page_count');
      const num = saved ? parseInt(saved, 10) : 5;
      return isNaN(num) || num < 5 ? 5 : num;
    } catch (e) {
      return 5;
    }
  });

  // Total pages is the maximum of user pageCount, section pages, or 5
  const totalPages = Math.max(
    pageCount,
    ...sections.map(s => s.page || 1),
    5
  );

  const pageList = Array.from({ length: totalPages }, (_, i) => i + 1);

  // Helper to get descriptive title and icon for any page number
  const getPageInfo = (pageNum: number) => {
    if (PAGE_TITLES[pageNum]) return PAGE_TITLES[pageNum];
    const customPageDefaults: Record<number, { title: string; subtitle: string; icon: string }> = {
      6: { title: 'Page 6', subtitle: 'Technical Annexure & Special Terms', icon: '📑' },
      7: { title: 'Page 7', subtitle: 'Statutory Approvals & Compliance', icon: '📜' },
      8: { title: 'Page 8', subtitle: 'Project Site Specifications & SOPs', icon: '📋' },
      9: { title: 'Page 9', subtitle: 'Additional Terms & Conditions', icon: '📝' },
      10: { title: 'Page 10', subtitle: 'Supplementary Project Documentation', icon: '📁' },
    };
    return customPageDefaults[pageNum] || { title: `Page ${pageNum}`, subtitle: 'Custom Proposal Annexure', icon: '📄' };
  };

  const addPage = () => {
    const newCount = totalPages + 1;
    setPageCount(newCount);
    try {
      localStorage.setItem('tb_proposal_page_count', String(newCount));
    } catch (e) {}
  };

  const removePage = (pageNum: number) => {
    if (totalPages <= 5) {
      alert('The proposal must have at least 5 standard pages.');
      return;
    }
    const pageSecs = sections.filter(s => s.page === pageNum);
    if (pageSecs.length > 0) {
      const confirmMove = window.confirm(
        `Page ${pageNum} currently contains ${pageSecs.length} section(s). Move them to Page ${pageNum - 1} before removing?`
      );
      if (!confirmMove) return;
    }

    updateSections(prev => prev.map(s => {
      if (s.page === pageNum) return { ...s, page: Math.max(1, pageNum - 1) };
      if (s.page > pageNum) return { ...s, page: s.page - 1 };
      return s;
    }));

    const nextCount = Math.max(5, totalPages - 1);
    setPageCount(nextCount);
    try {
      localStorage.setItem('tb_proposal_page_count', String(nextCount));
    } catch (e) {}
  };

  const [showLayoutCustomizer, setShowLayoutCustomizer] = useState<boolean>(false);
  const [showLiveMoverBars, setShowLiveMoverBars] = useState<boolean>(true);
  const [customizerView, setCustomizerView] = useState<'board' | 'list'>('board');
  const [activePageFilter, setActivePageFilter] = useState<number | 'all'>('all');

  // Running Page Footer Toggle (Visible by default; user can hide to save space or remove gaps)
  const [showPageFooters, setShowPageFooters] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('tb_proposal_show_footers');
      return saved !== null ? saved === 'true' : true;
    } catch (e) {
      return true;
    }
  });

  const togglePageFooters = () => {
    setShowPageFooters(prev => {
      const next = !prev;
      try {
        localStorage.setItem('tb_proposal_show_footers', String(next));
      } catch (e) {}
      return next;
    });
  };

  // Add Custom Section Modal State
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState<boolean>(false);
  const [newSectionForm, setNewSectionForm] = useState({
    title: '',
    subtitle: '',
    page: 5,
    text: '',
    bulletsText: '',
    note: ''
  });

  const openAddSectionModal = (defaultPage?: number) => {
    setNewSectionForm({
      title: '',
      subtitle: '',
      page: defaultPage || (activePageFilter !== 'all' ? Number(activePageFilter) : totalPages),
      text: '',
      bulletsText: '',
      note: ''
    });
    setIsAddSectionModalOpen(true);
  };

  const saveNewSection = () => {
    if (!newSectionForm.title.trim()) {
      alert('Please enter a title for the new section');
      return;
    }

    const bullets = newSectionForm.bulletsText
      .split('\n')
      .map(b => b.trim())
      .filter(b => b.length > 0);

    const targetPage = Number(newSectionForm.page) || 1;
    if (targetPage > pageCount) {
      setPageCount(targetPage);
      try {
        localStorage.setItem('tb_proposal_page_count', String(targetPage));
      } catch (e) {}
    }

    const newSecId = `custom_${Date.now()}`;
    const newSec: ProposalSection = {
      id: newSecId,
      title: newSectionForm.title.trim(),
      defaultPage: targetPage,
      page: targetPage,
      visible: true,
      customTitle: newSectionForm.title.trim(),
      customSubtitle: newSectionForm.subtitle.trim() || undefined,
      customText: newSectionForm.text.trim() || undefined,
      customBullets: bullets.length > 0 ? bullets : undefined,
      customNote: newSectionForm.note.trim() || undefined,
    };

    updateSections(prev => [...prev, newSec]);

    if (newSectionForm.note.trim()) {
      setVisibleNotes(prev => {
        const updated = { ...prev, [newSecId]: true };
        try {
          localStorage.setItem('tb_proposal_visible_notes', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    }

    setIsAddSectionModalOpen(false);
  };

  const deleteCustomSection = (id: string) => {
    if (!id.startsWith('custom_')) return;
    if (!window.confirm('Are you sure you want to permanently delete this custom section?')) return;
    updateSections(prev => prev.filter(s => s.id !== id));
  };

  // Section Notes Visibility State (default: false / hidden by default)
  const [showAllNotes, setShowAllNotes] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('tb_proposal_show_all_notes');
      return saved ? JSON.parse(saved) === true : false;
    } catch (e) {
      return false;
    }
  });

  const [visibleNotes, setVisibleNotes] = useState<{ [sectionId: string]: boolean }>(() => {
    try {
      const saved = localStorage.getItem('tb_proposal_visible_notes');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const isSectionNoteVisible = (sectionId: string) => {
    if (showAllNotes) {
      return visibleNotes[sectionId] !== false;
    }
    return !!visibleNotes[sectionId];
  };

  const toggleSectionNote = (sectionId: string) => {
    if (showAllNotes) {
      setVisibleNotes(prev => {
        const currentlyVisible = prev[sectionId] !== false;
        const updated = { ...prev, [sectionId]: !currentlyVisible };
        try {
          localStorage.setItem('tb_proposal_visible_notes', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    } else {
      setVisibleNotes(prev => {
        const currentlyVisible = !!prev[sectionId];
        const updated = { ...prev, [sectionId]: !currentlyVisible };
        try {
          localStorage.setItem('tb_proposal_visible_notes', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    }
  };

  const toggleAllNotes = () => {
    setShowAllNotes(prev => {
      const nextVal = !prev;
      try {
        localStorage.setItem('tb_proposal_show_all_notes', JSON.stringify(nextVal));
      } catch (e) {}
      if (!nextVal) {
        setVisibleNotes({});
        try {
          localStorage.removeItem('tb_proposal_visible_notes');
        } catch (e) {}
      }
      return nextVal;
    });
  };

  // Active Section Text Editing Modal State
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    subtitle: string;
    text: string;
    bulletsText: string;
    note: string;
  }>({ title: '', subtitle: '', text: '', bulletsText: '', note: '' });

  const openSectionEditor = (sectionId: string) => {
    const sec = sections.find(s => s.id === sectionId);
    const def = DEFAULT_SECTION_CONTENT[sectionId] || { title: sec?.title || 'Section', subtitle: '', text: '', bullets: [], note: '' };
    
    setEditingSectionId(sectionId);
    setEditForm({
      title: sec?.customTitle !== undefined ? sec.customTitle : (sec?.title || def.title),
      subtitle: sec?.customSubtitle !== undefined ? sec.customSubtitle : (def.subtitle || ''),
      text: sec?.customText !== undefined ? sec.customText : (def.text || ''),
      bulletsText: sec?.customBullets !== undefined 
        ? sec.customBullets.join('\n') 
        : (def.bullets ? def.bullets.join('\n') : ''),
      note: sec?.customNote !== undefined ? sec.customNote : (def.note || '')
    });
  };

  const saveSectionEdits = () => {
    if (!editingSectionId) return;
    const bullets = editForm.bulletsText
      .split('\n')
      .map(b => b.trim())
      .filter(b => b.length > 0);

    updateSections(prev => prev.map(s => {
      if (s.id === editingSectionId) {
        return {
          ...s,
          title: editForm.title.trim() || s.title,
          customTitle: editForm.title.trim() || undefined,
          customSubtitle: editForm.subtitle.trim() || undefined,
          customText: editForm.text.trim() || undefined,
          customBullets: bullets.length > 0 ? bullets : undefined,
          customNote: editForm.note.trim() || undefined,
        };
      }
      return s;
    }));

    if (editForm.note.trim()) {
      setVisibleNotes(prev => {
        const updated = { ...prev, [editingSectionId]: true };
        try {
          localStorage.setItem('tb_proposal_visible_notes', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    }

    setEditingSectionId(null);
  };

  const resetCurrentSectionText = () => {
    if (!editingSectionId) return;
    const def = DEFAULT_SECTION_CONTENT[editingSectionId];
    if (!def) return;
    setEditForm({
      title: def.title,
      subtitle: def.subtitle || '',
      text: def.text || '',
      bulletsText: def.bullets ? def.bullets.join('\n') : '',
      note: def.note || ''
    });
  };

  const revertSectionToDefault = (sectionId: string) => {
    updateSections(prev => prev.map(s => {
      if (s.id === sectionId) {
        const def = DEFAULT_SECTION_CONTENT[sectionId];
        return {
          ...s,
          title: def?.title || s.title,
          customTitle: undefined,
          customSubtitle: undefined,
          customText: undefined,
          customBullets: undefined,
          customNote: undefined,
        };
      }
      return s;
    }));
    setEditingSectionId(null);
  };


  // Sync state if quotation.proposal_sections changes externally
  useEffect(() => {
    if (quotation.proposal_sections && Array.isArray(quotation.proposal_sections) && quotation.proposal_sections.length > 0) {
      setSections(quotation.proposal_sections);
    }
  }, [quotation.id, quotation.quotation_no]);

  // Helper to commit state changes & persist to localStorage and quotation
  const updateSections = (updater: (prev: ProposalSection[]) => ProposalSection[]) => {
    setSections(prev => {
      const updated = updater(prev);
      try {
        localStorage.setItem('tb_proposal_sections_order', JSON.stringify(updated));
      } catch (e) {}
      if (onChangeQuotation) {
        onChangeQuotation({ ...quotation, proposal_sections: updated });
      }
      return updated;
    });
  };

  // Toggle section visibility
  const toggleSectionVisibility = (id: string) => {
    updateSections(prev => prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
  };

  // Change which page a section belongs to.
  // Defaults to 'start' (position #1) when moving forward (e.g. Page 2 -> 3, Page 3 -> 4)
  // Defaults to 'end' when moving backward (e.g. Page 3 -> 2)
  const changeSectionPage = (id: string, newPage: number, targetPosition?: 'start' | 'end') => {
    if (newPage < 1) return;
    if (newPage > pageCount) {
      setPageCount(newPage);
      try {
        localStorage.setItem('tb_proposal_page_count', String(newPage));
      } catch (e) {}
    }
    updateSections(prev => {
      const sec = prev.find(s => s.id === id);
      if (!sec || sec.page === newPage) return prev;

      const currentPage = sec.page;
      const remaining = prev.filter(s => s.id !== id);
      const movedSec = { ...sec, page: newPage };

      // Default to 'start' (position #1) when moving forward (e.g. 2->3, 3->4)
      // Default to 'end' when moving backward (e.g. 3->2)
      const position = targetPosition || (newPage > currentPage ? 'start' : 'end');

      const targetPageSecs = remaining.filter(s => s.page === newPage);
      if (targetPageSecs.length > 0) {
        if (position === 'start') {
          const firstSec = targetPageSecs[0];
          const insertIdx = remaining.findIndex(s => s.id === firstSec.id);
          remaining.splice(insertIdx, 0, movedSec);
        } else {
          const lastSec = targetPageSecs[targetPageSecs.length - 1];
          const insertIdx = remaining.findIndex(s => s.id === lastSec.id) + 1;
          remaining.splice(insertIdx, 0, movedSec);
        }
      } else {
        // Target page has no sections yet; insert before any higher page section or at the end
        const higherSecIdx = remaining.findIndex(s => s.page > newPage);
        if (higherSecIdx !== -1) {
          remaining.splice(higherSecIdx, 0, movedSec);
        } else {
          remaining.push(movedSec);
        }
      }
      return remaining;
    });
  };

  // Move section UP or DOWN within its page, or transition smoothly across page boundaries
  const moveSectionOnPage = (id: string, direction: 'up' | 'down') => {
    updateSections(prev => {
      const sec = prev.find(s => s.id === id);
      if (!sec) return prev;

      const currentPage = sec.page;
      const pageSecs = prev.filter(s => s.page === currentPage);
      const indexOnPage = pageSecs.findIndex(s => s.id === id);

      if (direction === 'up') {
        if (indexOnPage > 0) {
          // Swap with preceding item on same page
          const prevSec = pageSecs[indexOnPage - 1];
          const curGlobalIdx = prev.findIndex(s => s.id === sec.id);
          const prevGlobalIdx = prev.findIndex(s => s.id === prevSec.id);
          const nextState = [...prev];
          nextState[curGlobalIdx] = prevSec;
          nextState[prevGlobalIdx] = sec;
          return nextState;
        } else if (currentPage > 1) {
          // Already top of current page -> move to previous page as last item
          const targetPage = currentPage - 1;
          const remaining = prev.filter(s => s.id !== id);
          const movedSec = { ...sec, page: targetPage };
          const targetSecs = remaining.filter(s => s.page === targetPage);
          if (targetSecs.length > 0) {
            const lastTargetSec = targetSecs[targetSecs.length - 1];
            const insertIdx = remaining.findIndex(s => s.id === lastTargetSec.id) + 1;
            remaining.splice(insertIdx, 0, movedSec);
          } else {
            const insertIdx = remaining.findIndex(s => s.page >= currentPage);
            if (insertIdx !== -1) remaining.splice(insertIdx, 0, movedSec);
            else remaining.push(movedSec);
          }
          return remaining;
        }
      } else {
        // direction === 'down'
        if (indexOnPage < pageSecs.length - 1) {
          // Swap with succeeding item on same page
          const nextSec = pageSecs[indexOnPage + 1];
          const curGlobalIdx = prev.findIndex(s => s.id === sec.id);
          const nextGlobalIdx = prev.findIndex(s => s.id === nextSec.id);
          const nextState = [...prev];
          nextState[curGlobalIdx] = nextSec;
          nextState[nextGlobalIdx] = sec;
          return nextState;
        } else if (currentPage < totalPages) {
          // Already bottom of current page -> move to next page as first item
          const targetPage = currentPage + 1;
          const remaining = prev.filter(s => s.id !== id);
          const movedSec = { ...sec, page: targetPage };
          const targetSecs = remaining.filter(s => s.page === targetPage);
          if (targetSecs.length > 0) {
            const firstTargetSec = targetSecs[0];
            const insertIdx = remaining.findIndex(s => s.id === firstTargetSec.id);
            remaining.splice(insertIdx, 0, movedSec);
          } else {
            const insertIdx = remaining.findIndex(s => s.page > currentPage);
            if (insertIdx !== -1) remaining.splice(insertIdx, 0, movedSec);
            else remaining.push(movedSec);
          }
          return remaining;
        }
      }
      return prev;
    });
  };

  // Move entire page (swap all sections of pageA with pageB)
  const swapPages = (pageA: number, pageB: number) => {
    if (pageA < 1 || pageA > totalPages || pageB < 1 || pageB > totalPages || pageA === pageB) return;
    updateSections(prev => {
      const swapped = prev.map(s => {
        if (s.page === pageA) return { ...s, page: pageB };
        if (s.page === pageB) return { ...s, page: pageA };
        return s;
      });
      return swapped.sort((a, b) => a.page - b.page);
    });
  };

  // Reset to default layout
  const resetLayout = () => {
    try {
      localStorage.removeItem('tb_proposal_sections_order');
      localStorage.removeItem('tb_proposal_page_count');
    } catch (e) {}
    setPageCount(5);
    updateSections(() => INITIAL_PROPOSAL_SECTIONS);
  };

  // Set all visibility
  const setAllVisibility = (visible: boolean) => {
    updateSections(prev => prev.map(s => ({ ...s, visible })));
  };

  // Group line items by site (e.g. ZPHS School, Panchayat Office, RSK Building, Health Center)
  const siteGroups = React.useMemo(() => {
    if (!quotation.line_items || quotation.line_items.length === 0) return [];

    const groups: { [key: string]: { siteName: string; capacityKw: number; isHybrid: boolean; items: LineItem[]; totalCost: number } } = {};

    quotation.line_items.forEach((item) => {
      let siteName = item.name;
      if (item.name.includes('–')) {
        siteName = item.name.split('–')[0].trim();
      } else if (item.name.includes(' - ')) {
        siteName = item.name.split(' - ')[0].trim();
      } else if (item.name.includes(':')) {
        siteName = item.name.split(':')[0].trim();
      } else if (/^\d+\s*k[wW]p?\s*On/i.test(item.name)) {
        siteName = 'ZPHS School';
      }

      if (!groups[siteName]) {
        groups[siteName] = {
          siteName,
          capacityKw: 0,
          isHybrid: false,
          items: [],
          totalCost: 0
        };
      }

      groups[siteName].items.push(item);
      groups[siteName].totalCost += (item.total_amount || 0);

      const nameLower = item.name.toLowerCase();
      const descLower = (item.description || '').toLowerCase();
      const unitLower = (item.unit || '').toLowerCase();
      if (unitLower === 'kw' || unitLower === 'kwp' || nameLower.includes('kw') || descLower.includes('kw')) {
        if (item.qty && item.qty > 0 && groups[siteName].capacityKw === 0 && (unitLower === 'kw' || unitLower === 'kwp')) {
          groups[siteName].capacityKw = item.qty;
        } else if (groups[siteName].capacityKw === 0) {
          const match = (item.name + ' ' + (item.description || '')).match(/(\d+(?:\.\d+)?)\s*k[wW]/);
          if (match) {
            groups[siteName].capacityKw = parseFloat(match[1]);
          }
        }
      }
      if (nameLower.includes('hybrid') || nameLower.includes('battery') || descLower.includes('hybrid') || descLower.includes('battery')) {
        groups[siteName].isHybrid = true;
      }
    });

    return Object.values(groups);
  }, [quotation.line_items]);

  const siteGroupCapacitySum = React.useMemo(() => {
    return siteGroups.reduce((acc, g) => acc + (g.capacityKw || 0), 0);
  }, [siteGroups]);

  // Total system capacity kW: accurately compute sum for multi-site proposals or line items
  const displayTotalCapacity = React.useMemo(() => {
    if (siteGroups.length > 1 && siteGroupCapacitySum > 0) {
      return siteGroupCapacitySum;
    }
    if (quotation.line_items && quotation.line_items.length > 0) {
      const kwItems = quotation.line_items.filter(it => {
        const u = (it.unit || '').trim().toLowerCase();
        return u === 'kw' || u === 'kwp';
      });
      if (kwItems.length > 1) {
        const sum = kwItems.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);
        if (sum > 0) return sum;
      }
    }
    return quotation.system_capacity_kw || siteGroupCapacitySum || 5;
  }, [siteGroups, siteGroupCapacitySum, quotation.line_items, quotation.system_capacity_kw]);

  const [autoFitToast, setAutoFitToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const handleAutoFit = () => {
    const result = autoFitSections(sections, quotation, {
      showPageFooters,
      isSectionNoteVisible,
      siteGroupsCount: siteGroups.length
    });

    if (result.totalPagesNeeded > pageCount) {
      setPageCount(result.totalPagesNeeded);
      try {
        localStorage.setItem('tb_proposal_page_count', String(result.totalPagesNeeded));
      } catch (e) {}
    }

    updateSections(() => result.updatedSections);

    const message = result.pagesExpanded
      ? `⚡ Auto-Fit Complete: Proposal expanded to ${result.totalPagesNeeded} pages to fit all items with 0 overflow!`
      : `⚡ Auto-Fit Complete: All content neatly balanced across ${result.totalPagesNeeded} pages with 0 overflow!`;

    setAutoFitToast({
      message,
      type: 'success'
    });

    setTimeout(() => {
      setAutoFitToast(null);
    }, 4500);
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const partyName = (quotation.customer_name || 'Customer')
      .replace(/[/\\?%*:|"<>]/g, '')
      .trim();
    const capacity = displayTotalCapacity;
    const docNo = quotation.quotation_no || '';

    document.title = `${partyName} - ${capacity}kW Solar Proposal #${docNo}`.trim();
    window.print();

    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  };

  // Primary PDF action: Uses browser's native vector engine (Cmd+P) for 100% exact alignment and sharp vector text
  const handleDownloadPDF = () => {
    handlePrint();
  };

  // Direct 1-click PDF download with locked aspect ratio to avoid any vertical stretching
  const handleDownloadDirectPDF = async () => {
    const printArea = document.querySelector('.quotation-print-area') as HTMLElement | null;
    if (!printArea) {
      handlePrint();
      return;
    }

    const pages = Array.from(printArea.querySelectorAll('.page')) as HTMLElement[];
    if (pages.length === 0) {
      handlePrint();
      return;
    }

    const partyName = (quotation.customer_name || 'Customer')
      .replace(/[/\\?%*:|"<>]/g, '')
      .trim();
    const capacity = displayTotalCapacity;
    const docNo = quotation.quotation_no || '';
    const filename = `${partyName}_${capacity}kW_Solar_Proposal_${docNo}.pdf`;

    setIsGeneratingDirectPdf(true);

    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];

        const canvas = await html2canvas(page, {
          scale: 2.5,
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          
          backgroundColor: '#ffffff',
          ignoreElements: (element: Element) => element.classList?.contains('no-print')
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.98);

        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        // Lock exact aspect ratio so cards and badges are never vertically stretched
        const imgHeightMm = (canvas.height / canvas.width) * 210;
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, Math.min(297, imgHeightMm), undefined, 'FAST');
      }

      pdf.save(filename);
    } catch (e) {
      console.warn('Direct PDF export error, falling back to print:', e);
      handlePrint();
    } finally {
      setIsGeneratingDirectPdf(false);
    }
  };

  const handleDownloadWord = () => {
    const partyName = (quotation.customer_name || 'Customer')
      .replace(/[/\\?%*:|"<>]/g, '')
      .trim();
    const capacity = displayTotalCapacity;
    const docNo = quotation.quotation_no || '';
    const filename = `${partyName}_${capacity}kW_Solar_Proposal_${docNo}.docx`;
    downloadWordBlob(TEJO_BHARAT_17KW_DOCX_BASE64, filename);
  };

  const totalAmt = quotation.total_amount || 0;
  const receivedAmt = quotation.amount_received || 0;
  const balanceAmt = Math.max(0, totalAmt - receivedAmt);
  
  const isPaid = balanceAmt <= 0;
  const isPartial = receivedAmt > 0 && balanceAmt > 0;
  const statusLabel = isPaid ? 'Paid' : isPartial ? 'Partially Paid' : 'Unpaid';

  // Environmental Calculations based on State Solar Insolation
  const custState = quotation.customer_location || quotation.customer_address || 'Telangana';
  const yieldInfo = calculateSolarYieldAndCO2(displayTotalCapacity || 5, custState);
  
  const annUnits = quotation.annual_units || yieldInfo.annualUnits;
  const annCo2Tonnes = yieldInfo.annualCo2OffsetTonnes;
  const lifeCo2Tonnes = yieldInfo.lifetimeCo2OffsetTonnes;
  const annTrees = yieldInfo.annualTreesEquivalent;
  const lifeTrees = yieldInfo.lifetimeTreesEquivalent;

  // Filter payments linked to this invoice
  const invoicePayments = payments.filter((p) => 
    p.settled_invoices?.some((s) => s.invoice_no === quotation.quotation_no)
  );

  // Dynamic Branch Address Resolution
  const isAndhra = (quotation.branch?.state || '').toLowerCase().includes('andhra') ||
                   (quotation.branch?.address || '').toLowerCase().includes('andhra') ||
                   (quotation.branch_id || '').includes('pith') ||
                   (branch?.state || '').toLowerCase().includes('andhra') ||
                   (branch?.id || '').includes('pith') ||
                   (quotation.customer_location || '').toLowerCase().includes('andhra') ||
                   (quotation.customer_address || '').toLowerCase().includes('andhra') ||
                   (quotation.customer_billing_address || '').toLowerCase().includes('andhra');

  const activeBranch = quotation.branch || branch;
  const companyName = activeBranch?.company_name || 'TEJO BHARAT GLOBAL ENERGY LLP';
  const companyAddress = activeBranch?.address || (isAndhra 
    ? 'Seethayya Gari Thota, Pithapuram, Kakinada District, Andhra Pradesh' 
    : 'N V Homes, Moosapet, Hyderabad, Telangana');
  const companyPhone = activeBranch?.phone || '+91 94797 97947';
  const companyEmail = activeBranch?.email || 'contact@tejobharat.com';
  const companyWebsite = activeBranch?.website || 'www.tejobharat.com';
  const companyGstin = isAndhra 
    ? (activeBranch?.gstin && activeBranch.gstin.startsWith('37') && !activeBranch.gstin.includes('AAAAA') ? activeBranch.gstin : '37AAYFT4513H1ZO') 
    : (activeBranch?.gstin && !activeBranch.gstin.includes('AAAAA') ? activeBranch.gstin : '36AAUFT4289K1ZE');
  const rawCin = activeBranch?.cin || 'ACQ-2334';
  const companyCin = rawCin.includes(':') ? rawCin : (rawCin.startsWith('ACQ') || rawCin.length <= 10 ? `LLPIN: ${rawCin}` : `CIN: ${rawCin}`);
  const companyPan = activeBranch?.pan || (companyGstin.length >= 12 ? companyGstin.substring(2, 12) : 'AAYFT4513H');
  const companySignatoryTitle = activeBranch?.signatory_title || 'Authorized Signatory';

  // Helper to remove any "(Rate: ₹.../kW)" or "Rate: ₹.../kW" from item descriptions
  const cleanItemDescription = (desc?: string) => {
    if (!desc) return '';
    return desc
      .replace(/\s*\(\s*Rate:\s*₹?[^)]+\/kW\s*\)/gi, '')
      .replace(/\s*\(\s*Rate:\s*[^)]+\)/gi, '')
      .replace(/\s*Rate:\s*₹?[^,\s)]+\/kW/gi, '')
      .trim();
  };

  // Fixed Calculations
  const effectiveRatePerKw = quotation.total_amount ? (quotation.total_amount / displayTotalCapacity) : (quotation.rate_per_kw || 55000);
  const grossCost = quotation.total_amount || (displayTotalCapacity * effectiveRatePerKw);
  const additionalCharges = quotation.additional_charges || 0;
  const additionalChargesLabel = quotation.additional_charges_label || 'Transportation, Freight & Delivery Charges';
  const grossCostWithCharges = grossCost + additionalCharges;
  
  // Exact Subsidy & Policy Calculation Rules
  const normCat = (quotation.category || '').toLowerCase();
  let subsidyAmount = 0;
  let subsidyText = 'Central Govt. Subsidy (Not Applicable)';
  let subsidyNote = 'No Central DBT Subsidy for Commercial/Industrial';

  if (normCat.includes('residential') || normCat.includes('home')) {
    if (displayTotalCapacity <= 2) {
      subsidyAmount = displayTotalCapacity * 30000;
    } else if (displayTotalCapacity < 3) {
      subsidyAmount = 60000 + ((displayTotalCapacity - 2) * 18000);
    } else {
      subsidyAmount = 78000; // Capped at ₹78,000 max
    }
    subsidyText = 'PM Surya Ghar Central Subsidy (Direct DBT Credit)';
    subsidyNote = '₹30,000/kW for first 2 kW + ₹18,000 for 3rd kW (Max ₹78,000 capped)';
  } else if (normCat.includes('group') || normCat.includes('ghs') || normCat.includes('housing')) {
    subsidyAmount = Math.min(displayTotalCapacity * 18000, 500 * 18000);
    subsidyText = 'GHS PM Surya Ghar Subsidy (@ ₹18,000 / kW)';
    subsidyNote = '₹18,000 per kW for Group Housing Society (GHS/RWA) Common Facilities';
  } else if (normCat.includes('off-grid') || normCat.includes('offgrid')) {
    subsidyAmount = 0;
    subsidyText = 'Central Net-Metering Subsidy (Not Applicable)';
    subsidyNote = 'Off-Grid solar systems operate with standalone battery storage independent of grid net-metering';
  } else {
    subsidyAmount = 0;
    subsidyText = 'MNRE Central Subsidy (Not Applicable)';
    subsidyNote = 'Commercial & Industrial consumers receive 40% Accelerated Depreciation & GST Input Tax Benefits';
  }
  
  const netPayable = Math.max(0, grossCostWithCharges - subsidyAmount);

  // Detailed GST & Line Item Computations
  const hasLineItems = Boolean(quotation.line_items && quotation.line_items.length > 0);
  const fallbackTaxRate = quotation.gst_rate_percent || 8.9;

  const processedLineItems = (quotation.line_items || []).map((item) => {
    const qty = Number(item.qty) || 1;
    const discount = Number(item.discount_rs) || 0;
    const taxRate = item.tax_rate_percent !== undefined && item.tax_rate_percent !== null ? Number(item.tax_rate_percent) : fallbackTaxRate;
    
    let totalAmt = Number(item.total_amount) || 0;
    let baseRate = Number(item.price_per_item) || 0;
    let taxableAmt = 0;
    let taxAmt = 0;

    if (totalAmt > 0 && (!baseRate || baseRate === 0)) {
      taxableAmt = Math.round((totalAmt / (1 + taxRate / 100)) * 100) / 100;
      baseRate = Math.round(((taxableAmt + discount) / qty) * 100) / 100;
      taxAmt = Math.round((totalAmt - taxableAmt) * 100) / 100;
    } else if (baseRate > 0) {
      taxableAmt = Math.round((baseRate * qty - discount) * 100) / 100;
      taxAmt = item.tax_amount ? Number(item.tax_amount) : Math.round(((taxableAmt * taxRate) / 100) * 100) / 100;
      if (!totalAmt || totalAmt === 0) {
        totalAmt = Math.round((taxableAmt + taxAmt) * 100) / 100;
      }
    } else {
      taxableAmt = 0;
      taxAmt = 0;
      totalAmt = 0;
    }

    return {
      ...item,
      qty,
      taxRate,
      baseRate,
      taxableAmt,
      taxAmt,
      totalAmt
    };
  });

  const totalLineTaxableValue = processedLineItems.reduce((sum, it) => sum + it.taxableAmt, 0);
  const totalLineTaxAmount = processedLineItems.reduce((sum, it) => sum + it.taxAmt, 0);

  const computedTaxableTotal = hasLineItems && totalLineTaxableValue > 0
    ? totalLineTaxableValue
    : Math.round((grossCost / (1 + fallbackTaxRate / 100)) * 100) / 100;
  const computedTaxTotal = hasLineItems && totalLineTaxAmount > 0
    ? totalLineTaxAmount
    : Math.round((grossCost - computedTaxableTotal) * 100) / 100;

  // Intra-state vs Inter-state
  const branchState = (branch?.state || 'Andhra Pradesh').toLowerCase().trim();
  const customerState = (quotation.customer_location || quotation.customer_address || 'Andhra Pradesh').toLowerCase().trim();
  const isInterstate = quotation.is_interstate ?? (
    customerState !== '' && !customerState.includes('andhra') && !customerState.includes('ap') && !branchState.includes(customerState)
  );

  const cgstTotal = Math.round((computedTaxTotal / 2) * 100) / 100;
  const sgstTotal = Math.round((computedTaxTotal / 2) * 100) / 100;
  const igstTotal = computedTaxTotal;

  const effectiveGstPct = computedTaxableTotal > 0 ? ((computedTaxTotal / computedTaxableTotal) * 100) : (quotation.gst_rate_percent || 8.9);
  const effectiveGstLabel = effectiveGstPct > 0 ? `${effectiveGstPct.toFixed(1).replace(/\.0$/, '')}%` : '0%';
  const effectiveHalfGstLabel = effectiveGstPct > 0 ? `${(effectiveGstPct / 2).toFixed(2).replace(/\.00$/, '')}%` : '0%';

  // Cleaned Equipment Strings for BOM rendering
  const rawInverter = quotation.inverter_brand || 'Deye Inverter';
  const cleanInverterBrand = rawInverter
    .replace(/3-Phase|1-Phase|Single Phase|\(1-Phase\)|\(3-Phase\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Deye Inverter';
  
  const displayInverterPhase = quotation.inverter_phase || (displayTotalCapacity >= 5 ? 'Three Phase (3-Phase)' : 'Single Phase (1-Phase)');

  const displayStructureHeight = quotation.structure_height || 'Elevated Superstructure (6ft–10ft Height)';
  const displayStructureType = quotation.structure_type || 'Hot-Dip Galvanized (HDG) Steel Superstructure (80+ Micron Zinc)';
  const displayStructureGrid = quotation.structure_grid ? `${quotation.structure_grid.split(' ')[0]} Layout` : '3x5 Layout';

  // ROI & Financial Math (Real Cumulative Calculation)
  let currentTariff = 7.50;
  let currentGen = annUnits;
  let cumulative = 0;
  const roiData = [];
  
  for (let i = 1; i <= 25; i++) {
    const annualSavings = currentGen * currentTariff;
    cumulative += annualSavings;
    if (i === 1 || i === 5 || i === 10 || i === 25) {
      roiData.push({
        year: i,
        tariff: currentTariff,
        generation: currentGen,
        annualSavings: annualSavings,
        cumulativeSavings: cumulative
      });
    }
    currentTariff *= 1.05; // 5% tariff inflation
    currentGen *= 0.99; // 1% panel degradation
  }

  const y1 = roiData[0];
  const y5 = roiData[1];
  const y10 = roiData[2];
  const y25 = roiData[3];

  // Payback period calculation (linear approximation)
  let paybackYears = 0;
  let tempCum = 0;
  let tempTariff = 7.50;
  let tempGen = annUnits;
  for(let i = 1; i <= 15; i++) {
    tempCum += tempGen * tempTariff;
    if (tempCum >= netPayable) {
      const prevCum = tempCum - (tempGen * tempTariff);
      const remainder = netPayable - prevCum;
      paybackYears = (i - 1) + (remainder / (tempGen * tempTariff));
      break;
    }
    tempTariff *= 1.05;
    tempGen *= 0.99;
  }
  const displayPayback = paybackYears > 0 ? paybackYears.toFixed(1) : quotation.payback_period_years;

  // Commercial vs Residential Panel Specification
  const isCommercial = normCat.includes('commercial') || 
                       normCat.includes('industrial') || 
                       normCat.includes('institutional');

  const defaultPanelBrand = isCommercial 
    ? 'Tier-1 Non-DCR (NDCR) 500+ W High Efficiency Modules' 
    : 'Premier / Waaree 500+ W Mono DCR (ALMM Listed)';

  const defaultPanelSpec = isCommercial
    ? 'Non-DCR (NDCR) 500+ W High Efficiency PV Modules (TOPCon/Mono PERC, BIS Certified)'
    : 'Mono DCR PV Modules (500+ W High Efficiency, ALMM Listed, BIS Certified)';

  const defaultPanelShort = isCommercial ? 'Non-DCR (NDCR) 500+ W' : 'Mono DCR 500+ W';

  // Seasonal Generation breakdown
  const baseMonthly = quotation.monthly_units || (annUnits / 12);
  const summerUnits = Math.round(baseMonthly * 1.25);
  const monsoonUnits = Math.round(baseMonthly * 0.80);
  const winterUnits = Math.round(baseMonthly * 1.05);

  // Helper function to render a specific section by its ID
  const renderSectionById = (sectionId: string) => {
    const sec = sections.find(s => s.id === sectionId);
    const def = DEFAULT_SECTION_CONTENT[sectionId] || { title: sec?.title || '', subtitle: '', text: '', bullets: [], note: '' };
    const customTitle = sec?.customTitle || def.title;
    const customSubtitle = sec?.customSubtitle !== undefined ? sec.customSubtitle : def.subtitle;
    const customText = sec?.customText !== undefined ? sec.customText : def.text;
    const customBullets = (sec?.customBullets && sec.customBullets.length > 0) ? sec.customBullets : (def.bullets || []);
    const customNote = sec?.customNote !== undefined ? sec.customNote : def.note;
    const isNoteVisible = isSectionNoteVisible(sectionId);

    const renderCustomNote = () => {
      if (!customNote || !customNote.trim()) return null;

      if (!isNoteVisible) {
        return (
          <div className="no-print mt-1.5 flex items-center">
            <button
              type="button"
              onClick={() => toggleSectionNote(sectionId)}
              className="text-[9.5px] text-slate-500 hover:text-amber-900 bg-amber-50/70 hover:bg-amber-100/90 border border-amber-200/80 rounded-md px-2 py-0.5 flex items-center gap-1.5 font-semibold transition-all cursor-pointer shadow-2xs group/btn"
              title="Click to show note on this proposal section"
            >
              <span className="text-amber-600 font-bold">📌 Note</span>
              <span className="text-slate-400 group-hover/btn:text-amber-800">▸ Click to show</span>
            </button>
          </div>
        );
      }

      return (
        <div className="mt-2 text-[10px] bg-amber-50/95 border border-amber-300 rounded-lg p-2 text-amber-950 flex items-start justify-between gap-1.5 shadow-2xs">
          <div className="flex items-start gap-1.5 flex-1 min-w-0">
            <span className="text-amber-600 font-bold flex-shrink-0">📌 Note:</span>
            <span className="italic leading-snug">{customNote}</span>
          </div>
          <button
            type="button"
            onClick={() => toggleSectionNote(sectionId)}
            className="no-print text-slate-400 hover:text-amber-950 px-1.5 py-0.5 rounded hover:bg-amber-100 text-[9.5px] font-bold transition-colors cursor-pointer ml-1 flex-shrink-0"
            title="Hide this note"
          >
            ✕ Hide
          </button>
        </div>
      );
    };

    switch (sectionId) {
      case 'header_exec':
        return (
          <div key="header_exec" className="space-y-2">
            <div className="flex justify-between items-start border-b-2 border-teal-700 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center border-2 border-amber-400 p-1 shadow-md flex-shrink-0">
                  <img src="/logo.png" alt="Tejo Bharat Logo" className="w-full h-full object-contain" onError={(e) => {(e.target as HTMLElement).style.display = 'none';}} />
                </div>
                <div>
                  <h1 className="text-xl font-black text-amber-500 tracking-wide leading-tight">TEJO BHARAT GLOBAL ENERGY LLP</h1>
                  <p className="text-xs text-slate-600 font-bold mt-0.5">{customSubtitle || 'Accelerating a Sustainable Future'}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">📍 {companyAddress}</p>
                  <p className="text-[11px] text-slate-500">📞 <strong className="text-teal-800">{companyPhone}</strong> | ✉️ <strong className="text-teal-800">{companyEmail}</strong> | 🌐 <strong className="text-teal-800">{companyWebsite}</strong></p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-3 rounded-xl text-right border-2 border-amber-400/50 shadow-md">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">SOLAR PROPOSAL & QUOTE</div>
                <div className="text-sm font-black mt-0.5">{quotation.quotation_no}</div>
                <div className="text-[10px] text-slate-300 mt-0.5">Date: {quotation.quotation_date}</div>
                <div className="text-[10px] text-teal-300 font-bold mt-0.5">Valid: {quotation.valid_until}</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-teal-900 text-white rounded-xl p-3.5 shadow-md border border-teal-600">
              <div className="text-[10px] font-bold uppercase tracking-widest text-amber-300 mb-0.5">TECHNICAL & COMMERCIAL PROPOSAL</div>
              <h2 className="text-lg font-black tracking-tight">{customTitle || `${displayTotalCapacity} kWp On-Grid Solar PV Power System`}</h2>
              <p className="text-[11px] text-teal-100 mt-1 leading-snug">
                {customText || 'Customized high-efficiency rooftop solar energy solution engineered for maximum solar yield, 25-year performance warranty, and zero-electricity bill operation.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="border-2 border-slate-200 rounded-xl p-3 bg-slate-50/70 shadow-xs">
                <div className="text-[11px] font-black text-teal-900 uppercase tracking-wider mb-2 flex items-center gap-2 border-b pb-1 border-slate-200">
                  <span>👤 Customer & Site Information</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between border-b pb-0.5 border-slate-200/60"><span className="text-slate-500 font-medium">Client Name:</span> <span className="font-bold text-slate-900">{quotation.customer_name}</span></div>
                  <div className="flex justify-between border-b pb-0.5 border-slate-200/60"><span className="text-slate-500 font-medium">Site Address:</span> <span className="font-semibold text-slate-800 text-right max-w-[180px] leading-tight">{quotation.customer_billing_address || quotation.customer_address || quotation.customer_location}</span></div>
                  <div className="flex justify-between border-b pb-0.5 border-slate-200/60"><span className="text-slate-500 font-medium">Category:</span> <span className="font-semibold text-slate-800">{quotation.category}</span></div>
                  {quotation.customer_gstin && (
                    <div className="flex justify-between border-b pb-0.5 border-slate-200/60"><span className="text-slate-500 font-medium">GSTIN:</span> <span className="font-mono font-bold text-teal-900">{quotation.customer_gstin}</span></div>
                  )}
                  {quotation.customer_pan && (
                    <div className="flex justify-between border-b pb-0.5 border-slate-200/60"><span className="text-slate-500 font-medium">PAN:</span> <span className="font-mono font-bold text-slate-900">{quotation.customer_pan}</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Phone:</span> <span className="font-semibold text-slate-800">{quotation.customer_phone || 'N/A'}</span></div>
                </div>
              </div>
              <div className="border-2 border-slate-200 rounded-xl p-3 bg-slate-50/70 shadow-xs">
                <div className="text-[11px] font-black text-teal-900 uppercase tracking-wider mb-2 flex items-center gap-2 border-b pb-1 border-slate-200">
                  <span>📌 Executive Highlights</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between border-b pb-0.5 border-slate-200/60"><span className="text-slate-500 font-medium">System Capacity:</span> <span className="font-black text-teal-800">{displayTotalCapacity} kWp</span></div>
                  <div className="flex justify-between border-b pb-0.5 border-slate-200/60"><span className="text-slate-500 font-medium">Monthly Generation:</span> <span className="font-bold text-slate-900">~{quotation.monthly_units.toLocaleString('en-IN')} Units</span></div>
                  <div className="flex justify-between border-b pb-0.5 border-slate-200/60"><span className="text-slate-500 font-medium">Est. Monthly Savings:</span> <span className="font-bold text-emerald-700">₹ {quotation.monthly_savings_rs.toLocaleString('en-IN')} / mo</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Payback Period:</span> <span className="font-bold text-amber-700">~{displayPayback} Years</span></div>
                </div>
              </div>
            </div>
            {renderCustomNote()}
          </div>
        );

      case 'seasonal_profile':
        return (
          <div key="seasonal_profile" className="border-2 border-slate-200 rounded-xl p-3 bg-slate-50/70 text-xs space-y-1.5">
            <div className="font-extrabold text-slate-900 uppercase tracking-wide text-[11px] flex justify-between items-center border-b pb-1 border-slate-200">
              <span>{customTitle || '🌤️ Estimated Seasonal Energy Generation Profile'}</span>
              <span className="text-[9px] bg-teal-100 text-teal-900 font-bold px-2 py-0.5 rounded-full uppercase">{customSubtitle || `${yieldInfo.state} Insolation Index`}</span>
            </div>
            {customText && <p className="text-[10px] text-slate-600 mb-1 leading-snug">{customText}</p>}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white border border-amber-200 p-2 rounded-lg shadow-xs space-y-0.5">
                <div className="font-extrabold text-amber-900 text-[10.5px]">Summer Peak (Mar - May)</div>
                <div className="text-sm font-black text-amber-700">~{summerUnits} Units / Mo</div>
                <div className="text-[9px] text-amber-800 font-medium">Peak Solar Radiation (~5.8 kWh/m²/day)</div>
              </div>
              <div className="bg-white border border-sky-200 p-2 rounded-lg shadow-xs space-y-0.5">
                <div className="font-extrabold text-sky-900 text-[10.5px]">Monsoon Season (Jun - Sep)</div>
                <div className="text-sm font-black text-sky-700">~{monsoonUnits} Units / Mo</div>
                <div className="text-[9px] text-sky-800 font-medium">Cloud Diffuse Solar Irradiation</div>
              </div>
              <div className="bg-white border border-emerald-200 p-2 rounded-lg shadow-xs space-y-0.5">
                <div className="font-extrabold text-emerald-900 text-[10.5px]">Winter Season (Oct - Feb)</div>
                <div className="text-sm font-black text-emerald-700">~{winterUnits} Units / Mo</div>
                <div className="text-[9px] text-emerald-800 font-medium">Optimal Cell Thermal Efficiency</div>
              </div>
            </div>
            {renderCustomNote()}
          </div>
        );

      case 'env_impact':
        return (
          <div key="env_impact" className="bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 border-2 border-emerald-200 rounded-xl p-3 text-xs space-y-1.5">
            <div className="font-extrabold text-emerald-900 uppercase tracking-wide text-[11px] flex justify-between items-center border-b pb-1 border-emerald-200">
              <span>{customTitle || '🌍 25-Year Lifetime Environmental Impact'}</span>
              <span className="text-[9px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full">{customSubtitle || 'Green Energy Contribution'}</span>
            </div>
            {customText && <p className="text-[10px] text-emerald-800 font-medium mb-1 leading-snug">{customText}</p>}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white border border-emerald-200 p-2 rounded-lg shadow-xs">
                <div className="text-lg font-black text-emerald-700">{lifeCo2Tonnes} T</div>
                <div className="text-[10px] font-bold text-emerald-900">CO₂ Offset (Lifetime)</div>
                <div className="text-[9px] text-slate-500">Equivalent to planting</div>
              </div>
              <div className="bg-white border border-emerald-200 p-2 rounded-lg shadow-xs">
                <div className="text-lg font-black text-green-700">{lifeTrees.toLocaleString('en-IN')}</div>
                <div className="text-[10px] font-bold text-green-900">Trees Equivalent</div>
                <div className="text-[9px] text-slate-500">Over 25 years</div>
              </div>
              <div className="bg-white border border-emerald-200 p-2 rounded-lg shadow-xs">
                <div className="text-lg font-black text-teal-700">{(quotation.annual_units * 25).toLocaleString('en-IN')}</div>
                <div className="text-[10px] font-bold text-teal-900">Total Units Generated</div>
                <div className="text-[9px] text-slate-500">Lifetime kWh output</div>
              </div>
            </div>
            {renderCustomNote()}
          </div>
        );

      case 'why_choose_us':
        return (
          <div key="why_choose_us" className="border-2 border-teal-300 rounded-xl p-3 bg-gradient-to-r from-teal-50/70 via-emerald-50/50 to-teal-50/70 text-xs shadow-xs">
            <h3 className="font-black text-teal-950 uppercase tracking-wide flex items-center justify-between text-[11px] mb-2">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-700" />
                <span>{customTitle || 'Why Choose Tejo Bharat Global Energy LLP?'}</span>
              </span>
              {customSubtitle && <span className="text-[9px] bg-teal-200 text-teal-900 font-bold px-2 py-0.5 rounded-full">{customSubtitle}</span>}
            </h3>
            {customText && <p className="text-[10.5px] text-slate-600 mb-2 leading-snug">{customText}</p>}
            {customBullets && customBullets.length > 0 ? (
              <div className={`grid grid-cols-${Math.min(customBullets.length, 3)} gap-2`}>
                {customBullets.map((b, i) => {
                  const parts = b.split(':');
                  const bTitle = parts.length > 1 ? parts[0].trim() : `Benefit ${i + 1}`;
                  const bDesc = parts.length > 1 ? parts.slice(1).join(':').trim() : b.trim();
                  return (
                    <div key={i} className="bg-white p-2 rounded-lg border border-teal-200 space-y-0.5 shadow-xs">
                      <div className="font-extrabold text-teal-900 text-[11px]">{bTitle}</div>
                      <p className="text-[10px] text-slate-600 leading-tight">{bDesc}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white p-2 rounded-lg border border-teal-200 space-y-0.5 shadow-xs">
                  <div className="font-extrabold text-teal-900 text-[11px]">⭐ Tier-1 ALMM Hardware</div>
                  <p className="text-[10px] text-slate-600 leading-tight">{isCommercial ? 'Tier-1 Non-DCR (NDCR) 500+ W modules & inverters.' : 'MNRE-approved Mono DCR modules & inverters.'}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-teal-200 space-y-0.5 shadow-xs">
                  <div className="font-extrabold text-teal-900 text-[11px]">🏛️ Turnkey Net Metering</div>
                  <p className="text-[10px] text-slate-600 leading-tight">End-to-end DISCOM liaisoning & net meter sync.</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-teal-200 space-y-0.5 shadow-xs">
                  <div className="font-extrabold text-teal-900 text-[11px]">🛠️ 25-Year Performance</div>
                  <p className="text-[10px] text-slate-600 leading-tight">25-year panel power warranty & local AMC support.</p>
                </div>
              </div>
            )}
            {renderCustomNote()}
          </div>
        );

      case 'bom_breakdown':
        return (
          <div key="bom_breakdown" className="space-y-2">
            <div className="flex justify-between items-center border-b-2 pb-2 border-slate-200">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">{customTitle || '🔩 System Components & Bill of Materials (BOM)'}</h3>
              <span className="text-xs text-slate-400 font-mono">Ref: {quotation.quotation_no}</span>
            </div>
            {customSubtitle && <div className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">{customSubtitle}</div>}
            {customText && <p className="text-[10.5px] text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-200 leading-snug">{customText}</p>}
            {siteGroups.length > 1 ? (
              <div className="space-y-2">
                <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex justify-between items-center">
                  <span>📍 Site-Wise Equipment Breakdown & Bill of Materials ({siteGroups.length} Sites)</span>
                  <span className="text-amber-400 font-bold">{displayTotalCapacity} kW Total Capacity</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {siteGroups.map((grp, idx) => (
                    <div key={idx} className="border-2 border-slate-300 rounded-xl p-2.5 bg-slate-50/80 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center border-b pb-1.5 mb-2 border-slate-200 min-h-[26px]">
                          <div className="font-extrabold text-slate-900 text-[12px] flex items-center gap-2 min-w-0 flex-1 mr-2">
                            <span 
                              className="site-card-badge w-5 h-5 min-w-[20px] min-h-[20px] rounded-full bg-teal-800 text-white font-extrabold text-[10.5px] flex items-center justify-center shrink-0 leading-none select-none text-center shadow-xs"
                              style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                            >
                              <span className="leading-none block">{idx + 1}</span>
                            </span>
                            <span className="font-extrabold text-slate-900 text-[12px] leading-tight truncate">
                              {grp.siteName}
                            </span>
                          </div>
                          <span 
                            className={`site-card-pill shrink-0 inline-flex items-center justify-center text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border leading-tight ${grp.isHybrid ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-teal-100 text-teal-900 border-teal-300'}`}
                            style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                          >
                            {grp.capacityKw ? `${grp.capacityKw} kW ` : ''}{grp.isHybrid ? 'Hybrid + Battery' : 'On-Grid'}
                          </span>
                        </div>
                        <ul className="space-y-1 text-[10.5px] text-slate-700">
                          <li className="flex justify-between items-start gap-1.5">
                            <span className="text-slate-500 font-medium shrink-0">PV Array:</span>
                            <span className="font-bold text-slate-900 text-right leading-tight break-words">{grp.capacityKw ? `${Math.ceil((grp.capacityKw * 1000) / 500)}× ${defaultPanelShort} (${grp.capacityKw} kW)` : defaultPanelSpec}</span>
                          </li>
                          <li className="flex justify-between items-start gap-1.5">
                            <span className="text-slate-500 font-medium shrink-0">Inverter:</span>
                            <span className="font-bold text-teal-800 text-right leading-tight break-words">{grp.isHybrid ? 'Tier-1 Hybrid Inverter' : `${grp.capacityKw || 5} kW String Inverter`}</span>
                          </li>
                          {grp.isHybrid ? (
                            <li className="flex justify-between items-start gap-1.5 bg-purple-50 px-1 py-0.5 rounded">
                              <span className="text-purple-700 font-semibold shrink-0">Lithium Battery:</span>
                              <span className="font-extrabold text-purple-900 text-right leading-tight break-words">LiFePO4 Storage Bank</span>
                            </li>
                          ) : (
                            <li className="flex justify-between items-start gap-1.5 text-slate-400">
                              <span className="font-medium shrink-0">Battery Storage:</span>
                              <span className="text-right leading-tight">N/A (Direct Grid-Tied)</span>
                            </li>
                          )}
                          <li className="flex justify-between items-start gap-1.5">
                            <span className="text-slate-500 font-medium shrink-0">Structure:</span>
                            <span className="font-semibold text-slate-800 text-right leading-tight break-words">HDG Elevated (80µ Zinc)</span>
                          </li>
                          <li className="flex justify-between items-start gap-1.5">
                            <span className="text-slate-500 font-medium shrink-0">Monitoring:</span>
                            <span className="font-semibold text-slate-800 text-right leading-tight break-words">Smart WiFi Cloud App</span>
                          </li>
                        </ul>
                      </div>
                      <div className="border-t pt-1 mt-1.5 border-slate-200 text-[10px] text-slate-500 flex justify-between items-center">
                        <span className="font-medium">DISCOM Liaisoning:</span>
                        <span className="font-bold text-emerald-700">Included (End-to-End)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-300 text-[10.5px]">
                    <th className="px-2 py-1.5 text-center w-8">#</th>
                    <th className="px-2 py-1.5 w-44">Major Component</th>
                    <th className="px-2 py-1.5">Detailed Engineering Specification</th>
                    <th className="px-2 py-1.5 w-36">Brand / Make</th>
                    <th className="px-2 py-1.5 text-center w-16">Qty</th>
                    <th className="px-2 py-1.5 text-right w-20">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-[11px]">
                  <tr className="hover:bg-slate-50">
                    <td className="px-2 py-1.5 font-bold">1</td>
                    <td className="px-2 py-1.5 font-extrabold text-slate-900">Solar PV Modules</td>
                    <td className="px-2 py-1.5">{defaultPanelSpec}</td>
                    <td className="px-2 py-1.5 font-bold text-teal-800">{defaultPanelBrand}</td>
                    <td className="px-2 py-1.5 text-center font-bold">{Math.ceil((displayTotalCapacity * 1000) / 500)} Nos</td>
                    <td className="px-2 py-1.5 text-right"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">✓ Included</span></td>
                  </tr>
                  <tr className="bg-slate-50/50 hover:bg-slate-50">
                    <td className="px-2 py-1.5 font-bold">2</td>
                    <td className="px-2 py-1.5 font-extrabold text-slate-900">Grid-Tied Inverter</td>
                    <td className="px-2 py-1.5">{displayTotalCapacity} kW {displayInverterPhase} String Inverter with 24/7 Wi-Fi Monitoring App</td>
                    <td className="px-2 py-1.5 font-bold text-teal-800">{cleanInverterBrand}</td>
                    <td className="px-2 py-1.5 text-center font-bold">1 Unit</td>
                    <td className="px-2 py-1.5 text-right"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">✓ Included</span></td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-2 py-1.5 font-bold">3</td>
                    <td className="px-2 py-1.5 font-extrabold text-slate-900">Module Mounting Structure</td>
                    <td className="px-2 py-1.5">{displayStructureType} ({displayStructureHeight})</td>
                    <td className="px-2 py-1.5 font-bold text-teal-800">{displayStructureGrid}</td>
                    <td className="px-2 py-1.5 text-center font-bold">1 Lot</td>
                    <td className="px-2 py-1.5 text-right"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">✓ Included</span></td>
                  </tr>
                  <tr className="bg-slate-50/50 hover:bg-slate-50">
                    <td className="px-2 py-1.5 font-bold">4</td>
                    <td className="px-2 py-1.5 font-extrabold text-slate-900">Solar DC & AC Cabling</td>
                    <td className="px-2 py-1.5">Solar DC & Armored AC Copper Cables in UV Conduits (up to 50m included)</td>
                    <td className="px-2 py-1.5 font-bold text-teal-800">{quotation.cables_brand || 'Polycab / Havells / KEI'}</td>
                    <td className="px-2 py-1.5 text-center font-bold">1 Lot</td>
                    <td className="px-2 py-1.5 text-right"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">✓ Included</span></td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-2 py-1.5 font-bold">5</td>
                    <td className="px-2 py-1.5 font-extrabold text-slate-900">ACDB & DCDB Panels</td>
                    <td className="px-2 py-1.5">IP65 Waterproof Enclosures with Type-II Surge Protection (SPD), MCBs & Fuses</td>
                    <td className="px-2 py-1.5 font-bold text-teal-800">Standard Protection</td>
                    <td className="px-2 py-1.5 text-center font-bold">1 Set</td>
                    <td className="px-2 py-1.5 text-right"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">✓ Included</span></td>
                  </tr>
                  <tr className="bg-slate-50/50 hover:bg-slate-50">
                    <td className="px-2 py-1.5 font-bold">6</td>
                    <td className="px-2 py-1.5 font-bold">Earthing & LA System</td>
                    <td className="px-2 py-1.5 font-extrabold text-slate-900">3× Pure Copper Bonded Chemical Earthing Pits + Class-A Lightning Arrester (LA)</td>
                    <td className="px-2 py-1.5 font-bold text-teal-800">IS / IEC Standard</td>
                    <td className="px-2 py-1.5 text-center font-bold">1 Set</td>
                    <td className="px-2 py-1.5 text-right"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">✓ Included</span></td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-2 py-1.5 font-bold">7</td>
                    <td className="px-2 py-1.5 font-extrabold text-slate-900">DISCOM Net Metering</td>
                    <td className="px-2 py-1.5">CEIG Safety Inspection, Net Meter Testing, Documentation & Commissioning</td>
                    <td className="px-2 py-1.5 font-bold text-teal-800">State DISCOM / Approved</td>
                    <td className="px-2 py-1.5 text-center font-bold">1 Project</td>
                    <td className="px-2 py-1.5 text-right"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">✓ Included</span></td>
                  </tr>
                </tbody>
              </table>
            )}
            {renderCustomNote()}
          </div>
        );

      case 'electrical_diagram':
        return (
          <div key="electrical_diagram" className="border-2 border-slate-300 rounded-xl p-3 bg-slate-900 text-white text-xs space-y-2 shadow-md">
            <div className="font-extrabold text-amber-400 uppercase tracking-wider text-xs flex justify-between items-center">
              <span>{customTitle || '⚡ On-Grid Solar Power Flow & Electrical Architecture'}</span>
              <span className="text-[10px] text-teal-300 font-mono">{customSubtitle || 'CEIG Standard Single Line Diagram'}</span>
            </div>
            {customText && <p className="text-[10.5px] text-slate-300 leading-snug">{customText}</p>}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-center text-xs gap-1">
              <div className="bg-slate-800 p-2 rounded-xl border border-slate-700 flex-1">
                <div className="text-amber-400 font-bold">☀️ Solar Array</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{displayTotalCapacity} kW DC</div>
              </div>
              <span className="text-teal-400 font-bold">➔</span>
              <div className="bg-slate-800 p-2 rounded-xl border border-slate-700 flex-1">
                <div className="text-teal-300 font-bold">⚡ DCDB Box</div>
                <div className="text-[10px] text-slate-400 mt-0.5">SPD & Fuse</div>
              </div>
              <span className="text-teal-400 font-bold">➔</span>
              <div className="bg-slate-800 p-2 rounded-xl border border-slate-700 flex-1">
                <div className="text-yellow-300 font-bold">🔌 Inverter</div>
                <div className="text-[10px] text-slate-400 mt-0.5">DC → AC</div>
              </div>
              <span className="text-teal-400 font-bold">➔</span>
              <div className="bg-slate-800 p-2 rounded-xl border border-slate-700 flex-1">
                <div className="text-emerald-400 font-bold">🔌 ACDB Box</div>
                <div className="text-[10px] text-slate-400 mt-0.5">MCB Protection</div>
              </div>
              <span className="text-teal-400 font-bold">➔</span>
              <div className="bg-slate-800 p-2 rounded-xl border border-slate-700 flex-1">
                <div className="text-cyan-300 font-bold">📊 Net Meter</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Grid Sync</div>
              </div>
              <span className="text-teal-400 font-bold">➔</span>
              <div className="bg-slate-800 p-2 rounded-xl border border-slate-700 flex-1">
                <div className="text-blue-300 font-bold">🏠 Load / Grid</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Net Export</div>
              </div>
            </div>
            {renderCustomNote()}
          </div>
        );

      case 'standards_certs':
        return (
          <div key="standards_certs" className="bg-teal-50/90 border-2 border-teal-200 rounded-xl p-2.5 text-xs space-y-1 shadow-xs">
            <div className="flex justify-between items-center border-b pb-0.5 border-teal-200">
              <h4 className="font-extrabold text-teal-900 uppercase tracking-wide text-xs">{customTitle || '📋 Standards & Compliance Certifications'}</h4>
              {customSubtitle && <span className="text-[9px] bg-teal-200 text-teal-900 font-bold px-2 py-0.5 rounded-full">{customSubtitle}</span>}
            </div>
            {customText && <p className="text-[10px] text-slate-600 mb-0.5 leading-snug">{customText}</p>}
            <div className="grid grid-cols-2 gap-2">
              <ul className="space-y-0.5 text-[10.5px] text-slate-700">
                {customBullets.slice(0, Math.ceil(customBullets.length / 2)).map((b, i) => (
                  <li key={i}>• {b}</li>
                ))}
              </ul>
              <ul className="space-y-0.5 text-[10.5px] text-slate-700">
                {customBullets.slice(Math.ceil(customBullets.length / 2)).map((b, i) => (
                  <li key={i}>• {b}</li>
                ))}
              </ul>
            </div>
            {renderCustomNote()}
          </div>
        );

      case 'hardware_safety':
        return (
          <div key="hardware_safety" className="border-2 border-slate-200 rounded-xl p-2.5 bg-slate-50/70 text-xs shadow-xs">
            <div className="flex justify-between items-center border-b pb-1 border-slate-200 mb-1.5">
              <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-xs">
                {customTitle || '🛡️ Comprehensive Hardware Protection & Safety Design'}
              </h4>
              {customSubtitle && <span className="text-[9px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded-full">{customSubtitle}</span>}
            </div>
            {customText && <p className="text-[10px] text-slate-600 mb-1.5 leading-snug">{customText}</p>}
            <div className="grid grid-cols-2 gap-2">
              {customBullets && customBullets.length > 0 ? (
                customBullets.map((b, i) => {
                  const parts = b.split(':');
                  const bTitle = parts.length > 1 ? parts[0].trim() : `Feature ${i + 1}`;
                  const bDesc = parts.length > 1 ? parts.slice(1).join(':').trim() : b.trim();
                  return (
                    <div key={i} className="bg-white p-2 rounded-xl border border-slate-200 space-y-0.5 shadow-2xs">
                      <div className="font-bold text-teal-900 text-xs">{bTitle}</div>
                      <p className="text-[10.5px] text-slate-600 leading-snug">{bDesc}</p>
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="bg-white p-2 rounded-xl border border-slate-200 space-y-0.5 shadow-2xs">
                    <div className="font-bold text-teal-900 text-xs">High-Efficiency {isCommercial ? 'Non-DCR (NDCR)' : 'Mono DCR'} Technology</div>
                    <p className="text-[10.5px] text-slate-600 leading-snug">Superior temperature coefficient and low-light performance compared to standard PERC. Generates more on cloudy days and hot afternoons.</p>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200 space-y-0.5 shadow-2xs">
                    <div className="font-bold text-teal-900 text-xs">Triple Pitting Chemical Earthing</div>
                    <p className="text-[10.5px] text-slate-600 leading-snug">3 dedicated earthing pits for AC, DC, and Lightning Arrester using low-resistance earth compound (&lt; 5 Ohms) as per IS 3043.</p>
                  </div>
                </>
              )}
            </div>
            {renderCustomNote()}
          </div>
        );

      case 'commercial_items':
        if (!quotation.line_items || quotation.line_items.length === 0) return null;
        const showDetailedGst = quotation.show_gst_in_table !== false;
        return (
          <div key="commercial_items" className="border-2 border-slate-300 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-900 text-white px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider flex justify-between items-center">
              <span>{customTitle || `🏬 Site-Wise Commercial Line Items (${quotation.line_items.length} Items)`}</span>
              <span className="text-amber-400 font-bold">{customSubtitle || `Total: ₹ ${(quotation.total_amount || 0).toLocaleString('en-IN')}`}</span>
            </div>
            {customText && <div className="p-2 text-[10.5px] bg-slate-50 border-b border-slate-200 text-slate-600 leading-snug">{customText}</div>}
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-300 text-[10px]">
                  <th className="px-2 py-0.5 text-center w-6">#</th>
                  <th className="px-2 py-0.5">Item Description & Site Location</th>
                  <th className="px-2 py-0.5 text-center w-12">Qty</th>
                  <th className="px-2 py-0.5 text-right w-20">{showDetailedGst ? 'Taxable Rate' : 'Rate (₹)'}</th>
                  {showDetailedGst && <th className="px-2 py-0.5 text-right w-22">Taxable (₹)</th>}
                  {showDetailedGst && <th className="px-2 py-0.5 text-right w-22">GST (₹)</th>}
                  <th className="px-2 py-0.5 text-right w-24">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-[10px]">
                {processedLineItems.map((item, idx) => (
                  <tr key={item.id || idx} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                    <td className="px-2 py-0.5 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="px-2 py-0.5">
                      <span className="font-extrabold text-slate-900">{item.name}</span>
                      {cleanItemDescription(item.description) && (
                        <span className="text-[9px] text-slate-500 ml-1.5 font-normal">
                          ({cleanItemDescription(item.description)})
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-0.5 text-center font-bold">{item.qty} {item.unit || 'kW'}</td>
                    <td className="px-2 py-0.5 text-right font-mono text-slate-700">₹ {(item.baseRate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    {showDetailedGst && (
                      <td className="px-2 py-0.5 text-right font-mono font-semibold text-slate-800">
                        ₹ {(item.taxableAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    )}
                    {showDetailedGst && (
                      <td className="px-2 py-0.5 text-right font-mono text-slate-600">
                        <div>₹ {(item.taxAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className="text-[8.5px] text-slate-400">({item.taxRate}%)</div>
                      </td>
                    )}
                    <td className="px-2 py-0.5 text-right font-mono font-extrabold text-slate-900">₹ {(item.totalAmt || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-[10px] text-slate-800">
                  <td colSpan={2} className="px-2 py-1 uppercase font-extrabold text-slate-900">Total Taxable Value & GST</td>
                  <td className="px-2 py-1 text-center font-extrabold">{quotation.line_items.reduce((s, it) => s + (Number(it.qty) || 0), 0)}</td>
                  <td className="px-2 py-1"></td>
                  {showDetailedGst && (
                    <td className="px-2 py-1 text-right font-mono font-extrabold text-slate-900">
                      ₹ {computedTaxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  )}
                  {showDetailedGst && (
                    <td className="px-2 py-1 text-right font-mono font-extrabold text-teal-800">
                      ₹ {computedTaxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  )}
                  <td className="px-2 py-1 text-right font-mono font-extrabold text-slate-900 text-xs">
                    ₹ {grossCost.toLocaleString('en-IN')}
                  </td>
                </tr>
                {showDetailedGst && (
                  <tr className="bg-slate-50 border-t border-slate-200 text-[9px] text-slate-600">
                    <td colSpan={7} className="px-2.5 py-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-700">Tax Schedule Breakdown:</span>
                        <div className="flex gap-4 font-mono">
                          {isInterstate ? (
                            <span>IGST ({effectiveGstLabel}): <strong className="text-slate-900">₹ {igstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                          ) : (
                            <>
                              <span>CGST ({effectiveHalfGstLabel}): <strong className="text-slate-900">₹ {cgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                              <span>SGST ({effectiveHalfGstLabel}): <strong className="text-slate-900">₹ {sgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                            </>
                          )}
                          <span>Total GST: <strong className="text-teal-800">₹ {computedTaxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
            {renderCustomNote()}
          </div>
        );

      case 'cost_breakdown':
        return (
          <div key="cost_breakdown" className="border-2 border-slate-300 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-900 text-white px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider flex justify-between items-center">
              <span>{customTitle || 'Project Cost & Subsidy Breakdown'}</span>
              <span className="text-amber-400 font-bold">{customSubtitle || `${quotation.category} Package`}</span>
            </div>
            {customText && <div className="p-2 text-[10.5px] bg-slate-50 border-b border-slate-200 text-slate-600 leading-snug">{customText}</div>}
            <div className="p-2.5 space-y-1.5 text-xs bg-white">
              <div className="flex justify-between border-b pb-1 text-slate-700">
                <span>Base Solar Project Cost (Taxable Value)</span>
                <span className="font-semibold text-slate-800 text-xs font-mono">₹ {computedTaxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-b pb-1 text-teal-800 font-semibold">
                <div>
                  <span>Add: Applicable GST ({isInterstate ? `IGST @ ${effectiveGstLabel}` : `CGST @ ${effectiveHalfGstLabel} + SGST @ ${effectiveHalfGstLabel}`})</span>
                  <div className="text-[9px] text-slate-400 font-normal">Calculated as per statutory solar EPC norms (70% goods @ 5% + 30% services @ 18%)</div>
                </div>
                <span className="font-bold text-teal-900 text-xs font-mono">+ ₹ {computedTaxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-b pb-1 text-slate-900 font-bold">
                <span>Gross System Cost ({displayTotalCapacity} kWp Solar PV Power Plant)</span>
                <span className="font-extrabold text-slate-900 text-sm font-mono">₹ {grossCost.toLocaleString('en-IN')}</span>
              </div>
              {additionalCharges > 0 && (
                <div className="flex justify-between border-b pb-1 text-teal-800 font-semibold">
                  <span>Add: {additionalChargesLabel}</span>
                  <span className="font-bold text-teal-900 text-sm font-mono">+ ₹ {additionalCharges.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between border-b pb-1 text-emerald-700 font-semibold">
                <div>
                  <span>Less: {subsidyText}</span>
                  <div className="text-[9.5px] text-slate-500 font-normal">{subsidyNote}</div>
                </div>
                <span className="font-extrabold text-sm font-mono">- ₹ {subsidyAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between bg-teal-800 text-white px-3 py-2 rounded-xl font-black text-base shadow-xs">
                <span>NET OUTFLOW PAYABLE BY CUSTOMER</span>
                <span className="text-amber-400 font-mono">₹ {netPayable.toLocaleString('en-IN')}</span>
              </div>
            </div>
            {renderCustomNote()}
          </div>
        );

      case 'tax_incentives':
        return (
          <div key="tax_incentives" className="border-2 border-emerald-300 rounded-xl p-2 bg-emerald-50/70 text-xs space-y-1 shadow-xs">
            <div className="font-extrabold text-emerald-950 uppercase tracking-wide flex items-center justify-between text-[11px] border-b pb-1 border-emerald-200">
              <span>{customTitle || `🏛️ Subsidy, Tax & Municipal Property Tax Benefits (${quotation.category})`}</span>
              <span className="text-[9px] bg-emerald-200 text-emerald-900 font-extrabold px-2 py-0.5 rounded-full">{customSubtitle || 'Policy Incentives'}</span>
            </div>
            {customText && <p className="text-[10px] text-emerald-950 font-medium leading-snug">{customText}</p>}
            <div className="grid grid-cols-2 gap-2 text-slate-700 text-xs pt-0.5">
              {customBullets && customBullets.length > 0 ? (
                customBullets.map((b, i) => {
                  const parts = b.split(':');
                  const bTitle = parts.length > 1 ? parts[0].trim() : `Incentive ${i + 1}`;
                  const bDesc = parts.length > 1 ? parts.slice(1).join(':').trim() : b.trim();
                  return (
                    <div key={i} className="bg-white p-2 rounded-lg border border-emerald-200 space-y-0.5 shadow-2xs">
                      <div className="font-bold text-emerald-900 text-[10.5px]">{bTitle}</div>
                      <p className="text-[9.5px] text-slate-600 leading-tight">{bDesc}</p>
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="bg-white p-2 rounded-lg border border-emerald-200 space-y-0.5 shadow-2xs">
                    <div className="font-bold text-emerald-900 text-[10.5px]">🏛️ PM Surya Ghar & Net Metering</div>
                    <p className="text-[9.5px] text-slate-600 leading-tight">
                      {subsidyAmount > 0 
                        ? `Direct Bank Credit (DBT) of ₹${subsidyAmount.toLocaleString('en-IN')} credited within 30 days.`
                        : 'Net Metering exports surplus solar power to grid to offset electricity bills.'}
                    </p>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-emerald-200 space-y-0.5 shadow-2xs">
                    <div className="font-bold text-emerald-900 text-[10.5px]">💼 Tax & Property Tax Savings</div>
                    <p className="text-[9.5px] text-slate-600 leading-tight">
                      {normCat.includes('commercial') || normCat.includes('industrial')
                        ? '40% Accelerated Depreciation (IT Act Sec 32) + 100% GST Input Tax Credit + 5% Property Tax Rebate.'
                        : '5% Annual Municipal Property Tax Rebate for green certified solar rooftops.'}
                    </p>
                  </div>
                </>
              )}
            </div>
            {renderCustomNote()}
          </div>
        );

      case 'financial_forecast':
        return (
          <div key="financial_forecast" className="border-2 border-slate-300 rounded-xl overflow-hidden text-xs shadow-xs">
            <div className="bg-slate-800 text-white px-2.5 py-1 font-extrabold uppercase tracking-wider flex justify-between items-center text-[11px]">
              <span>{customTitle || '📈 25-Year Financial Return & Energy Savings Forecast'}</span>
              <span className="text-[9.5px] text-amber-300 font-bold">{customSubtitle || 'Assumes 5% Annual Grid Tariff Inflation'}</span>
            </div>
            {customText && <div className="p-2 bg-slate-50 text-[10.5px] text-slate-600 border-b border-slate-200 leading-snug">{customText}</div>}
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-extrabold text-slate-700 text-[10px]">
                  <th className="px-2 py-1 border-r">Timeline</th>
                  <th className="px-2 py-1 border-r">Est. Unit Rate (₹)</th>
                  <th className="px-2 py-1 border-r">Annual Generation</th>
                  <th className="px-2 py-1 border-r">Annual Savings (₹)</th>
                  <th className="px-2 py-1">Cumulative Net Savings (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold text-[10.5px]">
                <tr>
                  <td className="px-2 py-1 border-r font-extrabold text-teal-800">Year 1</td>
                  <td className="px-2 py-1 border-r">₹ {y1.tariff.toFixed(2)} / kWh</td>
                  <td className="px-2 py-1 border-r">{Math.round(y1.generation).toLocaleString('en-IN')} Units</td>
                  <td className="px-2 py-1 border-r font-bold">₹ {Math.round(y1.annualSavings).toLocaleString('en-IN')}</td>
                  <td className="px-2 py-1 font-extrabold text-emerald-700">₹ {Math.round(y1.cumulativeSavings).toLocaleString('en-IN')}</td>
                </tr>
                <tr className="bg-slate-50/60">
                  <td className="px-2 py-1 border-r font-extrabold text-teal-800">Year 5</td>
                  <td className="px-2 py-1 border-r">₹ {y5.tariff.toFixed(2)} / kWh</td>
                  <td className="px-2 py-1 border-r">{Math.round(y5.generation).toLocaleString('en-IN')} Units</td>
                  <td className="px-2 py-1 border-r font-bold">₹ {Math.round(y5.annualSavings).toLocaleString('en-IN')}</td>
                  <td className="px-2 py-1 font-extrabold text-emerald-700">₹ {Math.round(y5.cumulativeSavings).toLocaleString('en-IN')} {Number(displayPayback) < 5 ? '(Break-Even Crossed)' : ''}</td>
                </tr>
                <tr>
                  <td className="px-2 py-1 border-r font-extrabold text-teal-800">Year 10</td>
                  <td className="px-2 py-1 border-r">₹ {y10.tariff.toFixed(2)} / kWh</td>
                  <td className="px-2 py-1 border-r">{Math.round(y10.generation).toLocaleString('en-IN')} Units</td>
                  <td className="px-2 py-1 border-r font-bold">₹ {Math.round(y10.annualSavings).toLocaleString('en-IN')}</td>
                  <td className="px-2 py-1 font-extrabold text-emerald-700">₹ {Math.round(y10.cumulativeSavings).toLocaleString('en-IN')}</td>
                </tr>
                <tr className="bg-slate-50/60">
                  <td className="px-2 py-1 border-r font-extrabold text-teal-800">Year 25 (Lifetime)</td>
                  <td className="px-2 py-1 border-r">₹ {y25.tariff.toFixed(2)} / kWh</td>
                  <td className="px-2 py-1 border-r">{Math.round(y25.generation).toLocaleString('en-IN')} Units</td>
                  <td className="px-2 py-1 border-r font-bold">₹ {Math.round(y25.annualSavings).toLocaleString('en-IN')}</td>
                  <td className="px-2 py-1 font-black text-emerald-800 text-xs">₹ {Math.round(y25.cumulativeSavings).toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
            {renderCustomNote()}
          </div>
        );

      case 'cost_comparison':
        return (
          <div key="cost_comparison" className="border-2 border-amber-200 rounded-xl p-2 bg-amber-50/50 text-xs space-y-1 shadow-xs">
            <div className="flex justify-between items-center border-b pb-1 border-amber-200">
              <h4 className="font-extrabold text-amber-900 uppercase tracking-wide text-[10.5px]">{customTitle || '💡 Month-Wise Electricity Cost Comparison (Before vs. After Solar)'}</h4>
              {customSubtitle && <span className="text-[9px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full">{customSubtitle}</span>}
            </div>
            {customText && <p className="text-[10px] text-slate-600 leading-snug">{customText}</p>}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <div className="flex justify-between text-[9.5px] font-bold text-slate-600"><span>Without Solar (Monthly Bill)</span><span className="text-rose-700 font-black">₹ {quotation.monthly_savings_rs.toLocaleString('en-IN')}+</span></div>
                <div className="w-full bg-rose-100 rounded-full h-2.5"><div className="bg-rose-500 h-2.5 rounded-full" style={{width:'100%'}}></div></div>
                <div className="flex justify-between text-[9.5px] font-bold text-slate-600"><span>With Solar (Net Bill)</span><span className="text-emerald-700 font-black">₹ 0 – 500</span></div>
                <div className="w-full bg-emerald-100 rounded-full h-2.5"><div className="bg-emerald-500 h-2.5 rounded-full" style={{width:'8%'}}></div></div>
              </div>
              <div className="bg-white border border-amber-200 rounded-lg p-1.5 text-center shadow-xs">
                <div className="text-[9.5px] text-slate-500 font-medium">Annual Bill Savings</div>
                <div className="text-lg font-black text-emerald-700">₹ {(quotation.monthly_savings_rs * 12).toLocaleString('en-IN')}</div>
                <div className="text-[8.5px] text-slate-500">Every year for 25+ years</div>
              </div>
            </div>
            {renderCustomNote()}
          </div>
        );

      case 'bank_details':
        return (
          <div key="bank_details" className="bg-slate-900 text-white rounded-xl p-2.5 border-2 border-slate-700 shadow-xs">
            <div className="text-[10.5px] font-bold text-amber-400 uppercase tracking-wider mb-1 border-b border-slate-800 pb-0.5 flex justify-between items-center">
              <span>{customTitle || '🏦 Beneficiary Bank Details for Direct Transfer (NEFT / RTGS / IMPS / UPI)'}</span>
              {customSubtitle && <span className="text-[9px] text-slate-400 font-normal">{customSubtitle}</span>}
            </div>
            {customText && <p className="text-[10px] text-slate-300 mb-1 leading-snug">{customText}</p>}
            <div className="grid grid-cols-3 gap-y-1 text-[10.5px] pt-0.5">
              <div><span className="text-slate-400">Account Name:</span> <strong className="text-white">TEJO BHARAT GLOBAL ENERGY LLP</strong></div>
              <div><span className="text-slate-400">Bank Name:</span> <strong className="text-white">Kotak Mahindra Bank</strong></div>
              <div><span className="text-slate-400">Branch:</span> <strong className="text-slate-200">Sarpavaram</strong></div>
              <div><span className="text-slate-400">Account No:</span> <strong className="text-amber-300 font-mono">9989279586</strong></div>
              <div><span className="text-slate-400">IFSC Code:</span> <strong className="text-amber-300 font-mono">KKBK0000574</strong></div>
              <div><span className="text-slate-400">UPI ID:</span> <strong className="text-teal-300 font-mono">9989279586@kotak</strong></div>
            </div>
            {renderCustomNote()}
          </div>
        );

      case 'scope_matrix':
        const scopeList = (quotation.scope_items && quotation.scope_items.length > 0)
          ? quotation.scope_items
          : DEFAULT_SCOPE_ITEMS;
        const epcItems = scopeList.filter((s) => s.scope === 'epc');
        const custItems = scopeList.filter((s) => s.scope === 'customer');

        return (
          <div key="scope_matrix" className="space-y-1 text-xs">
            {customTitle && customTitle !== 'Scope of Work Matrix' && (
              <div className="font-black text-slate-900 uppercase tracking-wider text-xs border-b pb-1 border-slate-200">
                {customTitle}
              </div>
            )}
            {customText && <p className="text-[10.5px] text-slate-600 mb-1 leading-snug">{customText}</p>}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="border-2 border-teal-300 rounded-xl p-3 bg-teal-50/50 shadow-xs">
                <h4 className="font-black text-teal-900 uppercase tracking-wider mb-2 border-b pb-1.5 border-teal-200 text-xs flex items-center justify-between">
                  <span>✅ Tejo Bharat EPC Scope of Work</span>
                  <span className="text-[10px] bg-teal-200 text-teal-900 px-1.5 py-0.5 rounded font-bold">{epcItems.length} Items</span>
                </h4>
                <ul className="space-y-1.5 text-slate-700">
                  {epcItems.map((item) => (
                    <li key={item.id}>• {item.text}</li>
                  ))}
                </ul>
              </div>
              <div className="border-2 border-amber-300 rounded-xl p-3 bg-amber-50/50 shadow-xs">
                <h4 className="font-black text-amber-900 uppercase tracking-wider mb-2 border-b pb-1.5 border-amber-200 text-xs flex items-center justify-between">
                  <span>⚠️ Customer Scope of Work</span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">{custItems.length} Items</span>
                </h4>
                <ul className="space-y-1.5 text-slate-700">
                  {custItems.map((item) => (
                    <li key={item.id}>• {item.text}</li>
                  ))}
                </ul>
              </div>
            </div>
            {renderCustomNote()}
          </div>
        );

      case 'execution_timeline':
        return (
          <div key="execution_timeline" className="border-2 border-slate-200 rounded-xl p-3 bg-slate-50/70 text-xs shadow-xs space-y-2">
            <div className="flex justify-between items-center border-b pb-1.5 border-slate-200">
              <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs">{customTitle || '📅 4-Week Project Execution Timeline'}</h4>
              {customSubtitle && <span className="text-[9px] bg-teal-100 text-teal-900 font-bold px-2 py-0.5 rounded-full">{customSubtitle}</span>}
            </div>
            {customText && <p className="text-[10.5px] text-slate-600 leading-snug">{customText}</p>}
            <div className="grid grid-cols-4 gap-2 text-center">
              {customBullets && customBullets.length > 0 ? (
                customBullets.map((b, i) => {
                  const parts = b.split(':');
                  const wTitle = parts.length > 1 ? parts[0].trim() : `Phase ${i + 1}`;
                  const wDesc = parts.length > 1 ? parts.slice(1).join(':').trim() : b.trim();
                  return (
                    <div key={i} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                      <div className="font-extrabold text-teal-800 text-xs">{wTitle}</div>
                      <div className="text-slate-600 mt-1 font-medium text-[10px] leading-tight">{wDesc}</div>
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <div className="font-extrabold text-teal-800 text-xs">Week 1</div>
                    <div className="text-[10px] font-black text-slate-500 mt-0.5">Day 1–7</div>
                    <div className="text-slate-600 mt-1 font-medium text-[10px]">Site Survey, Load Calculation & Material Orders</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <div className="font-extrabold text-teal-800 text-xs">Week 2</div>
                    <div className="text-[10px] font-black text-slate-500 mt-0.5">Day 8–14</div>
                    <div className="text-slate-600 mt-1 font-medium text-[10px]">Structure Assembly, Conduits & Earthing Pits</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <div className="font-extrabold text-teal-800 text-xs">Week 3</div>
                    <div className="text-[10px] font-black text-slate-500 mt-0.5">Day 15–21</div>
                    <div className="text-slate-600 mt-1 font-medium text-[10px]">Module Mounting, Wiring & Inverter Installation</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <div className="font-extrabold text-teal-800 text-xs">Week 4</div>
                    <div className="text-[10px] font-black text-slate-500 mt-0.5">Day 22–30</div>
                    <div className="text-slate-600 mt-1 font-medium text-[10px]">CEIG Inspection, DISCOM Net Meter & Commissioning</div>
                  </div>
                </>
              )}
            </div>
            {renderCustomNote()}
          </div>
        );

      case 'warranty_matrix':
        return (
          <div key="warranty_matrix" className="border-2 border-slate-300 rounded-xl overflow-hidden text-xs shadow-xs">
            <div className="bg-slate-900 text-white p-2.5 font-extrabold uppercase tracking-wider text-xs flex justify-between items-center">
              <span>{customTitle || '🛡️ Comprehensive Warranty Matrix'}</span>
              {customSubtitle && <span className="text-[10px] text-amber-400 font-bold">{customSubtitle}</span>}
            </div>
            {customText && <div className="p-2 bg-slate-50 text-[10.5px] text-slate-600 border-b border-slate-200 leading-snug">{customText}</div>}
            <div className="p-3 grid grid-cols-4 gap-2 text-center">
              {customBullets && customBullets.length > 0 ? (
                customBullets.map((b, i) => {
                  const parts = b.split(':');
                  const wName = parts.length > 1 ? parts[0].trim() : `Warranty ${i + 1}`;
                  const wVal = parts.length > 1 ? parts.slice(1).join(':').trim() : b.trim();
                  return (
                    <div key={i} className="border-2 border-slate-200 p-2.5 rounded-xl bg-slate-50 shadow-2xs">
                      <div className="font-extrabold text-teal-900 text-xs">{wName}</div>
                      <div className="text-sm font-black text-amber-600 mt-1 leading-snug">{wVal}</div>
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="border-2 border-slate-200 p-2.5 rounded-xl bg-slate-50 shadow-2xs">
                    <div className="font-extrabold text-teal-900 text-xs">Solar Panels</div>
                    <div className="text-xl font-black text-amber-600 mt-1">25 Years</div>
                    <div className="text-[10px] text-slate-500 font-medium">Linear Power Warranty</div>
                    <div className="text-[9px] text-teal-700 mt-0.5">≥80% output @ Year 25</div>
                  </div>
                  <div className="border-2 border-slate-200 p-2.5 rounded-xl bg-slate-50 shadow-2xs">
                    <div className="font-extrabold text-teal-900 text-xs">Solar Inverter</div>
                    <div className="text-xl font-black text-amber-600 mt-1">7–10 Years</div>
                    <div className="text-[10px] text-slate-500 font-medium">Product Replacement</div>
                    <div className="text-[9px] text-teal-700 mt-0.5">Extended warranty optional</div>
                  </div>
                  <div className="border-2 border-slate-200 p-2.5 rounded-xl bg-slate-50 shadow-2xs">
                    <div className="font-extrabold text-teal-900 text-xs">HDG Structure</div>
                    <div className="text-xl font-black text-amber-600 mt-1">10 Years</div>
                    <div className="text-[10px] text-slate-500 font-medium">Anti-Rust Warranty</div>
                    <div className="text-[9px] text-teal-700 mt-0.5">80+ micron zinc coat</div>
                  </div>
                  <div className="border-2 border-slate-200 p-2.5 rounded-xl bg-slate-50 shadow-2xs">
                    <div className="font-extrabold text-teal-900 text-xs">Workmanship</div>
                    <div className="text-xl font-black text-amber-600 mt-1">5 Years</div>
                    <div className="text-[10px] text-slate-500 font-medium">Tejo Bharat AMC</div>
                    <div className="text-[9px] text-teal-700 mt-0.5">Local service team</div>
                  </div>
                </>
              )}
            </div>
            {renderCustomNote()}
          </div>
        );

      case 'telemetry_sop':
        return (
          <div key="telemetry_sop" className="border-2 border-teal-300 rounded-xl p-3 bg-teal-50/50 text-xs space-y-2 shadow-xs">
            <div className="font-extrabold text-teal-950 uppercase tracking-wide text-xs border-b pb-1.5 border-teal-200 flex justify-between items-center">
              <span>{customTitle || '📲 Mobile Remote Telemetry App & Maintenance Protocol'}</span>
              {customSubtitle && <span className="text-[9px] bg-teal-200 text-teal-900 font-bold px-2 py-0.5 rounded-full">{customSubtitle}</span>}
            </div>
            {customText && <p className="text-[10.5px] text-slate-600 leading-snug">{customText}</p>}
            <div className="grid grid-cols-2 gap-2">
              {customBullets && customBullets.length > 0 ? (
                customBullets.map((b, i) => {
                  const parts = b.split(':');
                  const bTitle = parts.length > 1 ? parts[0].trim() : `Protocol ${i + 1}`;
                  const bDesc = parts.length > 1 ? parts.slice(1).join(':').trim() : b.trim();
                  return (
                    <div key={i} className="bg-white p-2.5 rounded-xl border border-teal-200 shadow-xs">
                      <div className="font-bold text-teal-900 text-xs mb-1">{bTitle}</div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">{bDesc}</p>
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="bg-white p-2.5 rounded-xl border border-teal-200 shadow-xs">
                    <div className="font-bold text-teal-900 text-xs mb-1">24/7 Smart App Monitoring</div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">Real-time generation dashboard on iOS/Android. Track daily units, live power, grid export, and error diagnostics directly on your smartphone.</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-teal-200 shadow-xs">
                    <div className="font-bold text-teal-900 text-xs mb-1">Routine Maintenance SOP</div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">Clean panels with fresh soft water every 15 days in early morning. Annual electrical torque check and earthing resistance inspection by Tejo Bharat team.</p>
                  </div>
                </>
              )}
            </div>
            {renderCustomNote()}
          </div>
        );

      case 'policy_summary':
        return (
          <div key="policy_summary" className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-3 text-xs space-y-1.5 shadow-xs">
            <div className="flex justify-between items-center border-b pb-1.5 border-indigo-200">
              <h4 className="font-extrabold text-indigo-900 uppercase tracking-wide text-xs">
                {customTitle || `🏛️ Government Policy, Tax & Property Tax Benefits (${quotation.category})`}
              </h4>
              {customSubtitle && <span className="text-[9px] bg-indigo-200 text-indigo-900 font-bold px-2 py-0.5 rounded-full">{customSubtitle}</span>}
            </div>
            {customText && <p className="text-[10px] text-slate-600 leading-snug">{customText}</p>}
            <div className="grid grid-cols-4 gap-2">
              {customBullets && customBullets.length > 0 ? (
                customBullets.map((b, i) => {
                  const parts = b.split(':');
                  const bTitle = parts.length > 1 ? parts[0].trim() : `Policy ${i + 1}`;
                  const bDesc = parts.length > 1 ? parts.slice(1).join(':').trim() : b.trim();
                  return (
                    <div key={i} className="bg-white border border-indigo-200 p-2 rounded-lg shadow-xs">
                      <div className="font-bold text-indigo-900 text-[10px]">{bTitle}</div>
                      <p className="text-[9px] text-slate-600 mt-0.5 leading-tight">{bDesc}</p>
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="bg-white border border-indigo-200 p-2 rounded-lg shadow-xs">
                    <div className="font-bold text-indigo-900 text-[10px]">PM Surya Ghar DBT</div>
                    <p className="text-[9px] text-slate-600 mt-0.5">
                      {subsidyAmount > 0 
                        ? `₹${subsidyAmount.toLocaleString('en-IN')} credited to bank via pmsuryaghar.gov.in` 
                        : 'Direct Bank Transfer (DBT) for Residential & Group Housing'}
                    </p>
                  </div>
                  <div className="bg-white border border-indigo-200 p-2 rounded-lg shadow-xs">
                    <div className="font-bold text-indigo-900 text-[10px]">Net Metering Policy</div>
                    <p className="text-[9px] text-slate-600 mt-0.5">Surplus solar units exported to DISCOM grid are adjusted in monthly bills.</p>
                  </div>
                  <div className="bg-white border border-indigo-200 p-2 rounded-lg shadow-xs">
                    <div className="font-bold text-indigo-900 text-[10px]">🏡 5% Property Tax Rebate</div>
                    <p className="text-[9px] text-slate-600 mt-0.5">Municipal Corporations (GHMC / Urban ULBs) offer 5% annual property tax rebate for solar roofs.</p>
                  </div>
                  <div className="bg-white border border-indigo-200 p-2 rounded-lg shadow-xs">
                    <div className="font-bold text-indigo-900 text-[10px]">💼 Tax Savings (40% AD)</div>
                    <p className="text-[9px] text-slate-600 mt-0.5">Commercial/Industrial: 40% Accelerated Depreciation under IT Act Sec 32 + GST ITC.</p>
                  </div>
                </>
              )}
            </div>
            {renderCustomNote()}
          </div>
        );

      case 'payment_milestones':
        return (
          <div key="payment_milestones" className="border-2 border-slate-200 rounded-xl p-3 bg-slate-50/70 text-xs shadow-xs space-y-2">
            <div className="flex justify-between items-center border-b pb-1.5 border-slate-200">
              <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs">{customTitle || '💳 Commercial Payment Milestones'}</h4>
              {customSubtitle && <span className="text-[9px] bg-teal-100 text-teal-900 font-bold px-2 py-0.5 rounded-full">{customSubtitle}</span>}
            </div>
            {customText && <p className="text-[10.5px] text-slate-600 leading-snug">{customText}</p>}
            <div className="grid grid-cols-3 gap-3 text-center">
              {customBullets && customBullets.length > 0 ? (
                customBullets.map((b, i) => {
                  const parts = b.split(':');
                  const mPercent = parts.length > 1 ? parts[0].trim() : `Stage ${i + 1}`;
                  const mDesc = parts.length > 1 ? parts.slice(1).join(':').trim() : b.trim();
                  return (
                    <div key={i} className="bg-white p-3 rounded-xl border-2 border-teal-200 shadow-xs">
                      <div className="text-xl font-black text-teal-800">{mPercent}</div>
                      <div className="text-[10px] text-slate-600 mt-1 font-medium leading-tight">{mDesc}</div>
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="bg-white p-3 rounded-xl border-2 border-teal-200 shadow-xs">
                    <div className="text-2xl font-black text-teal-800">60%</div>
                    <div className="text-xs font-bold text-teal-900 mt-0.5">Advance Payment</div>
                    <div className="text-[10px] text-slate-600 mt-1 font-medium">₹ {Math.round(netPayable * 0.6).toLocaleString('en-IN')}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">Upon Purchase Order & Booking</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border-2 border-amber-200 shadow-xs">
                    <div className="text-2xl font-black text-amber-800">30%</div>
                    <div className="text-xs font-bold text-amber-900 mt-0.5">Dispatch Payment</div>
                    <div className="text-[10px] text-slate-600 mt-1 font-medium">₹ {Math.round(netPayable * 0.3).toLocaleString('en-IN')}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">Upon Material Arrival at Site</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border-2 border-emerald-200 shadow-xs">
                    <div className="text-2xl font-black text-emerald-800">10%</div>
                    <div className="text-xs font-bold text-emerald-900 mt-0.5">Final Payment</div>
                    <div className="text-[10px] text-slate-600 mt-1 font-medium">₹ {Math.round(netPayable * 0.1).toLocaleString('en-IN')}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">Post Net Meter Sync & Handover</div>
                  </div>
                </>
              )}
            </div>
            {renderCustomNote()}
          </div>
        );

      case 'terms_conditions':
        return (
          <div key="terms_conditions" className="border-2 border-slate-200 rounded-xl p-3 bg-slate-50/70 text-xs space-y-1.5 shadow-xs">
            <div className="flex justify-between items-center border-b pb-1.5 border-slate-200">
              <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-xs">{customTitle || '⚖️ Standard Commercial Terms & Conditions'}</h4>
              {customSubtitle && <span className="text-[9px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded-full">{customSubtitle}</span>}
            </div>
            {customText && <p className="text-[10.5px] text-slate-600 mb-1 leading-snug">{customText}</p>}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-700 leading-relaxed">
              {customBullets && customBullets.length > 0 ? (
                customBullets.map((tc, idx) => (
                  <div key={idx}>• {tc}</div>
                ))
              ) : (
                <>
                  <div>• <strong>Validity:</strong> This proposal is valid for 15 days from date of issuance.</div>
                  <div>• <strong>DISCOM Approval:</strong> Net metering subject to DISCOM grid feasibility.</div>
                  <div>• <strong>Rooftop Access:</strong> Client provides unhindered access and water supply.</div>
                  <div>• <strong>Force Majeure:</strong> Delays due to natural events beyond EPC scope.</div>
                  <div>• <strong>Statutory Taxes:</strong> GST applied per government norms on invoice date.</div>
                  <div>• <strong>Subsidy:</strong> DBT credit subject to MNRE portal processing timelines.</div>
                </>
              )}
            </div>
            {renderCustomNote()}
          </div>
        );

      case 'thank_you_signatures':
        return (
          <div key="thank_you_signatures" className="space-y-2.5">
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-300 rounded-2xl p-3 text-xs text-emerald-900 flex items-center gap-4 shadow-xs">
              <span className="text-3xl">💚</span>
              <div>
                <p className="font-black text-xs text-teal-900">{customTitle || 'Thank you for choosing Tejo Bharat Global Energy LLP!'}</p>
                <p className="leading-relaxed font-medium text-[10.5px] mt-0.5 text-slate-700">
                  {customText || 'We appreciate your commitment to clean solar energy. Our engineering team is dedicated to top-tier installation quality, 25-year local service support, and ensuring your investment pays back in the shortest possible time.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border-2 border-dashed border-slate-400 rounded-2xl p-3 flex flex-col justify-between h-24 bg-slate-50/40">
                <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Customer Acceptance & Stamp</div>
                <div className="border-t border-slate-400 pt-1">
                  <div className="font-bold text-xs text-slate-900">{quotation.customer_name}</div>
                  <div className="text-[10px] text-slate-400">Signature, Date & Company Seal</div>
                </div>
              </div>
              <div className="border-2 border-slate-300 bg-slate-50/90 rounded-2xl p-3 flex flex-col justify-between h-24 text-center shadow-xs">
                <div className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">For {companyName}</div>
                <div className="flex flex-col items-center justify-center flex-1">
                  <img src="/signature.png" alt="Authorized Signature" className="h-8 max-h-8 object-contain mx-auto my-0.5 mix-blend-multiply" onError={(e) => {(e.target as HTMLElement).style.display = 'none';}} />
                  <div className="font-serif italic font-extrabold text-teal-950 text-xs tracking-wide">{companySignatoryTitle}</div>
                </div>
                <div className="border-t border-slate-200 pt-0.5 text-[9px] text-slate-500 font-mono">
                  Ref: TBGE-{quotation.quotation_no} | {quotation.quotation_date}
                </div>
              </div>
            </div>

            <div className="border-t-2 border-slate-200 pt-2 text-center text-xs text-slate-600 space-y-0.5 relative group">
              {onOpenBranchModal && (
                <button
                  type="button"
                  onClick={onOpenBranchModal}
                  className="no-print absolute right-0 -top-1 text-[10px] text-teal-700 hover:text-teal-900 font-bold bg-white hover:bg-teal-50 border border-teal-300 rounded px-2 py-0.5 transition-all shadow-xs flex items-center gap-1"
                  title="Edit Footer Information (Address, GSTIN, CIN, Phone, Email, Website)"
                >
                  <Edit2 className="w-3 h-3 text-teal-600" />
                  <span>Edit Footer</span>
                </button>
              )}
              <div className="font-black text-teal-900 text-xs">{companyName}</div>
              <div className="text-[10.5px]">📍 {companyAddress}{activeBranch?.pincode ? ` - ${activeBranch.pincode}` : ''}</div>
              <div className="text-[10.5px]">📞 {companyPhone} | ✉️ {companyEmail} | 🌐 {companyWebsite}</div>
              <div className="text-[9px] text-slate-400 pt-0.5 font-mono">
                GSTIN: {companyGstin} | {companyCin}{companyPan ? ` | PAN: ${companyPan}` : ''}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-[9px] text-slate-500 leading-relaxed">
              <strong className="text-slate-700">Disclaimer:</strong> Generation estimates are based on {yieldInfo.state} solar insolation data (~5.0 kWh/m²/day average). Actual output may vary ±10% based on shading, dust, and grid conditions. Subsidy amounts are subject to MNRE policy revisions.
            </div>
            {renderCustomNote()}
          </div>
        );

      default: {
        if (!sec) return null;
        return (
          <div key={sectionId} className="space-y-2">
            <div className="flex items-center justify-between border-b-2 border-amber-400 pb-1.5">
              <div>
                <h3 className="text-xs font-black text-slate-900 tracking-wider uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                  <span>{customTitle || sec.title}</span>
                </h3>
                {customSubtitle && (
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">{customSubtitle}</p>
                )}
              </div>
              <span className="text-[9.5px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 uppercase tracking-wider">
                Special Clause
              </span>
            </div>

            {customText && (
              <div className="text-[10.5px] text-slate-700 leading-relaxed whitespace-pre-line bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/70 shadow-2xs">
                {customText}
              </div>
            )}

            {customBullets && customBullets.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {customBullets.map((bullet, idx) => {
                  const parts = bullet.split(':');
                  const hasPrefix = parts.length > 1 && parts[0].length < 40;
                  return (
                    <div key={idx} className="bg-white border border-slate-200 rounded-lg p-2 shadow-2xs">
                      {hasPrefix ? (
                        <>
                          <div className="text-[10.5px] font-black text-teal-800">{parts[0].trim()}</div>
                          <div className="text-[10px] text-slate-600 mt-0.5 leading-snug">{parts.slice(1).join(':').trim()}</div>
                        </>
                      ) : (
                        <div className="text-[10px] text-slate-700 flex items-start gap-1.5">
                          <span className="text-amber-600 font-black">•</span>
                          <span>{bullet}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {renderCustomNote()}
          </div>
        );
      }
    }
  };

  return (
    <div className="w-full font-sans text-slate-800 relative">
      {/* AUTO-FIT FLOATING TOAST NOTIFICATION */}
      {autoFitToast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border-2 border-amber-400 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <Zap className="w-5 h-5 text-amber-400 fill-amber-400 flex-shrink-0" />
          <span className="text-xs font-extrabold">{autoFitToast.message}</span>
          <button
            onClick={() => setAutoFitToast(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg ml-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* TOP ACTION BAR */}
      <div className="bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-slate-200 mb-6 flex items-center justify-between no-print">
        
        {/* Left: Title & Format Switcher */}
        <div className="flex items-center gap-3">
          {onBackToList && (
            <button 
              onClick={onBackToList}
              className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{quotation.document_type || 'Sales Invoice'} #{quotation.quotation_no}</span>
            <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
              isPaid ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
              isPartial ? 'bg-amber-100 text-amber-800 border border-amber-200' :
              'bg-rose-100 text-rose-700 border border-rose-200'
            }`}>
              {statusLabel}
            </span>
          </h1>

          {/* PAGE FORMAT TOGGLE */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold ml-4">
            <button
              onClick={() => setQuoteFormat('2_page')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                quoteFormat === '2_page' 
                  ? 'bg-teal-700 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>2-Page Summary</span>
            </button>
            <button
              onClick={() => setQuoteFormat('5_page')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                quoteFormat === '5_page' 
                  ? 'bg-teal-700 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{totalPages}-Page Detailed Proposal</span>
            </button>
          </div>

          {/* EDIT SECTIONS & PAGE LAYOUT BUTTON */}
          <button
            onClick={() => {
              if (quoteFormat !== '5_page') setQuoteFormat('5_page');
              setShowLayoutCustomizer(!showLayoutCustomizer);
            }}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-extrabold transition-all border ml-2 ${
              showLayoutCustomizer
                ? 'bg-amber-500 text-slate-900 border-amber-600 shadow-md ring-2 ring-amber-400/40'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400'
            }`}
            title="Reorder PDF pages and sections (define which comes first, next, or move between pages)"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-600" />
            <span>🎨 Reorder PDF Sections & Pages</span>
          </button>

          {/* ONE-CLICK AUTO-FIT BUTTON */}
          {quoteFormat === '5_page' && (
            <button
              type="button"
              onClick={handleAutoFit}
              className="px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-black transition-all border border-amber-500 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 ml-2 shadow-sm cursor-pointer active:scale-95"
              title="Automatically calculate section heights and fit all content perfectly across pages without any overflow or lost content"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
              <span>⚡ Auto-Fit Pages</span>
            </button>
          )}

          {/* ADD PAGE BUTTON */}
          {quoteFormat === '5_page' && (
            <button
              type="button"
              onClick={addPage}
              className="px-3 py-1.5 rounded-xl flex items-center gap-1 text-xs font-extrabold transition-all border border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 ml-2 shadow-2xs cursor-pointer active:scale-95"
              title={`Add an extra page (Page ${totalPages + 1}) to your proposal booklet to spread out content without overflow`}
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>+ Add Page ({totalPages + 1})</span>
            </button>
          )}

          {/* GLOBAL NOTES TOGGLE */}
          {quoteFormat === '5_page' && (
            <button
              type="button"
              onClick={toggleAllNotes}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-extrabold transition-all border ml-2 cursor-pointer ${
                showAllNotes
                  ? 'bg-amber-100 text-amber-900 border-amber-400 shadow-xs ring-2 ring-amber-300/50'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100 hover:border-slate-400'
              }`}
              title="Show or hide all section 📌 Note boxes across proposal pages (hidden by default to keep pages compact)"
            >
              <span>📌 Notes: {showAllNotes ? 'Visible' : 'Hidden'}</span>
            </button>
          )}

          {/* RUNNING PAGE FOOTER TOGGLE */}
          {quoteFormat === '5_page' && (
            <button
              type="button"
              onClick={togglePageFooters}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-extrabold transition-all border ml-2 cursor-pointer ${
                showPageFooters
                  ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400'
                  : 'bg-amber-100 text-amber-900 border-amber-400 shadow-xs ring-2 ring-amber-300/50'
              }`}
              title="Show or hide running page footers (Tejo Bharat... | Page X of Y). Turn off if content is dense or if you prefer no footer."
            >
              <span>📄 Page Footer: {showPageFooters ? 'Shown' : 'Hidden'}</span>
            </button>
          )}

          {/* QUICK CATEGORY SWITCHER */}
          {onChangeQuotation && (
            <div className="flex items-center gap-1.5 bg-amber-50 px-2 py-1 rounded-xl border border-amber-300 text-xs font-bold ml-2">
              <span className="text-amber-900 text-[11px] whitespace-nowrap font-extrabold">Category:</span>
              <select
                value={quotation.category || 'Residential / Home'}
                onChange={(e) => onChangeQuotation({ ...quotation, category: e.target.value as any })}
                className="bg-white text-slate-900 border border-amber-300 rounded-lg px-2 py-1 text-xs font-extrabold focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="Residential / Home">🏠 Residential / Home (PM Surya Ghar Subsidy)</option>
                <option value="Group Housing Society (GHS)">🏢 Group Housing Society (GHS / RWA)</option>
                <option value="Commercial / Institutional">🏬 Commercial / Institutional (40% AD & Tax Benefits)</option>
                <option value="Industrial">🏭 Industrial (40% AD & Tax Benefits)</option>
              </select>
            </div>
          )}
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsWhatsAppModalOpen(true)}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Share on WhatsApp</span>
          </button>

          <button 
            onClick={handleDownloadWord}
            className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
            title="Download editable Microsoft Word (.docx) proposal"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Word (.docx)</span>
          </button>

          {/* Download PDF Split Dropdown — Defaults to native 100% aligned vector engine (same as Cmd+P) */}
          <div className="relative inline-flex items-center">
            <div className="flex items-center rounded-xl bg-teal-700 shadow-sm hover:bg-teal-800 text-white transition-all overflow-hidden">
              <button 
                onClick={handleDownloadPDF}
                className="px-3.5 py-1.5 font-extrabold text-xs flex items-center gap-1.5 hover:bg-teal-800/80 transition-all border-r border-teal-600/60"
                title="Download / Save as 100% vector PDF (Exact same engine as Cmd+P)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
              <button 
                onClick={() => setIsPdfDropdownOpen(!isPdfDropdownOpen)}
                className="px-2 py-1.5 hover:bg-teal-800/80 transition-all flex items-center justify-center"
                title="Choose PDF format"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${isPdfDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {isPdfDropdownOpen && (
              <div 
                className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-1.5 text-xs text-slate-700 divide-y divide-slate-100"
                onClick={() => setIsPdfDropdownOpen(false)}
              >
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Select PDF Output Engine
                </div>
                
                {/* 1. Vector PDF via native engine (Same as Cmd+P) */}
                <button 
                  onClick={handlePrint}
                  className="w-full text-left px-3 py-2.5 hover:bg-teal-50 flex items-start gap-2.5 text-teal-950 font-bold transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black text-xs flex items-center gap-1.5 text-teal-800">
                      <span>Save as PDF (Browser Vector)</span>
                      <span className="text-[8.5px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-black uppercase">100% Aligned</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium leading-snug mt-0.5">
                      Uses Chromium vector engine (Cmd+P). Exact alignment, zero canvas distortion, razor-sharp vector text.
                    </div>
                  </div>
                </button>

                {/* 2. Direct 1-click Download */}
                <button 
                  onClick={handleDownloadDirectPDF}
                  disabled={isGeneratingDirectPdf}
                  className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-start gap-2.5 text-slate-800 font-bold transition-all disabled:opacity-50"
                >
                  <Download className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-extrabold text-xs flex items-center gap-1.5">
                      <span>{isGeneratingDirectPdf ? 'Generating PDF...' : 'Direct File Download (.pdf)'}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium leading-snug mt-0.5">
                      Downloads .pdf file directly. Aspect ratio locked to eliminate vertical stretching.
                    </div>
                  </div>
                </button>

                {/* 3. Word (.docx) */}
                <button 
                  onClick={handleDownloadWord}
                  className="w-full text-left px-3 py-2.5 hover:bg-blue-50 flex items-start gap-2.5 text-blue-900 font-bold transition-all"
                >
                  <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-extrabold text-xs">Microsoft Word (.docx)</div>
                    <div className="text-[10px] text-slate-500 font-medium leading-snug mt-0.5">
                      Fully editable proposal with native Word tables & Kotak bank details.
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print {quoteFormat === '5_page' ? `${totalPages}-Page Proposal` : '2-Page Quote'}</span>
          </button>

          <button
            onClick={onOpenRecordPayment}
            className="px-4 py-1.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <span>Record Payment</span>
          </button>

          {onSaveToSupabase && (
            <button
              onClick={onSaveToSupabase}
              disabled={isSaving}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs transition-all disabled:opacity-50"
            >
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION & PAGE LAYOUT CUSTOMIZATION DRAWER */}
      {showLayoutCustomizer && quoteFormat === '5_page' && (
        <div className="w-full bg-slate-900 text-white rounded-2xl border-2 border-amber-400/70 shadow-2xl p-5 mb-6 no-print space-y-4">
          {/* Drawer Top Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-400 shadow-xs">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black text-white tracking-wide">
                    🎨 PDF Page Layout & Section Sequencer
                  </h2>
                  <span className="bg-amber-500/20 text-amber-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-500/40">
                    {sections.filter(s => s.visible).length} of {sections.length} Sections Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Decide which section comes first, second, or next. Reorder within a page, shift across pages 1–{totalPages}, or add extra pages to prevent overflow.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Toggle View Mode */}
              <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setCustomizerView('board')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    customizerView === 'board' ? 'bg-amber-500 text-slate-900 shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📑 Board ({totalPages} Pages)
                </button>
                <button
                  type="button"
                  onClick={() => setCustomizerView('list')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    customizerView === 'list' ? 'bg-amber-500 text-slate-900 shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🔢 Linear Sequence
                </button>
              </div>

              {/* Add Page & Add Section Buttons */}
              <button
                type="button"
                onClick={addPage}
                className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-xs text-white font-extrabold rounded-xl border border-emerald-500/60 transition-colors flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                title={`Add Page ${totalPages + 1} to proposal layout`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Page ({totalPages + 1})</span>
              </button>
              <button
                type="button"
                onClick={() => openAddSectionModal()}
                className="px-2.5 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-xs text-white font-extrabold rounded-xl border border-indigo-500/60 transition-colors flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                title="Add a custom section/clause to any page"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Section</span>
              </button>

              {/* Toggle On-Preview Bars */}
              <button
                type="button"
                onClick={() => setShowLiveMoverBars(!showLiveMoverBars)}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 ${
                  showLiveMoverBars 
                    ? 'bg-teal-900/60 border-teal-500/60 text-teal-200 hover:bg-teal-800/60' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
                title="Toggle live mover buttons directly on the proposal pages below"
              >
                <Layers className="w-3.5 h-3.5 text-teal-400" />
                <span>On-Preview Buttons: {showLiveMoverBars ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={() => setAllVisibility(true)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-bold rounded-xl border border-slate-700 transition-colors"
              >
                Show All
              </button>
              <button
                type="button"
                onClick={() => setAllVisibility(false)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold rounded-xl border border-slate-700 transition-colors"
              >
                Hide All
              </button>
              <button
                type="button"
                onClick={toggleAllNotes}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 ${
                  showAllNotes
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 hover:bg-amber-500/30'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
                title="Toggle all section notes across the proposal pages"
              >
                <span>📌 Notes: {showAllNotes ? 'Visible' : 'Hidden'}</span>
              </button>
              <button
                type="button"
                onClick={handleAutoFit}
                className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 text-xs font-black rounded-xl transition-all flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                title="Automatically calculate section heights and distribute so no page overflows"
              >
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                <span>⚡ Auto-Fit</span>
              </button>
              <button
                type="button"
                onClick={resetLayout}
                className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-xs text-white font-bold rounded-xl transition-colors flex items-center gap-1 shadow-xs"
                title="Reset to factory default 5-page order"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
              <button
                type="button"
                onClick={() => setShowLayoutCustomizer(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                title="Close Customizer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* VIEW MODE 1: DYNAMIC MULTI-PAGE INTERACTIVE BOARD */}
          {customizerView === 'board' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
              {pageList.map((pageNum) => {
                const pageSecs = sections.filter(s => s.page === pageNum);
                const info = getPageInfo(pageNum);
                const visibleCount = pageSecs.filter(s => s.visible).length;
                const pageOverflow = calculatePageOverflow(pageNum, sections, quotation, {
                  showPageFooters,
                  isSectionNoteVisible,
                  siteGroupsCount: siteGroups.length
                });

                return (
                  <div 
                    key={pageNum} 
                    className="bg-slate-950/70 border-2 border-slate-800 hover:border-slate-700 rounded-xl p-3 flex flex-col justify-between transition-all"
                  >
                    <div>
                      {/* Page Column Header */}
                      <div className="border-b border-slate-800 pb-2 mb-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black text-amber-400 tracking-wider flex items-center gap-1">
                            <span>{info.icon}</span>
                            <span>PAGE {pageNum}</span>
                            {pageOverflow.isOverflowing ? (
                              <span className="text-[9px] font-black bg-red-500/30 text-red-300 border border-red-500/60 px-1.5 py-0.5 rounded ml-1 animate-pulse">
                                +{pageOverflow.overflowPx}px
                              </span>
                            ) : (
                              <span className="text-[9px] font-semibold text-slate-400 ml-1">
                                {pageOverflow.percentageUsed}%
                              </span>
                            )}
                          </span>
                          
                          {/* Page Controls (Swap & Delete) */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => swapPages(pageNum, pageNum - 1)}
                              disabled={pageNum === 1}
                              title={pageNum > 1 ? `Swap with Page ${pageNum - 1}` : 'First Page'}
                              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-20 text-[10px] text-slate-300 rounded font-bold transition-colors cursor-pointer"
                            >
                              ◀
                            </button>
                            <button
                              type="button"
                              onClick={() => swapPages(pageNum, pageNum + 1)}
                              disabled={pageNum === totalPages}
                              title={pageNum < totalPages ? `Swap with Page ${pageNum + 1}` : 'Last Page'}
                              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-20 text-[10px] text-slate-300 rounded font-bold transition-colors cursor-pointer"
                            >
                              ▶
                            </button>
                            {pageNum > 5 && (
                              <button
                                type="button"
                                onClick={() => removePage(pageNum)}
                                title={`Delete Page ${pageNum}`}
                                className="px-1.5 py-0.5 bg-red-950/80 hover:bg-red-900 text-red-300 rounded text-[10px] font-bold transition-colors cursor-pointer border border-red-800/60 ml-0.5"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="text-[10.5px] font-bold text-slate-300 truncate" title={info.subtitle}>
                          {info.subtitle}
                        </div>
                        <div className="text-[9.5px] text-slate-500 font-semibold mt-0.5 flex items-center justify-between">
                          <span>{pageSecs.length} section{pageSecs.length !== 1 ? 's' : ''} ({visibleCount} active)</span>
                        </div>

                        {/* Page Density Status */}
                        {pageSecs.length >= 5 ? (
                          <div className="mt-1.5 text-[9.5px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 font-bold">
                            <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                            <span>Heavy (May exceed 1 page)</span>
                          </div>
                        ) : pageSecs.length === 0 ? (
                          <div className="mt-1.5 text-[9.5px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-medium">
                            <span>Empty Page</span>
                          </div>
                        ) : (
                          <div className="mt-1.5 text-[9.5px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                            <span>✓ Good Fit</span>
                          </div>
                        )}
                      </div>

                      {/* Sections List for this Page */}
                      <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-0.5">
                        {pageSecs.length > 0 ? (
                          pageSecs.map((sec, secIdx) => (
                            <div
                              key={sec.id}
                              className={`p-2 rounded-lg border transition-all flex items-center justify-between gap-1.5 text-xs ${
                                sec.visible
                                  ? 'bg-slate-900/95 border-slate-700/80 text-slate-100 hover:border-amber-400/50 shadow-2xs'
                                  : 'bg-slate-950/40 border-slate-900 text-slate-500 opacity-60'
                              }`}
                            >
                              {/* Left: Sequence Number & Title */}
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0 ${
                                  sec.visible ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-500'
                                }`}>
                                  #{secIdx + 1}
                                </span>
                                <span 
                                  className={`font-bold truncate text-[11px] leading-tight ${
                                    sec.visible ? 'text-slate-200' : 'text-slate-500 line-through'
                                  }`} 
                                  title={sec.title}
                                >
                                  {sec.title}
                                </span>
                              </div>

                              {/* Right: Move Controls & Actions */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {/* Up Button */}
                                <button
                                  type="button"
                                  onClick={() => moveSectionOnPage(sec.id, 'up')}
                                  disabled={pageNum === 1 && secIdx === 0}
                                  title={secIdx === 0 ? `Move to Page ${pageNum - 1}` : 'Move Earlier (Up)'}
                                  className="p-1 hover:bg-slate-800 disabled:opacity-20 text-slate-400 hover:text-amber-300 rounded transition-colors cursor-pointer"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>

                                {/* Down Button */}
                                <button
                                  type="button"
                                  onClick={() => moveSectionOnPage(sec.id, 'down')}
                                  disabled={pageNum === totalPages && secIdx === pageSecs.length - 1}
                                  title={secIdx === pageSecs.length - 1 ? `Move to Page ${pageNum + 1}` : 'Move Next (Down)'}
                                  className="p-1 hover:bg-slate-800 disabled:opacity-20 text-slate-400 hover:text-amber-300 rounded transition-colors cursor-pointer"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>

                                {/* Page Selector */}
                                <select
                                  value={sec.page}
                                  onChange={(e) => changeSectionPage(sec.id, Number(e.target.value))}
                                  className="bg-slate-950 border border-slate-700 text-amber-300 text-[10px] font-extrabold rounded px-1 py-0.5 cursor-pointer hover:border-amber-400"
                                  title="Shift to another page"
                                >
                                  {pageList.map(p => (
                                    <option key={p} value={p}>P{p}</option>
                                  ))}
                                </select>

                                {/* Edit Section Text */}
                                <button
                                  type="button"
                                  onClick={() => openSectionEditor(sec.id)}
                                  className={`p-1 rounded transition-colors cursor-pointer ${
                                    (sec.customTitle || sec.customSubtitle || sec.customText || sec.customBullets || sec.customNote)
                                      ? 'text-teal-400 hover:bg-slate-800'
                                      : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                                  }`}
                                  title="Edit Section Text & Content"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete Custom Section */}
                                {sec.id.startsWith('custom_') && (
                                  <button
                                    type="button"
                                    onClick={() => deleteCustomSection(sec.id)}
                                    className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/60 transition-colors cursor-pointer"
                                    title="Delete custom section"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Visibility Toggle */}
                                <button
                                  type="button"
                                  onClick={() => toggleSectionVisibility(sec.id)}
                                  className={`p-1 rounded transition-colors cursor-pointer ${
                                    sec.visible ? 'text-amber-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-800'
                                  }`}
                                  title={sec.visible ? 'Hide Section' : 'Show Section'}
                                >
                                  {sec.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="border border-dashed border-slate-800 rounded-lg p-3 text-center text-slate-500 text-[11px] space-y-2">
                            <p className="italic">Page {pageNum} is empty.</p>
                            <button
                              type="button"
                              onClick={() => openAddSectionModal(pageNum)}
                              className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded border border-amber-500/40 text-[10px] font-bold transition-colors cursor-pointer inline-block"
                            >
                              + Add Section Here
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Quick Add Page Card */}
              <div 
                onClick={addPage}
                className="border-2 border-dashed border-slate-700 hover:border-amber-400 hover:bg-slate-900/80 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[200px] group/addcard"
                title={`Click to add Page ${totalPages + 1}`}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-800 group-hover/addcard:bg-amber-500 text-slate-300 group-hover/addcard:text-slate-950 flex items-center justify-center font-black text-lg transition-colors mb-2 shadow-xs">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-xs font-black text-slate-200 group-hover/addcard:text-amber-300">
                  + Add Page {totalPages + 1}
                </span>
                <span className="text-[10.5px] text-slate-400 mt-1 max-w-[150px] leading-snug">
                  Add an extra page if content does not fit on existing pages
                </span>
              </div>
            </div>
          ) : (
            /* VIEW MODE 2: LINEAR SEQUENCE LIST (ALL SECTIONS) */
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-bold">
                <span className="text-slate-400 text-[11px]">Filter by Page:</span>
                <button
                  type="button"
                  onClick={() => setActivePageFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activePageFilter === 'all' ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  All Pages ({sections.length})
                </button>
                {pageList.map((p) => {
                  const count = sections.filter(s => s.page === p).length;
                  const visibleCount = sections.filter(s => s.page === p && s.visible).length;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setActivePageFilter(p)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        activePageFilter === p ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      Page {p} ({visibleCount}/{count})
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[350px] overflow-y-auto pr-1">
                {sections
                  .filter(s => activePageFilter === 'all' || s.page === activePageFilter)
                  .map((sec) => {
                    const pageSecs = sections.filter(s => s.page === sec.page);
                    const secIdx = pageSecs.findIndex(s => s.id === sec.id);

                    return (
                      <div
                        key={sec.id}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 text-xs ${
                          sec.visible
                            ? 'bg-slate-800/90 border-slate-700 text-slate-100 shadow-xs'
                            : 'bg-slate-950/60 border-slate-800 text-slate-500 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => toggleSectionVisibility(sec.id)}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              sec.visible ? 'text-amber-400 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-800'
                            }`}
                            title={sec.visible ? 'Hide Section' : 'Show Section'}
                          >
                            {sec.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className={`font-bold truncate text-[11px] flex items-center gap-1.5 ${sec.visible ? 'text-slate-100' : 'text-slate-500 line-through'}`}>
                              <span className="text-amber-400 font-mono">#{secIdx + 1}</span>
                              <span className="truncate">{sec.title}</span>
                              {(sec.customTitle || sec.customSubtitle || sec.customText || sec.customBullets || sec.customNote) && (
                                <span className="text-[9px] text-teal-300 font-extrabold bg-teal-900/60 px-1 py-0.2 rounded border border-teal-600 flex-shrink-0">
                                  Edited
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                              <span className="text-slate-400">Page:</span>
                              <select
                                value={sec.page}
                                onChange={(e) => changeSectionPage(sec.id, Number(e.target.value))}
                                className="bg-slate-900 border border-slate-700 text-amber-300 font-extrabold rounded px-1.5 py-0.5 text-[10px] focus:ring-1 focus:ring-amber-400 cursor-pointer"
                              >
                                {pageList.map(p => (
                                  <option key={p} value={p}>Page {p}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Order & Edit Controls */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openSectionEditor(sec.id)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              (sec.customTitle || sec.customSubtitle || sec.customText || sec.customBullets || sec.customNote)
                                ? 'bg-teal-950/60 border-teal-600/60 text-teal-300 hover:bg-teal-900'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-amber-400 hover:border-amber-400'
                            }`}
                            title="Edit Section Text & Content"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {sec.id.startsWith('custom_') && (
                            <button
                              type="button"
                              onClick={() => deleteCustomSection(sec.id)}
                              className="p-1.5 rounded-lg border border-red-500/40 bg-red-950/40 text-red-400 hover:text-red-300 hover:bg-red-900/60 transition-colors cursor-pointer"
                              title="Delete custom section"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <div className="flex flex-col gap-0.5 text-slate-400">
                            <button
                              type="button"
                              onClick={() => moveSectionOnPage(sec.id, 'up')}
                              disabled={sec.page === 1 && secIdx === 0}
                              className="hover:text-amber-400 disabled:opacity-20 px-1 text-[10px] font-bold cursor-pointer"
                              title="Move Earlier (Up)"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => moveSectionOnPage(sec.id, 'down')}
                              disabled={sec.page === totalPages && secIdx === pageSecs.length - 1}
                              className="hover:text-amber-400 disabled:opacity-20 px-1 text-[10px] font-bold cursor-pointer"
                              title="Move Next (Down)"
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* HIDDEN SECTIONS TRAY (Quick Restore) */}
          {sections.some(s => !s.visible) && (
            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 font-bold text-[11px] flex items-center gap-1">
                <EyeOff className="w-3.5 h-3.5 text-amber-500" />
                <span>Hidden Sections ({sections.filter(s => !s.visible).length}):</span>
              </span>
              {sections.filter(s => !s.visible).map(sec => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => toggleSectionVisibility(sec.id)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700 text-[10.5px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Click to restore this section"
                >
                  <Eye className="w-3 h-3 text-amber-400" />
                  <span>{sec.title} (Page {sec.page})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MAIN VIEWPORT SPLIT LAYOUT */}
      <div className="flex gap-6 items-start justify-center">
        
        {/* Printable Quotation Area */}
        <div className="quotation-print-area flex-1 flex flex-col items-center gap-8">

          {/* ========================================================== */}
          {/* FORMAT 1: DETAILED PROPOSAL BOOKLET (DYNAMIC MULTI-PAGE)   */}
          {/* ========================================================== */}
          {quoteFormat === '5_page' ? (
            <div className="space-y-8 text-slate-800 font-sans" style={{ width: '210mm' }}>
              {pageList.map((pageNum) => {
                const pageSecs = sections.filter(s => s.page === pageNum && s.visible);
                const isDensePage = pageSecs.length >= 4;
                const overflowInfo = calculatePageOverflow(pageNum, sections, quotation, {
                  showPageFooters,
                  isSectionNoteVisible,
                  siteGroupsCount: siteGroups.length
                });

                return (
                  <div key={pageNum} className="page bg-white shadow-2xl border border-slate-300 overflow-hidden text-slate-800 px-6 pt-3 pb-2.5 h-[1065px] min-h-[1065px] max-h-[1065px] flex flex-col justify-between relative rounded-sm">
                    <div className="flex-1 min-h-0 flex flex-col justify-between">
                      <div className={isDensePage ? 'space-y-1.5' : 'space-y-2'}>
                        {/* Real-time Page Overflow Alert Banner (no-print) */}
                        {overflowInfo.isOverflowing && (
                          <div className="no-print mb-2 px-3.5 py-2 bg-gradient-to-r from-red-500/15 via-rose-500/10 to-red-500/15 border-2 border-red-500/80 rounded-xl flex items-center justify-between text-xs text-red-950 shadow-sm animate-pulse">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                              <span className="text-[11px] font-black">
                                ⚠️ Page {pageNum} overflows by ~{overflowInfo.overflowPx}px ({pageSecs.length} sections) — content will be clipped in PDF!
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                              <button
                                type="button"
                                onClick={handleAutoFit}
                                className="text-[10.5px] font-black bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1 active:scale-95"
                                title="Automatically balance and fit sections across pages to eliminate overflow"
                              >
                                <Zap className="w-3 h-3 fill-white text-white" />
                                <span>⚡ Auto-Fit Content</span>
                              </button>
                              <button
                                type="button"
                                onClick={addPage}
                                className="text-[10.5px] font-bold bg-white hover:bg-red-50 text-red-700 border border-red-300 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                title={`Add Page ${totalPages + 1} manually`}
                              >
                                + Add Page
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Compact Page Header for Pages without header_exec */}
                        {!pageSecs.some(s => s.id === 'header_exec') && (
                          <div className="flex justify-between items-center border-b-2 pb-2 border-slate-200">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-amber-400 p-0.5 shadow-xs flex-shrink-0">
                                <img src="/logo.png" alt="Tejo Bharat Logo" className="w-full h-full object-contain" onError={(e) => {(e.target as HTMLElement).style.display = 'none';}} />
                              </div>
                              <div>
                                <div className="text-xs font-black text-amber-600 tracking-wide">TEJO BHARAT GLOBAL ENERGY LLP</div>
                                <div className="text-[9.5px] text-slate-500 font-bold">{displayTotalCapacity} kW Solar PV Power System Proposal</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-mono font-bold text-slate-600">Ref: {quotation.quotation_no}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">Date: {quotation.quotation_date}</span>
                            </div>
                          </div>
                        )}

                        {pageSecs.length > 0 ? (
                          pageSecs.map((sec, secIdx) => (
                            <div key={sec.id} id={`proposal-sec-${sec.id}`} className="relative group/sec">
                              {/* Live In-Place Section Reordering Bar (no-print) */}
                              {showLayoutCustomizer && showLiveMoverBars && (
                                <div className="no-print mb-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/20 border-2 border-amber-400 rounded-xl flex items-center justify-between text-xs shadow-sm backdrop-blur-xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="bg-amber-600 text-white font-black text-[10px] px-2 py-0.5 rounded shadow-2xs">
                                      #{secIdx + 1}
                                    </span>
                                    <span className="font-extrabold text-slate-900 text-xs truncate">
                                      {sec.title}
                                    </span>
                                    <span className="text-[10px] text-amber-900 font-bold bg-amber-200/80 px-2 py-0.5 rounded border border-amber-300 hidden sm:inline">
                                      Page {sec.page}
                                    </span>
                                    {(sec.customTitle || sec.customSubtitle || sec.customText || sec.customBullets || sec.customNote) && (
                                      <span className="text-[9.5px] text-teal-900 font-extrabold bg-teal-200/80 px-1.5 py-0.5 rounded border border-teal-400">
                                        ✨ Custom Text
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => openSectionEditor(sec.id)}
                                      title="Edit title, subtitle, description, bullets and notes for this section"
                                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-[11px] font-black flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all"
                                    >
                                      <Edit3 className="w-3.5 h-3.5 text-slate-950" />
                                      <span>Edit Text</span>
                                    </button>

                                    {/* Quick Note Toggle */}
                                    {(() => {
                                      const def = DEFAULT_SECTION_CONTENT[sec.id];
                                      const noteText = sec.customNote !== undefined ? sec.customNote : def?.note;
                                      if (!noteText || !noteText.trim()) return null;
                                      const noteVis = isSectionNoteVisible(sec.id);
                                      return (
                                        <button
                                          type="button"
                                          onClick={() => toggleSectionNote(sec.id)}
                                          title={noteVis ? "Hide this section's note box" : "Show this section's note box"}
                                          className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all border cursor-pointer active:scale-95 ${
                                            noteVis
                                              ? 'bg-amber-100 text-amber-900 border-amber-400 shadow-2xs'
                                              : 'bg-white text-slate-600 hover:text-slate-900 border-slate-300 hover:border-slate-400'
                                          }`}
                                        >
                                          <span>📌 Note: {noteVis ? 'Shown' : 'Hidden'}</span>
                                        </button>
                                      );
                                    })()}

                                    <button
                                      type="button"
                                      onClick={() => moveSectionOnPage(sec.id, 'up')}
                                      disabled={sec.page === 1 && secIdx === 0}
                                      title={secIdx === 0 ? `Move to bottom of Page ${sec.page - 1}` : 'Move section UP (comes earlier)'}
                                      className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-[11px] font-extrabold text-slate-800 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all"
                                    >
                                      <ArrowUp className="w-3.5 h-3.5 text-amber-700" />
                                      <span>Move Up</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => moveSectionOnPage(sec.id, 'down')}
                                      disabled={sec.page === totalPages && secIdx === pageSecs.length - 1}
                                      title={secIdx === pageSecs.length - 1 ? `Move to top of Page ${sec.page + 1}` : 'Move section DOWN (comes next)'}
                                      className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-[11px] font-extrabold text-slate-800 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all"
                                    >
                                      <ArrowDown className="w-3.5 h-3.5 text-amber-700" />
                                      <span>Move Down</span>
                                    </button>

                                    <div className="flex items-center gap-1 bg-white border border-amber-300 rounded-lg px-2 py-0.5 shadow-2xs">
                                      <span className="text-[10px] font-bold text-slate-500">Page:</span>
                                      <select
                                        value={sec.page}
                                        onChange={(e) => changeSectionPage(sec.id, Number(e.target.value))}
                                        className="bg-transparent text-slate-900 text-[11px] font-black cursor-pointer focus:outline-none"
                                        title="Move section to specific page (defaults to start if moving forward)"
                                      >
                                        {pageList.map(p => (
                                          <option key={p} value={p}>Page {p}</option>
                                        ))}
                                      </select>
                                    </div>

                                    {sec.page < totalPages && (
                                      <button
                                        type="button"
                                        onClick={() => changeSectionPage(sec.id, sec.page + 1, 'start')}
                                        title={`Move section directly to the top (start) of Page ${sec.page + 1}`}
                                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-[10.5px] font-extrabold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-2xs"
                                      >
                                        <span>Start of P{sec.page + 1} ❯</span>
                                      </button>
                                    )}

                                    {/* Delete Custom Section */}
                                    {sec.id.startsWith('custom_') && (
                                      <button
                                        type="button"
                                        onClick={() => deleteCustomSection(sec.id)}
                                        title="Delete custom section"
                                        className="p-1 hover:bg-red-100 text-red-500 hover:text-red-700 rounded-lg transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => toggleSectionVisibility(sec.id)}
                                      title="Hide section"
                                      className="p-1 hover:bg-red-100 text-slate-500 hover:text-red-700 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <EyeOff className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              )}

                              {renderSectionById(sec.id)}
                            </div>
                          ))
                        ) : (
                          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs italic my-auto space-y-2">
                            <p className="font-bold text-slate-600 text-sm">Page {pageNum} is currently empty</p>
                            <p className="text-[11px]">Move proposal sections here using the Section Layout Editor, or create a custom section.</p>
                            <div className="no-print flex items-center justify-center gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => openAddSectionModal(pageNum)}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                              >
                                + Add Section to Page {pageNum}
                              </button>
                              {pageNum > 5 && (
                                <button
                                  type="button"
                                  onClick={() => removePage(pageNum)}
                                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  🗑️ Delete Page {pageNum}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {showPageFooters && (
                        <div className="page-footer flex-shrink-0 mt-auto pt-1.5 border-t border-slate-200 flex justify-between items-center text-[9.5px] text-slate-400 bg-white">
                          <span>Tejo Bharat Global Energy LLP — Technical & Commercial Proposal</span>
                          <span className="font-bold text-slate-600">Page {pageNum} of {totalPages}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Multi-Page Bottom Expansion Toolbar (no-print) */}
              <div className="no-print w-full flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-dashed border-amber-300 rounded-2xl shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-lg shadow-xs flex-shrink-0">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Need more pages for your proposal content?</h4>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Currently {totalPages} pages. If content is tight or overflowing, add extra pages to give each section plenty of room.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={addPage}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Page {totalPages + 1}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openAddSectionModal()}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-extrabold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>✨ Add Custom Section</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================== */
            /* FORMAT 2: DEFAULT 2-PAGE QUICK SUMMARY QUOTATION           */
            /* ========================================================== */
            <div className="space-y-8 text-slate-800 font-sans" style={{ width: '210mm' }}>
              
              {/* --- PAGE 1 OF 2: SYSTEM SUMMARY & BOM --- */}
              <div className="page bg-white shadow-2xl border border-slate-300 overflow-hidden text-slate-800 px-6 py-3.5 h-[1030px] min-h-[1030px] max-h-[1030px] flex flex-col relative rounded-sm">
                <div className="flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    {/* Top Brand Header */}
                  <div className="flex justify-between items-start border-b-2 border-teal-700 pb-5">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center border-2 border-amber-400 p-1 shadow-md flex-shrink-0">
                        <img src="/logo.png" alt="Tejo Bharat Logo" className="w-full h-full object-contain" onError={(e) => {(e.target as HTMLElement).style.display = 'none';}} />
                      </div>
                      <div>
                        <h1 className="text-xl font-extrabold text-amber-500 tracking-wide leading-tight">TEJO BHARAT GLOBAL ENERGY LLP</h1>
                        <p className="text-xs text-slate-600 font-bold mt-0.5">Accelerating a Sustainable Future</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">📍 {companyAddress}</p>
                        <p className="text-[11px] text-slate-500">📞 <strong className="text-teal-800">{companyPhone}</strong> | ✉️ <strong className="text-teal-800">{companyEmail}</strong> | 🌐 <strong className="text-teal-800">{companyWebsite}</strong></p>
                      </div>
                    </div>

                    <div className="bg-orange-600 text-white px-4 py-2.5 rounded-xl text-center flex-shrink-0 shadow-md">
                      <div className="text-[10px] font-bold uppercase tracking-wider opacity-90">QUOTATION SUMMARY</div>
                      <div className="text-sm font-black mt-0.5">{quotation.quotation_no}</div>
                      <div className="text-[10px] opacity-90 mt-0.5">Date: {quotation.quotation_date}</div>
                    </div>
                  </div>

                  {/* MNRE Compliant Banner */}
                  <div className="bg-teal-700 text-teal-50 px-5 py-2.5 rounded-xl flex items-center justify-between text-xs font-bold shadow-xs">
                    <span>✅ Central Government (MNRE) Approved</span>
                    <span className="text-teal-300">•</span>
                    <span>BIS Certified Hardware</span>
                    <span className="text-teal-300">•</span>
                    <span>25-Year Performance Warranty</span>
                  </div>

                  {/* Customer Info Card */}
                  <div className="grid grid-cols-2 gap-4 border-2 border-slate-200 rounded-2xl p-4 text-xs bg-slate-50/70 shadow-xs">
                    <div className="space-y-1.5">
                      <div className="font-extrabold text-teal-900 uppercase tracking-wider text-[11px] border-b pb-1 border-slate-200">Customer & Site Details</div>
                      <div className="font-black text-slate-900 text-sm">{quotation.customer_name}</div>
                      <div className="text-slate-700 font-medium leading-snug">{quotation.customer_billing_address || quotation.customer_address}</div>
                      <div className="text-slate-500">Category: <strong className="text-slate-900">{quotation.category}</strong></div>
                      {quotation.customer_gstin && (
                        <div className="text-slate-700 font-mono text-[11px]">GSTIN: <strong className="text-teal-900 font-bold">{quotation.customer_gstin}</strong></div>
                      )}
                      {quotation.customer_pan && (
                        <div className="text-slate-700 font-mono text-[11px]">PAN: <strong className="text-slate-900 font-bold">{quotation.customer_pan}</strong></div>
                      )}
                      <div className="text-slate-500 font-mono text-[11px]">Phone: <strong className="text-slate-900">{quotation.customer_phone || 'N/A'}</strong></div>
                    </div>
                    <div className="space-y-2 text-right font-medium">
                      <div className="font-extrabold text-teal-900 uppercase tracking-wider text-[11px] border-b pb-1 border-slate-200">Quote Reference</div>
                      <div>Quotation No: <strong className="text-teal-800 font-bold">{quotation.quotation_no}</strong></div>
                      <div>Date: <strong className="text-slate-900">{quotation.quotation_date}</strong></div>
                      <div>Valid Until: <strong className="text-slate-900">{quotation.valid_until}</strong></div>
                      <div>System Size: <strong className="text-teal-800 font-bold">{displayTotalCapacity} kWp (On-Grid)</strong></div>
                    </div>
                  </div>

                  {/* System Metrics Grid */}
                  <div className="grid grid-cols-4 gap-3 text-center text-xs">
                    <div className="bg-teal-50 border-2 border-teal-200 rounded-xl p-3.5 shadow-xs">
                      <div className="text-xl font-black text-teal-900">{displayTotalCapacity} kWp</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Capacity</div>
                    </div>
                    <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3.5 shadow-xs">
                      <div className="text-xl font-black text-emerald-900">~{quotation.monthly_units}</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Units / Month</div>
                    </div>
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3.5 shadow-xs">
                      <div className="text-xl font-black text-amber-900">~{quotation.annual_units?.toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Units / Year</div>
                    </div>
                    <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-3.5 shadow-xs">
                      <div className="text-xl font-black text-indigo-900">25 Yrs</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Panel Warranty</div>
                    </div>
                  </div>

                  {/* Bill of Materials (BOM Table / Site Breakdown) */}
                  <div className="space-y-2">
                    <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs flex items-center justify-between">
                      <span>🔩 System Components & Bill of Materials (BOM)</span>
                      {siteGroups.length > 1 && <span className="text-teal-800 text-[10px] font-extrabold">{siteGroups.length} Sites Package</span>}
                    </h4>

                    {siteGroups.length > 1 ? (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {siteGroups.map((grp, idx) => (
                          <div key={idx} className="border-2 border-slate-300 rounded-xl p-2.5 bg-slate-50/80 shadow-xs flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-center border-b pb-1.5 mb-2 border-slate-200 min-h-[26px]">
                                <div className="font-extrabold text-slate-900 text-[12px] flex items-center gap-2 min-w-0 flex-1 mr-2">
                                  <span 
                                    className="site-card-badge w-5 h-5 min-w-[20px] min-h-[20px] rounded-full bg-teal-800 text-white font-extrabold text-[10.5px] flex items-center justify-center shrink-0 leading-none select-none text-center shadow-xs"
                                    style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                                  >
                                    <span className="leading-none block">{idx + 1}</span>
                                  </span>
                                  <span className="font-extrabold text-slate-900 text-[12px] leading-tight truncate">
                                    {grp.siteName}
                                  </span>
                                </div>
                                <span 
                                  className={`site-card-pill shrink-0 inline-flex items-center justify-center text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border leading-tight ${grp.isHybrid ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-teal-100 text-teal-900 border-teal-300'}`}
                                  style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                                >
                                  {grp.capacityKw ? `${grp.capacityKw} kW ` : ''}{grp.isHybrid ? 'Hybrid' : 'On-Grid'}
                                </span>
                              </div>
                              <ul className="space-y-1 text-[10px] text-slate-700">
                                <li className="flex justify-between items-start gap-1.5"><span className="text-slate-500 shrink-0">Array:</span> <span className="font-bold text-slate-900 text-right leading-tight break-words">{grp.capacityKw ? `${Math.ceil((grp.capacityKw * 1000) / 500)}× 500+ W` : 'Mono DCR 500+ W'}</span></li>
                                <li className="flex justify-between items-start gap-1.5"><span className="text-slate-500 shrink-0">Inverter:</span> <span className="font-bold text-teal-800 text-right leading-tight break-words">{grp.isHybrid ? '5 kW Hybrid' : `${grp.capacityKw || 5} kW String`}</span></li>
                                {grp.isHybrid ? (
                                  <li className="flex justify-between items-start gap-1.5 bg-purple-50 px-1 py-0.5 rounded text-purple-900 font-extrabold"><span className="shrink-0">Battery:</span> <span className="text-right leading-tight break-words">10 kWh LFP</span></li>
                                ) : (
                                  <li className="flex justify-between items-start gap-1.5 text-slate-400"><span className="shrink-0">Battery:</span> <span className="text-right leading-tight break-words">N/A (Grid-Tied)</span></li>
                                )}
                                <li className="flex justify-between items-start gap-1.5"><span className="text-slate-500 shrink-0">BOS:</span> <span className="font-medium text-slate-800 text-right leading-tight break-words">HDG, Cables, ACDB/DCDB, LA</span></li>
                              </ul>
                            </div>
                            <div className="mt-1.5 pt-1 border-t border-slate-200 flex justify-between items-center font-extrabold text-[10.5px]">
                              <span className="text-slate-500 text-[9.5px]">Value:</span>
                              <span className="text-emerald-700 font-black">₹ {grp.totalCost.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <table className="w-full border-collapse border-2 border-slate-300 rounded-2xl overflow-hidden text-xs">
                        <thead>
                          <tr className="bg-slate-900 text-white text-[11px] font-extrabold">
                            <th className="px-2.5 py-2 text-left">Component</th>
                            <th className="px-2.5 py-2 text-left">Technical Specification</th>
                            <th className="px-2.5 py-2 text-left">Make / Brand</th>
                            <th className="p-3 text-center">Qty</th>
                            <th className="p-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-xs font-medium">
                          <tr className="hover:bg-slate-50">
                            <td className="px-2.5 py-1.5 font-extrabold text-slate-900">Solar Panels</td>
                            <td className="px-2.5 py-1.5">Mono DCR PV Modules (500+ W High Efficiency, ALMM Listed)</td>
                            <td className="px-2.5 py-1.5 font-bold text-teal-800">{quotation.panel_brand || 'Premier / Waaree 500+ W Mono DCR'}</td>
                            <td className="px-2.5 py-1.5 text-center font-bold">{Math.ceil((displayTotalCapacity * 1000) / 500)} Nos</td>
                            <td className="px-2.5 py-1.5 text-right"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">✓ Included</span></td>
                          </tr>
                          <tr className="bg-slate-50/50 hover:bg-slate-50">
                            <td className="px-2.5 py-1.5 font-extrabold text-slate-900">Solar Inverter</td>
                            <td className="px-2.5 py-1.5">{displayTotalCapacity} kW {displayInverterPhase} String Inverter + WiFi App</td>
                            <td className="px-2.5 py-1.5 font-bold text-teal-800">{cleanInverterBrand}</td>
                            <td className="px-2.5 py-1.5 text-center font-bold">1 Set</td>
                            <td className="px-2.5 py-1.5 text-right"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">✓ Included</span></td>
                          </tr>
                          <tr className="hover:bg-slate-50">
                            <td className="px-2.5 py-1.5 font-extrabold text-slate-900">Mount Structure</td>
                            <td className="px-2.5 py-1.5">{displayStructureType} ({displayStructureHeight})</td>
                            <td className="px-2.5 py-1.5 font-bold text-teal-800">{displayStructureGrid}</td>
                            <td className="px-2.5 py-1.5 text-center font-bold">1 Set</td>
                            <td className="px-2.5 py-1.5 text-right"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">✓ Included</span></td>
                          </tr>
                          <tr className="bg-slate-50/50 hover:bg-slate-50">
                            <td className="px-2.5 py-1.5 font-extrabold text-slate-900">Cabling & Protection</td>
                            <td className="px-2.5 py-1.5">Polycab Solar DC Cables, ACDB/DCDB, 3x Earthing Pits & LA</td>
                            <td className="px-2.5 py-1.5 font-bold text-teal-800">{quotation.cables_brand}</td>
                            <td className="px-2.5 py-1.5 text-center font-bold">1 Lot</td>
                            <td className="px-2.5 py-1.5 text-right"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">✓ Included</span></td>
                          </tr>
                          <tr className="hover:bg-slate-50">
                            <td className="px-2.5 py-1.5 font-extrabold text-slate-900">Net Metering</td>
                            <td className="px-2.5 py-1.5">CEIG Safety Inspection & DISCOM Net Metering Support</td>
                            <td className="px-2.5 py-1.5 font-bold text-teal-800">State DISCOM / Approved</td>
                            <td className="px-2.5 py-1.5 text-center font-bold">1 Project</td>
                            <td className="px-2.5 py-1.5 text-right"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">✓ Included</span></td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* System Architecture Flow Diagram */}
                  <div className="border-2 border-slate-300 rounded-2xl p-4 bg-slate-900 text-white text-xs space-y-2.5 shadow-md">
                    <div className="font-extrabold text-amber-400 uppercase tracking-wider text-xs flex justify-between">
                      <span>⚡ On-Grid Solar Power Flow & Electrical Architecture</span>
                      <span className="text-[10px] text-teal-300 font-mono">CEIG Single Line Diagram</span>
                    </div>
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-center text-xs">
                      <div className="bg-slate-800 p-2 rounded-xl border border-slate-700 flex-1 mx-1">
                        <div className="text-amber-400 font-bold">☀️ Solar Array</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{displayTotalCapacity} kW DC</div>
                      </div>
                      <span className="text-teal-400 font-bold text-xs">➔</span>
                      <div className="bg-slate-800 p-2 rounded-xl border border-slate-700 flex-1 mx-1">
                        <div className="text-teal-300 font-bold">⚡ DCDB Box</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">SPD & Fuse</div>
                      </div>
                      <span className="text-teal-400 font-bold text-xs">➔</span>
                      <div className="bg-slate-800 p-2 rounded-xl border border-slate-700 flex-1 mx-1">
                        <div className="text-emerald-400 font-bold">🔌 ACDB Box</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">MCB Protection</div>
                      </div>
                      <span className="text-teal-400 font-bold text-xs">➔</span>
                      <div className="bg-slate-800 p-2 rounded-xl border border-slate-700 flex-1 mx-1">
                        <div className="text-cyan-300 font-bold">📊 Net Meter</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Grid Sync</div>
                      </div>
                    </div>
                  </div>
                  </div>

                  <div className="page-footer border-t border-slate-200 pt-2 flex justify-between items-center text-[10px] text-slate-400 mt-2">
                    <span>Tejo Bharat Global Energy LLP — Quick Summary</span>
                    <span className="font-bold text-slate-600">Page 1 of 2</span>
                  </div>
                </div>
              </div>

              {/* --- PAGE 2 OF 2: PRICING, BANK DETAILS & SIGNATURES --- */}
              <div className="page bg-white shadow-2xl border border-slate-300 overflow-hidden text-slate-800 px-6 py-3.5 h-[1030px] min-h-[1030px] max-h-[1030px] flex flex-col relative rounded-sm">
                <div className="flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    {/* Header Bar */}
                  <div className="flex justify-between items-center border-b-2 pb-3 border-slate-200">
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <span>💰 Financial Breakdown & Authorization</span>
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">Ref: {quotation.quotation_no}</span>
                  </div>

                  {/* Itemized Commercial Line Items Table */}
                  {quotation.line_items && quotation.line_items.length > 0 && (
                    <div className="border-2 border-slate-300 rounded-xl overflow-hidden shadow-xs">
                      <div className="bg-slate-900 text-white px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider flex justify-between items-center">
                        <span>🏬 Commercial Line Items Breakdown ({quotation.line_items.length} Items)</span>
                        <span className="text-amber-400 font-bold">Total: ₹ {(quotation.total_amount || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-300 text-[10px]">
                            <th className="px-2 py-1 text-center w-6">#</th>
                            <th className="px-2 py-1">Item Description & Site Location</th>
                            <th className="px-2 py-1 text-center w-12">Qty</th>
                            <th className="px-2 py-1 text-right w-20">Taxable Rate</th>
                            <th className="px-2 py-1 text-right w-22">Taxable (₹)</th>
                            <th className="px-2 py-1 text-right w-22">GST (₹)</th>
                            <th className="px-2 py-1 text-right w-24">Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-medium text-[10.5px]">
                          {processedLineItems.map((item, idx) => (
                            <tr key={item.id || idx} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                              <td className="px-2 py-1 text-center font-bold text-slate-500">{idx + 1}</td>
                              <td className="px-2 py-1">
                                <div className="font-extrabold text-slate-900">{item.name}</div>
                                {cleanItemDescription(item.description) && (
                                  <div className="text-[9px] text-slate-500 leading-tight">
                                    {cleanItemDescription(item.description)}
                                  </div>
                                )}
                              </td>
                              <td className="px-2 py-1 text-center font-bold">{item.qty} {item.unit || 'kW'}</td>
                              <td className="px-2 py-1 text-right font-mono text-slate-700">₹ {(item.baseRate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="px-2 py-1 text-right font-mono font-semibold text-slate-800">₹ {(item.taxableAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="px-2 py-1 text-right font-mono text-slate-600">
                                <div>₹ {(item.taxAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                <div className="text-[8.5px] text-slate-400">({item.taxRate}%)</div>
                              </td>
                              <td className="px-2 py-1 text-right font-mono font-extrabold text-slate-900">₹ {(item.totalAmt || 0).toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-[10px] text-slate-800">
                            <td colSpan={2} className="px-2 py-1 uppercase font-extrabold text-slate-900">Total Taxable Value & GST</td>
                            <td className="px-2 py-1 text-center font-extrabold">{quotation.line_items.reduce((s, it) => s + (Number(it.qty) || 0), 0)}</td>
                            <td className="px-2 py-1"></td>
                            <td className="px-2 py-1 text-right font-mono font-extrabold text-slate-900">₹ {computedTaxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="px-2 py-1 text-right font-mono font-extrabold text-teal-800">₹ {computedTaxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="px-2 py-1 text-right font-mono font-extrabold text-slate-900 text-xs">₹ {grossCost.toLocaleString('en-IN')}</td>
                          </tr>
                          <tr className="bg-slate-50 border-t border-slate-200 text-[9px] text-slate-600">
                            <td colSpan={7} className="px-2.5 py-1">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-slate-700">Tax Schedule Breakdown:</span>
                                <div className="flex gap-4 font-mono">
                                  {isInterstate ? (
                                    <span>IGST ({effectiveGstLabel}): <strong className="text-slate-900">₹ {igstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                                  ) : (
                                    <>
                                      <span>CGST ({effectiveHalfGstLabel}): <strong className="text-slate-900">₹ {cgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                                      <span>SGST ({effectiveHalfGstLabel}): <strong className="text-slate-900">₹ {sgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                                    </>
                                  )}
                                  <span>Total GST: <strong className="text-teal-800">₹ {computedTaxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* Financial Breakdown Table */}
                  <div className="border-2 border-slate-300 rounded-2xl overflow-hidden shadow-xs">
                    <div className="bg-slate-900 text-white p-3.5 text-xs font-extrabold uppercase tracking-wider flex justify-between">
                      <span>Project Cost & Subsidy Calculation</span>
                      <span className="text-amber-400 font-bold">{quotation.category} Package</span>
                    </div>
                    <div className="p-5 space-y-3.5 text-xs bg-white">
                      <div className="flex justify-between border-b pb-2 text-slate-700">
                        <span>Base Solar Project Cost (Taxable Value)</span>
                        <span className="font-semibold text-slate-800 text-xs font-mono">₹ {computedTaxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2 text-teal-800 font-semibold">
                        <div>
                          <span>Add: Applicable GST ({isInterstate ? `IGST @ ${effectiveGstLabel}` : `CGST @ ${effectiveHalfGstLabel} + SGST @ ${effectiveHalfGstLabel}`})</span>
                          <div className="text-[9.5px] text-slate-400 font-normal">Calculated as per statutory solar EPC norms (70% goods @ 5% + 30% services @ 18%)</div>
                        </div>
                        <span className="font-bold text-teal-900 text-xs font-mono">+ ₹ {computedTaxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2.5 text-slate-900 font-bold">
                        <span>Gross Price ({displayTotalCapacity} kWp Solar PV Power System)</span>
                        <span className="font-bold text-slate-900 text-base font-mono">₹ {grossCost.toLocaleString('en-IN')}</span>
                      </div>
                      {additionalCharges > 0 && (
                        <div className="flex justify-between border-b pb-2.5 text-teal-800 font-semibold">
                          <span>Add: {additionalChargesLabel}</span>
                          <span className="font-bold text-teal-900 text-base font-mono">+ ₹ {additionalCharges.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-b pb-2.5 text-emerald-700 font-semibold">
                        <div>
                          <span>Less: {subsidyText}</span>
                          <div className="text-[10px] text-slate-500 font-normal">{subsidyNote}</div>
                        </div>
                        <span className="font-extrabold text-base font-mono">- ₹ {subsidyAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between bg-teal-800 text-white p-4 rounded-2xl font-black text-lg shadow-md">
                        <span>NET OUTFLOW PAYABLE BY CUSTOMER</span>
                        <span className="text-amber-400 font-mono">₹ {netPayable.toLocaleString('en-IN')}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 italic pt-1">
                        *GST @ 5% on 70% goods + 18% on 30% services included. DISCOM official meter testing and application fees as actuals.
                      </p>
                    </div>
                  </div>

                  {/* PM Surya Ghar Direct Benefit Transfer SOP Card */}
                  <div className="border-2 border-emerald-300 rounded-2xl p-4 bg-emerald-50/70 text-xs space-y-2 shadow-xs">
                    <div className="font-extrabold text-emerald-950 uppercase tracking-wide flex items-center justify-between text-xs border-b pb-1.5 border-emerald-200">
                      <span>🏛️ Central Govt. PM Surya Ghar Subsidy Direct Benefit Transfer (DBT)</span>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 font-extrabold px-2.5 py-0.5 rounded-full">MNRE National Portal</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Subsidies are credited directly into the customer's bank account within 30 days of net meter commissioning via National Portal for Rooftop Solar (<code className="bg-emerald-100 px-1.5 py-0.5 rounded font-mono text-emerald-900">pmsuryaghar.gov.in</code>). Tejo Bharat handles complete documentation, load sanctioning, and commissioning reports.
                    </p>
                  </div>

                  {/* Bank Details */}
                  <div className="bg-slate-900 text-white rounded-2xl p-4 border-2 border-slate-700 shadow-md">
                    <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
                      🏦 Beneficiary Bank Details for Direct Transfer (NEFT / RTGS / IMPS)
                    </div>
                    <div className="grid grid-cols-2 gap-y-1.5 text-xs pt-1">
                      <div><span className="text-slate-400">Account Name:</span> <strong className="text-white">TEJO BHARAT GLOBAL ENERGY LLP</strong></div>
                      <div><span className="text-slate-400">Bank Name:</span> <strong className="text-white">Kotak Mahindra Bank</strong></div>
                      <div><span className="text-slate-400">Account No:</span> <strong className="text-amber-300 font-mono">9989279586</strong></div>
                      <div><span className="text-slate-400">IFSC Code:</span> <strong className="text-amber-300 font-mono">KKBK0000574</strong></div>
                      <div><span className="text-slate-400">Branch:</span> <strong className="text-slate-200">Sarpavaram</strong></div>
                      <div><span className="text-slate-400">UPI ID:</span> <strong className="text-teal-300 font-mono">9989279586@kotak</strong></div>
                    </div>
                  </div>

                  {/* Scope & Warranty Summary */}
                  <div className="border-2 border-teal-300 rounded-2xl p-4 bg-teal-50/50 text-xs space-y-2.5 shadow-xs">
                    <h4 className="font-extrabold text-teal-900 uppercase tracking-wider text-xs border-b pb-1 border-teal-200">🛡️ Warranty & EPC Service Commitment</h4>
                    <div className="grid grid-cols-4 gap-3 text-center pt-1 font-bold">
                      <div className="bg-white p-2.5 rounded-xl border border-teal-200">
                        <div className="text-slate-500 text-[10px]">Solar Panels</div>
                        <div className="text-teal-900 text-sm">25 Years</div>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-teal-200">
                        <div className="text-slate-500 text-[10px]">Solar Inverter</div>
                        <div className="text-teal-900 text-sm">7 - 10 Yrs</div>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-teal-200">
                        <div className="text-slate-500 text-[10px]">HDG Structure</div>
                        <div className="text-teal-900 text-sm">10 Years</div>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-teal-200">
                        <div className="text-slate-500 text-[10px]">AMC Service</div>
                        <div className="text-teal-900 text-sm">5 Years</div>
                      </div>
                    </div>
                  </div>

                  {/* Standard Terms & Conditions */}
                  <div className="border-2 border-slate-200 rounded-xl p-3.5 bg-slate-50/70 text-xs space-y-2 shadow-xs">
                    <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-xs border-b pb-1 border-slate-200">
                      ⚖️ Standard Commercial Terms & Conditions
                    </h4>
                    <ul className="space-y-1 text-[11px] text-slate-700 leading-relaxed">
                      <li>• <strong>Validity:</strong> Valid for 15 days. DISCOM approvals follow grid feasibility.</li>
                      <li>• <strong>Rooftop Access:</strong> Client will provide unhindered civil access and water supply.</li>
                      <li>• <strong>Force Majeure:</strong> Delays due to natural calamities or grid outages are beyond EPC control.</li>
                    </ul>
                  </div>

                  {/* Signature Block */}
                  <div className="grid grid-cols-2 gap-4 text-center items-end pt-2">
                    <div className="border-2 border-dashed border-slate-400 rounded-2xl p-4 pt-4 flex flex-col justify-between h-24 bg-slate-50/40">
                      <div className="border-t border-slate-400 pt-1.5 text-xs text-slate-600 font-bold">Customer Acceptance & Stamp</div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">{quotation.customer_name}</div>
                        <div className="text-[10px] text-slate-400">Signature & Date</div>
                      </div>
                    </div>

                    <div className="border-2 border-slate-300 bg-slate-50/90 rounded-2xl p-4 flex flex-col justify-between h-24 relative overflow-hidden text-center shadow-xs">
                      <div className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">
                        For Tejo Bharat Global Energy LLP
                      </div>
                      <div className="my-auto py-1 flex flex-col items-center justify-center">
                        <img src="/signature.png" alt="Authorized Signature" className="h-10 max-h-10 object-contain mx-auto my-0.5 mix-blend-multiply" onError={(e) => {(e.target as HTMLElement).style.display = 'none';}} />
                        <div className="font-serif italic font-extrabold text-teal-950 text-xs tracking-wide">
                          {companySignatoryTitle}
                        </div>
                      </div>

                      <div className="border-t border-slate-200 pt-1 text-[9px] text-slate-500 font-mono">
                        Ref: TBGE-{quotation.quotation_no} | {quotation.quotation_date}
                      </div>
                    </div>
                  </div>

                  {/* Company Address Footer */}
                  <div className="border-t-2 border-slate-200 pt-4 text-center text-xs text-slate-600 space-y-1 relative group">
                    {onOpenBranchModal && (
                      <button
                        type="button"
                        onClick={onOpenBranchModal}
                        className="no-print absolute right-0 -top-1 text-[10px] text-teal-700 hover:text-teal-900 font-bold bg-white hover:bg-teal-50 border border-teal-300 rounded px-2 py-0.5 transition-all shadow-xs flex items-center gap-1"
                        title="Edit Footer Information (Address, GSTIN, CIN, Phone, Email, Website)"
                      >
                        <Edit2 className="w-3 h-3 text-teal-600" />
                        <span>Edit Footer</span>
                      </button>
                    )}
                    <div className="font-black text-teal-900 text-sm">{companyName}</div>
                    <div>📍 {companyAddress}{activeBranch?.pincode ? ` - ${activeBranch.pincode}` : ''}</div>
                    <div>📞 {companyPhone} | ✉️ {companyEmail} | 🌐 {companyWebsite}</div>
                    <div className="text-[9px] text-slate-400 pt-0.5 font-mono">
                      GSTIN: {companyGstin} | {companyCin}{companyPan ? ` | PAN: ${companyPan}` : ''}
                    </div>
                  </div>

                </div>

                {showPageFooters && (
                  <div className="page-footer border-t border-slate-200 pt-1.5 flex justify-between items-center text-[9.5px] text-slate-400 mt-2">
                    <span>Tejo Bharat Global Energy LLP — Quick Summary</span>
                    <span className="font-bold text-slate-600">Page 2 of 2</span>
                  </div>
                )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* RIGHT PAYMENT HISTORY PANEL */}
        {showPaymentPanel && (
          <div className="w-80 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-xs font-sans space-y-4 no-print flex-shrink-0 self-start sticky top-20">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900">Payment History</h3>
              <button 
                onClick={() => setShowPaymentPanel(false)} 
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Invoice Amount</span>
                <span className="font-mono font-bold text-slate-900">₹ {totalAmt.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between text-slate-600 font-medium pb-3 border-b border-slate-100">
                <span>Initial Amount Received</span>
                <span className="font-mono text-slate-900">₹ 0</span>
              </div>

              <div className="min-h-[160px] max-h-[300px] overflow-y-auto space-y-2 py-1">
                {invoicePayments.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 italic">
                    No payment entries yet
                  </div>
                ) : (
                  invoicePayments.map((p) => (
                    <div key={p.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex justify-between items-center font-bold text-slate-900">
                        <span>{p.payment_mode}</span>
                        <span className="font-mono text-emerald-600 font-extrabold">+ ₹ {p.amount_received.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                        <span>{p.payment_date}</span>
                        <span>Ref #{p.payment_number}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex justify-between text-slate-600 font-bold">
                <span>Total Amount Received</span>
                <span className="font-mono text-slate-900 font-extrabold">₹ {receivedAmt.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-slate-100">
                <span>Balance Amount</span>
                <span className={`font-mono ${balanceAmt > 0 ? 'text-rose-600 font-black' : 'text-emerald-600 font-black'}`}>
                  ₹ {balanceAmt.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* SHARE ON WHATSAPP MODAL */}
      <ShareWhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        quotation={quotation}
        branch={branch}
        parties={parties}
      />

      {/* SECTION TEXT & CONTENT EDITOR MODAL */}
      {editingSectionId && (
        <div className="no-print fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-slate-900 border-2 border-amber-400/60 rounded-2xl max-w-2xl w-full text-slate-100 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-100 flex items-center gap-2">
                    <span>Edit Section Text & Content</span>
                    <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Page {sections.find(s => s.id === editingSectionId)?.page || 1}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {sections.find(s => s.id === editingSectionId)?.title}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingSectionId(null)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Close editor without saving"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Section Heading / Title */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Section Heading / Title
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. System Components & Bill of Materials (BOM)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-bold text-xs focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                />
              </div>

              {/* Subheading / Badge Text */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Subheading / Badge Text (Optional)
                </label>
                <input
                  type="text"
                  value={editForm.subtitle}
                  onChange={(e) => setEditForm(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="e.g. CEIG Standard Single Line Diagram / Residential Package"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                />
              </div>

              {/* Main Description / Explanatory Text */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Main Paragraph / Explanatory Text (Optional)
                </label>
                <textarea
                  rows={3}
                  value={editForm.text}
                  onChange={(e) => setEditForm(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="Enter custom introductory or descriptive paragraph for this section..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs leading-relaxed focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                />
              </div>

              {/* Bullet Points / Clauses / Matrix Cards */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300 font-bold">
                    Bullet Points / Clauses / Features (One per line)
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {editForm.bulletsText ? editForm.bulletsText.split('\n').filter(b => b.trim().length > 0).length : 0} items
                  </span>
                </div>
                <p className="text-[10px] text-amber-300/80 mb-1.5 leading-snug">
                  💡 For two-part cards (e.g., Warranty, Milestones, Safety, Why Choose Us), type in <code className="bg-slate-800 text-amber-300 px-1 py-0.5 rounded">Title: Description</code> format on each line.
                </p>
                <textarea
                  rows={5}
                  value={editForm.bulletsText}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bulletsText: e.target.value }))}
                  placeholder="Point 1: Detailed explanation...&#10;Point 2: Detailed explanation...&#10;Point 3: Detailed explanation..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs font-mono leading-relaxed focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                />
              </div>

              {/* Custom Footnote / Note */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Special Section Note / Footnote (Optional)
                </label>
                <input
                  type="text"
                  value={editForm.note}
                  onChange={(e) => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="e.g. Note: Feasibility is subject to DISCOM substation sanction and roof load audit."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Renders as an eye-catching highlighted note box at the bottom of this section.
                </p>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {editingSectionId.startsWith('custom_') ? (
                  <button
                    type="button"
                    onClick={() => {
                      deleteCustomSection(editingSectionId);
                      setEditingSectionId(null);
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-red-500/80 bg-red-950/40 text-red-300 hover:bg-red-900/60 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Permanently remove this custom section"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Custom Section</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => revertSectionToDefault(editingSectionId)}
                      className="px-2.5 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/20 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Remove all custom text and restore factory defaults for this section"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Revert to Factory Default</span>
                    </button>

                    <button
                      type="button"
                      onClick={resetCurrentSectionText}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Populate form with default template content"
                    >
                      <span>Fill Default Template</span>
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSectionId(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveSectionEdits}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Save & Apply Changes</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ADD CUSTOM SECTION MODAL */}
      {isAddSectionModalOpen && (
        <div className="no-print fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-slate-900 border-2 border-amber-400 rounded-2xl max-w-2xl w-full text-slate-100 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 border border-indigo-400/40 rounded-xl text-indigo-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-100 flex items-center gap-2">
                    <span>Add New Proposal Section / Clause</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Create a customized block for extra terms, site conditions, technical specifications, or annexures
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddSectionModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-bold mb-1">
                    Section Heading / Title <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSectionForm.title}
                    onChange={(e) => setNewSectionForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. DG Synchronization Terms / Rooftop Civil Scope"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-bold text-xs focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Target Page <span className="text-amber-400">*</span>
                  </label>
                  <select
                    value={newSectionForm.page}
                    onChange={(e) => setNewSectionForm(prev => ({ ...prev, page: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 font-extrabold text-xs focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none cursor-pointer"
                  >
                    {pageList.map(p => (
                      <option key={p} value={p}>Page {p}</option>
                    ))}
                    <option value={totalPages + 1}>+ New Page {totalPages + 1}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Subheading / Badge Text (Optional)
                </label>
                <input
                  type="text"
                  value={newSectionForm.subtitle}
                  onChange={(e) => setNewSectionForm(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="e.g. Mandatory Project Safety & Interlock Policy"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Introductory Paragraph / Text (Optional)
                </label>
                <textarea
                  rows={3}
                  value={newSectionForm.text}
                  onChange={(e) => setNewSectionForm(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="Enter custom explanatory paragraphs, technical descriptions, or statutory requirements..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs leading-relaxed focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300 font-bold">
                    Bullet Points / Clauses / Cards (One per line)
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {newSectionForm.bulletsText ? newSectionForm.bulletsText.split('\n').filter(b => b.trim().length > 0).length : 0} items
                  </span>
                </div>
                <p className="text-[10px] text-amber-300/80 mb-1 leading-snug">
                  💡 Type in <code className="bg-slate-800 text-amber-300 px-1 py-0.5 rounded">Key: Description</code> format to render as high-impact specification cards.
                </p>
                <textarea
                  rows={4}
                  value={newSectionForm.bulletsText}
                  onChange={(e) => setNewSectionForm(prev => ({ ...prev, bulletsText: e.target.value }))}
                  placeholder="DG Interlock: Bi-directional interlock relay installed at Main LT Panel.&#10;Roof Access: Free unobstructed rooftop access provided by customer during daylight hours."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs font-mono leading-relaxed focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Special Section Note / Footnote (Optional)
                </label>
                <input
                  type="text"
                  value={newSectionForm.note}
                  onChange={(e) => setNewSectionForm(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="e.g. Note: Grid synchronization requires DISCOM bi-directional approval certificate."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Renders as a highlighted note box at the bottom of this section.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddSectionModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveNewSection}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Add Section to Page {newSectionForm.page}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
