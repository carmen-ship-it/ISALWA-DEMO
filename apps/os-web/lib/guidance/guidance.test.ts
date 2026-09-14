import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { OWNER_ABSENT_LABEL } from '../party/customer-self-service';
import {
  GUIDANCE_KIND_TONE,
  guidanceRole,
} from './kinds';
import { claimsCargoAuthority, guidanceNoteView, guidanceText, guidanceViolations } from './model';
import { reportedPaymentGuidance } from './reported-payment';
import {
  ayudaSections,
  guidanceForConvertQuote,
  guidanceForCreateCustomer,
  guidanceForCreateQuote,
  guidanceForReassignOwner,
  guidanceForSearchCustomer,
  guidanceForSendQuote,
} from './select';
import type { GuidanceNoteModel } from './model';

function readUi(relativePath: string): string {
  return readFileSync(resolve(relativePath), 'utf8');
}

function kindsOf(notes: readonly GuidanceNoteModel[]): string[] {
  return notes.map((note) => note.kind);
}

describe('guidance kinds', () => {
  it('keeps checklist as Consejo and consequence as Regla', () => {
    assert.equal(guidanceRole('consejo'), 'checklist');
    assert.equal(guidanceRole('regla'), 'consequence');
    assert.equal(guidanceRole('sugerencia'), 'suggestion');
  });

  it('uses existing StatusPill tones and does not invent one for Sugerencia', () => {
    assert.equal(GUIDANCE_KIND_TONE.consejo, 'neutral');
    assert.equal(GUIDANCE_KIND_TONE.regla, 'info');
    assert.equal(GUIDANCE_KIND_TONE.sugerencia, 'warning');
    const view = guidanceNoteView({
      id: 'unused-sugerencia',
      kind: 'sugerencia',
      title: 'Sin sugerencia gobernada',
      items: ['No hay una sugerencia que no sea lista ni consecuencia.'],
    });
    assert.equal(view.tone, 'warning');
    assert.equal(view.role, 'suggestion');
    assert.equal(view.label, 'Sugerencia');
  });
});

describe('customer create guidance', () => {
  it('blocks create with a Regla when more matches remain', () => {
    const notes = guidanceForCreateCustomer({ matchCount: 25, hasMoreMatches: true });
    assert.deepEqual(kindsOf(notes), ['regla']);
    assert.match(guidanceText(notes), /Afine la búsqueda antes de crear/);
    assert.match(guidanceText(notes), /No se fusiona en silencio/);
    assert.equal(notes.some((note) => note.kind === 'consejo'), false);
  });

  it('asks to open an existing match and states that create does not merge', () => {
    const notes = guidanceForCreateCustomer({ matchCount: 2, hasMoreMatches: false });
    assert.equal(notes[0]?.kind, 'consejo');
    assert.match(guidanceText(notes), /Si ya existe, no cree otro/);
    assert.match(guidanceText(notes), /Si uno de estos es el mismo cliente, ábralo/);
    assert.match(guidanceText(notes), /Un teléfono repetido no fusiona el cliente/);
    assert.equal(notes.some((note) => note.id === 'create-customer-no-merge' && note.kind === 'regla'), true);
  });

  it('keeps the search checklist and the no-merge consequence when nothing matched', () => {
    const notes = guidanceForCreateCustomer({ matchCount: 0, hasMoreMatches: false });
    assert.deepEqual(
      notes.map((note) => note.id),
      ['search-customer-checklist', 'create-customer-no-merge'],
    );
  });
});

describe('search-first guidance', () => {
  it('adds the existing minimum-length checklist only after one character', () => {
    const empty = guidanceForSearchCustomer({ queryLength: 0 });
    const short = guidanceForSearchCustomer({ queryLength: 1 });
    const ready = guidanceForSearchCustomer({ queryLength: 4 });
    assert.equal(short.some((note) => note.id === 'search-customer-min-length'), true);
    assert.equal(empty.some((note) => note.id === 'search-customer-min-length'), false);
    assert.equal(ready.some((note) => note.id === 'search-customer-min-length'), false);
    assert.match(guidanceText(short), /Escriba al menos 2 caracteres para buscar/);
    assert.equal(empty.every((note) => note.kind === 'consejo'), true);
  });
});

describe('quote guidance', () => {
  it('says creating a quote leaves a draft and does not create an order', () => {
    const text = guidanceText(guidanceForCreateQuote());
    assert.match(text, /Confirme que esta es la oportunidad correcta/);
    assert.match(text, /Crear deja un borrador\. No envía la cotización/);
    assert.match(text, /Aprobar registra la decisión\. No crea un pedido/);
    assert.match(text, /Convertir crea un pedido desde una cotización enviada/);
    assert.match(text, /No emite factura ni nota de entrega/);
  });

  it('requires a line before send and still states send does not grant approval', () => {
    const empty = guidanceForSendQuote({ lineCount: 0 });
    const ready = guidanceForSendQuote({ lineCount: 2 });
    assert.equal(empty[0]?.id, 'send-quote-needs-lines');
    assert.equal(empty[0]?.kind, 'consejo');
    assert.equal(ready.some((note) => note.id === 'send-quote-needs-lines'), false);
    for (const notes of [empty, ready]) {
      const text = guidanceText(notes);
      assert.match(text, /Revise el cliente, las líneas y las cantidades/);
      assert.match(text, /Enviar no la otorga/);
      assert.match(text, /Aprobar registra la decisión\. No crea un pedido/);
      assert.match(text, /No emite factura ni nota de entrega/);
    }
  });

  it('offers the convert checklist only for a submitted quote', () => {
    const submitted = guidanceForConvertQuote({ quoteStatus: 'submitted' });
    const draft = guidanceForConvertQuote({ quoteStatus: 'draft' });
    assert.equal(submitted.some((note) => note.id === 'convert-quote-checklist' && note.kind === 'consejo'), true);
    assert.equal(draft.some((note) => note.kind === 'consejo'), false);
    for (const notes of [submitted, draft]) {
      const text = guidanceText(notes);
      assert.match(text, /Convertir crea un pedido desde una cotización enviada\. No emite factura ni nota de entrega/);
      assert.match(text, /Aprobar registra la decisión\. No crea un pedido/);
      assert.match(text, /El cargo no asigna la cuenta ni autoriza convertir/);
    }
  });
});

