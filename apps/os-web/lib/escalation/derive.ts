import type { AttentionItemReadModel } from '@isalwa/os-contracts';
import { memberDisplayName } from '../workforce/labels';
import { formatDueDate, isWorkOverdue } from '../work/labels';
import { issueIdentityFromAttentionKey } from '../work/issue-identity';
import { ESCALATION_COPY } from './copy';
import type {
  AwarenessRung,
  EscalationApprovalFact,
  EscalationBlocker,
  EscalationChain,
  EscalationContact,
  EscalationGuidance,
  EscalationImpact,
  EscalationInput,
  EscalationLimits,
  EscalationLookup,
  EscalationMember,
  EscalationPolicyInput,
  EscalationRole,
  EscalationStage,
  InformTarget,
  RelatedPerson,
} from './types';

const LIMITS: EscalationLimits = {
  reassignsOwner: false,
  changesApprover: false,
  grantsAuthority: false,
  transfersAccount: false,
  sendsNotification: false,
  callsProvider: false,
};

const ROLE_RANK: Record<EscalationRole, number> = {
  approver: 0,
  owner: 1,
  attention: 2,
  requester: 3,
  creator: 4,
  manager: 5,
  executive: 6,
};

const STAGE_RANK: Record<EscalationStage, number> = {
  suggested: 1,
  needs_attention: 2,
  overdue: 3,
  recorded: 4,
};

type AcceptedPolicy = {
  informManagerWhen: 'already_overdue' | 'pending_approval' | null;
  informExecutiveWhen: 'caller_marked_prolonged' | null;
  prolongedMarked: boolean;
  executiveMemberId: string | null;
};

export function escalationLimits(): EscalationLimits {
  return LIMITS;
}

export function hasEscalationContent(guidance: EscalationGuidance): boolean {
  return (
    guidance.stage !== null ||
    guidance.blockers.length > 0 ||
    guidance.mayAffect.length > 0 ||
    guidance.contact !== null
  );
}

/**
 * Pure view of already-loaded facts. Does not write, notify, reassign, or
 * invent a deadline. A past date does not upgrade an attention type.
 */
export function deriveEscalationGuidance(input: EscalationInput): EscalationGuidance {
  const members = input.members ?? [];
  const approval = pendingApproval(input.approval);
  const stage = resolveStage(input, approval);
  const blockers = resolveBlockers(input, approval);
  const mayAffect = resolveImpacts(input, approval);
  const relatedPeople = resolveRelatedPeople(input, approval, members);
  const contact = resolveContact(input, approval, members);
  const policy = acceptPolicy(input.policy);
  const alsoInform = resolveAlsoInform({ stage, approval, contact, members, policy });
  const notes = resolveNotes(input, contact, members);
  const showPath = stage !== null || blockers.length > 0 || contact !== null;

  return {
    issueId: resolveIssueId(input),
    listKey: resolveListKey(input),
    stage,
    stageLabel: stageLabel(stage),
    blockers,
    mayAffect,
    relatedPeople,
    contact,
    rungs: showPath ? resolveRungs(contact, alsoInform) : [],
    alsoInform,
    notes,
    awarenessNote: showPath ? ESCALATION_COPY.awareness : null,
    limits: LIMITS,
  };
}

export function escalationInputFromAttention(
  item: AttentionItemReadModel,
  lookup: EscalationLookup = {},
): EscalationInput {
  const work = lookup.works?.find((candidate) => candidate.workItemId === item.workItemId) ?? null;
  const approval =
    lookup.approvals?.find((candidate) => candidate.approvalRequestId === item.approvalRequestId) ??
    null;
  const chain = matchChain(item, approval, lookup.chains);
  const partyId = item.subjectType === 'party' ? item.subjectId : chain?.partyId ?? null;
  const issue = issueIdentityFromAttentionKey(item.attentionKey);
  const recorded =
    issue && lookup.recordedIssueIds?.includes(issue.issueId) ? ({ recorded: true } as const) : null;

  return {
    attention: item,
    work,
    approval,
    members: lookup.members,
    chain,
    customerWaiting: partyId ? Boolean(lookup.customerWaitingPartyIds?.includes(partyId)) : false,
    recordedEscalation: recorded,
    policy: lookup.policy,
    asOf: lookup.asOf,
  };
}

