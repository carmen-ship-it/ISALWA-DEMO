'use client';

import { useEffect, useId, useMemo, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Button, SearchField } from '@isalwa/ui';
import { WorkState } from '@/components/experience/work-state';
import {
  SEARCHABLE_SELECT_COPY,
  SEARCHABLE_SELECT_VISIBLE_LIMIT,
  canSelectSearchableOption,
  filterSearchableOptions,
  nextSearchableIndex,
  resolveFieldAccess,
  searchableSelectMode,
  windowSearchableOptions,
  type SearchableOption,
} from '@/lib/experience/searchable-select';
import { fieldAccessReason, type FieldAccess } from '@/lib/experience/work-state';

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
  /** Permission wins over a plain disable. The reason is always visible, not hover-only. */
  access?: FieldAccess;
  disabledReason?: string;
};

/**
 * Typeahead over a caller-supplied list. Use it when the caller already holds more than about eight options.
 * A blank query on a long list asks the operator to type. It never renders an unbounded dropdown, never requests data, and never adds an option that was not passed in.
 * Callers must pass a bounded list for the current tenant. This component does not load another tenant's options.
 * ArrowUp, ArrowDown, Home, End, Enter, and Escape apply while the list is open. Escape closes and returns focus to the field.
 */
export function SearchableSelect({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = SEARCHABLE_SELECT_COPY.placeholder,
  noMatchLabel = SEARCHABLE_SELECT_COPY.noResults,
  clearLabel = SEARCHABLE_SELECT_COPY.clear,
  disabled = false,
  access = 'enabled',
  disabledReason,
}: SearchableSelectProps) {
  const listId = useId();
  const labelId = `${id}-label`;
  const lockId = `${id}-lock`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const resolvedAccess = resolveFieldAccess(disabled, access);
  const locked = resolvedAccess !== 'enabled';
  const lockCopy = fieldAccessReason(resolvedAccess, disabledReason, {
    disabled: SEARCHABLE_SELECT_COPY.disabled,
    permission: SEARCHABLE_SELECT_COPY.permission,
  });
  const filtered = useMemo(() => filterSearchableOptions(options, query), [options, query]);
  const mode = searchableSelectMode({
    optionCount: options.length,
    query,
    matchCount: filtered.length,
    access: resolvedAccess,
  });
  const windowed = useMemo(
    () => windowSearchableOptions(mode === 'results' ? filtered : [], SEARCHABLE_SELECT_VISIBLE_LIMIT),
    [filtered, mode],
  );
  const boundedIndex =
    windowed.visible.length === 0 ? 0 : Math.min(activeIndex, windowed.visible.length - 1);
  const active = windowed.visible[boundedIndex];
  const selected = options.find((option) => option.id === value) ?? null;
  const popupOpen = open && !locked && mode !== 'empty';

  function returnFocus() {
    const node = document.getElementById(id);
    if (node instanceof HTMLElement) node.focus();
  }

  function closeList() {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  }

  function selectOption(option: SearchableOption | undefined) {
    if (!option || !options.includes(option) || !canSelectSearchableOption(option)) return;
    onChange(option.id);
    closeList();
    returnFocus();
  }

  function clearSelection() {
    if (locked) return;
    onChange(null);
    setQuery('');
    setActiveIndex(0);
    returnFocus();
  }

  function requestOpen() {
    if (locked || options.length === 0) return;
    setOpen(true);
  }

  function moveActive(key: 'ArrowDown' | 'ArrowUp' | 'Home' | 'End') {
    if (mode !== 'results') return;
    setActiveIndex((index) => nextSearchableIndex(index, windowed.visible.length, key));
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!popupOpen) {
        requestOpen();
        setActiveIndex(0);
        return;
      }
      moveActive('ArrowDown');
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!popupOpen) {
        requestOpen();
        setActiveIndex(Math.max(windowed.visible.length - 1, 0));
        return;
      }
      moveActive('ArrowUp');
      return;
    }
    if (event.key === 'Home' && popupOpen) {
      event.preventDefault();
      moveActive('Home');
      return;
    }
    if (event.key === 'End' && popupOpen) {
      event.preventDefault();
      moveActive('End');
      return;
    }
    if (event.key === 'Enter' && popupOpen) {
      event.preventDefault();
      selectOption(windowed.visible[boundedIndex]);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeList();
      returnFocus();
      return;
    }
    if (event.key === 'Tab') closeList();
  }

  useEffect(() => {
    if (!popupOpen || !active) return;
    document.getElementById(`${listId}-${active.id}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, listId, popupOpen]);

  return (
    <div className="relative">
      <label id={labelId} htmlFor={id} className="isalwa-section-label">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-2">
        <SearchField
          id={id}
          role="combobox"
          aria-expanded={popupOpen}
          aria-controls={popupOpen ? listId : undefined}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-labelledby={labelId}
          aria-describedby={lockCopy ? lockId : undefined}
          aria-activedescendant={popupOpen && active ? `${listId}-${active.id}` : undefined}
          aria-disabled={locked}
          disabled={locked}
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            if (locked) return;
            setQuery(event.target.value);
            setActiveIndex(0);
            requestOpen();
          }}
          onFocus={() => requestOpen()}
          onKeyDown={onKeyDown}
          onBlur={() => {
            window.setTimeout(() => closeList(), 120);
          }}
        />
        {value ? (
          <Button type="button" variant="ghost" size="sm" disabled={locked} onClick={clearSelection}>
            {clearLabel}
          </Button>
        ) : null}
      </div>
      {selected ? (
        <p className="mt-1 truncate text-[var(--isalwa-text-sm)] text-[var(--isalwa-kiln)]">
          {SEARCHABLE_SELECT_COPY.chosen} · {selected.label}
        </p>
      ) : null}
      {resolvedAccess === 'permission-denied' ? (
        <div id={lockId} className="mt-2">
          <WorkState kind="permission-denied" title={lockCopy ?? SEARCHABLE_SELECT_COPY.permission} />
        </div>
      ) : null}
      {resolvedAccess === 'disabled' ? (
        <div id={lockId} className="mt-2">
          <WorkState kind="disabled" title={lockCopy ?? SEARCHABLE_SELECT_COPY.disabled} />
        </div>
      ) : null}
      {mode === 'empty' ? (
        <div className="mt-2">
          <WorkState
            kind="empty"
            title={SEARCHABLE_SELECT_COPY.emptyTitle}
            description={SEARCHABLE_SELECT_COPY.emptyDescription}
          />
        </div>
      ) : null}
      {popupOpen ? (
        <ul
          id={listId}
          role={mode === 'results' ? 'listbox' : 'status'}
          aria-labelledby={labelId}
          onKeyDown={onKeyDown}
          className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)] py-1 shadow-[var(--isalwa-shadow-floating)]"
        >
          {mode === 'prompt' ? (
            <li className="px-3 py-1.5 text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">
              <span className="block text-[var(--isalwa-kiln)]">{SEARCHABLE_SELECT_COPY.prompt}</span>
              <span className="mt-0.5 block text-[var(--isalwa-text-xs)]">
                {SEARCHABLE_SELECT_COPY.promptDescription}
              </span>
            </li>
          ) : null}
          {mode === 'no-results' ? (
            <li className="px-3 py-1.5 text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">{noMatchLabel}</li>
          ) : null}
          {mode === 'results'
            ? windowed.visible.map((option, index) => {
                const isActive = index === boundedIndex;
                const unavailable = !canSelectSearchableOption(option);
                return (
                  <li
                    key={option.id}
                    id={`${listId}-${option.id}`}
                    role="option"
                    aria-selected={option.id === value}
                    aria-disabled={unavailable}
                  >
                    <button
                      type="button"
                      tabIndex={-1}
                      disabled={unavailable}
                      className={
                        isActive
                          ? 'block w-full px-3 py-1.5 text-left text-[var(--isalwa-text-sm)] text-[var(--isalwa-kiln)] outline-none bg-[var(--isalwa-porcelain)] shadow-[var(--isalwa-shadow-focus)] focus-visible:shadow-[var(--isalwa-shadow-focus)]'
                          : 'block w-full px-3 py-1.5 text-left text-[var(--isalwa-text-sm)] text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)] hover:bg-[var(--isalwa-porcelain)]'
                      }
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectOption(option)}
                    >
                      <span className="block">{option.label}</span>
                      {option.hint || option.unavailableReason ? (
                        <span className="mt-0.5 block text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]">
                          {option.unavailableReason?.trim() || option.hint}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })
            : null}
          {mode === 'results' && windowed.truncated ? (
            <li className="border-t border-[var(--isalwa-mist)] px-3 py-1.5 text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]">
              {SEARCHABLE_SELECT_COPY.truncated}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
