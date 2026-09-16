# ISALWA Developer Handoff Gap Map

**Date:** 2026-09-15  
**Scope:** `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate`  
**Sources:** `company-os-recon-2026-09-15/agent-12-developer-handoff.md`, `company-os-recon-2026-09-15/agent-11-infra-owner-cost.md`  
**Assumption:** A senior engineer must operate and continue development without Cursor chat history and without Carmen.

---

## Verdict

**PARTIAL / NOT READY for takeover.**

A senior engineer can partially understand the OS path and run pieces of the system if they ignore the root README and dig into `apps/os-web/README.md`, `docs/operations/ENVIRONMENT_MAP.md`, `BACKUP_RESTORE_RUNBOOK.md`, Wave2 staging checklists, and code (`packages/os-contracts`, `packages/os-database`).

They **cannot** safely take full ownership without Carmen because:

1. Access is personal / undocumented — Render, Supabase Auth, GitHub (`carmen-ship-it`), billing, and `~/.isalwa-secrets` have no written grant path for a second engineer.
2. This worktree is missing canonical ops runbooks that main has.
3. Root onboarding orients to the legacy demo (`apps/web` / `apps/api` / `DATABASE_URL`), not OS (`os-web` / `os-api` / `OS_DATABASE_URL`).
4. Monitoring is MISSING — health endpoints exist; no Sentry/uptime/alert ownership.
5. No consolidated TECHNICAL HANDOFF & OPERATIONS MANUAL — knowledge is scattered.

**Not** future-developer-takeover-ready. Engineering depth for backup/auth contracts/fixtures is stronger than average for this stage; organizational access + single manual are the blockers.

---

## Classification matrix

Scale: **COMPLETE** | **PARTIAL** | **MISSING**  
Scope: **this worktree only**.

