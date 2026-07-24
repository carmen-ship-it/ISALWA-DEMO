#!/bin/bash
# Replit production build for ISALWA web (Next.js 15)
# No app code changes — only Replit-specific wiring.
set -e

REPO_ROOT="/home/runner/workspace/.migration-backup"
cd "$REPO_ROOT"

echo "=== Building shared packages ==="
pnpm --filter @isalwa/domain    run build
pnpm --filter @isalwa/ts-utils  run build
pnpm --filter @isalwa/flags     run build
pnpm --filter @isalwa/providers run build
pnpm --filter @isalwa/contracts run build
pnpm --filter @isalwa/ui        run build
pnpm --filter @isalwa/database  run build

echo "=== Building Next.js ==="
# NEXT_PUBLIC_API_URL is baked in at build time for CSR bundles.
# /v1 routes through the Replit proxy to NestJS (globalPrefix = v1).
# Build with empty API URL so CSR bundle uses relative /v1/* paths (works in browser via proxy).
# SSR at runtime reads NEXT_PUBLIC_API_URL from process.env (set in run-web-prod.sh).
NEXT_PUBLIC_API_URL= pnpm --filter @isalwa/web exec next build

echo "=== Build complete ==="
