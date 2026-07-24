#!/bin/bash
# Replit run script for ISALWA web (Next.js 15)
# Only Replit-specific wiring — no app code changes.
set -e

REPO_ROOT="/home/runner/workspace/.migration-backup"

# Write a .env.local so Next.js knows the API origin for both SSR and CSR.
# apps/web/src/lib/api.ts builds URLs as "${API_BASE}/v1${path}", so this must
# be the origin root only — NOT /v1-suffixed (that would produce /v1/v1/...).
cat > "$REPO_ROOT/apps/web/.env.local" <<EOF
NEXT_PUBLIC_API_URL=https://${REPLIT_DEV_DOMAIN}
EOF

cd "$REPO_ROOT"

# Start Next.js dev server bound to all interfaces on the workflow-provided PORT
exec pnpm --filter @isalwa/web exec next dev --port "$PORT" --hostname 0.0.0.0
