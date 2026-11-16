<!-- Provenance: copied 2026-11-16 from /Users/carmen/Downloads/ISALWA_CURSOR_CONTINUATION_2026-11-16.md by integrator on ct3/v1-repairs @ aada5396. Carmen authorized local execution of the work this document specifies. -->

# ISALWA — continuation instructions for the commercial-release integrator

Prepared 2026-11-16 from Carmen's recovered handoff and the preserved V2, A1 and A2 specifications. This is an execution instruction, not evidence that any task has already passed. Carmen is to give this entire document to the Cursor integrator.

## 1. Your assignment and the outcome

Continue our existing ISALWA implementation. Do not start a new app, replace the design, or reconstruct the project from an old GitHub main branch. You are the implementation and integration lane. Carmen's engineering counterpart supplies this direction; you make compatible implementation decisions and prove the resulting behavior.

The objective is a usable Spanish-language commercial system for ISALWA staff. An advisor must be able to open their work, recognize or register a customer, understand the previous interaction, prepare a quote, obtain any required approval, issue the exact document, record the customer's acceptance, create the order, report a payment, and leave an accountable next step. An authorized colleague can continue without losing context. A manager can manage work within their actual authority. Accounting verifies reported funds. Routine corrections must not require an engineer.

Deliver two clearly distinguished outcomes:

1. **Usable evaluation candidate:** the actual application, real persistence and authorization, synthetic evaluation records, complete manual commercial journeys, honest connection/configuration states, and a reproducible demonstration. This must not be a clickable mockup or restoration of the deleted full-app demo switch.
2. **Live pilot readiness:** the same application plus independently reviewed release evidence, approved business data, configured real identities and responsible staff, verified providers, operational recovery, and explicit activation authority. Do not label the first outcome as the second.

Development, appropriate local tests, bounded local commits, contract documentation and release preparation within the existing V2/A1/A2 scope are authorized by this instruction. Continue sequentially without requesting routine approval after each task. Missing external dependencies block only the affected capability. Do not abandon an essential incomplete journey and then call the parent release finished.

## 2. Recover the current state once, preserving it

Operate on the Mac, in this existing worktree:

- Worktree: `/Users/carmen/projects/isalwa-wt-v1-repairs`
- Branch: `ct3/v1-repairs`
- Last recovered committed HEAD: `aada53963fce921a51faf22ed0b1230e436b45d9`
- Customer UI integration: `c1c185ec`; its recorded integration checks were 1331 web tests, typecheck and production build.
- Disposable Postgres: the existing local server on port `54329`, last reported under `~/.isalwa-disposable-pg/commercial-v2`. Verify it and use a named disposable database. Never default to port 5432 or a hosted URL.

The recovered working tree already contains unfinished **Stage A customer finishing**. Preserve and finish it. The report identifies about 25 application files, an untracked `use-preserved-form.ts`, seven modified generated Prisma client files, `.tmp/stage-a/`, and screenshots under `docs/operations/commercial-release/evidence/STAGE-A-CUSTOMER-FINISHING/`. The previous logs report 1340 web tests and 20 HTTP checks, but a mutation/filter run failed. Those logs are leads, not proof of the present bytes.

Start with repository identity, HEAD, status, relevant diff and active-writer/process checks. Record the starting file list and hashes, including untracked application files, in a private local recovery manifest. Preserve a local patch/copy of the affected unfinished source before changing it; exclude secrets and unrelated work. Do not make a second full repository/dependency copy merely for preservation.

If HEAD is unchanged, resume there. If it is an attributable authorized descendant, reconcile the checkpoint and commits before proceeding. If provenance is unknown, the branch is different, or another writer owns the same files, stop affected mutations and report the exact discrepancy. Never reset to this historical SHA.

Do not reset, stash, clean, force, rewrite history, delete chats/worktrees, or stage everything. Preserve unrelated dirty files. Determine what the seven generated Prisma changes actually contain before any deliberate generation policy; do not blindly discard them or commit machine-path noise. Validate the generated client used for testing against the current schema. Application source is in `apps/os-web`, `apps/os-api` and `packages/os-*`; the separate `apps/architect` interview application is not the commercial app.

## 3. Load the existing plan, decisions and evidence

The recovered report says the plan exists on disk. Missing chats do not mean missing specifications. Read these in the integrator worktree:

1. `docs/project-memory/START_HERE.md` and applicable repository instructions.
2. `docs/operations/commercial-release/COMMERCIAL_RELEASE_CHECKPOINT.md` and `LANES.md`.
3. `docs/product/COMMERCIAL_RELEASE_V2.md` — including its later usability, security, operations and evidence sections, not just T00–T20.
4. `docs/product/COMMERCIAL_INTERACTIONS_A1.md`.
5. `docs/product/COMMERCIAL_SELF_SERVICE_A2.md`.
6. `docs/operations/commercial-release/REUSE_MAP.md`, especially current authority §12 and execution amendments §13.
7. `docs/operations/commercial-release/contracts/T03-CUSTOMER-UI-CONTRACTS.md` and `T03-LIFECYCLE-CONTRACTS.md`.
8. `docs/operations/commercial-release/receipts/ACCEPTANCE-LANE-B-T03-CUSTOMER-UI.md`, the customer UI independent-review report, integration receipt, and the receipts for the files Stage A changes.
9. `docs/operations/commercial-release/TRANSFER_CLEARANCE.md` and the hosting/exit records when preparing transfer or deployment.

