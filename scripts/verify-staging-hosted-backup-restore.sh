#!/usr/bin/env bash
# Staging hosted backup → restore drill into a SEPARATE local database.
# Does NOT point os-api at the restore target. Does NOT modify live staging.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SECRETS_DIR="${HOME}/.isalwa-secrets"
EXTERNAL_URL_FILE="${SECRETS_DIR}/isalwa-os-staging.external-database-url"
BACKUP_DIR="${SECRETS_DIR}/staging-backups"
RESTORE_DB="${STAGING_RESTORE_DB:-isalwa_staging_restore_drill}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_FILE="${BACKUP_DIR}/isalwa-os-staging-${STAMP}.dump"
MARKER_FILE="${BACKUP_DIR}/restore-marker-${STAMP}.json"
LOG_FILE="${BACKUP_DIR}/restore-drill-${STAMP}.log"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== Staging hosted backup/restore drill ==="
echo "Restore database (local only): ${RESTORE_DB}"
echo "Backup file: ${BACKUP_FILE}"
echo "Log: ${LOG_FILE}"

if [[ ! -f "$EXTERNAL_URL_FILE" ]]; then
  echo "MISSING ${EXTERNAL_URL_FILE}"
  exit 1
fi

SOURCE_URL="$(tr -d '\n' < "$EXTERNAL_URL_FILE")"
if [[ "$SOURCE_URL" != *"sslmode="* ]]; then
  if [[ "$SOURCE_URL" == *"?"* ]]; then
    SOURCE_URL="${SOURCE_URL}&sslmode=require"
  else
    SOURCE_URL="${SOURCE_URL}?sslmode=require"
  fi
fi

PGHOST_LOCAL="${PGHOST:-localhost}"
PGPORT_LOCAL="${PGPORT:-5432}"
PGUSER_LOCAL="${PGUSER:-$(whoami)}"
export PGHOST="$PGHOST_LOCAL" PGPORT="$PGPORT_LOCAL" PGUSER="$PGUSER_LOCAL"
unset PGPASSWORD || true

psql_local() {
  psql -h "$PGHOST_LOCAL" -p "$PGPORT_LOCAL" -U "$PGUSER_LOCAL" -v ON_ERROR_STOP=1 "$@"
}

echo "--- 1. Capture live staging counts (source of truth) ---"
export OS_DATABASE_URL="$SOURCE_URL"
export STAMP MARKER_FILE
corepack pnpm --filter @isalwa/os-database exec node --import tsx <<'TS'
import { writeFileSync } from 'node:fs';
import { getOsPrisma } from './src/client.ts';
const p = getOsPrisma();
if (!p) throw new Error('no prisma');
const [orgs, parties, quotes, members, identities, migrations] = await Promise.all([
  p.osOrganization.count(),
  p.osParty.count(),
  p.osQuote.count(),
  p.osOrganizationMember.count(),
  p.osAuthIdentity.count(),
  p.$queryRawUnsafe('SELECT COUNT(*)::int AS c FROM _prisma_migrations') as Promise<Array<{ c: number }>>,
]);
const org = await p.osOrganization.findFirst({ orderBy: { createdAt: 'asc' } });
const party = await p.osParty.findFirst({ orderBy: { createdAt: 'asc' } });
const quote = await p.osQuote.findFirst({ orderBy: { createdAt: 'asc' } });
const marker = {
  stamp: process.env.STAMP,
  source: 'isalwa-os-staging',
  counts: {
    orgs,
    parties,
    quotes,
    members,
    identities,
    migrations: migrations[0]?.c ?? null,
  },
  sample: {
    organizationId: org?.id ?? null,
    partyId: party?.id ?? null,
    quoteId: quote?.id ?? null,
  },
};
writeFileSync(process.env.MARKER_FILE!, JSON.stringify(marker, null, 2));
console.log(JSON.stringify({ ok: true, counts: marker.counts, samplePresent: Boolean(org && party && quote) }));
await p.$disconnect();
TS
chmod 600 "$MARKER_FILE"

