# Agent 12 — Future developer takeover / runbook / operations handoff

**Agent:** 12 only  
**Mode:** READ-ONLY  
**Date:** 2026-09-15  
**Repo audited:** `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate`  
**Assumption:** Carmen disappears tomorrow. A senior engineer must operate and continue development **without Cursor chat history**.  
**Not done:** Product features, consolidating permanent manuals, account transfers, deploys.

---

## Verdict

**PARTIAL — NOT takeover-ready.**

A senior engineer can **partially** understand the OS path and run pieces of the system if they ignore the root README and dig into `apps/os-web/README.md`, `docs/operations/ENVIRONMENT_MAP.md`, `BACKUP_RESTORE_RUNBOOK.md`, Wave2 staging checklists, and code (`packages/os-contracts`, `packages/os-database`).

They **cannot** safely take full ownership without Carmen because:

1. **Access is personal / undocumented** — Render, Supabase Auth, GitHub (`carmen-ship-it`), billing, and `~/.isalwa-secrets` have no written grant path for a second engineer.
2. **This worktree is missing canonical ops runbooks** that main has (`DEPLOYMENT_RUNBOOK.md`, `INCIDENT_RUNBOOK.md`, `SECRET_ROTATION_RUNBOOK.md`, `docs/operations/README.md`, `ISALWA_OS_HANDOFF_MANIFEST.md`, most OS ADRs). Launch notes **point at files that are not in this tree**.
3. **Root onboarding orients to the legacy demo** (`apps/web` / `apps/api` / `DATABASE_URL`), not OS (`os-web` / `os-api` / `OS_DATABASE_URL`).
4. **Monitoring is MISSING** — health endpoints exist; no Sentry/uptime/alert ownership.
5. **No consolidated TECHNICAL HANDOFF & OPERATIONS MANUAL** — knowledge is scattered across Wave2 evidence, ops fragments, and Architect-colliding root docs.

**Not** `FUTURE DEVELOPER TAKEOVER READY`.  
Engineering depth for backup/auth contracts/fixtures is stronger than average for this stage; organizational access + single manual are the blockers.

---

## Can a senior engineer… (without Carmen / without chat)

| Capability | Without Carmen? | Evidence / blocker |
|------------|-----------------|--------------------|
| Get access (GitHub, Render, Supabase, secrets, DB URL) | **No** | Access path **MISSING**; personal accounts; informal `~/.isalwa-secrets` |
| Understand architecture | **With friction** | Strong fragments + Wave2 docs; overview/legacy noise; handoff manifest **absent in this worktree** |
| Run locally | **Yes if lucky** | `apps/os-web/README.md` + `dev:os-*` correct; root README/CONTRIBUTING/guides wrong |
| Run tests | **Partial** | Package tests + verify scripts exist; no unified OS test strategy doc |
| Inspect staging | **Partial** | Hostnames/docs exist; operator login/secrets Carmen-held; some env map text stale |
| Deploy | **Partial / blocked** | Wave2 deploy checklists; **DEPLOYMENT_RUNBOOK missing here**; no `render.yaml` in tree |
| Rollback | **Partial** | Referenced in `V1_LAUNCH_SUPPORT_READINESS.md`; procedure file missing in tree |
| Migrate | **Partial** | Prisma migrations present; env map shows `migrate:deploy`; full review/fail playbook missing here |
| Restore DB | **Partial→strong** | `BACKUP_RESTORE_RUNBOOK.md` + hosted verify script; local step17 script name missing; PITR unproven as runbook |
| Manage auth | **Partial** | Env contract + V1 launch auth notes; bootstrap/invite still operator tribal |
| Manage roles / RBAC | **Partial** | `scopes.ts` + V1 grant/revoke rules; no operator role catalog |
| Manage tenants | **Partial→strong in code** | Isolation scripts; ADR-0003 **missing in this worktree** |
| Manage providers | **Partial** | Ports/mocks; map/WhatsApp/AI/email mostly off; no turn-on runbook |
| Rotate secrets | **Partial** | Referenced; **SECRET_ROTATION_RUNBOOK missing here**; vault informal |
| Diagnose outage | **Partial** | Health endpoints + V1 launch index; **INCIDENT_RUNBOOK missing here**; monitoring MISSING |
| Continue development safely | **Partial** | Branching docs + constitution; wrong-stack risk + real-tenant fixture danger |

