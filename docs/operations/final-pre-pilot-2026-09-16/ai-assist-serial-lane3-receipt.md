# AI assist serial LANE 3 receipt

**Date:** 2026-09-16T17:55Z  
**Lane:** SERIAL — AI only after password-reset closed  
**Current FINAL RUNTIME SHA:** `1472796a7e31c8660eb928d0655900c98cf29c29` (web+API LIVE same — LANE 1)

## What is proven

| Item | State | Evidence |
|------|-------|----------|
| `max_completion_tokens` client fix | `IMPLEMENTED` · `TESTED` · `PUSHED` · `DEPLOYED` · `HOSTED` | commits `275b82e` / `1472796`; unit tests in `openai-compatible-client.test.ts`; API LIVE on `1472796` |
| `AI_ENABLED` / key historically configured | YES (prior) | Configure agent `e310d3b5` |
| Unauth `/v1/ai/assist` | HTTP 400 `VALIDATION_FAILED` (gate alive, not open) | curl 2026-09-16 serial |
| API health/ready | 200 | curl serial |

## What is NOT proven this lane

| Item | State | Why |
|------|-------|-----|
| Provider-backed SYNTH assist response on `1472796` | `HOSTED-UNPROVEN` | Credentialed Playwright BV blocked (secrets boundary); not run |
| Prior assist on `23e50b0` | **FAIL** (`max_tokens` / luna) | Agent `e310d3b5` — superseded for client fix, not a PASS |

## Claim for handoff

**AI = NOT LIVE / HOSTED-UNPROVEN** until credentialed assist re-BV PASS on `1472796`.

**STOP LANE 3.**
