import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { OS_STORE } from './os-store.module';
import type { OsWorkforceStore } from '@isalwa/os-workforce';

describe('os-api tenant isolation', () => {
  let app: INestApplication;
  let store: OsWorkforceStore;
  let baseUrl: string;
  let orgA: { id: string };
  let orgB: { id: string };
  let adminA: { member: { id: string }; person: { id: string }; auth: { id: string } };
  let memberB: { id: string };

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    const addr = app.getHttpServer().address() as { port: number };
    baseUrl = `http://127.0.0.1:${addr.port}`;
    store = moduleRef.get(OS_STORE);
    orgA = await store.seedOrganization('Tenant A', `tenant-a-${Date.now()}`);
    orgB = await store.seedOrganization('Tenant B', `tenant-b-${Date.now()}`);
    adminA = await store.seedAdminMember(orgA.id, `a-${Date.now()}@a.bo`, 'A', 'Admin');
    const seededB = await store.seedAdminMember(orgB.id, `b-${Date.now()}@b.bo`, 'B', 'Admin');
    memberB = seededB.member;
  });

  after(async () => {
    await app.close();
  });

  it('cannot read member from another tenant', async () => {
    const res = await fetch(`${baseUrl}/v1/members/${memberB.id}`, {
      headers: {
        'x-os-organization-id': orgA.id,
        'x-os-member-id': adminA.member.id,
        'x-os-person-id': adminA.person.id,
        'x-os-auth-identity-id': adminA.auth.id,
      },
    });
    assert.equal(res.status, 404);
  });

  it('cross-tenant invite is forbidden', async () => {
    const res = await fetch(`${baseUrl}/v1/commands/InviteMember`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-os-organization-id': orgB.id,
        'x-os-member-id': adminA.member.id,
        'x-os-person-id': adminA.person.id,
        'x-os-auth-identity-id': adminA.auth.id,
      },
      body: JSON.stringify({
        email: `evil-${Date.now()}@b.bo`,
        givenName: 'Evil',
        familyName: 'Actor',
        roleKey: 'sales_rep',
      }),
    });
    assert.equal(res.status, 403);
    const json = (await res.json()) as { code: string };
    assert.equal(json.code, 'TENANT_FORBIDDEN');
  });
});
