'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { searchActiveMembersAction } from '@/lib/workforce/member-search';
import type { TypeaheadOption } from '@/lib/operating/typeahead';

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

const DEBOUNCE_MS = 220;
const MIN_QUERY = 2;
const SELECTION_MESSAGE = 'Seleccione un miembro de la lista.';

export type ServerMemberTypeaheadProps = {
  id: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  /** Optional initial selection (label must be a display name, never a raw id as primary text). */
  defaultMemberId?: string;
  defaultLabel?: string;
  excludeMemberId?: string;
  /** people.admin directory search (includes email match server-side). Default: active member_active search. */
  mode?: 'active' | 'admin';
};

type Status = 'idle' | 'loading' | 'ready' | 'empty' | 'denied' | 'unavailable';

/**
 * Server-side searchable member picker.
 * Tenant-scoped search before limit. No fetch-all dropdown. No raw IDs as labels.
 */
export function ServerMemberTypeahead({
  id,
  name,
  required = false,
  placeholder = 'Buscar por nombre (mín. 2 letras)',
  defaultMemberId = '',
  defaultLabel = '',
  excludeMemberId,
  mode = 'active',
}: ServerMemberTypeaheadProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const committedId = useRef(defaultMemberId);
  const committedLabel = useRef(defaultLabel);
  const requestSeq = useRef(0);

  const [query, setQuery] = useState(defaultLabel);
  const [selectedId, setSelectedId] = useState(defaultMemberId);
  const [options, setOptions] = useState<TypeaheadOption[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const listOpen =
    open &&
    (status === 'loading' ||
      status === 'ready' ||
      status === 'empty' ||
      status === 'denied' ||
      status === 'unavailable');
  const activeIndex = options.length === 0 ? -1 : Math.min(active, options.length - 1);

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

  useEffect(() => {
    const q = query.trim();
    const selected = selectedId && query === committedLabel.current;
    if (selected || q.length < MIN_QUERY) {
      setOptions([]);
      setStatus(q.length > 0 && q.length < MIN_QUERY ? 'idle' : selectedId ? 'idle' : 'idle');
      return;
    }

    setStatus('loading');
    const seq = ++requestSeq.current;
    const timer = window.setTimeout(() => {
      void searchActiveMembersAction({ q, excludeMemberId, mode }).then((result) => {
        if (seq !== requestSeq.current) return;
        if (!result.ok) {
          if (result.reason === 'denied') {
            setOptions([]);
            setStatus('denied');
            return;
          }
          setOptions([]);
          setStatus('unavailable');
          return;
        }
        setOptions(result.items);
        setStatus(result.items.length === 0 ? 'empty' : 'ready');
        setActive(0);
      });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query, selectedId, excludeMemberId, mode]);

  function commit(option: TypeaheadOption) {
    committedId.current = option.value;
    committedLabel.current = option.label;
    setSelectedId(option.value);
    setQuery(option.label);
    setOpen(false);
    setOptions([]);
    setStatus('idle');
    inputRef.current?.setCustomValidity('');
  }

  function restoreCommitted() {
    setSelectedId(committedId.current);
    setQuery(committedLabel.current);
    setOpen(false);
    setOptions([]);
    setStatus('idle');
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (options.length === 0) return;
      setOpen(true);
      setActive((index) => (listOpen ? Math.min(options.length - 1, index + 1) : 0));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (options.length === 0) return;
      setOpen(true);
      setActive((index) => (listOpen ? Math.max(0, index - 1) : options.length - 1));
      return;
    }
    if (event.key === 'Home' && listOpen) {
      event.preventDefault();
      setActive(0);
      return;
    }
    if (event.key === 'End' && listOpen) {
      event.preventDefault();
      setActive(options.length - 1);
      return;
    }
    if (event.key === 'Escape') {
      if (!open) return;
      event.preventDefault();
      restoreCommitted();
      inputRef.current?.focus();
      return;
    }
    if (event.key === 'Enter' && listOpen && options[activeIndex]) {
      event.preventDefault();
      commit(options[activeIndex]);
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
            committedLabel.current = '';
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
          {status === 'loading' ? (
            <li className="px-3 py-2 text-sm text-[var(--isalwa-slate)]" role="status">
              Buscando…
            </li>
          ) : null}
          {status === 'denied' ? (
            <li className="px-3 py-2 text-sm text-[var(--isalwa-slate)]" role="status">
              Sin permiso para buscar miembros.
            </li>
          ) : null}
          {status === 'unavailable' ? (
            <li className="px-3 py-2 text-sm text-[var(--isalwa-slate)]" role="status">
              No se pudo buscar ahora.
            </li>
          ) : null}
          {status === 'empty' ? (
            <li className="px-3 py-2 text-sm text-[var(--isalwa-slate)]" role="status">
              Ningún miembro coincide.
            </li>
          ) : null}
          {status === 'ready'
            ? options.map((option, index) => {
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
              })
            : null}
        </ul>
      ) : null}
    </div>
  );
}

function optionDomId(listId: string, index: number): string {
  return `${listId}-option-${index}`;
}
