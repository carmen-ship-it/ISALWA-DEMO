import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  QA_ACCESS_SCOPE,
  SYSTEM_ADMIN_SCOPE,
  canActAsSystemAdmin,
  canUseQaAccess,
} from '@isalwa/os-contracts';
import {
  createSignedQaViewCookieValue,
  parseSignedQaViewCookie,
} from '@/lib/qa/cookie';
import { getRuntimeProfile, isQaControlEnabled } from '@/lib/qa/runtime';
import { buildAccessMatrix } from '@/lib/qa/access-matrix';

describe('qa runtime gate', () => {
  it('is disabled outside staging even when env flag is true', () => {
    const prevProfile = process.env.OS_RUNTIME_PROFILE;
    const prevFlag = process.env.OS_QA_CONTROL_ENABLED;
    process.env.OS_RUNTIME_PROFILE = 'production';
    process.env.OS_QA_CONTROL_ENABLED = 'true';
    try {
      assert.equal(getRuntimeProfile(), 'production');
      assert.equal(isQaControlEnabled(), false);
    } finally {
      if (prevProfile === undefined) delete process.env.OS_RUNTIME_PROFILE;
      else process.env.OS_RUNTIME_PROFILE = prevProfile;
      if (prevFlag === undefined) delete process.env.OS_QA_CONTROL_ENABLED;
      else process.env.OS_QA_CONTROL_ENABLED = prevFlag;
    }
  });

  it('requires staging profile and OS_QA_CONTROL_ENABLED=true', () => {
    const prevProfile = process.env.OS_RUNTIME_PROFILE;
    const prevFlag = process.env.OS_QA_CONTROL_ENABLED;
    process.env.OS_RUNTIME_PROFILE = 'staging';
    process.env.OS_QA_CONTROL_ENABLED = 'true';
    try {
      assert.equal(isQaControlEnabled(), true);
    } finally {
      if (prevProfile === undefined) delete process.env.OS_RUNTIME_PROFILE;
      else process.env.OS_RUNTIME_PROFILE = prevProfile;
      if (prevFlag === undefined) delete process.env.OS_QA_CONTROL_ENABLED;
      else process.env.OS_QA_CONTROL_ENABLED = prevFlag;
    }
  });
});

describe('qa.access scope isolation', () => {
  it('system.admin does not imply qa.access', () => {
    assert.equal(canActAsSystemAdmin([SYSTEM_ADMIN_SCOPE]), true);
    assert.equal(canUseQaAccess([SYSTEM_ADMIN_SCOPE]), false);
    assert.equal(canUseQaAccess([QA_ACCESS_SCOPE]), true);
  });
});

describe('signed qa view cookie', () => {
  it('round-trips payload with HMAC', () => {
    const prev = process.env.OS_QA_SIGNING_SECRET;
    process.env.OS_QA_SIGNING_SECRET = 'test-secret';
    try {
      const value = createSignedQaViewCookieValue({
        actingMemberId: 'act',
        targetMemberId: 'tgt',
        synthOrgId: '01M2JKF77TXMJNDTKNCYNHH9G5',
      });
      assert.ok(value);
      const parsed = parseSignedQaViewCookie(value);
      assert.equal(parsed?.actingMemberId, 'act');
      assert.equal(parsed?.targetMemberId, 'tgt');
    } finally {
      if (prev === undefined) delete process.env.OS_QA_SIGNING_SECRET;
      else process.env.OS_QA_SIGNING_SECRET = prev;
    }
  });
});

describe('access matrix', () => {
  it('evaluates gerente org read without people.admin nav', () => {
    const matrix = buildAccessMatrix(['management.org.read']);
    const adminNav = matrix.find((r) => r.id === 'nav-administracion');
    assert.ok(adminNav);
    assert.equal(adminNav.allowed, false);
  });
});
