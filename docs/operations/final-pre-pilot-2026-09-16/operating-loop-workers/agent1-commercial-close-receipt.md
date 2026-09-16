# AGENT 1 — Commercial close receipt

**When:** 2026-09-16T21:05Z  
**Worker:** Agent 1 (commercial close)  
**Branch:** `agent1/commercial-close`  
**Worktree:** `/Users/carmen/projects/isalwa-wt-commercial-close`  
**REAL_SEVEN_MUTATED:** **NO**  
**Deployed:** **NO**

---

## SHAs

| Field | Value |
|---|---|
| Product/merge tip | `7b2f81b52f87e9f96cd2e0c0e305f45657a0e0a2` |
| Map tip integrated | `03745ab522bb6f4e83b27fbc3353efd598ab07ac` |
| Harden + initial receipt | `d5a12f1c9d3b102a2c1f358b0878b121c9bfbb8f` |
| Feature commit | `40a400372c95017405637e2788321c2fe8d8560f` |
| Base (pre-lane) | `2c931b48fc2ef7370972c75872de066c8bf5c34b` |

Branch tip after this receipt commit is returned to Control Tower as the Agent 1 final SHA. CT can merge onto live `03745ab` cleanly (map tip is an ancestor).

---

## Carmen handoff (plain language)

An employee can download a quote PDF, **record** that they sent it outside ISALWA (WhatsApp/otro), optionally register a follow-up WorkItem with due date, and convert their own submitted quote to a Pedido that inherits lines — then land on that Pedido. ISALWA does **not** send WhatsApp, invent invoices, or fabricate payments.

---

## Persistence constitution — `RecordQuoteManualSend`

Verified **not UI-only**. UI form → server action → API `executeCommand` → `CommercialCommandService.recordQuoteManualSend` → durable `BusinessEvent`.

| Slot | Value |
|---|---|
| **BUSINESS_FACT** | Human recorded that a submitted quote was sent outside ISALWA (`channel`: `whatsapp` \| `otro`; optional `note`; `providerSend: false`). Quote status is **unchanged**. |
| **WRITE_COMMAND** | `RecordQuoteManualSend` (`packages/os-contracts` · routed by `apps/os-api` `commands.controller` via `COMMERCIAL_COMMAND_NAMES` · implemented in `packages/os-commercial/src/commercial-command-service.ts`) |
| **EVENT** | `quote.send_recorded` via `buildBusinessEvent` + `store.appendEventAndAudit` (+ outbox + audit). Primary entity: `quote` / `quoteId`. |
| **TENANT_KEY** | `ctx.organizationId` on authorize, `getQuoteInOrg(organizationId, quoteId)`, `refuseForeign`, and event `organizationId`. Cross-tenant quote → `NOT_FOUND` (tested). |
| **IDEMPOTENCY** | Optional key on `CommercialCommandService.execute` → `findIdempotency` / `saveIdempotency` (24h). Same key replays without a second event (tested). Web action passes `createId()` per submit. |
| **HISTORY** | Event retained on BusinessEvent stream; party timeline allowlist in `party-timeline-facts.ts` (`quote.send_recorded`); Spanish audit/timeline labels (`Cotización registrada como enviada`). Not a client-only `setRecords` path. |

**Negative holds:** non-owner advisor denied; draft/accepted/cancelled refused; no WhatsApp provider call.

**SoR choice:** Kept quote-scoped `RecordQuoteManualSend` / `quote.send_recorded`. Did **not** use client-only state. `RecordCustomerConversation` left alone (different conversation SoR).

---

## Acceptance scorecard

| Criterion | State | Evidence |
|---|---|---|
| Quote PDF | **IMPLEMENTED** | `QuotePdfDownloadButton` on quote detail · `/api/quotes/[quoteId]/pdf` |
| Durable manual external-send | **IMPLEMENTED** | Persistence table above · `@isalwa/os-commercial` `RecordQuoteManualSend` tests |
| Optional follow-up after send | **IMPLEMENTED** | Post-send `RegisterFollowUpForm` (`promptMode="after-send"`, dueAt required) → durable Work command |
| Own quote → Pedido convert + navigate | **IMPLEMENTED** | `ConvertQuoteForm` → `CreateOrder` → redirect `…/pedidos/{orderId}?resultado=pedido` |
| Inherited lines preserved | **IMPLEMENTED** (prior + covered) | `copyQuoteLinesToOrderLines` / CreateOrder line-copy tests |
| No invoice/payment fabrication | **HELD** | Pedido copy: “No se emitió factura ni nota de entrega.” · send path has no payment |
| Command-layer convert authorization | **IMPLEMENTED** | `canConvertQuoteToOrder` inside `CreateOrder` (owner / coverage / explicit scope) |
| Tests green (lane packages) | **PASS** | `@isalwa/os-commercial` 53/53 · focused os-web commercial suites 83/83 |
| Hosted / browser-verified | **UNPROVEN** | No deploy this lane |

---

## Completion fixes this tip

- Sticky convert copy no longer pretends status is already `accepted` while quote remains `submitted`.
- Nav expectation tests aligned with live `PRIMARY_NAV` (memoria / salud-datos / auditoría).
- Next-step tests updated for “presentada” vs manual “envío” vocabulary.
- Indent cleanup on Cliente 360 latest-activity label.
- Merged map tip `03745ab` for CT merge cleanliness.
- Receipt documents persistence constitution slots.

---

## Remaining gaps

1. **Hosted E2E** of PDF → record send → follow-up → convert → Pedido: **UNPROVEN** (no deploy).
2. Next-step after a recorded send still reads “registre el envío” until convert/approval changes status — no projection flag for “already send-recorded”.
3. Covering-advisor convert: command path evaluates coverage; quote query authority for `canConvertToOrder` does not pass coverage (pre-existing asymmetry).
4. Pre-existing os-web failures outside this lane: `lib/map/map-desk.test.ts` (providers dist), `lib/work/inicio-attention.test.ts` CC-1 regex `/admin/` false positive on Inicio source.
5. WhatsApp provider send remains intentionally unwired.

---

## Explicit non-touches

- Delivery / warehouse API registration (Agent 3)
- REAL seven mutation
- Deploy / hosted proof
