-- ISALWA OS Foundation — Step 10 initial migration

CREATE TABLE IF NOT EXISTS os_organizations (
  id TEXT PRIMARY KEY,
  legal_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  timezone TEXT NOT NULL DEFAULT 'America/La_Paz',
  locale TEXT NOT NULL DEFAULT 'es-BO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS os_persons (
  id TEXT PRIMARY KEY,
  given_name TEXT NOT NULL,
  family_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS os_organization_members (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  person_id TEXT NOT NULL REFERENCES os_persons(id),
  employment_status TEXT NOT NULL,
  access_status TEXT NOT NULL,
  employment_started_at TIMESTAMPTZ,
  employment_ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX os_organization_members_org_access ON os_organization_members(organization_id, access_status);

CREATE TABLE IF NOT EXISTS os_auth_identities (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES os_persons(id),
  provider TEXT NOT NULL,
  provider_subject TEXT,
  email TEXT NOT NULL,
  status TEXT NOT NULL,
  invited_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, email)
);

CREATE TABLE IF NOT EXISTS os_departments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  parent_id TEXT REFERENCES os_departments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS os_territories (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  parent_id TEXT REFERENCES os_territories(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS os_role_assignments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  member_id TEXT NOT NULL REFERENCES os_organization_members(id),
  role_key TEXT NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX os_role_assignments_member ON os_role_assignments(member_id, effective_at);

CREATE TABLE IF NOT EXISTS os_department_assignments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  member_id TEXT NOT NULL REFERENCES os_organization_members(id),
  department_id TEXT NOT NULL REFERENCES os_departments(id),
  effective_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS os_manager_assignments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  member_id TEXT NOT NULL REFERENCES os_organization_members(id),
  manager_member_id TEXT NOT NULL REFERENCES os_organization_members(id),
  effective_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS os_delegations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  delegator_member_id TEXT NOT NULL REFERENCES os_organization_members(id),
  delegate_member_id TEXT NOT NULL REFERENCES os_organization_members(id),
  scopes_json JSONB NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS os_work_items (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  owner_member_id TEXT NOT NULL REFERENCES os_organization_members(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  subject_type TEXT,
  subject_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS os_business_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_member_id TEXT,
  authorization_context_json JSONB,
  primary_entity_type TEXT NOT NULL,
  primary_entity_id TEXT NOT NULL,
  payload_json JSONB,
  provenance TEXT NOT NULL DEFAULT 'command',
  correlation_id TEXT NOT NULL,
  idempotency_key TEXT,
  data_origin TEXT NOT NULL DEFAULT 'production',
  capability_key TEXT,
  UNIQUE(organization_id, idempotency_key)
);

CREATE INDEX os_business_events_org_time ON os_business_events(organization_id, occurred_at);
CREATE INDEX os_business_events_correlation ON os_business_events(correlation_id);

CREATE TABLE IF NOT EXISTS os_audit_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  actor_member_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  before_json JSONB,
  after_json JSONB,
  correlation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS os_outbox_messages (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  event_id TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS os_idempotency_keys (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  key TEXT NOT NULL,
  command_name TEXT NOT NULL,
  result_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(organization_id, key)
);

CREATE TABLE IF NOT EXISTS os_capability_states (
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  capability_key TEXT NOT NULL,
  state TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, capability_key)
);
