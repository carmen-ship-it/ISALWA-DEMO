-- Step 16 — Lane G Commercial Core (Opportunity → Quote → Order)

CREATE TABLE "os_opportunities" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "party_id" TEXT NOT NULL,
    "commercial_account_id" TEXT,
    "owner_member_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'open',
    "status" TEXT NOT NULL DEFAULT 'open',
    "expected_value_centavos" BIGINT,
    "source_metadata_json" JSONB,
    "version" INTEGER NOT NULL DEFAULT 0,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "os_opportunities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "os_quotes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "party_id" TEXT NOT NULL,
    "commercial_account_id" TEXT,
    "opportunity_id" TEXT,
    "owner_member_id" TEXT NOT NULL,
    "quote_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "currency" TEXT NOT NULL DEFAULT 'BOB',
    "subtotal_centavos" BIGINT NOT NULL DEFAULT 0,
    "header_discount_centavos" BIGINT NOT NULL DEFAULT 0,
    "total_centavos" BIGINT NOT NULL DEFAULT 0,
    "revision_number" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "os_quotes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "os_quote_lines" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_label" TEXT,
    "unit_price_centavos" BIGINT NOT NULL,
    "discount_centavos" BIGINT NOT NULL DEFAULT 0,
    "line_total_centavos" BIGINT NOT NULL,
    "product_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "os_quote_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "os_orders" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "party_id" TEXT NOT NULL,
    "commercial_account_id" TEXT,
    "quote_id" TEXT NOT NULL,
    "owner_member_id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "currency" TEXT NOT NULL DEFAULT 'BOB',
    "subtotal_centavos" BIGINT NOT NULL,
    "header_discount_centavos" BIGINT NOT NULL DEFAULT 0,
    "total_centavos" BIGINT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "os_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "os_quotes_organization_id_quote_number_key" ON "os_quotes"("organization_id", "quote_number");
CREATE INDEX "os_quotes_organization_id_party_id_idx" ON "os_quotes"("organization_id", "party_id");
CREATE INDEX "os_quotes_organization_id_status_idx" ON "os_quotes"("organization_id", "status");

CREATE UNIQUE INDEX "os_quote_lines_quote_id_line_number_key" ON "os_quote_lines"("quote_id", "line_number");
CREATE INDEX "os_quote_lines_organization_id_quote_id_idx" ON "os_quote_lines"("organization_id", "quote_id");

CREATE UNIQUE INDEX "os_orders_organization_id_order_number_key" ON "os_orders"("organization_id", "order_number");
CREATE INDEX "os_orders_organization_id_party_id_idx" ON "os_orders"("organization_id", "party_id");
CREATE INDEX "os_orders_organization_id_quote_id_idx" ON "os_orders"("organization_id", "quote_id");

CREATE INDEX "os_opportunities_organization_id_party_id_idx" ON "os_opportunities"("organization_id", "party_id");
CREATE INDEX "os_opportunities_organization_id_owner_member_id_idx" ON "os_opportunities"("organization_id", "owner_member_id");
CREATE INDEX "os_opportunities_organization_id_status_idx" ON "os_opportunities"("organization_id", "status");

ALTER TABLE "os_opportunities" ADD CONSTRAINT "os_opportunities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "os_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "os_opportunities" ADD CONSTRAINT "os_opportunities_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "os_parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "os_quotes" ADD CONSTRAINT "os_quotes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "os_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "os_quotes" ADD CONSTRAINT "os_quotes_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "os_parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "os_quotes" ADD CONSTRAINT "os_quotes_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "os_opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "os_quote_lines" ADD CONSTRAINT "os_quote_lines_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "os_quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "os_orders" ADD CONSTRAINT "os_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "os_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "os_orders" ADD CONSTRAINT "os_orders_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "os_parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "os_orders" ADD CONSTRAINT "os_orders_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "os_quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
