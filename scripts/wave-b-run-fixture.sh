#!/usr/bin/env bash
# Wave B SYNTH fixture runner — never echoes secrets.
set -euo pipefail
cd /Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate
export SUPABASE_URL="https://qbpxuywtoycjpitxoblo.supabase.co"
export OS_DATABASE_URL="$(tr -d '\n' < "$HOME/.isalwa-secrets/isalwa-os-staging.external-database-url")"
case "$OS_DATABASE_URL" in *\?*) export OS_DATABASE_URL="${OS_DATABASE_URL}&sslmode=require" ;; *) export OS_DATABASE_URL="${OS_DATABASE_URL}?sslmode=require" ;; esac
export SUPABASE_ANON_KEY="$(tr -d '\n' < "$HOME/.isalwa-secrets/isalwa-os-auth-staging.anon-key")"
export SUPABASE_SERVICE_ROLE_KEY="$(tr -d '\n' < "$HOME/.isalwa-secrets/isalwa-os-auth-staging.service-role-key")"
export STAGING_FIXTURE_CONFIRM=1
python3 - <<'PY'
import os
for k in ['OS_DATABASE_URL','SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY']:
  print(f'{k}_PRESENT', bool(os.environ.get(k)))
PY
corepack pnpm --filter @isalwa/os-database exec node --import tsx src/staging-wave-b-issue-memory.ts
python3 - <<'PY'
import json
from pathlib import Path
r=json.loads(Path.home().joinpath('.isalwa-secrets/isalwa-os-staging-wave-b-issue-memory.json').read_text())
assert r.get('organizationId')=='01M2JKF77TXMJNDTKNCYNHH9G5'
# print only non-secret identity fields
for key in ('reporter','issueManager','manager','workActor','issueWork'):
  row=r.get(key)
  if isinstance(row, dict):
    print(key, row.get('email'), row.get('memberId'), row.get('scopes'))
print('RECEIPT_OK')
PY
