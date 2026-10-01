# ISALWA OS — Production Provider Architecture Review

**Status:** Recommendation only — **no implementation, no account changes, no migrations, no secret changes, no deployment**  
**Date:** 2026-08-27  
**Audience:** Carmen (platform handoff), future senior engineer, ISALWA operations  
**Scope:** ISALWA OS (`os-web`, `os-api`, `os-database`, provider ports). Architect remains a separate product.

This review selects the long-term production provider stack for a **real Bolivian company** with modest initial usage, not a hyperscale SaaS. It preserves the existing architecture thesis unless evidence requires a change.

---

## How to read this document

| Label | Meaning |
|-------|---------|
| **CURRENT** | Already in the repo or in pilot use. Keep. |
| **NEXT** | Required before (or at) production with real company data. |
| **LATER** | Correct direction; do not install now. |
| **NOT NEEDED** | Do not add unless a future requirement appears. |

**Architecture compatibility** for each provider:

| Label | Meaning |
|-------|---------|
| **NO ARCHITECTURE CHANGE** | Fits ports, ADRs, and runtime as they exist |
| **SMALL ADAPTER CHANGE** | New adapter module behind an existing port |
| **CONTRACT CHANGE REQUIRED** | Env/session/provider contract must widen |
| **MAJOR REARCHITECTURE** | Rejected for that reason |

Scores (Setup / Maintenance / Lock-in / Migration / Operational risk): **Low · Medium · High**.

Cost operating profile: **FREE / VERY LOW · LOW · MEDIUM · HIGH**. **Pay-as-you-grow:** YES / NO.

---

## Executive thesis

ISALWA OS is already the right shape:

- TypeScript modular monolith in a monorepo
- Next.js production web (`os-web`) + NestJS API (`os-api`)
- PostgreSQL as system of record (`OS_DATABASE_URL` / `os_*` schema)
- PostGIS when geography becomes authoritative
- Background work via **transactional outbox** co-hosted in `os-api` (ADR-0008)
- Ports/adapters for external systems (`packages/providers`, `AuthProviderPort`)
- Domain authorization, workforce lifecycle, PartyGraph, and finance boundary **owned by OS**
- Provider-neutral hosting runbooks already written

**Do not redesign the product to fit a vendor.**  
**Do not install the full vendor catalog before production.**  
**Do not use Carmen’s personal cloud server as the production authority.**

The Engineering Master Plan (EMP) still binds language, monolith, Postgres, and adapter philosophy. Several EMP Day-1 vendor picks are **superseded by evidence** from the OS that was actually built:

| EMP Day-1 pick | What OS actually built | This review |
|----------------|------------------------|-------------|
| Auth.js + Redis sessions | `AuthProviderPort` + JWT (`Local` / `Supabase`) | Keep the port. Do not go back to Auth.js. |
| Redis + BullMQ Day 1 | Postgres outbox worker inside `os-api` | Keep outbox. Redis later, only if volume demands it. |
| Vercel as production web | Provider-neutral deploy runbook; Step 17 hosting **OPEN** | Vercel is preview-only. Production web runs next to the API. |
| Neon as default DB | Portable Prisma + Postgres 16; local PostGIS image | Managed always-on Postgres. Not serverless-by-default. |

`packages/providers` already names the intended live adapters: `meta`, `mapbox` / `google`, `openai` / `anthropic`, `r2` / `s3` / `minio`, `postgres` → `meilisearch`, `playwright` / `reactpdf`, `resend`. This review **confirms** those names where they still fit, and fills the gaps the mock registry never covered (identity, hosting, backups, secrets, observability, DNS).

---

## Canonical split (non-negotiable)

```
Credentials / sessions     →  Auth provider (IdP)
Blobs                      →  Object storage
Delivery of messages       →  Email / WhatsApp / maps / LLM vendors
Official money / fiscal    →  External accounting (when connected)
Everything else            →  ISALWA OS Postgres
```

OS remains authoritative for:

- `Person`, `OrganizationMember`, `AuthIdentity` link, employment, `accessStatus`
- Roles, scopes, delegations, territory, resource ownership
- PartyGraph, commercial objects, work, approvals, events, audit
- Integration health, capability registry, projections

Providers must not become business authority.

---

# 1. Authentication / identity

## Recommendation

**Provider:** **Supabase Auth — credentials and sessions only**  
**Mode:** keep `OS_AUTH_MODE=supabase` for staging/production  
**Alternative:** WorkOS AuthKit **later**, if enterprise SSO / directory sync becomes a real requirement  
**Rejected for production IdP:** Clerk, Auth.js self-managed, Auth0, Cognito

| | |
|--|--|
| Cost | **LOW** (Free tier likely enough for internal staff; Pro ~USD 25/mo if needed) |
| Pay-as-you-grow | YES (MAU; irrelevant at ISALWA employee scale) |
| Setup | **Low** (adapter already exists) |
| Ongoing maintenance | **Low** |
| Vendor lock-in | **Medium** (user ids + password hashes live in GoTrue) |
| Migration difficulty | **Medium** (port exists; password hashes are the hard part) |
| Operational risk | **Low–Medium** (IdP outage ≠ DB outage; two vendors) |
| Architecture | **NO ARCHITECTURE CHANGE** |
| When | **CURRENT** (pilot) → **NEXT** (production IdP, separate project from Architect) |

### Why this is the ISALWA choice (not inertia)

ISALWA’s real identity problem is **workforce lifecycle**, not consumer signup:

- Internal employees first; client portal only possibly later
- Invite → activate → suspend → reactivate → terminate → rehire
- Immediate session revocation on suspend; credential revoke on terminate
- MFA for privileged roles
- Password login now; SSO later (hypothetical, not a current buyer requirement)
- Multi-organization **data model** already exists in OS; it is not “Clerk Organizations”
- API must verify JWTs in NestJS (`os-session.ts`)
- Another engineer must operate this without Carmen

The repo already implements exactly that split:

- `AuthProviderPort`: invite, revoke sessions, revoke credentials, update email
- `SupabaseAuthProviderPort` uses Admin API for those four operations
- OS transaction commits first; provider side effects retry; `RetryAuthProviderSync` exists
- Session path: JWT → provider subject → `AuthIdentity` → `OrganizationMember` → `accessStatus === active`

That is the correct production boundary. Replacing the IdP now would spend calendar time on a solved adapter while **hosting, backups, and monitoring are still OPEN** (Step 17.0 HG-17-01 / HG-17-03 / HG-17-06).

### Comparison

