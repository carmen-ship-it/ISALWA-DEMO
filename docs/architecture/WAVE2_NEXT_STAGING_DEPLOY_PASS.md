# Wave 2 — next staging deploy pass (`ef7eeab`)

**Status:** PLANNED — awaiting Carmen authorization  
**After:** Gate C = **MIGRATED_AND_VERIFIED**  
**Do not run until authorized.** Do not create fixtures in this doc alone.

Keep states separate:

| State | Now |
|---|---|
| MIGRATED | YES (staging DB, 29 migrations) |
| DEPLOYED | NO |
| HOSTED | NO |
| BROWSER-VERIFIED | NO |
| USER-ACCEPTED | NO |

---

## Candidate

| Item | Value |
|---|---|
| Exact SHA | `ef7eeabdea5f8f4449ba706caa1a323435d96fcc` |
| Branch | `wave2/candidate-unified` |
| Integration pin | `316426f272bce29924ffd4991da88ffe7d421bbd` — **do not move** |
| Last known hosted os-api SHA (operator evidence) | `1f767fa` — **reconfirm at deploy time; do not assume** |
| Targets | web `https://os-web-staging.onrender.com` · api `https://os-api-staging.onrender.com` |

---

## Pass scope (bounded)

1. **Pre-deploy** — confirm SHA pushed; clean candidate; env names match checklist; DB already at 29 (do not remigrate).  
2. **Deploy** — Render deploy **exact** `ef7eeab` for `os-api-staging` then `os-web-staging` (or documented order).  
3. **Hosted smoke (immediate after deploy)** — health, auth session, tenant boundary, one safe read of seven customers (no mutation).  
4. **Fixture / user-binding (before role homes)** — synthetic role fixtures only per `WAVE2_STAGING_ROLE_FIXTURE_PLAN.md`; **no** fake AuthIdentity for real people; **no** capability grants from Cargo; keep receive ≠ allocate ≠ outbound ≠ delivery.  
5. **Hosted Acceptance Gauntlet** — `WAVE2_HOSTED_ACCEPTANCE_PLAN.md` A–J (not Isa/Álvaro yet).  
6. **Stop** — report DEPLOYED / HOSTED / BROWSER-VERIFIED separately; pin still unmoved unless Carmen authorizes.

---

## Immediate post-deploy hosted tests (minimum)

| # | Check | Pass criteria |
|---|---|---|
| 1 | API health/ready | Healthy; no migrate-needed panic |
| 2 | Web load | Staging shell loads |
| 3 | Auth smoke | Trusted session establishes (staging auth) |
| 4 | Tenant smoke | Session org scoped; foreign org fails closed |
| 5 | Data smoke | Seven real customers readable; Wave 2 tables queryable empty or fixture-only |
| 6 | Schema/app match | No runtime missing-table / Prisma mismatch errors |

Then: fixtures → role homes → eight journeys → Guiado → adversarial → seven-customer integrity.

---

## Fixture / user-binding before role testing?

**Yes — required before hosted role-home / journey acceptance.**  
Not before technical deploy + health/auth/tenant smoke.  
Do **not** auto-create from DATOS CLIENTES staff rows. Use synthetic fixtures; real-person invite remains separately governed.

---

## Rollback trigger (deploy pass)

- Health fail, auth fail, tenant leak, Prisma/schema mismatch, baseline customer corruption  
→ stop traffic / redeploy last known good SHA; DB already migrated — do **not** reverse Wave 2 migrations casually; use PITR only if data integrity threatened.

---

## SAFE FOR ISA / ÁLVARO

**NO** until hosted Acceptance Gauntlet + explicit user acceptance.
