import type { PartyTimelineFacts } from '@isalwa/os-contracts';

const TIMELINE_FACT_ALLOWLIST: Record<string, readonly string[]> = {
  'party.created': ['partyId', 'displayName', 'partyKind', 'initialRoleKey'],
  'party.updated': [
    'partyId',
    'displayName',
    'legalName',
    'previousDisplayName',
    'previousLegalName',
    'changedFields',
    'changeKind',
    'reason',
    'version',
    'source',
  ],
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
  // Masked numbers only; full numbers stay in the event payload and audit.
  'contact.phone.changed': [
    'partyId',
    'contactId',
    'previousPhoneMasked',
    'phoneMasked',
    'reason',
    'reasonNote',
    'verificationMethod',
    'version',
  ],
  'contact.phone.retired': ['partyId', 'contactId', 'retiredPhoneMasked', 'reason', 'reasonNote', 'version'],
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
  'quote.send_recorded': [
    'quoteId',
    'quoteNumber',
    'partyId',
    'channel',
    'note',
    'providerSend',
  ],
  'quote.cancelled': ['quoteId', 'quoteNumber', 'status', 'reason'],
  'order.created': ['orderId', 'orderNumber', 'quoteId', 'partyId', 'totalCentavos'],
  'order.cancelled': ['orderId', 'reason'],
  'delivery_note.created': [
    'deliveryNoteId',
    'orderId',
    'partyId',
    'internalDocumentRef',
    'numberingPolicy',
  ],
  'delivery_note.corrected': ['deliveryNoteId', 'correctsNoteId', 'partyId', 'orderId', 'reason'],
  'warehouse_exit.recorded': ['warehouseExitId', 'orderId', 'partyId', 'deliveryNoteId'],
  'customer_delivery.recorded': ['deliveryId', 'orderId', 'partyId', 'deliveryNoteId', 'receivedBy'],
  'finished_goods.received': [
    'partyId',
    'orderId',
    'orderLineId',
    'productId',
    'quantity',
    'note',
    'allocatesToOrder',
    'postsStock',
  ],
  'finished_goods.corrected': [
    'partyId',
    'orderId',
    'orderLineId',
    'productId',
    'quantity',
    'note',
    'allocatesToOrder',
    'postsStock',
  ],
  'commercial_account.owner_reassigned': [
    'commercialAccountId',
    'partyId',
    'previousOwnerMemberId',
    'ownerMemberId',
  ],
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

/**
 * T03 contract C2: customer-field events whose names, legal/fiscal values, free-text reasons
 * and numbers are shown only to viewers who may edit that customer's fields. Other viewers get
 * these keys only. Commercial-record notes keep the record's own visibility.
 */
const TIMELINE_FIELD_SUMMARY: Record<string, readonly string[]> = {
  'party.created': ['partyId', 'partyKind', 'initialRoleKey'],
  'party.updated': ['partyId', 'changedFields', 'version', 'source'],
  'party.fiscal_identity.changed': ['partyId'],
  'contact.updated': ['contactId', 'organizationPartyId'],
  'contact.phone.changed': ['partyId', 'contactId', 'reason', 'version'],
  'contact.phone.retired': ['partyId', 'contactId', 'reason', 'version'],
};

export function timelineFactsForViewer(
  eventType: string,
  facts: PartyTimelineFacts,
  fieldDetail: boolean,
): { facts: PartyTimelineFacts; detail: 'full' | 'summary' } {
  const summaryKeys = TIMELINE_FIELD_SUMMARY[eventType];
  if (fieldDetail || !summaryKeys) return { facts, detail: 'full' };
  const summary: PartyTimelineFacts = {};
  for (const key of summaryKeys) {
    if (key in facts) summary[key] = facts[key]!;
  }
  return { facts: summary, detail: 'summary' };
}
