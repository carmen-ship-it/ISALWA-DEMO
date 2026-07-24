#!/usr/bin/env bash
# Run ISALWA OS preview on Carmen Cursor XL (API + Web)
set -euo pipefail
cd /home/ubuntu/projects/isalwa

# Load secrets without clobbering build-time NODE_ENV
set -a
# shellcheck disable=SC1091
source <(grep -v '^#' .env | grep -v '^NODE_ENV=' || true)
set +a
export NODE_ENV=production
export ALLOW_MOCK_PROVIDERS="${ALLOW_MOCK_PROVIDERS:-1}"
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://127.0.0.1:4000}"
export PORT_WEB="${PORT_WEB:-3010}"
export PORT_API="${PORT_API:-4000}"

pnpm --filter @isalwa/contracts build
pnpm --filter @isalwa/domain build
pnpm --filter @isalwa/ts-utils build
pnpm --filter @isalwa/providers build
pnpm --filter @isalwa/ui build
pnpm --filter @isalwa/database prisma:generate
pnpm --filter @isalwa/database build
pnpm --filter @isalwa/api build
pnpm --filter @isalwa/web build

mkdir -p /home/ubuntu/projects/isalwa/.preview-logs
pkill -f "node dist/main.js" 2>/dev/null || true
pkill -f "next start --port ${PORT_WEB}" 2>/dev/null || true

(
  export NODE_ENV=production
  export PORT="${PORT_API}"
  nohup pnpm --filter @isalwa/api start > .preview-logs/api.log 2>&1 &
  echo $! > .preview-logs/api.pid
)
sleep 2
(
  export NODE_ENV=production
  nohup pnpm --filter @isalwa/web exec next start --port "${PORT_WEB}" > .preview-logs/web.log 2>&1 &
  echo $! > .preview-logs/web.pid
)

echo "API:  http://127.0.0.1:${PORT_API}/v1/health"
echo "WEB:  http://127.0.0.1:${PORT_WEB}/pulso"
echo "Tunnel from laptop: ssh -L 3010:127.0.0.1:${PORT_WEB} -L 4000:127.0.0.1:${PORT_API} carmen-aws-dev"
