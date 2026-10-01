# Password-reset hosted BV receipt (SERIAL LANE 2)

**Date:** 2026-09-16T17:53:05Z  
**Lane:** SERIAL — password-reset only (no AI, no Map, no docs rewrite)  
**Expected runtime pin:** `1472796a7e31c8660eb928d0655900c98cf29c29` (Render list: web+API LIVE same SHA)

## Verdict

**PASSWORD_RESET_HOSTED_UX = PASS** (entry path)

| Check | Result |
|-------|--------|
| `/login` forgot link present | YES (count=1) · “olvid/recuper” copy YES |
| `/auth/forgot-password` form | YES · email + submit · copy “Recuperar contraseña” |
| `/auth/reset-password` reachable without token | YES · honest “abra el enlace…” (no crash) |
| Full email send + token complete | **NOT_EXECUTED_BY_DESIGN** |

## Evidence

- JSON: `~/.isalwa-secrets/_verifier-password-reset-out/password-reset-acceptance.json`
- Shots: `login-1440.png`, `forgot-1440.png`, `reset-no-token-1440.png`
- Log: `docs/operations/final-pre-pilot-2026-09-16/password-reset-hosted-bv.log`

## Publish rule

- User-facing may say: can recover from login (link visible + form works).  
- Do **not** claim end-to-end mailbox delivery proven until email round-trip BV is run.  
- State: `BROWSER-VERIFIED` (UX) · `HOSTED-UNPROVEN` (provider mail delivery).

**STOP LANE 2.**