| Criterion | Supabase Auth | Clerk | WorkOS AuthKit | Auth.js / self-managed | Auth0 |
|-----------|---------------|-------|----------------|------------------------|-------|
| Email/password | Yes | Yes | Yes | You build it | Yes |
| Invitations | Admin invite **already wired** | First-class | First-class | You build it | Yes |
| MFA | TOTP available | Strong | Available | You build it | Strong |
| Session revoke | Global logout **already wired** | Yes | Yes | You build it | Yes |
| Suspend without deleting credentials | Yes (logout, keep user) | Possible; org status fights OS | Possible | You build it | Yes |
| Terminate / rehire | Delete user + new invite **already wired** | Possible; easy to misuse org membership | Possible | You build it | Yes |
| SSO later | SAML on higher plans | Higher plans | **Best in class** | Keycloak-level ops | Strong |
| Social login | Available, **not needed** | Excellent, **not needed** | Not the point | Optional | Yes |
| Org / roles | Must **not** use | Product gravity **owns orgs/roles** | Directory/org features | N/A | Rules engine temptation |
| NestJS JWT verify | Standard JWT | Different session model | Standard | Cookie-centric | Standard |
| Machine/service identity | Weak — **OS should own this** | Weak | Better | You build it | Strong |
| Internal 15–50 users cost | Very low | Low, then MAU | Platform fee for unused SSO | Eng time | High for the value |
| Handoff burden | Dashboard + existing runbooks | New vendor + org model conflict | New vendor, SSO-shaped product | **High ops forever** | Enterprise admin tax |
| Fit to ADR-0010 | **Good if constrained** | **Poor** (will become HRIS-lite) | Overkill now; good later | Control, bad ops | Overkill |

### Why not Clerk

Clerk is an excellent **product-auth** company. ISALWA is not a consumer or multi-tenant SaaS onboarding startups.

- Clerk’s value is hosted UI, social login, and **Clerk Organizations / roles**. OS already owns `Person`, `OrganizationMember`, effective-dated `RoleAssignment`, `accessStatus`, and admin commands (ADR-0010, ADR-0011).
- Using Clerk “just for passwords” still pulls membership and session semantics into a second source of truth. Using Clerk orgs would **silently become business authority**.
- Client users later are a **Party / portal membership** problem in OS, not a reason to buy a B2C identity suite now.
- Migration off Clerk is historically painful (session model, user ids, hosted components).
- Popularity is not a requirement.

### Why not WorkOS (including AuthKit)

WorkOS is the right product when **customers bring Okta / Azure AD / Google Workspace** and you sell software to many companies.

- ISALWA is **one company operating its own OS**, not CCA-style multi-customer SSO.
- Email/password + invite is the actual need. Paying a B2B SSO platform for 20 employees is the wrong cost and the wrong mental model for the next engineer.
- Directory sync / SCIM are useful **after** ISALWA has an HRIS. They do not have that requirement recorded.
- CCA using WorkOS is irrelevant. Different company shape.
- **Keep WorkOS as the documented SSO upgrade path** behind `AuthProviderPort` if a future buyer or parent company mandates SAML/OIDC IdP federation that Supabase cannot cover cleanly.

### Why not Supabase Auth as “the whole backend”

This recommendation is **not** “use Supabase for everything.”

Do **not** put OS system-of-record tables in Supabase Postgres.  
Do **not** use Supabase RLS as OS authorization.  
Do **not** use Supabase Organizations as tenants.  
Do **not** share the Architect Supabase project with OS production auth.

Supabase Auth is a **hosted GoTrue**. OS Postgres remains the business database. That split is intentional and should stay.

### Why not Auth.js / self-managed

EMP listed Auth.js. The OS implementation correctly replaced that with a port.

Self-managed auth means owning password hashing, invite mail, MFA, brute-force, session revocation, recovery, and audit — forever. That **increases** Carmen bus factor and violates low-maintenance handoff. Keycloak is the same class of operational load.

### Why not Auth0 / Cognito

Enterprise IdP tax (Auth0) or poor DX (Cognito) for a workforce of dozens. No ISALWA requirement they uniquely satisfy today.

---

## Auth decision questions

### A. Canonical identity model

Keep ADR-0010:

| Concept | Owner |
|---------|--------|
| **Person** | OS — canonical human across hire/terminate/rehire |
| **OrganizationMember** | OS — tenant employment period |
| **AuthIdentity** | OS row linking `provider` + `providerSubject` to Person |
| **Credentials, MFA enrollment, password reset** | IdP |
| **Session tokens** | IdP issues; OS verifies and then **denies** if member is not `accessStatus: active` |
| **RoleAssignment, DepartmentAssignment, Delegation** | OS only |
| **Client user (future)** | OS membership kind or portal role on the same Person/Party model — not a second IdP product |

One human can have multiple `AuthIdentity` rows over time (rehire). Person is never deleted.

### B. What stays in OS DB vs provider

**OS Postgres:** Person, member, assignments, `AuthIdentity.providerSubject`, access/employment status, audit, events.  
**Provider:** email/password (or SSO assertion), MFA secrets, refresh/session validity, invite email delivery for the auth message itself.

**Never in OS:** password hashes, MFA seeds, provider refresh tokens.

### C. What the provider should own

| Concern | Provider? |
|---------|-----------|
| Credentials | **Yes** |
| User profile (name, department, phone) | **No** — OS Person / member |
| Organization membership | **No** — OS |
| Roles / scopes | **No** — OS |
| Which org’s data they may see | **No** — OS session + tenant |

Provider user metadata must be treated as **non-authoritative**. Display names and emails used in the product come from OS after governance (email change is an OS command that then calls `updateEmail`).

### D. Suspend / terminate

Already contracted (Step 14.6) — keep:

| Action | OS | Provider |
|--------|----|----------|
| **Suspend** | `accessStatus: suspended`; identity row stays active | `revokeSessions` (global logout); **credentials preserved** |
| **Terminate** | `accessStatus: revoked`; employment ended; identity revoked | `revokeCredentials` (delete provider user) |
| **OS session** | Resolver denies non-active members even if JWT is valid | — |

If provider side effect fails after OS commit: access is still blocked in OS; operator runs `RetryAuthProviderSync`. Do not roll back employment because GoTrue blinked.

### E. Invite / rehire

| Action | OS | Provider |
|--------|----|----------|
| **Invite** | Person + member + `AuthIdentity` `invited` | `createInvite(email)` |
| **Activate** | `accessStatus: active` after first successful auth | User completes provider invite |
| **Rehire** | Same Person; **new** member period; **new** `AuthIdentity` | New invite (previous provider user was deleted on terminate) |

Do not “undelete” a terminated provider user as a substitute for OS rehire commands.

### F. Future SSO

1. Keep email/password as the default employee path.  
2. When a real IdP appears (Google Workspace / Microsoft / Okta): add SAML/OIDC on the **same** `AuthProviderPort` (Supabase SAML if sufficient).  
3. If federation requirements exceed Supabase (multiple customer IdPs, SCIM): implement `WorkOsAuthProviderPort` and map `providerSubject` → existing Person.  
4. **Do not** introduce SSO by copying roles from the IdP. Group claims may **suggest** a role; OS assignment remains the authority.

### G. Provider migration difficulty

**Medium, and already designed for.**

| Asset | Portability |
|-------|-------------|
| OS identity graph | Stays. New `AuthIdentity` rows with new provider subjects |
| Password hashes | Migrate only if both providers use compatible bcrypt and you run an export — usually **users reset passwords** |
| JWT issuer | `os-session.ts` + env validation must accept the new issuer (**CONTRACT CHANGE** at swap time, not now) |
| Invite/revoke API | New adapter class |

