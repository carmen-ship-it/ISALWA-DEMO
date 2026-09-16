import { computeEffectiveScopes } from '@isalwa/os-domain';
import {
  V1_PLANNED_ASSIGNMENTS,
  type V1PlannedFunctionId,
} from '@isalwa/os-contracts';
import type { OsWorkforceStore } from '@isalwa/os-workforce';

export const QA_SYNTH_ORGANIZATION_ID = '01M2JKF77TXMJNDTKNCYNHH9G5' as const;
export const QA_REAL_ORGANIZATION_ID = '01M2DV9F0V5DXS4G89AKF4D5SR' as const;

/** Matches Wave 2 fixture ROLE_EMAILS (business personas only). */
export const WAVE2_FIXTURE_EMAIL_BY_FUNCTION: Record<V1PlannedFunctionId, string> = {
  'asesor-comercial': 'w2.asesor@isalwa.demo',
  'jefe-comercial': 'w2.jefe@isalwa.demo',
  'gerente-general': 'w2.gerente@isalwa.demo',
  'encargado-produccion': 'w2.produccion@isalwa.demo',
  'encargado-almacen': 'w2.almacen@isalwa.demo',
  'encargada-compras': 'w2.compras@isalwa.demo',
  contabilidad: 'w2.contabilidad@isalwa.demo',
  'auxiliar-coordinacion': 'w2.coordinacion@isalwa.demo',
  'isalwa-manager': 'w2.owner@isalwa.demo',
};

export type QaSynthRosterMember = {
  functionId: V1PlannedFunctionId;
  email: string;
  memberId: string;
  grantedScopes: string[];
};

export type QaSynthRoster = {
  organizationId: typeof QA_SYNTH_ORGANIZATION_ID;
  members: QaSynthRosterMember[];
};

/**
 * Resolve SYNTH Wave 2 fixture members by email for hosted Ver como.
 * Fail-closed: only SYNTH org; never REAL; skip unresolved emails.
 */
export async function resolveQaSynthRoster(
  store: OsWorkforceStore,
  effectiveAt: Date = new Date(),
): Promise<QaSynthRoster> {
  const members: QaSynthRosterMember[] = [];

  for (const row of V1_PLANNED_ASSIGNMENTS) {
    const functionId = row.functionId;
    const email = WAVE2_FIXTURE_EMAIL_BY_FUNCTION[functionId];
    const memberId = await resolveSynthMemberIdByEmail(store, email);
    if (!memberId) continue;

    const roles = await store.listRoleAssignmentsForMember(memberId, QA_SYNTH_ORGANIZATION_ID);
    const delegations = await store.listDelegationsForDelegate(
      memberId,
      QA_SYNTH_ORGANIZATION_ID,
    );
    const grantedScopes = computeEffectiveScopes(
      roles.map((r) => ({
        roleKey: r.roleKey,
        effectiveAt: r.effectiveAt,
        endedAt: r.endedAt,
      })),
      delegations.map((d) => ({
        scopes: d.scopes,
        startsAt: d.startsAt,
        expiresAt: d.expiresAt,
        revokedAt: d.revokedAt,
        delegatorMemberId: d.delegatorMemberId,
      })),
      effectiveAt,
    );

    members.push({
      functionId,
      email,
      memberId,
      grantedScopes,
    });
  }

  return {
    organizationId: QA_SYNTH_ORGANIZATION_ID,
    members,
  };
}

async function resolveSynthMemberIdByEmail(
  store: OsWorkforceStore,
  email: string,
): Promise<string | null> {
  const identities = await store.listAuthIdentitiesByProviderEmail('supabase', email);
  const active = identities.filter((row) => row.status === 'active');
  if (active.length === 0) return null;

  const resolved = new Set<string>();
  for (const identity of active) {
    const members = await store.listMembersForPerson(
      identity.personId,
      QA_SYNTH_ORGANIZATION_ID,
    );
    for (const member of members) {
      if (member.accessStatus !== 'active') continue;
      if (member.organizationId === QA_REAL_ORGANIZATION_ID) continue;
      if (member.organizationId !== QA_SYNTH_ORGANIZATION_ID) continue;
      resolved.add(member.id);
    }
  }

  if (resolved.size !== 1) return null;
  return [...resolved][0]!;
}
