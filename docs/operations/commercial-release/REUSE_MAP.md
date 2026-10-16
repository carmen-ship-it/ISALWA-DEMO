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
