-- Step 11 — Outbox delivery, retry, consumer dedup

ALTER TABLE os_outbox_messages
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error TEXT;

CREATE INDEX IF NOT EXISTS os_outbox_messages_status_next_attempt
  ON os_outbox_messages(status, next_attempt_at, created_at);

CREATE TABLE IF NOT EXISTS os_outbox_consumer_dedup (
  organization_id TEXT NOT NULL REFERENCES os_organizations(id),
  consumer_key TEXT NOT NULL,
  event_id TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, consumer_key, event_id)
);
