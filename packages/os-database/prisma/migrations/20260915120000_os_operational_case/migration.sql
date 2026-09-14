-- Operational case for one order. Additive CREATE only.
-- Does not ALTER party, quote, order, location, commercial, finance, or reported-fact tables.
-- order_id and order_line_id are opaque. No foreign key to os_orders.
-- A row here is not a confirmed payment, a confirmed delivery, or a stock movement.
-- confirmation cannot become confirmed on this table.
-- A customer message does not confirm finance, stock, or delivery.
-- Manual still requires source, actor, occurred_at, recorded_at, and evidence.
-- Reversal is a new row. The fact row is not rewritten.
--
-- A release decision is operational. It does not confirm a payment.
-- Payment is not required before a pedido proceeds. A commercial agreement is a valid basis.
-- paymentConfirmed is not a column and is not a gate.
-- Official accounting remains external. This migration does not post a ledger.

CREATE TABLE os_operational_cases (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  order_id TEXT NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL,
  opened_by_member_id TEXT,
  opened_by_label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_operational_cases_order_chk
    CHECK (length(btrim(order_id)) > 0),
  CONSTRAINT os_operational_cases_actor_chk
    CHECK (length(btrim(opened_by_label)) > 0),
  CONSTRAINT os_operational_cases_org_order_uidx
    UNIQUE (organization_id, order_id),
  CONSTRAINT os_operational_cases_id_org_order_uidx
    UNIQUE (id, organization_id, order_id)
);

CREATE INDEX os_operational_cases_org_order_idx
  ON os_operational_cases (organization_id, order_id);

