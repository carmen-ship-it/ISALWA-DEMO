/**
 * Auth provider boundary — OS does NOT store passwords.
 * Production: Auth.js / external provider implements this port.
 */
export type AuthProviderPort = {
  readonly name: string;
  /**
   * Provider creates the invitation and delivers it.
   * `providerUserId` is the provider's user id when the response includes one.
   * It is not proof of control and must not activate OS access by itself.
   */
  createInvite(email: string): Promise<{ inviteRef: string; providerUserId?: string | null }>;
  /** Invalidate active provider sessions — used on suspend (credentials preserved). */
  revokeSessions(providerSubject: string): Promise<void>;
  /** Revoke credentials at provider — password reset/change happen ONLY at provider. */
  revokeCredentials(providerSubject: string): Promise<void>;
  /** Update email at provider after OS governance approval. */
  updateEmail(providerSubject: string, newEmail: string): Promise<void>;
};

export class LocalAuthProviderPort implements AuthProviderPort {
  readonly name = 'local-dev';

  private revoked = new Set<string>();
  private sessionsRevoked = new Set<string>();

  async createInvite(email: string): Promise<{ inviteRef: string }> {
    return { inviteRef: `invite:${email}` };
  }

  async revokeSessions(providerSubject: string): Promise<void> {
    this.sessionsRevoked.add(providerSubject);
  }

  async revokeCredentials(providerSubject: string): Promise<void> {
    this.revoked.add(providerSubject);
    this.sessionsRevoked.add(providerSubject);
  }

  async updateEmail(providerSubject: string, newEmail: string): Promise<void> {
    if (this.revoked.has(providerSubject)) {
      throw new Error('PROVIDER_CREDENTIAL_REVOKED');
    }
    void newEmail;
  }

  isRevoked(providerSubject: string): boolean {
    return this.revoked.has(providerSubject);
  }

  isSessionRevoked(providerSubject: string): boolean {
    return this.sessionsRevoked.has(providerSubject);
  }
}
