# ISALWA — MASTER HANDOFF FOR NEW ENGINEERING AGENT
**Owner:** Carmen  
**Purpose:** Continue ISALWA safely from Architect discovery through the latest known OS engineering state.  
**Current handoff date:** 2026-10-16

## 1. Operating rule

Carmen is the product owner and engineering orchestrator. Do not ask her to rediscover decisions that are already known. Do not tell another coding agent to “figure out the product.”

For each implementation task, define:
- exact screen/current state
- what stays / changes / disappears
- exact CTA text/status
- real route/mutation/data source
- authoritative post-success state
- where the outcome reappears/returns
- permissions/security
- retry/double-click/idempotency where relevant
- refresh/reopen/Back behavior
- loading/error/empty/disabled states
- mobile/volume behavior
- exact non-goals
- tests + hosted proof
- final receipt ending `CARMEN HANDOFF — WHAT I NEED TO KNOW`

Evidence ladder:
PLANNED → IMPLEMENTED → TESTED → INTEGRATED → PUSHED → DEPLOYED → HOSTED → BROWSER-VERIFIED → USER-ACCEPTED.

Cursor/agent PASS is evidence, not Carmen acceptance.

One active writer per overlapping area. Read-only reviewers may run in parallel. Never merge/reset/clean/stash protected WIP blindly.

## 2. Architect → OS history

ISALWA originally had two distinct products.

### Architect
Architect was the discovery / consulting-intelligence app used with Álvaro / Isa to collect interviews, business facts, process answers, pain points, roles, documents, and evidence.

Canonical workspace:
`ws_isalwa`

Architect was persisted in Supabase and historically used:
- `architect_workspaces`
- Supabase Storage for uploads
- client/consultant auth + RLS

Important Architect capabilities:
- CompanyWorkspace
- Business Blueprint
- Company Model
- process/SOP generation
- Solution Architecture + roadmap
- living deliverables
- implementation package
- roadmap UI
- document upload
- auth/RLS
- Google Drive import
- deterministic evidence-backed engines

Important historical code/docs:
- `apps/architect/types/workspace.ts`
- `lib/blueprint/`
- `types/blueprint.ts`
- `lib/company-model/`
- `types/company-model.ts`
- `lib/processes/`
- `lib/deliverables/living/`
- `types/implementation-package.ts`
- `lib/implementation-package/`
- `lib/documents/upload.ts`
- `lib/auth/`
- `components/workspace/roadmap-timeline.tsx`
- `living-deliverables-center.tsx`
- `deliverables-panel.tsx`
- `docs/ai/01_ARCHITECT_CONTEXT.md`
- `docs/ai/02_ARCHITECT_CONSTITUTION.md`
- `docs/ai/03_ARCHITECT_ARCHITECTURE.md`
- `docs/ai/04_ARCHITECT_RECEIPT.md`
- `docs/ai/05_MISSION_TEMPLATE.md`

Architect product law:
- never invent evidence
- compose existing engines; do not fork parallel models
- do not fake readiness/confidence
- claims must trace to interview/document/transcript or deterministic derivation

Architect is the business-requirements source. ISALWA OS Postgres is the operational source after approved import/runtime mutation.

Historical Architect→OS bridge status:
- no automatic bridge existed
- `isalwa_configuration` was planned, not built
- consumption was manual
- recommended traceability:
  Architect evidence → implementation requirement → OS feature → entity → API → UI → security → test

When Architect answers are needed, first inspect `ws_isalwa` Supabase / Architect source before guessing. The exact current Vercel project must be re-verified; do not invent its URL.

## 3. Repo and local locations

Git origin:
`git@github.com:carmen-ship-it/ISALWA-DEMO.git`

GitHub:
`carmen-ship-it/ISALWA-DEMO`

Primary local workspace:
`/Users/carmen/projects/isalwa`

Important worktrees:

### owner/demo
`/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo`

Historical active branch:
`ct3/task-11c-operations-scale`

### final-core remote snapshot
`origin/ct3/final-core-v1-hosted-journey`
known at:
`52a9f9e90014ea81c92f949f171bcaac9f0efca0`

### October repair integration
`/Users/carmen/projects/isalwa-wt-v1-repairs`

branch:
`ct3/v1-repairs`

latest known immutable repair checkpoint:
`32810573b2dab46ea0b5bae2773d4f06340601be`

At the 2026-10-01 receipt this repair branch was:
- clean
- no upstream
- 27 commits local-only
- not pushed
- not deployed

Preserved repair lanes:
- `isalwa-wt-v1-delivery-integrity`
- `isalwa-wt-v1-read-authorization`

