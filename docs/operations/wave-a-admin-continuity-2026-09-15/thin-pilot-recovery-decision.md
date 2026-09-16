# Wave A close — thin-pilot recovery decision receipt

**Date recorded:** 2026-09-16  
**Status:** **OPTION B SIGNED** — owner decision recorded  
**Deploy candidate (Wave A technical close):** `fc38ebe4f6a445aa1504436040aab257bbd33a4c`

Production environment remains **NOT EVIDENCED**. Staging host is `https://os-web-staging.onrender.com`.

---

## OPTION A — Dual recovery checklist

| ID | Item | Status |
|----|------|--------|
| A1 | Render second admin on team hosting `os-web-staging` / `os-api-staging` / `isalwa-os-staging` | **NOT DONE** |
| A2 | Supabase Auth staging second Owner/Admin (`isalwa-os-auth-staging`) | **NOT DONE** |
| A3 | Named Human B identified and invite accepted | **NOT DONE** |
| A4 | Shared interim/company vault with DB URL + service-role names (not chat paste) | **NOT DONE** |
| A5 | Staging restore drill with Human B (PITR to new instance dry-run or documented) | **NOT DONE** |
| A6 | Written onrender.com thin-pilot hostname exception (dated) | **NOT DONE** (superseded for thin-pilot gate by signed Option B) |

**OPTION A:** **NOT DONE**  
**OPTION A READY:** **NO**

---

## OPTION B — Temporary owner exception — **SIGNED**

**Pilot start date:** 2026-09-16  
**Review / expiry date:** 2026-09-30  

> **ISALWA thin staging pilot — temporary sole-recovery exception**  
>  
> Pilot start date: **2026-09-16**  
> Review / expiry date: **2026-09-30** (not later than 30 days after start)  
>  
> I approve a temporary exception for the ISALWA thin pilot to continue using the current staging environment while Carmen remains the sole evidenced recovery operator for parts of the hosting/authentication infrastructure.  
>  
> This exception applies only to the thin staging pilot hosted at:  
> https://os-web-staging.onrender.com  
>  
> It does NOT represent:  
> - production readiness  
> - company-owned production infrastructure  
> - completed infrastructure transfer  
> - completed dual recovery  
> - production operational acceptance  
>  
> I acknowledge the current temporary risks include dependence on Carmen’s existing Render/Supabase recovery access, billing/recovery accounts, local operational secrets, and current backup/recovery access.  
>  
> Dual recovery, a second trusted administrator, shared vault/recovery access, company-owned billing/accounts, and a separately evidenced production environment remain required before ISALWA is represented as production-ready.  
>  
> This exception expires on **2026-09-30** unless explicitly renewed or superseded by completed dual-recovery controls.  
>  
> Owner signature / date: **Carmen — 2026-09-16** (recorded from owner decision in chat)

**OPTION B:** **SIGNED**

No Render, Supabase, GitHub, billing, secret, or infrastructure ownership transfer was performed as part of recording this decision.

---

## Gate summary

| Gate | State |
|------|--------|
| Thin-pilot recovery gate | **SATISFIED BY DATED OWNER EXCEPTION** |
| Production recovery / ownership | **NOT SATISFIED** |
| Wave A technical close | **PASS** |
| Wave B precondition | **SATISFIED** |
