-- T07 / Batch 6: reported payments (tenders), per-tender human verification, allocations,
-- private evidence and approved payment instructions. Additive; one CHECK widening.
--
-- Not bank integration, not tax invoicing, not a ledger. A payment report extends the existing
-- os_reported_operational_facts `payment` row (its confirmation CHECK stays 'pending' forever).
-- Verification lives in tender rows plus an append-only event log, so a mixed payment (QR + cash)
-- never carries one misleading "confirmed" flag.

-- 1. Payment report columns on the existing fact row (nullable: legacy rows are untouched).
ALTER TABLE os_reported_operational_facts
  ADD COLUMN customer_party_id TEXT REFERENCES os_parties(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD COLUMN intended_order_id TEXT REFERENCES os_orders(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD COLUMN paid_on DATE;

CREATE UNIQUE INDEX os_reported_operational_facts_org_id_uidx
  ON os_reported_operational_facts (organization_id, id);
CREATE INDEX os_reported_operational_facts_org_customer_idx
  ON os_reported_operational_facts (organization_id, customer_party_id, kind);
CREATE UNIQUE INDEX os_orders_org_id_uidx ON os_orders (organization_id, id);

-- 2. Tenders. Amount, method and report never change after insert (trigger below).
CREATE TABLE os_payment_tenders (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  fact_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  method TEXT NOT NULL,
  amount_centavos BIGINT NOT NULL,
  reference TEXT,
  reference_normalized TEXT,
  cash_recipient_member_id TEXT,
  cash_recipient_label TEXT,
  cash_recipient_unresolved_reason TEXT,
  verification TEXT NOT NULL DEFAULT 'pending',
  replaces_tender_id TEXT REFERENCES os_payment_tenders(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_payment_tenders_fact_fk
    FOREIGN KEY (organization_id, fact_id) REFERENCES os_reported_operational_facts (organization_id, id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT os_payment_tenders_method_chk CHECK (method IN ('qr', 'cash', 'transfer', 'other')),
  CONSTRAINT os_payment_tenders_amount_chk CHECK (amount_centavos > 0),
  CONSTRAINT os_payment_tenders_verification_chk
    CHECK (verification IN ('pending', 'confirmed', 'rejected', 'reversed')),
  CONSTRAINT os_payment_tenders_recipient_chk
    CHECK (
      (method <> 'cash' AND cash_recipient_member_id IS NULL AND cash_recipient_unresolved_reason IS NULL)
      OR (
        method = 'cash'
        AND (
          (cash_recipient_member_id IS NOT NULL AND cash_recipient_unresolved_reason IS NULL)
          OR (cash_recipient_member_id IS NULL AND COALESCE(length(btrim(cash_recipient_unresolved_reason)), 0) > 0)
        )
      )
    ),
  -- Funds are never confirmed while the cash receiver is unresolved.
  CONSTRAINT os_payment_tenders_confirmed_recipient_chk
    CHECK (
      NOT (method = 'cash' AND verification = 'confirmed' AND cash_recipient_member_id IS NULL)
    )
);
CREATE UNIQUE INDEX os_payment_tenders_fact_seq_uidx ON os_payment_tenders (fact_id, seq);
CREATE INDEX os_payment_tenders_org_verification_idx ON os_payment_tenders (organization_id, verification);
CREATE INDEX os_payment_tenders_org_reference_idx
  ON os_payment_tenders (organization_id, reference_normalized) WHERE reference_normalized IS NOT NULL;

-- 3. Append-only verification events. Never updated or deleted.
CREATE TABLE os_payment_tender_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  tender_id TEXT NOT NULL REFERENCES os_payment_tenders(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  actor_member_id TEXT NOT NULL,
  actor_label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_payment_tender_events_action_chk
    CHECK (action IN ('confirmed', 'rejected', 'reversed', 'recipient_resolved')),
  CONSTRAINT os_payment_tender_events_reason_chk CHECK (length(btrim(reason)) > 0)
);
CREATE INDEX os_payment_tender_events_tender_idx ON os_payment_tender_events (tender_id, created_at);

-- 4. Private evidence (uploaded file). Evidence is for a human; it never produces an outcome.
CREATE TABLE os_payment_evidence (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  fact_id TEXT NOT NULL,
  tender_id TEXT REFERENCES os_payment_tenders(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  content BYTEA NOT NULL,
  uploaded_by_member_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_payment_evidence_fact_fk
    FOREIGN KEY (organization_id, fact_id) REFERENCES os_reported_operational_facts (organization_id, id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT os_payment_evidence_type_chk
    CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  CONSTRAINT os_payment_evidence_size_chk CHECK (size_bytes > 0 AND size_bytes <= 5242880)
);
CREATE INDEX os_payment_evidence_fact_idx ON os_payment_evidence (organization_id, fact_id);
CREATE INDEX os_payment_evidence_sha_idx ON os_payment_evidence (organization_id, sha256);

-- 5. Explicit allocations of confirmed funds to orders of the same customer and tenant.
CREATE TABLE os_payment_allocations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  fact_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  amount_centavos BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  allocated_by_member_id TEXT NOT NULL,
  allocated_by_label TEXT NOT NULL,
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  released_by_member_id TEXT,
  released_reason TEXT,
  CONSTRAINT os_payment_allocations_fact_fk
    FOREIGN KEY (organization_id, fact_id) REFERENCES os_reported_operational_facts (organization_id, id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT os_payment_allocations_order_fk
    FOREIGN KEY (organization_id, order_id) REFERENCES os_orders (organization_id, id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT os_payment_allocations_amount_chk CHECK (amount_centavos > 0),
  CONSTRAINT os_payment_allocations_status_chk CHECK (status IN ('active', 'released')),
  CONSTRAINT os_payment_allocations_release_chk
    CHECK (
      (status = 'active' AND released_at IS NULL AND released_by_member_id IS NULL AND released_reason IS NULL)
      OR (status = 'released' AND released_at IS NOT NULL AND released_by_member_id IS NOT NULL
          AND COALESCE(length(btrim(released_reason)), 0) > 0)
    )
);
CREATE INDEX os_payment_allocations_fact_idx ON os_payment_allocations (organization_id, fact_id, status);
CREATE INDEX os_payment_allocations_order_idx ON os_payment_allocations (organization_id, order_id, status);

-- 6. Approved payment instructions: versioned public configuration (A1 §6).
CREATE TABLE os_payment_instruction_versions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  version INTEGER NOT NULL,
  method TEXT NOT NULL,
  holder_label TEXT NOT NULL,
  bank_name TEXT,
  account_reference TEXT,
  currency TEXT NOT NULL DEFAULT 'BOB',
  public_note TEXT,
  valid_from DATE,
  valid_until DATE,
  qr_content BYTEA,
  qr_content_type TEXT,
  qr_sha256 TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by_member_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_by_member_id TEXT,
  published_at TIMESTAMPTZ,
  retired_by_member_id TEXT,
  retired_at TIMESTAMPTZ,
  retired_reason TEXT,
  CONSTRAINT os_payment_instruction_method_chk CHECK (method IN ('qr', 'transfer')),
  CONSTRAINT os_payment_instruction_status_chk CHECK (status IN ('draft', 'published', 'retired')),
  CONSTRAINT os_payment_instruction_currency_chk CHECK (currency = 'BOB'),
  CONSTRAINT os_payment_instruction_holder_chk CHECK (length(btrim(holder_label)) > 0),
  CONSTRAINT os_payment_instruction_qr_type_chk
    CHECK (qr_content_type IS NULL OR qr_content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  CONSTRAINT os_payment_instruction_qr_pair_chk
    CHECK ((qr_content IS NULL) = (qr_content_type IS NULL) AND (qr_content IS NULL) = (qr_sha256 IS NULL)),
  -- A published destination always names its approver, and the approver is not the drafter.
  -- A retired row with no approver is a discarded draft.
  CONSTRAINT os_payment_instruction_publication_chk
    CHECK (
      (status IN ('draft', 'retired') AND published_by_member_id IS NULL AND published_at IS NULL)
      OR (status IN ('published', 'retired') AND published_by_member_id IS NOT NULL
          AND published_at IS NOT NULL AND published_by_member_id <> created_by_member_id)
    ),
  CONSTRAINT os_payment_instruction_retire_chk
    CHECK (
      (status <> 'retired' AND retired_at IS NULL AND retired_by_member_id IS NULL AND retired_reason IS NULL)
      OR (status = 'retired' AND retired_at IS NOT NULL AND retired_by_member_id IS NOT NULL
          AND COALESCE(length(btrim(retired_reason)), 0) > 0)
    ),
  CONSTRAINT os_payment_instruction_transfer_chk
    CHECK (method <> 'transfer' OR (bank_name IS NOT NULL AND account_reference IS NOT NULL)),
  CONSTRAINT os_payment_instruction_qr_published_chk
    CHECK (method <> 'qr' OR published_at IS NULL OR qr_content IS NOT NULL)
);
CREATE UNIQUE INDEX os_payment_instruction_org_version_uidx
  ON os_payment_instruction_versions (organization_id, version);
-- One approved destination per method at a time; publishing a new one retires the previous.
CREATE UNIQUE INDEX os_payment_instruction_published_method_uidx
  ON os_payment_instruction_versions (organization_id, method) WHERE status = 'published';

-- 7. Guards that hold even if a caller bypasses the application.
CREATE FUNCTION os_payment_tender_immutable() RETURNS trigger AS $$
BEGIN
  IF NEW.amount_centavos <> OLD.amount_centavos
     OR NEW.method <> OLD.method
     OR NEW.fact_id <> OLD.fact_id
     OR NEW.organization_id <> OLD.organization_id
     OR NEW.seq <> OLD.seq THEN
    RAISE EXCEPTION 'PAYMENT_TENDER_IMMUTABLE' USING ERRCODE = '23514';
  END IF;
  IF OLD.verification = 'pending' AND NEW.verification NOT IN ('pending', 'confirmed', 'rejected') THEN
    RAISE EXCEPTION 'PAYMENT_ONLY_CONFIRMED_CAN_BE_REVERSED' USING ERRCODE = '23514';
  END IF;
  IF OLD.verification = 'reversed' AND NEW.verification <> 'reversed' THEN
    RAISE EXCEPTION 'PAYMENT_TENDER_REVERSAL_FINAL' USING ERRCODE = '23514';
  END IF;
  IF OLD.verification = 'rejected' AND NEW.verification <> 'rejected' THEN
    RAISE EXCEPTION 'PAYMENT_TENDER_REJECTION_FINAL' USING ERRCODE = '23514';
  END IF;
  IF OLD.verification = 'confirmed' AND NEW.verification NOT IN ('confirmed', 'reversed') THEN
    RAISE EXCEPTION 'PAYMENT_CONFIRMED_ONLY_REVERSIBLE' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER os_payment_tenders_immutable_trg
  BEFORE UPDATE ON os_payment_tenders
  FOR EACH ROW EXECUTE FUNCTION os_payment_tender_immutable();

CREATE FUNCTION os_payment_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'PAYMENT_EVENT_APPEND_ONLY' USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER os_payment_tender_events_append_only_trg
  BEFORE UPDATE OR DELETE ON os_payment_tender_events
  FOR EACH ROW EXECUTE FUNCTION os_payment_append_only();

-- Allocations never exceed confirmed funds of the report and only target an order of the same customer.
-- Locks the report row so two simultaneous allocators (or an allocator and a reverser) serialize.
CREATE FUNCTION os_payment_check_allocation_limit(p_org TEXT, p_fact TEXT) RETURNS void AS $$
DECLARE
  confirmed BIGINT;
  allocated BIGINT;
BEGIN
  PERFORM 1 FROM os_reported_operational_facts WHERE organization_id = p_org AND id = p_fact FOR UPDATE;
  SELECT COALESCE(SUM(amount_centavos), 0) INTO confirmed
    FROM os_payment_tenders WHERE organization_id = p_org AND fact_id = p_fact AND verification = 'confirmed';
  SELECT COALESCE(SUM(amount_centavos), 0) INTO allocated
    FROM os_payment_allocations WHERE organization_id = p_org AND fact_id = p_fact AND status = 'active';
  IF allocated > confirmed THEN
    RAISE EXCEPTION 'PAYMENT_OVER_ALLOCATION' USING ERRCODE = '23514';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION os_payment_allocation_guard() RETURNS trigger AS $$
DECLARE
  customer TEXT;
  order_party TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT customer_party_id INTO customer FROM os_reported_operational_facts
      WHERE organization_id = NEW.organization_id AND id = NEW.fact_id;
    SELECT party_id INTO order_party FROM os_orders
      WHERE organization_id = NEW.organization_id AND id = NEW.order_id;
    IF customer IS NULL OR order_party IS NULL OR customer <> order_party THEN
      RAISE EXCEPTION 'PAYMENT_ALLOCATION_WRONG_CUSTOMER' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF NEW.amount_centavos <> OLD.amount_centavos OR NEW.order_id <> OLD.order_id OR NEW.fact_id <> OLD.fact_id THEN
      RAISE EXCEPTION 'PAYMENT_ALLOCATION_IMMUTABLE' USING ERRCODE = '23514';
    END IF;
    IF OLD.status = 'released' AND NEW.status <> 'released' THEN
      RAISE EXCEPTION 'PAYMENT_ALLOCATION_RELEASE_FINAL' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER os_payment_allocations_guard_trg
  BEFORE INSERT OR UPDATE ON os_payment_allocations
  FOR EACH ROW EXECUTE FUNCTION os_payment_allocation_guard();

CREATE FUNCTION os_payment_allocation_after() RETURNS trigger AS $$
BEGIN
  PERFORM os_payment_check_allocation_limit(NEW.organization_id, NEW.fact_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER os_payment_allocations_limit_trg
  AFTER INSERT ON os_payment_allocations
  FOR EACH ROW EXECUTE FUNCTION os_payment_allocation_after();

CREATE FUNCTION os_payment_tender_after() RETURNS trigger AS $$
BEGIN
  IF NEW.verification IN ('reversed') AND OLD.verification <> NEW.verification THEN
    PERFORM os_payment_check_allocation_limit(NEW.organization_id, NEW.fact_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER os_payment_tenders_limit_trg
  AFTER UPDATE ON os_payment_tenders
  FOR EACH ROW EXECUTE FUNCTION os_payment_tender_after();

-- 8. Internal notices for payments: "Pago por verificar" and the outcome (reporter / account owner).
ALTER TABLE os_internal_notifications DROP CONSTRAINT os_internal_notifications_kind_chk;
ALTER TABLE os_internal_notifications ADD CONSTRAINT os_internal_notifications_kind_chk
  CHECK (
    kind IN (
      'approval_assigned',
      'approval_decided',
      'work_due',
      'work_overdue',
      'customer_attention',
      'commitment_due',
      'commitment_overdue',
      'responsibility_changed',
      'data_issue_review',
      'payment_to_verify',
      'payment_outcome'
    )
  );
ALTER TABLE os_internal_notifications DROP CONSTRAINT os_internal_notifications_source_type_chk;
ALTER TABLE os_internal_notifications ADD CONSTRAINT os_internal_notifications_source_type_chk
  CHECK (
    source_record_type IN (
      'work_item',
      'approval_request',
      'party',
      'commitment',
      'quote',
      'order',
      'opportunity',
      'organization_member',
      'payment_report'
    )
  );
