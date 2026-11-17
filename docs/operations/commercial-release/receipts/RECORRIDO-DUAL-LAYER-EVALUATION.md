# Receipt — Recorrido dual-layer (evaluation product correction)

Date: 2026-11-17  
Scope: Recorrido guiado shows the complete designed commercial system (20 steps), not only shipped features.  
Integrator: `/Users/carmen/projects/isalwa-wt-v1-repairs` · branch `ct3/v1-repairs`.

## Gate language (authoritative)

| Gate | Status |
| --- | --- |
| Recorrido dual-layer content | **IMPLEMENTED LOCALLY** (this correction) |
| Hosted evaluation | **NOT HOSTED** |
| Live Journey verified (browser, both seats) | **NOT LIVE JOURNEY VERIFIED** |
| Isa / Álvaro invites | **NOT STARTED** |

“Disponible para probar” in Recorrido copy means the stage is genuine local product surface for the evaluation narrative. It is **not** proof that a hosted evaluation is live.

## Phase 0 — Source identity (repository authoritative)

| Ref | Value |
| --- | --- |
| Branch | `ct3/v1-repairs` |
| Starting HEAD (before this commit) | `bbb156481cebc951a69e5d3084c93f379cec4d8f` |
| Starting tree | `7260478c956f73cb2cf4f19067491f52c0af0092` |
| Product candidate ancestor | `7ddf258bab696e3fa3a0767d9205a03f42a46af5` (ancestor of HEAD; evaluation docs after it) |
| Recorrido commit | `072d2428e62bda65b178e4b365e93d0b86afe7c4` |
| Recorrido tree | `35c1de4478a0f421a66f2a4a64c0a90c610ef406` |

Reconciliation: earlier reports citing only `7ddf258b` referred to the product candidate pin. Actual worktree HEAD for this freeze was `bbb15648` (docs after 5B). Recorrido dual-layer lived only in the working tree until the bounded commit below.

### Intended dirty set for this correction

| Path | Role |
| --- | --- |
| `apps/os-web/lib/journey/story-steps.ts` | Exact 20-step copy |
| `apps/os-web/components/journey/owner-story-mode.tsx` | Dual-layer UI |
| `apps/os-web/lib/journey/story-steps.test.ts` | Contract tests |
| `apps/os-web/components/walkthrough/walkthrough-help-panel.tsx` | Naming |
| `docs/operations/commercial-release/EVALUACION_ISA_ALVARO_DECISIONES_Y_FEEDBACK.md` | Feedback worksheet |
| `docs/operations/commercial-release/receipts/RECORRIDO-DUAL-LAYER-EVALUATION.md` | This receipt |
| `docs/operations/commercial-release/COMMERCIAL_JOURNEY_READINESS.md` | Readiness note |

Preserved mechanics: `journey-provider.tsx`, `ver-ejemplo-completo-button.tsx`.

### Left unstaged (unrelated)

- `.cursor/settings.json`
- `.tmp/`
- `apps/os-api/.tmp-stage-a/`

## Intent

Isa and Álvaro evaluate the intended ISALWA commercial system. Recorrido must show:

1. **Lo que puedes probar ahora** — only genuine working CTAs.
2. **Así funcionará esta etapa** — non-editable proposal (always visible), with exact notice.

No second tour, demo mode, fake payments, fake WhatsApp, or org/data-mode switching.

## Living contract (every later batch)

1. Compare completed behavior to the relevant Journey step.
2. Update current-state text, status, CTA and limitation.
3. Preserve proposal text unless business design changed.
4. Resolved decisions → replace decision block + record authority here / worksheet.
5. Hosted + verified → `Disponible para probar`.
6. Local-only → keep proposal or partial.
7. Add Journey change to batch receipt and release notes.
8. Browser-test the changed step with the right role.
9. Never auto-change an already-deployed evaluation Journey when main advances.

## Reported conflict (do not silently “upgrade” eval copy)

Local Batches 3–7 / 8 implement quotes, approvals, payments, commitments and map surfaces in this worktree.  
**Evaluation Recorrido copy** still marks steps 9–17 and 19 as proposal / decision / external “not enabled in this evaluation,” with no working CTA.

