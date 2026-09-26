import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Search, Hash, Plus, Sparkles } from 'lucide-react';
import { ALL_AREA_CODES, KAKINADA_DIVISIONS, findVillagesForCode } from '../../lib/areaCodeCatalog';

interface AreaCodeFilterProps {
  label?: string;
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
}

export default function AreaCodeFilter({
  label = 'Area',
  selected,
  onChange,
  disabled,
}: AreaCodeFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<string>('ALL');
  const [alignRight, setAlignRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.right + 220 > window.innerWidth) {
        setAlignRight(true);
      } else {
        setAlignRight(false);
      }
    }
  }, [open]);

  const toggle = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    if (selected.includes(clean)) {
      onChange(selected.filter((c) => c !== clean));
    } else {
      onChange([...selected, clean]);
    }
  };

  // Filter the catalog by division and search text
  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ALL_AREA_CODES.filter((item) => {
      if (divisionFilter !== 'ALL') {
        const itemDiv = (item.division || '').toUpperCase();
        const locUpper = item.loc.toUpperCase();
        if (itemDiv !== divisionFilter && !locUpper.includes(divisionFilter)) {
          return false;
        }
      }
      if (!q) return true;
      return (
        item.code.toLowerCase().includes(q) ||
        item.loc.toLowerCase().includes(q) ||
        (item.village && item.village.toLowerCase().includes(q)) ||
        (item.section && item.section.toLowerCase().includes(q))
      );
    }).slice(0, 100);
  }, [search, divisionFilter]);

  // Is search input a 3 to 6 char code or string not yet in selection?
  const isCustomCode =
    search.trim().length >= 3 &&
    search.trim().length <= 6 &&
    !selected.includes(search.trim().toUpperCase());

  const displayLabel =
    selected.length === 0
      ? `All ${label}s`
      : selected.length === 1
      ? `Area ${selected[0]}`
      : `${selected.length} ${label}s selected`;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-gray-600 flex items-center gap-1">
          <Hash className="w-3.5 h-3.5 text-purple-600" />
          {label}
        </label>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[11px] text-red-600 hover:text-red-700 font-medium"
          >
            Clear ({selected.length})
          </button>
        )}
      </div>

      {/* Main trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
          selected.length > 0
            ? 'border-purple-300 bg-purple-50 text-purple-800 font-medium'
            : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
        } ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
      >
        <span className="truncate flex items-center gap-1.5">
          <span className={selected.length > 0 ? 'font-mono font-medium' : ''}>{displayLabel}</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 ml-2 transition-transform text-gray-400 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className={`absolute z-50 mt-1 w-[340px] sm:w-[420px] max-w-[calc(100vw-2rem)] ${
          alignRight ? 'right-0' : 'left-0'
        } bg-white rounded-xl border border-gray-200 shadow-xl max-h-96 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100`}>
          {/* Header inside dropdown */}
          <div className="px-3 py-2 border-b border-gray-100 bg-purple-50/60 flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-950 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-purple-600" />
              Kakinada Circle Area / Service Codes
            </span>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] text-red-600 hover:text-red-700 font-medium"
              >
                Clear all ({selected.length})
              </button>
            )}
          </div>
          {/* Search bar & custom input */}
          <div className="p-2.5 border-b border-gray-100 bg-gray-50 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && search.trim()) {
                    e.preventDefault();
                    toggle(search.trim());
                    setSearch('');
                  }
                }}
                placeholder="Search 4-digit code (0105) or village (Borampalem)..."
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Division filter tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px]">
              <span className="text-[10px] uppercase font-bold text-gray-400 mr-1 flex-shrink-0">Division:</span>
              {KAKINADA_DIVISIONS.map((div) => {
                const isActive = divisionFilter === div;
                return (
                  <button
                    key={div}
                    type="button"
                    onClick={() => setDivisionFilter(div)}
                    className={`px-2 py-0.5 rounded-md border text-[11px] font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-purple-600 text-white border-purple-600 font-semibold'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    {div === 'ALL' ? 'All' : div}
                  </button>
                );
              })}
            </div>

            {/* Quick Add Custom 4-digit code if not in list */}
            {isCustomCode && (
              <button
                type="button"
                onClick={() => {
                  toggle(search.trim());
                  setSearch('');
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1 px-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add & Filter "{search.trim().toUpperCase()}"
              </button>
            )}
          </div>

          {/* Quick Select Popular Pithapuram / Gollaprolu Codes */}
          <div className="px-3 py-1.5 border-b border-gray-100 bg-purple-50/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-purple-900 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-600" />
                Quick Select Pithapuram / Gollaprolu:
              </span>
              {filteredCatalog.length > 0 && search.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    const codesToAdd = filteredCatalog.map((item) => item.code);
                    const combined = Array.from(new Set([...selected, ...codesToAdd]));
                    onChange(combined);
                  }}
                  className="text-[10px] text-purple-700 hover:text-purple-900 font-semibold underline"
                >
                  Select all ({filteredCatalog.length}) matching
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {['0714', '0711', '0501', '0801', '0701', '0601', '3303', '3306'].map((code) => {
                const isSel = selected.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggle(code)}
                    className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                      isSel
                        ? 'bg-purple-600 text-white border-purple-600 font-bold'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    {code}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Catalog list */}
          <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
            {filteredCatalog.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-500">
                <p>No matching area codes found for "{search}".</p>
                {search.trim().length >= 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      toggle(search.trim());
                      setSearch('');
                    }}
                    className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded text-xs font-medium"
                  >
                    <Plus className="w-3 h-3" /> Filter by "{search.trim().toUpperCase()}"
                  </button>
                )}
              </div>
            ) : (
              filteredCatalog.map((item) => {
                const isSel = selected.includes(item.code);
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => toggle(item.code)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                      isSel ? 'bg-purple-50 hover:bg-purple-100/70' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          isSel ? 'bg-purple-600 border-purple-600' : 'border-gray-300 bg-white'
                        }`}
                      >
                        {isSel && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="font-mono font-bold text-gray-900 flex-shrink-0">{item.code}</span>
                      <span className="text-gray-600 truncate">{item.loc}</span>
                    </div>
                    {item.division && (
                      <span className="text-[10px] font-medium text-gray-400 ml-2 flex-shrink-0 bg-gray-100 px-1.5 py-0.5 rounded">
                        {item.division}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer actions */}
          <div className="p-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs">
            <span className="text-gray-500">
              {selected.length} code{selected.length === 1 ? '' : 's'} selected
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Selected tags under the input */}
      {selected.length > 0 && !disabled && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.slice(0, 2).map((code) => {
            const villages = findVillagesForCode(code);
            const tooltip = villages.length > 0 ? villages.join(', ') : `Area Code: ${code}`;
            return (
              <span
                key={code}
                title={tooltip}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono font-semibold bg-purple-100 text-purple-800 rounded border border-purple-200"
              >
                <span>{code}</span>
                <button
                  type="button"
                  onClick={() => toggle(code)}
                  className="hover:text-purple-950 p-0.5"
                  title="Remove"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
          {selected.length > 2 && (
            <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
              +{selected.length - 2} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
