# Commercial Release V2 — Reuse map (T00)

Contract: `docs/product/COMMERCIAL_RELEASE_V2.md` (SHA256 `cc3f1436b8ce6f12ab13bf2c9446a9cb0cf76cbc1e33de63bb28cdc260581588`).
Source mapped: `ct3/v1-repairs` @ `7fe8772a0918dbe759577c2e77edf2b2beebb200` (tree `cdf59f52…`) + 19 uncommitted S11 paths.
Mapped 2026-10-16T20:44Z. Status words: **REUSE** (exists, use as-is), **EXTEND** (exists, add fields/commands), **NEW** (no equivalent found — search recorded), **VERIFY** (exists, behaviour must be re-proven in the owning task).

New command names in the contract are proposed contracts; the column "Maps to" names the existing command when one exists.

## 1. Data model (§10)

| Spec concept | Current source | Status | Owner |
|---|---|---|---|
| Customer identity (Party/Contact/Location/CommercialAccount) | `OsParty`, `OsContact`, `OsLocation`, `OsCommercialAccount`, `OsPartyRoleAssignment` — `packages/os-party` | REUSE | T03 |
| Duplicate / shared phone | `OsPartyDuplicateCandidate`, `OsPartyMergeRequest` | REUSE (no auto-merge) | T03 |
| Coverage advisor | `OsCustomerCoverageGrant` (starts/ends/revoked, primary owner kept) — `GrantCustomerCoverage`/`RevokeCustomerCoverage` | REUSE / VERIFY expiry + revoke | T03 |
| Opportunity / Quote / Order | `OsOpportunity`, `OsQuote`, `OsQuoteLine`, `OsOrder`, `OsOrderLine` — `packages/os-commercial` | REUSE | T04/T15 |
| Price list by context | `OsPriceList`, `OsPriceEntry` (`context`, `amountCentavos`, source file/page/sha) | REUSE — no approved numeric prices loaded | T05 |
| Catalog | `OsCatalogProduct` (+Provenance/Attribute/StatusEvent) — `packages/os-catalog` | REUSE / EXTEND (published-for-AI flag, aliases) | T05 |
| Approvals | `OsApprovalRequest` — `packages/os-work`, `/aprobaciones` | REUSE / VERIFY self-approval + invalidation | T04 |
| Commitments | `OsCommitment` (`dueAt` nullable, origin, lifecycle) — `packages/os-commitment` | EXTEND (revise date with history, timezone) | T08 |
| Customer vs internal date | `CustomerCommittedDate`(+Revision), `ProductionInternalTargetDate`(+Revision), `ProductionDateIssue`, `CustomerDateInformedRecord` | REUSE | T08 |
| Issues | `OsIssue` family — `packages/os-issue`, `/incidencias` | REUSE | T08 |
| Business events / audit / outbox | `OsBusinessEvent`, `OsAuditLog`, `OsOutboxMessage`, `OsOutboxConsumerDedup` — `packages/os-events` | REUSE | all |
| Idempotency / replay | `OsIdempotencyKey` (org+key, `resultJson`) + uncommitted `packages/os-events/src/replay.ts` | EXTEND (actor + fingerprint) | T01 |
| Conversation (manual record) | `OsCustomerConversation` (customer required, summary, channel, `advisorNumberStatus`) — `customer-conversations.controller.ts` | EXTEND: messages, state, assignment, version | T06 |
| Channel connection (tenant-scoped) | none found (`rg "phone_number_id\|ChannelConnection"`: 0 in schema) | NEW | T06/T12 |
| Provisional channel contact | none found | NEW | T06 |
| Provider message / status events | none found | NEW | T06/T12 |
| Conversation assignment / chat state | none (only `OsWorkItemOwnershipHistory` for work) | NEW (fields on conversation + history) | T06 |
| AI proposal | none persisted (`apps/os-api/src/ai/*` assist is stateless; `OsCommitment.provenanceSuggestionId` references a suggestion id) | NEW | T14 |
| Public knowledge versioned | none found | NEW | T05/T13 |
| Payment report + tenders + confirmation | `OsReportedOperationalFact` kind `payment` (`confirmation` pending, `correctsFactId`, idempotencyKey) — `packages/os-contracts/src/reported-operational-fact.ts` | EXTEND (tenders, confirm/reject actor, reasons) — decide in T07 after proving fit | T07 |
| Notification per recipient | `OsInternalNotification` (`dedupKey`, `readAt`, `resolvedAt`, channel) | EXTEND (acknowledgedAt, delivery state, email outbox) | T09 |
| Attention / clock | `OsAttentionReadModel`, `attention.controller.ts`, `docs/operations/OVERDUE_ATTENTION_CLOCK.md` | REUSE | T08/T09 |
| Usage ledger AI | `apps/os-api/src/ai/ai-usage-ledger.ts`, `ai-rate-limiter.ts` | VERIFY persistence (spec requires durable cap) | T14 |

## 2. Commands (§10)

