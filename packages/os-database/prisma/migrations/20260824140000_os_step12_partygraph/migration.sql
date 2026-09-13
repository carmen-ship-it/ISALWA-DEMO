-- Step 12 — PartyGraph foundation (Lane C)

CREATE TABLE os_parties (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  party_kind TEXT NOT NULL,
  display_name TEXT NOT NULL,
  legal_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  merged_into_party_id TEXT REFERENCES os_parties(id),
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX os_parties_org_status_idx ON os_parties (organization_id, status);

CREATE TABLE os_party_role_assignments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  party_id TEXT NOT NULL REFERENCES os_parties(id),
  role_key TEXT NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX os_party_role_assignments_party_effective_idx ON os_party_role_assignments (party_id, effective_at);
CREATE INDEX os_party_role_assignments_org_role_idx ON os_party_role_assignments (organization_id, role_key);

CREATE TABLE os_contacts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  organization_party_id TEXT NOT NULL REFERENCES os_parties(id),
  person_party_id TEXT,
  given_name TEXT NOT NULL,
  family_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX os_contacts_org_party_idx ON os_contacts (organization_party_id);

CREATE TABLE os_fiscal_identities (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  party_id TEXT NOT NULL REFERENCES os_parties(id),
  nit TEXT NOT NULL,
  razon_social TEXT NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX os_fiscal_identities_org_nit_idx ON os_fiscal_identities (organization_id, nit);
CREATE INDEX os_fiscal_identities_party_effective_idx ON os_fiscal_identities (party_id, effective_at);

CREATE TABLE os_commercial_accounts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  party_id TEXT NOT NULL REFERENCES os_parties(id),
  territory_id TEXT,
  owner_member_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, party_id)
);

CREATE TABLE os_leads (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  resolved_party_id TEXT REFERENCES os_parties(id),
  batch_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX os_leads_org_status_idx ON os_leads (organization_id, status);

CREATE TABLE os_party_duplicate_candidates (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  party_id_a TEXT NOT NULL REFERENCES os_parties(id),
  party_id_b TEXT NOT NULL REFERENCES os_parties(id),
  match_reason TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'suggested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, party_id_a, party_id_b)
);

CREATE TABLE os_party_merge_requests (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  source_party_id TEXT NOT NULL REFERENCES os_parties(id),
  target_party_id TEXT NOT NULL REFERENCES os_parties(id),
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by_member_id TEXT NOT NULL,
  decided_by_member_id TEXT,
  lineage_snapshot_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ
);
CREATE INDEX os_party_merge_requests_org_status_idx ON os_party_merge_requests (organization_id, status);
