import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { ISSUE_COPY, RESPONSIBLE_ABSENT } from './labels';
import { reportIssueContextFromOrder } from './report-context';
import { TODAY_QUEUE_COPY } from '@/lib/inicio/today-queue';

function readApp(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('Lane D V1 close — Work / Attention / Issue', () => {
  it('Inicio empty copy and deterministic sources only', () => {
    const page = readApp('app/(app)/inicio/page.tsx');
    const panel = readApp('components/work/inicio-attention-panel.tsx');
    const today = readApp('lib/inicio/today-queue.ts');

    assert.match(today, /No tienes pendientes para hoy/);
    assert.match(today, /Para hoy/);
    assert.doesNotMatch(TODAY_QUEUE_COPY.description, /urgency|health score|AI priority|\bSLA\b/i);
    assert.doesNotMatch(TODAY_QUEUE_COPY.empty, /0 tareas|KPI/i);
    assert.match(panel, /inicioAttentionEmptyMessage/);
    assert.doesNotMatch(panel, /quotes\?:/);
    assert.doesNotMatch(page, /quotes=\{quotesSubmitted/);
    assert.match(page, /necesita atención hoy/i);
  });

  it('Pedido inherits order relation for Reportar incidencia', () => {
    const pedido = readApp('app/(app)/clientes/[partyId]/pedidos/[orderId]/page.tsx');
    assert.match(pedido, /ReportIssueTrigger/);
    assert.match(pedido, /reportIssueContextFromOrder/);
    assert.doesNotMatch(pedido, /name="referenceId"/);
    const ctx = reportIssueContextFromOrder('ord_x', 'O-9', 'pty_x');
    assert.equal(ctx.referenceType, 'order');
    assert.equal(ctx.referenceLabel, 'O-9');
    assert.equal(ctx.partyId, 'pty_x');
  });

  it('Issue responsible uses shared empty copy and gates Asignar', () => {
    const detail = readApp('app/(app)/incidencias/[issueId]/page.tsx');
    const actions = readApp('lib/issue/actions.ts');
    assert.equal(ISSUE_COPY.noOwner, RESPONSIBLE_ABSENT);
    assert.equal(ISSUE_COPY.owner, 'Quién es responsable');
    assert.match(detail, /AssignIssueOwnerForm/);
    assert.match(detail, /ISSUE_MANAGE_SCOPE/);
    assert.match(detail, /canAssignOwner/);
    assert.match(actions, /AssignIssueOwner/);
    assert.match(actions, /unauthorizedAssign/);
  });

  it('Issue resolve gates owner or issue.manage and calls ResolveIssue', () => {
    const detail = readApp('app/(app)/incidencias/[issueId]/page.tsx');
    const actions = readApp('lib/issue/actions.ts');
    const commandService = readFileSync(
      join(process.cwd(), '../../packages/os-issue/src/issue-command-service.ts'),
      'utf8',
    );
    assert.match(detail, /ResolveIssueForm/);
    assert.match(detail, /canResolve/);
    assert.match(detail, /getEvaluationProjection/);
    assert.match(detail, /!evaluation\.active/);
    assert.match(detail, /loadMemberCapabilities/);
    assert.match(detail, /loadActorRoleKeys/);
    assert.match(detail, /ISSUE_COPY\.resolveIssue/);
    assert.equal((detail.match(/<ResolveIssueForm/g) ?? []).length, 1);
    assert.match(actions, /resolveIssueAction/);
    assert.match(actions, /ResolveIssue/);
    assert.match(actions, /assertRolePreviewAllowsMutation/);
    assert.doesNotMatch(commandService, /assertTransition\(issue\.status, 'resolved'\)/);
    assert.match(commandService, /one-shot resolve|non-terminal/i);
    assert.equal(ISSUE_COPY.resolveIssue, 'Resolver incidencia');
    assert.equal(ISSUE_COPY.resolutionRequired, 'Describa la resolución.');
  });

  it('does not invent a severity taxonomy on report surfaces', () => {
    const labels = readApp('lib/issue/labels.ts');
    const drawer = readApp('components/issue/report-issue-drawer.tsx');
    assert.doesNotMatch(labels, /\bseverity\b|\bcritical\b|\bP[0-9]\b/i);
    assert.doesNotMatch(drawer, /\bseverity\b|\bcritical\b/i);
    assert.equal(ISSUE_COPY.reportAction, 'Reportar incidencia');
  });
});
