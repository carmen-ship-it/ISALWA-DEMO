# AGENT 1 — Commercial close receipt

**When:** 2026-09-16T20:55Z  
**Worker:** Agent 1 (commercial close)  
**Branch:** `agent1/commercial-close`  
**Worktree:** `/Users/carmen/projects/isalwa-wt-commercial-close`  
**REAL_SEVEN_MUTATED:** **NO**  
**Deployed:** **NO**

---

## SHAs

| Field | Value |
|---|---|
| Completion tip | `d5a12f1c9d3b102a2c1f358b0878b121c9bfbb8f` |
| Prior feature commit | `40a400372c95017405637e2788321c2fe8d8560f` |
| Base (pre-lane) | `2c931b48fc2ef7370972c75872de066c8bf5c34b` |

---

## Carmen handoff (plain language)

An employee can download a quote PDF, **record** that they sent it outside ISALWA (WhatsApp/otro), optionally register a follow-up WorkItem with due date, and convert their own submitted quote to a Pedido that inherits lines — then land on that Pedido. ISALWA does **not** send WhatsApp, invent invoices, or fabricate payments.

---

## Acceptance scorecard

| Criterion | State | Evidence |
|---|---|---|
| Quote PDF | **IMPLEMENTED** | `QuotePdfDownloadButton` on quote detail · `/api/quotes/[quoteId]/pdf` |
| Durable manual external-send | **IMPLEMENTED** | Command `RecordQuoteManualSend` → event `quote.send_recorded` (`providerSend: false`) · owner/admin auth · timeline + audit labels |
| Optional follow-up after send | **IMPLEMENTED** | Post-send `RegisterFollowUpForm` (`promptMode="after-send"`, dueAt required) → durable Work command |
| Own quote → Pedido convert + navigate | **IMPLEMENTED** | `ConvertQuoteForm` → `CreateOrder` → redirect `…/pedidos/{orderId}?resultado=pedido` |
| Inherited lines preserved | **IMPLEMENTED** (prior + covered) | `copyQuoteLinesToOrderLines` / CreateOrder line-copy tests |
| No invoice/payment fabrication | **HELD** | Pedido copy: “No se emitió factura ni nota de entrega.” · send path has no payment |
| Command-layer convert authorization | **IMPLEMENTED** | `canConvertQuoteToOrder` inside `CreateOrder` (owner / coverage / explicit scope) |
| Tests green (lane packages) | **PASS** | `@isalwa/os-commercial` 53/53 · commercial/web focused suites green |
| Hosted / browser-verified | **UNPROVEN** | No deploy this lane |

**SoR choice:** Kept `RecordQuoteManualSend` / `quote.send_recorded` (quote-scoped commercial evidence). Did **not** use client-only `setRecords`. `RecordCustomerConversation` left alone (different conversation SoR).

---

## Completion fixes this tip

- Sticky convert copy no longer pretends status is already `accepted` while quote remains `submitted`.
- Nav expectation tests aligned with live `PRIMARY_NAV` (memoria / salud-datos / auditoría).
- Next-step tests updated for “presentada” vs manual “envío” vocabulary.
- Indent cleanup on Cliente 360 latest-activity label.

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
