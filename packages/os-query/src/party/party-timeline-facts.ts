import type { PartyTimelineFacts } from '@isalwa/os-contracts';

const TIMELINE_FACT_ALLOWLIST: Record<string, readonly string[]> = {
  'party.created': ['partyId', 'displayName', 'partyKind', 'initialRoleKey'],
  'party.updated': ['partyId', 'displayName', 'legalName'],
  'party.deactivated': ['partyId'],
  'party.reactivated': ['partyId'],
  'party.role.assigned': ['partyId', 'roleKey', 'roleAssignmentId'],
  'party.role.ended': ['partyId', 'roleKey', 'roleAssignmentId'],
  'party.fiscal_identity.changed': ['partyId', 'nit', 'razonSocial'],
  'party.duplicate.suggested': ['partyIdA', 'partyIdB'],
  'party.merge.requested': ['partyId', 'targetPartyId'],
  'party.merged': ['partyId', 'survivorPartyId'],
  'party.merge.rejected': ['partyId', 'targetPartyId'],
  'contact.updated': ['contactId', 'organizationPartyId', 'givenName', 'familyName'],
  'opportunity.created': ['opportunityId', 'title', 'stage', 'status', 'partyId'],
  'opportunity.updated': ['opportunityId', 'title', 'stage', 'status', 'partyId'],
  'opportunity.stage_changed': ['opportunityId', 'previousStage', 'stage'],
  'opportunity.closed': ['opportunityId', 'outcome'],
  'opportunity.owner_assigned': ['opportunityId', 'ownerMemberId', 'previousOwnerMemberId'],
  'quote.created': ['quoteId', 'quoteNumber', 'status', 'partyId', 'opportunityId'],
  'quote.updated': ['quoteId', 'quoteNumber', 'status', 'partyId'],
  'quote.line_added': ['quoteId', 'quoteLineId', 'description', 'quantity'],
  'quote.line_updated': ['quoteId', 'quoteLineId', 'quantity'],
  'quote.line_removed': ['quoteId', 'quoteLineId'],
  'quote.submitted': ['quoteId', 'quoteNumber', 'status', 'totalCentavos'],
  'quote.cancelled': ['quoteId', 'quoteNumber', 'status', 'reason'],
  'order.created': ['orderId', 'orderNumber', 'quoteId', 'partyId', 'totalCentavos'],
  'order.cancelled': ['orderId', 'reason'],
  'work.created': ['workItemId', 'ownerMemberId', 'title', 'subjectType', 'subjectId'],
  'task.reassigned': ['workItemId', 'newOwnerMemberId', 'previousOwnerMemberId'],
  'work.completed': ['workItemId'],
  'work.cancelled': ['workItemId', 'reason'],
  'approval.requested': [
    'approvalRequestId',
    'approverMemberId',
    'workItemId',
    'subjectType',
    'subjectId',
  ],
  'approval.approved': [
    'approvalRequestId',
    'subjectType',
    'subjectId',
    'requestedByMemberId',
    'approverMemberId',
    'decision',
    'decisionByMemberId',
    'decidedAt',
    'reason',
  ],
  'approval.rejected': [
    'approvalRequestId',
    'subjectType',
    'subjectId',
    'requestedByMemberId',
    'approverMemberId',
    'decision',
    'decisionByMemberId',
    'decidedAt',
    'reason',
  ],
};

function isScalarFact(value: unknown): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

export function extractTimelineFacts(
  eventType: string,
  payload: Record<string, unknown> | undefined,
): PartyTimelineFacts {
  const allowlist = TIMELINE_FACT_ALLOWLIST[eventType];
  if (!allowlist || !payload) return {};

  const facts: PartyTimelineFacts = {};
  for (const key of allowlist) {
    const value = payload[key];
    if (isScalarFact(value)) {
      facts[key] = value;
    } else if (typeof value === 'bigint') {
      facts[key] = value.toString();
    }
  }
  return facts;
}