export function deriveEscalationFromAttention(
  items: readonly AttentionItemReadModel[],
  lookup: EscalationLookup = {},
): EscalationGuidance[] {
  return mergeEscalationGuidance(items.map((item) => deriveEscalationGuidance(escalationInputFromAttention(item, lookup))));
}

/** One issue stays one guidance, even if attention shows it in more than one place. */
export function mergeEscalationGuidance(items: readonly EscalationGuidance[]): EscalationGuidance[] {
  const groups = new Map<string, EscalationGuidance>();
  const order: string[] = [];

  for (const item of items) {
    const key = item.issueId ?? item.listKey;
    const current = groups.get(key);
    if (!current) {
      groups.set(key, item);
      order.push(key);
      continue;
    }
    groups.set(key, mergePair(current, item));
  }

  return order
    .map((key) => groups.get(key))
    .filter((item): item is EscalationGuidance => Boolean(item))
    .sort(compareGuidance);
}

function mergePair(left: EscalationGuidance, right: EscalationGuidance): EscalationGuidance {
  const stage = higherStage(left.stage, right.stage);
  const contact = preferContact(left.contact, right.contact);
  const alsoInform = unionBy(left.alsoInform, right.alsoInform, (item) => `${item.audience}:${item.memberId}`);
  return {
    issueId: left.issueId ?? right.issueId,
    listKey: left.issueId ?? left.listKey,
    stage,
    stageLabel: stageLabel(stage),
    blockers: unionBy(left.blockers, right.blockers, (item) => item.code).sort(compareBlockers),
    mayAffect: unionBy(left.mayAffect, right.mayAffect, (item) => item.code),
    relatedPeople: collapsePeople([...left.relatedPeople, ...right.relatedPeople]),
    contact,
    rungs: contact || stage ? resolveRungs(contact, alsoInform) : [],
    alsoInform,
    notes: [...new Set([...left.notes, ...right.notes])],
    awarenessNote: left.awarenessNote ?? right.awarenessNote,
    limits: LIMITS,
  };
}

function resolveStage(
  input: EscalationInput,
  approval: EscalationApprovalFact | null,
): EscalationStage | null {
  if (input.recordedEscalation?.recorded === true) return 'recorded';

  const attention = activeAttention(input.attention);
  if (attention?.attentionType === 'overdue_work') return 'overdue';
  if (attention?.attentionType === 'pending_approval' || attention?.attentionType === 'reassigned_work') {
    return 'needs_attention';
  }
  if (attention?.attentionType === 'open_work_assigned') return 'suggested';

  if (!attention && input.work && input.asOf && isWorkOverdue(input.work, input.asOf)) return 'overdue';
  if (!attention && approval) return 'needs_attention';
  if (!attention && input.work?.status === 'open') return 'suggested';
  return null;
}

function resolveBlockers(
  input: EscalationInput,
  approval: EscalationApprovalFact | null,
): EscalationBlocker[] {
  const blockers: EscalationBlocker[] = [];
  if (approval) {
    blockers.push({
      code: 'pending_approval',
      label: ESCALATION_COPY.blockers.pendingApproval,
      detail: approvalDetail(approval.subjectType),
    });
  }

  const attention = activeAttention(input.attention);
  const overdueFromAttention = attention?.attentionType === 'overdue_work';
  const overdueFromWork = !attention && input.work && input.asOf ? isWorkOverdue(input.work, input.asOf) : false;
  if (overdueFromAttention || overdueFromWork) {
    blockers.push({
      code: 'overdue_work',
      label: ESCALATION_COPY.blockers.overdueWork,
      detail: overdueDetail(input, attention),
    });
  }
  return blockers;
}

function resolveImpacts(
  input: EscalationInput,
  approval: EscalationApprovalFact | null,
): EscalationImpact[] {
  const impacts: EscalationImpact[] = [];
  if (canAffectOrderCreation(input.chain, approval)) {
    impacts.push({ code: 'order_creation', label: ESCALATION_COPY.impact.orderCreation });
  }
  if (input.customerWaiting === true && (approval !== null || stageSuggestsWaiting(input))) {
    impacts.push({ code: 'customer_reply', label: ESCALATION_COPY.impact.customerReply });
  }
  return impacts;
}

function canAffectOrderCreation(
  chain: EscalationChain | null | undefined,
  approval: EscalationApprovalFact | null,
): boolean {
  if (!approval || approval.subjectType !== 'quote') return false;
  if (!chain || chain.ordersLoaded !== true) return false;
  if (chain.quoteStatus === 'cancelled') return false;
  if (chain.quoteId && chain.quoteId !== approval.subjectId) return false;
  return !chain.orderId;
}

