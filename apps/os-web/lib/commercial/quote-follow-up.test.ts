import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import {
  CreateWorkItemPayloadSchema,
  QUOTE_STATUSES,
  WORK_COMMAND_NAMES,
} from '@isalwa/os-contracts';
import { followUpOwnerFromAuthenticatedSession } from '@/lib/auth/session-identity';
import { canRegisterQuoteFollowUp } from '@/lib/commercial/quote-follow-up';
import { FOLLOW_UP_UI_COMMANDS, followUpCommandPath } from '@/lib/work/command-types';
import {
  FOLLOW_UP_COPY,
  bindFollowUpOwner,
  buildCreateFollowUpPayload,
  isBlockedFollowUpSubject,
  resolveFollowUpSubject,
} from '@/lib/work/follow-up';

const quotePage = readFileSync(
  resolve('app/(app)/clientes/[partyId]/cotizaciones/[quoteId]/page.tsx'),
  'utf8',
);
const quoteEditor = readFileSync(resolve('components/commercial/quote-editor.tsx'), 'utf8');
const followUpForm = readFileSync(resolve('components/work/register-follow-up-form.tsx'), 'utf8');
const workActions = readFileSync(resolve('lib/work/actions.ts'), 'utf8');
const commercialActions = readFileSync(resolve('lib/commercial/actions.ts'), 'utf8');
const eligibility = readFileSync(resolve('lib/commercial/quote-follow-up.ts'), 'utf8');
const pdfButton = readFileSync(resolve('components/commercial/quote-pdf-download-button.tsx'), 'utf8');
const inicio = readFileSync(resolve('app/(app)/inicio/page.tsx'), 'utf8');

function functionSource(source: string, name: string): string {
  const start = source.indexOf(`export async function ${name}`);
  assert.notEqual(start, -1, name);
  const next = source.indexOf('\nexport ', start + 1);
  return source.slice(start, next === -1 ? undefined : next);
}

