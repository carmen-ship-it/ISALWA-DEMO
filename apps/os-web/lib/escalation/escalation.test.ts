import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import type { AttentionItemReadModel, WorkSummaryReadModel } from '@isalwa/os-contracts';
import {
  approvalAttention,
  overdueAttention,
  reassignedAttention,
  sampleApproval,
  sampleAttention,
  sampleWork,
} from '../work/fixtures';
import { formatDueDate } from '../work/labels';
import { ESCALATION_COPY } from './copy';
import { CROSS_LANE_CHANGE_REQUESTS } from './cross-lane-request';
import {
  deriveEscalationFromAttention,
  deriveEscalationGuidance,
  escalationLimits,
} from './derive';
import type { EscalationInput, EscalationMember } from './types';

const asOf = new Date('2026-09-14T12:00:00.000Z');

const members: EscalationMember[] = [
  {
    memberId: 'mem-approver',
    displayName: 'Álvaro',
    managerMemberId: 'mem-manager',
    accessStatus: 'active',
  },
  {
    memberId: 'mem-owner',
    displayName: 'Isa',
    managerMemberId: 'mem-manager',
    accessStatus: 'active',
  },
  {
    memberId: 'mem-requester',
    displayName: 'Carmen',
    accessStatus: 'active',
  },
  {
    memberId: 'mem-creator',
    displayName: 'Nuria',
    accessStatus: 'active',
  },
  {
    memberId: 'mem-manager',
    displayName: 'Elena',
    accessStatus: 'active',
  },
  {
    memberId: 'mem-executive',
    displayName: 'Sofía',
    accessStatus: 'active',
  },
];

function quoteApproval(overrides: Partial<EscalationInput['approval']> = {}) {
  return {
    approvalRequestId: 'appr-quote',
    subjectType: 'quote',
    subjectId: 'quote-1',
    requestedByMemberId: 'mem-requester',
    approverMemberId: 'mem-approver',
    status: 'pending',
    workItemId: null,
    ...overrides,
  };
}

