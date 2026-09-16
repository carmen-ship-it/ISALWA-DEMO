#!/usr/bin/env bash
# Wave A close — governed manual staging deploy (Auto-Deploy OFF).
# Staging only. No migrations expected. Do not use for production.
set -euo pipefail
SHA="${1:-a97e17e156f58648beac4c0cd78d3245cc614e85}"
WEB_SVC=srv-dajddb67bikc73bl42q0
API_SVC=srv-dajd64gae00c739gpk20

echo "Deploying Wave A close candidate: $SHA"
echo "WEB=$WEB_SVC API=$API_SVC"

render deploys create "$WEB_SVC" --commit "$SHA" --wait --confirm -o json | tee /tmp/wave-a-close-web-live.json
render deploys create "$API_SVC" --commit "$SHA" --wait --confirm -o json | tee /tmp/wave-a-close-api-live.json

echo "Health:"
curl -sS -w '\nHTTP:%{http_code}\n' https://os-api-staging.onrender.com/v1/health
curl -sS -w '\nHTTP:%{http_code}\n' https://os-api-staging.onrender.com/v1/health/ready

echo "Live SHA check:"
render deploys list "$WEB_SVC" -o json --confirm | python3 -c "import json,sys; d=json.load(sys.stdin); live=[x for x in d if x.get('status')=='live'][0]; print('WEB', live['commit']['id'], live['id'])"
render deploys list "$API_SVC" -o json --confirm | python3 -c "import json,sys; d=json.load(sys.stdin); live=[x for x in d if x.get('status')=='live'][0]; print('API', live['commit']['id'], live['id'])"
