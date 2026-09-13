# Backup & Restore Runbook — ISALWA OS PostgreSQL

Canonical procedure using **standard PostgreSQL tools** (`pg_dump`, `psql`). No vendor-specific backup product required.

**Verification tier:** TESTED locally — see [`STEP_17_PREP_TECHNICAL_HANDOFF_EVIDENCE.md`](../architecture/STEP_17_PREP_TECHNICAL_HANDOFF_EVIDENCE.md).

---

## Scope

Back up the database referenced by **`OS_DATABASE_URL`** (all `os_*` authoritative tables, migrations history, outbox, audit, idempotency).

Legacy `DATABASE_URL` database (if still running) is a **separate** backup scope.

---

## Full backup (schema + data)

### Plain SQL (portable)

```bash
export OS_DATABASE_URL="postgresql://USER:PASS@HOST:5432/DBNAME"
# Parse or set PG* vars explicitly:
export PGHOST=... PGPORT=5432 PGUSER=... PGPASSWORD=... 

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$DBNAME" \
  --no-owner --no-acl --format=p \
  --file="isalwa-os-backup-${STAMP}.sql"
```

### Custom format (compressed, pg_restore)

```bash
pg_dump -Fc -h "$PGHOST" -U "$PGUSER" -d "$DBNAME" \
  --no-owner --no-acl \
  --file="isalwa-os-backup-${STAMP}.dump"
```

---

## Naming convention

```
isalwa-os-backup-<UTC_TIMESTAMP>.sql
isalwa-os-backup-<UTC_TIMESTAMP>.dump
```

Include environment in storage path, not filename prefix (e.g. `backups/production/`, `backups/staging/`).

---

## Encryption expectation

- Backup files contain **full database secrets and PII**.
- Encrypt at rest (disk encryption, `gpg`, or object-storage SSE).
- Restrict file permissions (`chmod 600`).
- Never commit backups to git.

Example:

```bash
gpg --symmetric --cipher-algo AES256 isalwa-os-backup-${STAMP}.sql
```

---

## Storage expectation

- Off-host storage separate from database server.
- Retention: **configurable policy** — recommend minimum 30 days daily + pre-migration snapshot kept until migration verified.
- Document who can access backup storage (ISALWA ops role, not individual engineer).

---

## Backup integrity verification

Before trusting a backup:

```bash
# Plain SQL
grep -q 'os_organizations' isalwa-os-backup-*.sql
grep -q 'os_business_events' isalwa-os-backup-*.sql

# Custom format
pg_restore --list isalwa-os-backup-*.dump | head
```

Automated drill:

```bash
./scripts/verify-step-17-backup-restore.sh
```

---

## Restore procedure

**Warning:** Restore to an existing database overwrites data. Prefer empty database or new DB name.

### Plain SQL restore

```bash
# Create empty database (if needed)
psql -h "$PGHOST" -U "$PGUSER" -d postgres -c "CREATE DATABASE isalwa_restored;"

psql -h "$PGHOST" -U "$PGUSER" -d isalwa_restored -v ON_ERROR_STOP=1 \
  -f isalwa-os-backup-YYYYMMDDTHHMMSSZ.sql
```

### Custom format restore

```bash
pg_restore -h "$PGHOST" -U "$PGUSER" -d isalwa_restored \
  --no-owner --no-acl isalwa-os-backup-YYYYMMDD.dump
```

### After restore

1. Point `OS_DATABASE_URL` at restored database.
2. **Do not** re-run `migrate:deploy` if backup already includes applied migrations and data — only run if restoring schema-only backup or partial dump.
3. Start os-api: `pnpm --filter @isalwa/os-api start`
4. Verify health + row counts (see drill below).

---

## Verified LOCAL/TEST drill

Script: `./scripts/verify-step-17-backup-restore.sh`

Uses isolated database `isalwa_step17_restore` (override: `STEP17_TEST_DB`).

Steps:

1. Create DB + apply migrations
2. Seed workforce + party + events (`step17-restore-seed.ts`)
3. `pg_dump` full backup
4. Drop and recreate empty DB
5. Restore from backup
6. Verify marker counts (`step17-restore-verify.ts`)
7. os-api health against restored DB