Env validation currently **hardcodes** `OS_AUTH_MODE` must be `supabase` on staging/production. That is acceptable while Supabase is the IdP. A future swap is a small contract widening (`supabase | workos`), not a domain rewrite.

**CURRENT ACTION:** Keep Supabase Auth. Create/use an **OS-only** Supabase project (not Architect). Do not change IdP before hosting is chosen.

---

# 2. Authorization

**Recommendation:** Existing split is correct. **Do not outsource RBAC.**

| Layer | Owner |
|-------|--------|
| Authentication | IdP + `os-session` JWT verify |
| Tenant isolation | OS `organizationId` (ADR-0003) |
| Access eligibility | OS `accessStatus` |
| RBAC / admin scopes | OS `RoleAssignment` + `packages/os-domain` |
| Resource ownership / territory | OS |
| Field masking (NIT, margin, credit, message bodies) | OS |
| AI retrieval | Same OS authorization snapshot (ADR-0009) |

| | |
|--|--|
| Architecture | **NO ARCHITECTURE CHANGE** |
| When | **CURRENT** |

Provider should not silently become business authority. Clerk Organizations, Auth0 Rules, Supabase RLS, and WorkOS roles are all **rejected** as authorization systems for ISALWA.

Machine/service identities (webhooks, future jobs calling the API): **OS-issued** credentials stored in secrets — not employee IdP users. Not Phase 1.

---

# 3. Database

## Recommendation

**Provider:** **Managed PostgreSQL 16** on the production host family, with PostGIS extension available  
**Primary pick:** **Render Postgres (Pro)** if the chosen plan documents PostGIS + automatic backups + PITR  
**Fallback / stronger HA:** **AWS RDS for PostgreSQL 16** in an **ISALWA-owned** AWS account (`postgis` extension)  
**Local/dev:** existing `postgis/postgis:16-3.4` compose image  
**Not production SoR:** Supabase Postgres, Neon scale-to-zero, Railway, Carmen Cursor XL, laptop Postgres

| | Render Postgres | AWS RDS | Neon | Supabase Postgres | Railway |
|--|-----------------|---------|------|-------------------|---------|
| PostGIS | Validate on plan | First-class | Available | Available | Uncertain |
| PITR | Pro+ | Yes | Yes | Pro+ | Weak historically |
| Prisma + pooling | Direct URL for migrate; pooled for runtime | Standard | Pooler caveats | **Supavisor transaction mode fights Prisma** | Varies |
| Always-on workers | Yes | Yes | Autosuspend is the trap | Compute limits | Yes |
| Portability | High (`pg_dump` already runbooked) | High | High | Coupled to Auth/Storage temptation | Medium |
| Handoff | Dashboard | Standard DBA skill | Good DX, extra mental model | Two products in one | Weak ops story |

| | |
|--|--|
| Cost | **LOW** (approx. USD 20–80/mo prod; staging cheaper) |
| Pay-as-you-grow | YES (storage/compute) |
| Setup | **Low–Medium** |
| Maintenance | **Low** (managed) |
| Lock-in | **Low** (Postgres is the portability) |
| Migration | **Low** (`BACKUP_RESTORE_RUNBOOK.md` already uses `pg_dump`) |
| Operational risk | **Low** if PITR + off-host copies; **High** if Carmen XL is “prod” |
| Architecture | **NO ARCHITECTURE CHANGE** |
| When | **CURRENT** = Carmen XL / docker (dev-pilot) · **NEXT** = ISALWA-owned managed Postgres |

### Why not Supabase Postgres for OS

Auth may stay on Supabase. The **business database must not**. Mixing Architect workspace SQL, OS `os_*` tables, and Auth in one project creates blast radius and RLS confusion. Prisma + transaction-mode poolers are a known operational footgun. Provider-neutral hosting is an explicit thesis.

### Why not Neon as production SoR

Neon is excellent for branching/staging experiments. Scale-to-zero and “serverless Postgres” fight a persistent NestJS API plus outbox poller. Do not choose it because it is trendy. **LATER** optional: Neon branch databases for PR/staging clones, with production remaining always-on Render/RDS.

### Why not Railway as SoR

Insufficient backup/PITR confidence for company operational data (parties, quotes, audit).

### Why not Carmen Cursor XL as production

ADR-0002 was the right **developer** decision. Production authority on a personal server makes ISALWA unable to operate without Carmen. Staging/production must live in an **ISALWA-owned** account.

### Connection pooling / migrations

- Runtime: pooler allowed.  
- `prisma migrate deploy`: **direct** (non-pooled) URL.  
- Document two URLs in env (`OS_DATABASE_URL` vs optional `OS_DATABASE_MIGRATE_URL`) when a pooler is introduced — **SMALL** env contract, not now.

### Staging vs production

Separate Postgres instances. No shared prod data in staging without sanitization. Restore drills use isolated DBs (already practiced: `isalwa_step17_restore`).

---

# 4. File / object storage

## Recommendation

**Provider:** **Cloudflare R2** (S3 API)  
**Local:** MinIO (already in `docker/docker-compose.yml`)  
**Alternative:** AWS S3 if the company standardizes on AWS  
**Not OS production:** Supabase Storage (Architect-only today)

| | |
|--|--|
| Cost | **VERY LOW** (near-zero at quote/PDF volume; no egress tax vs S3) |
| Pay-as-you-grow | YES |
| Setup | **Low** |
| Maintenance | **Low** |
| Lock-in | **Low** (S3 API; `StorageProvider` already named `r2` / `s3` / `minio`) |
| Migration | **Low** |
| Operational risk | **Low** |
| Architecture | **SMALL ADAPTER CHANGE** (live `R2StorageProvider`; mock exists) |
| When | **LATER** until PDFs/attachments ship · **NEXT** if production documents appear before that |

### Requirements the adapter must honor

- Tenant key prefix: `org/{organizationId}/...`
- Metadata + ACL in OS `document` rows; blob store is dumb
- Short-lived signed URLs; never public buckets for customer documents
- Lifecycle rules for temp renders; retain quote/order PDFs per policy
- Version id referenced by events (STORAGE_CONTRACT)

Architect’s Supabase Storage remains Architect’s problem. Do not reuse that bucket for OS.

---

# 5. Hosting / runtime

## Recommendation

**Provider:** **Render** for `os-web` + `os-api` (outbox worker **co-hosted** in `os-api`)  
**Preview (optional):** Vercel **preview deployments only** — not production authority  
**Alternative compute:** Fly.io (more control, more ops)  
**Later cloud:** ISALWA-owned AWS (ECS/Fargate or a small always-on pair) if they already run RDS/S3/SES as company standard  
**Rejected as production authority:** Vercel serverless for API/workers; Carmen personal VPS; splitting web and API across incompatible lifecycle models