`docs/project-memory/CURRENT_STATE.md` was reported stale at October 17. Do not let that snapshot override the newer checkpoint and source. Find moved documents with bounded filename searches, not by demanding Carmen recover deleted chats.

For historical reconciliation use the indexed takeover and interview-recovery packages already on the Mac. Locate their exact paths from `docs/project-memory/SOURCE_INDEX.csv` and the handoff folders. Relevant records are the original kickoff, Architect purpose, commercial-first instruction, Isa relays, and the recovered interview text. Do not rescan all projects or all chat databases. `SPECIFICATION_CORRECTIONS.md` was reported absent; that does not block Stage A where current contracts cover the requirement.

Authority order: specific dated Carmen amendments to a requirement; the reconciled current authority/contract records embodying those amendments; A2/A1 additions on their subjects; V2; older design material. A summary or legacy implementation is not a new business decision. Verify the cited amendment when a conflict matters. If the source is genuinely contradictory about a business policy, record the competing text and block that policy only. Do not invent a precedence rule to grant access.

Save this instruction as `docs/operations/commercial-release/CONTINUATION-2026-11-16.md`, with its provenance. Make a compact `COMMERCIAL_JOURNEY_READINESS.md` linking current requirements, routes, commands, permissions, evidence and blockers. Reuse the existing checkpoint; do not introduce another competing task system. Keep historical specifications and receipts intact.

## 4. Understand how the product evolved, without repeating the mistakes

The earliest project was a broad CRM/business-OS demo, including a map. Architect was a separate discovery tool. Later operations work added production, purchasing and dispatch concerns. Carmen then explicitly made the connected commercial journey the delivery priority. Preserve useful operational work and its records; do not expand this release into a full manufacturing or accounting rewrite.

Preserved Isa evidence supports advisor registration of customers, one account owner with authorized colleagues able to attend, team visibility for the commercial manager, advisor quote-to-order work with permission, and approval of special pricing exceptions by authorized commercial management. The relayed operations evidence distinguishes customer delivery dates from internal targets, permits mixed-method payments, and describes mixed production batches. It does not justify universal prepayment, automatic manufacturing per order, or unrestricted technical powers for managers.

Álvaro's original answers were not recovered in the available packet. Do not relabel an agent blueprint, a confidence score, or an assumed number of WhatsApp lines as his words. Keep interview evidence, Carmen decisions and engineering defaults visibly distinct.

Correct the previous process failures:

- A backend command is not a finished feature until the intended user can reach and complete it.
- Hiding a button is not authorization; permission tests must also prove the legitimate actor succeeds.
- A test count, screenshot, merge or build does not prove a commercial journey.
- Do not introduce unapproved business defaults to remove a blocker.
- Do not let repeated reconstruction, receipts or a broad overnight batch replace a completed, tested unit of behavior.
- Separate local implementation, review, hosting, provider activation and human acceptance.

## 5. Execution method and work ownership

Use one active application writer. Work in bounded batches with one user outcome each. For each batch:

1. Name the user, trigger, expected outcome, governing requirement, data affected and external effects.
2. Inspect existing code and reuse the relevant models, commands and components. Write a concise interface/state mapping if the contract is missing; implementation details consistent with the approved behavior do not need another business approval.
3. Implement all necessary parts of that batch: API, storage, authorization, UI, recovery and relevant tests. Do not knowingly leave the button unwired and call the task done.
4. Verify positive and negative cases on the exact final source. Save a bounded receipt, commit explicit files locally, and update the current checkpoint.
5. Produce a pinned independent-review packet when needed, then continue with the next independent authorized batch. Review pending is not review passed. A later review may require repairing a completed implementation batch.

Use original Txx/Cx/Lx IDs in the readiness map. The sequence below groups them into usable journeys; it does not erase their remaining requirements. Completing demo removal did not automatically complete every original T10/T11 requirement.

Do not silently turn yourself into the independent verifier. Prepare source and requirements for a separate Claude/Codex/reviewer identity. If no reviewer is active, queue the packet and continue local work that does not require that verdict. Auth, shared interfaces, migrations and governed-data changes require review of their affected boundaries, not only the changed lines.

Frozen lane candidates stay unchanged. Review fixes go on a follow-up branch/worktree with explicit ownership. The integrator may integrate a candidate locally after its required independent review, blocking fixes and relevant combined checks. Never merge an unreviewed frozen candidate to make a deployment appear newer.

Keep resource use low: one build/test job at a time, no duplicate dependency installs when existing isolated tooling works, no broad load test while Carmen's Mac is under pressure. Stop only the servers you started when no longer needed; preserve the shared disposable Postgres. Do not perform unrelated disk cleanup.