echo "--- 2. pg_dump staging (custom format, no-owner) ---"
pg_dump "$SOURCE_URL" --no-owner --no-acl --format=c --file="$BACKUP_FILE"
chmod 600 "$BACKUP_FILE"
BACKUP_BYTES="$(wc -c < "$BACKUP_FILE" | tr -d ' ')"
echo "Backup bytes: ${BACKUP_BYTES}"
pg_restore --list "$BACKUP_FILE" | head -20
pg_restore --list "$BACKUP_FILE" | grep -q 'TABLE DATA public os_organizations\|TABLE public os_organizations'
pg_restore --list "$BACKUP_FILE" | grep -q 'os_quotes'

echo "--- 3. Recreate LOCAL restore database (not live staging) ---"
psql_local -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${RESTORE_DB}' AND pid <> pg_backend_pid();" 2>/dev/null || true
psql_local -d postgres -c "DROP DATABASE IF EXISTS \"${RESTORE_DB}\";"
psql_local -d postgres -c "CREATE DATABASE \"${RESTORE_DB}\";"

echo "--- 4. pg_restore into local ${RESTORE_DB} ---"
pg_restore -h "$PGHOST_LOCAL" -p "$PGPORT_LOCAL" -U "$PGUSER_LOCAL" -d "$RESTORE_DB" \
  --no-owner --no-acl --exit-on-error "$BACKUP_FILE"

echo "--- 5. Verify restored data against marker ---"
LOCAL_URL="postgresql://${PGUSER_LOCAL}@${PGHOST_LOCAL}:${PGPORT_LOCAL}/${RESTORE_DB}"
export OS_DATABASE_URL="$LOCAL_URL"
export RESTORE_DB
corepack pnpm --filter @isalwa/os-database exec node --import tsx <<'TS'
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { getOsPrisma } from './src/client.ts';

const marker = JSON.parse(readFileSync(process.env.MARKER_FILE!, 'utf8')) as {
  counts: Record<string, number | null>;
  sample: { organizationId: string | null; partyId: string | null; quoteId: string | null };
};
const p = getOsPrisma();
if (!p) throw new Error('no prisma');

const [orgs, parties, quotes, members, identities, migrations] = await Promise.all([
  p.osOrganization.count(),
  p.osParty.count(),
  p.osQuote.count(),
  p.osOrganizationMember.count(),
  p.osAuthIdentity.count(),
  p.$queryRawUnsafe('SELECT COUNT(*)::int AS c FROM _prisma_migrations') as Promise<Array<{ c: number }>>,
]);

assert.equal(orgs, marker.counts.orgs);
assert.equal(parties, marker.counts.parties);
assert.equal(quotes, marker.counts.quotes);
assert.equal(members, marker.counts.members);
assert.equal(identities, marker.counts.identities);
assert.equal(migrations[0]?.c, marker.counts.migrations);

if (marker.sample.organizationId) {
  assert.ok(await p.osOrganization.findUnique({ where: { id: marker.sample.organizationId } }));
}
if (marker.sample.partyId) {
  const party = await p.osParty.findUnique({ where: { id: marker.sample.partyId } });
  assert.ok(party);
  assert.equal(party!.organizationId, marker.sample.organizationId);
}
if (marker.sample.quoteId) {
  const quote = await p.osQuote.findUnique({ where: { id: marker.sample.quoteId } });
  assert.ok(quote);
  assert.equal(quote!.organizationId, marker.sample.organizationId);
}

assert.ok((await p.osAuthIdentity.count()) >= 1);
assert.ok((await p.osOrganizationMember.count()) >= 1);

console.log(
  JSON.stringify({
    ok: true,
    restoreDb: process.env.RESTORE_DB,
    verifiedCounts: { orgs, parties, quotes, members, identities, migrations: migrations[0]?.c },
  }),
);
await p.$disconnect();
TS

echo "--- 6. Confirm live staging URL was never swapped for API ---"
echo "LIVE_STAGING_UNTOUCHED=yes"
echo "RESTORE_TARGET=${RESTORE_DB}"
echo "=== Staging hosted backup/restore drill PASS ==="
echo "Backup: ${BACKUP_FILE}"
echo "Marker: ${MARKER_FILE}"
echo "Log: ${LOG_FILE}"
echo "Cleanup optional: dropdb -h ${PGHOST_LOCAL} -p ${PGPORT_LOCAL} -U ${PGUSER_LOCAL} ${RESTORE_DB}"
echo "Keep backup under ${BACKUP_DIR} (mode 600); encrypt with gpg for off-laptop copies."
