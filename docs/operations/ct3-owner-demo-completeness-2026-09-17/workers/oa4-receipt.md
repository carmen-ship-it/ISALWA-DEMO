# OA-4 — Durable conversations receipt

**Lane:** OA-4  
**Branch:** `ct3/oa4-conversations-durable`  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-oa4-conversations-durable`  
**Base tip synced:** `origin/ct3/owner-demo-completeness` @ `4a1c0c88c2fa305a9f1a28ab8ff3cb85f0d9eee0`  
**IMPLEMENTATION_SHA:** `662b865ebf01e4debdb6d952c4fe2875c21bc26f` (integrated on tip; API + seed + web prefer durable)  
**RECEIPT_SHA:** `9978dbcedd78135066dc6e453c82e3d8b09485b5`  
**REAL_SEVEN_MUTATED:** **NO**  
**Fake WhatsApp:** **NO** (channel stays `manual`; provider never connected)  
**INVENTED_BUSINESS_RULES:** **0**

---

## Scope delivered

1. **Seed** — `ensureOwnerDemoConversation` in `packages/os-database/src/owner-demo/seed.ts` inserts/updates one `os_customer_conversations` row per DEMO client (5), SYNTH org only, natural key `owner-demo-conversation:<clientKey>`. Opaque opportunity/quote/order links only; no mutation of those rows.
2. **Admission helpers** — `packages/os-database/src/owner-demo/conversations.ts` builds/admits company-entered records via `recordManualCustomerConversation` (channel always `manual`, `WHATSAPP_NUMBER_PENDING`).
3. **API** — `GET /customer-conversations` (`CustomerConversationsController`) lists tenant-scoped `OsCustomerConversation` rows; re-admits via contracts; not legacy messaging `GET /conversations`.
4. **Web** — `/conversaciones` prefers durable API rows (`listCustomerConversations` → `projectManualConversation`); JSON demo fixtures only when durable list is empty.

---

## Files (implementation on tip)

| Path | Role |
|---|---|
| `packages/os-database/src/owner-demo/conversations.ts` | natural key + admit + Prisma create data |
| `packages/os-database/src/owner-demo/conversations.test.ts` | admission proofs for 5 DEMO clients |
| `packages/os-database/src/owner-demo/seed.ts` | `ensureOwnerDemoConversation` per client |
| `apps/os-api/src/customer-conversations.controller.ts` | list endpoint |
| `apps/os-api/src/customer-conversations.controller.test.ts` | source + admission proofs |
| `apps/os-api/src/app.module.ts` | register controller |
| `apps/os-web/lib/api/os-api-client.ts` | `listCustomerConversations` |
| `apps/os-web/app/(app)/conversaciones/page.tsx` | prefer durable over JSON-only UI |

---

## Tests (proven on tip including `7566a67` / `4a1c0c8`)

```text
pnpm --filter @isalwa/os-database exec node --import tsx --test src/owner-demo/conversations.test.ts
→ 3 pass / 0 fail

pnpm --filter @isalwa/os-api exec node --import tsx --test src/customer-conversations.controller.test.ts
→ 2 pass / 0 fail

pnpm --filter @isalwa/os-web exec node --import tsx --test lib/conversations/conversaciones-shell.test.ts
→ 4 pass / 0 fail
```

---

## Residuals

- Hosted seed apply / browser BV: **UNPROVEN** this receipt (no staging seed run from this worker).
- JSON fixtures remain as empty-API fallback only — not a parallel WhatsApp UI.
- LIVE runtime may still trail tip until deploy.

---

## Proof strip

| Claim | State |
|---|---|
| 5 DEMO clients seedable into `os_customer_conversations` | **IMPLEMENTED** + **TESTED** (admission); DB apply **UNPROVEN** here |
| Conversaciones prefers durable API | **IMPLEMENTED** |
| No live WhatsApp / no invented phone | **TESTED** |
| REAL_SEVEN_MUTATED | **NO** |
