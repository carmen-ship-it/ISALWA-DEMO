'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { filterTypeaheadOptions, type TypeaheadOption } from '@/lib/operating/typeahead';

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

type MemberTypeaheadProps = {
  id: string;
  name: string;
  options: TypeaheadOption[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
};

const SELECTION_MESSAGE = 'Seleccione un miembro de la lista.';

export function MemberTypeahead({
  id,
  name,
  options,
  required = false,
  placeholder = 'Buscar un miembro',
  defaultValue = '',
}: MemberTypeaheadProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const committedId = useRef(defaultValue);
  const initial = options.find((option) => option.value === defaultValue);

  const [query, setQuery] = useState(initial?.label ?? '');
  const [selectedId, setSelectedId] = useState(initial?.value ?? '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const selected = options.find((option) => option.value === selectedId) ?? null;
  const filtering = selected ? query !== selected.label : query.trim().length > 0;
  const filtered = useMemo(
    () => filterTypeaheadOptions(options, filtering ? query : ''),
    [options, filtering, query],
  );
  const listOpen = open && filtered.length > 0;
  const activeIndex = filtered.length === 0 ? -1 : Math.min(active, filtered.length - 1);

  useEffect(() => {
    const input = inputRef.current;
    if (!input || !required) return;
    input.setCustomValidity(selectedId ? '' : SELECTION_MESSAGE);
  }, [required, selectedId]);

  useEffect(() => {
    if (!listOpen) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [listOpen]);

  function commit(option: TypeaheadOption) {
    committedId.current = option.value;
    setSelectedId(option.value);
    setQuery(option.label);
    setOpen(false);
    inputRef.current?.setCustomValidity('');
  }

  function restoreCommitted() {
    const option = options.find((item) => item.value === committedId.current);
    setSelectedId(option?.value ?? '');
    setQuery(option?.label ?? '');
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (filtered.length === 0) return;
      setOpen(true);
      setActive((index) => (listOpen ? Math.min(filtered.length - 1, index + 1) : 0));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (filtered.length === 0) return;
      setOpen(true);
      setActive((index) => (listOpen ? Math.max(0, index - 1) : filtered.length - 1));
      return;
    }
    if (event.key === 'Home' && listOpen) {
      event.preventDefault();
      setActive(0);
      return;
    }
    if (event.key === 'End' && listOpen) {
      event.preventDefault();
      setActive(filtered.length - 1);
      return;
    }
    if (event.key === 'Escape') {
      if (!open) return;
      event.preventDefault();
      restoreCommitted();
      return;
    }
    if (event.key === 'Enter' && listOpen && filtered[activeIndex]) {
      event.preventDefault();
      commit(filtered[activeIndex]);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={selectedId} />
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        required={required}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={listOpen}
        aria-controls={listOpen ? listId : undefined}
        aria-activedescendant={listOpen && activeIndex >= 0 ? optionDomId(listId, activeIndex) : undefined}
        value={query}
        placeholder={placeholder}
        className={fieldClass}
        onChange={(event) => {
          setQuery(event.target.value);
          setSelectedId('');
          setOpen(true);
          setActive(0);
          if (required) event.target.setCustomValidity(SELECTION_MESSAGE);
        }}
        onBlur={() => {
          if (!query.trim()) {
            committedId.current = '';
            setSelectedId('');
            setOpen(false);
            return;
          }
          restoreCommitted();
        }}
        onKeyDown={onKeyDown}
      />
      {listOpen ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Miembros"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white py-1 shadow-[var(--isalwa-shadow-soft)]"
        >
          {filtered.map((option, index) => {
            const highlighted = index === activeIndex;
            return (
              <li key={option.value} role="presentation">
                <div
                  id={optionDomId(listId, index)}
                  role="option"
                  aria-selected={highlighted}
                  className={`cursor-pointer px-3 py-2 text-sm text-[var(--isalwa-kiln)] ${
                    highlighted ? 'bg-[var(--isalwa-mist)]' : ''
                  }`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    commit(option);
                  }}
                  onMouseEnter={() => setActive(index)}
                >
                  {option.label}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function optionDomId(listId: string, index: number): string {
  return `${listId}-option-${index}`;
}
