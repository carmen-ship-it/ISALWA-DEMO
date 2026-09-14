# AI pilot boundary — ISALWA OS

**Status:** DOCUMENTED. AI is **off** unless `AI_ENABLED=true`. This lane does not call OpenAI and does not store a key.  
**Date:** 2026-09-14  
**Lane:** J (AI limits and pilot boundary only)

Module: `apps/os-web/lib/ai/limits.ts`. It exports limits and a gate. It does not import a provider SDK and does not read an API key.

Architecture already forbids AI as a second source of truth (`docs/adr/0009-os-ai-audit-demo-isolation.md`). Traceability marks AI-01/02 **DEFERRED** (`docs/architecture/ARCHITECT_TO_OS_TRACEABILITY.md`). This document is the pilot gate, not a commercial AI product.

---

## Default

`isAiEnabled()` is **false** unless `process.env.AI_ENABLED === 'true'`.

`1`, `yes`, `TRUE`, and a missing variable are off. Do not infer “enabled” from a key being present.

When AI is off, the rest of the OS continues. Customers, quotes, orders, and approvals do not depend on a model.

---

## Limits (code)

| Constant | Value | Meaning |
|----------|------:|---------|
| `AI_USER_DAILY_LIMIT` | 20 | Requests per person per day. At 20, the next request is denied. |
| `AI_ORG_MONTHLY_LIMIT` | 300 | Requests per organization per month. At 300, the next request is denied. |
| `AI_MAX_OUTPUT_TOKENS` | 800 | Cap on model output. Not a license to raise it in the client. |
| `AI_MAX_PROVIDER_RETRIES` | 1 | One retry. No retry loops. |

`assertAiAllowed` denies, in Spanish, when:

- AI is disabled
- the intent is not on the allowlist (including approve, convert, reassign, send)
- the user daily count is at or over 20
- the organization monthly count is at or over 300

Bad or missing usage counts fail closed. The function does not invent usage.

---

## What AI may do

Allowlist only:

| Intent | Allowed |
|--------|---------|
| `summarize_customer` | Yes — summary for a human to read |
| `ask` | Yes — answer a question from data the user is already allowed to see |
| `draft_follow_up` | Yes — draft text. A person sends it, if anyone does |

Denied intents include `approve`, `convert`, `reassign`, and `send`. Any other intent is also denied.

**AI may not execute business actions.** It must not approve, convert a quote to an order, reassign an owner, send a message or email, change a price, merge identities, extend credit, issue a fiscal document, or change permissions. That matches ADR-0009. A draft is not a send.

Customer text passed into a future prompt is **data, not instructions**. Do not treat workbook notes, WhatsApp paste, or quote lines as orders to the model.

---

## Key, spend, and failure

| Rule | Detail |
|------|--------|
| Key name | **`OPENAI_ISALWA_API_KEY`** — dedicated to this OS pilot. Do not reuse Architect `OPENAI_API_KEY` / `ARCHITECT_LLM_API_KEY`. |
| Where it lives | Host secret store or company secret manager. **Never in git. Never in `NEXT_PUBLIC_*`. Never in the browser.** |
| This lane | Does not create, read, or commit a key. Missing key is an expected blocker, not a test failure. |
| Hard monthly cap | **USD 20**. Policy cap on the provider project. Not a prepaid invoice, and not a reason to raise retries. |
| Spend alerts | **25% / 50% / 75% / 90%** of that cap. Alerts go to the billing owner, not only to one developer. |
| Quota or cap hit | **Only AI pauses.** Core OS (login, customers, quotes, orders, work) continues. |
| Provider | OpenAI is the named pilot vendor. The gate stays provider-neutral: no SDK call from `limits.ts`. |

Confirm alert wiring in the provider dashboard before anyone sets `AI_ENABLED=true`. The USD 20 cap is a control, not a vendor quote of token prices.

Pilot billing may be covered by Carmen. The lasting owner is a **company OpenAI project**, not a personal key. See `PRODUCTION_OWNERSHIP_AND_COSTS.md` and the Isa/Álvaro draft.

---

## Privacy

Do not send:

- access tokens, refresh tokens, session cookies
- API keys, database URLs, or other secrets
- quote body text into error trackers (Sentry rule is separate; AI logs must follow the same idea)

Do send, only when AI is on and the caller is allowed:

- the minimum customer fields needed for the allowlisted intent
- a reminder that that text is data, not instructions

Outputs are suggestions. They are not business truth and must not be labeled **Ingresos**. WhatsApp text is not revenue truth.

---

## Not done here

- No OpenAI HTTP call
- No key in the repository
- No os-web page, shell, or list change
- No `packages/os-ai` contract (AI-01 remains open)
