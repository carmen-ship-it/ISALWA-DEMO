-- Customer-specific commercial coverage grant.
-- Additive CREATE only. Does not ALTER commercial accounts, quotes, or orders.
-- One primary owner remains. The acting advisor is not a co-owner.
-- Not GrantDelegation (which applies scopes to every resource).
-- Not account reassignment. Cargo and title never create a row.
-- Reads and CreateOrder coverage checks must filter by session organization_id.

CREATE TABLE os_customer_coverage_grants (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  customer_party_id TEXT NOT NULL,
  primary_owner_member_id TEXT NOT NULL,
  acting_advisor_member_id TEXT NOT NULL,
  grant_type TEXT NOT NULL DEFAULT 'commercial.customer.coverage',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ NOT NULL,
  recorded_by_member_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_customer_coverage_grants_type_chk
    CHECK (grant_type = 'commercial.customer.coverage'),
  CONSTRAINT os_customer_coverage_grants_party_chk
    CHECK (length(btrim(customer_party_id)) > 0),
  CONSTRAINT os_customer_coverage_grants_owner_chk
    CHECK (length(btrim(primary_owner_member_id)) > 0),
  CONSTRAINT os_customer_coverage_grants_advisor_chk
    CHECK (length(btrim(acting_advisor_member_id)) > 0),
  CONSTRAINT os_customer_coverage_grants_distinct_chk
    CHECK (primary_owner_member_id <> acting_advisor_member_id),
  CONSTRAINT os_customer_coverage_grants_window_chk
    CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX os_customer_coverage_grants_lookup_idx
  ON os_customer_coverage_grants (
    organization_id,
    customer_party_id,
    acting_advisor_member_id,
    starts_at
  );

CREATE INDEX os_customer_coverage_grants_owner_idx
  ON os_customer_coverage_grants (
    organization_id,
    customer_party_id,
    primary_owner_member_id
  );
