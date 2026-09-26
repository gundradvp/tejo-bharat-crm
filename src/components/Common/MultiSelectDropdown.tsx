import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  optionLabels?: Record<string, string>;
  disabled?: boolean;
}

export default function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  optionLabels,
  disabled,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const filtered = options.filter((opt) =>
    (optionLabels?.[opt] || opt).toLowerCase().includes(search.toLowerCase())
  );

  const displayLabel =
    selected.length === 0
      ? `All ${label}s`
      : selected.length === 1
        ? optionLabels?.[selected[0]] || selected[0]
        : `${selected.length} ${label}s selected`;

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          selected.length > 0
            ? 'border-blue-300 bg-blue-50 text-blue-700'
            : 'border-gray-300 text-gray-700'
        } ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50'}`}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-64 overflow-hidden flex flex-col">
          {options.length > 10 && (
            <div className="p-2 border-b border-gray-100 relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-2 pr-7 py-1.5 text-sm rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 text-xs">
            <button
              onClick={() => onChange(options)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Select All
            </button>
            <button
              onClick={() => onChange([])}
              className="text-gray-500 hover:text-gray-700 font-medium"
            >
              Clear
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">No options found</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  onClick={() => toggle(opt)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    selected.includes(opt) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                  }`}>
                    {selected.includes(opt) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="truncate">{optionLabels?.[opt] || opt}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {selected.length > 0 && !disabled && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.slice(0, 3).map((val) => (
            <span
              key={val}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded"
            >
              <span className="truncate max-w-24">{optionLabels?.[val] || val}</span>
              <button onClick={() => toggle(val)} className="hover:text-blue-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {selected.length > 3 && (
            <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
              +{selected.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
