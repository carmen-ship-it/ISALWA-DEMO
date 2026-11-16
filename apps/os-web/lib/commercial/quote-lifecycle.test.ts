import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { prepareQuoteTarget } from '@/lib/cliente/prepare-quote';
import { UI_5A_COMMERCIAL_COMMANDS } from '@/lib/commercial/command-types';
import {
  QUOTE_ACCEPTANCE_CHANNEL_OPTIONS,
  QUOTE_LIFECYCLE_LABELS,
  canRecordQuoteAcceptance,
  isQuoteAcceptanceChannel,
  isQuoteIssued,
  selectableApprovers,
  shortIssuedHash,
} from '@/lib/commercial/quote-lifecycle';

const read = (path: string) => readFileSync(resolve(path), 'utf8');

describe('T04 quote lifecycle UI contract', () => {
  it('exposes the seven lifecycle labels', () => {
    assert.equal(QUOTE_LIFECYCLE_LABELS.prepare, 'Preparar cotización');
    assert.equal(QUOTE_LIFECYCLE_LABELS.saveDraft, 'Guardar borrador');
    assert.equal(QUOTE_LIFECYCLE_LABELS.requestApproval, 'Solicitar aprobación');
    assert.equal(QUOTE_LIFECYCLE_LABELS.issue, 'Emitir cotización');
    assert.equal(QUOTE_LIFECYCLE_LABELS.downloadPdf, 'Descargar PDF');
    assert.equal(QUOTE_LIFECYCLE_LABELS.recordAcceptance, 'Registrar aceptación');
    assert.equal(QUOTE_LIFECYCLE_LABELS.createOrder, 'Crear pedido');
  });

  it('wires RecordQuoteCustomerAcceptance through a server action and the command allowlist', () => {
    const actions = read('lib/commercial/actions.ts');
    assert.match(actions, /export async function recordQuoteCustomerAcceptanceAction/);
    assert.match(actions, /'RecordQuoteCustomerAcceptance'/);
    assert.match(actions, /expectedRevision/);
    assert.ok(UI_5A_COMMERCIAL_COMMANDS.includes('RecordQuoteCustomerAcceptance' as never));

    const section = read('components/commercial/quote-acceptance-section.tsx');
    assert.match(section, /recordQuoteCustomerAcceptanceAction/);
    assert.match(section, /name="expectedRevision"/);
    assert.match(section, /quote\.revisionNumber/);
    assert.match(section, /QUOTE_LIFECYCLE_LABELS\.recordAcceptance/);
  });

  it('maps acceptance channels to the contract values', () => {
    assert.deepEqual(
      QUOTE_ACCEPTANCE_CHANNEL_OPTIONS.map((option) => [option.label, option.value]),
      [
        ['WhatsApp', 'whatsapp'],
        ['Llamada', 'llamada'],
        ['Visita', 'visita'],
        ['Presencial', 'presencial'],
        ['Otro', 'otro'],
      ],
    );
    assert.equal(isQuoteAcceptanceChannel('whatsapp'), true);
    assert.equal(isQuoteAcceptanceChannel('email'), false);
  });

  it('offers acceptance only for an issued, not yet accepted quote', () => {
    assert.equal(isQuoteIssued({ status: 'submitted', issuedAt: '2026-11-01T10:00:00.000Z' }), true);
    assert.equal(isQuoteIssued({ status: 'submitted', issuedAt: null }), false);
    assert.equal(canRecordQuoteAcceptance({ status: 'draft', issuedAt: null }), false);
    assert.equal(
      canRecordQuoteAcceptance({ status: 'accepted', issuedAt: '2026-11-01T10:00:00.000Z' }),
      false,
    );
  });

  it('never offers the requester as approver', () => {
    const options = [
      { memberId: 'me', displayName: 'Yo' },
      { memberId: 'ana', displayName: 'Ana' },
    ];
    assert.deepEqual(
      selectableApprovers(options, 'me').map((o) => o.memberId),
      ['ana'],
    );
    assert.deepEqual(selectableApprovers([options[0]], 'me'), []);
  });

  it('shortens the issued hash for display only', () => {
    assert.equal(shortIssuedHash(null), null);
    assert.equal(shortIssuedHash('abc123'), 'abc123');
    assert.equal(shortIssuedHash('0123456789abcdef0123456789abcdef'), '0123456789ab…cdef');
  });

  it('shows the issued document hash with an honest disclosure', () => {
    const doc = read('components/commercial/quote-document-actions.tsx');
    assert.match(doc, /data-quote-issued-hash/);
    assert.match(doc, /QUOTE_LIFECYCLE_COPY\.documentHashDisclosure/);
  });
});

describe('prepareQuoteTarget', () => {
  const open = (opportunityId: string) => ({ opportunityId, status: 'open' });
  const ok = (items: unknown[]) => ({ status: 'ok' as const, data: { items } as never });

  it('starts a new opportunity when none is open', () => {
    const target = prepareQuoteTarget({ partyId: 'p1', opportunities: ok([]) });
    assert.equal(target.kind, 'new-opportunity');
    assert.equal(target.label, 'Preparar cotización');
  });

  it('opens a new quote for exactly one open opportunity', () => {
    const target = prepareQuoteTarget({ partyId: 'p1', opportunities: ok([open('o1')]) });
    assert.equal(target.kind, 'new-quote');
    assert.match(target.href, /oportunidades\/o1\/cotizaciones\/nueva/);
  });

  it('continues the draft of the open opportunity', () => {
    const target = prepareQuoteTarget({
      partyId: 'p1',
      opportunities: ok([open('o1')]),
      linkedQuotes: [{ quoteId: 'q1', opportunityId: 'o1', status: 'draft' }],
    });
    assert.equal(target.kind, 'continue-draft');
    assert.match(target.href, /cotizaciones\/q1/);
  });

  it('never guesses between several open opportunities or an unreadable list', () => {
    const many = prepareQuoteTarget({
      partyId: 'p1',
      opportunities: ok([open('o1'), open('o2')]),
    });
    assert.equal(many.kind, 'choose-opportunity');
    const failed = prepareQuoteTarget({ partyId: 'p1', opportunities: { status: 'unavailable' } });
    assert.equal(failed.kind, 'choose-opportunity');
  });
});