| | Render | Fly.io | AWS ECS/Fargate | EC2/VPS | Vercel (web only) |
|--|--------|--------|-----------------|---------|-------------------|
| Persistent NestJS + poller | Yes | Yes | Yes | Yes | **No** (wrong) |
| Next.js | Yes | Yes | Yes | Yes | Best DX, **split-brain** |
| Health checks | Yes (`/v1/health`, `/v1/health/ready` exist) | Yes | Yes | DIY | N/A for API |
| TLS | Included | Included | ALB | DIY | Included |
| Rolling deploy / rollback | Yes | Yes | Yes | DIY | Yes |
| Logs | Included | Included | CloudWatch | DIY | Included |
| Handoff | **Best** for small team | Good if someone knows Fly | Transferable, heavier | Carmen-shaped | Web-only trap |
| Ops burden | **Lowest safe** | Medium | Medium–High | High bus factor | Low for web, **high architecture cost** |

| | |
|--|--|
| Cost | **LOW** (two services + Postgres: roughly USD 50–150/mo staging+prod combined at this scale) |
| Pay-as-you-grow | YES |
| Setup | **Low–Medium** |
| Maintenance | **Low** |
| Lock-in | **Low** (Node processes + Docker; runbooks already provider-neutral) |
| Migration | **Low–Medium** |
| Operational risk | **Low** on Render; **High** on personal VPS |
| Architecture | **NO ARCHITECTURE CHANGE** (deploy topology only) |
| When | **NEXT** (this is the first real provider decision) |

### Topology (production)

```
Cloudflare DNS/TLS  →  os-web (Next.js, Render)
                    →  os-api (NestJS + outbox worker, Render)
                         ↓
                    Managed Postgres 16 (+ PostGIS when enabled)
                         ↓
                    R2 (when storage live)
```

One API artifact includes the worker (Step 14.2, ENVIRONMENT_MAP). Do **not** add a separate worker deploy unit until Redis/BullMQ exists.

**Do not** put BullMQ, webhook receivers, or Prisma on Vercel serverless. EMP’s own staff-engineer note already said this; it applies even more now that the outbox poller is inside `os-api`.

### Why not “all AWS” yet

AWS is the right **long-term company cloud** if ISALWA hires an engineer who already lives there. It is not the smallest handoff for a 20-person operational company. Render + Postgres + R2 + Cloudflare is enough. Revisit ECS when there is a second always-on process (dedicated worker) or a compliance requirement.

---

# 6. Background jobs / queues

## Recommendation

**Now:** **PostgreSQL transactional outbox + `OutboxWorkerHost` inside `os-api`** (ADR-0008)  
**Later:** **BullMQ + Redis** only for high-volume delivery (WhatsApp ingest spikes, bulk email, heavy PDF) — still **fed from the outbox**, never as a second source of truth  
**Not now:** SQS, Cloud Tasks, a standalone worker dyno

| | Outbox (current) | BullMQ + Redis | SQS | Outbox-only forever |
|--|------------------|----------------|-----|---------------------|
| Fits commands + events | **Yes** | Downstream only | Downstream only | Yes until volume |
| Extra infra | None | Redis | AWS | None |
| Delayed jobs / SLA timers | Limited (poll) | Strong | Strong | Weak |
| Duplicate WhatsApp webhooks | Idempotency keys **already required** | Not a substitute | Not a substitute | Keep |

| | |
|--|--|
| Cost | **FREE** (no extra product) |
| Pay-as-you-grow | NO |
| Setup / maintenance / lock-in / migration | **Low** |
| Operational risk | **Low** at ISALWA volume; monitor outbox backlog (`GET /v1/operations/outbox`) |
| Architecture | **NO ARCHITECTURE CHANGE** |
| When | **CURRENT** keep · Redis **LATER** |

EMP’s Redis Day-1 recommendation is **superseded**. Adding Redis before WhatsApp/email volume is unnecessary infrastructure.

Disable switch already exists: `OS_OUTBOX_WORKER=0`.

---

# 7. Email

## Recommendation

**Provider:** **Resend** (matches `EmailProvider` union `'resend'`)  
**Alternative:** **Postmark** if Gmail/Outlook deliverability to Bolivian counterparts is poor  
**Cheap fallback:** AWS SES (more DNS/ops, worse DX)  
**Not preferred:** SendGrid (deliverability reputation + complexity)

Auth invite emails may continue to be sent **by Supabase Auth** for the credential message. OS-owned mail (quote PDF, notifications, non-auth invites copy) goes through `EmailProvider`.

| | |
|--|--|
| Cost | **VERY LOW / LOW** (free tier often enough; then ~USD 10–30/mo) |
| Pay-as-you-grow | YES |
| Setup | **Low** |
| Maintenance | **Low** |
| Lock-in | **Low** (adapter) |
| Migration | **Low** |
| Operational risk | **Low** if SPF/DKIM/DMARC on the company domain |
| Architecture | **SMALL ADAPTER CHANGE** |
| When | **NEXT** when OS sends mail; auth invites can stay on Supabase until then |

Inbound email: **LATER**. Not a Phase 1 provider. If needed, Postmark inbound or a dedicated mailbox webhook behind the same integration model.

---

# 8. WhatsApp / messaging

## Recommendation

**Provider:** **Meta WhatsApp Cloud API (direct)** on an official WhatsApp Business Account  
**BSP only if onboarding requires it:** **360dialog** (common LATAM BSP) behind the same `MessagingProvider`  
**Not preferred:** Twilio (tax + extra lock-in without SMS need)  
**Forbidden:** Unofficial WhatsApp Web scrapers, “multi-device hacks”, unofficial gateways

| | |
|--|--|
| Cost | **LOW → MEDIUM** (Meta conversation pricing; 3 numbers). Pay-as-you-grow **YES** |
| Setup | **Medium** (Meta Business verification, WABA, number quality) |
| Maintenance | **Medium** (templates, 24h window, quality rating) |
| Lock-in | **Medium** (WABA + templates live at Meta; **OS owns history and assignment**) |
| Migration | **Medium** (phone numbers can move; chat history must already be in OS) |
| Operational risk | **Medium** (policy bans, template rejection) — mitigated by official API only |
| Architecture | **SMALL ADAPTER CHANGE** (`meta` already in provider names) + IntegrationConnection |
| When | **LATER** — capability LOCKED until I-02 / Planificación WhatsApp approval |

### What OS must own (not Meta, not a BSP)

- 3 corporate numbers as **channels** (`IntegrationConnection`)
- Inbound/outbound **message artifacts** linked to Party/Contact
- Conversation assignment, SLA / response-time, operator work items
- Customer linking via PartyGraph resolution (never a parallel WhatsApp CRM)
- Future AI **drafts** with human send authority (ADR-0009 — no autonomous send)

Meta owns delivery receipts and the wire protocol. Duplicate webhooks: idempotency keys (ADR-0008).

Direct Cloud API is preferable to Twilio. Use 360dialog **only** as a regulated on-ramp, not as the domain model.

**CURRENT ACTION:** None. Mensajes stays honest-empty / hidden until connected.

---

# 9. AI / LLM

