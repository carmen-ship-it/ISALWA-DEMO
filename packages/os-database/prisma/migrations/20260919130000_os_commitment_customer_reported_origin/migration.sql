-- Allow canonical customer_reported commitment origin.
-- Source qualification only — never payment confirmation.
-- Additive CHECK replacement only.

ALTER TABLE os_commitments
  DROP CONSTRAINT IF EXISTS os_commitments_origin_chk;

ALTER TABLE os_commitments
  ADD CONSTRAINT os_commitments_origin_chk
  CHECK (
    origin IN (
      'employee_entered',
      'human_confirmed_suggestion',
      'customer_reported'
    )
  );

ALTER TABLE os_commitments
  DROP CONSTRAINT IF EXISTS os_commitments_provenance_chk;

ALTER TABLE os_commitments
  ADD CONSTRAINT os_commitments_provenance_chk
  CHECK (
    (
      origin = 'employee_entered'
      AND provenance_suggestion_id IS NULL
    )
    OR (
      origin = 'customer_reported'
      AND provenance_suggestion_id IS NULL
    )
    OR (
      origin = 'human_confirmed_suggestion'
      AND provenance_suggestion_id IS NOT NULL
      AND length(btrim(provenance_suggestion_id)) > 0
    )
  );
