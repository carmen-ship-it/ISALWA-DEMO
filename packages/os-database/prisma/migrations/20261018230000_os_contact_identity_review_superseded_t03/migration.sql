-- T03 C7: an open identity review whose number is changed or retired before resolution is
-- closed as superseded, so no review stays open for a number the contact no longer holds.
ALTER TABLE "os_contact_identity_reviews" DROP CONSTRAINT "os_contact_identity_reviews_status_check";
ALTER TABLE "os_contact_identity_reviews"
  ADD CONSTRAINT "os_contact_identity_reviews_status_check" CHECK ("status" IN ('open', 'confirmed', 'rejected', 'superseded'));