---

## Classification matrix

Scale: **COMPLETE** | **PARTIAL** | **MISSING**  
Scope: **this worktree only** (gaps vs main called out where material).

| Area | Classification | Evidence | Gap |
|------|----------------|----------|-----|
| **README** | **PARTIAL** | Root `README.md` exists; product/architecture links; `apps/os-web/README.md` is OS-correct | Root quick start / repo map target **legacy** `apps/web`+`apps/api`, `DATABASE_URL`, `seed:demo`. Omits `os-web` / `os-api` / `os-database`. |
| **Architecture docs** | **PARTIAL** | `ENGINEERING_MASTER_PLAN.md`, Wave2 evidence, `PRODUCTION_STAGING_IMPLEMENTATION_PLAN.md`, AI/map boundaries | `overview.md` + `known-limitations.md` are **legacy M1/M2**. `ISALWA_OS_HANDOFF_MANIFEST.md` **NO** in worktree. Architect docs (`SECURITY_POSTURE`, `RELEASE_CHECKLIST`, root `OPERATIONS_RUNBOOK`) collide with OS. Only ADR-0001/0002 present. |
| **Repo map** | **PARTIAL** | Root ASCII map; os-web README clarifies OS vs legacy | Root map incomplete; no os-api README; Architect vs OS vs legacy not one diagram. |
| **Local setup** | **PARTIAL** | `pnpm dev:os-api` / `dev:os-web`; os-web README; os `*.env.example` | `docs/guides/onboarding.md` + `CONTRIBUTING.md` still legacy ports. No single “Day 1 OS local” index in this tree (`operations/README.md` **NO**). |
| **Env setup** | **PARTIAL** | `ENVIRONMENT_MAP.md`; `apps/os-api/.env.example`; `apps/os-web/.env.example`; fail-closed profile rules documented | Root `.env.example` legacy. Dual `DATABASE_URL` vs `OS_DATABASE_URL`. Env map still claims hosted OS “not provisioned” in places while staging hostnames exist elsewhere — **stale**. |
| **Staging** | **PARTIAL** | `STAGING_HOST_OPERATOR_CHECKLIST.md`; Wave2 deploy/smoke docs; hosted verify scripts; Auth project refs | Historically Carmen-personal / API-key gated; first-admin chicken-egg; not reproducible by a stranger without Carmen’s vault. |
| **Production** | **PARTIAL** | Ownership/cost register; production gates in staging plan | Production env **not evidenced**. Company ownership unfinished. Planning ≠ operable production. |
| **Deploy** | **PARTIAL** | Wave2 staging deployment checklists; `V1_LAUNCH` points at deploy runbook | **`DEPLOYMENT_RUNBOOK.md` absent in this worktree.** No `render.yaml`. GitHub OS deploy workflow not canonical here. |
| **Rollback** | **PARTIAL** | Forward-fix rule stated in `V1_LAUNCH_SUPPORT_READINESS.md` | Full rollback section lives in missing `DEPLOYMENT_RUNBOOK.md`. No recorded PRODUCTION-VERIFIED rollback drill. |
| **Migration** | **PARTIAL** | `packages/os-database/prisma/migrations/*` present; env map migrate command | Review/apply/fail playbook not in-tree; risk of incidental migrate during auto-deploy documented as Wave2 hazard. |
| **Backup** | **PARTIAL** | `BACKUP_RESTORE_RUNBOOK.md` (logical dump, encryption, staging Render recovery notes) | Off-host storage owner = informal Carmen path. PITR not a proven operator runbook. |
| **Restore** | **PARTIAL** | Same runbook; `scripts/verify-staging-hosted-backup-restore.sh` **YES** | Referenced `./scripts/verify-step-17-backup-restore.sh` **NO** in this worktree. Hosted PITR restore procedure unproven. |
| **Auth** | **PARTIAL** | Env matrix; Supabase Auth-only vs OS DB split; V1 login/invite notes; os-web auth README | No zero-to-staging Auth playbook; Isa/Álvaro accounts not created; passwords/service role in informal vault. |
| **RBAC** | **PARTIAL** | `packages/os-contracts/src/scopes.ts`; V1 grant/revoke (`ChangeRole` vs `GrantAdditionalRole`); Cargo ≠ scope | No operator-facing persona→scopes→UI catalog. Additional grants still tribal. |
| **Tenant rules** | **PARTIAL** | Isolation verify script; V1 synthetic residue markers; API enforcement in code | ADR-0003 **missing** from worktree docs. No single tenant-safety chapter for newcomers. |
| **Real-data protections** | **PARTIAL** | `V1_LAUNCH_SUPPORT_READINESS.md` (do not reverse real import; synthetic markers; reassignment scopes) | No dedicated OS customer-data / breach / retention policy. Root `SECURITY.md` legacy-oriented. |
| **Testing** | **PARTIAL** | `turbo` test; package tests; hosted shot/verify scripts; feature-proof Cursor rule | No unified OS test strategy (unit vs integration vs hosted acceptance vs fixture matrix) as engineer onboarding doc. |
| **Fixtures** | **PARTIAL** | Wave2 role fixture package scripts; isolation fixture markers; step17 seed referenced | Wrong-org / wipe risk high. No canonical fixture strategy index. Real tenant `01M2DV9F0V5DXS4G89AKF4D5SR` vs synthetic must stay separate. |
| **Monitoring** | **MISSING** | Health `/v1/health` (+ ready) documented; ownership register plans Sentry | No Sentry/uptime integration; no alert roster; `OBSERVABILITY_READY` open. |
| **Providers** | **PARTIAL** | `packages/providers`; AI/map boundaries; ownership register | Live map/WhatsApp/AI/email mostly **unwired**; no “enable provider X” OS runbook with fail modes. |
| **Incident response** | **PARTIAL** | `V1_LAUNCH_SUPPORT_READINESS.md` symptom→procedure table; health/outbox notes | **`INCIDENT_RUNBOOK.md` absent in this worktree.** Escalate-to person undefined if Carmen gone. |
| **Release process** | **PARTIAL** | `docs/github/BRANCHING.md`; Wave2 acceptance/deploy gates | Root `RELEASE_CHECKLIST.md` is **Architect**. No OS tag→staging smoke→prod approval→migrate→deploy checklist. |
| **Known limitations** | **PARTIAL** | Living file exists; many Wave2 “UNPROVEN/BLOCKED” notes; AI/map boundaries honest | `known-limitations.md` still says Auth/RBAC not enforced — **stale vs current OS**. No single living OS limitations index. |
| **Roadmap boundaries** | **PARTIAL** | `AI_PILOT_BOUNDARY.md`, `MAP_GEO_BOUNDARY.md`, product missions, constitution | No one-page “do not build now” for a takeover engineer (WhatsApp/AI/maps/delegation policy/etc.). |

