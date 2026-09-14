# Wave 2 — staging preDeploy migrate ownership

**Date:** 2026-09-14  
**Candidate:** `ef7eeabdea5f8f4449ba706caa1a323435d96fcc`  
**Pin:** `316426f272bce29924ffd4991da88ffe7d421bbd` (unmoved)  
**Decision this pass:** **CONFIG_CHANGE_REQUIRES_APPROVAL**  
**Config changed by agent:** **NO**  
**Deploy:** **NO** · **Migrations run:** **NO** · **DB writes:** **NO**

---

## A. Current `preDeployCommand`

**Service:** `os-api-staging` (`srv-dajd64gae00c739gpk20`)

```
pnpm --filter @isalwa/os-database migrate:deploy
```

`os-web-staging` has **no** preDeploy migrate command.

---

## B. Config source of truth

| Question | Answer |
|---|---|
| Repo `render.yaml` / Blueprint | **None** in repo; `render blueprints` has no list sync for this workspace |
| Source | **Render service configuration** (Dashboard / API) — not repo-defined |
| Docs | Historical intent in `PRODUCTION_STAGING_IMPLEMENTATION_PLAN.md` § Service A (pre-deploy migrate for staging). That is documentation, not the live control plane. |
| Live control plane | Render `serviceDetails.envSpecificDetails.preDeployCommand` on `os-api-staging` |

---

## C. Staging-specific?

**YES.**

Workspace services with migrate preDeploy: **only** `os-api-staging`.  
No `os-api-prod` / `os-web-prod` services exist in this workspace (only staging web/api + postgres).

---

## D. Production impact?

**NONE today** — production OS services are not provisioned in this Render workspace.  
Clearing staging `preDeployCommand` cannot rewrite a non-existent prod service.  
Intended future prod model in plan already says: prod pre-deploy migrate **disabled**; migrate via approved workflow after backup.

---

## E. Why agent did not clear it now

Render deploy history for `os-api-staging` includes trigger **`service_updated`** (live deploy `1f767fa…`).  
Clearing `preDeployCommand` is a **service configuration update**. That class of change has previously **triggered an automatic deploy** of the service’s tracked branch (`main`), **not** the authorized candidate `ef7eeab`.

This pass forbids deploying. Therefore:

```
CONFIG_CHANGE_REQUIRES_APPROVAL
```

Smallest staging-only fix is clear and safe for production semantics, but **must be applied under Carmen authorization that accepts (or prevents) a possible `service_updated` redeploy of current `main`**.

---

## F. Exact change (authorized next)

| Field | Current | New |
|---|---|---|
| Pre-Deploy Command | `pnpm --filter @isalwa/os-database migrate:deploy` | **(empty / cleared)** |

Do **not** replace with another DB-writing command.

### Carmen — Dashboard path (exact)

1. [Render Dashboard](https://dashboard.render.com) → service **`os-api-staging`**  
2. **Settings** → **Build & Deploy**  
3. Field **Pre-Deploy Command**  
4. **Current value:** `pnpm --filter @isalwa/os-database migrate:deploy`  
5. **New value:** clear the field (blank)  
6. **Before Save:** note Auto-Deploy is **ON** for branch `main`  
7. **Save** may trigger a **`service_updated` deploy of current `main` tip** (today live `1f767fa…`) — **not** `ef7eeab`  
8. If that redeploy starts: it should **no longer** run migrations once preDeploy is cleared; still **not** the Wave 2 candidate deploy  
9. **Rollback:** restore Pre-Deploy Command to the exact string above and Save (may deploy again)

### Safer sequence (recommended)

1. Settings → Build & Deploy → **Auto-Deploy = Off** (Save — may itself `service_updated`)  
2. Clear **Pre-Deploy Command** (Save)  
3. Confirm Settings show Pre-Deploy empty  
4. **Do not** treat any incidental `main` redeploy as Wave 2 acceptance  
5. Separately authorize bounded deploy of exact `ef7eeab` (API then web) with migrate still **not** in preDeploy  

### CLI equivalent (after Carmen authorizes incidental redeploy risk)

```bash
# May trigger service_updated deploy of tracked branch tip — do not run until authorized
render services update srv-dajd64gae00c739gpk20 \
  --pre-deploy-command '' \
  --confirm -o json
```

(If empty string is rejected by CLI, clear via Dashboard.)

---

## G–L. This pass invariants

| Item | Value |
|---|---|
| Repo commit for config | **N/A** (not repo-defined) |
| DB writes | **NO** |
| Migrations run | **NO** |
| Deploy | **NO** |
| DB count | still **29** (not re-mutated; operator Gate C state) |
| Integration pin | **unchanged** |

---

## M. Decision

**CONFIG_CHANGE_REQUIRES_APPROVAL**

Reason: staging-only clear of `preDeployCommand` is the correct fix, but applying it likely auto-deploys current `main`, which this pass must not do without Carmen’s explicit acceptance of that side effect.

After Carmen clears preDeploy and confirms Settings show no migrate command → **DEPLOY_CONFIG_READY** for a subsequent authorized `ef7eeab` deploy pass.
