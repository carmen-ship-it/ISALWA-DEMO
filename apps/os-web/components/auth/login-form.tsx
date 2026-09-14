'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Panel } from '@isalwa/ui';
import { devBootstrapAction, signInAction } from '@/lib/auth/actions';
import { getOsAuthMode } from '@/lib/auth/config';
import { t } from '@/lib/i18n/es';
import { safeInternalPath } from '@/lib/shell/safe-next';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isDevMode = getOsAuthMode() === 'dev';

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await signInAction(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      const next = safeInternalPath(searchParams.get('next'));
      router.replace(next ?? result.redirectTo ?? '/inicio');
      router.refresh();
    });
  }

  function onDevBootstrap() {
    setError(null);
    startTransition(async () => {
      const result = await devBootstrapAction();
      if (result.error) {
        setError(result.error);
        return;
      }
      router.replace(result.redirectTo ?? '/inicio');
      router.refresh();
    });
  }

  const reason = searchParams.get('reason');
  const reasonMessage =
    reason === 'expired'
      ? t('states.sessionExpiredDesc')
      : reason === 'revoked'
        ? t('states.accountInactiveDesc')
        : null;

  return (
    <Panel className="mx-auto w-full max-w-md px-7 py-8 sm:px-9 sm:py-9">
      {reasonMessage ? (
        <p className="mb-5 text-sm leading-relaxed text-[var(--isalwa-kiln)]" role="status">
          {reasonMessage}
        </p>
      ) : null}
      {isDevMode ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{t('login.devHint')}</p>
          <Button type="button" variant="primary" className="w-full" disabled={pending} onClick={onDevBootstrap}>
            {t('login.devSubmit')}
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60"
            >
              {t('login.email')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="isalwa-t-fast w-full rounded-full border border-[var(--isalwa-mist)] bg-white px-5 py-3.5 text-sm text-[var(--isalwa-kiln)] outline-none focus:border-[var(--isalwa-glaze)] focus:shadow-[var(--isalwa-shadow-focus)]"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60"
            >
              {t('login.password')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="isalwa-t-fast w-full rounded-full border border-[var(--isalwa-mist)] bg-white px-5 py-3.5 text-sm text-[var(--isalwa-kiln)] outline-none focus:border-[var(--isalwa-glaze)] focus:shadow-[var(--isalwa-shadow-focus)]"
            />
          </div>
          <Button type="submit" variant="primary" className="w-full" disabled={pending}>
            {t('login.submit')}
          </Button>
        </form>
      )}

      {error ? (
        <p className="mt-4 text-sm text-[var(--isalwa-danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </Panel>
  );
}
