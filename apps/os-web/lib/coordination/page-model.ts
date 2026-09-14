import {
  COORDINATION_DECISION_CAPABILITY,
  COORDINATION_EMPTY_COMMITTEE_TITLE,
  coordinationCapabilityFromCargoOrTitle,
  coordinationCommitteeForSession,
  emptyCoordinationCommittee,
  emptyCoordinationLedger,
  hasCoordinationDecisionCapability,
  openCoordinationDecisionsForSession,
  type CoordinationCommittee,
  type CoordinationDecisionRecord,
  type CoordinationLedger,
  type CoordinationMatterInput,
  type CoordinationSession,
} from '@isalwa/os-contracts';
import {
  coordinationMattersFromOperatingFacts,
  unavailableOperatingFacts,
  type CoordinationFactProofs,
  type CoordinationFactsResult,
  type CoordinationOperatingFacts,
} from './facts';

export const COORDINATION_RECORD_BUTTON = 'REGISTRAR DECISIÓN';

/**
 * Explicit assignment only. Cargo and title are ignored.
 * A display label is not a capability.
 */
export function coordinationCapabilitiesForMember(input: {
  grantedCapabilities?: readonly string[] | null;
  cargo?: string | null;
  title?: string | null;
}): readonly string[] {
  const fromCargo = coordinationCapabilityFromCargoOrTitle(input.cargo, input.title);
  const granted = [...(input.grantedCapabilities ?? []), ...fromCargo];
  return granted.filter((scope) => scope.trim() === COORDINATION_DECISION_CAPABILITY);
}

export function canRecordCoordinationDecision(input: {
  organizationId?: string | null;
  grantedCapabilities?: readonly string[] | null;
  cargo?: string | null;
  title?: string | null;
}): boolean {
  if (!input.organizationId?.trim()) return false;
  return hasCoordinationDecisionCapability(coordinationCapabilitiesForMember(input));
}

export type CoordinationPageModel = {
  organizationId: string | null;
  actorMemberId: string | null;
  actorLabel: string | null;
  canRecord: boolean;
  committee: CoordinationCommittee;
  ledger: CoordinationLedger;
  openDecisions: readonly CoordinationDecisionRecord[];
  emptyTitle: typeof COORDINATION_EMPTY_COMMITTEE_TITLE;
  /** Proof of each operating fact. Unavailable is not a zero and carries no foreign count. */
  factProofs: CoordinationFactProofs;
};

function blankToNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function ledgerForSession(
  organizationId: string | null,
  decisions: readonly CoordinationDecisionRecord[] | null | undefined,
): CoordinationLedger {
  if (!organizationId) return emptyCoordinationLedger();
  return {
    decisions: (decisions ?? []).filter((row) => row.organizationId === organizationId),
  };
}

/**
 * Committee comes only from matters the caller already passed.
 * Another tenant's decisions never become items, search hits, or counts.
 * A missing session organization yields an empty page, not the other tenant's titles.
 */
export function buildCoordinationPageModel(input: {
  session?: CoordinationSession | null;
  matters?: readonly CoordinationMatterInput[] | null;
  decisions?: readonly CoordinationDecisionRecord[] | null;
  facts?: CoordinationOperatingFacts | null;
}): CoordinationPageModel {
  const organizationId = blankToNull(input.session?.organizationId);
  const actorMemberId = blankToNull(input.session?.actorMemberId);
  const actorLabel = blankToNull(input.session?.actorLabel);
  const canRecord = canRecordCoordinationDecision({
    organizationId,
    grantedCapabilities: input.session?.grantedCapabilities,
    cargo: input.session?.cargo,
    title: input.session?.title,
  });
  const ledger = ledgerForSession(organizationId, input.decisions);
  const generated = coordinationMattersFromOperatingFacts({
    organizationId,
    facts: input.facts ?? unavailableOperatingFacts(),
  });

  if (!organizationId) {
    return {
      organizationId: null,
      actorMemberId,
      actorLabel,
      canRecord: false,
      committee: emptyCoordinationCommittee(null),
      ledger: emptyCoordinationLedger(),
      openDecisions: [],
      emptyTitle: COORDINATION_EMPTY_COMMITTEE_TITLE,
      factProofs: generated.proofs,
    };
  }

  const committee = coordinationCommitteeForSession({
    session: { organizationId },
    matters: [...(input.matters ?? []), ...generated.matters],
    decisions: input.decisions,
  });
  const open = canRecord
    ? openCoordinationDecisionsForSession({
        session: {
          organizationId,
          actorMemberId,
          actorLabel,
          grantedCapabilities: coordinationCapabilitiesForMember({
            grantedCapabilities: input.session?.grantedCapabilities,
            cargo: input.session?.cargo,
            title: input.session?.title,
          }),
        },
        ledger,
      })
    : { ok: false as const, reason: 'unauthorized_role' as const };

  return {
    organizationId,
    actorMemberId,
    actorLabel,
    canRecord,
    committee: committee.ok ? committee.value : emptyCoordinationCommittee(organizationId),
    ledger,
    openDecisions: open.ok ? open.value : [],
    emptyTitle: COORDINATION_EMPTY_COMMITTEE_TITLE,
    factProofs: generated.proofs,
  };
}

/**
 * No tenant-scoped reader exists for these operating facts in this lane.
 * Do not query an unscoped list to fill the gap.
 */
export function coordinationFactsForSession(
  organizationId: string | null,
): CoordinationFactsResult {
  return coordinationMattersFromOperatingFacts({
    organizationId,
    facts: unavailableOperatingFacts(),
  });
}

/** Member scopes are not on the web session. Title is not consulted. */
export function coordinationGrantedCapabilitiesForSession(_input: {
  memberId?: string | null;
  displayLabel?: string | null;
  cargo?: string | null;
  title?: string | null;
}): readonly string[] {
  return [];
}
