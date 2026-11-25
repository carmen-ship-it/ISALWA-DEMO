/**
 * Synthetic people.admin seat for overnight browser journeys.
 * Cookie material stays under BROWSER_PROOF_DIR only.
 */
import 'reflect-metadata';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Test } from '@nestjs/testing';
import { createId } from '@isalwa/ts-utils';
import { getOsPrisma } from '@isalwa/os-database';
import { AppModule } from './app.module';
import { OS_STORE } from './os-store.module';
import type { OsWorkforceStore } from '@isalwa/os-workforce';

async function main() {
  process.env.OS_OUTBOX_WORKER = '0';
  process.env.OS_PROJECTION_WORKER = '0';
  process.env.OS_ELAPSED_NOTICE_CLOCK = '0';
  const outDir = process.env.BROWSER_PROOF_DIR;
  if (!outDir) throw new Error('BROWSER_PROOF_DIR required');

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  const store = moduleRef.get(OS_STORE) as OsWorkforceStore;
  const prisma = getOsPrisma()!;

  const org = await store.seedOrganization('Admin Browser Org', `adm-${createId()}`);
  const admin = await store.seedAdminMember(org.id, `admin-${createId()}@proof.bo`, 'Admin', 'Browser');
  // seedAdminMember already grants people.admin
  const sales = await store.seedAdminMember(org.id, `sales-${createId()}@proof.bo`, 'Sales', 'Blocked');
  await prisma.osRoleAssignment.deleteMany({
    where: { organizationId: org.id, memberId: sales.member.id, roleKey: 'people.admin' },
  });
  await prisma.osRoleAssignment.create({
    data: {
      id: createId(),
      organizationId: org.id,
      memberId: sales.member.id,
      roleKey: 'sales_rep',
      effectiveAt: new Date('2020-01-01'),
    },
  });

  function cookieFor(who: typeof admin) {
    return Buffer.from(
      JSON.stringify({
        organizationId: org.id,
        memberId: who.member.id,
        personId: who.person.id,
        authIdentityId: who.auth.id,
        displayLabel: 'Admin Browser',
      }),
      'utf8',
    ).toString('base64url');
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    `${outDir}/admin-session.json`,
    JSON.stringify(
      {
        cookieName: 'os_dev_session',
        adminCookie: cookieFor(admin),
        salesCookie: cookieFor(sales),
        organizationId: org.id,
        adminMemberId: admin.member.id,
        salesMemberId: sales.member.id,
        paths: [
          '/administracion',
          '/administracion/equipo',
          '/administracion/accesos',
          '/administracion/capacidades',
        ],
      },
      null,
      2,
    ),
  );
  writeFileSync(
    `${outDir}/admin-sanitized.json`,
    JSON.stringify(
      {
        organizationId: org.id,
        adminMemberId: admin.member.id,
        salesMemberId: sales.member.id,
        paths: ['/administracion', '/administracion/equipo', '/administracion/accesos', '/administracion/capacidades'],
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ ok: true, organizationId: org.id, adminMemberId: admin.member.id }));
  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
