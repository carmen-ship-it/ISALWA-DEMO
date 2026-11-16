# Commercial journey readiness

Compact map for the 2026-11-16 continuation. Authority: V2 + A1 + A2 + `REUSE_MAP.md` §12/§13 + T03 contracts. Checkpoint: `docs/operations/COMMERCIAL_RELEASE_CHECKPOINT.md` (wins over stale `CURRENT_STATE.md`). Continuation: `CONTINUATION-2026-11-16.md`.

Integrator: `/Users/carmen/projects/isalwa-wt-v1-repairs` · `ct3/v1-repairs`. Starting committed HEAD for this run: `aada5396`. Stage A committed `11e4f38b`. Batch 2 customer entry TESTED LOCALLY (receipt `BATCH-2-CUSTOMER-ENTRY.md`).

| Journey / ID | Routes | Commands / reads | Permissions | Local evidence | Blockers |
|---|---|---|---|---|---|
| Customer UI C1–C9, L1–L4 | `/clientes`, `/clientes/[id]`, `/incidencias` | Party/contact/issue correction commands; endpoint history; import phone review | `customerAuthority` / coverage / steward / `issue.manage` | Integrated `c1c185ec`; acceptance `receipts/ACCEPTANCE-LANE-B-T03-CUSTOMER-UI.md`; review PASS WITH FOLLOW-UPS | Stage A finishing (this batch); backend independent review queue still open |
| Stage A finishing | same | Bulk `GET …/followup-preferences`; flags vs archive; preserved forms | same | `receipts/STAGE-A-CUSTOMER-FINISHING.md`; TESTED LOCALLY 2026-11-16 | Independent review |
| Batch 2 customer entry | `/clientes`, `/clientes/nuevo` | CreateParty §5.4; ValidateClientImport text paste | `commercial.customer.create` / steward | `receipts/BATCH-2-CUSTOMER-ENTRY.md`; TESTED LOCALLY 2026-11-16 | Independent review |
| T04 quote approval / PDF / acceptance + T15 manual order | `/cotizaciones`, `/aprobaciones`, `/pedidos` | Quote draft/approve/issue/PDF/accept/convert | §13.5; no self-approve; `quote.convert` coverage | `receipts/BATCH-3-T04-QUOTES.md`; TESTED LOCALLY 2026-11-16 | Real approver identity for live; PDF hash pin; price-approve range |
| T05 catalog | `/productos` | Catalog browse/presentation | published/PDF gate | Lane A candidate `18a0f0c` not integrated; A2 fixes not started | Independent review; missing PDF/prices for publish claims |
| T06 conversations / manual attention | `/conversaciones` | Manual attention; inbox filters | account/coverage/tenant | Partial pre-V2; batch 5 | Provider optional |
| T07 payments | `/finanzas` | Reported payment + verify | Accounting vs advisor | Not started | Approved payment instructions for share |
| T08/T09 commitments / notifications | `/compromisos`, home | Commitment CRUD; notifications | responsible member; suspension rules | Partial auth repairs only | — |
| T10/T11 shell / Journey | shell, Journey | — | Journey audience | Demo mode removed `1be6d9e5` | Remaining interaction polish in later batches |
| T12–T14 WhatsApp / AI | adapters | Outbox / proposals | takeover; published knowledge | Not activated | No paid provider calls in this instruction |
| T16 map / Hoy | `/mapa`, `/inicio` | scoped pins / work queues | same visibility as customer reads | Partial shell | Map credentials if adapter requires |
| Hosting evaluation | Vercel `carmen-ship-it` | — | — | Inventory 2026-11-13: Hobby, 0 projects; Render exit planned | Owner purchase/API host; fresh allowlisted export after new SHA |

States used in receipts: SPECIFIED · IMPLEMENTED · TESTED LOCALLY · INDEPENDENTLY REVIEWED · INTEGRATED · DEPLOYED · LIVE JOURNEY VERIFIED · OWNER ACCEPTED.
