-- Canonical OS Location (Party-owned). Maps URL is provenance only; no PostGIS in this slice.

CREATE TABLE os_locations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  party_id TEXT NOT NULL REFERENCES os_parties(id),
  label TEXT NOT NULL,
  address_text TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  provenance_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX os_locations_org_party_idx ON os_locations (organization_id, party_id);
CREATE INDEX os_locations_org_status_idx ON os_locations (organization_id, status);
