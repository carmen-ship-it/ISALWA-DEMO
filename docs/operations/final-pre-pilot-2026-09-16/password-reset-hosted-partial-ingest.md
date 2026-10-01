# Password-reset hosted — PARTIAL ingest (Control Tower)

**Date:** 2026-09-16T18:17Z  
**Source agent:** `bd034c2f` Hosted forgot-password UX fix  
**Ingested by:** Control Tower serial close  

## Verdict

**PASSWORD_RESET_HOSTED = PARTIAL**

| Check | Result |
|-------|--------|
| UX (login link → forgot → reset route) | **PASS** |
| Reaches Supabase `/auth/v1/recover` | **PASS** (SYNTH `w2.asesor@isalwa.demo`) |
| EMAIL_DELIVERY | **UNPROVEN** — HTTP **429** `over_email_send_rate_limit` |
| TOKEN_COMPLETE / NEW_LOGIN | **UNPROVEN** |
| SELF_SERVICE_WITHOUT_CARMEN | **NO** |

## Runtime at ingest

| Service | SHA | Deploy |
|---------|-----|--------|
| WEB LIVE | `c30f1e7c23272519168dddad57475da58d5b0f32` | `dep-daldj1e1egvs73e7ona0` |
| API LIVE | `1472796a7e31c8660eb928d0655900c98cf29c29` | `dep-dald8kpm57gc73d8qrtg` |
| **WEB/API SAME** | **NO** | Align on next sole-writer product deploy (loop-closure lane holds dirty tree) |

## Product commits (auth)

`54445b8` → `b2a2537` (browser Supabase client) → `c30f1e7` (rate-limit copy)

## External handoff rule

- May say: enlace de recuperación en el ingreso.  
- Must **not** say: pueden recuperar sin Carmen / correo siempre llega.  
- Rate-limit is provider throttle, not UX absence.

## Unblock email E2E (operator)

1. Wait out Supabase Auth email rate limit; retry once.  
2. If still no mail: Auth SMTP + redirect allowlist includes `…/auth/reset-password`.  

**STOP ingest.**
