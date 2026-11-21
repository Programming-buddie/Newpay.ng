import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  secondary?: string;
}

interface SearchableSelectProps {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  searchPlaceholder?: string;
  error?: string | null;
  required?: boolean;
  disabled?: boolean;
}

export function Select({
  label,
  options,
  value,
  onChange,
  onBlur,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  error,
  required,
  disabled = false,
}: SearchableSelectProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) ?? null,
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.secondary && opt.secondary.toLowerCase().includes(q))
    );
  }, [options, query]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isOpen) {
          setIsOpen(false);
          onBlur?.();
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onBlur]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 20);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      setIsOpen(false);
      onBlur?.();
    }
  };

  return (
    <div className="space-y-1.5 relative" ref={containerRef} onKeyDown={handleKeyDown}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {required && <span className="ml-0.5 text-debit" aria-hidden="true">*</span>}
      </label>

      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onClick={() => setIsOpen((open) => !open)}
        className={[
          'w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-surface border text-left text-sm flex items-center justify-between gap-2 transition-colors duration-150 cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/20 focus-visible:border-brand-600',
          'disabled:opacity-55 disabled:cursor-not-allowed',
          error ? 'border-debit' : 'border-line hover:border-muted/60',
        ].join(' ')}
      >
        <span className={selectedOption ? 'text-ink truncate' : 'text-muted/70 truncate'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute z-40 left-0 right-0 mt-1 bg-surface border border-line rounded-xl shadow-lg overflow-hidden"
        >
          <div className="p-2 border-b border-line bg-canvas/50 flex items-center gap-2">
            <Search className="w-4 h-4 text-muted shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={`Search ${label.toLowerCase()}`}
              className="w-full py-1.5 text-sm bg-transparent text-ink placeholder:text-muted/70 focus:outline-none"
            />
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3.5 py-4 text-xs text-muted text-center">
                No matching options found.
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      onBlur?.();
                    }}
                    className={[
                      'w-full px-3.5 py-2.5 text-left text-sm flex items-center justify-between gap-2 transition-colors cursor-pointer',
                      isSelected
                        ? 'bg-brand-50 text-brand-800 font-medium'
                        : 'text-ink hover:bg-subtle',
                    ].join(' ')}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-brand-700 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-debit">
          {error}
        </p>
      )}
    </div>
  );
}