## 6. Batch 1 — finish the existing Stage A customer work

Finish the recovered dirty changes before T04. Inspect the existing implementation first; preserve working parts.

Required acceptance follow-ups:

- **Archived customers:** API authority flags must agree with command eligibility. Do not offer actions the server invariably refuses. Preserve authorized history access and the explicit reactivation path. UI checks supplement server enforcement.
- **Former contacts:** do not offer phone change, retirement or identity resolution for an ended relationship where the domain refuses them. Preserve the person, other valid relationships and authorized history.
- **Legal names:** show/read/edit only under the current field-level authority. All entry points, including the drawer, use the same server-derived flags.
- **Forms:** preserve entered values after validation/network errors; prevent accidental double submit; display actionable field errors. Optional notes shorter than an existing minimum must say what is required, not just “Revise los datos…”. Do not weaken the domain rule to hide the error.
- **Correction requests:** a failed or forbidden correction load must never fall through to the generic issue-resolution form. Show a retry/unavailable state appropriate to the response; do not expose the proposed value without permission.
- **Relationship preview:** use existing Spanish status labels and `es-BO` dates in `America/La_Paz`. No raw enum or ISO string as ordinary staff copy. An absent historical end date says “Sin fecha registrada”; never manufacture it from import time.
- **Coverage:** show every authorized active/scheduled grant, resolved member labels, actions, dates and individual revoke capability. Retain the required end date and the recorded 30-day engineering limit. Do not reintroduce the single-grant display.
- **Duplication/performance:** reuse one name-edit form. Remove avoidable per-contact request cascades using bounded authorized bulk reads, without returning fields or contacts the actor cannot read.
- **Regression tests:** add meaningful archive/reactivate payload tests and authorized/denied UI/action cases. Verify current follow-up preference reads and changed customer/issue endpoints.

Investigate `.tmp/stage-a/mutation-party-filter.txt`: establish whether the failure was a surviving mutation, faulty harness, baseline failure or infrastructure error. Restore any mutated source and verify hashes. Do not report mutation success without the intended test demonstrably detecting the deliberate defect. Do not bypass an approval rejection by moving the same script.

Reproduce appropriate API/Postgres tests, the web suite, typecheck and production build. Browser-test actual successful submissions and refusals with synthetic owner, coverage editor, work-only helper, steward, reader and authorized manager. Include archived/former records, stale versions and a second tenant. Check persistence after reload and at least one second authorized user view. Previous screenshot-only visibility checks are insufficient for these actions.

Write `receipts/STAGE-A-CUSTOMER-FINISHING.md`, source identity and bounded evidence, commit the actual changes, and update the checkpoint. Keep the broader T03/backend review queue open.

## 7. Batch 2 — finish customer entry and everyday self-service gaps

Verify the T03 receipt backlog against current source; implement only remaining deltas. Required journey: search → resolve a possible match safely → register a permitted customer/contact → open Cliente 360 → correct data or request correction → reload with history and permissions intact.

Use `/clientes` and the existing registration drawer. Labels: “Clientes”, “Registrar cliente”, “Buscar por nombre, teléfono o empresa”, “Editar datos”, “Guardar cambios”. No NIT or email requirement merely to handle an inquiry. Use the canonical phone/country normalization and endpoint-history boundary already built. Shared or recycled numbers must not auto-merge identities or disclose an old customer's history. All phone and WhatsApp entry points, including import, obey the same contract.

Preserve C1–C9/L1–L4 semantics: every name change needs a reason; exact no-op has no new version/event; contact retirement and justified reveal use their dedicated controls; relationship end preserves the person; follow-up and identity choices are explicit, not prechecked; archive/reinstate obey current obligations; correction “Applied” cites the matching committed field change. A request never writes through a generic field editor.

Import/export must be bounded and authorized. Reuse the existing batch pipeline and approved input contract. Show accepted rows, errors, duplicates and rejected/omitted phones before confirmation; never silently discard invalid numbers. Support the documented format, not an invented spreadsheet integration. If a file-to-batch UI or parser remains missing, record and implement the bounded contract supported by existing code/spec; do not present `?lote=` for a pre-existing batch as complete file import. Formula-safe exports use current record/field permissions. No real customer import during local development.

Archive checks must include payments once T07 exists. Until an obligation source cannot be evaluated, report it as unknown and apply the approved conservative rule; never equate an unwired module with zero obligations. Recheck this dependency when later batches land.

## 8. Batch 3 — quotes, approval, immutable PDF and manual order creation

This is T04 plus the provider-independent part of T15, using A1's clarified lifecycle. Extend existing opportunity/quote/order models. No separate Sale entity and no parallel approval system.

Complete the manual journey even while WhatsApp is disconnected:

