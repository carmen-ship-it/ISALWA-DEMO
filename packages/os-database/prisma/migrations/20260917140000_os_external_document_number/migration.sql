-- Additive only. Source-preserved printed document numbers from Isa forms.
-- Does not invent generation, sequence ownership, fiscal meaning, or preprinted-book rules.
-- BUSINESS_DECISION_REQUIRED — DOCUMENT_NUMBERING remains open.
-- Does not alter 20260916140000_os_purchase_status_workflow.
-- Does not alter 20260917120000_os_finished_goods_receipt.
-- Migration created but NOT applied by this pass.

ALTER TABLE os_warehouse_outbound_notes
  ADD COLUMN IF NOT EXISTS external_document_number TEXT;

ALTER TABLE os_delivery_notes
  ADD COLUMN IF NOT EXISTS external_document_number TEXT;

ALTER TABLE os_warehouse_outbound_notes
  DROP CONSTRAINT IF EXISTS os_warehouse_outbound_notes_external_document_number_chk;

ALTER TABLE os_warehouse_outbound_notes
  ADD CONSTRAINT os_warehouse_outbound_notes_external_document_number_chk
  CHECK (
    external_document_number IS NULL
    OR length(btrim(external_document_number)) > 0
  );

ALTER TABLE os_delivery_notes
  DROP CONSTRAINT IF EXISTS os_delivery_notes_external_document_number_chk;

ALTER TABLE os_delivery_notes
  ADD CONSTRAINT os_delivery_notes_external_document_number_chk
  CHECK (
    external_document_number IS NULL
    OR length(btrim(external_document_number)) > 0
  );
