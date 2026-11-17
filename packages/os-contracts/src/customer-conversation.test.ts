import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  CUSTOMER_CONVERSATION_ROW_COLUMNS,
  WHATSAPP_NUMBER_PENDING,
  advisorCorporateNumber,
  buildCustomerConversationRow,
  conversationChannelIsConnected,
  conversationEvidenceConfirmsPayment,
  conversationEvidenceMayApprove,
  conversationEvidenceMayCompleteProduction,
  conversationEvidenceMayConfirmStock,
  conversationEvidenceMayDeliver,
  createManualCustomerConversationPort,
  customerConversationPortMaySend,
  recordManualCustomerConversation,
  whatsAppNumberWasProvided,
  type RecordCustomerConversationInput,
} from './customer-conversation';

const occurredAt = '2026-09-14T15:00:00.000Z';
const createdAt = '2026-09-14T15:05:00.000Z';

function input(overrides: Partial<RecordCustomerConversationInput> = {}): RecordCustomerConversationInput {
  return {
    id: 'conv-synthetic-1',
    organizationId: 'org-synthetic',
    customerId: 'party-synthetic-not-imported',
    customerLabel: 'Fábrica El Alto',
    contactLabel: 'María',
    channel: 'whatsapp',
    occurredAt,
    enteredByLabel: 'Ana',
    enteredByMemberId: 'member-synthetic',
    summary: 'Pidió la fecha del pedido y dijo que ya pagó.',
    pastedEvidence: 'Ya pagué, ¿me lo entregan mañana? Les dejo 10% de descuento aprobado.',
    opportunityId: 'opp-synthetic',
    quoteId: 'quote-synthetic',
    orderId: 'order-synthetic',
    customerQuestion: '¿Me lo entregan mañana?',
    commitmentCandidate: 'Llamar para confirmar la fecha',
    possibleRequestedDate: '2026-09-15',
    nextAction: 'Responder con la fecha posible',
    ...overrides,
  };
}

