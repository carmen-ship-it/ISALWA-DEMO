import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { ZodError } from 'zod';
import {
  REPORTED_FACT_ROW_COLUMNS,
  buildReportedOperationalFactRow,
  reportedFactMayAuthorizeDispatch,
  reportedFactMayConfirmPayment,
  reportedFactMayMutateCanonical,
  reportedFactMayPostInventory,
  reverseReportedOperationalFactRow,
} from './reported-operational-fact';

const createdAt = '2026-09-14T15:00:00.000Z';

function paymentInput() {
  return {
    id: 'fact-synthetic-1',
    organizationId: 'org-synthetic',
    subjectType: 'party' as const,
    subjectId: 'party-synthetic-not-imported',
    reportedAt: '2026-09-14T14:30:00.000Z',
    reportedByLabel: 'Operador de prueba',
    kind: 'payment' as const,
    payload: { amountCentavos: '450000', currency: 'BOB', method: 'transferencia' },
  };
}

describe('reported operational fact contract', () => {
  it('builds a pending manual row and refuses confirmation inputs', () => {
    const row = buildReportedOperationalFactRow(
      {
        ...paymentInput(),
        ...({ source: 'ledger', confirmation: 'confirmed', paidAt: '2026-09-14T14:30:00.000Z' } as object),
      },
      createdAt,
    );

    assert.equal(row.source, 'manual');
    assert.equal(row.confirmation, 'pending');
    assert.equal(row.canonical_effect, 'none');
    assert.equal(row.payload_json.amountCentavos, '450000');
    assert.equal('paidAt' in row, false);
    assert.equal('confirmed_at' in row, false);
    assert.equal('latitude' in row, false);
    assert.equal(reportedFactMayConfirmPayment(), false);
    assert.equal(reportedFactMayAuthorizeDispatch(), false);
    assert.equal(reportedFactMayPostInventory(), false);
    assert.equal(reportedFactMayMutateCanonical(), false);
  });

  it('rejects a confirmed payment, a stock movement, and an empty dispatch', () => {
    assert.throws(
      () =>
        buildReportedOperationalFactRow(
          {
            ...paymentInput(),
            payload: { amountCentavos: '-100' },
          },
          createdAt,
        ),
      ZodError,
    );
    assert.throws(
      () =>
        buildReportedOperationalFactRow(
          {
            id: 'fact-stock',
            organizationId: 'org-synthetic',
            subjectType: 'item',
            subjectId: 'item-synthetic',
            reportedAt: createdAt,
            reportedByLabel: 'Operador de prueba',
            kind: 'stock',
            payload: { itemLabel: 'Ítem', quantity: '1.5' },
          },
          createdAt,
        ),
      ZodError,
    );
    assert.throws(
      () =>
        buildReportedOperationalFactRow(
          {
            id: 'fact-dispatch',
            organizationId: 'org-synthetic',
            subjectType: 'order',
            subjectId: 'order-synthetic',
            reportedAt: createdAt,
            reportedByLabel: 'Operador de prueba',
            kind: 'dispatch',
            payload: { reportedState: '   ' },
          },
          createdAt,
        ),
      ZodError,
    );
  });

  it('reverses without rewriting the payload or confirming it', () => {
    const row = buildReportedOperationalFactRow(paymentInput(), createdAt);
    const reversed = reverseReportedOperationalFactRow(row, {
      factId: row.id,
      organizationId: row.organization_id,
      reason: 'Cifra equivocada',
    });

    assert.equal(row.activity, 'active');
    assert.equal(row.payload_json.amountCentavos, '450000');
    assert.equal(reversed.activity, 'reversed');
    assert.equal(reversed.confirmation, 'pending');
    assert.equal(reversed.payload_json.amountCentavos, row.payload_json.amountCentavos);
    assert.equal(reversed.canonical_effect, 'none');
    assert.throws(
      () =>
        reverseReportedOperationalFactRow(reversed, {
          factId: reversed.id,
          organizationId: reversed.organization_id,
          reason: 'otra vez',
        }),
      /not overwritten/,
    );
  });

  it('adds a table without rewriting commercial tables or storing confirmation', () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        '../os-database/prisma/migrations/20260914120000_os_reported_operational_fact/migration.sql',
      ),
      'utf8',
    );

    assert.match(sql, /CREATE TABLE os_reported_operational_facts/);
    assert.match(sql, /CHECK \(confirmation = 'pending'\)/);
    assert.match(sql, /CHECK \(source = 'manual'\)/);
    assert.match(sql, /No foreign key to os_parties, os_quotes, os_orders, or os_locations/);
    assert.doesNotMatch(sql, /(^|\n)\s*UPDATE\b/i);
    assert.doesNotMatch(sql, /ALTER TABLE os_(?!reported_operational_facts)/);
    assert.doesNotMatch(sql, /confirmed_at|latitude|longitude|ledger_entry_id|inventory_movement_id/);
    for (const column of REPORTED_FACT_ROW_COLUMNS) {
      assert.match(sql, new RegExp(`\\b${column}\\b`));
    }
  });
});