### Counts

| COMPLETE | PARTIAL | MISSING | Total |
|----------|---------|---------|-------|
| 0 | 23 | 1 | 24 |

*Note:* Earlier main-repo Agent 5 scored several runbooks COMPLETE. **This worktree does not contain those files**, so scores here are intentionally harsher and more accurate for anyone cloning *this* tree alone.

### Worktree vs main drift (handoff-critical)

| Path | This worktree | Main (sibling) |
|------|---------------|----------------|
| `docs/operations/README.md` | NO | YES |
| `docs/operations/DEPLOYMENT_RUNBOOK.md` | NO | YES |
| `docs/operations/INCIDENT_RUNBOOK.md` | NO | YES |
| `docs/operations/SECRET_ROTATION_RUNBOOK.md` | NO | YES |
| `docs/architecture/ISALWA_OS_HANDOFF_MANIFEST.md` | NO | YES |
| `docs/adr/0003-os-tenant-isolation.md` (+ most OS ADRs) | NO | YES (main) |
| `scripts/verify-step-17-backup-restore.sh` | NO | YES (expected) |
| `scripts/verify-staging-hosted-backup-restore.sh` | YES | — |
| `render.yaml` | NO | — |

---

## Critical gaps (takeover blockers)

### P0 — blocks safe takeover if Carmen is gone

1. **Developer access path undocumented** — who invites to GitHub, Render, Supabase, vault, DB URLs.
2. **Personal ownership of staging-adjacent accounts / billing** — company + two admins not completed (`PRODUCTION_OWNERSHIP_AND_COSTS.md`).
3. **Canonical ops runbooks missing from this worktree** — deploy, incident, secret rotation, ops README, handoff manifest.
4. **Root docs point at legacy stack** — high probability of wrong product / wrong DB.
5. **No consolidated TECHNICAL HANDOFF & OPERATIONS MANUAL**.

