#!/usr/bin/env bash
# CT2 final pre-deploy — same-SHA staging deploy (os-web-staging / os-api-staging).
# Mirrors scripts/wave-b-push-deploy.sh operator path. Staging only. No migrations.
set -euo pipefail
cd /Users/carmen/projects/isalwa/.worktrees/ct2-exec-ux-intel
SHA="${1:-$(git rev-parse HEAD)}"
WEB_SVC=srv-dajddb67bikc73bl42q0
API_SVC=srv-dajd64gae00c739gpk20

echo "FINAL_CT2_SOURCE_SHA=$SHA"
echo "WEB=$WEB_SVC API=$API_SVC"

render deploys create "$WEB_SVC" --commit="$SHA" --confirm -o json > /tmp/ct2-final-web-deploy.json
render deploys create "$API_SVC" --commit="$SHA" --confirm -o json > /tmp/ct2-final-api-deploy.json

python3 - <<'PY'
import json
from pathlib import Path
for name in ('web', 'api'):
    raw = Path(f'/tmp/ct2-final-{name}-deploy.json').read_text().strip()
    i = raw.find('{')
    d = json.loads(raw[i:] if i >= 0 else raw)
    commit = d.get('commit') or {}
    cid = commit.get('id') if isinstance(commit, dict) else commit
    print(name, d.get('id'), d.get('status'), cid)
PY
