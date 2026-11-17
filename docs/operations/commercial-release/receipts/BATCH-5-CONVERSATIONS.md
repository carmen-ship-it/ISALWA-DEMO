# Receipt — Batch 5 conversations and manual attention (bounded slice)

Date: 2026-11-16. Integrator `/Users/carmen/projects/isalwa-wt-v1-repairs`, branch `ct3/v1-repairs`. Parent HEAD: `24580c1c` (Batch 4 blocker docs). Authority: `CONTINUATION-2026-11-16.md` §10.

States: **IMPLEMENTED** · **TESTED LOCALLY** (unit + HTTP over real Nest app + disposable Postgres). Not independently reviewed. Not hosted. Not visually inspected in a browser in this slice (typecheck, production build and source-level tests only). Extends `RecordCustomerConversation` / `OsCustomerConversation` and `/conversaciones`; no second inbox, no `/mensajes` work, no provider send.

## Shipped

| Requirement | What exists |
|---|---|
| **Registrar atención** (renamed from "Registrar conversación" in the workspace, palette, map quick view) | Same drawer on `/conversaciones` (`ManualConversationPanel`). Fields: customer (server typeahead), contact, channel, date/time (defaults to now), **Motivo** (required), **Nota** (required), optional **Siguiente paso** (what + responsible member via `ServerMemberTypeahead` + date). Pasted text, customer question, possible commitment, requested date and commercial links moved under "Más detalles (opcional)". The responsible member is never preselected. |
| Channels | `call` Llamada · `visit` Visita · `in_person` Atención presencial · `whatsapp` Registro manual de WhatsApp. Legacy `manual` kept for system records ("Otro registro"). Contract `ATTENTION_CHANNELS` / labels in `@isalwa/os-contracts`. None connects a provider. |
| Reason required | Contract (`missing_reason`), form, and DB `CHECK` (call/visit/in_person need `reason`). Note required through existing `summary`. |
| Save through real commands | `POST /v1/customer-conversations` (existing record command, S11 idempotency kept) then `CreateEmployeeCommitment` through the existing `CommitmentCommandService` (own transaction, event, audit, `canLinkParty` guard). Due date = noon La Paz of the chosen day. |
| **Atomicity decision** | Not one transaction (the commitment command owns its own transaction/events). **Recoverable partial outcome**: response is `{ item, nextStep: { status: 'created', commitmentId } \| { status: 'failed', code } \| null }`. On `failed` the UI shows "Atención guardada, pero el siguiente paso no se creó." plus the reason and **Reintentar siguiente paso**; the attention form clears (so it cannot be saved twice) and the retry holds the step. `POST /customer-conversations/:id/next-step` retries idempotently (key = conversation id + payload fingerprint); replay of the record command re-attempts a missing step. HTTP-proven: no duplicate commitment on retry or replay. |
| Success copy | "Atención guardada. WhatsApp sigue sin estar conectado." / "…El siguiente paso quedó como compromiso." |
| **Inbox filters** | Todos · Sin asignar · Mis chats · Por responder · Seguimiento (replaces Todas / Necesitan respuesta / Seguimiento / Oportunidad posible / Incidencia posible). Sin asignar / Mis chats read stored `assigned_member_id`; Por responder / Seguimiento use the existing derived attention flags (customer question or last inbound; next action or commitment candidate). Account owner and commitment owner never decide a filter. Old `?filtro=possible_*` falls back to Todos. Opportunity/issue hints stay as row badges. |
| Preserve selection / scroll | Selection (`c`), filter (`filtro`), search (`q`) live in the URL; a selected thread stays shown when a filter hides it; list scroll position is remembered per filter and restored across filter and mobile list/thread switches (best effort). |
| **Search** "Buscar cliente, teléfono o conversación" | Shared `SearchField`. Text matches customer, contact, reason, question, next action and message words. A phone is not stored on conversations, so ≥3 characters also call the existing authorized customer search (`/parties?q=`, which matches phone digits) and match conversations by customer id. Unreadable customers never appear. |
| **Composer honesty** | The thread has no composer and **no Enviar** (enabled or disabled). Footer: "WhatsApp no conectado" pill + explanation + "Registrar atención" button. Test asserts no `Enviar`/textarea/send in the thread. |
| **Tomar conversación** | `POST /customer-conversations/:id/take`. Claim is `updateMany WHERE assigned_member_id IS NULL` → one winner (HTTP test: two concurrent takers → one 201, one 409 `ALREADY_ASSIGNED`). Idempotent for the holder; others cannot take over. Needs only current customer read authority (owner, team lead, org reader, coverage); stranger / other tenant get the same 404; suspended member 403. Writes only `assigned_*`; **account owner verified unchanged**. New attentions are **unassigned by default** (Carmen is never assigned); a record request cannot set `assigned_*` or `next_step_commitment_id`. |

## Schema / migration (disposable only)

- `20261021000000_os_customer_conversation_attention_b5`: `reason`, `assigned_member_id`, `assigned_label`, `assigned_at`, `next_step_commitment_id` (nullable, no FKs); channel CHECK widened; reason/assignment/next-step CHECKs; index `(organization_id, assigned_member_id)`.
- `EXPECTED_MIGRATION_COUNT` 41 → 42. Applied to `isalwa_stage_a_disposable` @ 54329 only (verified 41 → 42 applied). Prisma client regenerated (hash/model diff only).

## Checks

| Check | Result |
|---|---|
| `batch5-conversation-attention.http.test.ts` (new, real Nest + PG) | 9/9. Mutation check: removing `assigned_member_id IS NULL` from the claim fails the concurrency test. |
| `os-contracts` | 220/220 (new Batch 5 cases) |
| `os-database` (disposable PG) | 315/315 |
| `os-web` | 1374/1374 (was 1356; new `batch5-attention.test.ts` + model tests); typecheck exit 0; `next build` exit 0 |
| `os-api` typecheck | exit 0 |
| `os-api` full suite, `--test-concurrency=1` | 369/371. Default (parallel) run also flakes three T03 HTTP files that share the DB; each passes alone. |

Two pre-existing `os-api` failures, **not touched by this slice**: `env-validation` "rejects missing OS_DATABASE_URL on staging", and `inspection-reads` count (`NEWLY_VERIFIED` is 19 after Batch 3 added `price-approver-options`; test still expects 18).

## Remaining gaps (not done in this slice)

> Gaps 1 and 2 were built afterwards in `BATCH-5B-CONVERSATIONS.md`. The text below is the state at this slice's commit.

1. **Nota interna ("Solo equipo")** — not built. There is no separate durable note record; adding one would need a new model and read path distinct from attention rows. Composer therefore has neither Mensaje nor Nota interna.
2. **Attention states** (Nueva · En atención · Esperando al cliente · Esperando al equipo · Resuelta), AI state, human-takeover pause, reopen-on-inbound: no stored state yet.
3. Assignment management beyond take (release, reassign by a manager, notification to the taker); `Mis chats` is empty until someone takes a conversation by design.
4. Relationship-end previews / queued-recipient invalidation, and the new/shared/recycled-number history rules: no outbound intents exist yet, so nothing to invalidate; phone search is by current customer contacts only.
5. Atomic single-transaction conversation + commitment: replaced by the recoverable partial outcome above. A retry with an *edited* step after a failure creates a distinct commitment (different payload fingerprint); the earlier failed step created none.
6. Not browser-verified; no live provider, no hosting, no push.
