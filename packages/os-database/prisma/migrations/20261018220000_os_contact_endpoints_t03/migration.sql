-- T03 review C5–C7 (owner decisions 2026-10-18 21:22). Additive; existing values are kept.
-- Phone and WhatsApp are one security boundary: entered text kept next to E.164, per-channel
-- status, WhatsApp retirement, a dated endpoint-association history, and identity reviews.

ALTER TABLE "os_contacts"
  ADD COLUMN "phone_display" TEXT,
  ADD COLUMN "whatsapp_display" TEXT,
  ADD COLUMN "phone_status" TEXT,
  ADD COLUMN "whatsapp_status" TEXT,
  ADD COLUMN "whatsapp_retired_at" TIMESTAMP(3),
  ADD COLUMN "whatsapp_retired_reason" TEXT,
  ADD CONSTRAINT "os_contacts_phone_status_check" CHECK ("phone_status" IS NULL OR "phone_status" IN ('unverified', 'verified', 'identity_review')),
  ADD CONSTRAINT "os_contacts_whatsapp_status_check" CHECK ("whatsapp_status" IS NULL OR "whatsapp_status" IN ('unverified', 'verified', 'identity_review'));

-- Existing numbers were never verified by a recorded workflow.
UPDATE "os_contacts" SET "phone_status" = 'unverified', "phone_display" = "phone" WHERE "phone" IS NOT NULL;
UPDATE "os_contacts" SET "whatsapp_status" = 'unverified', "whatsapp_display" = "whatsapp" WHERE "whatsapp" IS NOT NULL;

-- Restricted, dated history of which number belonged to which contact and when. Never overwritten.
CREATE TABLE "os_contact_endpoint_associations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "party_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "number_e164" TEXT NOT NULL,
    "country" TEXT,
    "entered_text" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "end_reason" TEXT,
    "verification_method" TEXT,
    "recorded_by_member_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "os_contact_endpoint_associations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "os_contact_endpoint_associations_channel_check" CHECK ("channel" IN ('phone', 'whatsapp'))
);

CREATE INDEX "os_contact_endpoint_associations_number_idx"
  ON "os_contact_endpoint_associations"("organization_id", "number_e164");
CREATE INDEX "os_contact_endpoint_associations_contact_idx"
  ON "os_contact_endpoint_associations"("organization_id", "contact_id", "channel", "started_at");

ALTER TABLE "os_contact_endpoint_associations"
  ADD CONSTRAINT "os_contact_endpoint_associations_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "os_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "os_contact_endpoint_associations"
  ADD CONSTRAINT "os_contact_endpoint_associations_contact_id_fkey"
  FOREIGN KEY ("contact_id") REFERENCES "os_contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Current numbers start their history at the contact's creation (earlier ends are not reconstructed).
INSERT INTO "os_contact_endpoint_associations"
  ("id", "organization_id", "party_id", "contact_id", "channel", "number_e164", "entered_text", "started_at")
SELECT 'cea_p_' || "id", "organization_id", "organization_party_id", "id", 'phone', "phone", "phone", "created_at"
FROM "os_contacts" WHERE "phone" IS NOT NULL;
INSERT INTO "os_contact_endpoint_associations"
  ("id", "organization_id", "party_id", "contact_id", "channel", "number_e164", "entered_text", "started_at")
SELECT 'cea_w_' || "id", "organization_id", "organization_party_id", "id", 'whatsapp', "whatsapp", "whatsapp", "created_at"
FROM "os_contacts" WHERE "whatsapp" IS NOT NULL;

-- A number entered for a contact that matches an ended association elsewhere waits for identity review.
CREATE TABLE "os_contact_identity_reviews" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "party_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "association_id" TEXT NOT NULL,
    "matched_association_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "opened_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_member_id" TEXT,
    "verification_method" TEXT,
    "note" TEXT,

    CONSTRAINT "os_contact_identity_reviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "os_contact_identity_reviews_channel_check" CHECK ("channel" IN ('phone', 'whatsapp')),
    CONSTRAINT "os_contact_identity_reviews_status_check" CHECK ("status" IN ('open', 'confirmed', 'rejected'))
);

CREATE INDEX "os_contact_identity_reviews_contact_idx"
  ON "os_contact_identity_reviews"("organization_id", "contact_id", "channel", "status");

ALTER TABLE "os_contact_identity_reviews"
  ADD CONSTRAINT "os_contact_identity_reviews_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "os_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "os_contact_identity_reviews"
  ADD CONSTRAINT "os_contact_identity_reviews_association_id_fkey"
  FOREIGN KEY ("association_id") REFERENCES "os_contact_endpoint_associations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
