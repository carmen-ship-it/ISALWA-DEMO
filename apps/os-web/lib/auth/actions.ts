'use server';

import { cookies } from 'next/headers';
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

/** Probe os-api with an explicit token when possible (avoids cookie race after sign-in). */
async function validateOsMembershipWithToken(accessToken: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = createOsApiClient({ mode: 'supabase', accessToken });
  const attempt = async () => {
    await client.listAttention({ limit: '1' });
  };

  try {
    await attempt();
    return { ok: true };
  } catch (first) {
    // Free-tier cold start / brief blip — retry once before failing closed.
    if (first instanceof OsApiError && first.kind === 'unavailable') {
      try {
        await new Promise((r) => setTimeout(r, 1500));
        await attempt();
        return { ok: true };
      } catch (second) {
        return { ok: false, error: membershipProbeError(second) };
      }
    }
    return { ok: false, error: membershipProbeError(first) };
  }
}

function membershipProbeError(err: unknown): string {
  if (err instanceof OsApiError) {
    if (err.code === 'ACCESS_REVOKED' || err.kind === 'forbidden') {
      return t('login.errorNoMembership');
    }
    if (err.kind === 'unavailable') {
      return 'El servicio no está disponible temporalmente. Espere unos segundos e intente de nuevo.';
    }
    if (err.kind === 'unauthorized') {
      return t('login.errorNoMembership');
    }
    return err.message;
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

export async function signOutAction(): Promise<{ error?: string }> {
  try {
    await clearWebSession();
  } catch {
    return { error: 'No se pudo cerrar la sesión. Intente de nuevo.' };
  }
  redirect('/login');
}

export async function getServerOsAuthContext() {
  const session = await getServerWebSession();
  if (!session) return null;

  if (session.mode === 'dev' && session.devSession) {
    return { mode: 'dev' as const, session: session.devSession };
  }

  if (session.mode === 'supabase') {
    const token = await getSupabaseAccessToken();
    return { mode: 'supabase' as const, accessToken: token };
  }

  return null;
}
