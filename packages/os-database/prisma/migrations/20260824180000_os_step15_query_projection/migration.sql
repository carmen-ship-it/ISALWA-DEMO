-- Step 15 — Query / projection read models (Lane F)

CREATE TABLE "os_projection_checkpoints" (
    "organization_id" TEXT NOT NULL,
    "consumer_key" TEXT NOT NULL,
    "last_event_id" TEXT,
    "last_occurred_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "os_projection_checkpoints_pkey" PRIMARY KEY ("organization_id","consumer_key")
);

CREATE TABLE "os_projection_freshness" (
    "organization_id" TEXT NOT NULL,
    "consumer_key" TEXT NOT NULL,
    "last_success_at" TIMESTAMP(3),
    "last_event_occurred_at" TIMESTAMP(3),
    "pending_outbox_count" INTEGER NOT NULL DEFAULT 0,
    "is_stale" BOOLEAN NOT NULL DEFAULT false,
    "last_error" TEXT,
    "rebuilt_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "os_projection_freshness_pkey" PRIMARY KEY ("organization_id","consumer_key")
);

CREATE TABLE "os_party_read_models" (
    "party_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "party_kind" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "legal_name" TEXT,
    "status" TEXT NOT NULL,
    "merged_into_party_id" TEXT,
    "active_role_keys" TEXT[] NOT NULL,
    "has_commercial_account" BOOLEAN NOT NULL DEFAULT false,
    "commercial_account_status" TEXT,
    "duplicate_status" TEXT,
    "search_text" TEXT NOT NULL,
    "last_event_id" TEXT,
    "last_occurred_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "os_party_read_models_pkey" PRIMARY KEY ("party_id")
);

CREATE INDEX "os_party_read_models_organization_id_status_idx" ON "os_party_read_models"("organization_id", "status");
CREATE INDEX "os_party_read_models_organization_id_display_name_party_id_idx" ON "os_party_read_models"("organization_id", "display_name", "party_id");

ALTER TABLE "os_projection_checkpoints" ADD CONSTRAINT "os_projection_checkpoints_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "os_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "os_projection_freshness" ADD CONSTRAINT "os_projection_freshness_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "os_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "os_party_read_models" ADD CONSTRAINT "os_party_read_models_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "os_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
