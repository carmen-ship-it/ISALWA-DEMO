import { INVITE_COMPLETION_CODES, type InviteCompletionCode } from '@isalwa/os-workforce';

export type VerifiedProviderUser = {
  id: string;
  email?: string | null;
  emailConfirmedAt?: string | null;
};

export type InviteCompletionHttpDecision =
  | { ok: false; status: 401 | 403; code: InviteCompletionCode | 'email_unverified' }
  | { ok: true; providerSubject: string; verifiedEmail: string };

const DENIAL_CODES = new Set<InviteCompletionCode>([
  'not_invited',
  'wrong_account',
  'ambiguous',
  'suspended',
  'terminated',
  'rebind_denied',
]);

function readBodyEmail(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const email = (body as { email?: unknown }).email;
  return typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;
}

/**
 * Authority comes only from the verified provider user.
 * Body memberId, organizationId, providerSubject, and email are never used as lookup keys.
 * A conflicting body email fails closed.
 */
export function decideInviteCompletionHttp(
  user: VerifiedProviderUser | null,
  body: unknown,
): InviteCompletionHttpDecision {
  const providerSubject = user?.id?.trim() ?? '';
  const verifiedEmail = user?.email?.trim().toLowerCase() ?? '';
  if (!user || !providerSubject || !verifiedEmail.includes('@')) {
    return { ok: false, status: 401, code: 'unauthenticated' };
  }
  if (!user.emailConfirmedAt?.trim()) {
    return { ok: false, status: 401, code: 'email_unverified' };
  }
  const claimedEmail = readBodyEmail(body);
  if (claimedEmail && claimedEmail !== verifiedEmail) {
    return { ok: false, status: 403, code: 'wrong_account' };
  }
  return { ok: true, providerSubject, verifiedEmail };
}

export function inviteCompletionHttpStatus(code: InviteCompletionCode): number {
  if (code === 'activated' || code === 'already_completed') return 200;
  if (code === 'unauthenticated') return 401;
  if (DENIAL_CODES.has(code)) return 403;
  return 403;
}

export function isInviteCompletionCode(value: string): value is InviteCompletionCode {
  return (INVITE_COMPLETION_CODES as readonly string[]).includes(value);
}
