import type { AuthProviderPort } from './auth-provider';

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

  async createInvite(email: string): Promise<{ inviteRef: string }> {
    this.assertAdminConfigured();
    const res = await fetch(`${this.adminUrl}/auth/v1/invite`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.serviceRoleKey}`,
        apikey: this.serviceRoleKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      throw new Error('PROVIDER_INVITE_FAILED');
    }
    return { inviteRef: `supabase-invite:${email}` };
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