describe('escalation guidance from stored facts', () => {
  it('names the current approver and does not invent an order impact without loaded orders', () => {
    const guidance = deriveEscalationGuidance({
      approval: quoteApproval(),
      members,
      asOf,
    });

    assert.equal(guidance.stage, 'needs_attention');
    assert.equal(guidance.stageLabel, 'Requiere atención');
    assert.deepEqual(
      guidance.blockers.map((item) => item.label),
      ['Aprobación pendiente'],
    );
    assert.equal(guidance.blockers[0]?.detail, 'La solicitud sigue pendiente. No crea un pedido.');
    assert.deepEqual(guidance.mayAffect, []);
    assert.equal(guidance.contact?.line, 'Álvaro — aprobador actual');
    assert.equal(guidance.contact?.memberId, 'mem-approver');
    assert.equal(guidance.alsoInform.length, 0);
    assert.equal(guidance.limits, escalationLimits());
    assert.equal(guidance.limits.reassignsOwner, false);
    assert.equal(guidance.limits.changesApprover, false);
  });

  it('may affect order creation only when a quote approval has no linked order', () => {
    const withOrderGap = deriveEscalationGuidance({
      approval: quoteApproval(),
      members,
      chain: { quoteId: 'quote-1', quoteStatus: 'submitted', orderId: null, ordersLoaded: true },
      asOf,
    });
    const orderExists = deriveEscalationGuidance({
      approval: quoteApproval(),
      members,
      chain: { quoteId: 'quote-1', quoteStatus: 'accepted', orderId: 'order-1', ordersLoaded: true },
      asOf,
    });
    const cancelled = deriveEscalationGuidance({
      approval: quoteApproval(),
      members,
      chain: { quoteId: 'quote-1', quoteStatus: 'cancelled', orderId: null, ordersLoaded: true },
      asOf,
    });
    const workApproval = deriveEscalationGuidance({
      approval: { ...sampleApproval, status: 'pending' },
      members,
      chain: { ordersLoaded: true, orderId: null },
      asOf,
    });

    assert.deepEqual(withOrderGap.mayAffect.map((item) => item.label), ['Creación del pedido']);
    assert.deepEqual(orderExists.mayAffect, []);
    assert.deepEqual(cancelled.mayAffect, []);
    assert.equal(workApproval.blockers[0]?.detail, 'La solicitud sigue pendiente. No completa el trabajo.');
    assert.deepEqual(workApproval.mayAffect, []);
  });

  it('does not invent a customer reply impact unless waiting was stored', () => {
    const omitted = deriveEscalationGuidance({
      approval: quoteApproval(),
      members,
      chain: { quoteId: 'quote-1', quoteStatus: 'submitted', orderId: null, ordersLoaded: true },
      asOf,
    });
    const waiting = deriveEscalationGuidance({
      approval: quoteApproval(),
      members,
      chain: { quoteId: 'quote-1', quoteStatus: 'submitted', orderId: null, ordersLoaded: true },
      customerWaiting: true,
      asOf,
    });

    assert.deepEqual(omitted.mayAffect.map((item) => item.label), ['Creación del pedido']);
    assert.deepEqual(waiting.mayAffect.map((item) => item.label), [
      'Creación del pedido',
      'Respuesta al cliente',
    ]);
    assert.doesNotMatch(JSON.stringify(omitted), /Despacho|Cobranza|Respuesta al cliente/);
  });

  it('keeps overdue attention as Vencido without promoting a past date on open attention', () => {
    const overdue = deriveEscalationGuidance({
      attention: overdueAttention,
      work: { ...sampleWork, workItemId: 'work-2', dueAt: '2026-01-01T10:00:00.000Z' },
      members,
      asOf,
    });
    const openPastDue: AttentionItemReadModel = {
      ...sampleAttention,
      reasonDetail: { ...sampleAttention.reasonDetail, dueAt: '2020-01-01T00:00:00.000Z' },
    };
    const stillSuggested = deriveEscalationGuidance({
      attention: openPastDue,
      work: { ...sampleWork, dueAt: '2020-01-01T00:00:00.000Z' },
      members,
      asOf,
    });

    assert.equal(overdue.stageLabel, 'Vencido');
    assert.equal(overdue.blockers[0]?.label, 'Trabajo vencido');
    assert.equal(overdue.blockers[0]?.detail, `Venció: ${formatDueDate('2026-01-01T10:00:00.000Z')}`);
    assert.equal(overdue.contact?.line, 'Isa — responsable actual');
    assert.equal(stillSuggested.stage, 'suggested');
    assert.equal(stillSuggested.stageLabel, 'Atención sugerida');
    assert.deepEqual(stillSuggested.blockers, []);
  });

  it('uses the existing open-work overdue rule only when there is no attention row', () => {
    const late: WorkSummaryReadModel = {
      ...sampleWork,
      status: 'open',
      dueAt: '2026-01-01T10:00:00.000Z',
    };
    const upcoming: WorkSummaryReadModel = {
      ...sampleWork,
      status: 'open',
      dueAt: '2026-12-01T10:00:00.000Z',
    };

    assert.equal(deriveEscalationGuidance({ work: late, members, asOf }).stage, 'overdue');
    assert.equal(deriveEscalationGuidance({ work: late, members }).stage, 'suggested');
    assert.equal(deriveEscalationGuidance({ work: upcoming, members, asOf }).stage, 'suggested');
    assert.equal(
      deriveEscalationGuidance({ work: { ...late, status: 'completed' }, members, asOf }).stage,
      null,
    );
  });

  it('lists related people from stored ids and does not make the manager the contact', () => {
    const guidance = deriveEscalationGuidance({
      attention: reassignedAttention,
      work: sampleWork,
      approval: { ...sampleApproval, status: 'pending' },
      members,
      asOf,
    });

    assert.equal(guidance.contact?.role, 'approver');
    assert.equal(guidance.contact?.memberId, 'mem-approver');
    assert.deepEqual(
      guidance.relatedPeople.map((person) => `${person.displayName}:${person.roleLabel}`),
      [
        'Álvaro:Aprobador actual',
        'Isa:Responsable actual',
        'Carmen:Quien solicitó',
        'Nuria:Quien registró',
        'Elena:Jefe registrado',
      ],
    );
    assert.equal(guidance.rungs[0]?.active, true);
    assert.equal(guidance.rungs[1]?.active, false);
    assert.equal(guidance.rungs[2]?.active, false);
    assert.match(guidance.rungs[1]?.detail ?? '', /política aprobada/);
    assert.doesNotMatch(guidance.contact?.line ?? '', /Elena/);
  });

  it('informs a stored manager only when an approved policy matches, and does not replace the holder', () => {
    const facts: EscalationInput = {
      attention: overdueAttention,
      work: { ...sampleWork, workItemId: 'work-2', ownerMemberId: 'mem-owner' },
      members,
      asOf,
    };
    const withoutPolicy = deriveEscalationGuidance(facts);
    const unapproved = deriveEscalationGuidance({
      ...facts,
      policy: {
        approved: false,
        source: 'política interna',
        informManagerWhen: 'already_overdue',
        afterHours: 48,
      } as EscalationInput['policy'],
      asOf,
    });
    const approved = deriveEscalationGuidance({
      ...facts,
      policy: {
        approved: true,
        source: 'política de aviso registrada',
        informManagerWhen: 'already_overdue',
        informExecutiveWhen: 'caller_marked_prolonged',
        prolongedMarked: true,
        executiveMemberId: 'mem-executive',
      },
      asOf,
    });
    const sameHoursIgnored = deriveEscalationGuidance({
      ...facts,
      policy: {
        approved: true,
        source: 'política de aviso registrada',
        informManagerWhen: 'already_overdue',
        informExecutiveWhen: 'caller_marked_prolonged',
        prolongedMarked: false,
        executiveMemberId: 'mem-executive',
      },
      asOf,
    });

    assert.equal(withoutPolicy.alsoInform.length, 0);
    assert.equal(unapproved.alsoInform.length, 0);
    assert.equal(unapproved.stage, withoutPolicy.stage);
    assert.equal(approved.contact?.memberId, 'mem-owner');
    assert.deepEqual(
      approved.alsoInform.map((item) => item.line),
      ['Elena — jefe registrado', 'Sofía — persona indicada'],
    );
    assert.match(approved.alsoInform[0]?.detail ?? '', /No cambia el responsable ni el aprobador/);
    assert.equal(approved.rungs[1]?.active, true);
    assert.equal(approved.rungs[2]?.active, true);
    assert.equal(sameHoursIgnored.alsoInform.some((item) => item.audience === 'executive'), false);
    assert.equal(approved.limits.reassignsOwner, false);
    assert.doesNotMatch(JSON.stringify(approved), /48|SLA|horas/);
  });

  it('shows Escalado only for a recorded fact and still talks to the current holder', () => {
    const recorded = deriveEscalationGuidance({
      work: sampleWork,
      members,
      recordedEscalation: { recorded: true },
      asOf,
    });
    const plain = deriveEscalationGuidance({ work: sampleWork, members, asOf });

    assert.equal(recorded.stageLabel, 'Escalado');
    assert.match(recorded.notes.join(' '), /no cambian/);
    assert.equal(recorded.contact?.line, 'Isa — responsable actual');
    assert.notEqual(plain.stageLabel, 'Escalado');
    assert.equal(
      CROSS_LANE_CHANGE_REQUESTS.some((item) => item.id === 'attention-recorded-escalation'),
      true,
    );
  });

  it('collapses owner, overdue, and reassigned views of one work item into one guidance', () => {
    const guidances = deriveEscalationFromAttention(
      [sampleAttention, { ...overdueAttention, workItemId: 'work-1', attentionKey: 'work:overdue:work-1', resourceId: 'work-1' }, reassignedAttention],
      { members, works: [sampleWork], asOf },
    );

    assert.equal(guidances.length, 1);
    assert.equal(guidances[0]?.issueId, 'work:work-1');
    assert.equal(guidances[0]?.stage, 'overdue');
    assert.equal(guidances[0]?.contact?.role, 'owner');
  });

  it('does not invent an issue or a dispatch impact for an unknown attention key', () => {
    const unknown: AttentionItemReadModel = {
      ...sampleAttention,
      attentionKey: 'work:escalated:work-1',
      attentionType: 'open_work_assigned',
    };
    const guidance = deriveEscalationGuidance({ attention: unknown, members, asOf });

    assert.equal(guidance.issueId, null);
    assert.equal(guidance.listKey, 'unmatched:work:escalated:work-1');
    assert.doesNotMatch(JSON.stringify(guidance.mayAffect), /Despacho|Cobranza/);
  });

  it('falls back when a member name was not loaded and does not mutate the input', () => {
    const input: EscalationInput = {
      approval: quoteApproval({ approverMemberId: 'mem-missing' }),
      members: [],
      asOf,
    };
    Object.freeze(input);
    Object.freeze(input.approval);
    const guidance = deriveEscalationGuidance(input);

    assert.equal(guidance.contact?.displayName, 'Miembro del equipo');
    assert.equal(guidance.contact?.line, 'Miembro del equipo — aprobador actual');
    assert.equal(input.approval?.approverMemberId, 'mem-missing');
  });

  it('notes inactive access without choosing another person', () => {
    const guidance = deriveEscalationGuidance({
      approval: quoteApproval(),
      members: members.map((member) =>
        member.memberId === 'mem-approver' ? { ...member, accessStatus: 'suspended' } : member,
      ),
      asOf,
    });

    assert.equal(guidance.contact?.memberId, 'mem-approver');
    assert.match(guidance.notes.join(' '), /no cambia al responsable ni al aprobador/);
  });

  it('keeps operator copy factual and the module free of providers, clocks, and commands', () => {
    const root = process.cwd();
    const sources = [
      'lib/escalation/derive.ts',
      'lib/escalation/copy.ts',
      'lib/escalation/index.ts',
      'components/escalation/escalation-guidance-panel.tsx',
    ].map((file) => readFileSync(join(root, file), 'utf8')).join('\n');

    assert.equal(ESCALATION_COPY.blockedBy, 'Bloqueado por');
    assert.equal(ESCALATION_COPY.mayAffect, 'Puede afectar');
    assert.equal(ESCALATION_COPY.relatedPeople, 'Personas relacionadas');
    assert.equal(ESCALATION_COPY.whoToTalkTo, 'A quién acudir');
    assert.doesNotMatch(sources, /fetch\(|os-api-client|CreateWorkItem|ReassignWork|supabase|setTimeout|sendNotification|new Date\(/);
    assert.match(sources, /sendsNotification: false/);
    assert.doesNotMatch(sources, /\bSLA\b|48 horas|afterHours/);
    assert.doesNotMatch(sources, /Despacho|Cobranza|Ingresos|Revenue/);
    assert.match(sources, /No reasigna el trabajo/);
    assert.equal(
      CROSS_LANE_CHANGE_REQUESTS.every((item) => item.classification === 'SHARED_CONTRACT_BLOCKED'),
      true,
    );
  });
});
