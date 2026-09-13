'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getOsAuthMode, getOsApiBaseUrl, isSupabaseConfigured } from '@/lib/auth/config';
import { DEFAULT_POST_LOGIN, OS_DEV_SESSION_COOKIE } from '@/lib/auth/constants';
import {
  decodeDevSession,
  encodeDevSession,
  type DevSession,
} from '@/lib/auth/dev-session';
import { createServerSupabaseClient } from '@/lib/auth/supabase/server';

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

async function validateOsMembership(session: WebSession): Promise<boolean> {
  try {
    const client =
      session.mode === 'supabase'
        ? createOsApiClient({
            mode: 'supabase',
            accessToken: await getSupabaseAccessToken(),
          })
        : createOsApiClient({ mode: 'dev', session: session.devSession! });

    await client.listAttention({ limit: '1' });
    return true;
  } catch {
    return false;
  }
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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { error: 'Correo o contraseña incorrectos.' };
      }

      const webSession = await getServerWebSession();
      if (!webSession || !(await validateOsMembership(webSession))) {
        await supabase.auth.signOut();
        return {
          error: 'Su cuenta no está vinculada a la empresa. Contacte a administración.',
        };
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

export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // continue
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete(OS_DEV_SESSION_COOKIE);
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
