import type { AuthProviderPort } from './auth-provider';

/**
 * Where the provider sends the invitee after they open the invitation.
 * Must be allowlisted on the Supabase Auth redirect list.
 * Does not accept a browser-supplied URL.
 */
export function resolveInviteRedirectUrl(
  env: { OS_AUTH_INVITE_REDIRECT_URL?: string; OS_CORS_ORIGINS?: string } = process.env,
): string | undefined {
  const explicit = env.OS_AUTH_INVITE_REDIRECT_URL?.trim();
  if (explicit) {
    return inviteRedirectOrThrow(explicit);
  }
  const origin = env.OS_CORS_ORIGINS?.split(',')
    .map((value) => value.trim())
    .find(Boolean);
  if (!origin) return undefined;
  return inviteRedirectOrThrow(`${origin.replace(/\/$/, '')}/auth/complete-invite`);
}

function inviteRedirectOrThrow(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('PROVIDER_NOT_CONFIGURED');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('PROVIDER_NOT_CONFIGURED');
  }
  if (url.username || url.password || url.hash) {
    throw new Error('PROVIDER_NOT_CONFIGURED');
  }
  return url.toString();
}

async function readProviderUserId(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { id?: unknown };
    return typeof body.id === 'string' && body.id.trim() ? body.id.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Supabase Auth provider adapter — credentials live in Supabase Auth only.
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for invite/revoke/email admin ops.
 * JWT verification for sessions uses anon key in os-api session resolver.
 */
export class SupabaseAuthProviderPort implements AuthProviderPort {
  readonly name = 'supabase';

  private readonly adminUrl = process.env.SUPABASE_URL;
  private readonly serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  private assertAdminConfigured(): void {
    if (!this.adminUrl || !this.serviceRoleKey) {
      throw new Error('PROVIDER_NOT_CONFIGURED');
    }
  }

  async createInvite(email: string): Promise<{ inviteRef: string; providerUserId?: string | null }> {
    this.assertAdminConfigured();
    const redirectTo = resolveInviteRedirectUrl();
    const res = await fetch(`${this.adminUrl}/auth/v1/invite`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.serviceRoleKey}`,
        apikey: this.serviceRoleKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(redirectTo ? { email, redirect_to: redirectTo } : { email }),
    });
    if (!res.ok) {
      throw new Error('PROVIDER_INVITE_FAILED');
    }
    const providerUserId = await readProviderUserId(res);
    return { inviteRef: `supabase-invite:${email}`, providerUserId };
  }

  async revokeSessions(providerSubject: string): Promise<void> {
    this.assertAdminConfigured();
    const res = await fetch(`${this.adminUrl}/auth/v1/admin/users/${providerSubject}/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.serviceRoleKey}`,
        apikey: this.serviceRoleKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ scope: 'global' }),
    });
    if (!res.ok && res.status !== 404) {
      throw new Error('PROVIDER_SESSION_REVOKE_FAILED');
    }
  }

  async revokeCredentials(providerSubject: string): Promise<void> {
    this.assertAdminConfigured();
    const res = await fetch(`${this.adminUrl}/auth/v1/admin/users/${providerSubject}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.serviceRoleKey}`,
        apikey: this.serviceRoleKey!,
      },
    });
    if (!res.ok && res.status !== 404) {
      throw new Error('PROVIDER_REVOKE_FAILED');
    }
  }

  async updateEmail(providerSubject: string, newEmail: string): Promise<void> {
    this.assertAdminConfigured();
    const res = await fetch(`${this.adminUrl}/auth/v1/admin/users/${providerSubject}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.serviceRoleKey}`,
        apikey: this.serviceRoleKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: newEmail }),
    });
    if (!res.ok) {
      throw new Error('PROVIDER_EMAIL_UPDATE_FAILED');
    }
  }
}