## Recommendation

**Do not build AI product features yet.**  
When enabled: **`AiProvider` with OpenAI primary + Anthropic fallback** (both already named). Gemini is a third adapter, not a reason to rewrite.

| | |
|--|--|
| Cost | **LOW** at assist volume; can become **MEDIUM/HIGH** if unconstrained. Pay-as-you-grow **YES** |
| Setup | **Low** (adapter) |
| Maintenance | **Medium** (prompts, evals, cost caps) |
| Lock-in | **Low** if ports stay |
| Operational risk | **Medium** (data leakage, hallucinated authority) — policy is the control |
| Architecture | **SMALL ADAPTER CHANGE** when lane opens |
| When | **LATER** — capability gated, kill switch per tier (ADR-0009) |

### Tasks that may belong in the system (later)

- Summaries of **already authorized** account facts
- Draft WhatsApp / email replies for human send
- Ranking explanations, “why this attention item”
- Optional OCR assist (see §18)

### Must never be AI-controlled

Identity merge, prices, credit, fiscal documents, permission elevation, autonomous external messages, silent ledger writes.

### Controls (when built)

- Same tenant + RBAC boundary as the user
- Output typed as FACT / PATTERN / CONCLUSION / RECOMMENDATION with provenance
- Prompt + model **version** stored with the suggestion; audit when acted on
- Per-tenant data: no training opt-in on customer content; no cross-tenant retrieval
- Cost: max tokens per org/day; kill switch
- Fallback: deterministic UI without AI — never fake a summary

---

# 10. Maps / geolocation

## Recommendation

**Canonical geo data:** **PostGIS in OS Postgres** (when enabled; today lat/lng decimals — known limitation)  
**Map display:** **Mapbox** via existing `MapboxMapProvider` (Santa Cruz bounds already encoded)  
**Geocoding:** Mapbox first; **Google Geocoding** as paid upgrade if Bolivian address quality is insufficient  
**Tiles alternative:** MapLibre + OSM (EMP already prefers vendor-neutral rendering)  
**Not now:** HERE, offline mobile packs

| | |
|--|--|
| Cost | **VERY LOW / LOW** (Mapbox free tier likely covers internal + modest field use) |
| Pay-as-you-grow | YES |
| Setup | **Low** (adapter exists) |
| Maintenance | **Low** |
| Lock-in | **Low–Medium** (style/token; data in PostGIS) |
| Migration | **Low** for data; **Medium** for map style |
| Operational risk | **Low** |
| Architecture | **NO ARCHITECTURE CHANGE** for Mapbox display · **SMALL ADAPTER** for live geocoding |
| When | **LATER** with Territorio / field GPS — not a production-auth blocker |

Bolivia/Santa Cruz: OSM street coverage is usable; POI and messy addresses often favor Google. **Do not** make Google the system of record for coordinates. GPS captured by the OS is authoritative; the map vendor is a lens.

---

# 11. Search

## Recommendation

**Now:** **PostgreSQL** (`pg_trgm` / FTS) on authoritative tables  
**Later:** **Meilisearch** when entity count or UX latency justifies it (`meilisearch` already in provider names)  
**Not:** Elasticsearch / OpenSearch (ops tax)  
**Typesense:** acceptable Meilisearch alternative; pick one later, not both

| | |
|--|--|
| Cost now | **FREE** |
| Pay-as-you-grow | N/A now; Meilisearch YES later |
| Maintenance now | **Low** |
| Lock-in | **Low** |
| Architecture | **NO ARCHITECTURE CHANGE** |
| When | **CURRENT** Postgres · Meilisearch **LATER** |

Search may lag writes (STORAGE_CONTRACT). UI must not treat search as sole truth.

---

# 12. Observability

## Recommendation

| Concern | Provider | When |
|---------|----------|------|
| **Error tracking** | **Sentry** (browser `os-web` + Node `os-api`) | **NEXT** |
| **Logs** | Render (or host) structured **pino** JSON + request id | **NEXT** with hosting |
| **Uptime** | **Better Stack** (or UptimeRobot) on `/v1/health` and `/v1/health/ready` | **NEXT** |
| **Metrics** | Host CPU/mem + outbox backlog gauge | **NEXT** (lightweight) |
| OpenTelemetry → Grafana/Honeycomb | Optional | **LATER** |
| CloudWatch | Only if all-in AWS | **LATER** |

| | Sentry | Better Stack uptime | Full OTel/Grafana | CloudWatch |
|--|--------|---------------------|-------------------|------------|
| Handoff | Excellent | Excellent | Heavy | AWS-shaped |
| Cost | **VERY LOW / LOW** (free or Team) | **VERY LOW** | MEDIUM | LOW if already AWS |

| | |
|--|--|
| Architecture | **NO ARCHITECTURE CHANGE** |
| Operational risk if skipped | **High** — HG-17-03 still OPEN |

Do not start with Prometheus. A second engineer needs an error inbox, not a metrics career.

PII: scrub NIT, message bodies, tokens in Sentry. Session replay off by default.

---

# 13. Backups / restore

## Recommendation

Provider automatic backups are **necessary but not sufficient**.

| Layer | What |
|-------|------|
| **Primary** | Managed Postgres daily snapshots + **PITR** (Render Pro or RDS) |
| **Off-host copy** | Encrypted `pg_dump` (custom format) to **R2** (or S3) — already the runbook tool |
| **Encryption** | Provider at-rest + dump encryption (`gpg` or SSE-C) |
| **Retention** | 30 days daily + pre-migration snapshot until verified; monthly retained longer as policy |
| **Documents** | R2 versioning + bucket replication or cross-account copy **when storage is live** |
| **Restore procedure** | Existing `BACKUP_RESTORE_RUNBOOK.md` + `verify-step-17-backup-restore.sh` |
| **Test cadence** | **Quarterly** restore to isolated DB; after every backup-system change |

| | |
|--|--|
| Cost | **LOW** (storage of dumps) |
| Architecture | **NO ARCHITECTURE CHANGE** |
| When | **NEXT** before real customer data (HG-17-06) |

Who can access backup objects: an ISALWA ops role, not a personal AWS login.

---

# 14. Secrets management

## Recommendation

**Now / production first cut:**

- **GitHub Environments** secrets (staging vs production, required reviewers on production)
- **Render (or host) runtime env** for `os-api` / `os-web`
- Never git; `.env.example` only

**Later (team > 2 or many keys):** **1Password Secrets Automation** or **Doppler** syncing into GitHub + host  
**Not first:** AWS Secrets Manager (unless all-in AWS)

Separate **DEV / STAGING / PRODUCTION**. No shared Supabase service role. No shared DB passwords.

| | |
|--|--|
| Cost | **VERY LOW** now; Doppler/1Password **LOW** later |
| Architecture | **NO ARCHITECTURE CHANGE** |
| When | **NEXT** with hosting · Doppler **LATER** |

Rotation: follow `SECRET_ROTATION_RUNBOOK.md`. Production deploy must not print secret values (Step 17.0 already fail-closed on that class of leak in validation errors).

