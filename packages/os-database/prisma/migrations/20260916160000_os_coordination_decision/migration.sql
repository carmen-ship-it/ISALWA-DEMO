-- Coordination decisions. Additive CREATE only.
-- Does not ALTER production, payment, warehouse, order, or commercial tables.
-- A row is a decision someone recorded. It is not a meeting and not a calendar slot.
-- Resolution is a new row with kind = resolved. Do not UPDATE a prior row to close it.
-- Recording a decision does not grant production, finance, or warehouse authority.
-- Cargo and title, including Auxiliar, do not grant coordination.decision.record.
-- linked_case_id is opaque. No foreign key to cases, orders, production, or payments.
-- Reads, search, and aggregates must filter by the session organization_id.
-- A missing session organization is a denial. Do not fall back to another row's organization.

CREATE TABLE os_coordination_decisions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  kind TEXT NOT NULL DEFAULT 'recorded',
  decision TEXT NOT NULL,
  owner_label TEXT,
  owner_member_id TEXT,
  due_at TEXT,
  actor_label TEXT NOT NULL,
  actor_member_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  linked_case_id TEXT,
  notes TEXT,
  resolves_decision_id TEXT,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_coordination_decisions_decision_chk
    CHECK (length(btrim(decision)) > 0),
  CONSTRAINT os_coordination_decisions_actor_chk
    CHECK (length(btrim(actor_label)) > 0),
  CONSTRAINT os_coordination_decisions_kind_chk
    CHECK (kind IN ('recorded', 'resolved')),
  CONSTRAINT os_coordination_decisions_resolution_chk
    CHECK (
      (kind = 'recorded' AND resolves_decision_id IS NULL)
      OR (
        kind = 'resolved'
        AND resolves_decision_id IS NOT NULL
        AND resolves_decision_id <> id
      )
    ),
  CONSTRAINT os_coordination_decisions_owner_chk
    CHECK (owner_label IS NULL OR length(btrim(owner_label)) > 0),
  CONSTRAINT os_coordination_decisions_due_chk
    CHECK (due_at IS NULL OR length(btrim(due_at)) > 0),
  CONSTRAINT os_coordination_decisions_case_chk
    CHECK (linked_case_id IS NULL OR length(btrim(linked_case_id)) > 0),
  CONSTRAINT os_coordination_decisions_notes_chk
    CHECK (notes IS NULL OR length(btrim(notes)) > 0)
);

-- No unique index on decision text. A title must not become a cross-tenant lookup key.
-- owner_member_id and actor_member_id are opaque. No foreign key to members.
-- No production_status, payment_confirmed, or warehouse movement column.

CREATE INDEX os_coordination_decisions_org_occurred_idx
  ON os_coordination_decisions (organization_id, occurred_at);
CREATE INDEX os_coordination_decisions_org_kind_idx
  ON os_coordination_decisions (organization_id, kind);

-- History is append-only. Resolution must be inserted as a new row.
CREATE OR REPLACE FUNCTION os_coordination_decision_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'coordination decision history is append-only';
END;
$$;

CREATE TRIGGER os_coordination_decisions_append_only
  BEFORE UPDATE OR DELETE ON os_coordination_decisions
  FOR EACH ROW EXECUTE FUNCTION os_coordination_decision_append_only();

-- A resolution cannot close a decision that belongs to another organization.
CREATE OR REPLACE FUNCTION os_coordination_decision_same_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  prior_org TEXT;
BEGIN
  IF NEW.resolves_decision_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT organization_id INTO prior_org
  FROM os_coordination_decisions
  WHERE id = NEW.resolves_decision_id;

  IF prior_org IS NULL OR prior_org <> NEW.organization_id THEN
    RAISE EXCEPTION 'coordination decision resolution is tenant-bound';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER os_coordination_decisions_same_tenant
  BEFORE INSERT ON os_coordination_decisions
  FOR EACH ROW EXECUTE FUNCTION os_coordination_decision_same_tenant();