function stageSuggestsWaiting(input: EscalationInput): boolean {
  const attention = activeAttention(input.attention);
  if (attention?.attentionType === 'overdue_work' || attention?.attentionType === 'reassigned_work') return true;
  if (attention?.attentionType === 'open_work_assigned') return true;
  return Boolean(input.work && input.work.status === 'open');
}

function resolveRelatedPeople(
  input: EscalationInput,
  approval: EscalationApprovalFact | null,
  members: readonly EscalationMember[],
): RelatedPerson[] {
  const people: RelatedPerson[] = [];
  const push = (memberId: string | null | undefined, role: EscalationRole) => {
    const id = memberId?.trim();
    if (!id) return;
    people.push(person(id, role, members));
  };

  push(approval?.approverMemberId, 'approver');
  push(input.work?.ownerMemberId, 'owner');
  push(activeAttention(input.attention)?.memberId, 'attention');
  push(approval?.requestedByMemberId, 'requester');
  push(input.work?.createdByMemberId, 'creator');

  const holderIds = new Set(people.map((item) => item.memberId));
  for (const holderId of holderIds) {
    const holder = members.find((member) => member.memberId === holderId);
    push(holder?.managerMemberId, 'manager');
  }

  return collapsePeople(people);
}

function resolveContact(
  input: EscalationInput,
  approval: EscalationApprovalFact | null,
  members: readonly EscalationMember[],
): EscalationContact | null {
  if (approval?.approverMemberId.trim()) {
    return contact(approval.approverMemberId, 'approver', members);
  }
  const ownerId = input.work?.ownerMemberId.trim() || activeAttention(input.attention)?.memberId.trim();
  if (!ownerId) return null;
  if (input.work?.status === 'completed' || input.work?.status === 'cancelled') {
    if (!activeAttention(input.attention)) return null;
  }
  return contact(ownerId, 'owner', members);
}

function resolveAlsoInform(args: {
  stage: EscalationStage | null;
  approval: EscalationApprovalFact | null;
  contact: EscalationContact | null;
  members: readonly EscalationMember[];
  policy: AcceptedPolicy | null;
}): InformTarget[] {
  if (!args.policy || !args.contact) return [];
  const targets: InformTarget[] = [];
  const managerWanted =
    (args.policy.informManagerWhen === 'already_overdue' && args.stage === 'overdue') ||
    (args.policy.informManagerWhen === 'pending_approval' && args.approval !== null);
  if (managerWanted) {
    const holder = args.members.find((member) => member.memberId === args.contact?.memberId);
    const managerId = holder?.managerMemberId?.trim();
    if (managerId && managerId !== args.contact.memberId) {
      const named = displayName(managerId, args.members);
      targets.push({
        memberId: managerId,
        displayName: named,
        audience: 'manager',
        line: `${named} — ${ESCALATION_COPY.roles.manager.toLowerCase()}`,
        detail: ESCALATION_COPY.informOnly,
      });
    }
  }

  const executiveId = args.policy.executiveMemberId?.trim();
  if (
    args.policy.informExecutiveWhen === 'caller_marked_prolonged' &&
    args.policy.prolongedMarked === true &&
    executiveId &&
    executiveId !== args.contact.memberId
  ) {
    const named = displayName(executiveId, args.members);
    targets.push({
      memberId: executiveId,
      displayName: named,
      audience: 'executive',
      line: `${named} — ${ESCALATION_COPY.roles.executive.toLowerCase()}`,
      detail: ESCALATION_COPY.informOnly,
    });
  }
  return targets;
}

function resolveRungs(contact: EscalationContact | null, alsoInform: readonly InformTarget[]): AwarenessRung[] {
  const manager = alsoInform.find((item) => item.audience === 'manager');
  const executive = alsoInform.find((item) => item.audience === 'executive');
  return [
    {
      order: 1,
      audience: 'holder',
      title: ESCALATION_COPY.rungs.holder,
      detail: contact ? contact.line : ESCALATION_COPY.holderMissing,
      active: Boolean(contact),
    },
    {
      order: 2,
      audience: 'manager',
      title: ESCALATION_COPY.rungs.manager,
      detail: manager ? `${manager.line}. ${manager.detail}` : ESCALATION_COPY.managerWithheld,
      active: Boolean(manager),
    },
    {
      order: 3,
      audience: 'executive',
      title: ESCALATION_COPY.rungs.executive,
      detail: executive ? `${executive.line}. ${executive.detail}` : ESCALATION_COPY.executiveWithheld,
      active: Boolean(executive),
    },
  ];
}