| Area | Classification | Evidence | Gap |
|------|----------------|----------|-----|
| README | PARTIAL | Root `README.md` exists; `apps/os-web/README.md` is OS-correct | Root quick start targets legacy `apps/web`+`apps/api`, `DATABASE_URL`, `seed:demo`. Omits `os-web` / `os-api` / `os-database`. |
| Architecture docs | PARTIAL | Engineering master plan, Wave2 evidence, staging/prod plan, AI/map boundaries | Overview + known-limitations are legacy. `ISALWA_OS_HANDOFF_MANIFEST.md` absent. Architect docs collide with OS. Only ADR-0001/0002 present. |
| Repo map | PARTIAL | Root ASCII map; os-web README clarifies OS vs legacy | Root map incomplete; no os-api README; Architect vs OS vs legacy not one diagram. |
| Local setup | PARTIAL | `pnpm dev:os-api` / `dev:os-web`; os-web README; os `*.env.example` | Onboarding + CONTRIBUTING still legacy ports. No single Day-1 OS local index (`operations/README.md` missing). |
| Env setup | PARTIAL | `ENVIRONMENT_MAP.md`; os-api/os-web `.env.example`; fail-closed profile rules | Root `.env.example` legacy. Dual `DATABASE_URL` vs `OS_DATABASE_URL`. Env map stale on hosted provisioning vs staging proof. |
| Staging | PARTIAL | Staging host operator checklist; Wave2 deploy/smoke; hosted verify scripts; Auth project refs | Historically Carmen-personal / API-key gated; first-admin chicken-egg; not reproducible without Carmen’s vault. |
| Production | PARTIAL | Ownership/cost register; production gates in staging plan | Production env **not evidenced**. Company ownership unfinished. Planning ≠ operable production. |
| Deploy | PARTIAL | Wave2 staging deployment checklists; V1 launch points at deploy runbook | `DEPLOYMENT_RUNBOOK.md` absent. No `render.yaml`. GitHub OS deploy workflow not canonical here. |
| Rollback | PARTIAL | Forward-fix rule in `V1_LAUNCH_SUPPORT_READINESS.md` | Full rollback section lives in missing `DEPLOYMENT_RUNBOOK.md`. No PRODUCTION-VERIFIED rollback drill. |
| Migration | PARTIAL | Prisma migrations present; env map migrate command | Review/apply/fail playbook not in-tree; incidental migrate during auto-deploy is a known Wave2 hazard. |
| Backup | PARTIAL | `BACKUP_RESTORE_RUNBOOK.md` (logical dump, encryption, staging recovery notes) | Off-host storage owner = informal Carmen path. PITR not a proven operator runbook. |
| Restore | PARTIAL | Same runbook; `scripts/verify-staging-hosted-backup-restore.sh` present | Referenced `./scripts/verify-step-17-backup-restore.sh` absent. Hosted PITR restore unproven. |
| Auth | PARTIAL | Env matrix; Supabase Auth-only vs OS DB split; V1 login/invite notes; os-web auth README | No zero-to-staging Auth playbook; Isa/Álvaro accounts not created; passwords/service role in informal vault. |
| RBAC | PARTIAL | `packages/os-contracts/src/scopes.ts`; V1 grant/revoke rules; Cargo ≠ scope | No operator-facing persona→scopes→UI catalog. Additional grants still tribal. |
| Tenant rules | PARTIAL | Isolation verify script; V1 synthetic residue markers; API enforcement in code | ADR-0003 missing from worktree. No single tenant-safety chapter for newcomers. |
| Real-data protections | PARTIAL | V1 launch readiness (do not reverse real import; synthetic markers; reassignment scopes) | No dedicated OS customer-data / breach / retention policy. Root `SECURITY.md` legacy-oriented. |
| Testing | PARTIAL | Turbo test; package tests; hosted shot/verify scripts; feature-proof Cursor rule | No unified OS test strategy (unit vs integration vs hosted acceptance vs fixture matrix). |
| Fixtures | PARTIAL | Wave2 role fixture scripts; isolation fixture markers; step17 seed referenced | Wrong-org / wipe risk high. No canonical fixture strategy index. Real tenant vs synthetic must stay separate. |
| Monitoring | MISSING | Health `/v1/health` (+ ready) documented; ownership register plans Sentry | No Sentry/uptime integration; no alert roster; `OBSERVABILITY_READY` open. |
| Providers | PARTIAL | `packages/providers`; AI/map boundaries; ownership register | Live map/WhatsApp/AI/email mostly unwired; no “enable provider X” OS runbook with fail modes. |
| Incident response | PARTIAL | V1 launch symptom→procedure table; health/outbox notes | `INCIDENT_RUNBOOK.md` absent. Escalate-to person undefined if Carmen gone. |
| Release process | PARTIAL | `docs/github/BRANCHING.md`; Wave2 acceptance/deploy gates | Root `RELEASE_CHECKLIST.md` is Architect. No OS tag→staging smoke→prod approval→migrate→deploy checklist. |
| Known limitations | PARTIAL | Living file exists; Wave2 UNPROVEN/BLOCKED notes; AI/map boundaries honest | `known-limitations.md` still says Auth/RBAC not enforced — stale vs current OS. No single living OS limitations index. |
| Roadmap boundaries | PARTIAL | `AI_PILOT_BOUNDARY.md`, `MAP_GEO_BOUNDARY.md`, product missions, constitution | No one-page “do not build now” for a takeover engineer. |

### Counts

| COMPLETE | PARTIAL | MISSING | Total |
|----------|---------|---------|-------|
| 0 | 23 | 1 | 24 |

---

## Gaps vs main worktree (missing runbooks / handoff assets)

These paths exist on main (or are expected there) but are **absent from this worktree**. Launch notes and V1 readiness often **point at files that are not in this tree**.

| Path | This worktree | Main (sibling) | Why it blocks takeover |
|------|---------------|----------------|------------------------|
| `docs/operations/README.md` | NO | YES | No Day-1 ops index / navigation hub |
| `docs/operations/DEPLOYMENT_RUNBOOK.md` | NO | YES | Deploy + rollback procedure referenced but missing |
| `docs/operations/INCIDENT_RUNBOOK.md` | NO | YES | Outage diagnosis / escalate path missing |
| `docs/operations/SECRET_ROTATION_RUNBOOK.md` | NO | YES | Rotation procedure referenced but missing |
| `docs/architecture/ISALWA_OS_HANDOFF_MANIFEST.md` | NO | YES | Canonical OS handoff index absent |
| `docs/adr/0003-os-tenant-isolation.md` (+ most OS ADRs) | NO | YES | Tenant isolation ADR and most OS ADRs absent |
| `scripts/verify-step-17-backup-restore.sh` | NO | YES (expected) | Local restore drill script referenced but missing |
| `render.yaml` | NO | — | No Blueprint IaC; live control plane is Render Dashboard only |

**Present here (partial mitigation):** `scripts/verify-staging-hosted-backup-restore.sh`, `BACKUP_RESTORE_RUNBOOK.md`, `ENVIRONMENT_MAP.md`, `STAGING_HOST_OPERATOR_CHECKLIST.md`, `PRODUCTION_OWNERSHIP_AND_COSTS.md`, `V1_LAUNCH_SUPPORT_READINESS.md`.