| Contract name | Maps to (existing) | Status | Owner |
|---|---|---|---|
| RegisterCommercialCustomer | `CreateParty` (+contact/location/account) — requires `master_data.admin` today | EXTEND: new scope `commercial.customer.create`, bounded fields | T03 |
| LinkConversationCustomer | none | NEW | T06 |
| RecordInteraction | `POST /customer-conversations` (manual record) | EXTEND | T06 |
| Claim/AssignConversation | none | NEW | T06 |
| Pause/ResumeAutomation | none | NEW | T06/T13 |
| QueueCustomerMessage | outbox exists; no customer-message command | NEW | T11/T12 |
| AddInternalNote | none on conversation | NEW | T06 |
| ConfirmProposal | none | NEW | T14 |
| RecordPaymentReport | reported-operational-fact `payment` record | EXTEND | T07 |
| Confirm/RejectPaymentReport | `confirmation` column exists; confirm command not found | EXTEND | T07 |
| Revise/CancelCommitment | `CancelCommitment`, `ReassignCommitmentOwner`, `FulfillCommitment` exist; revise date not found | EXTEND | T08 |
| PublishKnowledge | none | NEW | T05 |
| Quote send | `SubmitQuote`, `RecordQuoteManualSend` | EXTEND (versioned artefact) | T04/T15 |
| Convert to order | `CreateOrder` + `commercial.order.convert` / `commercial.quote.convert.own` | REUSE / VERIFY | T04/T15 |

## 3. Scopes (§6) — `packages/os-contracts/src/scopes.ts`

| Contract scope | Existing equivalent | Decision |
|---|---|---|
| commercial.customer.create | none (CreateParty → `master_data.admin`) | NEW scope, explicit assignment only (T03) |
| conversations.assign | `commercial.account.reassign` is account-level, not chat | NEW (T06) |
| payments.report | `finance.operational.record` (operations catalog) covers recording facts broadly | Map in T07; prefer a distinct report scope to keep report ≠ confirm |
| payments.confirm | `payment.confirmed.required` is a requirement key, not a grant | NEW (T07) |
| commercial.knowledge.publish | none | NEW (T05) |
| integrations.manage | `integration.admin` (ADMIN_SCOPE_KEYS) | REUSE `integration.admin`; no synonym added |
| team read | `commercial.team.read`, `commercial.org.read` | REUSE |
| convert | `commercial.order.convert`, `commercial.quote.convert.own` | REUSE |
| approvals | `approval.act` | REUSE |
| commercial.work.manage | none | NEW narrow (T03, 2026-10-16 19:19): continue in-range opportunity/quote work; see §12 |
| commercial.assignment.org | none (`commercial.account.reassign` alone was treated as org-wide) | NEW narrow (T03, 2026-10-16 19:30): organization-wide assignment reach (cross-team, any account). Required with `commercial.account.reassign`; see §12 |
| commercial.intake.assign | none | NEW narrow (T03, 2026-10-16 19:30): allocate unassigned accounts only. Required with `commercial.account.reassign`; see §12 |

No scope is mapped to a real person. Fixtures only use synthetic members.

## 4. Routes (§5) — `apps/os-web/app/(app)` and `apps/os-web/lib/navigation/nav-config.ts`

| Route | Exists | Change | Owner |
|---|---|---|---|
| /inicio | yes | Rebuild sections per §5.1 within existing shell | T10 |
| /conversaciones | yes | Inbox per §5.2 | T11 |
| /mensajes | yes (nav-config L279) | keep as compatible redirect to /conversaciones | T10 |
| /clientes, /clientes/nuevo, /clientes/[partyId] | yes | §5.4 + §17.1 above-fold | T03/T10 |
| /oportunidades, /cotizaciones, /pedidos, nested quote/order routes | yes | §5.6 | T04/T15 |
| /productos | yes | §5.5 | T05 |
| /finanzas | yes | "Por verificar" filter | T07 |
| /compromisos, /incidencias | yes | §5.8 | T08 |
| /mapa | yes (Mapbox `components/map/map-live-canvas.tsx`) | §5.9 | T16 |
| /aprobaciones | yes | §5.6 approvals | T04 |
| /administracion/comercial/conocimiento | no | NEW subroute | T05 |
| /administracion/comercial/conexiones | no | NEW subroute | T12 |

## 5. Integrations (§9)

| Provider | Current | Owner |
|---|---|---|
| WhatsApp Cloud API | none (`advisorNumberStatus` = `WHATSAPP_NUMBER_PENDING`) | T12 (provider-blocked expected) |
| Email | no transactional provider in os-api found (`rg resend\|postmark\|sendgrid` → only `packages/providers` types) | T09 adapter; real send gated |
| Mapbox | integrated in os-web | T16 |
| OpenAI | `apps/os-api/src/ai/ai-provider-gateway.ts` | T14 |

## 6. §§17–20 requirement owners

| Requirement | Owner |
|---|---|
| §17.1 continuity, returnTo, stable lists, search debounce, filters in URL | T10 (shell), T11 (inbox) |
| §17.1 Cliente360 above-fold | T10 |
| §17.2 drafts not in localStorage, error copy table, Guardando…, IME | T10/T11 |
| §17.3 a11y 320/390/768/1440, zoom 200%, human test | T10/T11/T19 |
| §18.1 session/CSRF/CORS/rate limits | T02 (+T17 residual) |
| §18.2 tenant FKs, attachments quarantine, phone≠identity | T02/T06/T11 |
| §18.3 AI injection/audit | T13/T14 |
| §19.1 capacity test | T17 |
| §19.2 Salud operativa | T12 |
| §19.3 import/export/retention/backup | T03 (import/export), T17 |
| §20 setup checklist, guides, metric definitions | T12/T16/T20 |

