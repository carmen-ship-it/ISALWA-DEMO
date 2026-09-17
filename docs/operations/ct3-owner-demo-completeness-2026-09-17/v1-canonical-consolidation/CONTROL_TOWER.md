# V1 CANONICAL CONSOLIDATION — CONTROL TOWER

**Started:** 2026-09-17  
**Worktree tip:** `62cb866` (docs may advance; live staging still pin separately)  
**LIVE staging (pre-consolidation):** WEB+API `8e24b7f`  
**Baseline:** 2026-09-16T00:00:00-04:00  
**Authority:** Canonical V1 prompt (role map + resource visibility + cascades + View As + AI + visual addendum + since-yesterday evidence)

## Status bus

| Lane | Status | Notes |
|---|---|---|
| Freeze / commit ledger | **RUNNING→DONE** | 239 commits; `SINCE_YESTERDAY_COMMIT_LEDGER.md` |
| CR-GAP / CR-2 View As | **RUNNING** | explorer worker |
| CR-3/4 Ownership+Approval | **RUNNING** | explorer worker |
| CR-1/5/6 Tenant+Ops+AI | **RUNNING** | explorer worker |
| CR-7 Cliente360/Inicio/Map | PLANNED | after gap |
| CR-8 Audit+verifier | PLANNED | after gap |
| Visual hierarchy | PLANNED | after gap; reuse `@isalwa/ui` + tokens |
| Evidence package | IN PROGRESS | artifacts under `v1-canonical-consolidation/` |
| Ship/BV | BLOCKED until gaps closed | do not fake PASS |

## Locked REAL staff (workbook; INVENTED=0)

| Name | Cargo |
|---|---|
| YUSELKA JUSTINIANO DURAN | ASESOR DE VENTA |
| JOSE LUIS VARGAS ALMANZA | ASESOR DE VENTA |
| EDWIN YAMIL CALERO VALDEZ | JEFE COMERCIAL |
| ISABELA RODA GUTIEREZ | GERENTE GENERAL |
| ALVARO MARTIN SANDOVAL MONTES | GERENTE GENERAL |

Login/membership NOT auto-granted from Cargo.

## Non-negotiables in force

AUTH person → company → membership → capabilities → resource → projection → UI → AI  
View As narrows only; mutations off; no impersonation  
Approval ≠ Pedido; convert explicit  
No auto dept Work from Pedido alone  
AI filter before retrieval; UNAUTHORIZED = no existence leak  

## Collision boundaries (one writer)

| Boundary | Owner lane |
|---|---|
| `getServerOsAuthContext` / org cookie | CR-1 |
| View As / role-preview / mutation gate | CR-2 |
| coverage / reassign / convert.own | CR-3 |
| approval routing / escalate | CR-4 |
| progress strip / delivery facts | CR-5 |
| AI gateway | CR-6 |
| Cliente360 tabs / Inicio lenses | CR-7 |
| audit event types / verifier | CR-8 |
| tokens / next-action visual | Visual |

## Supersedes

Where prior CT3/OA receipts conflict with this prompt, mark SUPERSEDED in `SUPERSEDED_CLAIM_REGISTER.md` — do not delete history.
