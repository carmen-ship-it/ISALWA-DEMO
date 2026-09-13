'use client';

import { useTransition } from 'react';
import { signOutAction } from '@/lib/auth/actions';
import { t } from '@/lib/i18n/es';

type UserMenuProps = {
  displayLabel: string;
};

export function UserMenu({ displayLabel }: UserMenuProps) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="relative">
      <details className="group">
        <summary
          className="isalwa-t-fast flex cursor-pointer list-none items-center gap-2 rounded-full border border-[var(--isalwa-mist)] bg-white px-4 py-2 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
          aria-label={t('account.menu')}
        >
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--isalwa-glaze)_12%,white)] text-xs font-semibold text-[var(--isalwa-glaze)]"
          >
            {displayLabel.slice(0, 1).toUpperCase()}
          </span>
          <span className="hidden max-w-[12rem] truncate sm:inline">{displayLabel}</span>
        </summary>
        <div className="absolute right-0 z-30 mt-2 min-w-[12rem] rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-2 shadow-[var(--isalwa-shadow-floating)]">
          <p className="px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]">
            {t('account.signedInAs')}
          </p>
          <p className="px-3 pb-2 text-sm text-[var(--isalwa-kiln)]">{displayLabel}</p>
          <button
            type="button"
            disabled={pending}
            className="isalwa-t-fast w-full rounded-[var(--isalwa-radius-control)] px-3 py-2 text-left text-sm text-[var(--isalwa-kiln)] hover:bg-[color-mix(in_srgb,var(--isalwa-glaze)_6%,white)] focus-visible:outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
            onClick={() => startTransition(() => void signOutAction())}
          >
            {t('account.signOut')}
          </button>
        </div>
      </details>
    </div>
  );
}