That is intentional until those surfaces are **independently hosted and browser-verified**.

## Feedback worksheet

`docs/operations/commercial-release/EVALUACION_ISA_ALVARO_DECISIONES_Y_FEEDBACK.md` — documentation only; never auto-applies config.

## Evaluator visibility (Phase 3)

Current `canOpenJourney` = `canUseRolePreview(grantedScopes)` → requires `people.admin` or `management.org.read`.  
Intended evaluation rule (runtime evaluation + active member of dedicated evaluation org, any ordinary commercial role) is **not implemented** here: no server-derived evaluation-org membership signal without broader auth/membership contract work. See final report.

## Test evidence (Phase 2)

| Check | Result |
| --- | --- |
| Journey contract (`story-steps.test.ts`) | **8/8 pass** |
| Journey provider (`journey-provider.test.tsx`) | **7/7 pass** |
| Full `apps/os-web` `npm test` | **1480/1480 pass** |
| `npm run typecheck` | **pass** (after production build refreshed `.next/types`) |
| `npm run build` | **pass** (exit 0) |
| `git diff --check` (Recorrido paths) | **pass** |

## Browser proof (Isa / Álvaro profiles)

**Partial / not complete.** Disposable Postgres `:54329` + local API/web were started (never `:5432` / staging / Render).

Observed while stack was healthy: management-capable **Entrar (desarrollo)** reached `/inicio`; **Ver recorrido completo** was visible on desktop. Welcome intro dialog intercepts the first click until dismissed.

Later `/v1/dev/bootstrap` returned **500** (`PrismaClientKnownRequestError`) on the disposable DB, so login could not complete and full Recorrido step navigation / Escape / 390px proof was **not** finished.

Gate remains: **IMPLEMENTED LOCALLY / NOT HOSTED / NOT LIVE JOURNEY VERIFIED**.

Local evidence notes (do **not** commit): `docs/operations/commercial-release/evidence/RECORRIDO-DUAL-LAYER/` (untracked).

## 20-step Journey table (status / CTA / limitation)

| # | Status | CTA | Limitation / next |
| ---: | --- | --- | --- |
| 1 | Disponible para probar | Abrir → `/inicio` | Local RC copy; not hosted proof |
| 2 | Disponible parcialmente | Abrir → `/conversaciones` | WhatsApp not connected |
| 3 | Disponible parcialmente | Abrir → `/clientes` | Full register flow in proposal |
| 4 | Disponible para probar | Abrir → `/clientes` | Full tabs in proposal |
| 5 | Disponible para probar | Abrir → `/clientes` | Document revision in proposal |
| 6 | Disponible para probar | Abrir → `/clientes` | Pending sends need WhatsApp |
| 7 | Disponible para probar | Abrir → `/clientes` | Coverage queue UI in proposal |
| 8 | Disponible parcialmente | Abrir → `/clientes` | Payments/orders/commitments for auto archive checks |
| 9 | Vista de propuesta | Ver propuesta / decidir | Catalog PDF + prices decision |
| 10 | Vista de propuesta | Ver propuesta | — |
| 11 | Vista de propuesta | Ver propuesta / requisito | Catalog + price rules |
| 12 | Decisión pendiente de ISALWA | Ver qué necesitamos decidir | Approver identity |
| 13 | Vista de propuesta | Ver propuesta / requisito | Issuer public data + terms |
| 14 | Requiere configuración externa | Ver requisito / decidir | WhatsApp line + corporate vs shared |
| 15 | Vista de propuesta | Ver propuesta / decidir | Cancel / convert authority |
| 16 | Vista de propuesta | Ver propuesta / decidir / requisito | Payment before dispatch; Accounting |
| 17 | Vista de propuesta | Ver propuesta / decidir / requisito | Hours/escalation; notify senders |
| 18 | Disponible parcialmente | Abrir → `/clientes` | Absence queue in proposal |
| 19 | Vista de propuesta | Ver propuesta / decidir / requisito | GPS confirmation policy; Mapbox |
| 20 | Requiere configuración externa | Ver requisito / decidir | Meta/WhatsApp + IA budget |