1. From Cliente 360, “Preparar cotización” opens the existing editor with customer/context carried through.
2. Select a product or the supported “Ítem especial”; enter explicit unit, quantity, price and discount. Store money in integer minor units and use one documented existing rounding rule. Do not invent taxes or commercial pricing formulas.
3. “Guardar borrador” persists without issuing or sending. Missing approved price basis permits a draft and the approved exception route, not an unapproved offer.
4. “Solicitar aprobación” works before issue/presentation. Resolve eligible approvers using current action authority and range. The requester cannot appoint an arbitrary member or approve themselves.
5. Approval binds the exact material terms and revision. Quantity/product/price/discount/customer/validity/terms changes invalidate affected approvals and prepared sends. Test the binding at issue, enqueue/send and conversion. Do not leave the legacy “submit then approve” sequence intact under new labels.
6. “Emitir cotización” creates an immutable version/document with a concurrency-safe number. Issue is separate from send. Record version, snapshot and document hash; recover generation failure without claiming a missing PDF exists.
7. “Descargar PDF” retrieves that exact authorized artifact. It does not mark sent, delivered or accepted. Include discount, units, totals, explicit validity and approved issuer fields. No invented bank details, guarantee or legal terms. Customer/catalog edits must not rewrite an issued PDF.
8. “Registrar aceptación” records the exact quote/version, actual channel/date and human-entered evidence. A delivery/read receipt or an ambiguous “ok” is not acceptance. Expired or superseded terms require clarification/review.
9. “Crear pedido” rechecks current conversion authority, valid approval, exact acceptance and version. Duplicate click/retry/concurrent conversion produces one order. Ownership and actor attribution follow the current matrix. No implicit dispatch, production or payment confirmation.

If a human shared a document outside the provider integration, an explicit manual-send record may record that human declaration with channel/time/evidence. It must not claim provider delivery. Acceptance by phone does not require inventing a WhatsApp send.

Approval thresholds and the real first approver are not yours to invent. Use the reconciled matrix and approved case-by-case exception policy. If the real approver identity is missing, test with an explicitly synthetic eligible member and keep real activation blocked. Do not assign Carmen automatically. Preserve the later decision allowing conversion through explicit active `quote.convert` coverage plus the actor's conversion permission; ordinary work coverage is insufficient. Account reassignment must not invent sales attribution.

Prove draft persistence, self-approval refusal, unauthorized approver refusal, stale approval rejection, concurrent numbering, exact PDF content/hash, manual acceptance and single order creation through UI plus HTTP/Postgres. Record actual persisted transitions, not just button clicks.

## 9. Batch 4 — integrate a trustworthy catalog, without fabricating missing facts

Lane A's original source candidate is `18a0f0c25dd93d6916288261d993ccf4a3c0e355`, with disclosure `c8724702189b5626facae3ee6f8eb317e1228648`. The catalog-fixes branch was reported still at that base. Confirm current identity; do not repeat or erase newer attributable work.

Use the lane assignment/packet and a follow-up branch for these contained fixes:

- Accent-insensitive search across query and searchable text: “cádiz”, “cadiz” and “CÁDIZ” match.
- Product sheets display business/document provenance, not repository paths, JSON paths or internal array notation.
- Product sheets show “Precio por confirmar” when no approved price exists, without duplicated labels.
- Expose/use the package's public exports; add the appropriate workspace dependency through the integrator if needed, preserving the lockfile's consistency.
- Show the product name in breadcrumbs.
- Enforce the publication/source-verification gate in `automaticAnswerFields`; missing PDF verification or contradictory content cannot become authoritative automatic replies.

Preserve stable IDs, historical aliases and saved quote lines. Preserve all 29 mapped historical starter keys; do not equate that count with a verified count of distinct active SKUs. Resolve actual source contradictions only from evidence.

`CatalogoVitriCompleto2026.pdf` and approved current prices were reported missing. Search the indexed handoff locations once; if still absent, do not invent pages, specifications or prices. Existing reviewed JSON may support a clearly qualified internal preview. Do not claim full PDF validation, publish unknown facts, or enable “Compartir catálogo” without the approved artifact. Continue the other journeys.

Obtain the required independent review before integrating the catalog candidate and fixes. Then test “Agregar a cotización”, old aliases, active filtering, saved-line stability and mobile/product detail. An unreviewed candidate remains a tracked dependency; other authorized batches can continue.

## 10. Batch 5 — durable conversations and manual attention

Complete T06 and the remaining T10/T11 interaction requirements using `/conversaciones`, existing conversation models and the common commercial forms. Do not create another inbox at `/mensajes`.

“Registrar atención” must work without an external provider. Fields: channel [Llamada, Visita, Atención presencial, Registro manual de WhatsApp], customer/contact, date/time, reason, required note, optional next step with responsible member/date. Save through real commands. Do not fake a WhatsApp delivery or create an unlinked second customer. Save promised related work atomically or expose a recoverable partial outcome; no success message losing the next step.

Inbox filters: “Todos”, “Sin asignar”, “Mis chats”, “Por responder”, “Seguimiento”. Search: “Buscar cliente, teléfono o conversación”. Preserve filters, selection and scroll. An assigned conversation, account owner and commitment owner are separate concepts. “Tomar conversación” has one winner under concurrency; assigning a chat never silently reassigns the account.