---

# 15. Analytics / product telemetry

## Recommendation

**Business KPIs:** **OS Postgres only** (quotes, orders, work, attention). Never from a marketing pixel.

**Product analytics:** **none initially**.  
**If UI funnel questions appear:** **PostHog** self-hosted or EU/US cloud with PII minimization.  
**Plausible:** only if they want page-level web stats without product events — optional, not important.

| | |
|--|--|
| Cost | **FREE** now |
| Architecture | **NO ARCHITECTURE CHANGE** |
| When | **LATER** (PostHog) · **NOT NEEDED** to ship production OS |

---

# 16. PDF / document generation

## Recommendation

**Provider-neutral local/server rendering** via existing `PdfProvider`: **Playwright** (HTML → PDF) or **react-pdf** on `os-api`  
**Store bytes** in R2; **metadata** in OS  
**Not:** DocRaptor, PDFShift, Adobe PDF Services as a runtime dependency

| | |
|--|--|
| Cost | **FREE** (compute you already pay for) |
| Architecture | **SMALL ADAPTER CHANGE** (mock exists; `'playwright' \| 'reactpdf'` named) |
| When | **LATER** with quote send/print |

Quotes/orders/reports must remain generable if a SaaS PDF vendor disappears.

---

# 17. OCR / document extraction

## Recommendation

**Phase 1: NOT NEEDED.**  
**Later:** prefer **multimodal LLM via `AiProvider`** for low volume (invoices, cédulas) with human confirm.  
**High volume later:** Azure Document Intelligence or Google Document AI behind a new port — not in domain code.

Do not add Textract/Document AI packages now.

| When | **LATER / NOT NEEDED for production OS launch** |

---

# 18. CDN / assets

## Recommendation

**Cloudflare** in front of Render (DNS proxy + TLS + cache for public assets)  
**R2** for private documents (not CDN-public)  
**os-web** static assets: host default + Cloudflare cache

| Cost | **FREE / VERY LOW** | When | **NEXT** with domain |

Architecture: **NO ARCHITECTURE CHANGE**.

---

# 19. CI/CD

## Recommendation

**Keep GitHub Actions.** Do not add a second CI product.

**CURRENT:** install, `pnpm build`, `pnpm typecheck` (`.github/workflows/ci.yml`).

**NEXT (before production):**

1. Unit/integration tests (`os-database`, `os-api`) on PRs with a CI Postgres service  
2. `OS_RUNTIME_PROFILE` preflight (existing script)  
3. Staging deploy from `main`  
4. `prisma migrate deploy` against **staging** using a **direct** DB URL  
5. Production deploy: **GitHub Environment approval**  
6. Rollback = previous Render deploy; DB = forward-fix or restore (already in DEPLOYMENT_RUNBOOK)

Do not auto-migrate production without a human. Do not run `migrate dev` in CI against prod.

| Cost | **VERY LOW** (Actions minutes) | Architecture | **NO ARCHITECTURE CHANGE** | When | **NEXT** |

---

# 20. DNS / TLS

## Recommendation

**Cloudflare DNS** + Cloudflare proxy or Render-native TLS certificates on `api.` and app hostnames.  
Company domain (ISALWA-owned). HTTPS only.

| Cost | **VERY LOW** | When | **NEXT** with hosting |

---

# 21. Future accounting integration

**Do not choose accounting software in this review.** RD-03 remains `REQUIRES_CLIENT_CONFIRMATION`. QuickBooks in Architect is scaffold only and is **not** Bolivia-validated.

**Current boundary:** OS owns commercial commitments; external system owns GL, official invoice, official AR/AP when connected; OS holds `FinanceProjection` only (ADR-0007). Finance capability **LOCKED**.

**Future integration:** `IntegrationConnection` + vendor adapter + idempotent ingest + quarantine + reconciliation WorkItems. Excel/CSV fallback is first-class in Bolivia (category A in the discovery matrix). SIN / e-invoicing is a **later** fiscal gateway adapter, not a guess today.

Regional reality: many Bolivian SMBs are Excel + accountant or a local contabilidad package. International cloud accounting may not fit SIN. **Discover, then adapt.**

Architecture: **NO ARCHITECTURE CHANGE**. When: **LATER**.

---

# 22. Future payment integration

**Not current core scope.** Do not add Stripe “because SaaS.”

Bolivian money movement is more likely **bank transfer, deposit, QR, or a local acquirer** than a US card platform. When it exists: `PaymentProvider` / banking ingest → `payment.received` events → projections. Idempotent webhooks. OS must not become a processor.

Architecture: **NO ARCHITECTURE CHANGE** (integration model already exists). When: **LATER / NOT NEEDED** to launch.

---

# Decision matrix

| Domain | Recommended | Alternative | Why | Cost | Maintenance | Lock-in | Current action |
|--------|-------------|-------------|-----|------|-------------|---------|----------------|
| Auth / identity | Supabase Auth (credentials only) | WorkOS later for SSO | Adapter+lifecycle exist; fits ADR-0010; not Clerk/WorkOS-shaped | LOW | Low | Medium | **Keep**; split project from Architect |
| Authorization | OS RBAC/scopes | — | Must not be vendor-owned | FREE | Low | None | **Keep** |
| Database | Render Postgres Pro (PostGIS+PITR) | AWS RDS PG16 | Always-on, portable, not serverless | LOW | Low | Low | **Move off Carmen XL for prod** |
| Object storage | Cloudflare R2 | AWS S3 | S3 API, cheap egress; named in ports | VERY LOW | Low | Low | **Wait** until documents |
| Hosting | Render (`os-web` + `os-api`) | Fly.io; later AWS | Persistent API+worker; no Vercel authority | LOW | Low | Low | **Decide this first** |
| Jobs | Postgres outbox in API | BullMQ+Redis later | Already built; volume is low | FREE | Low | None | **Keep** |
| Email | Resend | Postmark; SES | Named in ports; low ops | VERY LOW | Low | Low | **When OS sends mail** |
| WhatsApp | Meta Cloud API | 360dialog BSP on-ramp | Official; OS owns inbox | LOW–MED | Medium | Medium | **Do not install** |
| AI | OpenAI + Anthropic adapters | Gemini adapter | Ports exist; human authority | LOW+ | Medium | Low | **Do not build** |
| Maps | Mapbox + PostGIS SoR | Google geocoding; MapLibre/OSM | Adapter exists; Bolivia geocode TBD | VERY LOW | Low | Low | **With Territorio** |
| Search | Postgres FTS/trgm | Meilisearch later | Avoid extra infra | FREE | Low | Low | **Keep** |
| Errors | Sentry | Host logs only | Fast handoff | VERY LOW | Low | Low | **Add with staging** |
| Logs | Host + pino JSON | Better Stack logs later | Enough | VERY LOW | Low | Low | **With hosting** |
| Uptime | Better Stack | UptimeRobot | Health endpoints exist | VERY LOW | Low | Low | **With hosting** |
| Backups | PITR + encrypted dump to R2 | RDS snapshots + dump | Runbook exists; provider snapshot ≠ DR | LOW | Low | Low | **Before real data** |
| Secrets | GitHub Env + host env | 1Password / Doppler later | Three environments, no repo secrets | VERY LOW | Low | Low | **With hosting** |
| Analytics | None (KPIs from OS) | PostHog later | Don’t mix telemetry with truth | FREE | None | None | **None** |
| PDF | Playwright/react-pdf on API | — | No SaaS PDF | FREE | Low | None | **When quotes print** |
| OCR | Not in Phase 1 | LLM multimodal later | No volume requirement | — | — | — | **Skip** |
| CDN/DNS/TLS | Cloudflare | Render TLS only | Cheap, portable | VERY LOW | Low | Low | **With domain** |
| CI/CD | GitHub Actions | — | Already there; add gates | VERY LOW | Low | Low | **Extend, don’t replace** |
| Accounting | None selected | Excel ingest first | RD-03; Bolivia unknown | — | — | — | **Locked** |
| Payments | None | Local/bank adapter later | Not core | — | — | — | **Skip** |

