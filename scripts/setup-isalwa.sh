#!/bin/bash
# Replit one-time setup for the original ISALWA monorepo.
# Installs deps, builds shared packages in dependency order, runs Prisma migrations.
# No app code is modified.
set -e

REPO_ROOT="/home/runner/workspace/.migration-backup"
cd "$REPO_ROOT"

echo "=== [1/4] Installing dependencies ==="
COREPACK_ENABLE_STRICT=0 pnpm install --no-frozen-lockfile

echo "=== [2/4] Building shared packages ==="
# Build in dependency order
pnpm --filter @isalwa/domain    run build
pnpm --filter @isalwa/ts-utils  run build
pnpm --filter @isalwa/flags     run build
pnpm --filter @isalwa/providers run build
pnpm --filter @isalwa/contracts run build
pnpm --filter @isalwa/ui        run build

# Database package: generates Prisma client + compiles TS
pnpm --filter @isalwa/database  run build

echo "=== [3/4] Running Prisma migrations ==="
pnpm --filter @isalwa/database run migrate:deploy

echo "=== [4/4] Seeding demo data ==="
pnpm --filter @isalwa/database run seed:demo || echo "Seed skipped (may already exist)"

echo "=== Setup complete ==="
