#!/bin/bash
# Replit production server for ISALWA API (NestJS 11)
# No app code changes — only Replit-specific wiring.
set -e

REPO_ROOT="/home/runner/workspace/.migration-backup"
cd "$REPO_ROOT"

# NestJS reads API_PORT (falls back to 4000). Map Replit's PORT to it.
export API_PORT="$PORT"
export NODE_ENV="production"

exec node apps/api/dist/main.js
