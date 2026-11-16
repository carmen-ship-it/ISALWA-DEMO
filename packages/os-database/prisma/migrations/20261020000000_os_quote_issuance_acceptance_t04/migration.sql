-- T04 (Batch 3): quote issuance, exact-terms hash, customer acceptance, one order per quote.
-- Additive and nullable. Historical submitted/sent quotes are not relabelled: they keep
-- issued_at NULL (legacy) and cannot be accepted or converted without a new issuance.
ALTER TABLE "os_quotes"
  ADD COLUMN "issued_at" TIMESTAMP(3),
  ADD COLUMN "issued_document_hash" TEXT,
  ADD COLUMN "issued_revision_number" INTEGER,
  ADD COLUMN "valid_until" TIMESTAMP(3),
  ADD COLUMN "customer_accepted_at" TIMESTAMP(3),
  ADD COLUMN "customer_acceptance_channel" TEXT,
  ADD COLUMN "customer_acceptance_evidence" TEXT,
  ADD COLUMN "customer_accepted_revision" INTEGER;

-- Single order per quote: a concurrent second CreateOrder loses on this key.
-- Fails loudly if legacy data already holds two orders for one quote (resolve before deploying).
CREATE UNIQUE INDEX "os_orders_organization_id_quote_id_key"
  ON "os_orders"("organization_id", "quote_id");
