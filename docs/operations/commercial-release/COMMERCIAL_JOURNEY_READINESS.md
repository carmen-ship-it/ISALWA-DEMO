# Commercial journey readiness

Compact map for the 2026-11-16 continuation. Authority: V2 + A1 + A2 + `REUSE_MAP.md` §12/§13 + T03 contracts. Checkpoint: `docs/operations/COMMERCIAL_RELEASE_CHECKPOINT.md` (wins over stale `CURRENT_STATE.md`). Continuation: `CONTINUATION-2026-11-16.md`.

Integrator: `/Users/carmen/projects/isalwa-wt-v1-repairs` · `ct3/v1-repairs`. Starting committed HEAD for this run: `aada5396`. Batch 9 parent: `fd11db98`. Stage A committed `11e4f38b`. Batch 2 customer entry TESTED LOCALLY (receipt `BATCH-2-CUSTOMER-ENTRY.md`).

| Journey / ID | Routes | Commands / reads | Permissions | Local evidence | Blockers |
|---|---|---|---|---|---|
| Customer UI C1–C9, L1–L4 | `/clientes`, `/clientes/[id]`, `/incidencias` | Party/contact/issue correction commands; endpoint history; import phone review | `customerAuthority` / coverage / steward / `issue.manage` | Integrated `c1c185ec`; acceptance `receipts/ACCEPTANCE-LANE-B-T03-CUSTOMER-UI.md`; review PASS WITH FOLLOW-UPS | Stage A finishing (this batch); backend independent review queue still open |
| Stage A finishing | same | Bulk `GET …/followup-preferences`; flags vs archive; preserved forms | same | `receipts/STAGE-A-CUSTOMER-FINISHING.md`; TESTED LOCALLY 2026-11-16 | Independent review |
| Batch 2 customer entry | `/clientes`, `/clientes/nuevo` | CreateParty §5.4; ValidateClientImport text paste | `commercial.customer.create` / steward | `receipts/BATCH-2-CUSTOMER-ENTRY.md`; TESTED LOCALLY 2026-11-16 | Independent review |
| T04 quote approval / PDF / acceptance + T15 manual order | `/cotizaciones`, `/aprobaciones`, `/pedidos` | Quote draft/approve/issue/PDF/accept/convert | §13.5; no self-approve; `quote.convert` coverage | `receipts/BATCH-3-T04-QUOTES.md` + `BATCH-3B-PDF-HASH-PIN.md`; TESTED LOCALLY 2026-11-16/17 | Real approver identity for live; price-approve range; PDF byte/blob freeze still open (terms hash is pinned) |
| T05 catalog | `/productos` | Catalog browse/presentation | published/PDF gate | Candidate local only (`c872470`); `receipts/BATCH-4-CATALOG-BLOCKED.md` | Independent review; missing PDF/prices; A2 fixes |
| T06 conversations / manual attention | `/conversaciones` | Manual attention; inbox filters; claim; **Nota interna (Solo equipo)**; five attention states; blocked Mensaje | account/coverage/tenant; holder or manager changes a held state | `receipts/BATCH-5-CONVERSATIONS.md` @ `6f46eede` + `receipts/BATCH-5B-CONVERSATIONS.md`; TESTED LOCALLY, not browser-verified | Inbound path (reopen rule untested end to end), release/reassign authority, automation/AI state, provider optional |
| T07 payments | `/finanzas` | Reported payment, per-tender verify, allocations, instructions, archive check | `payments.report` / `payments.confirm` / publish scope | `receipts/BATCH-6-PAYMENTS.md`; TESTED LOCALLY | No approved payment instructions (share stays absent); no cash-receiver roster; independent review |
| T08/T09 commitments / notifications | `/compromisos`, `/compromisos/[id]`, home | Create/reschedule/reassign/cancel, handover queue, stored notices | responsible member; suspension rules | `receipts/BATCH-7-COMMITMENTS.md`; TESTED LOCALLY | 48h follow-up engine, due/overdue scheduler, opt-in sound, handover for work/order/issue-linked commitments; independent review |
| T10/T11 shell / Journey | shell, `/inicio`, Recorrido guiado | Nav groups, Hoy states, error copy, 44px controls; **dual-layer 20-step Recorrido** (try-now + proposal) | Journey audience; nav scope filter (links only, routes keep own gates) | Demo mode removed `1be6d9e5`; `BATCH-8-SHELL-MAP.md` + `BATCH-8B-CLIENTE360-STATUS-HEADER.md`; Recorrido dual-layer `receipts/RECORRIDO-DUAL-LAYER-EVALUATION.md` + worksheet `EVALUACION_ISA_ALVARO_DECISIONES_Y_FEEDBACK.md` | Label/padding audits; browser check at 390/1440; Mapbox token for live canvas; eval copy intentionally keeps quotes/payments/map as proposal until hosted-verified |
| T12 WhatsApp / media | `/conversaciones`, `/mensajes`, `/sistema` (system.admin) | Manual attention only; **no send, no webhook, no adapter** | takeover; tenant from trusted connection (future) | `receipts/BATCH-9-PROVIDERS-HOSTING.md`: honesty IMPLEMENTED + TESTED LOCALLY (`/sistema` no longer shows WhatsApp/Email "Funcionando"); adapter SPECIFIED only, not activated | Meta/WABA credentials + number, activation authority, hosted webhook host, reviewed adapter, storage + inspection choice |
| T13 A01–A22 engine | — | — | published public knowledge | SPECIFIED only (V2/A1); not built | T12; approved hours/address/catalog document |
| T14 AI proposals H01–H09 | `/clientes`, issues (assist panel) | Read-only assist with mutation deny list; mock unless key + `AI_ENABLED=true`; evidence review records a human decision | human confirmation; budget caps | Existing gate audited, no paid call made; proposals/quotas SPECIFIED only | Model/budget choice; persistent quota + accept/ignore commands; review |
| T16 map / Hoy | `/mapa`, `/inicio` | Confirmed pins, "Pendiente de ubicación" list, Hoy sections | same visibility as customer reads | `receipts/BATCH-8-SHELL-MAP.md`; TESTED LOCALLY | Mapbox public token (owner/cost) for the live canvas; browser check |
| Hosting evaluation | Vercel `carmen-ship-it` | — | — | `receipts/VERCEL-HOSTING-PREP.md`: manifest PREPARED; not deployed, not exported; inventory not refreshed (Vercel needs sign-in) | Owner purchase (H1), API host (H2), review then fresh allowlisted export (H3), Vercel/Supabase sign-in (H4/H6) |

