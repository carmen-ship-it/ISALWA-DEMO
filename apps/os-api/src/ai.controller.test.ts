import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { HttpException } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthIdentityRecord, MemberRecord, RoleAssignmentRecord } from '@isalwa/os-workforce';
import type { AiAssistInput, AiAssistResult } from '@isalwa/providers';
import { MockAiProvider } from '@isalwa/providers';
import { AiController } from './ai.controller';

const ORG = 'org-a';
const PAST = new Date('2026-01-01T00:00:00.000Z');

class TrackingAiProvider extends MockAiProvider {
  calls = 0;

  async assist(input: AiAssistInput): Promise<AiAssistResult> {
    this.calls += 1;
    return super.assist(input);
  }
}

function auth(): AuthIdentityRecord {
  return {
    id: 'auth-1',
    personId: 'person-1',
    provider: 'dev',
    providerSubject: 'subject-1',
    email: 'isa@example.invalid',
    status: 'active',
    invitedAt: null,
    activatedAt: PAST,
    revokedAt: null,
  };
}

function member(overrides: Partial<MemberRecord> = {}): MemberRecord {
  return {
    id: 'mem-a',
    organizationId: ORG,
    personId: 'person-1',
    employmentStatus: 'active',
    accessStatus: 'active',
    employmentStartedAt: null,
    employmentEndedAt: null,
    version: 1,
    ...overrides,
  };
}

function request(headers: Record<string, string> = {}): Request {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return {
    header(name: string) {
      return normalized[name.toLowerCase()];
    },
    query: {},
    body: {},
  } as Request;
}

function withDevAuth<T>(run: () => Promise<T>): Promise<T> {
  const previousAuthMode = process.env.OS_AUTH_MODE;
  const previousProfile = process.env.OS_RUNTIME_PROFILE;
  process.env.OS_AUTH_MODE = 'dev';
  process.env.OS_RUNTIME_PROFILE = 'development';
  return run().finally(() => {
    if (previousAuthMode === undefined) delete process.env.OS_AUTH_MODE;
    else process.env.OS_AUTH_MODE = previousAuthMode;
    if (previousProfile === undefined) delete process.env.OS_RUNTIME_PROFILE;
    else process.env.OS_RUNTIME_PROFILE = previousProfile;
  });
}

const originalAiEnabled = process.env.AI_ENABLED;

afterEach(() => {
  if (originalAiEnabled === undefined) {
    delete process.env.AI_ENABLED;
  } else {
    process.env.AI_ENABLED = originalAiEnabled;
  }
});

describe('AiController assist', () => {
  it('returns AI_UNAVAILABLE when disabled without calling the provider', async () => {
    delete process.env.AI_ENABLED;
    const provider = new TrackingAiProvider();
    const controller = new AiController({} as never, {} as never, provider);

    await assert.rejects(
      () =>
        controller.assist(request(), {
          feature: 'ask',
          subjectType: 'issue',
          subjectId: 'issue-1',
        }),
      (err: unknown) => {
        assert.ok(err instanceof HttpException);
        assert.equal(err.getStatus(), 503);
        assert.deepEqual(err.getResponse(), { code: 'AI_UNAVAILABLE' });
        return true;
      },
    );
    assert.equal(provider.calls, 0);
  });

  it('requires auth before calling the provider when AI is enabled', async () => {
    process.env.AI_ENABLED = 'true';
    const provider = new TrackingAiProvider();
    const workforceStore = {
      async findAuthIdentityById() {
        return null;
      },
      async findAuthIdentityByProviderSubject() {
        return null;
      },
      async listMembersForPerson() {
        return [];
      },
      async listRoleAssignmentsForMember() {
        return [];
      },
      async listDelegationsForDelegate() {
        return [];
      },
    };
    const controller = new AiController(workforceStore as never, {} as never, provider);

    await assert.rejects(
      () =>
        withDevAuth(() =>
          controller.assist(
            request({
              'x-os-auth-identity-id': 'auth-1',
              'x-os-person-id': 'person-1',
            }),
            {
              feature: 'ask',
              subjectType: 'issue',
              subjectId: 'issue-1',
            },
          ),
        ),
      (err: unknown) => {
        assert.ok(err instanceof HttpException);
        assert.equal(err.getStatus(), 401);
        return true;
      },
    );
    assert.equal(provider.calls, 0);
  });

  it('loads authorized evidence and calls the provider when enabled', async () => {
    process.env.AI_ENABLED = 'true';
    const provider = new TrackingAiProvider();
    const issue = {
      id: 'issue-1',
      organizationId: ORG,
      title: 'Retraso',
      description: 'Entrega tarde',
      status: 'open',
      reportedByMemberId: 'mem-a',
      currentOwnerMemberId: 'mem-a',
      reportedAt: PAST,
      version: 1,
    };
    const workforceStore = {
      async findAuthIdentityById() {
        return auth();
      },
      async findAuthIdentityByProviderSubject() {
        return auth();
      },
      async listMembersForPerson() {
        return [member()];
      },
      async getMemberInOrg() {
        return member();
      },
      async listRoleAssignmentsForMember() {
        return [] as RoleAssignmentRecord[];
      },
      async listDelegationsForDelegate() {
        return [];
      },
      async appendEventAndAudit() {},
    };
    const issueStore = {
      async getIssueInOrg(_org: string, issueId: string) {
        return issueId === 'issue-1' ? issue : null;
      },
      async listJournalEntriesForIssue() {
        return [];
      },
      async findIssuesByReference() {
        return [];
      },
    };

    const controller = new AiController(workforceStore as never, issueStore as never, provider);
    const result = await withDevAuth(() =>
      controller.assist(
        request({
          'x-os-auth-identity-id': 'auth-1',
          'x-os-person-id': 'person-1',
        }),
        {
          feature: 'ask',
          subjectType: 'issue',
          subjectId: 'issue-1',
        },
      ),
    );

    assert.equal(provider.calls, 1);
    assert.match(result.summary, /Incidencia issue-1/);
    assert.equal(result.modelCalled, false);
    assert.ok(result.evidenceRefs.some((ref) => ref.type === 'issue' && ref.id === 'issue-1'));
  });
});