function resolveNotes(
  input: EscalationInput,
  contact: EscalationContact | null,
  members: readonly EscalationMember[],
): string[] {
  const notes: string[] = [];
  if (input.recordedEscalation?.recorded === true) notes.push(ESCALATION_COPY.recordedDetail);
  if (contact && inactiveAccess(contact.memberId, members)) notes.push(ESCALATION_COPY.inactiveAccess);
  return notes;
}

function acceptPolicy(policy: EscalationPolicyInput | null | undefined): AcceptedPolicy | null {
  if (!policy || policy.approved !== true) return null;
  if (typeof policy.source !== 'string' || policy.source.trim() === '') return null;
  const informManagerWhen =
    policy.informManagerWhen === 'already_overdue' || policy.informManagerWhen === 'pending_approval'
      ? policy.informManagerWhen
      : null;
  const informExecutiveWhen =
    policy.informExecutiveWhen === 'caller_marked_prolonged' ? policy.informExecutiveWhen : null;
  return {
    informManagerWhen,
    informExecutiveWhen,
    prolongedMarked: policy.prolongedMarked === true,
    executiveMemberId: typeof policy.executiveMemberId === 'string' ? policy.executiveMemberId : null,
  };
}

function pendingApproval(approval: EscalationApprovalFact | null | undefined): EscalationApprovalFact | null {
  if (!approval || approval.status !== 'pending') return null;
  if (!approval.approverMemberId.trim() || !approval.approvalRequestId.trim()) return null;
  return approval;
}

function activeAttention(item: AttentionItemReadModel | null | undefined): AttentionItemReadModel | null {
  if (!item || item.isActive === false) return null;
  return item;
}

function approvalDetail(subjectType: string): string {
  if (subjectType === 'quote') return ESCALATION_COPY.blockerDetail.quoteApproval;
  if (subjectType === 'order') return ESCALATION_COPY.blockerDetail.orderApproval;
  if (subjectType === 'work_item') return ESCALATION_COPY.blockerDetail.workApproval;
  return ESCALATION_COPY.blockerDetail.otherApproval;
}

function overdueDetail(
  input: EscalationInput,
  attention: AttentionItemReadModel | null,
): string {
  const fromAttention = attention?.reasonDetail.dueAt;
  const dueAt =
    typeof fromAttention === 'string'
      ? fromAttention
      : input.work?.dueAt ?? null;
  if (!dueAt) return ESCALATION_COPY.blockerDetail.overdueStored;
  const formatted = formatDueDate(dueAt);
  if (formatted === 'Sin fecha') return ESCALATION_COPY.blockerDetail.overdueStored;
  return `${ESCALATION_COPY.blockerDetail.overdueDuePrefix}: ${formatted}`;
}

function person(memberId: string, role: EscalationRole, members: readonly EscalationMember[]): RelatedPerson {
  return {
    memberId,
    displayName: displayName(memberId, members),
    role,
    roleLabel: roleLabel(role),
  };
}

function contact(
  memberId: string,
  role: 'approver' | 'owner',
  members: readonly EscalationMember[],
): EscalationContact {
  const named = displayName(memberId, members);
  const roleLabel = ESCALATION_COPY.contactRole[role];
  return {
    memberId,
    displayName: named,
    role,
    roleLabel,
    line: `${named} — ${roleLabel}`,
  };
}

function displayName(memberId: string, members: readonly EscalationMember[]): string {
  const member = members.find((candidate) => candidate.memberId === memberId);
  if (!member) return ESCALATION_COPY.unknownMember;
  const named = memberDisplayName(member.displayName, member.givenName ?? '', member.familyName ?? '');
  return named === 'Sin nombre' ? ESCALATION_COPY.unknownMember : named;
}

