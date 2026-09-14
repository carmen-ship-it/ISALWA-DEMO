'use client';

import { useId, useMemo, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Button, SearchField } from '@isalwa/ui';
import {
  filterSearchableOptions,
  type SearchableOption,
} from '@/lib/experience/searchable-select';

export type { SearchableOption } from '@/lib/experience/searchable-select';

type SearchableSelectProps = {
  id: string;
  label: string;
  options: readonly SearchableOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  noMatchLabel?: string;
  clearLabel?: string;
  disabled?: boolean;
};

/**
 * Use SearchableSelect when the caller already holds more than about eight options.
 * It typeahead-filters only that list, supports ArrowUp, ArrowDown, Home, End, Enter, and Escape, shows an empty no-match state, and can clear the selected value.
 * It does not fetch, and it never adds an option that was not passed in.
 */
export function SearchableSelect({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = 'Buscar',
  noMatchLabel = 'Ningún resultado coincide',
  clearLabel = 'Quitar',
  disabled = false,
}: SearchableSelectProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const filtered = useMemo(() => filterSearchableOptions(options, query), [options, query]);
  const selected = options.find((option) => option.id === value) ?? null;
  const active = filtered[activeIndex];

  function closeList() {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  }

  function selectOption(option: SearchableOption | undefined) {
    if (!option || !options.includes(option)) return;
    onChange(option.id);
    closeList();
  }

  function clearSelection() {
    onChange(null);
    setQuery('');
    setActiveIndex(0);
    document.getElementById(id)?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(0);
        return;
      }
      setActiveIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(Math.max(filtered.length - 1, 0));
        return;
      }
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === 'Home' && open) {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === 'End' && open) {
      event.preventDefault();
      setActiveIndex(Math.max(filtered.length - 1, 0));
      return;
    }
    if (event.key === 'Enter' && open) {
      event.preventDefault();
      selectOption(filtered[activeIndex]);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeList();
    }
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="isalwa-section-label">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-2">
        {selected ? (
          <span className="shrink-0 text-[var(--isalwa-text-sm)] font-medium text-[var(--isalwa-kiln)]">
            {selected.label}
          </span>
        ) : null}
        <SearchField
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && active ? `${listId}-${active.id}` : undefined}
          disabled={disabled}
          placeholder={placeholder}
          value={query}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            window.setTimeout(() => closeList(), 120);
          }}
        />
        {value ? (
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={clearSelection}>
            {clearLabel}
          </Button>
        ) : null}
      </div>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)] py-1 shadow-[var(--isalwa-shadow-floating)]"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]" role="status">
              {noMatchLabel}
            </li>
          ) : (
            filtered.map((option, index) => {
              const isActive = index === activeIndex;
              return (
                <li
                  key={option.id}
                  id={`${listId}-${option.id}`}
                  role="option"
                  aria-selected={option.id === value}
                >
                  <button
                    type="button"
                    className={
                      isActive
                        ? 'block w-full px-3 py-2 text-left text-[var(--isalwa-text-sm)] text-[var(--isalwa-kiln)] outline-none bg-[var(--isalwa-porcelain)]'
                        : 'block w-full px-3 py-2 text-left text-[var(--isalwa-text-sm)] text-[var(--isalwa-kiln)] outline-none hover:bg-[var(--isalwa-porcelain)]'
                    }
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectOption(option)}
                  >
                    <span className="block">{option.label}</span>
                    {option.hint ? (
                      <span className="mt-0.5 block text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]">
                        {option.hint}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
