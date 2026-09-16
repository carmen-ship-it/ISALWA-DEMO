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

/**
 * Pure allowlist + SYNTH org gate for Ver Como start.
 * Accepts staging-resolved personas (no local ~/.isalwa-secrets receipt required).
 * Fail-closed: unknown memberId, missing persona memberId, non-SYNTH live org.
 */
export function resolveQaViewStartTarget(input: {
  targetMemberId: string;
  personas: readonly SynthPersona[];
  /** When provided, must be the SYNTH QA org (never REAL). */
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
    const liveOrgId = input.liveOrganizationId.trim();
    if (!liveOrgId || liveOrgId === QA_REAL_ORGANIZATION_ID) {
      throw new Error('TARGET_NOT_ALLOWED');
    }
    if (liveOrgId !== QA_SYNTH_ORGANIZATION_ID) {
      throw new Error('TARGET_NOT_ALLOWED');
    }
  }

  return { targetMemberId: persona.memberId, persona };
}