States used in receipts: SPECIFIED · IMPLEMENTED · TESTED LOCALLY · INDEPENDENTLY REVIEWED · INTEGRATED · DEPLOYED · LIVE JOURNEY VERIFIED · OWNER ACCEPTED.

## Distinct gates (never merged in any receipt)

| Gate | Meaning | Status after Batch 9 |
|---|---|---|
| Independent review | A reviewer other than the builder verdicts pinned source and boundaries | **None** for Batches 2–9 (only C1–C9/L1–L4 customer UI and Lane B demo removal were reviewed) |
| Integration | Merged locally on `ct3/v1-repairs` | Batches 1–9 are committed locally; not pushed |
| Deployment | Running at an authorized hosted destination | **None.** No deploy, no push, no export built |
| Provider activation | Real WhatsApp/email/AI/map/payment connection with activation authority | **None.** All disconnected and labeled so |
| Human acceptance | A person completing tasks unaided and signing off | **None** |

## Open blockers, Batches 4–9

| Batch | Blocker | Type |
|---|---|---|
| 4 Catalog | Independent review of Lane A candidate; `CatalogoVitriCompleto2026.pdf` and approved prices missing (no "Compartir catálogo", "Precio por confirmar"); A2 fixes (accent search, provenance, breadcrumb, `automaticAnswerFields` gate) not implemented | REVIEW + DATA |
| 5 Conversations | Nota interna and the five attention states are built (Batch 5B); no inbound path (reopen rule has no caller), no release/reassign authority, no automation or AI state; WhatsApp not connected (Batch 9 T12) | PROVIDER + OWNER DECISION |
| 6 Payments | No approved payment instructions (share stays absent); no cash-receiver roster; no real Accounting member; review | DATA + OWNER |
| 7 Commitments | 48h follow-up engine, due/overdue scheduler, opt-in sound, linked-record handover | IMPLEMENTATION |
| 8 Shell/map | Mapbox token; label and padding audits; no browser verification (Cliente 360 header shipped in 8B) | OWNER + IMPLEMENTATION |
| 9 Providers/hosting | T12/T13/T14 not built; credentials, number, activation authority; owner purchase; API host; export after review; Vercel/Supabase sign-in | PROVIDER + OWNER + REVIEW |
| 3 (carried) | Price-approve range; real approver identity; optional PDF byte freeze | OWNER + IMPLEMENTATION |
