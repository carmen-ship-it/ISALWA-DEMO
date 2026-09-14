-- Two dates. Additive CREATE only. Do not collapse them.
-- Fecha con el cliente is coordinated by sales. Production knows that date.
-- Fecha interna de producción is maintained by Production. Separate history.
-- Does not ALTER os_orders, quotes, work items, or attention read models.
-- No foreign key between the two date tables. No trigger copies one into the other.
-- Does not store a prediction. A past date is not a warning and is not a column.
-- An issue may set two flags. Customer informed is a separate table.

CREATE TABLE os_customer_committed_dates (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  party_id TEXT,
  commercial_owner_member_id TEXT NOT NULL,
  committed_on DATE NOT NULL,
  original_committed_on DATE NOT NULL,
  original_reason TEXT NOT NULL,
  source TEXT NOT NULL,
  set_by_member_id TEXT NOT NULL,
  set_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_customer_committed_dates_subject_type_chk
    CHECK (subject_type IN ('order', 'quote', 'opportunity')),
  CONSTRAINT os_customer_committed_dates_subject_id_chk
    CHECK (length(btrim(subject_id)) > 0),
  CONSTRAINT os_customer_committed_dates_owner_chk
    CHECK (length(btrim(commercial_owner_member_id)) > 0),
  CONSTRAINT os_customer_committed_dates_setter_chk
    CHECK (
      length(btrim(set_by_member_id)) > 0
      AND set_by_member_id = commercial_owner_member_id
    ),
  CONSTRAINT os_customer_committed_dates_reason_chk
    CHECK (length(btrim(original_reason)) > 0),
  CONSTRAINT os_customer_committed_dates_source_chk
    CHECK (source = 'sales_customer_coordination')
);

CREATE UNIQUE INDEX os_customer_committed_dates_subject_uidx
  ON os_customer_committed_dates (organization_id, subject_type, subject_id);

CREATE INDEX os_customer_committed_dates_owner_idx
  ON os_customer_committed_dates (organization_id, commercial_owner_member_id, committed_on);

-- party_id, commercial_owner_member_id, and subject_id are opaque.

