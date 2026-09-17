import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { flattenMiDia, MI_DIA_MAX_ITEMS } from '@/lib/inicio/mi-dia';
import { buildTodayQueue } from '@/lib/inicio/today-queue';
import { quoteToOrderRateDisplay } from '@/lib/management/quote-to-order-rate';

const appRoot = resolve(__dirname, '../..');

function readApp(path: string): string {
  return readFileSync(resolve(appRoot, path), 'utf8');
}

const FORBIDDEN =
  /revenue|ingreso|margen|margin|\bcosto\b|\bcost\b|ranking|top salesperson|score de/i;

describe('inicio command center UX-2', () => {
  it('caps Mi día at seven deterministic rows', () => {
    const work = Array.from({ length: 12 }, (_, index) => ({
      organizationId: 'org-1',
      ownerMemberId: 'mem-1',
      createdByMemberId: 'mem-1',
      workItemId: `w-${index}`,
      title: `Tarea ${index}`,
      description: '',
      status: 'open' as const,
      dueAt: `2026-09-${String(10 + index).padStart(2, '0')}T12:00:00.000Z`,
      subjectType: null,
      subjectId: null,
      approvalStatus: 'none' as const,
      priority: 'normal' as const,
      completedAt: null,
      cancelledAt: null,
      pendingApprovalId: null,
      ownershipChangeCount: 0,
      lastOwnershipChangeAt: null,
    }));
    const queue = buildTodayQueue({
      memberId: 'mem-1',
      asOf: new Date('2026-09-16T12:00:00.000Z'),
      work,
    });
    assert.equal(flattenMiDia(queue).length, MI_DIA_MAX_ITEMS);
  });

  it('uses em dash for quote conversion when denominator is zero', () => {
    assert.equal(quoteToOrderRateDisplay(0, 0), '—');
  });

  it('uses non-stacked lens tabs Mi trabajo, Equipo, Empresa', () => {
    const lens = readApp('lib/inicio/page-lens.ts');
    assert.match(lens, /Mi trabajo/);
    assert.match(lens, /Equipo/);
    assert.match(lens, /Empresa/);
    assert.match(lens, /params\.set\('lente', 'equipo'\)/);
    assert.match(lens, /params\.set\('lente', 'empresa'\)/);
    assert.match(lens, /raw === 'gerencia'/);
  });

  it('mounts one command center without stacked role homes', () => {
    const page = readApp('app/(app)/inicio/page.tsx');
    assert.match(page, /InicioSummaryCards/);
    assert.match(page, /InicioMiDia/);
    assert.match(page, /InicioLensTabs/);
    assert.match(page, /Atención de hoy/);
    assert.match(page, /Esto es lo que necesita atención hoy/);
    assert.match(page, /ManagementOrgMetrics/);
    assert.match(page, /ManagementTeamTable/);
    assert.match(page, /Para revisar/);
    assert.match(page, /Oportunidades de mejora/);
    assert.match(page, /ManagementExamplePreviewTrigger/);
    assert.doesNotMatch(page, /OperatingHomes/);
    assert.doesNotMatch(page, /<InicioLeadershipSection/);
    assert.doesNotMatch(page, FORBIDDEN);
  });
});
