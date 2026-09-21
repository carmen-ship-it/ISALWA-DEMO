import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OsApiError } from '@/lib/api/os-api-errors';
import { t } from '@/lib/i18n/es';
import { isVisibilityDenied, loadInicioLeadership } from '@/lib/leadership/load-inicio-leadership';

const appRoot = resolve(__dirname, '../..');

function readApp(path: string): string {
  return readFileSync(resolve(appRoot, path), 'utf8');
}

describe('pilot leadership Inicio', () => {
  it('keeps personal attention personal and omits score or revenue views', () => {
    const page = readApp('app/(app)/inicio/page.tsx');
    const section = readApp('components/commercial/inicio-leadership-section.tsx');
    const loader = readApp('lib/leadership/load-inicio-leadership.ts');
    const nav = readApp('lib/navigation/nav-config.ts');

    assert.match(page, /listAttention\(\{\s*activeOnly:\s*true/);
    assert.doesNotMatch(page, /listAttention\(\{[^}]*memberId/);
    assert.match(page, /loadInicioLeadership/);
    assert.match(loader, /visibility,\s*status:\s*'open'/);
    assert.match(loader, /followUpOnly:\s*true/);
    assert.match(loader, /overdue:\s*true/);
    assert.match(section, /showAmount=\{false\}/);
    assert.match(section, /showApproval=\{false\}/);
    assert.doesNotMatch(`${page}\n${section}\n${loader}`, /revenue|ranking|quota|forecast|score|kpi|ReassignWork|people\.admin/i);
    assert.match(nav, /requiresAdminProbe:\s*true/);
    assert.equal(t('pages.inicio.teamTitle'), 'Atención del equipo');
    assert.equal(t('pages.inicio.orgTitle'), 'Vista comercial');
    assert.match(t('pages.inicio.leadershipReadOnly'), /Solo lectura/);
  });

  it('hides team and org sections when the read scopes are denied', async () => {
    const denied = new OsApiError({
      kind: 'forbidden',
      status: 403,
      code: 'PERMISSION_DENIED',
      message: 'PERMISSION_DENIED',
    });
    const client = {
      async listOpportunities() {
        throw denied;
      },
      async listQuotes() {
        throw denied;
      },
      async listWorkItems() {
        throw denied;
      },
    };
    assert.equal(isVisibilityDenied(denied), true);
    const loaded = await loadInicioLeadership(client);
    assert.equal(loaded.team.kind, 'hidden');
    assert.equal(loaded.org.kind, 'hidden');
  });
});