CREATE TABLE os_customer_committed_date_revisions (
  id TEXT PRIMARY KEY,
  committed_date_id TEXT NOT NULL REFERENCES os_customer_committed_dates(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  previous_committed_on DATE NOT NULL,
  next_committed_on DATE NOT NULL,
  reason TEXT NOT NULL,
  actor_member_id TEXT NOT NULL,
  source TEXT NOT NULL,
  revised_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT os_customer_committed_date_revisions_reason_chk
    CHECK (length(btrim(reason)) > 0),
  CONSTRAINT os_customer_committed_date_revisions_actor_chk
    CHECK (length(btrim(actor_member_id)) > 0),
  CONSTRAINT os_customer_committed_date_revisions_changed_chk
    CHECK (previous_committed_on <> next_committed_on),
  CONSTRAINT os_customer_committed_date_revisions_source_chk
    CHECK (source = 'sales_customer_coordination')
);

CREATE INDEX os_customer_committed_date_revisions_date_idx
  ON os_customer_committed_date_revisions (committed_date_id, revised_at);

-- Application keeps original_committed_on and original_reason unchanged.

CREATE TABLE os_production_internal_target_dates (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  maintained_by_member_id TEXT NOT NULL,
  target_on DATE NOT NULL,
  original_target_on DATE NOT NULL,
  original_reason TEXT NOT NULL,
  source TEXT NOT NULL,
  set_by_member_id TEXT NOT NULL,
  set_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_production_internal_target_dates_subject_type_chk
    CHECK (subject_type IN ('order', 'quote', 'opportunity')),
  CONSTRAINT os_production_internal_target_dates_subject_id_chk
    CHECK (length(btrim(subject_id)) > 0),
  CONSTRAINT os_production_internal_target_dates_maintainer_chk
    CHECK (length(btrim(maintained_by_member_id)) > 0),
  CONSTRAINT os_production_internal_target_dates_setter_chk
    CHECK (
      length(btrim(set_by_member_id)) > 0
      AND set_by_member_id = maintained_by_member_id
    ),
  CONSTRAINT os_production_internal_target_dates_reason_chk
    CHECK (length(btrim(original_reason)) > 0),
  CONSTRAINT os_production_internal_target_dates_source_chk
    CHECK (source = 'production_internal')
);

CREATE UNIQUE INDEX os_production_internal_target_dates_subject_uidx
  ON os_production_internal_target_dates (organization_id, subject_type, subject_id);

CREATE INDEX os_production_internal_target_dates_maintainer_idx
  ON os_production_internal_target_dates (organization_id, maintained_by_member_id, target_on);

-- No foreign key to os_customer_committed_dates. Do not copy committed_on into target_on.

CREATE TABLE os_production_internal_target_date_revisions (
  id TEXT PRIMARY KEY,
  target_date_id TEXT NOT NULL REFERENCES os_production_internal_target_dates(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  previous_target_on DATE NOT NULL,
  next_target_on DATE NOT NULL,
  reason TEXT NOT NULL,
  actor_member_id TEXT NOT NULL,
  source TEXT NOT NULL,
  revised_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT os_production_internal_target_date_revisions_reason_chk
    CHECK (length(btrim(reason)) > 0),
  CONSTRAINT os_production_internal_target_date_revisions_actor_chk
    CHECK (length(btrim(actor_member_id)) > 0),
  CONSTRAINT os_production_internal_target_date_revisions_changed_chk
    CHECK (previous_target_on <> next_target_on),
  CONSTRAINT os_production_internal_target_date_revisions_source_chk
    CHECK (source = 'production_internal')
);

CREATE INDEX os_production_internal_target_date_revisions_date_idx
  ON os_production_internal_target_date_revisions (target_date_id, revised_at);

CREATE TABLE os_production_date_issues (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  may_affect_production_calendar BOOLEAN NOT NULL,
  may_affect_customer_date BOOLEAN NOT NULL,
  source TEXT NOT NULL,
  note TEXT,
  recorded_by_member_id TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT os_production_date_issues_subject_type_chk
    CHECK (subject_type IN ('order', 'quote', 'opportunity')),
  CONSTRAINT os_production_date_issues_subject_id_chk
    CHECK (length(btrim(subject_id)) > 0),
  CONSTRAINT os_production_date_issues_actor_chk
    CHECK (length(btrim(recorded_by_member_id)) > 0),
  CONSTRAINT os_production_date_issues_source_chk
    CHECK (source = 'human_explicit')
);

CREATE INDEX os_production_date_issues_subject_idx
  ON os_production_date_issues (organization_id, subject_type, subject_id, recorded_at);

-- Both flags are required at insert. Neither is derived from a calendar day.
-- No informed column on this table.

CREATE TABLE os_customer_date_informed_records (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL REFERENCES os_production_date_issues(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  note TEXT NOT NULL,
  recorded_by_member_id TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  notified BOOLEAN NOT NULL,
  CONSTRAINT os_customer_date_informed_records_note_chk
    CHECK (length(btrim(note)) > 0),
  CONSTRAINT os_customer_date_informed_records_actor_chk
    CHECK (length(btrim(recorded_by_member_id)) > 0),
  CONSTRAINT os_customer_date_informed_records_notified_chk
    CHECK (notified = TRUE),
  CONSTRAINT os_customer_date_informed_records_subject_chk
    CHECK (subject_type IN ('order', 'quote', 'opportunity'))
);

CREATE INDEX os_customer_date_informed_records_issue_idx
  ON os_customer_date_informed_records (organization_id, issue_id, recorded_at);

-- One recorded update for an issue is enough to clear "Conviene avisar al cliente" for that issue.
-- The warning is not a column. Another unanswered issue still warns.
-- Does not send mail, push, or a customer channel.
