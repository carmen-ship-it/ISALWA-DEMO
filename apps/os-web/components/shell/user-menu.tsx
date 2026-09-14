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
      <div className="flex min-w-0 items-center gap-1">
        <button
          ref={triggerRef}
          type="button"
          className="isalwa-t-fast flex min-w-0 max-w-[7.5rem] cursor-pointer flex-col items-end rounded-[var(--isalwa-radius-control)] px-2 py-1 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)] disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-[10rem] lg:max-w-[28rem] xl:max-w-none"
          aria-label={`${t('account.signedInAs')} ${label}`}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          aria-busy={pending}
          disabled={pending}
          title={label}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="hidden text-[11px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)] lg:block">
            {t('account.signedInAs')}
          </span>
          <span className="lg:hidden">Cuenta</span>
          <span className="hidden min-w-0 whitespace-normal break-words text-right lg:inline">{label}</span>
        </button>
        <button
          type="button"
          className="hidden rounded-[var(--isalwa-radius-control)] px-2 py-2 text-sm text-[var(--isalwa-kiln)] outline-none hover:bg-[var(--isalwa-mist)] focus-visible:shadow-[var(--isalwa-shadow-focus)] disabled:opacity-60 sm:inline-flex"
          disabled={pending}
          onClick={signOut}
        >
          {pending ? 'Cerrando sesión…' : t('account.signOut')}
        </button>
      </div>

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
