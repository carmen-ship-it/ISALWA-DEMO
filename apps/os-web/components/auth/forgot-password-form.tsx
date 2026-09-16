'use client';

import Link from 'next/link';
import { useState, useTransition, type FormEvent } from 'react';
import { Button, Panel } from '@isalwa/ui';
import { getOsAuthMode, isSupabaseConfigured } from '@/lib/auth/config';
import {
  PASSWORD_RESET_COPY,
  buildPasswordResetRedirectUrl,
  isValidResetEmail,
} from '@/lib/auth/password-reset';
import { createBrowserSupabaseClient } from '@/lib/auth/supabase/browser';

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    setError(null);

    if (!isValidResetEmail(email)) {
      setError('Ingrese un correo válido.');
      return;
    }

    startTransition(async () => {
      if (getOsAuthMode() !== 'supabase' || !isSupabaseConfigured()) {
        setError(PASSWORD_RESET_COPY.forgotMisconfigured);
        setSuccess(false);
        return;
      }

      const redirectTo = buildPasswordResetRedirectUrl({
        configuredOrigin: process.env.NEXT_PUBLIC_OS_WEB_ORIGIN,
        host: typeof window !== 'undefined' ? window.location.host : null,
        proto: typeof window !== 'undefined' ? window.location.protocol.replace(':', '') : null,
      });
      if (!redirectTo) {
        setError(PASSWORD_RESET_COPY.forgotMisconfigured);
        setSuccess(false);
        return;
      }

      try {
        const supabase = createBrowserSupabaseClient();
        const { error: providerError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        });
        if (providerError) {
          const msg = providerError.message.toLowerCase();
          if (msg.includes('rate limit')) {
            setError('Demasiados intentos. Espere unos minutos e intente de nuevo.');
          } else if (msg.includes('redirect') || msg.includes('not allowed') || msg.includes('allowlist')) {
            setError(PASSWORD_RESET_COPY.forgotMisconfigured);
          } else {
            setError(PASSWORD_RESET_COPY.forgotUnavailable);
          }
          setSuccess(false);
          return;
        }
        setSuccess(true);
      } catch {
        setError(PASSWORD_RESET_COPY.forgotUnavailable);
        setSuccess(false);
      }
    });
  }

  return (
    <Panel className="mx-auto w-full max-w-md px-7 py-8 sm:px-9 sm:py-9">
      {success ? (
        <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]" role="status">
          {PASSWORD_RESET_COPY.forgotSuccess}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div>
            <label
              htmlFor="reset-email"
              className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60"
            >
              {PASSWORD_RESET_COPY.forgotEmail}
            </label>
            <input
              id="reset-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-required="true"
              className="isalwa-t-fast w-full rounded-full border border-[var(--isalwa-mist)] bg-white px-5 py-3.5 text-sm text-[var(--isalwa-kiln)] outline-none focus:border-[var(--isalwa-glaze)] focus:shadow-[var(--isalwa-shadow-focus)]"
            />
          </div>
          <Button type="submit" variant="primary" className="w-full" disabled={pending}>
            {pending ? PASSWORD_RESET_COPY.forgotPending : PASSWORD_RESET_COPY.forgotSubmit}
          </Button>
        </form>
      )}

      {error ? (
        <p className="mt-4 text-sm text-[var(--isalwa-danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <p className="mt-6 text-center text-sm">
        <Link
          href="/login"
          className="font-medium text-[var(--isalwa-glaze)] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--isalwa-glaze)]"
        >
          {PASSWORD_RESET_COPY.forgotBackToLogin}
        </Link>
      </p>
    </Panel>
  );
}