---

## Proposed structure — ISALWA TECHNICAL HANDOFF & OPERATIONS MANUAL

*Target permanent manual. Section order fixed. For each section: what to put + which existing docs to absorb.*

### 1. Start Here
- **Put:** Audience (new senior engineer); OS vs Architect vs legacy; status tiers (PLANNED → USER-ACCEPTED); last verified hosted SHA/URL; “read this before touching staging.”
- **Absorb:** Agent 12 verdict framing; onboarding-pass / visual-system-pass receipts for hosted SHA; `docs/architecture/AI_CONSTITUTION.md` pointer only.

### 2. 30-minute orientation
- **Put:** What ISALWA OS is; what not to open; day-1 success criteria; forbidden actions (fake coords, reverse real import, mock providers in prod).
- **Absorb:** `V1_LAUNCH_SUPPORT_READINESS.md` safety bullets; `AI_PILOT_BOUNDARY.md` / `MAP_GEO_BOUNDARY.md` one-liners; constitution never-do list.

### 3. Architecture
- **Put:** os-web / os-api / os-database; co-hosted outbox worker + attention clock; Auth vs system-of-record split; ports/adapters.
- **Absorb:** Wave2 topology sections from `PRODUCTION_STAGING_IMPLEMENTATION_PLAN.md`; agent-11 service purpose rows; `OVERDUE_ATTENTION_CLOCK.md`.

### 4. Repo map
- **Put:** Apps/packages that matter; frozen paths (`apps/web`, `apps/api`, Architect); monorepo commands.
- **Absorb:** Root README repo map (corrected); `apps/os-web/README.md`; agent-12 repo-map gap notes.

### 5. Environments
- **Put:** LOCAL / TEST / STAGING / PRODUCTION matrix; hostnames; verification tiers; explicit “production NOT EVIDENCED.”
- **Absorb:** `ENVIRONMENT_MAP.md` (reconcile stale topology); `STAGING_HOST_OPERATOR_CHECKLIST.md`; Wave2 hosted acceptance docs; agent-11 staging vs production verdict.

### 6. Local development
- **Put:** Node/pnpm; `OS_DATABASE_URL`; `dev:os-api` / `dev:os-web`; health checks; Day-1 success checklist.
- **Absorb:** `apps/os-web/README.md`; os `*.env.example`; correct `dev:os-*` scripts (not legacy onboarding.md).

### 7. Database
- **Put:** Prisma schema location; `organizationId` boundary; projections vs authoritative tables; migrate command ownership.
- **Absorb:** `packages/os-database` docs/schema; `ENVIRONMENT_MAP.md` migrate notes; Wave2 predeploy migrate ownership doc.

### 8. Auth
- **Put:** `OS_AUTH_MODE`; Supabase Auth-only project; invite/activate; membership fail-closed; no in-app password reset; Auth DB ≠ OS SoR.
- **Absorb:** os-web auth README; V1 launch auth notes; `ENVIRONMENT_MAP.md` Auth matrix; agent-11 Supabase Auth row (ref, region, secret names only).

### 9. RBAC
- **Put:** Scopes catalog; Cargo ≠ scope; `ChangeRole` vs `GrantAdditionalRole` / `EndAdditionalRole`; UI visibility ≠ authority.
- **Absorb:** `packages/os-contracts/src/scopes.ts`; V1 grant/revoke rules from launch readiness.

### 10. Tenant isolation
- **Put:** ADR rules; foreign-tenant negatives; isolation fixture script; never helpful cross-tenant SQL.
- **Absorb:** ADR-0003 (from main when synced); `scripts/verify-staging-hosted-tenant-isolation.mjs`; V1 synthetic residue markers.

### 11. Data truth / provenance
- **Put:** OS Postgres as system of record; import batch residue; manual facts; empty UI ≠ broken.
- **Absorb:** V1 launch readiness data-truth notes; Wave2 evidence on imports/projections.

### 12. Business domains
- **Put:** Party, commercial, work, approvals, attention, finance desk boundaries; capability LOCKED lanes.
- **Absorb:** Product mission docs; Capacidades / capability catalog pointers; agent-11 Business Settings table (governed vs UI).

### 13. Events / audit / outbox
- **Put:** Business events, audit logs, outbox/DLQ ops endpoints, attention clock behavior.
- **Absorb:** `OVERDUE_ATTENTION_CLOCK.md`; V1 health/outbox notes; os-api outbox env contract.