Other historical worktrees that may hold unique evidence:
- `.worktrees/ct2-exec-ux-intel`
- `.worktrees/wave2-candidate-unified`
- `.worktrees/wave2-remediation-integrate`
- `/Users/carmen/projects/isalwa-wt-operating-day`
- `/Users/carmen/projects/isalwa-wt-ops-integrate`

Do not mass-delete worktrees. Historical inventory found many local-only SHAs / dirty evidence trees.

## 4. Staging environment

Render:
- web: `os-web-staging`
- API: `os-api-staging`

Known service IDs:
- web `srv-dajddb67bikc73bl42q0`
- API `srv-dajd64gae00c739gpk20`

Staging DB:
- `isalwa-os-staging`
- Postgres 16
- historically `dpg-dajd3kh5efls738falcg-a`

Auth:
- Supabase Auth
- staging runtime known with `authMode=supabase`
- `devBootstrapEnabled=false`

Protected local secret/config areas:
- `/Users/carmen/.isalwa-secrets`
- `/Users/carmen/projects/isalwa/.env`
- `/Users/carmen/projects/isalwa/.temp-demo-secrets`
- `~/.supabase`
- `~/.render`
- `~/.ssh`

Never print secret values.

## 5. Tenant/data rules

SYNTH / Demo org:
`01M2JKF77TXMJNDTKNCYNHH9G5`

REAL org:
`01M2DV9F0V5DXS4G89AKF4D5SR`

Never mix Real and Demo fixtures.

Protected REAL seven:
- COMERCIAL ALVAREZ
- ASTRIX
- GARCIA
- MICRISTAL
- TORREZ
- VAINSA
- IMPORTAMEC

Do not mutate these for QA/polish.

Demo must be clearly labeled:
`DEMO · DATOS FICTICIOS`

## 6. Product constitution

Spanish-first Bolivia.
Few clicks.
Obvious next action.

Commercial spine:
Cliente → Oportunidad → Cotización → Pedido

No separate Sale entity.
Pedido is the canonical post-quote root.

Unified Party identity.

Finance:
- official/fiscal ledger external
- OS holds operational/manual facts only
- never fake revenue/ledger truth

AI/Jarvis:
- not “live” without exact hosted proof
- hidden/disabled acceptable
- no AI mutation

Cargo/job title is not permission authority.
`people.admin` is never a manager shortcut.

Cliente 360 tabs exactly:
- Resumen
- Comercial
- Operación
- Trabajo
- Documentos
- Historial

View As:
- Carmen remains authenticated
- projection narrows
- mutations disabled
- no bypass

Global search:
- obeys View As/context
- mutation suppressed in View As

Human responsibility:
- name + Cargo when known
- else role/team
- never raw IDs

## 7. Commercial rules

- Advisors register customers.
- One canonical commercial owner.
- Temporary coverage is explicit grant/revoke.
- Helper does not become owner.
- Coverage does not imply convert authority.
- Permanent reassignment by Jefe/Gerente with history preserved.
- Advisors may convert own eligible quotes.
- Special discount/outside-list exception → Jefe; Jefe may Escalar a Gerencia.
- Approval never creates Pedido.
- Conversion is explicit.
- Manual WhatsApp/email = human sends externally, then records as sent.
- Live WhatsApp is FUTURE.
- Follow-up is human scheduled only.
- Saved Quote Line = frozen truth downstream.
- Quoted quantity is context only, never stock/produced/purchased/dispatched/delivered.
- Real mode must not prefill demo pricing.
- No approved authoritative real ISALWA price list was established.

## 8. Post-sale / ops rules

Pedido does not auto-create department Work.
Human `Solicitar revisión` creates Work.

Nota:
- explicit
- Nota ≠ Salida
- Nota ≠ Entrega
- no invented fiscal/sequential Nota number
- hide raw `NE-PILOT-{ULID}` from normal UI/PDF

Salida:
- can exist without Nota
- means goods left warehouse
- not Entrega

Entrega:
- requires existing Salida
- requires `Recibido por`

Compras:
- OC authoring FUTURE
- V1 is review/attention only
- never show fake Crear OC

Warehouse:
- ingreso PT is not stock
- no fake inventory/availability/fulfillment

Production:
- operational update only
- quoted qty remains context

Nothing Disappears:
preserve history across corrections, termination, reassignment, merge, roles, operational events.

## 9. UX / visual system

Palette:
- navy `#18324B`
- teal `#287A78`
- soft teal `#E2F0ED`
- sky `#DDEEF6`
- green `#E7F4EC`
- amber `#FFF5DB` / `#F6E3A6`
- red `#FBE9E7`
- porcelain `#F6F1E8`
- white

