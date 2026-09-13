-- Step 16.1 — Lane F Commercial projections

CREATE TABLE "os_opportunity_read_models" (
    "opportunity_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "party_id" TEXT NOT NULL,
    "commercial_account_id" TEXT,
    "owner_member_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expected_value_centavos" BIGINT,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL,
    "last_event_id" TEXT,
    "last_occurred_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "os_opportunity_read_models_pkey" PRIMARY KEY ("opportunity_id")
);

CREATE TABLE "os_quote_read_models" (
    "quote_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "party_id" TEXT NOT NULL,
    "commercial_account_id" TEXT,
    "opportunity_id" TEXT,
    "owner_member_id" TEXT NOT NULL,
    "quote_number" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "subtotal_centavos" BIGINT NOT NULL,
    "header_discount_centavos" BIGINT NOT NULL,
    "total_centavos" BIGINT NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "notes" TEXT,
    "submitted_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL,
    "last_event_id" TEXT,
    "last_occurred_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "os_quote_read_models_pkey" PRIMARY KEY ("quote_id")
);

CREATE TABLE "os_quote_line_read_models" (
    "quote_line_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_label" TEXT,
    "unit_price_centavos" BIGINT NOT NULL,
    "discount_centavos" BIGINT NOT NULL,
    "line_total_centavos" BIGINT NOT NULL,
    "product_ref" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "os_quote_line_read_models_pkey" PRIMARY KEY ("quote_line_id")
);

CREATE TABLE "os_order_read_models" (
    "order_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "party_id" TEXT NOT NULL,
    "commercial_account_id" TEXT,
    "quote_id" TEXT NOT NULL,
    "owner_member_id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "subtotal_centavos" BIGINT NOT NULL,
    "header_discount_centavos" BIGINT NOT NULL,
    "total_centavos" BIGINT NOT NULL,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL,
    "last_event_id" TEXT,
    "last_occurred_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "os_order_read_models_pkey" PRIMARY KEY ("order_id")
);

CREATE INDEX "os_opportunity_read_models_org_status_owner_idx"
  ON "os_opportunity_read_models"("organization_id", "status", "owner_member_id");
CREATE INDEX "os_opportunity_read_models_org_party_idx"
  ON "os_opportunity_read_models"("organization_id", "party_id");
CREATE INDEX "os_opportunity_read_models_org_title_id_idx"
  ON "os_opportunity_read_models"("organization_id", "title", "opportunity_id");

CREATE INDEX "os_quote_read_models_org_status_owner_idx"
  ON "os_quote_read_models"("organization_id", "status", "owner_member_id");
CREATE INDEX "os_quote_read_models_org_party_idx"
  ON "os_quote_read_models"("organization_id", "party_id");
CREATE INDEX "os_quote_read_models_org_opportunity_idx"
  ON "os_quote_read_models"("organization_id", "opportunity_id");
CREATE INDEX "os_quote_read_models_org_number_id_idx"
  ON "os_quote_read_models"("organization_id", "quote_number", "quote_id");

CREATE UNIQUE INDEX "os_quote_line_read_models_quote_line_number_key"
  ON "os_quote_line_read_models"("quote_id", "line_number");
CREATE INDEX "os_quote_line_read_models_org_quote_idx"
  ON "os_quote_line_read_models"("organization_id", "quote_id");

CREATE INDEX "os_order_read_models_org_status_owner_idx"
  ON "os_order_read_models"("organization_id", "status", "owner_member_id");
CREATE INDEX "os_order_read_models_org_party_idx"
  ON "os_order_read_models"("organization_id", "party_id");
CREATE INDEX "os_order_read_models_org_quote_idx"
  ON "os_order_read_models"("organization_id", "quote_id");
CREATE INDEX "os_order_read_models_org_number_id_idx"
  ON "os_order_read_models"("organization_id", "order_number", "order_id");

ALTER TABLE "os_opportunity_read_models"
  ADD CONSTRAINT "os_opportunity_read_models_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "os_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "os_quote_read_models"
  ADD CONSTRAINT "os_quote_read_models_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "os_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "os_quote_line_read_models"
  ADD CONSTRAINT "os_quote_line_read_models_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "os_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "os_order_read_models"
  ADD CONSTRAINT "os_order_read_models_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "os_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
