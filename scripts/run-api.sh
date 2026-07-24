#!/bin/bash
# Replit run script for ISALWA API (NestJS 11)
# Only Replit-specific wiring — no app code changes.
#
# tsx/esbuild does not emit decorator metadata, so NestJS DI silently receives
# undefined for injected services. We compile with tsc first (which respects
# emitDecoratorMetadata: true in apps/api/tsconfig.json) then run the output.
set -e

REPO_ROOT="/home/runner/workspace/.migration-backup"
cd "$REPO_ROOT"

echo "=== Compiling API with tsc ==="
pnpm --filter @isalwa/api run build

echo "=== Starting API ==="
# NestJS reads API_PORT (falls back to 4000). Map Replit's PORT to it.
export API_PORT="$PORT"

exec node apps/api/dist/main.js
