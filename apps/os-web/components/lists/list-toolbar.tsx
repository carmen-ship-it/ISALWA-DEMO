'use client';

import Link from 'next/link';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cx } from '@isalwa/ui';

export type FilterPopoverOption = {
  id: string;
  label: string;
  href: string;
  active: boolean;
};

export type FilterPopoverSection = {
  id: string;
  title: string;
  options: FilterPopoverOption[];
};

type FilterPopoverProps = {
  label?: string;
  activeCount: number;
  clearHref?: string;
  sections: FilterPopoverSection[];
};

/**
 * Compact filter trigger with active count, keyboard Escape, and clear.
 * Options navigate via URL state — no permanent client-only filter store.
 */
export function FilterPopover({
  label = 'Filtros',
  activeCount,
  clearHref,
  sections,
}: FilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const triggerLabel = activeCount > 0 ? `${label} (${activeCount})` : label;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={cx(
          'isalwa-t-fast inline-flex h-9 items-center gap-2 rounded-[var(--isalwa-radius-control)] border px-3 text-sm font-medium outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]',
          activeCount > 0
            ? 'border-[var(--isalwa-kiln)] bg-white text-[var(--isalwa-kiln)]'
            : 'border-[var(--isalwa-mist)] bg-white text-[var(--isalwa-slate)] hover:border-[var(--isalwa-glaze)]',
        )}
      >
        {triggerLabel}
      </button>
      {open ? (
        <div
          id={menuId}
          role="dialog"
          aria-label={label}
          className="absolute right-0 z-30 mt-1 w-[min(100vw-2rem,18rem)] rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white p-3 shadow-[var(--isalwa-shadow-resting)]"
        >
          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.id}>
                <p className="mb-2 text-[10px] font-semibold tracking-[0.1em] text-[var(--isalwa-slate)] uppercase">
                  {section.title}
                </p>
                <ul className="space-y-1" role="listbox" aria-label={section.title}>
                  {section.options.map((option) => (
                    <li key={option.id} role="none">
                      <Link
                        href={option.href}
                        role="option"
                        aria-selected={option.active}
                        className={cx(
                          'block rounded-[var(--isalwa-radius-control)] px-2.5 py-2 text-sm outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]',
                          option.active
                            ? 'bg-[color-mix(in_srgb,var(--isalwa-glaze)_10%,white)] font-medium text-[var(--isalwa-kiln)]'
                            : 'text-[var(--isalwa-slate)] hover:bg-[var(--isalwa-porcelain)] hover:text-[var(--isalwa-kiln)]',
                        )}
                        onClick={() => setOpen(false)}
                      >
                        {option.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {clearHref && activeCount > 0 ? (
            <div className="mt-3 border-t border-[var(--isalwa-mist)] pt-3">
              <Link
                href={clearHref}
                className="text-sm font-medium text-[var(--isalwa-glaze)] outline-none hover:underline focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                onClick={() => setOpen(false)}
              >
                Limpiar filtros
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export type ListSearchFormProps = {
  action: string;
  initialQuery?: string;
  hiddenFields?: Record<string, string | undefined>;
  placeholder?: string;
  label?: string;
  clearHref?: string;
};

export function ListSearchForm({
  action,
  initialQuery = '',
  hiddenFields,
  placeholder = 'Buscar en esta lista',
  label = 'Buscar',
  clearHref,
}: ListSearchFormProps) {
  const fieldId = useId();
  const hasQuery = Boolean(initialQuery);

  return (
    <form method="get" action={action} className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end">
      {hiddenFields
        ? Object.entries(hiddenFields).map(([name, value]) =>
            value ? <input key={name} type="hidden" name={name} value={value} /> : null,
          )
        : null}
      <div className="min-w-0 flex-1">
        <label
          htmlFor={fieldId}
          className="mb-1.5 block text-[11px] font-medium tracking-[0.14em] text-[var(--isalwa-slate)] uppercase"
        >
          {label}
        </label>
        <input
          id={fieldId}
          name="q"
          type="search"
          defaultValue={initialQuery}
          placeholder={placeholder}
          autoComplete="off"
          className="isalwa-field w-full"
        />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="submit"
          className="isalwa-t-fast inline-flex h-10 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-kiln)] bg-[var(--isalwa-kiln)] px-4 text-sm font-medium text-white outline-none hover:opacity-95 focus-visible:shadow-[var(--isalwa-shadow-focus)]"
        >
          Buscar
        </button>
        {hasQuery && clearHref ? (
          <Link
            href={clearHref}
            className="inline-flex h-10 items-center text-sm font-medium text-[var(--isalwa-glaze)] outline-none hover:underline focus-visible:shadow-[var(--isalwa-shadow-focus)]"
          >
            Limpiar
          </Link>
        ) : null}
      </div>
    </form>
  );
}

export type ListToolbarProps = {
  search: ReactNode;
  filters?: ReactNode;
  density?: ReactNode;
  className?: string;
};

export function ListToolbar({ search, filters, density, className }: ListToolbarProps) {
  return (
    <div
      className={cx(
        'mb-4 flex flex-col gap-3 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-3 shadow-[var(--isalwa-shadow-soft)] sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 flex-1">{search}</div>
      <div className="flex flex-wrap items-center gap-2">
        {filters}
        {density}
      </div>
    </div>
  );
}
