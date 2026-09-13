import type { BusinessEventEnvelope } from '@isalwa/os-contracts';
import {
  isApprovalSubjectType,
  isOsCommercialEventType,
  isOsWorkEventType,
} from '@isalwa/os-contracts';
import type { OsCommercialStore } from '@isalwa/os-commercial';
import type { OsWorkStore } from '@isalwa/os-work';

export type PartyTimelineAssociationDeps = {
  commercialStore: OsCommercialStore;
  workStore: OsWorkStore;
};

async function resolvePartyFromWorkSubject(
  deps: PartyTimelineAssociationDeps,
  organizationId: string,
  subjectType: string | null | undefined,
  subjectId: string | null | undefined,
): Promise<string | null> {
  if (!subjectType || !subjectId) return null;

  if (subjectType === 'party') {
    const ok = await deps.workStore.partyExistsInOrg(organizationId, subjectId);
    return ok ? subjectId : null;
  }

  if (subjectType === 'commercial_account') {
    const account = await deps.commercialStore.getCommercialAccountInOrg(
      organizationId,
      subjectId,
    );
    return account?.partyId ?? null;
  }

  // organization_member and work_item work subjects have no deterministic Party link.
  return null;
}

async function resolvePartyFromApprovalSubject(
  deps: PartyTimelineAssociationDeps,
  organizationId: string,
  subjectType: string,
  subjectId: string,
): Promise<string | null> {
  if (!isApprovalSubjectType(subjectType)) {
    return null;
  }

  if (subjectType === 'party') {
    const ok = await deps.workStore.partyExistsInOrg(organizationId, subjectId);
    return ok ? subjectId : null;
  }

  if (subjectType === 'organization_member') {
    return null;
  }

  if (subjectType === 'work_item') {
    const work = await deps.workStore.getWorkItemInOrg(organizationId, subjectId);
    if (!work) return null;
    return resolvePartyFromWorkSubject(
      deps,
      organizationId,
      work.subjectType,
      work.subjectId,
    );
  }

  return null;
}

async function resolvePartyForWorkEvent(
  deps: PartyTimelineAssociationDeps,
  envelope: BusinessEventEnvelope,
): Promise<string | null> {
  const orgId = envelope.organizationId;
  const workItemId = envelope.primaryEntityId;
  const work = await deps.workStore.getWorkItemInOrg(orgId, workItemId);
  if (work) {
    return resolvePartyFromWorkSubject(deps, orgId, work.subjectType, work.subjectId);
  }

  const payload = (envelope.payload ?? {}) as Record<string, unknown>;
  const subjectType = typeof payload.subjectType === 'string' ? payload.subjectType : null;
  const subjectId = typeof payload.subjectId === 'string' ? payload.subjectId : null;
  return resolvePartyFromWorkSubject(deps, orgId, subjectType, subjectId);
}

async function resolvePartyForApprovalEvent(
  deps: PartyTimelineAssociationDeps,
  envelope: BusinessEventEnvelope,
): Promise<string | null> {
  const payload = (envelope.payload ?? {}) as Record<string, unknown>;
  const subjectType = typeof payload.subjectType === 'string' ? payload.subjectType : null;
  const subjectId = typeof payload.subjectId === 'string' ? payload.subjectId : null;
  if (!subjectType || !subjectId) return null;
  return resolvePartyFromApprovalSubject(deps, envelope.organizationId, subjectType, subjectId);
}

export async function resolvePartyIdForTimeline(
  deps: PartyTimelineAssociationDeps,
  envelope: BusinessEventEnvelope,
): Promise<string | null> {
  const payload = (envelope.payload ?? {}) as Record<string, unknown>;

  if (isOsWorkEventType(envelope.eventType)) {
    if (envelope.eventType.startsWith('approval.')) {
      return resolvePartyForApprovalEvent(deps, envelope);
    }
    if (envelope.primaryEntityType === 'work_item') {
      return resolvePartyForWorkEvent(deps, envelope);
    }
    return null;
  }

  if (envelope.primaryEntityType === 'party') {
    return envelope.primaryEntityId;
  }

  if (typeof payload.partyId === 'string') {
    return payload.partyId;
  }

  if (envelope.eventType === 'contact.updated' && typeof payload.organizationPartyId === 'string') {
    return payload.organizationPartyId;
  }

  if (!isOsCommercialEventType(envelope.eventType)) {
    return null;
  }

  const orgId = envelope.organizationId;

  if (envelope.primaryEntityType === 'opportunity') {
    const row = await deps.commercialStore.getOpportunityInOrg(orgId, envelope.primaryEntityId);
    return row?.partyId ?? null;
  }

  if (envelope.primaryEntityType === 'quote') {
    const row = await deps.commercialStore.getQuoteInOrg(orgId, envelope.primaryEntityId);
    return row?.partyId ?? null;
  }

  if (envelope.primaryEntityType === 'order') {
    const row = await deps.commercialStore.getOrderInOrg(orgId, envelope.primaryEntityId);
    return row?.partyId ?? null;
  }

  const quoteId = typeof payload.quoteId === 'string' ? payload.quoteId : null;
  if (quoteId) {
    const row = await deps.commercialStore.getQuoteInOrg(orgId, quoteId);
    return row?.partyId ?? null;
  }

  const opportunityId = typeof payload.opportunityId === 'string' ? payload.opportunityId : null;
  if (opportunityId) {
    const row = await deps.commercialStore.getOpportunityInOrg(orgId, opportunityId);
    return row?.partyId ?? null;
  }

  const orderId = typeof payload.orderId === 'string' ? payload.orderId : null;
  if (orderId) {
    const row = await deps.commercialStore.getOrderInOrg(orgId, orderId);
    return row?.partyId ?? null;
  }

  return null;
}
