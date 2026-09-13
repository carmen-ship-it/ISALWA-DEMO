-- Step 16.1A — Party timeline read model (CLR-06 partial)

CREATE TABLE "os_party_timeline_entries" (
    "entry_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "party_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "actor_member_id" TEXT,
    "correlation_id" TEXT NOT NULL,
    "primary_entity_type" TEXT NOT NULL,
    "primary_entity_id" TEXT NOT NULL,
    "facts_json" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "os_party_timeline_entries_pkey" PRIMARY KEY ("entry_id")
);

CREATE INDEX "os_party_timeline_entries_org_party_occurred_idx"
    ON "os_party_timeline_entries" ("organization_id", "party_id", "occurred_at" DESC, "entry_id" DESC);

ALTER TABLE "os_party_timeline_entries"
    ADD CONSTRAINT "os_party_timeline_entries_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "os_organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