### P1 — immediately after first pilot / before sole-admin engineer

6. Monitoring + named on-call / alert destination (not Carmen-only).  
7. OS release checklist (distinct from Architect).  
8. Stale doc reconciliation (ENVIRONMENT_MAP, known-limitations, overview).  
9. Fixture / real-tenant safety index (one page: which org, which scripts are forbidden).  
10. Operator RBAC catalog (persona → scopes → UI).

### P2

11. Provider enablement runbooks.  
12. OS-specific customer-data protection policy.  
13. Unified test strategy doc.  
14. PITR restore drill recorded.

---

## Proposed structure — ISALWA TECHNICAL HANDOFF & OPERATIONS MANUAL

*Outline only. Exact section order required by mission. Do not expand into full prose here.*

1. **Start Here** — audience; OS vs Architect vs legacy; status tiers (PLANNED→USER-ACCEPTED); last verified hosted SHA/URL; “read this before touching staging.”
2. **30-minute orientation** — what ISALWA OS is; what not to open; day-1 success criteria; forbidden actions (fake coords, reverse real import, mock providers in prod).
3. **Architecture** — os-web / os-api / os-database; co-hosted outbox worker; Auth vs SoR split; ports/adapters.
4. **Repo map** — apps/packages that matter; frozen paths (`apps/web`, `apps/api`, Architect); monorepo commands.
5. **Environments** — LOCAL / TEST / STAGING / PRODUCTION matrix; hostnames; verification tiers.
6. **Local development** — Node/pnpm; `OS_DATABASE_URL`; `dev:os-api` / `dev:os-web`; health checks.
7. **Database** — Prisma schema location; `organizationId` boundary; projections vs authoritative tables.
8. **Auth** — `OS_AUTH_MODE`; Supabase Auth-only project; invite/activate; membership fail-closed; no in-app password reset.
9. **RBAC** — scopes catalog; Cargo ≠ scope; `ChangeRole` vs `GrantAdditionalRole` / `EndAdditionalRole`; UI visibility ≠ authority.
10. **Tenant isolation** — ADR rules; foreign-tenant negatives; isolation fixture script; never helpful cross-tenant SQL.
11. **Data truth / provenance** — OS Postgres SoR; import batch residue; manual facts; empty UI ≠ broken.
12. **Business domains** — Party, commercial, work, approvals, attention, finance desk boundaries, capability LOCKED lanes.
13. **Events / audit / outbox** — business events, audit logs, outbox/DLQ ops endpoints, attention clock.
14. **Providers** — messaging/maps/AI/email/PDF ports; mock-by-default; intentionally unwired list; enablement gates.
15. **Deploy** — build/start; host env contract; staging vs production approval; no silent migrate on auto-deploy.
16. **Rollback** — app rollback; DB forward-fix; never delete `_prisma_migrations`.
17. **Migrations** — create/review/apply/verify; who may run against staging/prod.
18. **Backup** — `pg_dump` procedure; naming; encryption; off-host path; managed provider recovery status.
19. **Restore** — logical restore; drill script; when PITR is allowed; post-restore verification.
20. **Monitoring** — health/ready today; future Sentry/uptime; PII scrub; alert ownership.
21. **Incident response** — symptom index → runbook; outbox/DLQ; auth failures; bad deploy; escalate roster.
22. **Tests** — package tests; verify scripts; hosted acceptance rules; proof-matrix states (do not collapse).
23. **Synthetic fixtures** — Wave2 roles org; isolation tenant B; markers; never seed into real pilot org.
24. **Real-data protections** — real tenant id; do-not-reverse import; UAT mutation freeze; export/PII rules.
25. **Secrets inventory** — names only; where stored; rotation; service_role never browser; break-glass two humans.
26. **Billing / ownership** — account register; company transfer targets; cost bands vs unverified invoices.
27. **Release acceptance** — branch/PR/CI; staging smoke; hosted SHA proof; production gate checklist.
28. **Known limitations** — living honest list (auth edges, unwired providers, map coverage, monitoring).
29. **Safety rules** — never-do list; constitution pointers; real vs synthetic; AI may not act.
30. **Takeover checklist** — access grants; vault; dual admin; read manual; local boot; staging read-only smoke; first PR; revoke departing engineer.

