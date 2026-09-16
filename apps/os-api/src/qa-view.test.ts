import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { describe, it } from 'node:test';
import { applyQaViewIfPresent } from './qa-view';
import type { OsSession } from './os-session';
import type { OsWorkforceStore } from '@isalwa/os-workforce';

const SYNTH = '01M2JKF77TXMJNDTKNCYNHH9G5';
const REAL = '01M2DV9F0V5DXS4G89AKF4D5SR';

function sign(payload: object, secret: string): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function session(overrides: Partial<OsSession> = {}): OsSession {
  return {
    organizationId: REAL,
    actorMemberId: 'op-1',
    personId: 'person-op',
    authIdentityId: 'auth-op',
    correlationId: 'corr',
    effectiveAt: new Date('2026-09-16T12:00:00.000Z'),
    grantedScopes: ['qa.access', 'people.admin'],
    ...overrides,
  };
}

function req(headerValue: string | undefined) {
  return {
    header(name: string) {
      if (name.toLowerCase() === 'x-os-qa-view') return headerValue;
      return undefined;
    },
  };
}

function storeMock(opts: {
  targetOrg?: string;
  accessStatus?: string;
  roleKey?: string;
}): OsWorkforceStore {
  const targetOrg = opts.targetOrg ?? SYNTH;
  return {
    getMemberInOrg: async (organizationId: string, memberId: string) => {
      if (organizationId !== SYNTH || memberId !== 'tgt-1') return null;
      return {
        id: 'tgt-1',
        organizationId: targetOrg,
        personId: 'person-tgt',
        employmentStatus: 'active',
        accessStatus: opts.accessStatus ?? 'active',
        employmentStartedAt: new Date('2020-01-01'),
        employmentEndedAt: null,
        version: 1,
      };
    },
    listRoleAssignmentsForMember: async () => [
      {
        id: 'ra-1',
        organizationId: SYNTH,
        memberId: 'tgt-1',
        roleKey: opts.roleKey ?? 'commercial.team.read',
        effectiveAt: new Date('2020-01-01'),
        endedAt: null,
      },
    ],
    listDelegationsForDelegate: async () => [],
  } as unknown as OsWorkforceStore;
}

describe('applyQaViewIfPresent', () => {
  it('overlays SYNTH target scopes when staging QA is enabled', async () => {
    const prev = {
      profile: process.env.OS_RUNTIME_PROFILE,
      flag: process.env.OS_QA_CONTROL_ENABLED,
      secret: process.env.OS_QA_SIGNING_SECRET,
    };
    process.env.OS_RUNTIME_PROFILE = 'staging';
    process.env.OS_QA_CONTROL_ENABLED = 'true';
    process.env.OS_QA_SIGNING_SECRET = 'test-secret';
    try {
      const cookie = sign(
        {
          actingMemberId: 'op-1',
          targetMemberId: 'tgt-1',
          synthOrgId: SYNTH,
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        'test-secret',
      );
      const next = await applyQaViewIfPresent(req(cookie), storeMock({}), session());
      assert.equal(next.organizationId, SYNTH);
      assert.equal(next.actorMemberId, 'tgt-1');
      assert.equal(next.auditActorMemberId, 'op-1');
      assert.deepEqual([...next.grantedScopes], ['commercial.team.read']);
    } finally {
      if (prev.profile === undefined) delete process.env.OS_RUNTIME_PROFILE;
      else process.env.OS_RUNTIME_PROFILE = prev.profile;
      if (prev.flag === undefined) delete process.env.OS_QA_CONTROL_ENABLED;
      else process.env.OS_QA_CONTROL_ENABLED = prev.flag;
      if (prev.secret === undefined) delete process.env.OS_QA_SIGNING_SECRET;
      else process.env.OS_QA_SIGNING_SECRET = prev.secret;
    }
  });

  it('does not overlay in production even with a valid cookie', async () => {
    const prev = {
      profile: process.env.OS_RUNTIME_PROFILE,
      flag: process.env.OS_QA_CONTROL_ENABLED,
      secret: process.env.OS_QA_SIGNING_SECRET,
    };
    process.env.OS_RUNTIME_PROFILE = 'production';
    process.env.OS_QA_CONTROL_ENABLED = 'true';
    process.env.OS_QA_SIGNING_SECRET = 'test-secret';
    try {
      const cookie = sign(
        {
          actingMemberId: 'op-1',
          targetMemberId: 'tgt-1',
          synthOrgId: SYNTH,
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        'test-secret',
      );
      const original = session();
      const next = await applyQaViewIfPresent(req(cookie), storeMock({}), original);
      assert.equal(next.actorMemberId, 'op-1');
      assert.equal(next.organizationId, REAL);
    } finally {
      if (prev.profile === undefined) delete process.env.OS_RUNTIME_PROFILE;
      else process.env.OS_RUNTIME_PROFILE = prev.profile;
      if (prev.flag === undefined) delete process.env.OS_QA_CONTROL_ENABLED;
      else process.env.OS_QA_CONTROL_ENABLED = prev.flag;
      if (prev.secret === undefined) delete process.env.OS_QA_SIGNING_SECRET;
      else process.env.OS_QA_SIGNING_SECRET = prev.secret;
    }
  });

  it('rejects a REAL-org bound payload', async () => {
    const prev = {
      profile: process.env.OS_RUNTIME_PROFILE,
      flag: process.env.OS_QA_CONTROL_ENABLED,
      secret: process.env.OS_QA_SIGNING_SECRET,
    };
    process.env.OS_RUNTIME_PROFILE = 'staging';
    process.env.OS_QA_CONTROL_ENABLED = 'true';
    process.env.OS_QA_SIGNING_SECRET = 'test-secret';
    try {
      const cookie = sign(
        {
          actingMemberId: 'op-1',
          targetMemberId: 'tgt-1',
          synthOrgId: REAL,
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        'test-secret',
      );
      const next = await applyQaViewIfPresent(req(cookie), storeMock({}), session());
      assert.equal(next.actorMemberId, 'op-1');
    } finally {
      if (prev.profile === undefined) delete process.env.OS_RUNTIME_PROFILE;
      else process.env.OS_RUNTIME_PROFILE = prev.profile;
      if (prev.flag === undefined) delete process.env.OS_QA_CONTROL_ENABLED;
      else process.env.OS_QA_CONTROL_ENABLED = prev.flag;
      if (prev.secret === undefined) delete process.env.OS_QA_SIGNING_SECRET;
      else process.env.OS_QA_SIGNING_SECRET = prev.secret;
    }
  });
});