Attention states use the approved mapping: “Nueva”, “En atención”, “Esperando al cliente”, “Esperando al equipo”, “Resuelta”. AI state is separate. Human takeover pauses automated replies. Reopen on new inbound according to the contract. Keep a usable authorized unassigned queue rather than assigning to Carmen by default.

Composer modes “Mensaje” and “Nota interna” must never share an outbound execution path. Internal notes show “Solo equipo”. Preserve drafts and context after errors. For an unconfigured provider, explain “WhatsApp no conectado” and keep manual attention available; do not give an enabled send button that reports fake success.

Before exposing private context, enforce identity/link validity, receiving line, current account/coverage scope and tenant. A new, shared, recycled or retired number does not automatically inherit old history. Complete relationship-end previews and queued-recipient invalidation when outbound intents exist; do not redirect an old queued message to a newly edited number.

## 11. Batch 6 — reported payments and Accounting's real work queue

Complete T07/A1 in the existing domain structure and `/finanzas`. This is operational payment reporting and human verification, not bank integration, tax invoicing or a new accounting ledger.

“Registrar pago reportado” accepts customer, optional order, BOB total, date, multiple tenders, references and private evidence. Tender amounts must be positive and sum exactly to the report. The synthetic QR 200 + cash 1070 = 1270 case must work. Cash has a known authorized recipient or an explicit unresolved-recipient reason.

Each tender needs its own verification outcome; QR and cash can be checked at different times. Derive the report's aggregate from those outcomes and confirmed amounts. Use a documented state mapping; do not overwrite a mixed payment with one misleading “confirmed” flag. No confirmation from an uploaded image, OCR or customer assertion.

An explicitly authorized Accounting member sees the scoped “Por verificar” queue, opens evidence, and confirms/rejects the specific part with required reasons. Advisors report and read permitted outcomes, but cannot confirm. Ensure Accounting has the necessary scoped customer/order reads to do this job without granting organization-wide unrelated access.

Anticipos and assignments preserve source amounts: explicit allocation to one/multiple orders of the same customer/tenant, no over-allocation, remainder shown as unassigned. No automatic assignment to the most recent order. Correction of confirmed funds uses authorized reversal plus a linked replacement, never historical overwrite. No actual refund execution.

Approved QR/bank instructions are separate versioned public configuration with the A1 publication authority and distinct approver. Do not use a developer's account or an inbound image as ISALWA's payment destination. If absent, display “No hay instrucciones de pago aprobadas para compartir”. Changing/retiring a destination invalidates unsent instructions.

Test partial verification, duplicate report/retry, simultaneous verifiers, rejection/reversal, allocation limits, private evidence, owner notification and reload. Reconnect these obligations to customer archive checks. “Pagos registrados en ISALWA” must not be presented as a complete accounting balance.

## 12. Batch 7 — commitments, issues, follow-up, handover and notifications

Complete T08/T09 against existing commitments/issues/work/notification infrastructure.

- “Crear compromiso”: description, customer/context, responsible active member, explicit date/time and source. Store UTC; display La Paz. A promised customer date is distinct from an internal production target.
- Actions: “Marcar cumplido”, “Cambiar fecha”, “Reasignar”, “Cancelar compromiso”. Require the existing reasons/evidence; preserve prior deadlines and actors.
- “Reportar problema” produces a durable assigned issue or authorized queue entry. Resolution records the result; it does not imply the customer was notified.
- Follow-up is an internal suggestion after the configured business interval, or “48 horas transcurridas” where the approved calendar is absent. New inbound, resolution or a chosen next date cancels stale suggestions. No unsolicited automatic follow-up message.
- Notifications must reach the actual current responsible person/queue, with deduplication and current read authority. Read, acknowledged and resolved are separate. Opt-in sound does not ring in every tab. Email remains disabled until its sender and recipients are authorized.
- A suspended member loses access immediately; unresolved work remains visible in an authorized reassignment queue. If a legacy suspension rule still blocks access removal because work exists, treat it as an A2 gap, not approved behavior. Preserve current delegation/coverage revocation rules and do not silently restore access on reactivation.
- Role changes, absence coverage and reassignment need usable allowed paths, not a demand that the manager become a technical administrator. Keep production/warehouse/purchasing reassignment blocked where authority is still undefined; do not invent it as part of commercial completion.

Test clocks, restarts, completed/cancelled work, reassignment, suspension, expired coverage, stale notification delivery and two tenants. Complete the “next person sees and can act” part of each journey.

## 13. Batch 8 — trustworthy home screen, map and consistent design

Reuse the existing shell and `@isalwa/ui` components. No new visual framework, CRM, duplicate forms or redesign of Architect.

Navigation: Hoy `/inicio`; Conversaciones `/conversaciones`; Clientes `/clientes`; Comercial containing `/oportunidades`, `/cotizaciones`, `/pedidos`; Catálogo `/productos`; Mapa `/mapa`. Operational and administration areas remain secondary and permission-controlled. Preserve deep links and the existing Journey audience independently of removed demo mode. Rewrite Journey steps only to behavior actually demonstrated; never change company or create sample data when opening it.

Use existing semantic tokens with these V2 values:

| Element | Value |
|---|---|
| Background / work panels | `#F6F1E8` / `#FFFFFF` |
| Primary text/action / hover | `#18324B` / `#12263D` |
| Context action / hover | `#287A78` / `#1D635F` |
| Selected / AI context | `#E2F0ED` / `#EDF5F8` |
| Secondary text | `#4A5D73` |
| Confirmed text/background | `#3A7A52` / `#E7F4EC` |
| Pending | navy text, `#B8872E` icon, `#FFF5DB` background |
| Error text/background | `#A63D36` / `#FBE9E7` |

Use 44px controls, visible teal focus, persistent labels, 16px field text, 13px metadata, existing font, 8px control/16px panel radii, 16px mobile/24px desktop panel padding. Verify effective contrast; never use color as the only signal. Desktop drawers up to 560px, mobile full-screen. No nested drawers or footers covering errors. Reuse one form across customer, conversation and list entry points.

Hoy title/subtitle: “Hoy” / “Tu atención y tus próximos compromisos”. Show actual scoped pending conversations, overdue/today commitments, pending quotes, permitted payments and assigned approvals. Use “Mi trabajo”, “Mi equipo”, “Empresa” only where authorized. Each row opens the exact actionable record. Empty is “No tienes pendientes en esta sección”; failure is “No pudimos cargar estos datos. Reintentar”. Never convert a failed query into a zero metric.

Cliente 360 uses existing tabs Resumen, Comercial, Operación, Trabajo, Documentos, Historial. Above the tabs show the actual next step, owner, last attention and open issues, with honest absent/error states. Do not add a redundant payment tab. Preserve paginated history and historical documents.

Map title: “Mapa de clientes”. Only confirmed valid coordinates produce pins. Otherwise show “Pendiente de ubicación” in the accessible list. No phone geolocation, fabricated centroids as customer addresses, employee tracking or route optimizer. Filters/counts respect the same visibility as customer reads. Use the existing configured map adapter; missing provider credentials do not justify a new paid service. Do not equate quote value with sales or confirmed funds.

Consistent error copy:

- “No pudimos guardar los cambios. Tus datos siguen aquí.”
- “Este registro cambió mientras lo editabas. Revisa la versión actual antes de guardar.”
- “Tu acceso cambió. Esta acción no se realizó. Solicita ayuda a tu responsable.”
- “Tu sesión terminó. Inicia sesión para continuar.”
- “No pudimos confirmar el envío. Revisa el estado antes de reenviar.”

Use these only when true; unknown save outcome requires reconciliation, not a false “not saved”. Keep sensitive draft state out of localStorage, URLs, public caches and logs. On logout/account switch purge client-private state. Do not replay a mutation automatically after login.

## 14. Batch 9 — providers and AI, without blocking manual work or fabricating connection

Implement the approved T12–T14 adapters/policies locally as dependencies become available. Read the current official provider documentation when implementing external protocols; pin the relevant version and record it. Do not substitute a retired SDK or rely on remembered pricing/policy.

WhatsApp: verified webhook signature, tenant resolved from trusted connection, idempotent message ingestion, safe status reordering, private attachment handling and transactional outbound intent/outbox. Recheck current actor/resource authority, recipient-link version, quote/payment-instruction version and provider policy before sending. Distinguish queued, sent, delivered, read, definitive failure and unknown outcome. Unknown timeout is not permission for blind retry. Human takeover and opt-out must cancel prohibited pending automation. No real business-number migration or messages without the specific activation authority.

Media: follow V2/A1 permitted types/limits and private-storage rules, validate content and size, prevent arbitrary URL fetch/SSRF, and use authorized short-lived downloads. Do not call MIME checking antivirus. If required security inspection is unavailable, quarantine the affected upload and record the dependency. PDF generation/download may be tested locally without pretending a provider delivered it.

AI: reuse the existing assist/proposal pipeline. Implement deterministic published-public-knowledge replies A01–A22 and human-reviewed proposals H01–H09 from V2/A1, preserving their exact texts and applicability. Do not invent new customer claims. Persist a handoff/request before saying it was registered. Human request takes priority; takeover pauses automation. Public knowledge must be approved, published, current and tenant-scoped. No retrieved internal note in an automatic public reply.

Generative output may suggest data, summary, draft quote, payment-report candidate or possible acceptance. It cannot approve a price, confirm payment, decide identity, grant permission, create a final order or promise stock/delivery/credit. Human acceptance uses normal currently authorized commands and version checks. Prompts and uploads are untrusted data. No unrestricted tools or internet in the business-answer path.

Use the plan's approved/configurable cost controls and existing provider configuration. Missing key, budget, model selection or quota leaves the affected integration off; local tests use explicit test doubles labeled as such. No purchase or new paid API calls are authorized by this prompt. Manual workflows remain usable when provider/AI is unavailable.

## 15. Security and data invariants throughout

Apply the current reconciled authority, including these established decisions:

- Managers need current range plus the specific action permission. A title, `people.admin`, `master_data.admin` or organization membership is not universal commercial power.
- Team/org read is not write authority. Manager work does not silently transfer account/record ownership.
- Coverage has bounded dates, explicit actions and independent grantor authority. Ordinary work coverage cannot convert, archive or reactivate. Explicit conversion coverage still needs the actor's separate conversion permission.
- Account reassignment respects the team/org/intake scope rules and ends applicable active and scheduled grants. Preserve historical sales attribution.
- Delegations require a currently active authorized grantor and current dates; suspension/termination/reactivation rules already repaired must remain effective.
- Steward identity/fiscal lookup is not a route to contacts, conversations or commercial control. Delegated stewardship obeys its current contract.

Use authenticated tenant/actor context server-side. Test record, relationship, field and action access on list/detail/search/count/history/export/PDF/media, replay, caches, jobs and provider paths. All linked IDs must belong to the permitted tenant/resource relationship. Forbidden responses cannot disclose private existence or replayed historical result bodies after authority is lost.

Use existing optimistic concurrency and idempotency. Validate request schemas, CSRF/session behavior, CORS, private cache behavior and output escaping. No generic admin column editor. Money, rights and external effects must have explicit command boundaries. Persist applicable event/outbox/audit writes atomically; do not describe a failed partial operation as successful.

Migrations are additive/compatible unless an explicit reviewed contract requires otherwise. Apply only to the named disposable database during development; verify the actual migration list, not a remembered count. A dirty old template is not permission to reset shared data. Never use development login or a hand-crafted session as a hosted authentication shortcut.

## 16. Prove the usable system with complete journeys

Maintain one matrix, with exact tested SHA/tree, configuration, actors/tenants, inputs, UI actions, requests, persisted result, downstream user's view and failure behavior. Required local evaluation journeys:

| Journey | Minimum proof |
|---|---|
| New inquiry | Manual attention → match/register customer → next step → reload, no duplicated customer |
| Existing inquiry | Find previous context as allowed role; unrelated advisor/tenant cannot read it |
| Quote | Draft → independent authorized approval when required → immutable issue/PDF → recorded manual acceptance → one order |
| Quote correction | Material edit invalidates approval/send; old PDF unchanged; stale/expired acceptance cannot create order |
| Payment | Mixed report → different tender verification times → correct staff queue/outcome → safe allocation/reversal |
| Commitment | Due/overdue → notification → reassignment/reschedule → completion; history/restart preserved |
| Customer correction | Reason/version/history; phone retirement and recycled identity; relationship end; correction request with matching resolution evidence |
| Archive/return | Open obligations block or remain visibly managed as contracted; reactivation does not restore obsolete consent/coverage |
| Absence/exit | Current coverage works; expiry/suspension cuts access; authorized queue retains pending work |
| Navigation | Context and entered values preserved; deep links, back, mobile keyboard, paging and errors usable |
| Isolation/recovery | Other tenant, read-only role, revoked session, replay, races and partial failure produce no unauthorized data/effects |
| Provider/AI | Local policy tests labeled local; real provider send/receive and model behavior only claimed when actually exercised with authorization |

Use synthetic roles and two tenants. Cover account owner, authorized coverage editor, work-only helper, manager with action+range, read-only manager, outside-team manager, steward, Accounting, suspended user and foreign-tenant actor as applicable. Include positive cases; a system that refuses everybody is broken.

Browser tests must submit the forms, observe the saved result after reload, and check relevant other-user visibility. Screenshot visibility alone is not completion. Check 390px/1440px, critical forms at 320px/768px and 200% zoom, keyboard/focus and ordinary low-connectivity failures. Simulate failures in tests, not on real services.

Run meaningful targeted tests per change, affected suites, typechecks and builds. At milestones run the combined relevant suites serially. Preserve unexplained failures with test name/output/configuration; investigate rather than rerun until green. Demonstrating a baseline flake does not establish its cause. Never weaken an assertion simply to make the count pass.

For a milestone, hand a separate reviewer the requirements and pinned source, then evidence with a clear builder/verifier distinction. Review must cover the affected backend/authorization boundaries too; the earlier UI review did not independently clear C1–C9/L1–L4. Fix blockers and re-review affected boundaries. Keep source-only, independently executed tests and browser results distinct.

Human usability acceptance remains human: give the evaluator tasks without coaching each click. V2 targets include finding a conversation/next step within 30 seconds, a pending commitment within 20 seconds, and recording simple existing-customer attention within 90 seconds. These are evaluation targets, not customer SLAs. Prepare the task script and record assistance needed; do not fabricate a human PASS.

## 17. Vercel evaluation and launch preparation

Carmen intends to leave Render and use her existing personal Vercel account `carmen-ship-it`. Reuse that identity/access when available; do not recommend paying Render as the default or buy an alternative host. Do not delete Render resources or discard its database based on an older claim that it was all synthetic. Recovery/retention and stopping charges are separate decisions with exact resources and consequences.

Prepare the deployment against the newest reviewed integrated source, not GitHub main and not the older cleared `44958998` export. The commercial app is `apps/os-web`, not `apps/architect`. Inventory current account/project/configuration before changing it; historical “zero projects” is not current proof.