describe('owner and payment boundaries', () => {
  it('treats cargo as not authority and does not change approver on reassignment', () => {
    const assigned = guidanceForReassignOwner({ currentOwnerLabel: 'Isa' });
    const absent = guidanceForReassignOwner({ currentOwnerLabel: OWNER_ABSENT_LABEL });
    assert.equal(assigned[0]?.id, 'reassign-owner-checklist');
    assert.equal(absent[0]?.id, 'assign-owner-checklist');
    for (const notes of [assigned, absent]) {
      const text = guidanceText(notes);
      assert.match(text, /No se infiere del cargo/);
      assert.match(text, /No cambia el aprobador ni otorga permisos/);
      assert.match(text, /El cargo no asigna la cuenta ni autoriza convertir/);
      assert.equal(claimsCargoAuthority(text), false);
    }
  });

  it('exports a reported-payment fragment a customer message cannot confirm', () => {
    const text = guidanceText(reportedPaymentGuidance);
    assert.equal(reportedPaymentGuidance.every((note) => note.kind === 'regla'), true);
    assert.match(text, /Dicho por el cliente no es un cobro confirmado/);
    assert.match(text, /Registrar un pago reportado no confirma el cobro/);
    assert.match(text, /Sigue pendiente de confirmar/);
    assert.doesNotMatch(text, /\/mapa|abrir mapa/i);
    assert.equal(reportedPaymentGuidance.some((note) => note.kind === 'consejo'), false);
  });
});

describe('ayuda and copy guards', () => {
  it('keeps standing rules and does not navigate to Mapa', () => {
    const sections = ayudaSections();
    const text = sections.map((section) => guidanceText(section.notes)).join('\n');
    assert.match(text, /Inicio muestra lo que ya requiere su atención/);
    assert.match(text, /Buscar encuentra clientes, oportunidades, cotizaciones y trabajo de su alcance/);
    assert.match(text, /Lo marcado Vista demo no está conectado/);
    assert.match(text, /Un mensaje no confirma un pago|Dicho por el cliente no es un cobro confirmado/);
    assert.doesNotMatch(text, /\/mapa|abrir mapa/i);
    assert.equal(sections.some((section) => section.notes.some((note) => note.kind === 'sugerencia')), false);
    for (const section of sections) {
      for (const note of section.notes) {
        assert.deepEqual(guidanceViolations(note), []);
        const view = guidanceNoteView(note);
        if (note.kind === 'consejo') assert.equal(view.role, 'checklist');
        if (note.kind === 'regla') assert.equal(view.role, 'consequence');
      }
    }
  });
});

describe('workflow attachment', () => {
  it('attaches guidance without changing commercial or customer commands', () => {
    const createCustomer = readUi('components/party/customer-create-form.tsx');
    const search = readUi('components/party/customer-search-first-form.tsx');
    const convert = readUi('components/commercial/convert-quote-form.tsx');
    const reassign = readUi('components/party/reassign-owner-form.tsx');
    const createQuote = readUi('components/commercial/quote-create-form.tsx');
    const editor = readUi('components/commercial/quote-editor.tsx');
    const ayuda = readUi('app/(app)/ayuda/page.tsx');

    assert.match(createCustomer, /guidanceForCreateCustomer/);
    assert.match(createCustomer, /createCustomerAction/);
    assert.doesNotMatch(createCustomer, /name="nit"|name="ownerMemberId"|RequestPartyMerge/);
    assert.match(search, /guidanceForSearchCustomer/);
    assert.match(convert, /guidanceForConvertQuote/);
    assert.match(convert, /createOrderAction/);
    assert.match(reassign, /guidanceForReassignOwner/);
    assert.match(reassign, /reassignCommercialAccountOwnerAction/);
    assert.match(reassign, /Confirmo el cambio de responsable/);
    assert.match(createQuote, /guidanceForCreateQuote/);
    assert.match(createQuote, /createQuoteAction/);
    assert.match(editor, /guidanceForSendQuote/);
    assert.match(editor, /submitQuoteAction/);
    assert.match(editor, /Enviar cotización/);
    assert.doesNotMatch(editor, /RegisterFollowUpForm|createFollowUpAction/);
    assert.match(ayuda, /ayudaSections/);
    assert.doesNotMatch([createCustomer, search, convert, reassign, createQuote, editor, ayuda].join('\n'), /\/mapa/);
  });
});
