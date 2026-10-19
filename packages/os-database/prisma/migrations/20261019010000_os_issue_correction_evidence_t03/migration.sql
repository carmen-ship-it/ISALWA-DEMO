-- T03 L4 completion: the target version when the request was made (an applied change must be newer),
-- whether the value the cited change set equals the proposal, and the required explanation when not.
-- NOT VALID: enforced for every new or updated row; decisions recorded before this rule are not rewritten.
ALTER TABLE "os_issue_correction_requests"
  ADD COLUMN "target_version_at_request" INTEGER,
  ADD COLUMN "value_matched" BOOLEAN,
  ADD COLUMN "difference_explanation" TEXT,
  ADD CONSTRAINT "os_issue_correction_requests_applied_value_check" CHECK (
    "decision" IS DISTINCT FROM 'applied'
    OR "value_matched" IS TRUE
    OR char_length(coalesce("difference_explanation", '')) BETWEEN 10 AND 500) NOT VALID;
