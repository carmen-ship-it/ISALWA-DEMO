'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { EmailOtpType } from '@supabase/supabase-js';
import { Button, Panel } from '@isalwa/ui';
import { completeInviteAction } from '@/lib/auth/actions';
import {
  INVITE_COMPLETION_COPY,
  inviteCompletionMessage,
  inviteCompletionView,
  mapInviteCallbackFailure,
  type InviteCompletionView,
} from '@/lib/auth/invite-completion';
import { createBrowserSupabaseClient } from '@/lib/auth/supabase/browser';
import { DEFAULT_POST_LOGIN } from '@/lib/auth/constants';

type Phase = 'working' | 'password' | InviteCompletionView;

const INVITE_UI_FLAG = 'isalwa-invite-completion';

export function CompleteInviteForm() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('working');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      const params = new URLSearchParams(window.location.search);
      const expired = mapInviteCallbackFailure({
        error: params.get('error'),
        errorCode: params.get('error_code'),
      });
      if (expired) {
        window.history.replaceState({}, '', '/auth/complete-invite');
        if (!cancelled) setPhase('expired');
        return;
      }

      try {
        const supabase = createBrowserSupabaseClient();
        const code = params.get('code');
        const tokenHash = params.get('token_hash');
        const type = params.get('type');
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const hasInviteProof = Boolean(code || tokenHash || hash.get('access_token'));
        if (!hasInviteProof && sessionStorage.getItem(INVITE_UI_FLAG) !== '1') {
          if (!cancelled) setPhase('unauthenticated');
          return;
        }
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            sessionStorage.removeItem(INVITE_UI_FLAG);
            if (!cancelled) setPhase(error.message.toLowerCase().includes('expir') ? 'expired' : 'unauthenticated');
            return;
          }
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as EmailOtpType,
          });
          if (error) {
            sessionStorage.removeItem(INVITE_UI_FLAG);
            if (!cancelled) setPhase('expired');
            return;
          }
        }

        window.history.replaceState({}, '', '/auth/complete-invite');
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          sessionStorage.removeItem(INVITE_UI_FLAG);
          if (!cancelled) setPhase('unauthenticated');
          return;
        }
        if (hasInviteProof) sessionStorage.setItem(INVITE_UI_FLAG, '1');
        if (cancelled) return;
        setPhase('password');
      } catch {
        if (!cancelled) setPhase('unavailable');
      }
    }
    void start();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const password = String(new FormData(form).get('password') ?? '');
    setPasswordError(null);
    if (password.length < 8) {
      setPasswordError(INVITE_COMPLETION_COPY.passwordSet);
      return;
    }
    setPending(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password });
      form.reset();
      if (error) {
        setPasswordError(INVITE_COMPLETION_COPY.passwordSet);
        return;
      }
      const result = await completeInviteAction();
      const view = inviteCompletionView(result.code);
      if (view === 'ready' || view === 'already_completed') {
        sessionStorage.removeItem(INVITE_UI_FLAG);
      }
      setPhase(view);
    } catch {
      setPhase('unavailable');
    } finally {
      setPending(false);
    }
  }

  if (phase === 'working') {
    return <p className="text-center text-sm text-[var(--isalwa-slate)]">Verificando invitación…</p>;
  }

  if (phase === 'password') {
    return (
      <Panel className="mx-auto w-full max-w-md px-7 py-8 sm:px-9 sm:py-9">
        <form onSubmit={onPassword} className="space-y-5">
          <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
            Configure su contraseña para continuar.
          </p>
          <div>
            <label
              htmlFor="invite-password"
              className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60"
            >
              Contraseña
            </label>
            <input
              id="invite-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2.5 text-[var(--isalwa-kiln)]"
            />
          </div>
          {passwordError ? (
            <p className="text-sm text-[var(--isalwa-kiln)]" role="alert">
              {passwordError}
            </p>
          ) : null}
          <Button type="submit" variant="primary" className="w-full" disabled={pending}>
            {pending ? 'Verificando…' : 'Crear acceso a ISALWA'}
          </Button>
        </form>
      </Panel>
    );
  }

  const message = inviteCompletionMessage(phase);
  const ready = phase === 'ready' || phase === 'already_completed';

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
          onClick={() => {
            router.replace(DEFAULT_POST_LOGIN);
            router.refresh();
          }}
        >
          Continuar a ISALWA
        </Button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          className="mt-6 w-full"
          onClick={() => router.replace('/login')}
        >
          Ir a iniciar sesión
        </Button>
      )}
    </Panel>
  );
}
