#!/usr/bin/env bash
# Wave B push + staging deploy — authorized in Wave B one-pass prompt.
set -euo pipefail
cd /Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate
git push -u origin HEAD
FINAL=$(git rev-parse HEAD)
echo "FINAL_RUNTIME_SHA=$FINAL"
# Staging services only (os-web-staging / os-api-staging)
render deploys create srv-dajddb67bikc73bl42q0 --commit="$FINAL" --confirm -o json > /tmp/wb-web-deploy.json
render deploys create srv-dajd64gae00c739gpk20 --commit="$FINAL" --confirm -o json > /tmp/wb-api-deploy.json
python3 - <<'PY'
import json
from pathlib import Path
for name in ('web','api'):
  raw=Path(f'/tmp/wb-{name}-deploy.json').read_text().strip()
  # render may emit non-json preamble; find first {
  i=raw.find('{')
  d=json.loads(raw[i:] if i>=0 else raw)
  print(name, d.get('id'), d.get('status'), (d.get('commit') or {}).get('id') or d.get('commit'))
PY
