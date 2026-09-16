-- Flexible delivery documents: Pedido → Nota de Entrega → Salida → Entrega.
-- Additive evolution of os_delivery_notes so a nota can exist WITHOUT a delivery.
-- Provisional internalDocumentRef (NE-PILOT-<id>) only. Official numbering remains unknown.
-- Does not invent invoice, tax ID, ledger payment, or signature method.
-- Migration created; apply is Control Tower / host responsibility.

-- Warehouse exit may optionally link a human-created nota.
ALTER TABLE os_warehouse_exits
  ADD COLUMN IF NOT EXISTS delivery_note_id TEXT;

ALTER TABLE os_deliveries
  ADD COLUMN IF NOT EXISTS delivery_note_id TEXT;

-- Drop constraints that force nota-at-delivery-only semantics.
ALTER TABLE os_delivery_notes
  DROP CONSTRAINT IF EXISTS os_delivery_notes_timing_chk;

ALTER TABLE os_delivery_notes
  DROP CONSTRAINT IF EXISTS os_delivery_notes_numbering_chk;

ALTER TABLE os_delivery_notes
  DROP CONSTRAINT IF EXISTS os_delivery_notes_delivery_uidx;

-- delivery_id becomes nullable (nota without delivery).
ALTER TABLE os_delivery_notes
  ALTER COLUMN delivery_id DROP NOT NULL;

ALTER TABLE os_delivery_notes
  ALTER COLUMN delivered_at DROP NOT NULL;

-- New operational fields for human-created notas.
ALTER TABLE os_delivery_notes
  ADD COLUMN IF NOT EXISTS party_id TEXT;

ALTER TABLE os_delivery_notes
  ADD COLUMN IF NOT EXISTS internal_document_ref TEXT;

ALTER TABLE os_delivery_notes
  ADD COLUMN IF NOT EXISTS display_document_number TEXT;

ALTER TABLE os_delivery_notes
  ADD COLUMN IF NOT EXISTS status TEXT;

ALTER TABLE os_delivery_notes
  ADD COLUMN IF NOT EXISTS recipient TEXT;

ALTER TABLE os_delivery_notes
  ADD COLUMN IF NOT EXISTS delivered_by TEXT;

ALTER TABLE os_delivery_notes
  ADD COLUMN IF NOT EXISTS received_by TEXT;

ALTER TABLE os_delivery_notes
  ADD COLUMN IF NOT EXISTS observations TEXT;

ALTER TABLE os_delivery_notes
  ADD COLUMN IF NOT EXISTS location_id TEXT;

ALTER TABLE os_delivery_notes
  ADD COLUMN IF NOT EXISTS created_by_member_id TEXT;

ALTER TABLE os_delivery_notes
  ADD COLUMN IF NOT EXISTS corrects_note_id TEXT;

ALTER TABLE os_delivery_notes
  ADD COLUMN IF NOT EXISTS supersedes_note_id TEXT;

ALTER TABLE os_delivery_notes
  ADD COLUMN IF NOT EXISTS correction_reason TEXT;

-- Backfill provisional identity for any pre-existing rows (pilot-safe).
UPDATE os_delivery_notes
SET
  party_id = COALESCE(party_id, (
    SELECT o.party_id FROM os_orders o
    WHERE o.id = os_delivery_notes.order_id
      AND o.organization_id = os_delivery_notes.organization_id
    LIMIT 1
  )),
  internal_document_ref = COALESCE(internal_document_ref, 'NE-PILOT-' || id),
  status = COALESCE(status, 'issued'),
  recipient = COALESCE(recipient, '—'),
  delivered_by = COALESCE(delivered_by, '—'),
  created_by_member_id = COALESCE(created_by_member_id, (
    SELECT d.recorded_by_member_id FROM os_deliveries d
    WHERE d.id = os_delivery_notes.delivery_id
    LIMIT 1
  )),
  numbering_policy = CASE
    WHEN numbering_policy = 'unknown' THEN 'provisional_internal'
    ELSE numbering_policy
  END
