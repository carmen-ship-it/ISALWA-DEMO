'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getOsAuthMode, getOsApiBaseUrl, isSupabaseConfigured } from '@/lib/auth/config';
import { DEFAULT_POST_LOGIN, OS_DEV_SESSION_COOKIE } from '@/lib/auth/constants';
import {
  decodeDevSession,
  encodeDevSession,
  type DevSession,
} from '@/lib/auth/dev-session';
import { createServerSupabaseClient } from '@/lib/auth/supabase/server';
import { t } from '@/lib/i18n/es';
import { readInviteCompletionCode } from '@/lib/auth/invite-completion';
import { QA_VIEW_COOKIE_NAME } from '@/lib/qa/constants';
import {
  OWNER_EFFECTIVE_COMPANY_COOKIE,
  organizationIdForCompany,
  parseOwnerEffectiveCompany,
} from '@/lib/demo/owner-company-context';
import { parseDemoDataMode, DEMO_DATA_MODE_COOKIE } from '@/lib/demo/owner-demo-identity';
import {
  PASSWORD_RESET_COPY,
  buildPasswordResetRedirectUrl,
  isValidResetEmail,
  validateNewPassword,
} from '@/lib/auth/password-reset';

export type WebSession = {
  mode: 'supabase' | 'dev';
  email?: string;
  displayLabel?: string;
  devSession?: DevSession;
};

export async function getServerWebSession(): Promise<WebSession | null> {
  if (getOsAuthMode() === 'supabase' && isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      return {
        mode: 'supabase',
        email: user.email ?? undefined,
        displayLabel: user.email ?? undefined,
      };
    } catch {
      return null;
    }
  }

  const cookieStore = await cookies();
  const devSession = decodeDevSession(cookieStore.get(OS_DEV_SESSION_COOKIE)?.value);
  if (!devSession) return null;
  return {
    mode: 'dev',
    displayLabel: devSession.displayLabel ?? 'Desarrollo',
    devSession,
  };
}

async function getSupabaseAccessToken(): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('AUTH_REQUIRED');
  }
  return session.access_token;
}

/**
 * Probe os-api with an explicit token when possible (avoids cookie race after sign-in).
 * When the actor has multiple proven memberships, canonical session fails closed without
 * x-os-organization-id — try REAL then SYNTH selectors (owner-demo company context),
 * never invent memberships.
 */
async function validateOsMembershipWithToken(
  accessToken: string,
): Promise<{ ok: true; organizationId?: string } | { ok: false; error: string }> {
  const orgCandidates: Array<string | undefined> = [
    undefined,
    organizationIdForCompany('real'),
    organizationIdForCompany('synth'),
  ];

  let lastError: unknown;
  for (const organizationId of orgCandidates) {
    const client = createOsApiClient({
      mode: 'supabase',
      accessToken,
      ...(organizationId ? { organizationId } : {}),
    });
    const attempt = async () => {
      await client.listAttention({ limit: '1' });
    };
    try {
      await attempt();
      return { ok: true, organizationId };
    } catch (first) {
      lastError = first;
      // Free-tier cold start / brief blip — retry once before next candidate.
      if (first instanceof OsApiError && first.kind === 'unavailable') {
        try {
          await new Promise((r) => setTimeout(r, 1500));
          await attempt();
          return { ok: true, organizationId };
        } catch (second) {
          lastError = second;
        }
      }
      // unauthorized/forbidden: try next org selector (multi-membership ambiguity).
      if (
        first instanceof OsApiError &&
        (first.kind === 'forbidden' || first.kind === 'unauthorized')
      ) {
        continue;
      }
      return { ok: false, error: membershipProbeError(first) };
    }
  }
  return { ok: false, error: membershipProbeError(lastError) };
}

function membershipProbeError(err: unknown): string {
  if (err instanceof OsApiError) {
    if (err.code === 'ACCESS_REVOKED') return t('states.accountInactiveDesc');
    if (err.kind === 'forbidden' || err.kind === 'unauthorized') return t('login.errorNoMembership');
    if (err.kind === 'unavailable') {
      return 'El servicio no está disponible temporalmente. Espere unos segundos e intente de nuevo.';
    }
  }
  return 'No se pudo verificar el acceso a la empresa. Intente de nuevo.';
}