function roleLabel(role: EscalationRole): string {
  switch (role) {
    case 'approver':
      return ESCALATION_COPY.roles.approver;
    case 'owner':
      return ESCALATION_COPY.roles.owner;
    case 'attention':
      return ESCALATION_COPY.roles.attention;
    case 'requester':
      return ESCALATION_COPY.roles.requester;
    case 'creator':
      return ESCALATION_COPY.roles.creator;
    case 'manager':
      return ESCALATION_COPY.roles.manager;
    case 'executive':
      return ESCALATION_COPY.roles.executive;
  }
}

function collapsePeople(people: readonly RelatedPerson[]): RelatedPerson[] {
  const byId = new Map<string, RelatedPerson>();
  for (const person of people) {
    const current = byId.get(person.memberId);
    if (!current || ROLE_RANK[person.role] < ROLE_RANK[current.role]) {
      byId.set(person.memberId, person);
    }
  }
  return [...byId.values()].sort((left, right) => {
    const rank = ROLE_RANK[left.role] - ROLE_RANK[right.role];
    if (rank !== 0) return rank;
    return left.memberId < right.memberId ? -1 : left.memberId > right.memberId ? 1 : 0;
  });
}

function inactiveAccess(memberId: string, members: readonly EscalationMember[]): boolean {
  const status = members.find((member) => member.memberId === memberId)?.accessStatus;
  return status === 'suspended' || status === 'revoked' || status === 'terminated';
}

function resolveIssueId(input: EscalationInput): string | null {
  const fromAttention = input.attention
    ? issueIdentityFromAttentionKey(input.attention.attentionKey)
    : null;
  if (fromAttention) return fromAttention.issueId;
  if (input.work?.workItemId.trim()) return `work:${input.work.workItemId.trim()}`;
  if (input.approval?.approvalRequestId.trim()) return `approval:${input.approval.approvalRequestId.trim()}`;
  return null;
}

function resolveListKey(input: EscalationInput): string {
  const issueId = resolveIssueId(input);
  if (issueId) return issueId;
  if (input.attention?.attentionKey.trim()) return `unmatched:${input.attention.attentionKey.trim()}`;
  return 'unmatched:none';
}

function stageLabel(stage: EscalationStage | null): string | null {
  switch (stage) {
    case 'suggested':
      return ESCALATION_COPY.stages.suggested;
    case 'overdue':
      return ESCALATION_COPY.stages.overdue;
    case 'needs_attention':
      return ESCALATION_COPY.stages.needsAttention;
    case 'recorded':
      return ESCALATION_COPY.stages.recorded;
    default:
      return null;
  }
}

function higherStage(left: EscalationStage | null, right: EscalationStage | null): EscalationStage | null {
  if (!left) return right;
  if (!right) return left;
  return STAGE_RANK[left] >= STAGE_RANK[right] ? left : right;
}

function preferContact(left: EscalationContact | null, right: EscalationContact | null): EscalationContact | null {
  if (left?.role === 'approver') return left;
  if (right?.role === 'approver') return right;
  return left ?? right;
}

function compareBlockers(left: EscalationBlocker, right: EscalationBlocker): number {
  if (left.code === right.code) return 0;
  return left.code === 'pending_approval' ? -1 : 1;
}

function compareGuidance(left: EscalationGuidance, right: EscalationGuidance): number {
  const rank = (STAGE_RANK[right.stage ?? 'suggested'] ?? 0) - (STAGE_RANK[left.stage ?? 'suggested'] ?? 0);
  if (left.stage && right.stage && rank !== 0) return rank;
  if (left.stage && !right.stage) return -1;
  if (!left.stage && right.stage) return 1;
  return left.listKey < right.listKey ? -1 : left.listKey > right.listKey ? 1 : 0;
}

function unionBy<T>(left: readonly T[], right: readonly T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];
  for (const item of [...left, ...right]) {
    const id = key(item);
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(item);
  }
  return merged;
}

function matchChain(
  item: AttentionItemReadModel,
  approval: EscalationApprovalFact | null,
  chains: EscalationLookup['chains'],
): EscalationChain | null {
  if (!chains || chains.length === 0) return null;
  return (
    chains.find((chain) => {
      if (approval?.subjectType === 'quote' && chain.quoteId && chain.quoteId === approval.subjectId) return true;
      if (chain.subjectType && chain.subjectId && chain.subjectType === item.subjectType && chain.subjectId === item.subjectId) {
        return true;
      }
      return false;
    }) ?? null
  );
}

export function escalationStageRank(stage: EscalationStage | null): number {
  return stage ? STAGE_RANK[stage] : 0;
}