The Vercel web deploy alone does not establish an API, database, private documents or functioning worker. Inspect the actual API/worker runtime and document the smallest compatible deployment using existing authorized resources. Verify current official platform restrictions and free-tier suitability for this specific evaluation; calling a business app a demo does not automatically settle hosting terms. Do not force a long-running worker into an unsuitable function, remove durable jobs, invent an always-on Mac backend, or undertake a platform rewrite merely to claim “all free”.

Produce a concrete release manifest: source SHA/tree, export hash, proposed account/project/environment, web/API/DB/auth/storage/worker destinations, required environment-variable names, migrations, synthetic seed mechanism, redirect/CORS/cookie settings, provider-disabled controls, cost limits, health checks, rollback and backup/restore plan. Never include secret values. Verify deployed authorization would work without the development-login shortcut.

The old clearance permits an allowlisted source export, not publication of restricted Git history/project-memory/evidence. Re-read its exact conditions and create a fresh eligible export after the new source is ready. Include required application/build/migration files, exclude restricted material and secrets, and scan the actual upload set. Do not push `ct3/v1-repairs` history or the public historical demo repository as a shortcut.

Do all preparation and local verification before asking for any remaining deployment decision. Reuse any existing explicit authorization that actually covers the proposed destination and action; do not ask again merely because it is a later turn. Where a concrete environment/release approval, account access, paid resource or incompatible hosting decision remains unresolved, present the prepared candidate and that single dependency. Do not deploy an unreviewed release or change plans silently.

After an authorized evaluation deployment, verify the hosted journeys against hosted persistence and auth, including cross-tenant/refused access and reload. A home page, login wall or HTTP 200 is not the deployed commercial outcome. Show a clear evaluation-data notice in the evaluation environment; do not restore the retired data-mode switch or redirect users into another company.

Before real customer use, separately require configured staff/approvers/Accounting/queues, approved catalog/prices or explicit exception operation, real connection tests with authorized recipients, reviewed release, backup/restore and rollback evidence, support responsibility, and human acceptance. Keep connected-WhatsApp and full pilot claims open while those remain unmet.

## 18. Real blockers, continued work and final handoff

Stop the **affected action** for:

- Wrong/unknown source identity, unexpected provenance or active writer collision.
- A consequential unresolved business rule: discount/credit/dispatch authority, real approver, financial outcome, actual people/grants, or contradictory customer instruction.
- Missing authoritative catalog/price/payment-destination data needed to publish that particular fact.
- Missing credentials/access, permission denial, required independent-review verdict or external activation authority.
- Destructive migration, historical rewriting, real-data deletion, payment, purchase, real-user grants, real messaging or a hosting change beyond existing authorization.
- A concrete security/tenant/integrity defect that makes the affected workflow unsafe.

An engineering fix, Spanish field label, compatible index, bounded API wiring, ordinary test failure or preserved draft behavior is not a business decision to send back to Carmen. Diagnose and fix within scope. If a tool/security review rejects an operation, record the exact action and reason; use only a materially safer permitted alternative, never the same action moved or disguised. Continue other authorized work.

For every blocked item record: exact missing fact/action, affected journey, evidence, what is already complete, safe temporary behavior, accountable role, and the smallest decision that unblocks it. Do not interpret “skip a blocker” as deleting the requirement or claiming it complete. Do not spend the night repeatedly attempting the same blocked access.

Stop the run when all currently authorized reachable work is complete, or every remaining item depends on a genuine unresolved gate. Otherwise keep implementing, verifying and fixing sequentially. A running tool/job must be supervised and its result collected; never claim work will continue after the agent turn has ended if no actual job/automation does so.

Keep receipts concise and reproducible. Store sensitive/raw local diagnostics privately outside any upload set; commit only permitted, inspected evidence. For each completed batch record full SHA/tree, source/test identity, actual commands and results, UI labels/routes, actor/tenant cases, known limits, reviewer status and next dependency. A receipt commit can reference the preceding implementation SHA; do not invent its own hash or create endless commits just to make a ledger self-referential.

Final report to Carmen:

1. What an advisor, manager and Accounting can now actually complete.
2. Exact branch/HEAD, dirty files left intentionally, commits and receipt paths.
3. Evidence states separately: SPECIFIED, IMPLEMENTED, TESTED LOCALLY, INDEPENDENTLY REVIEWED, INTEGRATED, DEPLOYED, LIVE JOURNEY VERIFIED, OWNER ACCEPTED.
4. Failed/unproven cases and exact blockers, including provider and human checks.
5. Deployment URL/source identity if one was actually authorized and verified; otherwise the prepared release and precise remaining gate.
6. A short synthetic demonstration script and role guides, with limitations visible.
7. Resume checkpoint: LEFT OFF; ACTIVE WRITER; REPO/BRANCH/SHA; NEXT; WHERE; WAITING ON; DO NOT REPEAT. Include any servers/databases you left running.

Begin now with identity verification and the focused source reconciliation. If there is no real conflict, finish the existing Stage A work and continue through the batches above. Do not stop with only a new plan or another request for routine permission.
