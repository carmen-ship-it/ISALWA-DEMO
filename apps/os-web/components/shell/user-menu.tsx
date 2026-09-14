'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { signOutAction } from '@/lib/auth/actions';
import { t } from '@/lib/i18n/es';

type UserMenuProps = {
  displayLabel: string;
};

export function UserMenu({ displayLabel }: UserMenuProps) {
  const label = displayLabel.trim() || 'Usuario';
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const signOutRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    signOutRef.current?.focus();

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  function signOut() {
    setNotice(null);
    startTransition(async () => {
      const result = await signOutAction();
      if (result?.error) {
        setNotice(result.error);
      }
    });
  }

  return (
    <div ref={rootRef} className="relative z-40 min-w-0">
      <button
        ref={triggerRef}
        type="button"
        className="isalwa-t-fast flex min-w-0 max-w-[min(16rem,48vw)] cursor-pointer items-center rounded-[var(--isalwa-radius-control)] px-2 py-2 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)] disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={t('account.menu')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-busy={pending}
        disabled={pending}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="min-w-0 truncate">{label}</span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={t('account.menu')}
          className="absolute right-0 z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)] px-3 py-3 shadow-[var(--isalwa-shadow-soft)]"
        >
          <p className="isalwa-kicker px-2">{t('account.signedInAs')}</p>
          <p className="mt-2 break-words px-2 text-sm text-[var(--isalwa-kiln)]">{label}</p>
          <button
            ref={signOutRef}
            type="button"
            role="menuitem"
            disabled={pending}
            className="isalwa-t-fast mt-3 w-full rounded-[var(--isalwa-radius-control)] px-2 py-2.5 text-left text-sm text-[var(--isalwa-kiln)] hover:bg-[var(--isalwa-mist)] focus-visible:outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={signOut}
          >
            {pending ? 'Cerrando sesión…' : t('account.signOut')}
          </button>
          {notice ? (
            <p className="px-2 pt-2 text-sm text-[var(--isalwa-danger)]" role="alert">
              {notice}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
