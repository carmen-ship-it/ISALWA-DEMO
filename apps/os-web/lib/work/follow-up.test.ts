import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import {
  CreateWorkItemPayloadSchema,
  CompleteWorkPayloadSchema,
  WORK_COMMAND_NAMES,
} from '@isalwa/os-contracts';
import { FOLLOW_UP_UI_COMMANDS, followUpCommandPath } from '@/lib/work/command-types';
import { followUpOwnerFromAuthenticatedSession } from '@/lib/auth/session-identity';
import { sampleWork } from '@/lib/work/fixtures';
import {
  FOLLOW_UP_COPY,
  bindFollowUpOwner,
  buildCompleteWorkPayload,
  buildCreateFollowUpPayload,
  dueAtInputToIso,
  isBlockedFollowUpSubject,
  mergeRelatedWork,
  presentClientFollowUp,
  resolveFollowUpSubject,
} from '@/lib/work/follow-up';
import type { WorkListResponse } from '@/lib/work/types';

const emptyMeta = { nextCursor: null, limit: 5, hasMore: false };

function list(items: WorkListResponse['items']): WorkListResponse {
  return { items, meta: emptyMeta, freshness: null };
}

describe('CC-2 CreateWorkItem payload', () => {
  it('matches the existing CreateWorkItem contract', () => {
    const built = buildCreateFollowUpPayload({
      title: 'Llamar al cliente para confirmar cantidades',
      description: 'Confirmar cantidades del pedido.',
      dueAt: '2026-09-14T10:00',
      ownerMemberId: 'mem-current',
      subjectType: 'party',
      subjectId: 'party-1',
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.equal(built.command, 'CreateWorkItem');
    assert.equal(followUpCommandPath(built.command), '/commands/CreateWorkItem');
    const parsed = CreateWorkItemPayloadSchema.safeParse(built.payload);
    assert.equal(parsed.success, true);
    if (!parsed.success) return;
    assert.equal(parsed.data.title, 'Llamar al cliente para confirmar cantidades');
    assert.equal(parsed.data.description, 'Confirmar cantidades del pedido.');
    assert.equal(parsed.data.ownerMemberId, 'mem-current');
    assert.equal(parsed.data.subjectType, 'party');
    assert.equal(parsed.data.subjectId, 'party-1');
    assert.equal(parsed.data.dueAt, '2026-09-14T14:00:00.000Z');
    assert.equal('organizationId' in built.payload, false);
    assert.equal('tenantId' in built.payload, false);
  });

  it('omits optional dueAt and description when empty', () => {
    const built = buildCreateFollowUpPayload({
      title: 'Llamar al cliente para confirmar cantidades',
      description: '   ',
      dueAt: '',
      ownerMemberId: 'mem-current',
      subjectType: 'commercial_account',
      subjectId: 'ca-1',
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.equal('dueAt' in built.payload, false);
    assert.equal('description' in built.payload, false);
    assert.equal(dueAtInputToIso(''), null);
    assert.equal(dueAtInputToIso(null), null);
    assert.equal(CreateWorkItemPayloadSchema.safeParse(built.payload).success, true);
  });

  it('rejects an invalid date instead of inventing a reminder rule', () => {
    const built = buildCreateFollowUpPayload({
      title: 'Llamar',
      dueAt: 'mañana',
      ownerMemberId: 'mem-current',
      subjectType: 'party',
      subjectId: 'party-1',
    });
    assert.equal(built.ok, false);
    if (built.ok) return;
    assert.match(built.error, /fecha/i);
  });
});

describe('CC-2 current member ownership', () => {
  it('uses the authenticated member and ignores a caller-selected owner', () => {
    const owner = followUpOwnerFromAuthenticatedSession(
      { memberId: 'mem-current', organizationId: 'org-1', accessStatus: 'active' },
      { ownerMemberId: 'mem-other', organizationId: 'org-other' },
    );
    assert.equal(owner, 'mem-current');
    assert.equal(bindFollowUpOwner(owner ?? '', 'mem-other'), 'mem-current');
    const built = buildCreateFollowUpPayload({
      title: 'Llamar al cliente para confirmar cantidades',
      ownerMemberId: owner ?? '',
      subjectType: 'party',
      subjectId: 'party-1',
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.equal(built.payload.ownerMemberId, 'mem-current');
    assert.equal('organizationId' in built.payload, false);
  });

  it('owns the first follow-up from the session even with no attention or work', () => {
    const owner = followUpOwnerFromAuthenticatedSession(
      { memberId: 'mem-hosted', organizationId: 'org-1', accessStatus: 'active' },
      { ownerMemberId: 'mem-attacker', organizationId: 'org-other', attentionCount: 0, workCount: 0 },
    );
    assert.equal(owner, 'mem-hosted');
    const built = buildCreateFollowUpPayload({
      title: 'Llamar al cliente para confirmar cantidades',
      ownerMemberId: owner ?? '',
      subjectType: 'party',
      subjectId: 'party-1',
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.equal(built.payload.ownerMemberId, 'mem-hosted');
  });

  it('rejects an inactive or missing session instead of guessing', () => {
    assert.equal(
      followUpOwnerFromAuthenticatedSession(
        { memberId: 'mem-1', organizationId: 'org-1', accessStatus: 'suspended' },
        { attentionCount: 1, workCount: 1 },
      ),
      null,
    );
    assert.equal(followUpOwnerFromAuthenticatedSession(null, { ownerMemberId: 'mem-other' }), null);
  });
});

describe('CC-2 subject types', () => {
  it('allows only party and commercial_account', () => {
    assert.deepEqual(resolveFollowUpSubject({ partyId: 'party-1' }), {
      subjectType: 'party',
      subjectId: 'party-1',
    });
    assert.deepEqual(
      resolveFollowUpSubject({ partyId: 'party-1', commercialAccountId: 'ca-1' }),
      { subjectType: 'commercial_account', subjectId: 'ca-1' },
    );
    for (const blocked of ['opportunity', 'quote']) {
      assert.equal(isBlockedFollowUpSubject(blocked), true);
      const built = buildCreateFollowUpPayload({
        title: 'Llamar al cliente para confirmar cantidades',
        ownerMemberId: 'mem-current',
        subjectType: blocked,
        subjectId: 'deal-1',
      });
      assert.equal(built.ok, false);
    }
  });

  it('shows a commercial-account follow-up beside party work', () => {
    const accountItem = {
      ...sampleWork,
      workItemId: 'work-account',
      title: 'Llamar al cliente para confirmar cantidades',
      subjectType: 'commercial_account',
      subjectId: 'ca-1',
    };
    const merged = mergeRelatedWork(list([sampleWork]), list([accountItem]));
    assert.deepEqual(
      merged.items.map((item) => item.workItemId),
      ['work-1', 'work-account'],
    );
  });
});

describe('CC-2 client follow-up rendering', () => {
  it('renders the pending next action in Spanish', () => {
    const presented = presentClientFollowUp({
      title: 'Llamar al cliente para confirmar cantidades',
      status: 'open',
      dueAt: '2026-09-14T14:00:00.000Z',
    });
    assert.equal(presented.title, 'Llamar al cliente para confirmar cantidades');
    assert.equal(presented.statusLabel, 'Pendiente');
    assert.equal(presented.dueCaption, 'Fecha');
    assert.match(presented.dueLabel, /2026/);
    assert.equal(FOLLOW_UP_COPY.action, 'Registrar seguimiento');
    assert.equal(FOLLOW_UP_COPY.nextAction, 'Próxima acción');
    assert.equal(FOLLOW_UP_COPY.complete, 'Completar');
    assert.equal(FOLLOW_UP_COPY.markComplete, 'Marcar como completado');
    assert.doesNotMatch(JSON.stringify(FOLLOW_UP_COPY), /WorkItem/);
    assert.doesNotMatch(JSON.stringify(presented), /WorkItem/);
  });
});

describe('CC-2 CompleteWork', () => {
  it('invokes the existing CompleteWork command with only the work id', () => {
    const built = buildCompleteWorkPayload('work-1');
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.equal(built.command, 'CompleteWork');
    assert.equal(followUpCommandPath(built.command), '/commands/CompleteWork');
    assert.deepEqual(built.payload, { workItemId: 'work-1' });
    assert.equal(CompleteWorkPayloadSchema.safeParse(built.payload).success, true);
    assert.equal('attention' in built.payload, false);
  });
});

describe('CC-2 boundaries', () => {
  it('uses existing work commands only — no new API or schema', () => {
    assert.deepEqual(FOLLOW_UP_UI_COMMANDS, ['CreateWorkItem', 'CompleteWork']);
    for (const command of FOLLOW_UP_UI_COMMANDS) {
      assert.equal(WORK_COMMAND_NAMES.includes(command), true);
      assert.match(followUpCommandPath(command), /^\/commands\//);
    }
    const blocked = ['ReassignWork', 'CancelWorkItem', 'Approve', 'Reject', 'RequestApproval'];
    for (const command of blocked) {
      assert.equal((FOLLOW_UP_UI_COMMANDS as readonly string[]).includes(command), false);
    }
  });

  it('does not edit Inicio and does not expose a team or tenant picker', () => {
    const inicio = readFileSync(resolve('app/(app)/inicio/page.tsx'), 'utf8');
    assert.doesNotMatch(inicio, /Registrar seguimiento/);
    assert.doesNotMatch(inicio, /createFollowUpAction/);
    assert.doesNotMatch(inicio, /register-follow-up/);

    const form = readFileSync(resolve('components/work/register-follow-up-form.tsx'), 'utf8');
    assert.doesNotMatch(form, /name="ownerMemberId"/);
    assert.doesNotMatch(form, /name="organizationId"/);
    assert.doesNotMatch(form, /WorkItem/);
    assert.match(form, /FOLLOW_UP_COPY\.action/);
    assert.match(form, /FOLLOW_UP_COPY\.nextAction/);
    assert.match(form, /FOLLOW_UP_COPY\.due/);
    assert.match(form, /FOLLOW_UP_COPY\.pending/);

    const actions = readFileSync(resolve('lib/work/actions.ts'), 'utf8');
    assert.doesNotMatch(actions, /executeWorkCommand\('ReassignWork'/);
    assert.doesNotMatch(actions, /executeWorkCommand\('CancelWorkItem'/);
    assert.doesNotMatch(actions, /executeWorkCommand\('Approve'/);
    assert.doesNotMatch(actions, /listAttention/);
    assert.match(actions, /getAuthenticatedSession/);
    assert.match(actions, /followUpOwnerFromAuthenticatedSession/);
    assert.match(actions, /built\.command/);

    // ReassignWork is people.admin on member detail only — not follow-up / trabajo.
    const reassignAdmin = readFileSync(resolve('lib/work/reassign-work-action.ts'), 'utf8');
    assert.match(reassignAdmin, /ADMIN_REASSIGN_WORK_COMMAND/);
    assert.match(reassignAdmin, /executeWorkCommand\(/);
  });
});
