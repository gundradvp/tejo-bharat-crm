import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number; // 1-indexed (1 to totalPages)
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  theme?: 'blue' | 'amber';
  className?: string;
  showTotalCount?: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  theme = 'blue',
  className = '',
  showTotalCount = false,
}: PaginationProps) {
  const [jumpValue, setJumpValue] = useState<string>(String(currentPage));

  useEffect(() => {
    setJumpValue(String(currentPage));
  }, [currentPage]);

  if (totalPages <= 1 && !totalItems) {
    return null;
  }

  const handleJump = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = parseInt(jumpValue.trim(), 10);
    if (isNaN(parsed)) {
      setJumpValue(String(currentPage));
      return;
    }
    const target = Math.max(1, Math.min(totalPages, parsed));
    setJumpValue(String(target));
    if (target !== currentPage) {
      onPageChange(target);
    }
  };

  const isFirst = currentPage <= 1;
  const isLast = currentPage >= totalPages;

  const btnFocusClass = theme === 'amber'
    ? 'hover:bg-amber-50 focus:ring-amber-500 hover:text-amber-700'
    : 'hover:bg-blue-50 focus:ring-blue-500 hover:text-blue-700';

  const goBtnClass = theme === 'amber'
    ? 'bg-amber-600 hover:bg-amber-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  const inputFocusClass = theme === 'amber'
    ? 'focus:ring-amber-500 focus:border-amber-500'
    : 'focus:ring-blue-500 focus:border-blue-500';

  // Calculate item range if totalItems and pageSize are provided
  let itemRangeText: string | null = null;
  if (showTotalCount && totalItems !== undefined && totalItems > 0 && pageSize) {
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalItems);
    itemRangeText = `Showing ${start.toLocaleString('en-IN')}–${end.toLocaleString('en-IN')} of ${totalItems.toLocaleString('en-IN')}`;
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 pb-1 ${className}`}>
      {itemRangeText && (
        <p className="text-xs sm:text-sm text-gray-500 font-medium">
          {itemRangeText}
        </p>
      )}

      {totalPages > 1 && (
        <div className={`flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 ${!itemRangeText ? 'w-full' : ''}`}>
          {/* First Page */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={isFirst}
            title="First page (1)"
            aria-label="First page"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs sm:text-sm font-medium text-gray-700 bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm ${btnFocusClass}`}
          >
            <ChevronsLeft className="w-4 h-4" />
            <span className="hidden sm:inline">First</span>
          </button>

          {/* Previous Page */}
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={isFirst}
            title="Previous page"
            aria-label="Previous page"
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg border border-gray-300 text-xs sm:text-sm font-medium text-gray-700 bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm ${btnFocusClass}`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Prev</span>
          </button>

          {/* Jump to Page Input / Status */}
          <form
            onSubmit={handleJump}
            className="flex items-center gap-1 sm:gap-1.5 px-1.5 py-0.5 rounded-lg bg-gray-50 border border-gray-200 text-xs sm:text-sm text-gray-600 shadow-sm"
          >
            <span className="hidden xs:inline text-gray-500">Page</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              onBlur={() => handleJump()}
              className={`w-12 sm:w-16 px-1.5 py-1 text-center font-bold text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 text-xs sm:text-sm ${inputFocusClass}`}
              title="Enter page number and click Go or press Enter"
            />
            <span className="text-gray-500">of <strong className="font-semibold text-gray-800">{totalPages.toLocaleString('en-IN')}</strong></span>
            <button
              type="submit"
              title="Jump to page"
              className={`px-2 py-1 text-xs font-semibold rounded-md shadow-sm transition-colors cursor-pointer ${goBtnClass}`}
            >
              Go
            </button>
          </form>

          {/* Next Page */}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={isLast}
            title="Next page"
            aria-label="Next page"
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg border border-gray-300 text-xs sm:text-sm font-medium text-gray-700 bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm ${btnFocusClass}`}
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Last Page */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={isLast}
            title={`Last page (${totalPages})`}
            aria-label="Last page"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs sm:text-sm font-medium text-gray-700 bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm ${btnFocusClass}`}
          >
            <span className="hidden sm:inline">Last</span>
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
