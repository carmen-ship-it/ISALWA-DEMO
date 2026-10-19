-- T03 L4: a customer-data correction request is an issue with one restricted correction record.
-- The record never writes customer data; an applied decision cites the business event that did.
CREATE TABLE "os_issue_correction_requests" (
    "issue_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "party_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "location_id" TEXT,
    "field" TEXT NOT NULL,
    "proposed_value" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "decision" TEXT,
    "applied_event_id" TEXT,
    "decision_reason" TEXT,
    "decided_by_member_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "os_issue_correction_requests_pkey" PRIMARY KEY ("issue_id"),
    CONSTRAINT "os_issue_correction_requests_field_check" CHECK ("field" IN (
      'display_name', 'legal_name', 'fiscal_identity', 'contact_name', 'contact_email',
      'contact_phone', 'contact_whatsapp', 'location_address', 'location_city', 'other')),
    CONSTRAINT "os_issue_correction_requests_source_check" CHECK ("source" IN ('customer', 'staff', 'document')),
    CONSTRAINT "os_issue_correction_requests_decision_check" CHECK (
      ("decision" IS NULL AND "applied_event_id" IS NULL AND "decided_at" IS NULL)
      OR ("decision" = 'applied' AND "applied_event_id" IS NOT NULL AND "decided_at" IS NOT NULL)
      OR ("decision" = 'rejected' AND "applied_event_id" IS NULL AND "decided_at" IS NOT NULL)),
    CONSTRAINT "os_issue_correction_requests_value_length_check" CHECK (char_length("proposed_value") BETWEEN 1 AND 500)
);

CREATE INDEX "os_issue_correction_requests_party_idx"
  ON "os_issue_correction_requests"("organization_id", "party_id");

ALTER TABLE "os_issue_correction_requests"
  ADD CONSTRAINT "os_issue_correction_requests_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "os_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "os_issue_correction_requests"
  ADD CONSTRAINT "os_issue_correction_requests_issue_id_fkey"
  FOREIGN KEY ("issue_id") REFERENCES "os_issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
