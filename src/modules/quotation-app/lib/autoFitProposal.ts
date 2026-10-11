import { ProposalSection, Quotation } from '../types/quotation';

export interface PageBudgetOptions {
  showPageFooters?: boolean;
  isSectionNoteVisible?: (id: string) => boolean;
  siteGroupsCount?: number;
}

export const PAGE_TOTAL_HEIGHT = 1065;
export const PAGE_PADDING_Y = 22; // pt-3 (12px) + pb-2.5 (10px)
export const PAGE_FOOTER_HEIGHT = 32;
export const PAGE_COMPACT_HEADER_HEIGHT = 54; // compact brand header on pages without header_exec
export const SECTION_GAP = 8; // space-y-2
export const SAFETY_BUFFER = 15; // safety margin for sub-pixel / zoom differences

/**
 * Computes available height on an A4 page
 */
export function getPageMaxBudget(hasHeaderExec: boolean, showFooters: boolean = true): number {
  let budget = PAGE_TOTAL_HEIGHT - PAGE_PADDING_Y - SAFETY_BUFFER;
  if (showFooters) {
    budget -= PAGE_FOOTER_HEIGHT;
  }
  if (!hasHeaderExec) {
    budget -= PAGE_COMPACT_HEADER_HEIGHT;
  }
  return budget;
}

/**
 * Calculates estimated height in pixels for a proposal section
 */
export function estimateSectionHeight(
  sec: ProposalSection,
  quotation: Quotation,
  isNoteVisible: boolean = false,
  siteGroupsCount: number = 0
): number {
  let baseHeight = 160;

  switch (sec.id) {
    case 'header_exec':
      baseHeight = 360;
      break;
    case 'seasonal_profile':
      baseHeight = 155;
      break;
    case 'env_impact':
      baseHeight = 145;
      break;
    case 'why_choose_us':
      baseHeight = 195;
      break;
    case 'bom_breakdown': {
      const lineItemCount = quotation.line_items?.length || 0;
      const extraItems = Math.max(0, lineItemCount - 2);
      const extraSites = Math.max(0, siteGroupsCount - 1);
      baseHeight = 230 + (extraItems * 20) + (extraSites * 60);
      break;
    }
    case 'electrical_diagram':
      baseHeight = 185;
      break;
    case 'standards_certs':
      baseHeight = 160;
      break;
    case 'hardware_safety':
      baseHeight = 165;
      break;
    case 'commercial_items': {
      const itemsCount = Math.max(1, quotation.line_items?.length || 1);
      baseHeight = 110 + (itemsCount * 36);
      break;
    }
    case 'cost_breakdown':
      baseHeight = 195;
      break;
    case 'tax_incentives':
      baseHeight = 145;
      break;
    case 'financial_forecast':
      baseHeight = 205;
      break;
    case 'cost_comparison':
      baseHeight = 165;
      break;
    case 'bank_details':
      baseHeight = 160;
      break;
    case 'scope_matrix': {
      const scopeCount = quotation.scope_items?.length || 8;
      baseHeight = 110 + (scopeCount * 18);
      break;
    }
    case 'execution_timeline':
      baseHeight = 175;
      break;
    case 'warranty_matrix':
      baseHeight = 220;
      break;
    case 'telemetry_sop':
      baseHeight = 180;
      break;
    case 'policy_summary':
      baseHeight = 175;
      break;
    case 'payment_milestones':
      baseHeight = 195;
      break;
    case 'terms_conditions': {
      const termsLength = (quotation.terms_and_conditions || '').length;
      baseHeight = 280 + Math.min(150, Math.floor(termsLength / 100) * 15);
      break;
    }
    case 'thank_you_signatures':
      baseHeight = 220;
      break;
    default: {
      // Custom user section
      const textLen = (sec.customText || '').length;
      const bulletsCount = sec.customBullets?.length || 0;
      baseHeight = 140 + Math.min(100, Math.floor(textLen / 80) * 18) + (bulletsCount * 22);
      break;
    }
  }

  // If section has a custom note and note is visible, add note callout height
  if (isNoteVisible && sec.customNote && sec.customNote.trim().length > 0) {
    baseHeight += 45;
  }

  return baseHeight;
}

/**
 * Gets section height from live DOM if available, otherwise falls back to estimated height
 */
export function getSectionHeight(
  sec: ProposalSection,
  quotation: Quotation,
  isNoteVisible: boolean = false,
  siteGroupsCount: number = 0
): number {
  if (typeof document !== 'undefined') {
    const el = document.getElementById(`proposal-sec-${sec.id}`);
    if (el && el.offsetHeight > 40) {
      return el.offsetHeight;
    }
  }
  return estimateSectionHeight(sec, quotation, isNoteVisible, siteGroupsCount);
}

/**
 * Inspects a specific page for overflow
 */
