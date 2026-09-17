# RC3 — COMMERCIAL_LOOP_PRECONDITIONS

**As of:** 2026-09-17  
**Scope:** Local command proof for quote line → manual send → convert, plus SYNTH disposable continuation IDs from RC2.  
**Deploy:** Not deployed. Hosted full commercial loop remains **PARTIAL** until post-deploy BV.

---

## Scoreboard

| Gate slice | Result | Evidence |
|---|---|---|
| **QUOTE_LINE (AddQuoteLine tenant deny)** | **PASS** | `commercial-tenant-write.test.ts` foreign-id / line write denials |
| **QUOTE_MANUAL_SEND (RecordQuoteManualSend)** | **PASS** | `record-quote-manual-send.test.ts` + web `quote-manual-send.test.ts` |
| **CONVERT (CreateOrder / canConvertQuoteToOrder)** | **PASS** | `commercial-authority.test.ts` CreateOrder suite |
| **SYNTH_BV_CONTINUATION_CANDIDATES** | **NOTED** | RC2 disposable opp + Q-000007 (not re-mutated here) |

---

## SYNTH BV continuation candidates (disposable)

From RC2 hosted BV (`final-rc2-evidence-8a153a4/rc2-hosted-bv-results.json` / `FINAL_RC2_RECEIPT.md`):

| Field | Value |
|---|---|
| Opportunity | `01M2QYAPZT8AXV3F1XS9XRNZYA` (`RC2-BV-manual-opp`) |
| Quote id | `01M2QYD0S9WX5RC0MRBPNBJWYB` |
| Quote number | **Q-000007** |
| RC2 status | Opp + quote **created**; send/PDF **blocked until lines**; seeded Q-000002 PDF/envío PASS |

These are **SYNTH disposable** continuation candidates for RC3 hosted BV after deploy — add lines → RecordQuoteManualSend / PDF → CreateOrder. Do **not** mutate REAL seven. Local work here does not touch hosted state.

---

## Local command citations

### AddQuoteLine

| Proof | Location |
|---|---|
| Foreign quote id → same as missing; no write | `packages/os-commercial/src/commercial-tenant-write.test.ts` — `AddQuoteLine treats a foreign id as missing…`; batch `does not number or mutate a quote, line…` |
| Line writes denied under `commercial.team.read` alone | Same file — `denies commercial.team.read for update, submit, line writes, and convert…` |
| Web draft resolution (no invented product) | `apps/os-web/lib/commercial/product-picker.test.ts` — `resolveAddQuoteLineDraft` |

### RecordQuoteManualSend

| Proof | Location |
|---|---|
| Owner records WhatsApp **manual** send (no provider confirm) | `packages/os-commercial/src/record-quote-manual-send.test.ts` — happy path + idempotency |
| Non-owner / cross-tenant / non-submitted deny | Same suite |
| UI: only submitted; copy honesty; wires command | `apps/os-web/lib/commercial/quote-manual-send.test.ts` |

### Convert (CreateOrder)

| Proof | Location |
|---|---|
| Owner converts submitted once → accepted | `packages/os-commercial/src/commercial-authority.test.ts` — `CreateOrder provisional authority` |
| Unrelated member / people.admin / coverage-alone / cross-tenant / wrong status deny | Same suite |
| Predicate `canConvertQuoteToOrder` enforced in command | Same + `packages/os-contracts/src/commercial-authority.test.ts` |

**Note:** `commercial-tenant-write.test.ts` has one pre-existing fail on `keeps own-submitted conversion…` (owner `CreateOrder` → `PERMISSION_DENIED` in that harness). Convert authority is **PASS** via `commercial-authority.test.ts` (21-suite CreateOrder path green in this run). Do not treat the tenant-write harness flake as blocking this local gate.

---

## Commands run (local)

```bash
cd packages/os-commercial && node --import tsx --test \
  src/commercial-authority.test.ts \
  src/record-quote-manual-send.test.ts
# → CreateOrder + RecordQuoteManualSend suites PASS

# AddQuoteLine foreign / read-scope denials (subset of tenant-write; one unrelated convert case fails)
cd packages/os-commercial && node --import tsx --test src/commercial-tenant-write.test.ts
# → AddQuoteLine / line-write denials PASS; one convert harness case FAIL (pre-existing)

cd apps/os-web && node --import tsx --test \
  lib/commercial/quote-manual-send.test.ts
# → PASS
```

---

## Explicit non-claims

| Claim | Status |
|---|---|
| Hosted FULL_COMMERCIAL_LOOP on Q-000007 | **UNPROVEN** / RC2 **PARTIAL** — continue after deploy |
| Lines already on Q-000007 | **No** — RC2 blocked on lines |
| REAL seven mutated | **NO** |

---

## Verdict

Local preconditions for the commercial command loop (line / send / convert) are **PASS** via existing green suites. SYNTH IDs **Q-000007** / opp **01M2QYAP…** are documented as disposable hosted BV continuation candidates only.