## 7. Authorization policy in force

ISALWA only. No CCA project, no "Rose" authority applied. Grants come from explicit role/additional-role/delegation assignment (`scopes.ts`), never from Cargo, title, AI, or URL. `people.admin` administers assignments and does not confer commercial capability.

## 8. Decisions: new vs previous

| Decision | Previous | V2 |
|---|---|---|
| Advisors register customers | Blocked (`master_data.admin`) | Allowed via new scoped command (Isa #1; §2) |
| Coverage advisor modifies quote | Instruction 09:05: do not | Allowed within delegated scope (O08 relay; §2) |
| Map | out of scope | basic map in scope (§1) |
| AI auto-reply | none | only approved deterministic templates A01–A20 (§7) |
| Prices | none approved | still none; "Precio por confirmar" / "Pendiente de precio aprobado" |

## 9. Addendum A1 delta (incorporated 2026-10-16T21:0xZ)

Contract: `docs/product/COMMERCIAL_INTERACTIONS_A1.md` (SHA256 `f24cab99c909196ec417594c056753bf3b68800108062abccedec7e1f0261871`). A1 prevails for interactions it details; it relaxes no V2 gate. Completed work (T00 commit `30077c6`) is not redone; only the deltas below are added.

### 9.1 Events (A1 §9) — map existing first

| A1 contract | Existing event (`packages/os-commercial/src/commercial-command-service.ts`) | Decision | Owner |
|---|---|---|---|
| quote.request.detected | none | Not a business event: AI proposal row (derived). No event claiming a customer decision | T14 |
| quote.draft.created | `quote.created` (status `draft`) | REUSE `quote.created` | T04 |
| quote.issued | `quote.submitted` (sets `submittedAt`) | Map candidate; T04 must prove `submitted` means "issued with snapshot", else add versioned issue artefact without changing historical status values | T04 |
| quote.send.queued | `quote.send_recorded` (manual send record) | EXTEND: queued intent separate from recorded manual send | T15 |
| quote.customer_acceptance.recorded | none | NEW | T15 |
| order.created | `order.created` | REUSE | T15 |
| payment.reported/confirmed/rejected/reversed | reported-operational-fact `payment` (confirmation column) | EXTEND | T07 |
| payment_instructions.published/retired | none | NEW | T05 |
| contact.followup_preference.changed | `contact.updated` exists (different meaning) | NEW, not overloaded on contact.updated | T03 |

### 9.2 Models (A1 §§4–7)

| Need | Existing | Status | Owner |
|---|---|---|---|
| Issued quote snapshot/version/hash/validity | `OsQuote.revisionNumber`, `version`, `quote-pdf.service.ts` | EXTEND (snapshot + pdf hash + validUntil explicit, no default) | T04 |
| Customer acceptance record | none | NEW (quote, revision, channel [WhatsApp, Llamada, Visita, Presencial, Otro], evidence, actor) | T15 |
| Payment instructions (versioned, approver ≠ publisher) | none | NEW, inside public knowledge model | T05 |
| Payment allocations to orders, unassigned advance | none (`OsReportedOperationalFact` has no allocation) | NEW minimal | T07 |
| Cash receiver / Receptor por confirmar | none | EXTEND payment report | T07 |
| Attachment hash for duplicate warning | none | EXTEND attachments | T07/T11 |
| Follow-up / contact preference per contact+channel+tenant | none | NEW | T03/T13 |
| Three responsibilities (cuenta / conversación / compromiso) | account owner (`OsCommercialAccount`), commitment owner (`OsCommitment.ownerMemberId`); conversation handler NEW (T06) | EXTEND | T06/T10 |
| Proposal types quote_request, quote_change, quote_acceptance_candidate, payment_report_candidate | proposal model NEW in T14 (V2 types) | add to same enum, no second table | T14 |

### 9.3 Scopes

| A1 proposed | Existing | Decision |
|---|---|---|
| commercial.payment_instructions.publish | none | NEW, explicit only, distinct from payments.confirm; publisher cannot self-assign; change of destination needs a different approver with the scope (T05) |
| share payment instructions | commercial advisor scope | maps to existing commercial access; does not grant publish |

### 9.4 Copy / templates added by A1

A21, A22 (T13); H07, H08, H09 (T14/T15); UI strings in A1 §§2,4,5,6 (T04/T05/T07/T10/T11/T15). Exact text kept in the contract file; receipts quote the effective text.

### 9.5 Task deltas (A1 §10)

| Task | Delta | State |
|---|---|---|
| T00 | This section + copy + SHA | done in A1 docs commit |
| T01 | A1 §9 idempotency org+actor+command+payload — already the T01 design | in progress (no extra delta) |
| T02 | A1 §1: counts/existence/PDF/realtime/deep links never cross tenant; same phone/product/key in two orgs | add tests |
| T03 | identity link, multi-line relation, follow-up preference | pending |
| T04 | issue vs send vs draft, review modal, validity explicit, immutable PDF + hash, download event | pending |
| T05 | payment instructions knowledge + scope | pending |
| T06 | proposals with manual context; three responsibilities; relay queue for revoked member | pending |
| T07 | tenders, cash receiver, allocations, duplicate hash warning, no refund button | pending |
| T09 | A1 §8 notification matrix | pending |
| T10–T11 | Acciones comerciales block, Acciones menu, proposal card | pending |
| T12 | attachments states (No analizado automáticamente) | pending |
| T13 | A21/A22, mixed intent | pending |
| T14 | structured intent extraction, candidates, summary watermark | pending |
| T15 | send / acceptance / order, H07 | pending |
| T16–T20 | metrics, races A1-J05, journeys A1-J01..J12 | pending |

## 10. Addendum A2 delta (incorporated 2026-10-16T21:27Z)

Contract: `docs/product/COMMERCIAL_SELF_SERVICE_A2.md` (SHA256 `1b16dd90ce709cb09b615eb33c9235ffc219a57f8cdc074f587e25c7e9d67869`, byte-identical to the received file). A2 adds lifecycle contracts on top of V2 + A1. It relaxes no V2/A1 gate and grants nothing to real people. Completed work (T00 `30077c6`, A1 docs `2df764e`, T01 `1d69341`/`00660be`) is not redone.

### 10.1 Authority (A2 §2) — existing equivalents first

| A2 action | Existing today | Gap | Owner |
|---|---|---|---|
| Edit name/contact/phone/city/address | `UpdateParty`, `UpdateContact`, `UpdateLocation` require org-wide `master_data.admin`, tenant check only, no resource check (`packages/os-contracts/src/scopes.ts` `COMMAND_REQUIRED_SCOPES`) | Resource authority (owner, or active coverage with explicit edit delegation) + proposed `commercial.customer.edit`; `master_data.admin` keeps its existing data-steward meaning, not widened | T03 |
| Archive / reactivate | `DeactivateParty` / `ReactivateParty` (`master_data.admin`) | Reuse the commands (no new record on reactivation); add obligations preview/block, motive list, proposed `commercial.customer.archive` / `.reactivate` | T03 |
| Change owner / coverage | `ReassignCommercialAccountOwner`, `GrantCustomerCoverage`, `RevokeCustomerCoverage` with `commercial.account.reassign` | Map `commercial.account.assign` (A2) onto existing `commercial.account.reassign`; no second action scope. Since 2026-10-16 19:30 the action scope also needs an assignment reach (team, `commercial.assignment.org` or `commercial.intake.assign`), see §12. Add "Solicitar reasignación" request for advisors | T03/T10 |
| Manager edits customer data in range (2026-10-16 19:19) | `commercial.customer.edit` + range in `canActOnCustomer` (team lead with `commercial.team.read` over the current owner, or `commercial.org.read`) | MAPPED, no new scope. `legalName` stays `master_data.admin` maintenance | T03 |
| Manager continues opportunities/quotes in range without owning or covering (2026-10-16 19:19) | none (record commands required owner or `commercial.work` coverage) | NEW narrow `commercial.work.manage` + same range (`canManageCustomerAccountWork`). Never converts (`commercial.order.convert`), cancels orders, approves, reassigns owners, or touches payments/documents/dispatch | T03 |
| Correction review | none | proposed `commercial.data_correction.review` | T03/T17 |
| Operations configuration | none | proposed `commercial.operations.configure`; never covers bank/QR (A1 double approval) or discounts/credit | T17 |
| Payments confirm/revert/assign | A1/V2 payment scopes (T07) | unchanged; never `customer.edit` | T07 |
| Members / scopes / invitations | workforce `people.admin` | unchanged, independent of commercial | — |

Proposed scopes are added to contracts only with an explicit matrix in the owning task, granted only to synthetic fixtures. No role, title or `people.admin` bypass.

### 10.2 Models (A2 §§1,4,5,6,7)

| Need | Existing | Decision | Owner |
|---|---|---|---|
| Customer Active/Archived independent of stage | `OsParty.status` (`active`/`inactive`/`merged`) | REUSE `inactive` as Archivado in UI; prove semantics in T03 (no deletion, no debt meaning) | T03 |
| Contact ↔ company relation with validity | `OsContact` (party-bound) | EXTEND with relation end date/motive; never delete person | T03 |
| Phone/channel identity with epoch/validity, retired state | `OsContact` value rows | EXTEND (retired-at, verification method, version); cancel unsent intents to retired endpoint | T03/T06/T09 |
| Field-level change history (old/new/actor/motive/source/version) | business events + audit log | REUSE events/audit with old/new facts; redact per reader | T03/T10 |
| Correction / reassignment / duplicate / send-problem requests | `os-issue` (`ReportIssue`, `TriageIssue`, `AssignIssueOwner`, states) | REUSE issues with request types; map Pendiente/En revisión/Resuelta/Rechazada onto existing states; no second ticketing | T03/T10/T17 |
| Duplicate candidates | `OsPartyDuplicateCandidate` (`fiscal_nit_exact`), merge request/approve | REUSE; generic hidden result; no new merge. Existing merge stays gated until preview/reversibility is proven | T03 |
| Versioned operations config (queues, substitutes, hours, reminders) | none (public knowledge in T05) | NEW minimal, draft/publish, America/La_Paz | T17 |
| Document snapshots / revisions | quote revision + PDF (T04) | REUSE "Crear revisión del documento"; edits never rewrite issued PDFs | T04/T15 |

### 10.3 UI (A2 §3) — inside existing navigation

Cliente360 header: "Editar datos", menu "Más acciones" (Actualizar teléfono, Gestionar contactos, Solicitar reasignación / Reasignar cliente, Archivar cliente / Reactivar cliente); Historial filter "Cambios de datos"; routes `/administracion/comercial/operacion` and `/administracion/comercial/solicitudes` (no canonical equivalent exists today: `administracion/` has only `accesos`, `capacidades`, `equipo`); Hoy "Abrir solicitud". Conflict copy "Este registro cambió mientras lo editabas. Revisa la versión actual antes de guardar." Tokens per V2 (navy #18324B, AI #EDF5F8, error #A63D36/#FBE9E7, warning #FFF5DB). Owner T10 (UI), T03 (commands).

### 10.4 Task deltas (A2 §11)

| Task | A2 delta | State |
|---|---|---|
| T00 | This section + byte copy + SHA | done in A2 docs commit |
| T01 | none (version/idempotency already the T01 design) | LOCAL_COMPLETE, not reopened |
| T02 | Contact visibility / revocation stays as decided 2026-10-16 17:18; A2 §2 "authorship no permanent access", §6 hidden duplicate = generic review, A2-J12 read side (search/count/history/export) | in progress |
| T03 | customer/contact edit with version + motive + history, phone update/retire, relation end, archive/reactivate with obligations, requests (issues), resource authority for party commands, proposed scopes; A2-J01, J04, J05, J07, J10 | pending |
| T04/T15 | issued documents unchanged by data edits; "Crear revisión del documento"; A2-J01 PDF identical | pending |
| T06 | channel identity epoch, provisional link, coverage delegation limits; A2-J02, J03, J06 | pending |
| T07 | payment correction via reversal workflow; A2-J08 | pending |
| T08 | commitment date change keeps prior date; reassignment queue on suspension | pending |
| T09 | change notifications matrix (A2 §9), cancel stale sends | pending |
| T10 | Cliente360 actions, Historial "Cambios de datos", admin comercial operación/solicitudes, Hoy requests; A2-J11 UI | pending |
| T11 | provisional conversation from new/recycled number | pending |
| T12 | recipient/version check before send (provider-blocked part stays UNPROVEN) | pending |
| T13–T14 | AI proposes only; never identity or definitive change | pending |
| T16 | historical seller vs current owner metrics | pending |
| T17 | operations config versioning, recovery tools, retention without purge; A2-J09 | pending |
| T18–T20 | A2-J11 staff self-service journey (clicks/errors/help, no SQL/terminal), A2-J12 forbidden/tenant sweep; independent review + human acceptance kept separate | pending |

## 11. Owner decision 2026-10-16 17:58 — two demo artifacts (remove A, keep and update B)

Decision (summary of the owner's instruction): remove the separate sample-data demo view completely (T10/T11); preserve the guided presentation/walkthrough during the build and update it at T20 against the verified final interface and journeys. Not a rebuild; no data deletion; no deployment. Identification is read-only (2026-10-16, HEAD `b0cf756`); nothing was removed in this step.

### 11.0 Owner clarification 2026-10-16 18:04 (supersedes the B identification below where they differ)

- KEEP = the small top "Journey" tab: header button `components/demo/ver-ejemplo-completo-button.tsx` ("Ver recorrido completo" / compact "Recorrido", `app-shell.tsx:295`) and its step panel (`components/demo/owner-story-mode.tsx`, `lib/demo/story-mode-steps.ts`). The tab must stay reachable after removal (today it is gated by `canUseOwnerDemo` from the owner provider; T10/T11 gives it a non-demo gate). Its content is updated in T20 after the workflows are verified.
- REMOVE = the full-app teacher/demo mode: the DEMO/REAL switch (`demo-data-filter-toggle.tsx`), the every-page "DEMO · ficticio" banner (`demo-fictitious-banner.tsx`) and the overlay's `DEMO_FICTITIOUS_BADGE`, the mode state (`owner-demo-provider.tsx` dataMode, `isalwa-demo-data-mode` cookie, localStorage `DEMO_DATA_MODE_STORAGE_KEY`, `isalwa-owner-effective-company` cookie), the routing (`?datos=demo|real`, `?story=1` forcing demo, `withStoryDemoDatos`, `preserve-explicit-data-mode`, `redirect-data-mode`, middleware 45-80), the SYNTH-tenant switch in `getServerOsAuthContext`/login, the seeded-record deep links (`loadDemoSeedIdMap` in step hrefs), and every fake-data substitution listed in 11.1. Opening the Journey tab must no longer change the data mode.
- Real pages that the demo mode also showed (clientes, cotizaciones, pedidos, finanzas, conversaciones, almacén, producción, inicio, mapa, etc.) are kept and must work in normal mode with authorized persisted data or honest empty/error states.
- Data: no deletion of real records or of shared/mixed rows by a "DEMO" label. Stored SYNTH records (11.1 "Stored records") are listed only; any cleanup proposal must identify each record with provenance and dependencies first. Isolated automated-test fixtures stay.
- Not part of the removed mode (kept, revisited in T20 with the Journey content): first-use welcome `components/walkthrough/*` + `lib/walkthrough/*`, inline help `lib/guidance/*`. The Ayuda "Modo aprendizaje" switch is not the data mode, but it is REMOVED in T10/T11 too (engineering clarification 2026-10-16 18:44 item 5: "A setting that does nothing should not remain in the staff UI. Preserve the functioning Journey tab independently."). Targeted reference check 2026-10-16 (`rg "learningModeEnabled|setLearningMode|LearningModeToggle" apps/os-web`, excluding tests): the only reader of `learningModeEnabled` is `components/walkthrough/learning-mode-toggle.tsx:15`, which uses it to label itself; `lib/walkthrough/persistence.ts:82,120` and `progress.ts` only store and toggle it; `guide-provider.tsx:99` only exposes the setter; mount point `walkthrough-help-panel.tsx:54`. No functional consumer. Removal scope: the toggle, its mount, `LEARNING_MODE_COPY` (`lib/walkthrough/copy.ts:90,103`), `setLearningMode`, the stored field (old stored values are ignored on read), targets `learning-mode`/`help-learning-mode`, and the matching assertions in `lib/walkthrough/guide.test.ts`, replaced by an assertion that the help panel no longer renders it.
- Acceptance (owner): (1) top Journey tab accessible; (2) no switch, old URL, persisted cookie/localStorage, or query parameter reactivates the mode; (3) normal pages use authorized persisted data and honest empty/error states, no fake substitution; (4) existing real records intact and usable; (5) Journey content updated in T20 after verification.

### 11.1 Artifact A — sample-data demo view (`apps/os-web`), REMOVE in T10/T11

It is a data mode, not a separate route tree: `?datos=demo` switches the active organization to the seeded SYNTH tenant (`01M2JKF77TXMJNDTKNCYNHH9G5`) and filters to `DEMO `-prefixed records; some screens also fabricate in-memory data.

- Entry points: `middleware.ts:45-50,70-80` (`datos=demo|real`, cookies `isalwa-demo-data-mode`, `isalwa-owner-effective-company`); `lib/demo/resolve-demo-data-mode.ts`; `lib/auth/actions.ts:384-405` (`getServerOsAuthContext` picks SYNTH/REAL ids hardcoded in `lib/qa/constants.ts`); `components/demo/preserve-explicit-data-mode.tsx` (mounted `app/(app)/layout.tsx:57`); `lib/demo/redirect-data-mode.ts`; `datos` propagation in `components/shell/app-shell.tsx:37-39`, `components/shell/app-nav.tsx:64-69,170-171,222`.
- UI entries: toggle `components/demo/demo-data-filter-toggle.tsx` (`app-shell.tsx:294`); banner `components/demo/demo-fictitious-banner.tsx` (`app-shell.tsx:303`); orphan `components/demo/inicio-owner-demo-card.tsx`; orphan `components/commercial/demo-preview-cards.tsx`.
- Exclusive libs/data: `lib/demo/owner-demo-identity.ts`, `owner-company-context.ts`, `owner-demo-registry.ts`, `seeded-ids.json`, `conversations.json`; `lib/commercial/demo-starter-prices.ts`; `lib/warehouse/demo-fg-citations.ts`; `lib/management/demo-lens.ts`; `lib/conversations/demo-fixtures.ts`; `components/conversations/conversation-demo-badge.tsx`; `lib/audit/demo-coherence.ts`.
- Substitution / fabrication to remove: `app/(app)/finanzas/page.tsx:60-110` (in-memory 4.500,00 BOB "reported payment"); `app/(app)/conversaciones/page.tsx:89-122` (fixture merge); quote pages `demoPrices` (`clientes/[partyId]/cotizaciones/[quoteId]/page.tsx:597`, `quote-product-picker.tsx:153,350-355`); `almacen/page.tsx:316-334` demo order list; `inicio/page.tsx:583` team-table hiding.
- DEMO-name filters on real lists (`filterByDemoDataMode`): clientes, cotizaciones, oportunidades(+nueva), pedidos, trabajo, compromisos, incidencias, mapa, inicio, almacen, produccion, `lib/postsale/load-pedidos.ts`, `lib/delivery/load-entregas.ts`, `lib/purchasing/load-linked-orders.ts`, `lib/finance/load-subject-options.ts`. In real mode these hide `DEMO ` rows; removal must not start showing SYNTH demo rows in a real tenant (they live only in SYNTH, so the tenant boundary already excludes them; verify before deleting the filter).
- Tenant risk to close: `OwnerDemoProvider` writes the mode cookie for every user, so `getServerOsAuthContext` sends the hardcoded REAL org id; login (`lib/auth/actions.ts:85-130,174-186`) auto-tries no-org → REAL → SYNTH. Removal must replace this with the authenticated member's own organization, with no hardcoded tenant and no silent fallback. API side has no bypass (`apps/os-api/src/trusted-member-context.ts:13`, `os-session.ts:132-145`).
- Stored records (not deleted; provenance only): `packages/os-database/src/owner-demo/seed.ts` (`fixture:owner-demo`, staging-only, `STAGING_FIXTURE_CONFIRM=1`) creates 5 DEMO customers and their opportunity/quote/order/delivery/FG/work/commitment/conversation rows in SYNTH and writes `seeded-ids.json`; `owner-demo/seed-journey-customer.ts` ("DEMO TALLER SAN LORENZO"); staging grants `staging-carmen-synth-demo-*.ts`, `staging-carmen-owner-evaluation-grant.ts`. Any data deletion requires a separate owner decision.
- Not part of A (keep): `apps/os-api` QA "Ver como" (`qa.controller.ts`, `qa-synth-roster.ts`), `staging-wave2-role-fixtures*`, legacy `apps/web` `?demo=1` (only replays intro/tour, no populated data), `packages/database seed:demo` (legacy universe).

### 11.2 Artifact B — guided presentation / walkthrough, PRESERVE now, UPDATE in T20

- B1 Story Mode "Recorrido completo de ISALWA" (20 steps, `lib/demo/story-mode-steps.ts:56-309`): `components/demo/owner-story-mode.tsx`, `openStory` in `components/demo/owner-demo-provider.tsx:92-101`, launcher `components/demo/ver-ejemplo-completo-button.tsx` (`app-shell.tsx:295`), Ayuda button `components/walkthrough/walkthrough-help-panel.tsx:46`, `?story=1`. Confirmed by owner (11.0): the top tab and its step panel are kept; forcing demo mode and seeded deep links are removed.
- B2 First-use onboarding: `lib/walkthrough/*` (`copy.ts`, `progress.ts`, `persistence.ts`, `targets.ts`, `focus.ts`, `journeys.ts`, `chapters/global.ts`), `components/walkthrough/*`, `WalkthroughShell` (`app-shell.tsx:393`), Ayuda "Repetir introducción" / "Modo aprendizaje". `TOUR_TARGET` hooks are on ~25 real components.
- B3 Inline guidance `lib/guidance/*` (Ayuda sections, `GuidanceNote`) — real help copy; updated with B in T20 where claims change.
- Related evidence docs (kept): `docs/operations/onboarding-pass-2026-09-15/index.html` + `shots/`, `docs/experience/ONBOARDING_SYSTEM.md`, `docs/operations/ct3-owner-demo-completeness-2026-09-17/STORY_MODE_20_STEP_RECONCILIATION.md`.
- Legacy `apps/web` guided tour (`apps/web/src/components/guided-tour.tsx`, 9 steps with unproven AI/WhatsApp claims) is a separate app, not B; left untouched unless the owner says otherwise.

### 11.3 Shared code — separate before removing (T10/T11, first step)

- Split `OwnerDemoProvider`: presentation state (story open/close) stays with B; data mode/cookies/company switch go with A.
- Story steps become data-agnostic (route + target over real screens); seeded-id deep links and forced `datos=demo` are removed with A.
- Move generic helpers out of `lib/demo` before deleting it: `human-facing-copy.ts` (`presentHumanCopy`, ~25 real importers), `preserve-data-mode.ts` (`samePathQueryNavigation`, `isNavigableAppHref`); rename `lib/conversations/demo-suggestion-rules.ts` / `demoRecommendedReplyFor` (run on every conversation).
- `walkthrough-help-panel.tsx` imports `useOwnerDemo`: rewire to the presentation context.

### 11.4 Schedule and evidence

| Task | Work | Evidence |
|---|---|---|
| T10/T11 | 11.3 separation, then remove A (routes/params/cookies/switches/components/exclusive fixtures/substitutions); tenant from authenticated membership only | list of removed files/entry points; HTTP/browser: old `?datos=demo`, `?datos=demo&story=1`, demo cookies → no sample data, no auth bypass, no silent tenant; normal login opens the member's authorized workspace; shared real workflows (clientes, cotización/PDF, pedidos, finanzas, conversaciones) still pass |
| T10–T19 | B preserved; tests for Story/onboarding kept green | — |
| T20 | Update B steps/screens/navigation/button names/Spanish copy to the verified journeys (WhatsApp, human-reviewed AI suggestions, quotes/PDF, orders, payment reporting + Accounting verification, promises, follow-up); remove obsolete/unsupported claims; label unavailable integrations; screenshots from clearly identified synthetic data | walkthrough location + step → verified journey mapping |

Isolated test fixtures (`setDemoSeedIdMapForTests`, owner-demo guard tests in `packages/os-database`, `GUIDE_STORAGE_KEY` test) are preserved.

## 12. Authoritative commercial authority matrix (owner decisions 2026-10-16 19:19 and 19:30)

This section is the authoritative record for T03 onward. Where an older document disagrees, this section wins; the superseded sources are listed in §12.5. Code: `packages/os-contracts/src/operations-scopes.ts`, `packages/os-contracts/src/commercial-authority.ts`, `packages/os-commercial/src/commercial-command-service.ts`.

### 12.1 Coverage and conversion (19:30 item 1; supersedes BR-CNV-02 "coverage never converts")

An advisor converts a quote of a covered account (`CreateOrder`) only when all hold (`canConvertCoveredQuote`):

1. Coverage is active now for that account and its current owner (not ended, not revoked, same tenant).
2. Its `coveredActions` explicitly include `quote.convert`.
3. The advisor independently holds a conversion permission (`commercial.quote.convert.own` or `commercial.order.convert`).
4. The quote belongs to the current account owner and is eligible under the same status, line, approval and existing-order checks as any conversion.

Coverage alone never grants conversion. A grantor may delegate an action only if they hold its permission (`COVERAGE_ACTION_GRANTOR_SCOPE`): `quote.convert` needs `commercial.order.convert`, `customer.edit` needs `commercial.customer.edit`; `commercial.work` needs no extra scope. The order keeps the account owner as owner; the `order.created` event records the advisor as actor, `actingAdvisorMemberId`, `primaryOwnerMemberId` and `conversionPath: 'coverage'`. Coverage never cancels orders.

### 12.2 Reassignment and coverage administration (19:30 item 2)

`ReassignCommercialAccountOwner`, `GrantCustomerCoverage` and `RevokeCustomerCoverage` need BOTH `commercial.account.reassign` AND one assignment reach (`resolveAccountAssignmentAuthority`):

| Reach | Grant | Allowed |
|---|---|---|
| org | `commercial.assignment.org` | any account and any eligible active member in the tenant, including cross-team and unassigned accounts |
| team | `commercial.team.read` + current direct-report relation | account whose current owner is the actor's direct report, target (new owner or helper) also a current direct report |
| intake | `commercial.intake.assign` | only accounts with no owner (including a new account at `CreateParty`) |

`commercial.org.read` is read range only, never assignment reach. `commercial.account.reassign` alone reaches nothing (404 if the actor cannot know the account, 403 otherwise). On reassignment: active coverage on the account is ended (ids in `endedCoverageGrantIds`); quotes, orders and opportunities keep their recorded owner (sales attribution is not rewritten); the new account owner may continue pending records of the account; the previous owner loses access unless otherwise authorized. Queued customer actions do not exist yet (sends and reminders arrive in T09/T12); those tasks must recheck owner and coverage at execution.

### 12.3 Data-steward lookup (19:30 item 3)

`master_data.admin` locates and reads the fields it maintains through `GET /v1/master-data/parties?q=` (display or legal name only), `?nit=` (exact active NIT) and `GET /v1/master-data/parties/:partyId` (identity, legal name, status, roles, fiscal identities). No contacts, phones, locations, account owner, conversations, quotes or payments. Commercial reads still need commercial range; no commercial action follows from this access. Legal/fiscal edits stay separate from ordinary commercial edits (`legalName` only under `master_data.admin`).

### 12.4 Managers (19:19)

Unchanged from §10.1: action permission AND current range; `commercial.team.read` / `commercial.org.read` alone are read-only; no `people.admin` / `master_data.admin` override.

### 12.5 Superseded or reconciled sources

| Source | Statement | Status |
|---|---|---|
| `docs/operations/ct3-owner-demo-completeness-2026-09-17/v1-canonical-consolidation/CANONICAL_BUSINESS_RULE_REGISTER.md` BR-CNV-02 | "Temporary coverage grants automatic Quote conversion = NO" | Still true for automatic conversion; refined by §12.1 (explicit delegated conversion). Dated note added in the register |
| same register BR-COV-02/03, BR-REA-01/02 | Jefe Comercial / Gerente General assign coverage and reassign | Refined by §12.2 (reach required) |
| `docs/architecture/QUOTE_CONVERSION_AUTHORITY_DECISION.md` | "any active coverage → allow" | Superseded by §12.1; dated note added |
| `final-rc-evidence-0268843/FINAL_V1_REQUIREMENTS_RECONCILIATION.md` D02, RC2–RC4 "coverage cannot convert" evidence | historical evidence | Not edited (historical); superseded by §12.1 |
| commit `2a4c969` code and the tests named in `receipts/T03.md` §7 | coverage never converts | Replaced in T03 part 3 |
| `docs/product/COMMERCIAL_RELEASE_V2.md` line 121 ("propietario/cobertura explícita/convertidor autorizado") | — | Consistent with §12.1; not edited (byte copy of the contract) |

### 12.6 Migration impact (grants inspected in this repo; no real grants changed)

| Grant source | Holds | Effect of §12.2 |
|---|---|---|
| `v1-planned-assignments.ts` | `commercial.account.reassign` is in `V1_UNASSIGNED_CAPABILITIES` (no planned real holder) | none |
| `staging-carmen-owner-evaluation-grant(-spec).ts` | reassign + `commercial.org.read` | loses org-wide reassignment until `commercial.assignment.org` is added; not added here (staging change, gated) |
| `staging-carmen-synth-demo-scopes.ts` | reassign | same |
| Wave 2 fixture seed (`packages/os-database/src/staging-wave2-role-fixtures.ts`, `w2.fixture-seed`) | `master_data.admin` + reassign; moves steward-created (unassigned) accounts to the asesor | needs `commercial.intake.assign` (narrowest) or `commercial.assignment.org`; not changed here |
| `apps/os-web/lib/qa/access-matrix.ts` `commercial-reassign` row | QA label "Autorización commercial.account.reassign" | label only; describes the action scope, reach not shown. Update with the T10 admin surfaces |
| Hosted databases | unknown | UNVERIFIED: staging/production grants were not inspected (staging access forbidden in this lane) |

