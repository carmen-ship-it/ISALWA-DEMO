-- Order lines copied from the quote at conversion.
-- Snapshots only. No product-master foreign key. No backfill from order totals.
-- Orders created before this table stay without rows. Do not invent lines for them.

CREATE TABLE "os_order_lines" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "quote_line_id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "description_snapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_label" TEXT,
    "unit_price_centavos_snapshot" BIGINT NOT NULL,
    "discount_centavos" BIGINT NOT NULL DEFAULT 0,
    "line_total_centavos" BIGINT NOT NULL,
    "product_ref_snapshot" TEXT,
    "provenance" TEXT NOT NULL,
    "copied_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "os_order_lines_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "os_order_lines_provenance_chk" CHECK ("provenance" = 'quote_conversion_snapshot'),
    CONSTRAINT "os_order_lines_quantity_chk" CHECK ("quantity" >= 1),
    CONSTRAINT "os_order_lines_line_number_chk" CHECK ("line_number" >= 1),
    CONSTRAINT "os_order_lines_unit_price_chk" CHECK ("unit_price_centavos_snapshot" >= 0),
    CONSTRAINT "os_order_lines_discount_chk" CHECK ("discount_centavos" >= 0),
    CONSTRAINT "os_order_lines_line_total_chk" CHECK ("line_total_centavos" >= 0)
);

CREATE UNIQUE INDEX "os_order_lines_order_id_line_number_key" ON "os_order_lines"("order_id", "line_number");
CREATE UNIQUE INDEX "os_order_lines_order_id_quote_line_id_key" ON "os_order_lines"("order_id", "quote_line_id");
CREATE INDEX "os_order_lines_organization_id_order_id_idx" ON "os_order_lines"("organization_id", "order_id");

ALTER TABLE "os_order_lines" ADD CONSTRAINT "os_order_lines_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "os_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "os_order_lines" ADD CONSTRAINT "os_order_lines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "os_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "os_order_lines" ADD CONSTRAINT "os_order_lines_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "os_quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "os_order_lines" ADD CONSTRAINT "os_order_lines_quote_line_id_fkey" FOREIGN KEY ("quote_line_id") REFERENCES "os_quote_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- product_ref_snapshot is text copied at conversion. No foreign key to a product master.
-- Insert only. A later catalog change must not update these rows.
-- This migration does not INSERT from os_orders totals.
