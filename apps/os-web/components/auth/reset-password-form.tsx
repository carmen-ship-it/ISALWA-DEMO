'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import type { EmailOtpType } from '@supabase/supabase-js';
import { Button, Panel } from '@isalwa/ui';
import { updatePasswordFromResetAction } from '@/lib/auth/actions';
import {
  PASSWORD_RESET_COPY,
  mapPasswordResetCallbackFailure,
  passwordResetCallbackMessage,
  type PasswordResetCallbackView,
  validateNewPassword,
} from '@/lib/auth/password-reset';
import { createBrowserSupabaseClient } from '@/lib/auth/supabase/browser';

type Phase = 'working' | 'form' | PasswordResetCallbackView;

const RESET_UI_FLAG = 'isalwa-password-reset';

export function ResetPasswordForm() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('working');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      const params = new URLSearchParams(window.location.search);
      const expired = mapPasswordResetCallbackFailure({
        error: params.get('error'),
        errorCode: params.get('error_code'),
      });
      if (expired) {
        window.history.replaceState({}, '', '/auth/reset-password');
        if (!cancelled) setPhase('expired');
        return;
      }

      try {
        const supabase = createBrowserSupabaseClient();
        const code = params.get('code');
        const tokenHash = params.get('token_hash');
        const type = params.get('type');
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const hasRecoveryProof = Boolean(code || tokenHash || hash.get('access_token'));

        if (!hasRecoveryProof && sessionStorage.getItem(RESET_UI_FLAG) !== '1') {
          const { data } = await supabase.auth.getUser();
          if (!data.user) {
            if (!cancelled) setPhase('unauthenticated');
            return;
          }
          sessionStorage.setItem(RESET_UI_FLAG, '1');
          if (!cancelled) setPhase('form');
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            sessionStorage.removeItem(RESET_UI_FLAG);
            if (!cancelled) {
              setPhase(error.message.toLowerCase().includes('expir') ? 'expired' : 'unauthenticated');
            }
            return;
          }
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as EmailOtpType,
          });
          if (error) {
            sessionStorage.removeItem(RESET_UI_FLAG);
            if (!cancelled) setPhase('expired');
            return;
          }
        }

        window.history.replaceState({}, '', '/auth/reset-password');
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          sessionStorage.removeItem(RESET_UI_FLAG);
          if (!cancelled) setPhase('unauthenticated');
          return;
        }
        if (hasRecoveryProof) sessionStorage.setItem(RESET_UI_FLAG, '1');
        if (!cancelled) setPhase('form');
      } catch {
        if (!cancelled) setPhase('unavailable');
      }
    }
    void start();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get('password') ?? '');
    const confirm = String(formData.get('confirm') ?? '');
    setPasswordError(null);
    const localError = validateNewPassword(password, confirm);
    if (localError) {
      setPasswordError(localError);
      return;
    }
    setPending(true);
    try {
      const result = await updatePasswordFromResetAction(formData);
      form.reset();
      if (result.error) {
        setPasswordError(result.error);
        return;
      }
      sessionStorage.removeItem(RESET_UI_FLAG);
      setPhase('ready');
    } catch {
      setPhase('unavailable');
    } finally {
      setPending(false);
    }
  }

  if (phase === 'working') {
    return (
      <p className="text-center text-sm text-[var(--isalwa-slate)]" role="status">
        {PASSWORD_RESET_COPY.resetWorking}
      </p>
    );
  }

  if (phase === 'form') {
    return (
      <Panel className="mx-auto w-full max-w-md px-7 py-8 sm:px-9 sm:py-9">
        <form onSubmit={onSubmit} className="space-y-5">
          <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
            {PASSWORD_RESET_COPY.resetDescription}
          </p>
          <div>
            <label
              htmlFor="new-password"
              className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60"
            >
              {PASSWORD_RESET_COPY.resetPassword}
            </label>
            <input
              id="new-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              aria-required="true"
              className="isalwa-t-fast w-full rounded-full border border-[var(--isalwa-mist)] bg-white px-5 py-3.5 text-sm text-[var(--isalwa-kiln)] outline-none focus:border-[var(--isalwa-glaze)] focus:shadow-[var(--isalwa-shadow-focus)]"
            />
          </div>
          <div>
            <label
              htmlFor="confirm-password"
              className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60"
            >
              {PASSWORD_RESET_COPY.resetConfirm}
            </label>
            <input
              id="confirm-password"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              aria-required="true"
              className="isalwa-t-fast w-full rounded-full border border-[var(--isalwa-mist)] bg-white px-5 py-3.5 text-sm text-[var(--isalwa-kiln)] outline-none focus:border-[var(--isalwa-glaze)] focus:shadow-[var(--isalwa-shadow-focus)]"
            />
          </div>
          {passwordError ? (
            <p className="text-sm text-[var(--isalwa-danger)]" role="alert">
              {passwordError}
            </p>
          ) : null}
          <Button type="submit" variant="primary" className="w-full" disabled={pending}>
            {pending ? PASSWORD_RESET_COPY.resetPending : PASSWORD_RESET_COPY.resetSubmit}
          </Button>
        </form>
      </Panel>
    );
  }

  const message = passwordResetCallbackMessage(phase);
  const ready = phase === 'ready';

  return (
    <Panel className="mx-auto w-full max-w-md px-7 py-8 sm:px-9 sm:py-9">
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]" role="status">
        {message}
      </p>
      {ready ? (
        <Button
          type="button"
          variant="primary"
          className="mt-6 w-full"
          onClick={() => router.replace('/login')}
        >
          {PASSWORD_RESET_COPY.resetBackToLogin}
        </Button>
      ) : (
        <div className="mt-6 space-y-3">
          {(phase === 'expired' || phase === 'unauthenticated') && (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => router.replace('/auth/forgot-password')}
            >
              {PASSWORD_RESET_COPY.resetRequestAgain}
            </Button>
          )}
          <p className="text-center text-sm">
            <Link
              href="/login"
              className="font-medium text-[var(--isalwa-glaze)] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--isalwa-glaze)]"
            >
              {PASSWORD_RESET_COPY.resetBackToLogin}
            </Link>
          </p>
        </div>
      )}
    </Panel>
  );
}