---

# CURRENT / NEXT / LATER

## CURRENT (keep)

- Monorepo, TypeScript, Next.js `os-web`, NestJS `os-api`, Prisma `os-database`
- `AuthProviderPort` + Supabase Auth adapter + OS workforce lifecycle
- OS-owned RBAC, tenant isolation, PartyGraph, commercial commands
- Postgres outbox worker co-hosted in API
- Provider **ports** (messaging, maps, ai, storage, search, pdf, email) + mocks
- Mapbox **view** adapter (not necessarily live token in prod yet)
- `pg_dump` restore drill scripts and runbooks
- GitHub Actions build/typecheck
- Step 17.0 fail-closed env validation
- Architect on its own Supabase/Vercel path (out of OS production scope)

## NEXT (production hardening — still not “every vendor”)

1. **ISALWA-owned Render (or Fly) staging + production** for web + API  
2. **ISALWA-owned managed Postgres** with backups/PITR — not Carmen XL  
3. **OS-only Supabase Auth project** (if not already isolated from Architect)  
4. **Cloudflare DNS/TLS**  
5. **GitHub Environment secrets** + host env  
6. **Scheduled encrypted dumps off-host** + quarterly restore  
7. **Sentry + uptime on health endpoints**  
8. **CI: tests + staging migrate** with production approval gate  
9. **Resend + R2** when the first OS email or document actually ships  

## LATER (do not install now)

- Redis / BullMQ / dedicated worker process  
- Meilisearch  
- Meta WhatsApp Cloud API (and 360dialog only if required)  
- Live Mapbox/Google geocoding in production field flows  
- OpenAI/Anthropic product features  
- Playwright PDF adapter  
- PostHog  
- Doppler or 1Password Secrets Automation  
- OpenTelemetry / Grafana  
- Neon for PR database branches  
- WorkOS (SSO/SCIM)  
- Accounting vendor adapter  
- Payment/bank adapter  
- OCR vendor  
- AWS ECS/Secrets Manager/CloudWatch **as a platform** (unless the company standardizes on AWS)

---

# Portability check

| Replace without rewriting domain | Port today | Status |
|----------------------------------|------------|--------|
| Email | `EmailProvider` | Mock; `'resend'` named |
| WhatsApp | `MessagingProvider` | Mock; `'meta'` named |
| AI | `AiProvider` | Mock; `'openai'` / `'anthropic'` named |
| Maps | `MapsProvider` + `MapProvider` | Mock + Mapbox view |
| Storage | `StorageProvider` | Mock; `'r2'` / `'s3'` / `'minio'` named |
| PDF | `PdfProvider` | Mock |
| Search | `SearchProvider` | Mock; Postgres is also native |
| Auth | `AuthProviderPort` | **Live Supabase + local** — domain identity stays in OS |

Auth will always couple more than email. **Person / member / roles must remain provider-independent.** That is already true.

---

# Carmen handoff

### RECOMMENDED PRODUCTION STACK

| Layer | Provider |
|-------|----------|
| Identity (credentials/sessions) | Supabase Auth |
| Authorization | ISALWA OS |
| Database | Managed PostgreSQL 16 (+ PostGIS when needed) on Render Pro or AWS RDS |
| Compute | Render: `os-web` + `os-api` (worker inside API) |
| Edge / DNS / TLS / CDN | Cloudflare |
| Objects | Cloudflare R2 (MinIO local) |
| Jobs | Postgres outbox (no Redis yet) |
| Email | Resend (Postmark if deliverability fails) |
| WhatsApp | Meta Cloud API (later) |
| AI | OpenAI + Anthropic adapters (later) |
| Maps | Mapbox + PostGIS (Google geocode if needed) |
| Search | Postgres (Meilisearch later) |
| Errors | Sentry |
| Uptime | Better Stack |
| Logs | Host structured logs |
| Backups | Provider PITR + encrypted `pg_dump` to R2 |
| Secrets | GitHub Environments + host env |
| CI/CD | GitHub Actions |
| PDF | Playwright or react-pdf on API |
| Analytics | None (OS data for KPIs) |

### AUTH

**Recommended provider:** Supabase Auth (credentials and sessions only).

**Why:** The OS already implements invite, session revoke, credential revoke, JWT verification, and access denial on suspend/terminate. ISALWA needs workforce lifecycle, not a consumer identity product. Cost and ops fit a Bolivian company OS. SSO can be added later without moving Person/Member out of OS.

**Why not Clerk:** Clerk wants to own organizations, membership, and roles. That fights ADR-0010 and would become a second HR system. Social login is irrelevant. Lock-in is worse for a one-company OS.

**Why not WorkOS:** WorkOS is for selling software to many companies that bring enterprise IdPs. ISALWA is one operating company with password login. CCA’s choice does not apply. Keep WorkOS as a **future** `AuthProviderPort` if real SAML/SCIM appears.

**Why not Supabase Auth as database/RLS/orgs:** That would collapse SoR into the IdP. Auth only.

**What OS continues to own:** Person, OrganizationMember, AuthIdentity mapping, employment, accessStatus, roles, scopes, delegations, tenant isolation, audit, admin lifecycle commands.

### DATABASE

**Recommended:** Managed PostgreSQL 16 with PostGIS available (Render Postgres Pro if PITR+PostGIS are on the plan; else AWS RDS in an ISALWA account).

**Why:** Always-on API + outbox; Prisma; portable `pg_dump`; not serverless; not Carmen’s personal server.

### HOSTING

**Recommended:** Render for Next.js + NestJS (worker co-hosted).

**Why:** Smallest operational burden that still supports persistent API, health checks, TLS, logs, rollback, and staging/prod — without Vercel as production architecture.

### STORAGE

**Recommended:** Cloudflare R2 (S3 API).

**Why:** Already named in provider ports; cheap egress; easy MinIO local equivalent; tenant prefixes + signed URLs.

### BACKGROUND JOBS

**Recommended:** Postgres transactional outbox in `os-api`.