**Appendices (recommended):** link farm to existing runbooks; evidence register; account inventory without secret values; glossary.

---

## Outline — OWNER OPERATIONS GUIDE (nontechnical)

*For Isa / Álvaro / company owners. No engineering jargon. Outline bullets only.*

1. **What ISALWA is** — company operating system for daily commercial work; not WhatsApp; not a spreadsheet.
2. **What services run it** — website, application server, business database, login service (separate from business data).
3. **What you pay for** — hosting, database, login; optional later: email, maps, AI; WhatsApp separate if ever connected.
4. **Where billing lives** — each provider’s dashboard; confirm invoices; do not treat planning bands as bills.
5. **Who owns each account today vs should** — Carmen personal vs company; **two people** who can pay and recover access.
6. **Domain / web address** — current staging hostname; future company domain; renewals.
7. **How employees are invited** — admin invites by email; each person has their own password; no shared login.
8. **How access is suspended or removed** — suspend vs leave the company; who may change roles; title/cargo is not permission.
9. **What happens when someone leaves** — history stays; work must be reassigned; login must stop.
10. **Backups** — copies of the business database exist; restore is an owner-approved engineering action, not a casual click.
11. **Who gets outage alerts** — must not be only one person; what owners should check first (site up? login page?).
12. **Who can deploy changes** — engineering only; production changes need approval; owners do not paste secrets into chat.
13. **Provider renewals** — hosting, database, login, domain, optional AI/maps/email.
14. **How to replace a developer** — require written handoff manual; least privilege; staging before production; dual ownership before sole admin.
15. **What access to revoke when a developer leaves** — GitHub, hosting, database, login admin, password vault, laptop copies.
16. **What company accounts should own** — hosting, database, login, GitHub org, domain, vault, billing cards.
17. **Data rules owners enforce** — no invented map points; spreadsheet is not the system of truth; real customers vs test data.
18. **Costs calendar** — pilot vs later production; what can be paused (e.g. AI) without stopping customers/quotes/orders.
19. **Escalation directory** — named roles once filled (empty template until then).
20. **Glossary** — staging vs production; login service vs business database; permission vs job title.

---

## Structured receipt

```yaml
agent: 12
lane: future_developer_takeover_runbook_handoff
mode: read_only
repo: wave2-remediation-integrate
date: 2026-09-15
verdict: PARTIAL
takeover_ready: false
classifications:
  README: PARTIAL
  architecture_docs: PARTIAL
  repo_map: PARTIAL
  local_setup: PARTIAL
  env_setup: PARTIAL
  staging: PARTIAL
  production: PARTIAL
  deploy: PARTIAL
  rollback: PARTIAL
  migration: PARTIAL
  backup: PARTIAL
  restore: PARTIAL
  auth: PARTIAL
  RBAC: PARTIAL
  tenant_rules: PARTIAL
  real_data_protections: PARTIAL
  testing: PARTIAL
  fixtures: PARTIAL
  monitoring: MISSING
  providers: PARTIAL
  incident_response: PARTIAL
  release_process: PARTIAL
  known_limitations: PARTIAL
  roadmap_boundaries: PARTIAL
counts: { complete: 0, partial: 23, missing: 1 }
worktree_missing_vs_main:
  - docs/operations/README.md
  - docs/operations/DEPLOYMENT_RUNBOOK.md
  - docs/operations/INCIDENT_RUNBOOK.md
  - docs/operations/SECRET_ROTATION_RUNBOOK.md
  - docs/architecture/ISALWA_OS_HANDOFF_MANIFEST.md
  - most OS ADRs beyond 0001/0002
critical_blockers:
  - developer_access_path_undocumented
  - personal_account_ownership_billing
  - ops_runbooks_absent_from_this_worktree
  - root_readme_legacy_orientation
  - no_consolidated_technical_handoff_manual
outlines:
  technical_manual_sections: 30  # Start Here → Takeover checklist
  owner_operations_guide: outlined
implementation: false
permanent_gap_map_file: not_written_here  # Control Tower / authorized docs lane
```

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
| Missing but referenced | `DEPLOYMENT_RUNBOOK.md`, `INCIDENT_RUNBOOK.md`, `SECRET_ROTATION_RUNBOOK.md` |