export function calculatePageOverflow(
  pageNum: number,
  sections: ProposalSection[],
  quotation: Quotation,
  options: PageBudgetOptions = {}
): {
  usedHeight: number;
  maxBudget: number;
  overflowPx: number;
  isOverflowing: boolean;
  percentageUsed: number;
  sectionsCount: number;
} {
  const pageSecs = sections.filter(s => s.page === pageNum && s.visible);
  const hasHeaderExec = pageSecs.some(s => s.id === 'header_exec');
  const showFooters = options.showPageFooters !== false;
  const maxBudget = getPageMaxBudget(hasHeaderExec, showFooters);

  if (pageSecs.length === 0) {
    return {
      usedHeight: 0,
      maxBudget,
      overflowPx: 0,
      isOverflowing: false,
      percentageUsed: 0,
      sectionsCount: 0
    };
  }

  let totalContentHeight = 0;
  pageSecs.forEach((sec, idx) => {
    const isNoteVis = options.isSectionNoteVisible ? options.isSectionNoteVisible(sec.id) : false;
    const h = getSectionHeight(sec, quotation, isNoteVis, options.siteGroupsCount || 0);
    totalContentHeight += h;
    if (idx > 0) {
      totalContentHeight += SECTION_GAP;
    }
  });

  const overflowPx = Math.max(0, Math.round(totalContentHeight - maxBudget));
  const percentageUsed = Math.min(200, Math.round((totalContentHeight / maxBudget) * 100));

  return {
    usedHeight: Math.round(totalContentHeight),
    maxBudget,
    overflowPx,
    isOverflowing: overflowPx > 0,
    percentageUsed,
    sectionsCount: pageSecs.length
  };
}

export interface AutoFitResult {
  updatedSections: ProposalSection[];
  totalPagesNeeded: number;
  overflowCountBefore: number;
  overflowCountAfter: number;
  pagesExpanded: boolean;
}

/**
 * Intelligently distributes proposal sections across pages so that NO page overflows.
 * Keeps thematic order intact and ensures at least 5 standard pages are maintained.
 */
export function autoFitSections(
  sections: ProposalSection[],
  quotation: Quotation,
  options: PageBudgetOptions = {}
): AutoFitResult {
  const showFooters = options.showPageFooters !== false;

  // Preserve non-visible sections
  const hiddenSections = sections.filter(s => !s.visible);
  const visibleSections = sections.filter(s => s.visible);

  // Measure overflow before
  let overflowCountBefore = 0;
  const initialPages = Array.from(new Set(sections.map(s => s.page || 1)));
  initialPages.forEach(p => {
    const info = calculatePageOverflow(p, sections, quotation, options);
    if (info.isOverflowing) overflowCountBefore++;
  });

  // Sort visible sections:
  // We sort by current page, but ensure each section's target starting floor is its defaultPage or 1
  const sortedVisible = [...visibleSections].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    const idxA = sections.findIndex(s => s.id === a.id);
    const idxB = sections.findIndex(s => s.id === b.id);
    return idxA - idxB;
  });

  let currentPage = 1;
  let currentPageHeight = 0;
  const distributedSections: ProposalSection[] = [];

  for (let i = 0; i < sortedVisible.length; i++) {
    const sec = sortedVisible[i];
    const isNoteVis = options.isSectionNoteVisible ? options.isSectionNoteVisible(sec.id) : false;
    const secHeight = getSectionHeight(sec, quotation, isNoteVis, options.siteGroupsCount || 0);

    // Ensure section starts on at least its target natural page (e.g. Page 2 for BOM, Page 3 for Commercials)
    const targetMinPage = sec.defaultPage || 1;
    if (currentPage < targetMinPage) {
      currentPage = targetMinPage;
      currentPageHeight = 0;
    }

    const hasHeaderExecOnThisPage = (currentPage === 1 && (sec.id === 'header_exec' || distributedSections.some(s => s.page === 1 && s.id === 'header_exec')));
    const pageBudget = getPageMaxBudget(hasHeaderExecOnThisPage, showFooters);
    const isFirstOnPage = currentPageHeight === 0;

    const projectedHeight = isFirstOnPage ? secHeight : currentPageHeight + SECTION_GAP + secHeight;

    if (isFirstOnPage || projectedHeight <= pageBudget) {
      distributedSections.push({
        ...sec,
        page: currentPage
      });
      currentPageHeight = projectedHeight;
    } else {
      // Advance to next page
      currentPage++;
      currentPageHeight = secHeight;
      distributedSections.push({
        ...sec,
        page: currentPage
      });
    }
  }

  // Tejo Bharat standard proposals maintain at least 5 pages
  const maxAssignedPage = distributedSections.reduce((max, s) => Math.max(max, s.page), 1);
  const totalPagesNeeded = Math.max(5, maxAssignedPage);

  const allUpdated = [
    ...distributedSections,
    ...hiddenSections
  ];

  // Measure overflow after
  let overflowCountAfter = 0;
  for (let p = 1; p <= totalPagesNeeded; p++) {
    const info = calculatePageOverflow(p, allUpdated, quotation, options);
    if (info.isOverflowing) overflowCountAfter++;
  }

  return {
    updatedSections: allUpdated,
    totalPagesNeeded,
    overflowCountBefore,
    overflowCountAfter,
    pagesExpanded: totalPagesNeeded > 5
  };
}
