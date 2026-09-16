import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ISSUE_MANAGE_SCOPE } from '@isalwa/os-contracts';
import { buildAuthorizedAssistPacket, toCommandIssue } from './ai-evidence-packet';

describe('buildAuthorizedAssistPacket', () => {
  it('drops issues the actor cannot read', () => {
    const issue = toCommandIssue({
      id: 'issue-secret',
      organizationId: 'org-a',
      title: 'Privada',
      description: 'Solo gestión',
      status: 'open',
      reportedByMemberId: 'mem-other',
      currentOwnerMemberId: 'mem-other',
      reportedAt: new Date('2026-01-01T00:00:00.000Z'),
      version: 1,
    });

    const packet = buildAuthorizedAssistPacket({
      actor: {
        memberId: 'mem-a',
        organizationId: 'org-a',
        grantedScopes: [],
      },
      subjectType: 'issue',
      subjectId: 'issue-secret',
      issues: [issue],
      journalEntriesByIssue: new Map(),
    });

    assert.equal(packet, null);
  });

  it('returns facts for authorized reporters', () => {
    const issue = toCommandIssue({
      id: 'issue-1',
      organizationId: 'org-a',
      title: 'Visible',
      description: 'Retraso',
      status: 'open',
      reportedByMemberId: 'mem-a',
      currentOwnerMemberId: null,
      reportedAt: new Date('2026-01-01T00:00:00.000Z'),
      version: 1,
    });

    const packet = buildAuthorizedAssistPacket({
      actor: {
        memberId: 'mem-a',
        organizationId: 'org-a',
        grantedScopes: [ISSUE_MANAGE_SCOPE],
      },
      subjectType: 'issue',
      subjectId: 'issue-1',
      issues: [issue],
      journalEntriesByIssue: new Map(),
    });

    assert.ok(packet);
    assert.ok(packet!.facts.some((fact) => fact.includes('issue-1')));
  });
});