describe('CC-4 submitted quote follow-up', () => {
  it('exposes Registrar seguimiento only for a submitted quote', () => {
    assert.equal(FOLLOW_UP_COPY.action, 'Registrar seguimiento');
    assert.equal(canRegisterQuoteFollowUp('submitted'), true);
    for (const status of QUOTE_STATUSES) {
      if (status === 'submitted') continue;
      assert.equal(canRegisterQuoteFollowUp(status), false, status);
    }

    assert.match(quotePage, /canRegisterQuoteFollowUp\(quote\.status\)/);
    assert.match(quotePage, /RegisterFollowUpForm/);
    assert.match(quotePage, /partyId=\{quote\.partyId\}/);
    assert.match(quotePage, /quoteId=\{quote\.quoteId\}/);
    assert.match(followUpForm, /FOLLOW_UP_COPY\.action/);
    assert.match(followUpForm, /name="title"/);
    assert.match(followUpForm, /name="description"/);
    assert.match(followUpForm, /name="dueAt"/);
    assert.match(followUpForm, /createFollowUpAction/);
  });

  it('keeps draft quote behavior honest and does not attach follow-up to the editor', () => {
    assert.equal(canRegisterQuoteFollowUp('draft'), false);
    assert.equal(canRegisterQuoteFollowUp('accepted'), false);
    assert.equal(canRegisterQuoteFollowUp('cancelled'), false);
    assert.doesNotMatch(quoteEditor, /RegisterFollowUpForm/);
    assert.doesNotMatch(quoteEditor, /createFollowUpAction/);
    assert.match(quoteEditor, /Enviar cotización/);
    assert.match(quoteEditor, /submitQuoteAction/);
  });

  it('uses the existing CC-2 payload and customer or commercial-account subject', () => {
    const partySubject = resolveFollowUpSubject({ partyId: 'party-1' });
    assert.deepEqual(partySubject, { subjectType: 'party', subjectId: 'party-1' });
    const accountSubject = resolveFollowUpSubject({
      partyId: 'party-1',
      commercialAccountId: 'ca-1',
    });
    assert.deepEqual(accountSubject, { subjectType: 'commercial_account', subjectId: 'ca-1' });

    const owner = followUpOwnerFromAuthenticatedSession(
      { memberId: 'mem-current', organizationId: 'org-1', accessStatus: 'active' },
      { ownerMemberId: 'mem-other', organizationId: 'org-other' },
    );
    assert.equal(owner, 'mem-current');
    assert.equal(bindFollowUpOwner(owner ?? '', 'mem-other'), 'mem-current');

    const built = buildCreateFollowUpPayload({
      title: 'Llamar al cliente para confirmar cantidades',
      description: 'Confirmar la cotización enviada.',
      dueAt: '2026-09-14T10:00',
      ownerMemberId: owner ?? '',
      subjectType: accountSubject?.subjectType ?? 'quote',
      subjectId: accountSubject?.subjectId ?? 'quote-1',
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.equal(built.command, 'CreateWorkItem');
    assert.equal(followUpCommandPath(built.command), '/commands/CreateWorkItem');
    const parsed = CreateWorkItemPayloadSchema.safeParse(built.payload);
    assert.equal(parsed.success, true);
    if (!parsed.success) return;
    assert.equal(parsed.data.ownerMemberId, 'mem-current');
    assert.equal(parsed.data.subjectType, 'commercial_account');
    assert.equal(parsed.data.subjectId, 'ca-1');
    assert.equal('quoteId' in built.payload, false);
    assert.equal('organizationId' in built.payload, false);
    assert.equal('tenantId' in built.payload, false);

    assert.equal(isBlockedFollowUpSubject('quote'), true);
    const quoteSubject = buildCreateFollowUpPayload({
      title: 'Llamar al cliente para confirmar cantidades',
      ownerMemberId: 'mem-current',
      subjectType: 'quote',
      subjectId: 'quote-1',
    });
    assert.equal(quoteSubject.ok, false);
  });

  it('keeps the authenticated member as owner and rejects caller owner or tenant fields', () => {
    assert.equal(
      followUpOwnerFromAuthenticatedSession(
        { memberId: 'mem-hosted', organizationId: 'org-1', accessStatus: 'active' },
        { ownerMemberId: 'mem-attacker', organizationId: 'org-other' },
      ),
      'mem-hosted',
    );
    assert.doesNotMatch(followUpForm, /name="ownerMemberId"/);
    assert.doesNotMatch(followUpForm, /name="organizationId"/);
    assert.doesNotMatch(followUpForm, /name="tenantId"/);
    assert.doesNotMatch(followUpForm, /name="subjectType"/);
    assert.doesNotMatch(followUpForm, /name="subjectId"/);
    assert.match(followUpForm, /name="quoteId"/);

    const callAt = workActions.lastIndexOf('buildCreateFollowUpPayload({');
    const payloadBlock = workActions.slice(callAt, workActions.indexOf('if (!built.ok) return built;', callAt));
    assert.match(payloadBlock, /subjectType: subject\.subjectType/);
    assert.match(payloadBlock, /subjectId: subject\.subjectId/);
    assert.doesNotMatch(payloadBlock, /quoteId/);
    assert.doesNotMatch(payloadBlock, /subjectType:\s*'quote'/);
    assert.doesNotMatch(workActions, /formData\.get\('subjectType'\)/);
    assert.doesNotMatch(workActions, /formData\.get\('subjectId'\)/);
    assert.doesNotMatch(workActions, /formData\.get\('tenantId'\)/);
    assert.match(workActions, /followUpOwnerFromAuthenticatedSession/);
    assert.match(workActions, /getAuthenticatedSession/);
  });

  it('does not auto-create a follow-up when a quote is submitted', () => {
    const submit = functionSource(commercialActions, 'submitQuoteAction');
    assert.match(submit, /SubmitQuote/);
    assert.doesNotMatch(submit, /CreateWorkItem|createFollowUpAction|RegisterFollowUpForm|AttentionItem/);
    assert.doesNotMatch(submit, /dueAt|overdue|SLA|stale quote|reminder/i);
    assert.doesNotMatch(eligibility, /CreateWorkItem|executeWorkCommand|executeCommand/);
    assert.doesNotMatch(eligibility, /overdue|SLA|stale quote|reminder|after \d+ days/i);
    assert.doesNotMatch(quotePage, /overdue|\bSLA\b|reminder period|quote overdue/i);
    assert.doesNotMatch(workActions, /AttentionItem|createAttention|listAttention/);
    assert.match(workActions, /revalidatePath\(quoteHref\(partyId, quoteId\)\)/);
    assert.match(workActions, /revalidatePath\(partyHref\(partyId\)\)/);
    assert.match(workActions, /revalidatePath\('\/trabajo'\)/);
  });

  it('preserves PDF preview and download and adds no API or schema', () => {
    assert.match(quotePage, /QuotePdfDownloadButton/);
    assert.match(pdfButton, /Descargar cotización/);
    assert.match(pdfButton, /Vista previa/);
    assert.match(pdfButton, /\/api\/quotes\//);
    assert.deepEqual(FOLLOW_UP_UI_COMMANDS, ['CreateWorkItem', 'CompleteWork']);
    for (const command of FOLLOW_UP_UI_COMMANDS) {
      assert.equal(WORK_COMMAND_NAMES.includes(command), true);
    }
    assert.doesNotMatch(eligibility, /schema|supabase|CREATE TABLE/i);
    assert.doesNotMatch(quotePage, /app\/api\/quotes\/.*follow/i);
    assert.doesNotMatch(inicio, /canRegisterQuoteFollowUp/);
    assert.doesNotMatch(inicio, /RegisterFollowUpForm/);
  });
});
