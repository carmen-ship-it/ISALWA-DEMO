-- Client XLS import batch + row lineage (importer lane). Does not alter os_locations.

CREATE TABLE os_import_batches (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  source_kind TEXT NOT NULL,
  source_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL,
  created_by_member_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  receipt_json JSONB NOT NULL,
  idempotency_key TEXT NOT NULL,
  reversed_at TIMESTAMPTZ,
  reversed_entity_refs JSONB
);

CREATE UNIQUE INDEX os_import_batches_org_idempotency_uidx
  ON os_import_batches (organization_id, idempotency_key);
CREATE INDEX os_import_batches_org_status_idx
  ON os_import_batches (organization_id, status);

CREATE TABLE os_import_rows (
  id TEXT PRIMARY KEY,
  import_batch_id TEXT NOT NULL REFERENCES os_import_batches(id),
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  section TEXT NOT NULL,
  row_index INTEGER NOT NULL,
  outcome TEXT NOT NULL,
  entity_refs_json JSONB NOT NULL,
  error_code TEXT,
  normalized_snapshot_json JSONB NOT NULL
);

CREATE INDEX os_import_rows_batch_idx ON os_import_rows (import_batch_id);
CREATE INDEX os_import_rows_org_batch_idx ON os_import_rows (organization_id, import_batch_id);