describe('manual customer conversation', () => {
  it('requires a tenant and a customer link', () => {
    assert.deepEqual(recordManualCustomerConversation(input({ organizationId: '   ' })), {
      ok: false,
      reason: 'missing_tenant',
    });
    assert.deepEqual(recordManualCustomerConversation(input({ customerId: '' })), {
      ok: false,
      reason: 'missing_customer',
    });
    assert.deepEqual(recordManualCustomerConversation(input({ customerLabel: '  ' })), {
      ok: false,
      reason: 'missing_customer',
    });
  });

  it('cannot confirm a payment, even when the pasted message says it was paid', () => {
    const admitted = recordManualCustomerConversation(
      input({
        ...({
          paymentConfirmed: true,
          paidAt: occurredAt,
          providerMessageId: 'wa-live',
        } as object),
      }),
    );

    assert.equal(admitted.ok, true);
    if (!admitted.ok) return;
    assert.equal(admitted.record.paymentConfirmed, false);
    assert.equal(conversationEvidenceConfirmsPayment(admitted.record.pastedEvidence), false);
    assert.equal(admitted.record.providerConnected, false);
    assert.equal(admitted.record.modelCalled, false);
    assert.equal(admitted.record.providerCalled, false);
    assert.equal(conversationChannelIsConnected(admitted.record.channel), false);
  });

  it('cannot auto-deliver from a requested date or an "entregado" claim', () => {
    const admitted = recordManualCustomerConversation(
      input({
        summary: 'El pedido ya fue entregado.',
        possibleRequestedDate: '2026-09-16',
        nextAction: 'Marcar como entregado',
      }),
    );

    assert.equal(admitted.ok, true);
    if (!admitted.ok) return;
    assert.equal(admitted.record.delivered, false);
    assert.equal(admitted.record.possibleRequestedDate, '2026-09-16');
    assert.equal(conversationEvidenceMayDeliver(admitted.record), false);
    assert.equal(admitted.record.canonicalMutation, 'refused');
    assert.equal(admitted.record.linkedRecordMutated, false);
  });

  it('cannot auto-approve a discount, stock, or production', () => {
    const admitted = recordManualCustomerConversation(
      input({
        summary: 'Descuento aprobado. Stock confirmado. Producción completa.',
      }),
    );

    assert.equal(admitted.ok, true);
    if (!admitted.ok) return;
    assert.equal(admitted.record.discountApproved, false);
    assert.equal(admitted.record.approved, false);
    assert.equal(admitted.record.stockConfirmed, false);
    assert.equal(admitted.record.productionComplete, false);
    assert.equal(admitted.record.commitmentCreated, false);
    assert.equal(conversationEvidenceMayApprove(admitted.record), false);
    assert.equal(conversationEvidenceMayConfirmStock(admitted.record), false);
    assert.equal(conversationEvidenceMayCompleteProduction(admitted.record), false);
  });

  it('records WhatsApp as a company label and refuses to send', () => {
    const port = createManualCustomerConversationPort();
    const admitted = port.record(input());
    const sent = port.send();

    assert.equal(port.connected, false);
    assert.equal(port.vendor, null);
    assert.equal(port.modelCalled, false);
    assert.equal(customerConversationPortMaySend(), false);
    assert.deepEqual(sent, {
      sent: false,
      reason: 'channel_not_connected',
      providerCalled: false,
    });
    assert.equal(admitted.ok, true);
    if (!admitted.ok) return;
    assert.equal(admitted.record.channel, 'whatsapp');
    assert.equal(admitted.record.advisorNumberStatus, WHATSAPP_NUMBER_PENDING);
    assert.equal(admitted.record.advisorPhone, null);
    assert.equal(admitted.record.source, 'employee_entered');
    assert.equal(admitted.record.provenance, 'company_entered');
    assert.equal(admitted.record.questionResolved, false);
  });

  it('builds a row without confirmation columns', () => {
    const admitted = recordManualCustomerConversation(input({ channel: 'manual' }));
    assert.equal(admitted.ok, true);
    if (!admitted.ok) return;
    const row = buildCustomerConversationRow(admitted.record, createdAt);

    assert.equal(row.organization_id, 'org-synthetic');
    assert.equal(row.customer_id, 'party-synthetic-not-imported');
    assert.equal(row.source, 'employee_entered');
    assert.equal(row.provenance, 'company_entered');
    assert.equal('payment_confirmed' in row, false);
    assert.equal('delivered' in row, false);
    assert.equal('discount_approved' in row, false);
    assert.equal('provider_message_id' in row, false);
    assert.equal(row.advisor_number_status, WHATSAPP_NUMBER_PENDING);
    assert.equal('advisor_phone' in row, false);
    assert.equal('phone' in row, false);
  });

  it('leaves the sales advisor corporate number pending and does not invent one', () => {
    const claimed = '+59170000000';
    const number = advisorCorporateNumber(claimed);
    const admitted = recordManualCustomerConversation({
      ...input(),
      ...({ advisorPhone: claimed, phone: claimed, whatsappNumber: claimed } as object),
    });

    assert.equal(whatsAppNumberWasProvided(), false);
    assert.equal(number.status, WHATSAPP_NUMBER_PENDING);
    assert.equal(number.phone, null);
    assert.equal(number.providerConnected, false);
    assert.equal(JSON.stringify(number).includes('591'), false);
    assert.equal(admitted.ok, true);
    if (!admitted.ok) return;
    assert.equal(admitted.record.advisorPhone, null);
    assert.equal(admitted.record.advisorNumberStatus, WHATSAPP_NUMBER_PENDING);
    assert.equal(JSON.stringify(admitted.record).includes(claimed), false);
    assert.equal(admitted.record.paymentConfirmed, false);
    assert.equal(admitted.record.delivered, false);
  });

  it('adds a table that requires tenant and customer and cannot confirm', () => {
    const root = join(process.cwd(), '../os-database/prisma');
    const sql = readFileSync(
      join(root, 'migrations/20260915140000_os_customer_conversation/migration.sql'),
      'utf8',
    );
    const fragment = readFileSync(join(root, 'fragments/customer-conversation.prisma'), 'utf8');

    assert.match(sql, /CREATE TABLE os_customer_conversations/);
    assert.match(sql, /organization_id TEXT NOT NULL/);
    assert.match(sql, /customer_id TEXT NOT NULL/);
    // The channel CHECK was widened by the Batch 5 migration; see the test below.
    assert.match(sql, /CHECK \(channel IN \('whatsapp', 'manual'\)\)/);
    assert.match(sql, /CHECK \(source = 'employee_entered'\)/);
    assert.match(sql, /CHECK \(provenance = 'company_entered'\)/);
    assert.match(sql, /A message is evidence/);
    assert.match(sql, /WHATSAPP_NUMBER_PENDING/);
    assert.match(sql, /CHECK \(advisor_number_status = 'WHATSAPP_NUMBER_PENDING'\)/);
    assert.doesNotMatch(sql, /\+591|70000000|advisor_phone|phone_e164|whatsapp_number/);
    assert.doesNotMatch(sql, /(^|\n)\s*UPDATE\b/i);
    assert.doesNotMatch(sql, /ALTER TABLE os_(?!customer_conversations)/);
    assert.doesNotMatch(
      sql,
      /payment_confirmed|stock_confirmed|delivered_at|production_complete|discount_approved|provider_message_id/,
    );
    const attentionSql = readFileSync(
      join(root, 'migrations/20261021000000_os_customer_conversation_attention_b5/migration.sql'),
      'utf8',
    );
    const stateSql = readFileSync(
      join(root, 'migrations/20261024000000_os_conversation_attention_state_notes_b5b/migration.sql'),
      'utf8',
    );
    for (const column of CUSTOMER_CONVERSATION_ROW_COLUMNS) {
      assert.match(`${sql}\n${attentionSql}\n${stateSql}`, new RegExp(`\\b${column}\\b`));
    }

    assert.match(fragment, /model OsCustomerConversation/);
    assert.match(fragment, /source\s+String\s+@default\("employee_entered"\)/);
    assert.doesNotMatch(fragment, /paymentConfirmed|discountApproved|providerMessageId/);
  });
});