### 14. Providers
- **Put:** Messaging/maps/AI/email/PDF ports; mock-by-default; intentionally unwired list; enablement gates and fail modes.
- **Absorb:** `AI_PILOT_BOUNDARY.md`, `MAP_GEO_BOUNDARY.md`, `PRODUCTION_OWNERSHIP_AND_COSTS.md` optional providers; `packages/providers`.

### 15. Deploy
- **Put:** Build/start; host env contract; staging vs production approval; no silent migrate on auto-deploy; Dashboard ownership until Blueprint exists.
- **Absorb:** `DEPLOYMENT_RUNBOOK.md` (from main); Wave2 staging deployment checklist; `WAVE2_PREDEPLOY_MIGRATE_OWNERSHIP.md`; agent-11 `render.yaml` absence notes.

### 16. Rollback
- **Put:** App rollback; DB forward-fix; never delete `_prisma_migrations`.
- **Absorb:** Rollback section of `DEPLOYMENT_RUNBOOK.md` (from main); forward-fix rule in `V1_LAUNCH_SUPPORT_READINESS.md`.

### 17. Migrations
- **Put:** Create/review/apply/verify; who may run against staging/prod; incidental migrate hazard.
- **Absorb:** Env map migrate command; Wave2 predeploy migrate ownership; Prisma migrations tree.

### 18. Backup
- **Put:** `pg_dump` procedure; naming; encryption; off-host path; managed provider recovery status; single-laptop risk.
- **Absorb:** `BACKUP_RESTORE_RUNBOOK.md`; agent-11 backup / vault rows.

### 19. Restore
- **Put:** Logical restore; drill script; when PITR is allowed; post-restore verification.
- **Absorb:** Same backup runbook; `scripts/verify-staging-hosted-backup-restore.sh`; sync `verify-step-17-backup-restore.sh` from main when available.

### 20. Monitoring
- **Put:** Health/ready today; future Sentry/uptime; PII scrub; alert ownership (not Carmen-only).
- **Absorb:** Agent-11 monitoring row; ownership register Sentry plan; frank MISSING status until integrated.

### 21. Incident response
- **Put:** Symptom index → runbook; outbox/DLQ; auth failures; bad deploy; escalate roster.
- **Absorb:** `INCIDENT_RUNBOOK.md` (from main); V1 launch symptom→procedure table.

### 22. Tests
- **Put:** Package tests; verify scripts; hosted acceptance rules; proof-matrix states (do not collapse).
- **Absorb:** Feature-proof Cursor rule; hosted verify/shot scripts; turbo/package test inventory.

### 23. Synthetic fixtures
- **Put:** Wave2 roles org; isolation tenant B; markers; never seed into real pilot org.
- **Absorb:** Wave2 fixture package scripts; V1 synthetic markers; real tenant id callouts from launch readiness.

### 24. Real-data protections
- **Put:** Real tenant id; do-not-reverse import; UAT mutation freeze; export/PII rules.
- **Absorb:** `V1_LAUNCH_SUPPORT_READINESS.md`; root `SECURITY.md` (OS rewrite, not legacy).

### 25. Secrets inventory
- **Put:** Names only; where stored; rotation; service_role never browser; break-glass two humans.
- **Absorb:** Agent-11 consolidated secret names; `SECRET_ROTATION_RUNBOOK.md` (from main); `ENVIRONMENT_MAP.md` / `.env.example` names.

### 26. Billing / ownership
- **Put:** Account register; company transfer targets; cost bands vs unverified invoices; VERIFY EXTERNALLY rule.
- **Absorb:** `PRODUCTION_OWNERSHIP_AND_COSTS.md`; full agent-11 OWNER_INFRASTRUCTURE_MAP seed.

### 27. Release acceptance
- **Put:** Branch/PR/CI; staging smoke; hosted SHA proof; production gate checklist (distinct from Architect).
- **Absorb:** `docs/github/BRANCHING.md`; Wave2 acceptance/deploy gates; OS-specific checklist (new; do not absorb Architect `RELEASE_CHECKLIST.md` as-is).

### 28. Known limitations
- **Put:** Living honest list (auth edges, unwired providers, map coverage, monitoring, production not evidenced).
- **Absorb:** Reconciled `known-limitations.md`; Wave2 UNPROVEN/BLOCKED notes; AI/map boundaries.

### 29. Safety rules
- **Put:** Never-do list; constitution pointers; real vs synthetic; AI may not act.
- **Absorb:** AI constitution; V1 launch safety; feature-proof matrix rule.

