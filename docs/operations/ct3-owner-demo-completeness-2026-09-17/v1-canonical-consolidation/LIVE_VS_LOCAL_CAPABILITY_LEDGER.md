# LIVE vs LOCAL capability ledger

Frozen at control-tower reconciliation. Stages never collapse.

Legend CURRENT_STATUS: LOCAL_ONLY | COMMITTED | PUSHED | DEPLOYED | DATA_APPLIED | HOSTED_PROVEN | OWNER_ACCEPTANCE_PENDING | OWNER_ACCEPTED | SUPERSEDED | BLOCKED

| CAPABILITY | LOCAL_IMPLEMENTED | COMMITTED_SHA | PUSHED | WEB_DEPLOYED | API_DEPLOYED | DB_MIGRATED | SYNTH_SEEDED | HOSTED_DATA_VISIBLE | HOSTED_INTERACTION_PROVEN | NEGATIVE_SECURITY_PROVEN | OWNER_ACCEPTED | CURRENT_STATUS | EVIDENCE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Demo context switch | YES | 8e24b7f+ | YES | YES@8e24b7f | YES@8e24b7f | n/a | YES | PARTIAL | PARTIAL | PARTIAL | NO | DEPLOYED | OA-1 / demo cookie prefer |
| Carmen SYNTH membership | YES | 994a138+ | YES | YES@8e24b7f | YES@8e24b7f | n/a | YES | YES | PARTIAL | YES (scope script) | NO | DEPLOYED | membership apply receipt |
| Carmen business-evaluation capability set | YES | dirty→commit | NO* | NO | NO | n/a | YES | NO | NO | UNIT | NO | LOCAL_ONLY | staging-carmen-synth-demo-scopes.ts |
| admin-scope removal | YES | 994a138+ | YES | YES@8e24b7f | YES@8e24b7f | n/a | YES | YES | YES | YES | NO | DEPLOYED | forbidden scopes list |
| REAL/SYNTH isolation | YES | prior | YES | YES | YES | n/a | YES | YES | PARTIAL | PARTIAL | NO | DEPLOYED | company cookie + org ids |
| resource-level authorization | PARTIAL | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | PARTIAL | NO | DEPLOYED | commercial convert gate |
| role projections | PARTIAL | dirty | NO | NO | NO | n/a | YES | NO | NO | UNIT | NO | LOCAL_ONLY | evaluation-projection.ts |
| View As | PARTIAL | dirty | NO | NO | NO | n/a | YES | NO | NO | UNIT | NO | LOCAL_ONLY | menu+banner+cookie |
| View As mutation blocking | PARTIAL | dirty | NO | NO | NO | n/a | n/a | NO | NO | UNIT (commercial/work) | NO | LOCAL_ONLY | mutation-gate.ts |
| View As person-specific Asesor | PARTIAL | dirty | NO | NO | NO | n/a | YES | NO | NO | UNIT | NO | LOCAL_ONLY | asesor options + owner filter |
| client ownership | YES | prior | YES | YES | YES | n/a | YES | YES | PARTIAL | PARTIAL | NO | DEPLOYED | commercial account owner |
| temporary coverage | YES | prior | YES | YES | YES | n/a | PARTIAL | PARTIAL | PARTIAL | UNIT (≠convert) | NO | DEPLOYED | coverage grants |
| permanent reassignment | YES | prior | YES | YES | YES | n/a | PARTIAL | PARTIAL | PARTIAL | UNIT | NO | DEPLOYED | reassign scope |
| own-quote conversion | YES | dirty | NO | NO | NO | n/a | YES | NO | NO | UNIT+API test | NO | LOCAL_ONLY | convert.own in scopes + CreateOrder |
| cross-owner conversion blocking | YES | dirty | NO | NO | NO | n/a | n/a | NO | NO | UNIT+API test | NO | LOCAL_ONLY | coverage deny |
| approval routing | PARTIAL | prior | YES | YES@8e24b7f | YES | n/a | PARTIAL | PARTIAL | PARTIAL | PARTIAL | NO | DEPLOYED | OA approval |
| named approver | PARTIAL | prior | YES | YES | YES | n/a | PARTIAL | PARTIAL | PARTIAL | NO | NO | DEPLOYED | RequestApproval |
| Gerencia escalation | PARTIAL | prior | YES | YES | YES | n/a | PARTIAL | NO | NO | NO | NO | DEPLOYED | management.org.read |
| approval Work | PARTIAL | prior | YES | YES | YES | n/a | PARTIAL | PARTIAL | PARTIAL | NO | NO | DEPLOYED | work items |
| post-approval continuation | PARTIAL | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | post-approval-continue |
| Opportunity | YES | prior | YES | YES | YES | n/a | YES | YES | YES | PARTIAL | NO | DEPLOYED | list+detail |
| Quote | YES | prior | YES | YES | YES | n/a | YES | YES | YES | PARTIAL | NO | DEPLOYED | |
| Quote PDF | YES | prior | YES | YES | YES | n/a | YES | YES | YES | NO | NO | DEPLOYED | PF-4 |
| manual send evidence | YES | prior | YES | YES | YES | n/a | YES | YES | PARTIAL | NO | NO | DEPLOYED | |
| follow-up | YES | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| Quote acceptance | YES | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | via convert |
| Quote → Pedido | YES | prior+dirty | NO* | PARTIAL@8e24b7f | PARTIAL | n/a | YES | PARTIAL | PARTIAL | LOCAL tests | NO | LOCAL_ONLY | V1 gate not live |
| Pedido index | YES | prior | YES | YES | YES | n/a | YES | YES | PARTIAL | NO | NO | DEPLOYED | |
| Pedido Cliente360 projection | PARTIAL | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| Production review | PARTIAL | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| Warehouse review | PARTIAL | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| Purchasing review | PARTIAL | prior | YES | YES | YES | n/a | YES | PARTIAL | NO | NO | NO | DEPLOYED | |
| shared process progress | PARTIAL | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | progress strips |
| Delivery Note | YES | prior | YES | YES | YES | YES? | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| DN PDF | YES | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| Salida | PARTIAL | prior | YES | YES | YES | n/a | YES | PARTIAL | NO | NO | NO | DEPLOYED | |
| Entrega | PARTIAL | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| Mi Trabajo | YES | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| Who has the ball | PARTIAL | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| Issues | YES | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| Commitments | YES | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| durable Conversations | CODE YES | prior | YES | YES | YES | n/a | **NO** (JSON fixtures) | NO DB | PARTIAL UI | NO | NO | CODE_AHEAD_OF_DATA | DEMO_SEED_ACTUAL_STATE |
| conversation-derived suggestions | PARTIAL | prior | YES | YES | YES | n/a | fixtures | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| Cliente360 | YES | prior | YES | YES | YES | n/a | YES | YES | PARTIAL | NO | NO | DEPLOYED | |
| Inicio | YES | prior | YES | YES | YES | n/a | YES | YES | PARTIAL | NO | NO | DEPLOYED | |
| Search | PARTIAL | prior | YES | YES | YES | n/a | YES | PARTIAL | NO | NO | NO | DEPLOYED | View As filter missing |
| Map | PARTIAL | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| Gerencia | PARTIAL | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| Finance | PARTIAL | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| Documents | PARTIAL | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| History | PARTIAL | prior | YES | YES | YES | n/a | YES | PARTIAL | NO | NO | NO | DEPLOYED | |
| Audit | PARTIAL | prior | YES | YES | YES | n/a | YES | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| Story Mode | YES | prior | YES | YES | YES | n/a | YES | YES | PARTIAL | NO | NO | DEPLOYED | OA-5 |
| visual hierarchy | NO | — | NO | NO | NO | n/a | n/a | NO | NO | NO | NO | BLOCKED | wait same RC |
| semantic colors | PARTIAL | prior tokens | YES | YES | n/a | n/a | n/a | YES | NO | NO | NO | DEPLOYED | tokens.css |
| next-action component | PARTIAL | prior | YES | YES | n/a | n/a | n/a | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| responsibility component | PARTIAL | prior | YES | YES | n/a | n/a | n/a | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| progress stepper | PARTIAL | prior | YES | YES | n/a | n/a | n/a | PARTIAL | PARTIAL | NO | NO | DEPLOYED | |
| mobile | PARTIAL | prior | YES | YES | n/a | n/a | n/a | PARTIAL | NO | NO | NO | DEPLOYED | |
| Jarvis / AI entry | PARTIAL | prior | YES | YES | YES | n/a | n/a | PARTIAL | NO | NO | NO | BLOCKED | provider/hosted |
| AI provider/runtime | PARTIAL | prior | YES | YES | YES | n/a | n/a | NO | NO | NO | NO | BLOCKED | HOSTED_PROOF |
| AI resource authorization | PARTIAL | prior | YES | YES | YES | n/a | n/a | NO | NO | NO | NO | BLOCKED | |
| AI View-As narrowing | NO | — | NO | NO | NO | n/a | n/a | NO | NO | NO | NO | LOCAL_ONLY | planned with projection |
| AI mutation boundary | PARTIAL | prior | YES | YES | YES | n/a | n/a | NO | NO | NO | NO | BLOCKED | |

\* After this integration commit is pushed, update PUSHED column; do not deploy until RC cut.

## View As acceptance (not complete)

| Preview | CODE_READY | HOSTED | DATA_NARROWING_PROVEN | DIRECT_URL_PROVEN | SEARCH_NARROWING_PROVEN | MUTATION_BLOCK_PROVEN | AI_NARROWING_PROVEN_IF_READY |
|---|---|---|---|---|---|---|---|
| Asesor | PARTIAL | NO | NO | NO | NO | UNIT only | N/A |
| Jefe Comercial | PARTIAL | NO | NO | NO | NO | UNIT only | N/A |
| Gerencia | PARTIAL | NO | NO | NO | NO | UNIT only | N/A |
| Producción | PARTIAL (nav) | NO | NO | NO | NO | UNIT only | N/A |
| Almacén | PARTIAL (nav) | NO | NO | NO | NO | UNIT only | N/A |
| Compras | PARTIAL (nav) | NO | NO | NO | NO | UNIT only | N/A |
| Coordinación | PARTIAL (nav) | NO | NO | NO | NO | UNIT only | N/A |
| Finanzas | PARTIAL (nav) | NO | NO | NO | NO | UNIT only | N/A |