Visual hierarchy:
- primary business action = filled navy
- operational positive = teal
- pending/attention = amber
- complete = green
- information = sky/soft teal
- blocker/error/destructive = red
- secondary = outline
- tertiary = text

UX order:
identity → status → next action → context → explanation/history

Mobile ~390px:
- no whole-page horizontal scroll
- no hidden primary action
- stacked scan rows for complex lists

Growable lists:
- ~25/page
- search/filter
- Anterior/Siguiente
- URL state
- Back preserves state
- no giant unbounded DOM
- table-container scroll only if genuinely necessary

## 10. Major September implementation history

Task 2 shell/navigation:
`edd473468e6b48da043f5e6e62daf108d59f8b0e`

Task 3 semantic status:
`ca62ecb8574fd6426f36f88468caea8fbabc7ad1`

Task 4 list/actions scale:
`d8b8666cfeb64aeb21d76224e322acf594d8ab37`

Task 5 sticky header:
`0d06c03b21da3733a19705fb3df779a5e8883065`

Task 6 Cliente 360:
`dc91da8ec95b9644eac65e15fe661bc48c04eb55`

Task 7 Entregas:
- restructure `9e9ab68...`
- corrective `081158278c13d7da7813150a9f0bb6220aeea99f`

Task 8 Quote Builder:
- `8da4a61...`
- visual `7bbfaad...`
- post-send `f094e88247b7ac83d948c7c13b7d7d00bc6137d7`

Task 9 ops:
`db8e20e9d4996a4ed1d18289eab5eca1380a7c3c`

Task 10 search:
`59685f11...`
Inicio corrective:
`d6e012a57ba0c360cf64d3ef4c22c4c2af74a5bc`

Task 10A latency:
`166fee902e7736f3fde63616a20ea1bd06267115`

Task 11A:
`fb44cda3a40366b1069ffc4dc9a8cbac5e9cf65b`

Task 11B:
`234ef3f01d8119aa49bfbf88ec5e1d48a5322e56`

Task 11C:
`b84a385b70087e737eed255d3017c709bb5dd368`

11B journal residual:
`5d959acc33ac63add448c3f5a4b61ba2bc23bc2e`

Integrated 11B/11C target at that point:
`a01ddfaad6fd33712803aae8c3287dcc35e0f865`

Visual ops hierarchy:
`f757130104c45860fb6a6e063dea37b4ca1ab05b`

Product-wide visual completion:
`89ea32334dca1eb077b38296a24e6a4b13980949`

Table/list scanability:
`13f02b4`

Color/depth/data-surface:
`2167084`

11D bounds:
`bb57a00`
with local-only follow-up at that moment:
`d4c4ed1`

11D bounded:
- locations
- contacts
- document assembly

## 11. Journey fixtures from seed snapshot

IMPORTANT:
These came from the 2026-09-17 seed catalog, not a live DB query. Re-verify before mutation.

Commercial:
- DEMO CONSTRUCTORA ANDINA
- party `01M2PMDY71EDWHJG3AFK36TDZ2`
- opportunity `DEMO ANDINA — obra nueva`
- opportunity id `01M2PRQZ90J8R9M9363C2A6N3Y`
- quote Q-000006
- quote id `01M2PRR24KVC8EXSNWT5MVQPT6`
- snapshot state: draft, unsent, unconverted

Intended path:
Presentar → registrar envío manual → seguimiento → convertir a Pedido

Operations:
- DEMO FERRETERÍA NORTE
- party `01M2PMFXKD9VTWB21SQX0VEDJY`
- order id `01M2PMGHWHT6WF044JDV4HEZVT`
- snapshot: no Nota, no Salida, no Entrega

Completed evidence, view-only:
- DEMO MADERAS ORIENTE
- quote PDF Q-000002
- delivery note reference `NE-DEMO-MADERAS`

Negative delivery fixture:
- DEMO HOTEL CENTRAL order
`01M2PMFQHJC5T6THD44N9SGPKB`
- had Nota + FG, no Salida/Entrega
- preserve if still needed to prove Entrega blocked without Salida

View As personas:
- asesor
- jefe-comercial
- gerencia
- produccion
- almacen
- compras
- entregas
- finanzas

No named human/Cargo fixtures were proven.
Do not infer permissions from Cargo.

## 12. Later September / latest known hosted runtime before October repair

By 2026-10-01, known hosted runtime had moved beyond the earlier visual SHAs.

Live web:
`93a9ca1facfe659562d1f2701e248aaf8775aadf`