export async function signInAction(formData: FormData): Promise<{ error?: string; redirectTo?: string }> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Ingrese su correo y contraseña.' };
  }

  if (getOsAuthMode() === 'supabase' && isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { error: 'Correo o contraseña incorrectos.' };
      }

      const accessToken = data.session?.access_token;
      if (!data.user || !accessToken) {
        await supabase.auth.signOut();
        return { error: 'No se pudo iniciar sesión. Intente de nuevo.' };
      }

      // Use the token from sign-in directly — do not re-read cookies via getSession()
      // in the same Server Action (can race and false-fail membership).
      const membership = await validateOsMembershipWithToken(accessToken);
      if (!membership.ok) {
        await supabase.auth.signOut();
        return { error: membership.error };
      }

      // Persist company selector when multi-membership required an org header.
      // Default proven REAL; Demo toggle later switches to SYNTH. Does not impersonate.
      if (membership.organizationId) {
        const cookieStore = await cookies();
        const company =
          membership.organizationId === organizationIdForCompany('synth') ? 'synth' : 'real';
        cookieStore.set(OWNER_EFFECTIVE_COMPANY_COOKIE, company, {
          httpOnly: false,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          maxAge: 60 * 60 * 24 * 30,
        });
      }

      return { redirectTo: DEFAULT_POST_LOGIN };
    } catch {
      return { error: 'No se pudo iniciar sesión. Intente de nuevo.' };
    }
  }

  return { error: 'Autenticación Supabase no configurada. Use modo desarrollo.' };
}

export async function devBootstrapAction(): Promise<{ error?: string; redirectTo?: string }> {
  if (getOsAuthMode() !== 'dev') {
    return { error: 'El acceso de desarrollo no está habilitado.' };
  }

  try {
    const base = getOsApiBaseUrl();
    const res = await fetch(`${base}/dev/bootstrap`, { method: 'POST' });
    if (!res.ok) {
      return { error: 'No se pudo crear la sesión de desarrollo. ¿Está os-api en ejecución?' };
    }
    const data = (await res.json()) as {
      organizationId: string;
      memberId: string;
      personId: string;
      authIdentityId: string;
    };

    const devSession: DevSession = {
      organizationId: data.organizationId,
      memberId: data.memberId,
      personId: data.personId,
      authIdentityId: data.authIdentityId,
      displayLabel: 'Sesión de desarrollo',
    };

    const cookieStore = await cookies();
    cookieStore.set(OS_DEV_SESSION_COOKIE, encodeDevSession(devSession), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 8,
    });

    return { redirectTo: DEFAULT_POST_LOGIN };
  } catch {
    return { error: 'No se pudo conectar con os-api.' };
  }
}

function isAuthCookie(name: string): boolean {
  return name === OS_DEV_SESSION_COOKIE || name.startsWith('sb-');
}

function expireAuthCookie(cookieStore: Awaited<ReturnType<typeof cookies>>, name: string) {
  cookieStore.set(name, '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  });
}

/** Clears provider and local session cookies. Never surfaces provider errors. */
async function clearWebSession(): Promise<void> {
  const cookieStore = await cookies();
  const names = new Set(
    cookieStore
      .getAll()
      .filter((cookie) => isAuthCookie(cookie.name))
      .map((cookie) => cookie.name),
  );
  names.add(OS_DEV_SESSION_COOKIE);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // Provider failures must not leave a usable local session.
    }
  }

  const afterSignOut = await cookies();
  for (const cookie of afterSignOut.getAll()) {
    if (isAuthCookie(cookie.name)) names.add(cookie.name);
  }
  for (const name of names) {
    expireAuthCookie(afterSignOut, name);
  }
}

export type SignOutReason = 'expired' | 'revoked';

export async function signOutAction(reason?: SignOutReason): Promise<{ error?: string }> {
  try {
    await clearWebSession();
  } catch {
    return { error: 'No se pudo cerrar la sesión. Intente de nuevo.' };
  }
  const next = reason === 'expired' || reason === 'revoked' ? `/login?reason=${reason}` : '/login';
  redirect(next);
}

export type LiveAccess = 'ok' | 'expired' | 'revoked' | 'unavailable';

/** Used after logout/back and when a second tab returns. Does not grant access. */
export async function confirmLiveAccess(): Promise<LiveAccess> {
  const web = await getServerWebSession();
  if (!web) return 'expired';

  try {
    const auth = await getServerOsAuthContext();
    if (!auth) {
      await clearWebSession();
      return 'expired';
    }
    const client = createOsApiClient(auth);
    await client.listAttention({ limit: '1' });
    return 'ok';
  } catch (err) {
    if (err instanceof OsApiError && err.code === 'ACCESS_REVOKED') {
      await clearWebSession();
      return 'revoked';
    }
    if (err instanceof OsApiError && (err.kind === 'unauthorized' || err.code === 'AUTH_REQUIRED')) {
      await clearWebSession();
      return 'expired';
    }
    if (err instanceof Error && err.message === 'AUTH_REQUIRED') {
      await clearWebSession();
      return 'expired';
    }
    return 'unavailable';
  }
}

