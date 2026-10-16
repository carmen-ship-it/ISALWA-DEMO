-- T03 additive. Existing coverage rows keep their pre-T03 meaning (commercial work only).
ALTER TABLE "os_customer_coverage_grants"
  ADD COLUMN "covered_actions" TEXT[] NOT NULL DEFAULT ARRAY['commercial.work']::TEXT[];

-- A2 §5: end a contact's company relation and retire a number without deleting the person.
ALTER TABLE "os_contacts"
  ADD COLUMN "relation_ended_at" TIMESTAMP(3),
  ADD COLUMN "relation_end_reason" TEXT,
  ADD COLUMN "phone_retired_at" TIMESTAMP(3),
  ADD COLUMN "phone_retired_reason" TEXT;

-- V2 §5.4 Registrar cliente: city and department as entered (no inferred coordinates).
ALTER TABLE "os_locations"
  ADD COLUMN "city" TEXT,
  ADD COLUMN "department" TEXT;

-- A1 §7: follow-up preference per contact + channel + tenant (current value; history in business events).
CREATE TABLE "os_contact_followup_preferences" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "preference" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "identity_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 0,
    "recorded_by_member_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "os_contact_followup_preferences_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "os_contact_followup_preferences_channel_check" CHECK ("channel" IN ('whatsapp', 'phone', 'email')),
    CONSTRAINT "os_contact_followup_preferences_preference_check" CHECK ("preference" IN ('allowed', 'no_promotions', 'no_unsolicited_followups')),
    CONSTRAINT "os_contact_followup_preferences_source_check" CHECK ("source" IN ('customer_message', 'staff_recorded'))
);

CREATE UNIQUE INDEX "os_contact_followup_preferences_organization_id_contact_id__key"
  ON "os_contact_followup_preferences"("organization_id", "contact_id", "channel");

ALTER TABLE "os_contact_followup_preferences"
  ADD CONSTRAINT "os_contact_followup_preferences_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "os_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "os_contact_followup_preferences"
  ADD CONSTRAINT "os_contact_followup_preferences_contact_id_fkey"
  FOREIGN KEY ("contact_id") REFERENCES "os_contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