CREATE TABLE os_operational_case_facts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  case_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  order_line_id TEXT,
  kind TEXT NOT NULL,
  source TEXT NOT NULL,
  actor_member_id TEXT,
  actor_label TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  evidence_text TEXT NOT NULL,
  evidence_reference TEXT,
  confirmation TEXT NOT NULL DEFAULT 'pending',
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  corrects_fact_id TEXT,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_operational_case_facts_kind_chk
    CHECK (kind IN ('payment_report', 'delivery_report', 'stock_report', 'note')),
  CONSTRAINT os_operational_case_facts_source_chk
    CHECK (source IN ('manual', 'customer_message')),
  CONSTRAINT os_operational_case_facts_confirmation_chk
    CHECK (confirmation = 'pending'),
  CONSTRAINT os_operational_case_facts_actor_chk
    CHECK (length(btrim(actor_label)) > 0),
  CONSTRAINT os_operational_case_facts_evidence_chk
    CHECK (length(btrim(evidence_text)) > 0),
  CONSTRAINT os_operational_case_facts_line_chk
    CHECK (order_line_id IS NULL OR length(btrim(order_line_id)) > 0),
  CONSTRAINT os_operational_case_facts_payload_chk
    CHECK (
      jsonb_typeof(payload_json) = 'object'
      AND NOT (payload_json ?| ARRAY[
        'confirmed',
        'confirmed_at',
        'paid_at',
        'delivered_at',
        'invoice_id',
        'ledger_entry_id',
        'inventory_movement_id',
        'warehouse_id',
        'department',
        'payment_confirmed'
      ])
    ),
  CONSTRAINT os_operational_case_facts_case_fk
    FOREIGN KEY (case_id, organization_id, order_id)
    REFERENCES os_operational_cases (id, organization_id, order_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT os_operational_case_facts_id_org_uidx
    UNIQUE (id, organization_id),
  CONSTRAINT os_operational_case_facts_corrects_fk
    FOREIGN KEY (corrects_fact_id, organization_id)
    REFERENCES os_operational_case_facts (id, organization_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX os_operational_case_facts_org_idempotency_uidx
  ON os_operational_case_facts (organization_id, idempotency_key);
CREATE INDEX os_operational_case_facts_org_order_recorded_idx
  ON os_operational_case_facts (organization_id, order_id, recorded_at);
CREATE INDEX os_operational_case_facts_org_case_idx
  ON os_operational_case_facts (organization_id, case_id);
CREATE INDEX os_operational_case_facts_org_line_idx
  ON os_operational_case_facts (organization_id, order_line_id)
  WHERE order_line_id IS NOT NULL;

CREATE TABLE os_operational_case_fact_reversals (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  fact_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  actor_member_id TEXT,
  actor_label TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_operational_case_fact_reversals_reason_chk
    CHECK (length(btrim(reason)) > 0),
  CONSTRAINT os_operational_case_fact_reversals_actor_chk
    CHECK (length(btrim(actor_label)) > 0),
  CONSTRAINT os_operational_case_fact_reversals_fact_fk
    FOREIGN KEY (fact_id, organization_id)
    REFERENCES os_operational_case_facts (id, organization_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT os_operational_case_fact_reversals_fact_uidx
    UNIQUE (organization_id, fact_id)
);

-- A release decision does not confirm a payment. It is not a gate on paymentConfirmed.
-- commercial_agreement covers an approved distributor exception without a further catalog.
CREATE TABLE os_operational_release_decisions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  case_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  state TEXT NOT NULL,
  basis TEXT NOT NULL,
  reason TEXT NOT NULL,
  source TEXT NOT NULL,
  actor_member_id TEXT,
  actor_label TEXT NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  evidence_text TEXT NOT NULL,
  evidence_reference TEXT,
  corrects_decision_id TEXT,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_operational_release_decisions_state_chk
    CHECK (state IN ('released', 'held')),
  CONSTRAINT os_operational_release_decisions_basis_chk
    CHECK (basis IN ('payment_verified', 'commercial_agreement', 'authorized_other')),
  CONSTRAINT os_operational_release_decisions_source_chk
    CHECK (source = 'manual'),
  CONSTRAINT os_operational_release_decisions_reason_chk
    CHECK (length(btrim(reason)) > 0),
  CONSTRAINT os_operational_release_decisions_actor_chk
    CHECK (length(btrim(actor_label)) > 0),
  CONSTRAINT os_operational_release_decisions_evidence_chk
    CHECK (length(btrim(evidence_text)) > 0),
  CONSTRAINT os_operational_release_decisions_case_fk
    FOREIGN KEY (case_id, organization_id, order_id)
    REFERENCES os_operational_cases (id, organization_id, order_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT os_operational_release_decisions_id_org_uidx
    UNIQUE (id, organization_id),
  CONSTRAINT os_operational_release_decisions_corrects_fk
    FOREIGN KEY (corrects_decision_id, organization_id)
    REFERENCES os_operational_release_decisions (id, organization_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX os_operational_release_decisions_org_idempotency_uidx
  ON os_operational_release_decisions (organization_id, idempotency_key);
CREATE INDEX os_operational_release_decisions_org_order_recorded_idx
  ON os_operational_release_decisions (organization_id, order_id, recorded_at);

CREATE TABLE os_operational_release_decision_reversals (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  decision_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  actor_member_id TEXT,
  actor_label TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_operational_release_decision_reversals_reason_chk
    CHECK (length(btrim(reason)) > 0),
  CONSTRAINT os_operational_release_decision_reversals_actor_chk
    CHECK (length(btrim(actor_label)) > 0),
  CONSTRAINT os_operational_release_decision_reversals_decision_fk
    FOREIGN KEY (decision_id, organization_id)
    REFERENCES os_operational_release_decisions (id, organization_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT os_operational_release_decision_reversals_decision_uidx
    UNIQUE (organization_id, decision_id)
);

-- order_id and order_line_id are opaque. No foreign key to os_orders.
-- There is no order-line table to attach. Do not invent one here.
-- Inserting a fact or a release decision must not update os_orders, payments, stock, or delivery records.
-- A release decision does not confirm a payment. Official accounting remains external.
