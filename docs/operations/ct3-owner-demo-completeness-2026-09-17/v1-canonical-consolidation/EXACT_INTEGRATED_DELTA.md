# Exact integrated delta (committed tip → live)

**BASE_SHA (live):** `8e24b7f73971cb538377371d4670897930bcd250`  
**CURRENT_TIP_SHA (remote=local committed):** `5032e6c017de10514212487662f25191bc6ac0dd`

| SHA | LANE | PURPOSE | FILES | DEPENDENCY | TESTS | INTEGRATED |
|---|---|---|---|---|---|---|
| `a225dfa` | evidence | Carmen owner BV PASS after SYNTH scope correction | docs/ops receipts | membership apply | hosted BV recorded | YES (docs) |
| `62cb866` | seed | refresh owner-demo seededAt after SYNTH reseed | seeded-ids.json | staging reseed | n/a | YES |
| `5032e6c` | CR-2 | allow Vista de evaluación with management.org.read | role-preview access | Carmen SYNTH scopes | unit | YES |

**Uncommitted (this train, pending commit):** CR-2 View As projection/mutation + CR-3 convert.own + release-train ledgers — see `EXACT_LOCAL_DELTA.md`.

**Subagent workers:** gap receipts under `workers/` (CR7 etc.); implementation ownership remains control-tower for shared auth/projection boundaries.
