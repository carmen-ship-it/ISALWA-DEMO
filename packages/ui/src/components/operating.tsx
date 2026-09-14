'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cx } from '../lib/cx';

export type OperatingRowProps = {
  subject: ReactNode;
  meta?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  href?: string;
  selected?: boolean;
  className?: string;
};

/**
 * Dense operating row. One subject line, one metadata line.
 * Target: several rows visible at laptop height without shrinking type.
 */
export function OperatingRow({
  subject,
  meta,
  status,
  actions,
  href,
  selected = false,
  className,
}: OperatingRowProps) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium leading-5 text-[var(--isalwa-kiln)]">
          {subject}
        </span>
        {meta ? (
          <span className="mt-0.5 block truncate text-xs leading-4 text-[var(--isalwa-slate)]">
            {meta}
          </span>
        ) : null}
      </span>
      {status ? <span className="flex shrink-0 items-center gap-1.5">{status}</span> : null}
    </>
  );

  return (
    <div
      data-selected={selected ? 'true' : undefined}
      className={cx(
        'isalwa-operating-row group flex min-h-11 items-center gap-3 border-b border-[color-mix(in_srgb,var(--isalwa-mist)_80%,white)] px-3 py-1.5 last:border-b-0',
        selected && 'bg-[color-mix(in_srgb,var(--isalwa-glaze)_8%,white)]',
        className,
      )}
    >
      {href ? (
        <a
          href={href}
          className="isalwa-t-fast flex min-w-0 flex-1 items-center gap-3 rounded-[var(--isalwa-radius-control)] outline-none hover:text-[var(--isalwa-glaze-deep)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
        >
          {body}
        </a>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      )}
      {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
    </div>
  );
}

export type OverflowItem = {
  id: string;
  label: string;
  href?: string;
  onSelect?: () => void;
};

export type OverflowMenuProps = {
  label?: string;
  items: OverflowItem[];
};

export function OverflowMenu({ label = 'Más acciones', items }: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const visible = items.filter((item) => item.href || item.onSelect);

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

  if (visible.length === 0) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        className="isalwa-t-fast inline-flex h-8 w-8 items-center justify-center rounded-[var(--isalwa-radius-control)] text-[var(--isalwa-slate)] outline-none hover:bg-[var(--isalwa-mist)] hover:text-[var(--isalwa-kiln)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
      >
        <span aria-hidden>···</span>
      </button>
      {open ? (
        <ul
          id={menuId}
          role="menu"
          className="absolute right-0 z-30 mt-1 min-w-44 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white py-1 shadow-[var(--isalwa-shadow-resting)]"
        >
          {visible.map((item) => (
            <li key={item.id} role="none">
              {item.href ? (
                <a
                  role="menuitem"
                  href={item.href}
                  className="block px-3 py-2 text-sm text-[var(--isalwa-kiln)] outline-none hover:bg-[var(--isalwa-porcelain)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2 text-left text-sm text-[var(--isalwa-kiln)] outline-none hover:bg-[var(--isalwa-porcelain)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                  onClick={() => {
                    setOpen(false);
                    item.onSelect?.();
                  }}
                >
                  {item.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export type ContextDrawerProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function ContextDrawer({ open, title, onClose, children }: ContextDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Cerrar vista"
        className="isalwa-drawer-scrim absolute inset-0 bg-[color-mix(in_srgb,var(--isalwa-kiln)_28%,transparent)]"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="isalwa-drawer relative flex h-full w-full max-w-md flex-col border-l border-[var(--isalwa-mist)] bg-white shadow-[var(--isalwa-shadow-resting)] max-sm:max-w-none"
      >
        <header className="flex items-center justify-between gap-3 border-b border-[var(--isalwa-mist)] px-4 py-3">
          <h2 id={titleId} className="truncate text-base font-medium text-[var(--isalwa-kiln)]">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="isalwa-t-fast inline-flex h-8 items-center rounded-[var(--isalwa-radius-control)] px-2 text-sm text-[var(--isalwa-slate)] outline-none hover:text-[var(--isalwa-kiln)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
          >
            Cerrar
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </aside>
    </div>
  );
}

export type FeedbackTone = 'success' | 'error' | 'pending' | 'info';

export type FeedbackNoteProps = {
  tone: FeedbackTone;
  title: string;
  detail?: string;
};

export function FeedbackNote({ tone, title, detail }: FeedbackNoteProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      data-tone={tone}
      className={cx(
        'rounded-[var(--isalwa-radius-control)] border px-3 py-2 text-sm',
        tone === 'error' && 'border-[var(--isalwa-tint-red)] text-[var(--isalwa-kiln)]',
        tone === 'success' && 'border-[var(--isalwa-mist)] text-[var(--isalwa-kiln)]',
        tone === 'pending' && 'border-[var(--isalwa-mist)] text-[var(--isalwa-slate)]',
        tone === 'info' && 'border-[var(--isalwa-mist)] text-[var(--isalwa-slate)]',
      )}
    >
      <p className="font-medium">{title}</p>
      {detail ? <p className="mt-1 text-xs leading-4 text-[var(--isalwa-slate)]">{detail}</p> : null}
    </div>
  );
}
