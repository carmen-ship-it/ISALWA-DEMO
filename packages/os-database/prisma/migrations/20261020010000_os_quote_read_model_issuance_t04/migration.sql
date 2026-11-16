-- T04 UI wiring: the quote read model carries the issuance and acceptance facts the UI needs
-- (Emitir done, document hash, Registrar aceptación pending). Additive and nullable.
-- Existing read-model rows read as "not issued / not accepted" until the projection is
-- refreshed by the next quote event or replayed from the canonical os_quotes row.
ALTER TABLE "os_quote_read_models"
  ADD COLUMN "issued_at" TIMESTAMP(3),
  ADD COLUMN "issued_document_hash" TEXT,
  ADD COLUMN "issued_revision_number" INTEGER,
  ADD COLUMN "customer_accepted_at" TIMESTAMP(3);
