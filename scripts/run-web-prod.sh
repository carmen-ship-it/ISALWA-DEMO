#!/bin/bash
# Replit production server for ISALWA web (Next.js 15)
# No app code changes — only Replit-specific wiring.
set -e

REPO_ROOT="/home/runner/workspace/.migration-backup"
cd "$REPO_ROOT"

# SSR server components read NEXT_PUBLIC_API_URL at runtime — set to direct NestJS port
# so server-side fetches bypass the public proxy (faster, no round-trip).
# CSR bundle was built with NEXT_PUBLIC_API_URL="" so browsers use relative /v1/* paths.
export NEXT_PUBLIC_API_URL="http://localhost:8080"

exec pnpm --filter @isalwa/web exec next start --port "$PORT" --hostname 0.0.0.0
