#!/bin/bash
# Replit production build for ISALWA API (NestJS 11)
# No app code changes — only Replit-specific wiring.
set -e

REPO_ROOT="/home/runner/workspace/.migration-backup"
cd "$REPO_ROOT"

echo "=== Building shared packages ==="
pnpm --filter @isalwa/domain    run build
pnpm --filter @isalwa/ts-utils  run build
pnpm --filter @isalwa/flags     run build
pnpm --filter @isalwa/providers run build
pnpm --filter @isalwa/database  run build

echo "=== Building NestJS API ==="
pnpm --filter @isalwa/api run build

echo "=== Build complete ==="
