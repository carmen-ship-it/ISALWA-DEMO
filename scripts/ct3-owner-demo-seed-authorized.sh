#!/usr/bin/env bash
# CT3 owner-demo densify seed — authorized operator path.
# Runs against SYNTH only. Never echoes secrets. Never mutates REAL_SEVEN.
#
# Prefer running from an environment that already has staging Postgres reachability
# (operator laptop on allowlisted network, or CI/operator host). Do NOT widen DB exposure.
#
# Usage:
#   STAGING_FIXTURE_CONFIRM=1 ./scripts/ct3-owner-demo-seed-authorized.sh
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SECRET_FILE="${HOME}/.isalwa-secrets/isalwa-os-staging.external-database-url"
if [[ -z "${OS_DATABASE_URL:-}" ]]; then
  if [[ ! -f "$SECRET_FILE" ]]; then
    echo "OS_DATABASE_URL missing and secret file absent" >&2
    exit 1
  fi
  OS_DATABASE_URL="$(tr -d '\n' < "$SECRET_FILE")"
  export OS_DATABASE_URL
fi

# sslmode for Render external
case "$OS_DATABASE_URL" in
  *\?*) export OS_DATABASE_URL="${OS_DATABASE_URL}&sslmode=require" ;;
  *) export OS_DATABASE_URL="${OS_DATABASE_URL}?sslmode=require" ;;
esac

export STAGING_FIXTURE_CONFIRM="${STAGING_FIXTURE_CONFIRM:-1}"
if [[ "$STAGING_FIXTURE_CONFIRM" != "1" ]]; then
  echo "STAGING_FIXTURE_CONFIRM=1 required" >&2
  exit 1
fi

echo "OWNER_DEMO_SEED_START synth=01M2JKF77TXMJNDTKNCYNHH9G5"
echo "GIT_SHA=$(git rev-parse HEAD)"
corepack pnpm --filter @isalwa/os-database run fixture:owner-demo
echo "OWNER_DEMO_SEED_DONE"
# Non-secret presence checks only
python3 - <<'PY'
import json
from pathlib import Path
p = Path.home() / '.isalwa-secrets' / 'isalwa-os-owner-demo-seed.json'
if not p.exists():
    raise SystemExit('RECEIPT_MISSING')
r = json.loads(p.read_text())
assert r.get('organizationId') == '01M2JKF77TXMJNDTKNCYNHH9G5'
assert r.get('REAL_SEVEN_MUTATED') == 'NO'
print('RECEIPT_OK clients=', len(r.get('clients') or []))
print('REAL_SEVEN_MUTATED', r.get('REAL_SEVEN_MUTATED'))
PY
