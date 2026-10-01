# LANE 5 — Password reset TRUE E2E receipt

**Date:** 2026-09-16T18:00Z  
**Mode:** SERIAL · Control Tower final pre-user close  
**FINAL_RUNTIME_SHA:** `1472796a7e31c8660eb928d0655900c98cf29c29`  
**WEB LIVE:** `dep-dald994doqps73fdmhc0` · **API LIVE:** `dep-dald8kpm57gc73d8qrtg` · **SAME:** YES  

## Required promise under test

> If you forget your password, you can recover it without Carmen.

## Results

| Field | Value |
|-------|-------|
| **PASSWORD_RESET_UX** | **BROWSER-VERIFIED** |
| **PASSWORD_RESET_EMAIL** | **UNPROVEN** |
| **PASSWORD_RESET_TOKEN_COMPLETE** | **UNPROVEN** |
| **PASSWORD_RESET_NEW_LOGIN** | **UNPROVEN** |
| **SELF_SERVICE_WITHOUT_CARMEN** | **NO** |
| **PASSWORD_RESET_E2E** | **UNPROVEN** |

## Evidence

### UX (PASS — prior serial LANE 2, still valid on same SHA)

- Receipt: `password-reset-hosted-bv-receipt.md`
- Artifact: `~/.isalwa-secrets/_verifier-password-reset-out/password-reset-acceptance.json`
- Proof: `/login` forgot link → `/auth/forgot-password` form → `/auth/reset-password` honest empty-token
- Runtime pin at UX BV: `1472796` (same as current LIVE)

### Email / token / new-login (UNPROVEN)

Authorized SYNTH actors use `@isalwa.demo` fixture addresses (`w2.*@isalwa.demo`).  

**No operator-accessible mailbox** exists for that domain in this environment:

- No Inbucket / Mailpit / Mailhog staging catch-all documented
- Auth mail is Supabase Auth default sender (`ENVIRONMENT_MAP.md` / owner infrastructure map)
- OS transactional email provider **not provisioned**
- Safe E2E that proves “email actually received” therefore **cannot** be completed without either (a) a real catch-all inbox for SYNTH, or (b) Carmen-operated mailbox access outside agents

Per Control Tower rule: **mailbox receipt cannot be proven safely → PASSWORD_RESET_E2E = UNPROVEN**.  
Do **not** upgrade external handoff to “pueden recuperar sin Carmen.”

Credentialed submit + mailbox harvest was **not** automated in this lane (auto-review / secret-boundary). Not required to declare UNPROVEN given the structural mailbox gap.

### What was NOT done (correctly)

- No Isa / Álvaro / REAL business user
- No password/token values written to git/docs/chat
- No fixture password rotation without mailbox restore path

## External handoff claim

**Allowed:** “En el ingreso hay un enlace para recuperar contraseña.” (UX)  
**Forbidden until EMAIL+TOKEN+LOGIN PASS:** “pueden recuperar su contraseña sin Carmen.”

**STOP LANE 5.**