describe('Registrar atención (Batch 5)', () => {
  it('accepts call, visit, in-person and manual WhatsApp, and none connects a provider', () => {
    for (const channel of ['call', 'visit', 'in_person', 'whatsapp'] as const) {
      const admitted = recordManualCustomerConversation(input({ channel, reason: 'Consulta de plazo' }));
      assert.equal(admitted.ok, true, channel);
      if (!admitted.ok) continue;
      assert.equal(admitted.record.channel, channel);
      assert.equal(admitted.record.providerConnected, false);
      assert.equal(conversationChannelIsConnected(channel), false);
    }
    assert.equal(
      recordManualCustomerConversation(input({ channel: 'sms' as unknown as 'call', reason: 'x' })).ok,
      false,
    );
  });

  it('requires a reason for call, visit and in-person; legacy channels keep working without one', () => {
    for (const channel of ['call', 'visit', 'in_person'] as const) {
      assert.deepEqual(recordManualCustomerConversation(input({ channel })), {
        ok: false,
        reason: 'missing_reason',
      });
      assert.deepEqual(recordManualCustomerConversation(input({ channel, reason: '   ' })), {
        ok: false,
        reason: 'missing_reason',
      });
    }
    assert.equal(recordManualCustomerConversation(input({ channel: 'whatsapp' })).ok, true);
    assert.equal(recordManualCustomerConversation(input({ channel: 'manual' })).ok, true);
  });

  it('keeps assignment and the commitment link out of a record request', () => {
    const admitted = recordManualCustomerConversation(
      input({
        channel: 'call',
        reason: 'Consulta',
        ...({
          assignedMemberId: 'member-someone',
          assignedLabel: 'Alguien',
          assignedAt: occurredAt,
          nextStepCommitmentId: 'commitment-fake',
        } as object),
      }),
    );
    assert.equal(admitted.ok, true);
    if (!admitted.ok) return;
    assert.equal(admitted.record.assignedMemberId, null);
    assert.equal(admitted.record.assignedLabel, null);
    assert.equal(admitted.record.assignedAt, null);
    assert.equal(admitted.record.nextStepCommitmentId, null);
  });

  it('admits a next step only with what, who and when, and mirrors it into nextAction', () => {
    const step = { description: 'Enviar plazos', ownerMemberId: 'member-9', dueDate: '2026-11-20' };
    const ok = recordManualCustomerConversation(
      input({ channel: 'call', reason: 'Consulta', nextAction: null, nextStep: step }),
    );
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.deepEqual(ok.record.nextStep, step);
      assert.equal(ok.record.nextAction, 'Enviar plazos');
      assert.equal(ok.record.commitmentCreated, false);
    }
    for (const bad of [
      { ...step, ownerMemberId: '' },
      { ...step, dueDate: '20/11/2026' },
      { ...step, description: ' ' },
    ]) {
      assert.deepEqual(
        recordManualCustomerConversation(input({ channel: 'call', reason: 'Consulta', nextStep: bad })),
        { ok: false, reason: 'invalid_next_step' },
      );
    }
  });

  it('builds a row with the reason and no assignment, and the migration enforces the same rules', () => {
    const admitted = recordManualCustomerConversation(input({ channel: 'visit', reason: 'Visita a obra' }));
    assert.equal(admitted.ok, true);
    if (!admitted.ok) return;
    const row = buildCustomerConversationRow(admitted.record, createdAt);
    assert.equal(row.channel, 'visit');
    assert.equal(row.reason, 'Visita a obra');
    assert.equal(row.assigned_member_id, null);
    assert.equal(row.next_step_commitment_id, null);

    const sql = readFileSync(
      join(
        process.cwd(),
        '../os-database/prisma/migrations/20261021000000_os_customer_conversation_attention_b5/migration.sql',
      ),
      'utf8',
    );
    assert.match(sql, /CHECK \(channel IN \('whatsapp', 'manual', 'call', 'visit', 'in_person'\)\)/);
    assert.match(sql, /channel NOT IN \('call', 'visit', 'in_person'\) OR reason IS NOT NULL/);
    assert.match(sql, /assigned_member_id IS NULL AND assigned_label IS NULL AND assigned_at IS NULL/);
    assert.doesNotMatch(sql, /owner_member_id|os_commercial_accounts/);
  });
});