### 30. Takeover checklist
- **Put:** Access grants; vault; dual admin; read manual; local boot; staging read-only smoke; first PR; revoke departing engineer.
- **Absorb:** This gap map’s blockers section; agent-11 Carmen personal dependencies; owner guide revoke list (cross-link).

**Appendices (recommended):** link farm to existing runbooks; evidence register; account inventory without secret values; glossary.

---

## Takeover checklist blockers

Until these are cleared, status remains **PARTIAL / NOT READY**.

### P0 — blocks safe takeover if Carmen is gone

| # | Blocker | Evidence |
|---|---------|----------|
| 1 | Developer access path undocumented | Who invites to GitHub, Render, Supabase, vault, DB URLs — MISSING |
| 2 | Personal ownership of staging-adjacent accounts / billing | Carmen personal Render/Supabase/GitHub; company + two admins not completed (`PRODUCTION_OWNERSHIP_AND_COSTS.md`, agent-11) |
| 3 | Canonical ops runbooks missing from this worktree | Deploy, incident, secret rotation, ops README, handoff manifest, most OS ADRs |
| 4 | Root docs point at legacy stack | High probability of wrong product / wrong DB |
| 5 | No consolidated TECHNICAL HANDOFF & OPERATIONS MANUAL | Knowledge scattered across Wave2 evidence, ops fragments, Architect-colliding root docs |

### P1 — immediately after first pilot / before sole-admin engineer

| # | Blocker |
|---|----------|
| 6 | Monitoring + named on-call / alert destination (not Carmen-only) |
| 7 | OS release checklist (distinct from Architect) |
| 8 | Stale doc reconciliation (`ENVIRONMENT_MAP`, known-limitations, overview) |
| 9 | Fixture / real-tenant safety index (one page: which org, which scripts are forbidden) |
| 10 | Operator RBAC catalog (persona → scopes → UI) |

### P2 — important but not day-1 blockers

| # | Item |
|---|------|
| 11 | Provider enablement runbooks |
| 12 | OS-specific customer-data protection policy |
| 13 | Unified test strategy doc |
| 14 | PITR restore drill recorded |

### Checklist form (for the future manual §30)

Use only after P0 is cleared:

- [ ] Access grants completed (GitHub, Render, Supabase, vault, DB URLs) for two humans  
- [ ] Company (or dual-admin) ownership on critical accounts  
- [ ] Ops runbooks present in the working tree (or manual absorbs synced copies from main)  
- [ ] Root onboarding corrected or clearly superseded by Start Here  
- [ ] Consolidated TECHNICAL HANDOFF & OPERATIONS MANUAL published  
- [ ] Local OS boot verified (`dev:os-api` / `dev:os-web` + health)  
- [ ] Staging read-only smoke completed  
- [ ] First PR merged under branching rules  
- [ ] Departing engineer access revoked (GitHub, hosting, database, login admin, vault, laptop copies)  

---

## Key source index (this worktree)

| Topic | Path |
|-------|------|
| OS web local/auth | `apps/os-web/README.md` |
| Env map | `docs/operations/ENVIRONMENT_MAP.md` |
| Backup / restore | `docs/operations/BACKUP_RESTORE_RUNBOOK.md` |
| Staging operator | `docs/operations/STAGING_HOST_OPERATOR_CHECKLIST.md` |
| Ownership / cost | `docs/operations/PRODUCTION_OWNERSHIP_AND_COSTS.md` |
| Launch / UAT safety | `docs/operations/V1_LAUNCH_SUPPORT_READINESS.md` |
| AI boundary | `docs/operations/AI_PILOT_BOUNDARY.md` |
| Map boundary | `docs/operations/MAP_GEO_BOUNDARY.md` |
| Scopes / RBAC code | `packages/os-contracts/src/scopes.ts` |
| Tenant isolation script | `scripts/verify-staging-hosted-tenant-isolation.mjs` |
| Hosted backup verify | `scripts/verify-staging-hosted-backup-restore.sh` |
| Branching | `docs/github/BRANCHING.md` |
| Recon — developer handoff | `docs/operations/company-os-recon-2026-09-15/agent-12-developer-handoff.md` |
| Recon — infra / owner / cost | `docs/operations/company-os-recon-2026-09-15/agent-11-infra-owner-cost.md` |
| Missing but referenced | `DEPLOYMENT_RUNBOOK.md`, `INCIDENT_RUNBOOK.md`, `SECRET_ROTATION_RUNBOOK.md` |
