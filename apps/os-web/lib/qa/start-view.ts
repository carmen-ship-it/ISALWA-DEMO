import {
  QA_REAL_ORGANIZATION_ID,
  QA_SYNTH_ORGANIZATION_ID,
} from '@/lib/qa/constants';
import {
  findSynthPersonaByMemberId,
  isAllowedQaTargetMemberId,
  type SynthPersona,
} from '@/lib/qa/personas';

export type QaViewStartTarget = {
  targetMemberId: string;
  persona: SynthPersona;
};

export type QaSynthRosterItem = {
  email: string;
  memberId: string;
  organizationId?: string;
  grantedScopes?: readonly string[];
};

function assertSynthOrg(organizationId: string): void {
  const liveOrgId = organizationId.trim();
  if (!liveOrgId || liveOrgId === QA_REAL_ORGANIZATION_ID) {
    throw new Error('TARGET_NOT_ALLOWED');
  }
  if (liveOrgId !== QA_SYNTH_ORGANIZATION_ID) {
    throw new Error('TARGET_NOT_ALLOWED');
  }
}

/**
 * Hosted Ver Como allowlist: staging GET /qa/synth-personas rows.
 * Does not require ~/.isalwa-secrets. Fail-closed for REAL / unknown ids.
 */
export function selectHostedQaViewRosterTarget(input: {
  targetMemberId: string;
  items: readonly QaSynthRosterItem[];
  liveOrganizationId?: string | null;
}): { memberId: string; organizationId: string; email: string } {
  const targetMemberId = input.targetMemberId.trim();
  if (!targetMemberId) throw new Error('TARGET_REQUIRED');

  const row = input.items.find((item) => item.memberId.trim() === targetMemberId);
  if (!row?.memberId) throw new Error('TARGET_NOT_ALLOWED');

  const rosterOrg = (row.organizationId ?? '').trim();
  if (rosterOrg === QA_REAL_ORGANIZATION_ID) throw new Error('TARGET_NOT_ALLOWED');
  if (rosterOrg && rosterOrg !== QA_SYNTH_ORGANIZATION_ID) {
    throw new Error('TARGET_NOT_ALLOWED');
  }

  if (input.liveOrganizationId !== undefined && input.liveOrganizationId !== null) {
    assertSynthOrg(input.liveOrganizationId);
  }

  return {
    memberId: row.memberId.trim(),
    organizationId: rosterOrg || QA_SYNTH_ORGANIZATION_ID,
    email: row.email,
  };
}

/**
 * Pure allowlist + SYNTH org gate for Ver Como start.
 * Accepts staging-resolved personas (no local ~/.isalwa-secrets receipt required).
 */
export function resolveQaViewStartTarget(input: {
  targetMemberId: string;
  personas: readonly SynthPersona[];
  liveOrganizationId?: string | null;
}): QaViewStartTarget {
  const targetMemberId = input.targetMemberId.trim();
  if (!targetMemberId) {
    throw new Error('TARGET_REQUIRED');
  }
  if (!isAllowedQaTargetMemberId(targetMemberId, input.personas)) {
    throw new Error('TARGET_NOT_ALLOWED');
  }
  const persona = findSynthPersonaByMemberId(targetMemberId, input.personas);
  if (!persona?.memberId) {
    throw new Error('TARGET_MEMBER_UNRESOLVED');
  }

  if (input.liveOrganizationId !== undefined && input.liveOrganizationId !== null) {
    assertSynthOrg(input.liveOrganizationId);
  }

  return { targetMemberId: persona.memberId, persona };
}