Live API:
`52a9f9e90014ea81c92f949f171bcaac9f0efca0`

Known on 2026-10-01:
- both Render services tracked `main`
- autoDeploy off
- web SHA was ancestor of API SHA
- backend-only delta was considered compatible
- `origin/main` did NOT contain the final-core branch lineage

Never deploy “latest main” blindly.
Deploy exact SHA and verify `commit.id`.

## 13. October 1 independent review / repair wave

Review base:
`52a9f9e90014ea81c92f949f171bcaac9f0efca0`

Repair integration:
`/Users/carmen/projects/isalwa-wt-v1-repairs`
branch `ct3/v1-repairs`

Shared base:
`1de4cda2bd744c863455fc2c30c46f699e7db30a`

Agent A:
`8384dc9`
delivery integrity

Agent B:
`96c7bbd`
read authorization

Merge A:
`d5bd1ce`

Merge B:
`1236d47`

Integration-only repair:
`bf1f4ed`

Read-route classification:
`42874be`

Immutable checkpoint:
`32810573b2dab46ea0b5bae2773d4f06340601be`

At Oct 1:
- 27 commits above review base
- local-only
- no upstream
- not pushed
- not deployed
- not production-ready

Repair artifact locations:
- `docs/reviews/V1_REPAIR_LEDGER.md`
- `docs/adr/0003-v1-delivery-quantities-and-commercial-approvals.md`
- `20-cursor-integrated-candidate-for-review.md`
- `21-handoff-receipt-part1-identity-and-ledger.md`
- `21-handoff-receipt-part2-implementation-and-validation.md`
- `21-handoff-receipt-part3-deployment-and-backlog.md`
- `/Users/carmen/projects/isalwa-review-evidence/independent-v1-review-20261001T025616Z/`

Important commit sequence over `52a9f9e`:
`a45199f` → `0eebd1e` → `e7c0626` → `1de4cda` → `1c005e5` → `2affa01` → `5efed5a` → `6efbf3e` → `7773dc8` → `a8c8405` → `19e4ba1` → `491f221` → `3b7d902` → `d5bd1ce` → `1236d47` → `bf1f4ed` → `42874be` → `3281057`

## 14. Open October repair blockers

A1:
two independent delivery ledger caps could allow note 10 + unlinked exit 10 on a line of 10.
Needs one accounting model.

S20:
customer conversation list could expose every tenant conversation/pasted evidence.

S21:
opportunity/quote/order links not fully access-validated.

D3.1:
delivery event sink deliberately unwired because first event could erase derived history.

D5.1:
receipt quantity boundary unbound / decision open.

D5.2:
no order-revision command.

P1:
Compras boundary wording/product decision open.

Ten read routes lacked negative HTTP authorization proof:
1. `GET /ai/capability`
2. `GET /customer-conversations`
3. `GET /parties/:partyId/contacts`
4. `GET /delivery-notes`
5. `GET /delivery-notes/:id/pdf`
6. `GET /delivery-ops/orders`
7. `GET /delivery-ops/orders/:orderId`
8. `GET /delivery-ops/orders/:orderId/documents`
9. `GET /fulfillment/deliveries`
10. `GET /fulfillment/warehouse-exits`

Do not call these secure until proven.

The repair receipt also warned:
- 27 test files were DB-gated
- no HTTP proof existed for the repair checkpoint
- two tenant-isolation tests were cancelled, not passed
- authenticated hosted review was incomplete
- DB lock/rollback/unique-violation behavior lacked DB proof

## 15. Live vs candidate

Latest known live as of 2026-10-01:
- web `93a9ca1facfe659562d1f2701e248aaf8775aadf`
- API `52a9f9e90014ea81c92f949f171bcaac9f0efca0`

Latest known repair candidate:
- `32810573b2dab46ea0b5bae2773d4f06340601be`
- local-only
- unpushed
- undeployed
- blocked

Do not confuse them.

There may be newer work after Oct 1. Verify current git + Render before any claim.

## 16. Protected WIP

Owner-demo historically had protected WIP not belonging to 11D:
- `apps/os-web/app/(app)/administracion/page.tsx`
- `apps/os-web/app/(app)/auditoria/page.tsx`
- `apps/os-web/lib/audit/auditoria-page.test.ts`
- `apps/os-web/app/(app)/mapa/page.tsx`
- `apps/os-web/components/map/map-layer-controls.tsx`
- `apps/os-web/lib/map/build-view-model.ts`
- `apps/os-web/lib/a11y/a11y.test.ts`
- `apps/os-web/lib/commercial/party-resolver.ts`
- `apps/os-web/lib/purchasing/load-linked-orders.ts`
- `apps/os-web/lib/warehouse/load-pedidos.ts`
- `apps/os-web/styles/module-accents.css`