WHERE party_id IS NULL
   OR internal_document_ref IS NULL
   OR status IS NULL
   OR recipient IS NULL
   OR delivered_by IS NULL
   OR created_by_member_id IS NULL
   OR numbering_policy = 'unknown';

-- Fail closed if backfill could not resolve required columns.
UPDATE os_delivery_notes
SET
  party_id = COALESCE(party_id, 'UNKNOWN_PARTY'),
  created_by_member_id = COALESCE(created_by_member_id, 'UNKNOWN_MEMBER')
WHERE party_id IS NULL OR created_by_member_id IS NULL;

ALTER TABLE os_delivery_notes
  ALTER COLUMN party_id SET NOT NULL;

ALTER TABLE os_delivery_notes
  ALTER COLUMN internal_document_ref SET NOT NULL;

ALTER TABLE os_delivery_notes
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE os_delivery_notes
  ALTER COLUMN recipient SET NOT NULL;

ALTER TABLE os_delivery_notes
  ALTER COLUMN delivered_by SET NOT NULL;

ALTER TABLE os_delivery_notes
  ALTER COLUMN created_by_member_id SET NOT NULL;

ALTER TABLE os_delivery_notes
  DROP CONSTRAINT IF EXISTS os_delivery_notes_numbering_chk;

ALTER TABLE os_delivery_notes
  ADD CONSTRAINT os_delivery_notes_numbering_chk
  CHECK (numbering_policy IN ('provisional_internal', 'unknown'));

ALTER TABLE os_delivery_notes
  DROP CONSTRAINT IF EXISTS os_delivery_notes_status_chk;

ALTER TABLE os_delivery_notes
  ADD CONSTRAINT os_delivery_notes_status_chk
  CHECK (status IN ('issued', 'reversed'));

ALTER TABLE os_delivery_notes
  DROP CONSTRAINT IF EXISTS os_delivery_notes_internal_ref_chk;

ALTER TABLE os_delivery_notes
  ADD CONSTRAINT os_delivery_notes_internal_ref_chk
  CHECK (internal_document_ref LIKE 'NE-PILOT-%' AND length(btrim(internal_document_ref)) > 9);

ALTER TABLE os_delivery_notes
  DROP CONSTRAINT IF EXISTS os_delivery_notes_delivery_uidx;

ALTER TABLE os_delivery_notes
  ADD CONSTRAINT os_delivery_notes_delivery_uidx UNIQUE (delivery_id);

ALTER TABLE os_delivery_notes
  DROP CONSTRAINT IF EXISTS os_delivery_notes_org_internal_ref_uidx;

ALTER TABLE os_delivery_notes
  ADD CONSTRAINT os_delivery_notes_org_internal_ref_uidx UNIQUE (organization_id, internal_document_ref);

ALTER TABLE os_delivery_notes
  DROP CONSTRAINT IF EXISTS os_delivery_notes_timing_chk;

-- No born_at/delivered_at ordering gate: nota may exist before delivery.

-- Evidence may also reference a delivery_note subject.
ALTER TABLE os_delivery_evidence
  DROP CONSTRAINT IF EXISTS os_delivery_evidence_subject_chk;

ALTER TABLE os_delivery_evidence
  ADD CONSTRAINT os_delivery_evidence_subject_chk
  CHECK (subject_type IN ('warehouse_exit', 'delivery', 'delivery_note'));

ALTER TABLE os_delivery_evidence
  DROP CONSTRAINT IF EXISTS os_delivery_evidence_confirmation_subject_chk;

ALTER TABLE os_delivery_evidence
  ADD CONSTRAINT os_delivery_evidence_confirmation_subject_chk
  CHECK (
    role <> 'delivery_confirmation'
    OR subject_type IN ('delivery', 'delivery_note')
  );

CREATE INDEX IF NOT EXISTS os_warehouse_exits_org_note_idx
  ON os_warehouse_exits (organization_id, delivery_note_id);

CREATE INDEX IF NOT EXISTS os_deliveries_org_note_idx
  ON os_deliveries (organization_id, delivery_note_id);

CREATE INDEX IF NOT EXISTS os_delivery_notes_org_party_idx
  ON os_delivery_notes (organization_id, party_id);