/**
 * Binds the current provider session to the invited identity.
 * Takes no form fields. Password never reaches this action.
 */
export async function completeInviteAction(): Promise<{ code: string }> {
  if (getOsAuthMode() !== 'supabase' || !isSupabaseConfigured()) {
    return { code: 'unauthenticated' };
  }
  let token: string;
  try {
    token = await getSupabaseAccessToken();
  } catch {
    return { code: 'unauthenticated' };
  }

  try {
    const res = await fetch(`${getOsApiBaseUrl()}/auth/complete-invite`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
      cache: 'no-store',
    });
    const body = (await res.json().catch(() => null)) as unknown;
    return { code: readInviteCompletionCode(body) };
  } catch {
    return { code: 'INTERNAL_ERROR' };
  }
}

export async function getServerOsAuthContext(options?: { skipQaView?: boolean }) {
  const session = await getServerWebSession();
  if (!session) return null;

  let base:
    | { mode: 'dev'; session: DevSession }
    | { mode: 'supabase'; accessToken: string }
    | null = null;

  if (session.mode === 'dev' && session.devSession) {
    base = { mode: 'dev', session: session.devSession };
  } else if (session.mode === 'supabase') {
    const token = await getSupabaseAccessToken();
    base = { mode: 'supabase', accessToken: token };
  }

  if (!base) return null;
  if (options?.skipQaView) return base;

  const store = await cookies();
  const qaViewCookie = store.get(QA_VIEW_COOKIE_NAME)?.value;

  // Owner Demo company context: select among proven memberships (Carmen REAL↔SYNTH).
  // Prefer explicit company cookie; else derive from demo-data-mode cookie; default real when either cookie exists.
  const companyExplicit = parseOwnerEffectiveCompany(
    store.get(OWNER_EFFECTIVE_COMPANY_COOKIE)?.value,
  );
  const demoMode = parseDemoDataMode(store.get(DEMO_DATA_MODE_COOKIE)?.value);
  const company =
    companyExplicit ??
    (store.get(DEMO_DATA_MODE_COOKIE)?.value != null
      ? demoMode === 'demo'
        ? 'synth'
        : 'real'
      : null);
  const organizationId = company ? organizationIdForCompany(company) : undefined;

  const withOrg =
    organizationId && base.mode === 'supabase'
      ? { ...base, organizationId }
      : organizationId && base.mode === 'dev'
        ? {
            ...base,
            session: { ...base.session, organizationId },
          }
        : base;

  return qaViewCookie ? { ...withOrg, qaViewCookie } : withOrg;
}


export async function requestPasswordResetAction(
  formData: FormData,
): Promise<{ error?: string; ok?: true }> {
  const email = String(formData.get('email') ?? '').trim();
  if (!isValidResetEmail(email)) {
    return { error: 'Ingrese un correo válido.' };
  }

  if (getOsAuthMode() !== 'supabase' || !isSupabaseConfigured()) {
    return { error: PASSWORD_RESET_COPY.forgotMisconfigured };
  }

  const headerStore = await headers();
  const redirectTo = buildPasswordResetRedirectUrl({
    configuredOrigin: process.env.NEXT_PUBLIC_OS_WEB_ORIGIN,
    host: headerStore.get('x-forwarded-host') ?? headerStore.get('host'),
    proto: headerStore.get('x-forwarded-proto'),
  });
  if (!redirectTo) {
    return { error: PASSWORD_RESET_COPY.forgotMisconfigured };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      // Fail closed for operators; do not reveal whether the mailbox exists.
      return { error: PASSWORD_RESET_COPY.forgotUnavailable };
    }
    // Always the same success copy (enumeration-safe).
    return { ok: true };
  } catch {
    return { error: PASSWORD_RESET_COPY.forgotUnavailable };
  }
}

export async function updatePasswordFromResetAction(
  formData: FormData,
): Promise<{ error?: string; ok?: true }> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  const validationError = validateNewPassword(password, confirm);
  if (validationError) {
    return { error: validationError };
  }

  if (getOsAuthMode() !== 'supabase' || !isSupabaseConfigured()) {
    return { error: PASSWORD_RESET_COPY.resetUnavailable };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: PASSWORD_RESET_COPY.resetOpenLink };
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return { error: PASSWORD_RESET_COPY.resetSetFailed };
    }

    try {
      await supabase.auth.signOut();
    } catch {
      // Password already updated; clearing session is best-effort.
    }
    return { ok: true };
  } catch {
    return { error: PASSWORD_RESET_COPY.resetUnavailable };
  }
}
