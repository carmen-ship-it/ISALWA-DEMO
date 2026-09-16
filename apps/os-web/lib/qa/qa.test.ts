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
import {
  mergeStagingPersonaLookups,
  resolveSynthPersonas,
  type SynthPersona,
} from '@/lib/qa/personas';
import {
  QA_REAL_ORGANIZATION_ID,
  QA_SYNTH_ORGANIZATION_ID,
} from '@/lib/qa/constants';

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
        synthOrgId: QA_SYNTH_ORGANIZATION_ID,
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
    assert.ok(matrix.find((r) => r.id === 'nav-inicio'));
    assert.ok(matrix.find((r) => r.id === 'commercial-reassign'));
  });

  it('uses live effective scopes when memberIds exist', () => {
    const live = buildAccessMatrix(['commercial.team.read', 'management.org.read']);
    const planned = buildAccessMatrix(['management.org.read']);
    const liveAdmin = live.find((r) => r.id === 'nav-administracion');
    const plannedAdmin = planned.find((r) => r.id === 'nav-administracion');
    assert.ok(liveAdmin && plannedAdmin);
    assert.equal(liveAdmin.allowed, plannedAdmin.allowed);
    assert.ok(live.find((r) => r.id === 'nav-clientes')?.allowed);
  });
});

describe('staging persona memberId fallback', () => {
  const plannedAsesor: SynthPersona = {
    id: 'asesor-comercial',
    functionId: 'asesor-comercial',
    label: 'Asesor comercial',
    description: 'planned',
    email: 'w2.asesor@isalwa.demo',
    memberId: null,
    grantedScopes: ['commercial.team.read'],
    source: 'planned',
  };

  it('fills null memberIds from staging email lookup', () => {
    const merged = mergeStagingPersonaLookups([plannedAsesor], [
      {
        email: 'w2.asesor@isalwa.demo',
        memberId: 'mem-asesor',
        organizationId: QA_SYNTH_ORGANIZATION_ID,
        grantedScopes: ['commercial.team.read', 'opportunity.read'],
      },
    ]);
    assert.equal(merged[0]?.memberId, 'mem-asesor');
    assert.equal(merged[0]?.source, 'staging');
    assert.ok(merged[0]?.grantedScopes.includes('opportunity.read'));
  });

  it('keeps local receipt memberId over staging', () => {
    const receipt: SynthPersona = {
      ...plannedAsesor,
      memberId: 'mem-local',
      source: 'receipt',
      grantedScopes: ['commercial.team.read'],
    };
    const merged = mergeStagingPersonaLookups([receipt], [
      {
        email: 'w2.asesor@isalwa.demo',
        memberId: 'mem-staging',
        organizationId: QA_SYNTH_ORGANIZATION_ID,
        grantedScopes: ['commercial.team.read'],
      },
    ]);
    assert.equal(merged[0]?.memberId, 'mem-local');
    assert.equal(merged[0]?.source, 'receipt');
  });

  it('fail-closes REAL organization rows', () => {
    const merged = mergeStagingPersonaLookups([plannedAsesor], [
      {
        email: 'w2.asesor@isalwa.demo',
        memberId: 'mem-real',
        organizationId: QA_REAL_ORGANIZATION_ID,
        grantedScopes: ['people.admin'],
      },
    ]);
    assert.equal(merged[0]?.memberId, null);
    assert.equal(merged[0]?.source, 'planned');
  });

  it('resolveSynthPersonas uses staging lookup only when memberIds missing', async () => {
    const resolved = await resolveSynthPersonas(async () => [
      {
        email: 'w2.asesor@isalwa.demo',
        memberId: 'mem-asesor-live',
        organizationId: QA_SYNTH_ORGANIZATION_ID,
        grantedScopes: ['commercial.team.read'],
      },
    ]);
    const asesor = resolved.find((p) => p.functionId === 'asesor-comercial');
    assert.ok(asesor);
    // Local receipt may already populate memberId on laptop; either source is valid.
    assert.ok(asesor.memberId);
    if (asesor.source === 'staging') {
      assert.equal(asesor.memberId, 'mem-asesor-live');
    }
  });

  it('stays fail-closed when staging lookup returns nothing', () => {
    const merged = mergeStagingPersonaLookups([plannedAsesor], []);
    assert.equal(merged[0]?.memberId, null);
    assert.equal(merged[0]?.source, 'planned');
  });

  it('does not invent a People Admin SYNTH persona', async () => {
    const { PEOPLE_ADMIN_SYNTH_PERSONA_GAP } = await import('@/lib/qa/personas');
    assert.match(PEOPLE_ADMIN_SYNTH_PERSONA_GAP, /People Admin/i);
    const resolved = await resolveSynthPersonas(async () => [
      {
        email: 'w2.people-admin@isalwa.demo',
        memberId: 'mem-people-admin',
        organizationId: QA_SYNTH_ORGANIZATION_ID,
        grantedScopes: ['people.admin'],
      },
    ]);
    assert.equal(
      resolved.some((p) => p.email === 'w2.people-admin@isalwa.demo'),
      false,
    );
  });
});