**Evidence log:** `.step17-evidence/verify-20260824T130709Z.log`

**What restore proved:**

| Domain | Verified |
|--------|----------|
| Organizations | Row restored by ID |
| PartyGraph | Party row + org linkage |
| Workforce | Invite command side effects |
| Events | `os_business_events` count |
| Outbox | `os_outbox_messages` count |
| Audit | `os_audit_logs` count |
| Idempotency | Table readable post-restore |
| API boot | `GET /v1/health` on restored DB |

**Not yet production-verified:** restore timing at production data scale, point-in-time recovery, cross-region replication.

---

## Staging hosted (Render) — operator path

**Resource:** Render Postgres `isalwa-os-staging` (`dpg-dajd3kh5efls738falcg-a`), plan **free**, region virginia, Postgres 16.

### Managed backup (actual plan truth)

| Capability | Status on current free plan |
|------------|-----------------------------|
| Managed automated backups | **Unavailable / not offered on free** |
| PITR | **Unavailable on free** |
| High availability | Disabled |
| Operator recovery | **Required:** `pg_dump` off-host |

Do not assume Dashboard PITR exists until the database is upgraded to a paid plan that documents backups.

### Off-host dump (canonical)

Secrets live under `~/.isalwa-secrets/` (mode 600). Never commit dumps.

```bash
# External URL file (operator machine allowlisted on Render DB)
export OS_DATABASE_URL="$(cat ~/.isalwa-secrets/isalwa-os-staging.external-database-url)"
# Append sslmode=require if missing

mkdir -p ~/.isalwa-secrets/staging-backups && chmod 700 ~/.isalwa-secrets/staging-backups
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
pg_dump "$OS_DATABASE_URL" --no-owner --no-acl -Fc \
  --file="$HOME/.isalwa-secrets/staging-backups/isalwa-os-staging-${STAMP}.dump"
chmod 600 "$HOME/.isalwa-secrets/staging-backups/isalwa-os-staging-${STAMP}.dump"

# Optional encrypt for transport
# gpg --symmetric --cipher-algo AES256 ~/.isalwa-secrets/staging-backups/isalwa-os-staging-${STAMP}.dump
```

**Credential ownership:** Carmen / ISALWA ops — Render Dashboard + `~/.isalwa-secrets/*` (not git, not Slack).

### Hosted → local restore drill (does not retarget os-api)

```bash
./scripts/verify-staging-hosted-backup-restore.sh
```

- Source: live staging external URL  
- Target: **local** database `isalwa_staging_restore_drill` only  
- Verifies org/party/quote/member/authIdentity/migration counts  
- Leaves live `OS_DATABASE_URL` on Render untouched  

Evidence files (local only): `~/.isalwa-secrets/staging-backups/restore-drill-*.log`

### Restore to a new empty DB (manual)

```bash
createdb isalwa_staging_restore_drill   # or empty Render DB when paid
pg_restore --no-owner --no-acl -d "$RESTORE_DATABASE_URL" \
  ~/.isalwa-secrets/staging-backups/isalwa-os-staging-YYYYMMDDTHHMMSSZ.dump
```

Then verify row counts; only then consider pointing a **non-production** API at the restored DB.

### Hosted tenant isolation fixture

```bash
export OS_DATABASE_URL="$(cat ~/.isalwa-secrets/isalwa-os-staging.external-database-url)?sslmode=require"
pnpm --filter @isalwa/os-database exec node --import tsx src/staging-isolation-fixture.ts
node scripts/verify-staging-hosted-tenant-isolation.mjs
```

---

## When to backup

| Event | Backup |
|-------|--------|
| Scheduled | Daily (production policy TBD) |
| Pre-migration | **Required** before destructive migration |
| Pre-major release | Recommended |
| Before manual ops | Required |

---

## What NOT to do

- Do not rely on Docker volume copy as sole backup strategy without logical dump verification.
- Do not restore production backup into shared dev without sanitization.
- Do not delete sole backup until restore drill succeeds on a test instance.