Do not stage/reset these wholesale.

Main checkout also had large historical Architect/docs/scripts WIP.
Do not clean it globally.

## 17. Map

Map was deferred.

Do not merge old map branch wholesale.

Requirements:
- bounded scoped backend projection
- tenant/role/View As/data-mode enforcement
- authoritative IDs
- no fake coordinates
- no fake revenue
- no fake stock
- viewport/cursor bounds
- clustering if needed
- bounded side list
- future layers hidden

Map is not required for the core commercial→operations journey.

## 18. Final core journey contract

Cliente
→ Oportunidad
→ Cotización
→ Presentar
→ Registrar envío manual
→ Seguimiento
→ Convertir a Pedido
→ department review/request
→ Producción
→ Almacén
→ Compras if applicable
→ Salida
→ Entrega
→ History / reopen / Back / refresh

Also verify:
- role/View As
- negative auth/deep links
- quote PDF
- Nota PDF
- mobile
- scale
- no fake totals
- no raw IDs
- duplicate/retry safety
- no Demo/Real crossover

Do not assume the whole journey was user-accepted. Look for an actual hosted journey receipt.

## 19. What was user-accepted historically

User-accepted:
- Quote Builder path
- Task 9 ops checks including Back and Almacén picker/ingreso
- Task 10A search performance subjectively accepted

Not fully owner-accepted:
- broad visual hierarchy
- all scale/bounds surfaces
- 11D bounds
- role/security matrix
- whole-product journey
- October repair checkpoint

## 20. Existing final-doc bundle

Historical docs:
- `ISALWA_Bienvenidos_V1_FINAL.docx/.pdf`
- `ISALWA_Empieza_Por_Aqui_V1_FINAL.docx/.pdf`
- `ISALWA_Operacion_Costos_Seguridad_V1_FINAL.docx/.pdf`
- `ISALWA_Technical_Handoff_V1_FINAL.docx/.pdf`

These predate later September/October engineering.
Do not treat them as current runtime truth.

## 21. First thing the new agent must do

READ-ONLY.

Verify:
1. repo origin
2. relevant worktrees
3. current branch + HEAD + status for:
   - `/Users/carmen/projects/isalwa`
   - `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo`
   - `/Users/carmen/projects/isalwa-wt-v1-repairs`
4. remote branch tips:
   - `origin/ct3/final-core-v1-hosted-journey`
   - `origin/main`
5. whether `32810573...` still exists and whether it was ever pushed after Oct 1
6. Render exact current live web/API SHAs
7. any deploy after Oct 1
8. DB/service health
9. any newer review/journey receipt
10. Architect Vercel + Supabase `ws_isalwa` access
11. exact source of Isa/Álvaro interview responses
12. protected dirty WIP before staging anything

Do not reset/clean/rebase/merge/deploy during discovery.

## 22. Recommended priority after verification

1. establish exact current reality
2. find post-Oct-1 work/receipts
3. continue from latest safe descendant, not by amending the immutable checkpoint
4. close critical blockers first:
   - A1
   - S20
   - S21
   - D3.1
   - DB-backed tenant/isolation tests
   - read-route authorization proof
5. independent review
6. exact SHA deploy
7. signed-in hosted proof
8. core journey
9. Map/HOLD surfaces
10. final docs

## 23. Do not do these things

- do not deploy latest main casually
- do not rerun seeds against staging without explicit authorization
- do not infer role from Cargo
- do not expose secrets
- do not mutate protected REAL fixtures
- do not destroy worktrees
- do not treat screenshots as sufficient proof
- do not treat unit tests as hosted proof
- do not claim PASS from source alone
- do not reopen accepted product decisions unless a genuine contradiction is found

## 24. Short executive state

Architect `ws_isalwa` is the canonical business-requirements source.
OS repo is `carmen-ship-it/ISALWA-DEMO`.

The product was heavily built/hardened through September: commercial loop, operations, Cliente 360, delivery semantics, search, visual hierarchy, bounded lists, and scale work.

By Sep 22 / Oct 1 the latest known hosted runtime was:
- web `93a9ca1`
- API `52a9f9e`

On Oct 1 an independent review found serious authorization/data-integrity gaps.
A 27-commit local repair candidate at `32810573` addressed many issues but remained blocked, unpushed, and undeployed.

The next agent must verify whether anything newer exists, then continue safely from the latest proven source without erasing protected WIP or confusing local candidate state with live staging.