**Why:** Already the spine of commands/events; ISALWA volume does not justify Redis yet.

### EMAIL

**Recommended:** Resend.

**Why:** Matches existing `EmailProvider` contract; low ops; SPF/DKIM on company domain. Postmark if inbox placement fails.

### WHATSAPP

**Recommended:** Meta WhatsApp Cloud API direct (official). 360dialog only as BSP on-ramp.

**Why:** Three corporate numbers, inbound/outbound, and history must live in OS. Unofficial integrations are forbidden. Twilio is unnecessary cost.

### AI

**Recommended:** Adapter to OpenAI with Anthropic fallback — **not built now**.

**Why:** Ports exist; human authority and audit are already ADRs. Cost and leakage risk require a kill switch before features.

### MAPS

**Recommended:** PostGIS as geo SoR; Mapbox for display (existing adapter).

**Why:** Fits Territorio; Google only if Bolivian geocoding quality requires it.

### MONITORING

**Recommended:** Sentry + host logs + Better Stack uptime.

**Why:** Low maintenance; HG-17-03 is still open; Grafana/OTel is later.

### BACKUPS

**Recommended:** Managed PITR **plus** encrypted off-host `pg_dump` to R2; quarterly restore drill.

**Why:** Runbook already proven locally; provider snapshots alone are not DR.

### SECRETS

**Recommended:** GitHub Environment secrets + host runtime env; DEV/STAGING/PRODUCTION split.

**Why:** Matches current runbooks; Doppler/1Password when the team is larger.

### CI/CD

**Recommended:** GitHub Actions with test + staging migrate + production approval.

**Why:** Already present; avoid a second CI; keep production migrate human-gated.

### SEARCH

**Recommended now:** PostgreSQL FTS / trigram.  
**Future option:** Meilisearch.

### ANALYTICS

**Recommended:** None for product analytics. Business reporting from OS data only.

### DOCUMENT/PDF

**Recommended:** Server-side Playwright or react-pdf via `PdfProvider`; store in R2.

### OCR

**NOW / LATER / NOT NEEDED:** **NOT NEEDED** for production launch. **LATER** via AI multimodal + human confirm if volume appears.

### ACCOUNTING

**Current boundary:** Finance LOCKED; OS is not the ledger; no vendor selected.  
**Future integration:** Adapter + Excel fallback + projections + reconciliation work — after client discovery.

### PAYMENTS

**Current boundary:** Not in scope; no processor.  
**Future integration:** Idempotent payment/bank events into OS; local rails more likely than Stripe.

### PROVIDERS WE SHOULD NOT ADD YET

Clerk, WorkOS, Auth0, Cognito, Auth.js as IdP, Neon as prod DB, Railway as prod DB, Supabase Postgres as OS SoR, Vercel as production runtime, Redis/Upstash, BullMQ, SQS, Meilisearch, Elasticsearch, Twilio WhatsApp, 360dialog (until Meta onboarding requires a BSP), OpenAI/Anthropic in production features, Gemini, Google Maps (until geocoding proves Mapbox insufficient), HERE, Sentry-alternatives stack (Datadog), Grafana Cloud, Honeycomb, PostHog, Plausible, Doppler, 1Password Secrets Automation, AWS Secrets Manager, Textract, Azure Document Intelligence, Google Document AI, DocRaptor/PDF SaaS, Stripe, QuickBooks (or any accounting vendor), LaunchDarkly.

### ESTIMATED MONTHLY INFRA PROFILE

**LOW** (order-of-magnitude **USD 80–200/mo** for staging+production at modest usage, excluding Meta conversation fees and future LLM).

Major cost drivers later: **Render service size**, **Postgres storage**, **WhatsApp conversation volume**, **LLM tokens**, **Map/geocode volume**. Not MAU identity pricing.

### VENDOR LOCK-IN RISKS

1. **Supabase user ids + password hashes** (mitigate: OS Person remains canonical; users can reset on IdP swap).  
2. **Meta WABA + message templates** (mitigate: OS stores history/assignment).  
3. **Mapbox style/token** (mitigate: coordinates in PostGIS; MapLibre path exists).  
4. **Render-specific deploy config** (mitigate: provider-neutral runbooks + Dockerizable Node).  
5. **Temptation to put OS data in Supabase** (mitigate: this document — do not).  
6. **Clerk/WorkOS if adopted casually** (mitigate: do not adopt).

### ARCHITECTURE CHANGES REQUIRED

**NONE** to domain, authorization, outbox, or provider port shapes.

Acceptable later (not blockers for choosing hosting):

- Widen `OS_AUTH_MODE` when/if IdP changes (**CONTRACT CHANGE** at swap time).  
- Live adapter classes for R2, Resend, Meta, Sentry SDK (**SMALL ADAPTER CHANGE**).  
- Optional `OS_DATABASE_MIGRATE_URL` when a pooler appears.

EMP Day-1 **Auth.js + Redis + Vercel-as-prod-web** should be treated as **superseded for OS production**. That is a documentation alignment, not a rewrite.

### WHAT TO KEEP FROM CURRENT ARCHITECTURE

- Modular monolith, monorepo, TypeScript  
- `os-web` / `os-api` / `os-database`  
- Ports and adapters; mocks blocked in production  
- `AuthProviderPort` and OS-owned workforce identity  
- ADR-0003 tenant isolation; ADR-0008 outbox; ADR-0009 AI authority; ADR-0010 lifecycle  
- Finance/accounting boundary; no second ledger  
- Provider-neutral deploy, backup, and secret runbooks  
- Health/readiness and fail-closed env validation  
- Co-hosted outbox worker  

### WHAT SHOULD CHANGE BEFORE PRODUCTION

1. Production/staging host and database **owned by ISALWA**, not Carmen XL  
2. OS Auth Supabase project isolated from Architect  
3. Off-host encrypted backups + restore cadence on staging  
4. Sentry + uptime checks  
5. GitHub Environment secrets and production deploy approval  
6. CI tests against Postgres, not only build/typecheck  
7. DNS/TLS on company domain  
8. Do not load real customer data until 1–7 exist  

### FIRST PROVIDER DECISION WE ACTUALLY NEED

**Where staging and production run: Render (compute) + managed Postgres in an ISALWA-owned account.**

Do not change the IdP first. Auth is already adapted. Hosting is the open production gate (HG-17-01).

### NEXT 5 IMPLEMENTATION STEPS

1. **Choose and record** ISALWA-owned Render (or Fly) + managed Postgres; reject Carmen XL as production.  
2. **Stand up staging** with `OS_RUNTIME_PROFILE=staging`, `OS_AUTH_MODE=supabase`, isolated OS Auth project, GitHub Environment secrets.  
3. **Turn on backup/PITR + off-host dump + one restore drill** on staging.  
4. **Add Sentry + uptime** on health endpoints; extend GitHub Actions with tests and staging migrate (human-gated prod).  
5. **Only then** add the next *capability* adapter (Resend/R2 when documents/mail ship — not WhatsApp, not AI, not Clerk).

STOP.
