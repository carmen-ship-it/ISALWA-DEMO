'use server';

import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getOsAuthMode, getOsApiBaseUrl, isSupabaseConfigured } from '@/lib/auth/config';
import { DEFAULT_POST_LOGIN, OS_DEV_SESSION_COOKIE } from '@/lib/auth/constants';
import { isEmailOnEvaluatorAllowlist } from '@/lib/evaluation/evaluator-allowlist';
import {
  EVALUATION_POST_LOGIN,
  evaluationPostLoginPath,
  isWalkthroughOnlyEvaluation,
} from '@/lib/evaluation/walkthrough-config';
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
  SELECTED_ORGANIZATION_COOKIE,
  SELECTED_ORGANIZATION_MAX_AGE_SECONDS,
  isSelectableOrganization,
  resolveOrganizationSelection,
  type OrganizationSelection,
  type SessionOrganization,
} from '@/lib/auth/organization-selection';
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
 * Lists the proven memberships with an explicit token (avoids cookie race after sign-in).
 * The organization options come only from os-api; nothing here names an organization.
 */
async function listMembershipsWithToken(
  accessToken: string,
): Promise<{ ok: true; organizations: SessionOrganization[] } | { ok: false; error: string }> {
  const client = createOsApiClient({ mode: 'supabase', accessToken });
  try {
    return { ok: true, organizations: (await client.listSessionOrganizations()).organizations };
  } catch (first) {
    // Free-tier cold start / brief blip — retry once.
    if (first instanceof OsApiError && first.kind === 'unavailable') {
      try {
        await new Promise((r) => setTimeout(r, 1500));
        return { ok: true, organizations: (await client.listSessionOrganizations()).organizations };
      } catch (second) {
        return { ok: false, error: membershipProbeError(second) };
      }
    }
    return { ok: false, error: membershipProbeError(first) };
  }
}

function persistSelectedOrganization(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  organizationId: string,
): void {
  cookieStore.set(SELECTED_ORGANIZATION_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SELECTED_ORGANIZATION_MAX_AGE_SECONDS,
  });
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

export type SignInActionResult = {
  error?: string;
  redirectTo?: string;
  /** When true, the client must ignore ?next= and use redirectTo only. */
  ignoreClientNext?: boolean;
};

export async function signInAction(formData: FormData): Promise<SignInActionResult> {
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

      // Walkthrough-only evaluation: allowlisted Supabase users reach /evaluacion
      // without os-api membership, org cookies, or operational scopes.
      if (isWalkthroughOnlyEvaluation()) {
        const sessionEmail = data.user.email ?? email;
        if (!isEmailOnEvaluatorAllowlist(sessionEmail)) {
          await supabase.auth.signOut();
          return { error: 'No tiene acceso a esta evaluación.' };
        }
        const cookieStore = await cookies();
        cookieStore.delete(SELECTED_ORGANIZATION_COOKIE);
        // Never honor ?next= in evaluation walkthrough mode.
        return { redirectTo: EVALUATION_POST_LOGIN, ignoreClientNext: true };
      }

      // Use the token from sign-in directly — do not re-read cookies via getSession()
      // in the same Server Action (can race and false-fail membership).
      const membership = await listMembershipsWithToken(accessToken);
      if (!membership.ok) {
        await supabase.auth.signOut();
        return { error: membership.error };
      }

      // One option is used; several keep a still-valid previous choice or
      // leave the choice to the authenticated layout. None is an honest denial.
      const cookieStore = await cookies();
      const selection = resolveOrganizationSelection(
        membership.organizations,
        cookieStore.get(SELECTED_ORGANIZATION_COOKIE)?.value,
      );
      if (selection.state === 'none') {
        await supabase.auth.signOut();
        return { error: t('login.errorNoMembership') };
      }
      if (selection.state === 'selected') {
        persistSelectedOrganization(cookieStore, selection.organizationId);
      } else {
        cookieStore.delete(SELECTED_ORGANIZATION_COOKIE);
      }

      return { redirectTo: evaluationPostLoginPath() };
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
  names.add(SELECTED_ORGANIZATION_COOKIE);

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

/** Clears session without redirect — for Route Handlers such as /auth/sign-out. */
export async function endWebSession(): Promise<{ error?: string }> {
  try {
    await clearWebSession();
    return {};
  } catch {
    return { error: 'No se pudo cerrar la sesión. Intente de nuevo.' };
  }
}

export async function signOutAction(reason?: SignOutReason): Promise<{ error?: string }> {
  const result = await endWebSession();
  if (result.error) return result;
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

type BaseOsAuth = { mode: 'dev'; session: DevSession } | { mode: 'supabase'; accessToken: string };

async function getBaseOsAuth(): Promise<BaseOsAuth | null> {
  const session = await getServerWebSession();
  if (!session) return null;
  if (session.mode === 'dev' && session.devSession) {
    return { mode: 'dev', session: session.devSession };
  }
  if (session.mode === 'supabase') {
    return { mode: 'supabase', accessToken: await getSupabaseAccessToken() };
  }
  return null;
}

export async function getServerOsAuthContext(options?: { skipQaView?: boolean }) {
  const base = await getBaseOsAuth();
  if (!base) return null;

  // Organization comes only from a selection among proven memberships.
  // Data mode (Demo / Datos reales) and the Journey never change it.
  const selection = await selectionForBase(base);
  const organizationId = selection.state === 'selected' ? selection.organizationId : undefined;
  const withOrg =
    organizationId && base.mode === 'supabase'
      ? { ...base, organizationId }
      : organizationId && base.mode === 'dev'
        ? { ...base, session: { ...base.session, organizationId } }
        : base;
  if (options?.skipQaView) return withOrg;

  const qaViewCookie = (await cookies()).get(QA_VIEW_COOKIE_NAME)?.value;
  return qaViewCookie ? { ...withOrg, qaViewCookie } : withOrg;
}

const listMembershipsForRequest = cache(async (key: string, base: BaseOsAuth) => {
  void key;
  return (await createOsApiClient(base).listSessionOrganizations()).organizations;
});

async function selectionForBase(base: BaseOsAuth): Promise<OrganizationSelection> {
  const key = base.mode === 'supabase' ? `supabase:${base.accessToken}` : `dev:${base.session.authIdentityId}`;
  const organizations = await listMembershipsForRequest(key, base);
  const previous = (await cookies()).get(SELECTED_ORGANIZATION_COOKIE)?.value;
  return resolveOrganizationSelection(organizations, previous);
}

/** Organization options and current selection for the authenticated layout. */
export async function getServerOrganizationSelection(): Promise<OrganizationSelection | null> {
  const base = await getBaseOsAuth();
  return base ? selectionForBase(base) : null;
}

/**
 * Switches the organization. Accepted only when os-api lists it as one of the
 * caller's active memberships; the selector is re-validated on every request.
 */
export async function selectOrganizationAction(
  formData: FormData,
): Promise<{ error?: string; redirectTo?: string }> {
  const requested = String(formData.get('organizationId') ?? '').trim();
  const selection = await getServerOrganizationSelection().catch(() => null);
  if (!selection || selection.state === 'none') {
    return { error: t('login.errorNoMembership') };
  }
  if (!isSelectableOrganization(selection.organizations, requested)) {
    return { error: 'Esa empresa no está disponible para su cuenta.' };
  }
  persistSelectedOrganization(await cookies(), requested);
  return { redirectTo: DEFAULT_POST_LOGIN };
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
