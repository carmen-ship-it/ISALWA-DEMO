import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { t } from '@/lib/i18n/es';
import {
  NAMED_EXCEPTION_IDS,
  cardsFromExceptionQuery,
  composeManagementLens,
  namedExceptionLabels,
  recordedExceptionQueryOnBranch,
  type ManagementExceptionQuery,
  type NamedExceptionId,
} from '@/lib/management/exceptions';
import { MANAGEMENT_ORG_READ_SCOPE, viewerHasManagementOrgRead } from '@/lib/management/scope';

const appRoot = resolve(__dirname, '../..');

function readApp(path: string): string {
  return readFileSync(resolve(appRoot, path), 'utf8');
}

const FORBIDDEN_LABEL =
  /revenue|ingreso|margen|margin|\bcosto\b|\bcost\b|stock oficial|insumo oficial|cash collected|cobrado|recaudad|kpi|valor de pedidos/i;

const SAME_TENANT = 'org-a';

function query(
  exceptionId: NamedExceptionId,
  records: ManagementExceptionQuery['records'],
  organizationId = SAME_TENANT,
): ManagementExceptionQuery {
  return { organizationId, exceptionId, records };
}

describe('Inicio management lens', () => {
  it('keeps empty labels factual and does not invent a zero or a money figure', () => {
    const model = composeManagementLens({
      roleKeys: [MANAGEMENT_ORG_READ_SCOPE],
      viewerOrganizationId: SAME_TENANT,
      query: recordedExceptionQueryOnBranch(),
    });

    assert.equal(model.orgCount, null);
    assert.equal(model.cards, null);
    assert.equal(model.emptyMessage, 'Aún no hay excepciones registradas.');
    assert.equal(model.noRecord, 'Sin registro');
    assert.doesNotMatch(model.emptyMessage, /0|cero|revenue|ingreso/i);
    assert.doesNotMatch(model.noRecord, /0/);
    assert.equal(model.labels.length, NAMED_EXCEPTION_IDS.length);
    assert.equal(
      model.labels.every((item) => item.recorded === null),
      true,
    );
    assert.deepEqual(
      model.lanes.map((lane) => lane.label),
      ['Qué está esperando', 'Quién lo maneja', 'Qué necesita atención'],
    );
    assert.equal(
      model.labels.some((item) => item.lane === 'owner'),
      false,
    );

    const copy = [
      ...model.labels.map((item) => item.label),
      model.emptyMessage,
      model.noRecord,
      model.ownerEmpty,
      model.orgFiguresHidden,
      t('pages.inicio.managementDescription'),
    ].join('\n');
    assert.doesNotMatch(copy, FORBIDDEN_LABEL);
    for (const label of model.labels.map((item) => item.label)) {
      assert.equal(/pedido/i.test(label) && /quema/i.test(label), false);
    }
    const quema = model.labels.find((item) => item.id === 'active-quemas');
    assert.equal(quema?.label, 'Quemas activas');
    assert.doesNotMatch(quema?.label ?? '', /pedido/i);
    assert.match(copy, /Quemas activas/);
    assert.match(copy, /Pedidos en espera de asignación/);
    assert.match(copy, /solo por conteo/);
    assert.match(copy, /Fecha del cliente frente a la fecha interna de producción/);
    assert.match(copy, /Evidencia faltante/);
    assert.match(copy, /Pedidos entregados/);
  });

  it('hides org records without management.org.read and does not infer the scope', () => {
    assert.equal(viewerHasManagementOrgRead([]), false);
    assert.equal(viewerHasManagementOrgRead(['people.admin', 'commercial.org.read']), false);
    assert.equal(viewerHasManagementOrgRead([MANAGEMENT_ORG_READ_SCOPE]), true);

    const row = {
      id: 'ex-1',
      organizationId: SAME_TENANT,
      exceptionId: 'active-quemas' as const,
      waitingOn: 'Una quema sigue activa',
      handledBy: 'Ana',
      attention: 'Sigue en horno',
    };
    const denied = composeManagementLens({
      roleKeys: ['people.admin'],
      viewerOrganizationId: SAME_TENANT,
      query: query('active-quemas', [row]),
    });
    assert.equal(denied.canReadOrg, false);
    assert.equal(denied.cards, null);
    assert.equal(denied.orgCount, null);
    assert.equal(denied.labels.every((item) => item.recorded === null), true);
  });

  it('refuses a number unless the query is filtered to the viewer tenant', () => {
    const row = {
      id: 'ex-1',
      organizationId: SAME_TENANT,
      exceptionId: 'missing-evidence' as const,
      waitingOn: 'Falta una nota',
      handledBy: 'Ana',
      attention: 'Sin evidencia',
    };
    assert.equal(cardsFromExceptionQuery('', query('missing-evidence', [row])), null);
    assert.equal(cardsFromExceptionQuery(SAME_TENANT, null), null);
    assert.equal(cardsFromExceptionQuery(SAME_TENANT, query('missing-evidence', [row], 'org-b')), null);
    assert.equal(
      cardsFromExceptionQuery(SAME_TENANT, query('missing-evidence', [{ ...row, organizationId: 'org-b' }])),
      null,
    );
    assert.equal(
      cardsFromExceptionQuery(
        SAME_TENANT,
        query('missing-evidence', [row, { ...row, id: 'ex-2', organizationId: 'org-b' }]),
      ),
      null,
    );
    assert.equal(cardsFromExceptionQuery(SAME_TENANT, query('missing-evidence', [])), null);
    assert.equal(
      cardsFromExceptionQuery(
        SAME_TENANT,
        query('missing-evidence', [{ ...row, exceptionId: 'active-quemas' }]),
      ),
      null,
    );

    const cards = cardsFromExceptionQuery(SAME_TENANT, query('missing-evidence', [row]));
    assert.deepEqual(cards, [
      {
        id: 'ex-1',
        exceptionId: 'missing-evidence',
        waitingOn: 'Falta una nota',
        handledBy: 'Ana',
        attention: 'Sin evidencia',
      },
    ]);
    assert.equal(cards?.every((card) => !('amount' in card) && !('centavos' in card)), true);
    assert.equal(namedExceptionLabels().every((item) => item.recorded === null), true);
  });

  it('mounts the lens from Inicio without inventing production, stock, or money queries', () => {
    const page = readApp('app/(app)/inicio/page.tsx');
    const lens = readApp('components/management/inicio-management-lens.tsx');
    const loader = readApp('lib/management/load-inicio-management.ts');
    const exceptions = readApp('lib/management/exceptions.ts');
    const walkthrough = readApp('lib/walkthrough/chapters/global.ts');
    const labels = namedExceptionLabels().map((item) => item.label);
    const surface = [lens, ...labels].join('\n');
    for (const label of labels) {
      assert.equal(/pedido/i.test(label) && /quema/i.test(label), false);
    }

    assert.match(page, /InicioManagementLens/);
    assert.match(page, /InicioAttentionPanel/);
    assert.doesNotMatch(page, /data-tour=/);
    assert.match(walkthrough, /target: 'home-attention'/);
    assert.doesNotMatch(surface, FORBIDDEN_LABEL);
    assert.doesNotMatch(lens, /quema.{0,80}pedido|pedido.{0,80}quema/i);
    assert.doesNotMatch(lens, /MetricCard|StatGroup/);
    assert.doesNotMatch(loader, /listOrders|listQuotes|listAttention|payment|centavos/);
    assert.match(loader, /recordedExceptionQueryOnBranch\(\)/);
    assert.match(exceptions, /query\.organizationId !== tenant/);
    assert.match(exceptions, /row\.organizationId !== tenant/);
    assert.match(exceptions, /recorded: null/);
  });
});
