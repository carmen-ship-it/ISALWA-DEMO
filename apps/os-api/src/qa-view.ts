import { createHmac, timingSafeEqual } from 'node:crypto';
import { computeEffectiveScopes } from '@isalwa/os-domain';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import type { OsSession } from './os-session';
import { getRuntimeProfile } from './env-validation';

const SYNTH_ORG = '01M2JKF77TXMJNDTKNCYNHH9G5';
const HEADER = 'x-os-qa-view';

function qaEnabled(): boolean {
  if (getRuntimeProfile() !== 'staging') return false;
  return process.env.OS_QA_CONTROL_ENABLED?.trim() === 'true';
}

function signingSecret(): string | null {
  return process.env.OS_QA_SIGNING_SECRET?.trim() || process.env.SUPABASE_JWT_SECRET?.trim() || null;
}

function parseSigned(raw: string): {
  actingMemberId: string;
  targetMemberId: string;
  synthOrgId: string;
  exp: number;
} | null {
  const secret = signingSecret();
  if (!secret) return null;
  const dot = raw.lastIndexOf('.');
  if (dot <= 0) return null;
  const encoded = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = createHmac('sha256', secret).update(encoded).digest('base64url');
  try {
    const a = Buffer.from(sig, 'base64url');
    const b = Buffer.from(expected, 'base64url');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const json = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      actingMemberId?: string;
      targetMemberId?: string;
      synthOrgId?: string;
      exp?: number;
    };
    if (!json.actingMemberId || !json.targetMemberId || !json.synthOrgId || !json.exp) return null;
    if (json.exp <= Math.floor(Date.now() / 1000)) return null;
    // Only the configured SYNTH QA org is a valid Ver Como target (never REAL).
    if (json.synthOrgId !== SYNTH_ORG) return null;
    return {
      actingMemberId: json.actingMemberId,
      targetMemberId: json.targetMemberId,
      synthOrgId: json.synthOrgId,
      exp: json.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Staging-only: operator keeps audit identity; product session becomes SYNTH target.
 */
export async function applyQaViewIfPresent(
  req: { header(name: string): string | undefined },
  store: OsWorkforceStore,
  session: OsSession,
): Promise<OsSession> {
  if (!qaEnabled()) return session;
  if (!session.grantedScopes.includes('qa.access')) return session;
  const raw = req.header(HEADER)?.trim();
  if (!raw) return session;
  const view = parseSigned(raw);
  if (!view) return session;
  if (view.actingMemberId !== session.actorMemberId) return session;

  const target = await store.getMemberInOrg(SYNTH_ORG, view.targetMemberId);
  if (!target || target.accessStatus !== 'active') throw new Error('PERMISSION_DENIED');
  const roles = await store.listRoleAssignmentsForMember(target.id, SYNTH_ORG);
  const delegations = await store.listDelegationsForDelegate(target.id, SYNTH_ORG);
  const grantedScopes = computeEffectiveScopes(
    roles.map((r) => ({ roleKey: r.roleKey, effectiveAt: r.effectiveAt, endedAt: r.endedAt })),
    delegations.map((d) => ({
      scopes: d.scopes,
      startsAt: d.startsAt,
      expiresAt: d.expiresAt,
      revokedAt: d.revokedAt,
      delegatorMemberId: d.delegatorMemberId,
    })),
    session.effectiveAt,
  );

  return {
    ...session,
    organizationId: SYNTH_ORG,
    actorMemberId: target.id,
    personId: target.personId,
    grantedScopes,
    auditActorMemberId: session.actorMemberId,
  };
}
