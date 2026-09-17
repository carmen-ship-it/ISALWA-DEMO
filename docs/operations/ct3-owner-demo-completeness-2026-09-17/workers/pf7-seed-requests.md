# PF-7 → PF-1 seed requests (BusinessEvent / Audit density)

**From:** PF-7 audit/historial/coherence  
**To:** PF-1 (canonical `packages/os-database/src/owner-demo/seed.ts` owner)  
**At:** 2026-09-17  
**Do not apply from PF-7** — request only.

## Why

Owner-demo Auditoría / Cliente360 Historial must search and show **real** SYNTH events for DEMO MADERAS ORIENTE (Cotización / Pedido / Conversación). No static fake audit table.

## Requests

1. **hrefHints.audit** — change seeded `/inicio` → `/auditoria` (Story Mode paso Auditoría).
2. **OsAuditLog + BusinessEvent density for `maderas_oriente`** — ensure durable rows exist (or are emitted via normal command path) for at least:
   - `party.created` / party updates on MADERAS partyId
   - `quote.created` + `quote.send_recorded` on MADERAS quoteId (`Q-000002`)
   - `order.created` on MADERAS orderId (`O-000002`)
   - `conversation.recorded` (or equivalent) if conversations are persisted; otherwise document that conversation search depends on create-from-conversation / manual record path
3. **Optional conversation-origin samples** (hosted copy soft-requirement): one of
   - `opportunity.created_from_conversation`
   - `issue.created_from_conversation`
   - `follow_up.created_from_conversation` / `work_item.created_from_conversation`
   - `commitment.created_from_conversation`
   with `conversationId` in event facts so Historial can show **Origen: Conversación** + **Ver conversación**.

## Non-goals

- Do not invent audit rows that skip domain stores.
- Do not mutate REAL_SEVEN.
- PF-7 does not edit `seed.ts`.
