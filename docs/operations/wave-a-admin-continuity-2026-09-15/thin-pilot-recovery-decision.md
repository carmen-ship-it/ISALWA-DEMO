# Wave A close — thin-pilot recovery decision receipt

**Date:** 2026-09-15  
**Status:** **CARMEN MUST CHOOSE** — not accepted by engineering  
**Deploy candidate (code):** `a97e17e156f58648beac4c0cd78d3245cc614e85`

Production environment remains **NOT EVIDENCED**. Staging host is `https://os-web-staging.onrender.com`.

---

## OPTION A — Dual recovery checklist

| ID | Item | Status |
|----|------|--------|
| A1 | Render second admin on team hosting `os-web-staging` / `os-api-staging` / `isalwa-os-staging` | **NOT DONE** — **REQUIRES CARMEN** |
| A2 | Supabase Auth staging second Owner/Admin (`isalwa-os-auth-staging`) | **NOT DONE** — **REQUIRES CARMEN** |
| A3 | Named Human B identified and invite accepted | **NOT DONE** — **REQUIRES CARMEN** |
| A4 | Shared interim/company vault with DB URL + service-role names (not chat paste) | **NOT DONE** — **REQUIRES CARMEN** |
| A5 | Staging restore drill with Human B (PITR to new instance dry-run or documented) | **NOT DONE** — **REQUIRES CARMEN** |
| A6 | Written onrender.com thin-pilot hostname exception (dated) | **NOT DONE** — **REQUIRES CARMEN** |

**OPTION A READY:** **NO**

---

## OPTION B — Temporary owner exception (DRAFT — not accepted)

> **ISALWA thin staging pilot — temporary sole-recovery exception**  
>  
> Pilot start date: _______________  
> Review / expiry date: _______________ (not later than 30 days after start)  
>  
> Carmen is currently the sole recovery operator for Render staging (`os-web-staging`, `os-api-staging`, Postgres `isalwa-os-staging`) and Supabase Auth staging (`isalwa-os-auth-staging`).  
>  
> This exception applies **only** to the staging host `https://os-web-staging.onrender.com`. It is **not** production. No production-readiness claim is made.  
>  
> The company accepts temporary recovery risk for this short pilot window. Dual recovery (second Render admin, second Supabase admin, shared vault, restore drill) remains **required before any production claim or branded cutover**.  
>  
> Owner signature / date: _______________

**Do not mark accepted until Carmen signs.**

---

## Engineering recommendation

Thin **technical** safety can be true after Wave A hosted BV on deploy candidate `a97e17e…` while Option A is incomplete **only if** Carmen explicitly chooses Option B with dates filled.
