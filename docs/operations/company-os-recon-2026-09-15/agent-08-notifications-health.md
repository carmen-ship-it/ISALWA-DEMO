# Agent 08 — Notifications / Provider Health / Feedback / Change Log

**Date:** 2026-09-15  
**Agent:** 8 ONLY (read-only audit)  
**Repo root:** `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate`  
**Scope:** In-app notifications (email/WhatsApp future), trigger kinds, Provider/System Health human states, Product Feedback vs business issue, Change Log / Qué hay de nuevo  
**Method:** Codebase inspection only. No implementation. No policy invented.

**State vocabulary (only):** `LIVE` | `LIVE BUT PARTIAL` | `BACKEND ONLY` | `PLANNED` | `MISSING` | `INTENTIONALLY DEFERRED` | `NO LONGER NEEDED`

Cross-checks (do not re-own): Agent 3 (Attention/Commitments), Agent 5 (Data Health), Agent 6 (Qué cambió palette), Agent 11 (infra costs / health endpoints).

---

## Package map

| Concern | Location | Key symbols |
|---|---|---|
| Notification contract | `packages/os-contracts/src/notifications.ts` | `NOTIFICATION_KINDS`, `NOTIFICATION_CHANNEL = 'internal'`, `notificationDeliversExternally()`, `createInternalNotification`, `admitNotification`, `resolveIfSourceConditionGone` |
| Contract tests | `packages/os-contracts/src/notifications.test.ts` | Internal-only, dedup, read≠resolve |
| DB schema | `packages/os-database/prisma/schema.prisma` · migration `…/20260914133000_os_commitments_internal_notifications/migration.sql` | `OsInternalNotification` / `os_internal_notifications` |
| Web presentation | `apps/os-web/lib/notifications/{copy,links,view,persistence}.ts` · `components/notifications/{notification-center,notification-list}.tsx` | Spanish copy; honest `not_persisted` port |
| Escalation (not notices) | `apps/os-web/lib/escalation/types.ts` | `sendsNotification: false`, `callsProvider: false` |
| System controls shell | `apps/os-web/app/(app)/sistema/page.tsx` · `lib/roles/system-controls.ts` | `includesIntegrationHealth: false` |
| Map provider honesty | `apps/os-web/lib/map/provider-status.ts` | Human labels, no “error/failed/broken” |
| API health | `apps/os-api/src/health.controller.ts` · `health-ready.ts` | `GET /health`, `GET /health/ready` |
| Legacy (do not reuse) | `packages/database/prisma/schema.prisma` `Notification` | Explicitly excluded by OS migration comments |

---

## 1. Notifications — channels

| Channel | State | Evidence |
|---|---|---|
| **In-app (internal)** | **BACKEND ONLY** (contract + schema) · UI **unmounted** · persistence port still stub | Contract: `packages/os-contracts/src/notifications.ts` (`channel: 'internal'`). Schema + unique unresolved dedup index: migration `packages/os-database/prisma/migrations/20260914133000_os_commitments_internal_notifications/migration.sql`. Prisma model: `OsInternalNotification`. Web UI: `notification-center.tsx` / `notification-list.tsx` — **no import** of `NotificationCenter` outside its own file; **no nav item**; CROSS_LANE note: “No nav item is requested. No page route is requested” (`apps/os-web/lib/commitments/CROSS_LANE_CHANGE_REQUEST.md`). Persistence stub still returns `schema_not_available` (`apps/os-web/lib/notifications/persistence.ts`) despite table existing → honesty drift. **No** `apps/os-api` notification controller / inbox routes (grep empty). **No** domain emitter calling `createInternalNotification` / `admitNotification` outside contracts + tests. |
| **Email** | **INTENTIONALLY DEFERRED** | `notificationDeliversExternally(): false`; channel CHECK = `'internal'` only; copy: “No se envían por correo ni al teléfono” (`lib/notifications/copy.ts`); persistence test forbids sendgrid/smtp (`notifications.test.ts`). Transactional OS email is future infra (Agent 11), not a notification channel today. |
| **WhatsApp (as notice delivery)** | **INTENTIONALLY DEFERRED** | Same internal-only contract. Product WhatsApp send is unwired (`app/(app)/mensajes/page.tsx`, `WHATSAPP_UNWIRED` in `lib/guidance/catalog.ts`). Contact WhatsApp fields ≠ notification delivery. |
| **Push / FCM / web-push** | **MISSING** / out of contract | Explicitly excluded in tests and migration comments (“No email, push, or provider token columns”). |
| **Quiet hours / who-gets-what policy** | **MISSING** (business decision; not coded) | No preference store. Agent 3 lists quiet policy as BUSINESS DECISION REQUIRED — this agent does **not** invent thresholds. |

**Verdict for “Avisos live for employees”:** **not LIVE**. Ship language must not claim an operational inbox.

---

## 2. Notification kinds vs requested triggers

Contract kinds (`NOTIFICATION_KINDS` in `packages/os-contracts/src/notifications.ts`):

`approval_assigned` · `approval_decided` · `work_due` · `work_overdue` · `customer_attention` · `commitment_due` · `commitment_overdue` · `responsibility_changed` · `data_issue_review`

Spanish labels: `apps/os-web/lib/notifications/copy.ts`.

| Requested trigger | Matching kind(s) | Emission / wiring | State |
|---|---|---|---|
| **Assigned** (work / owner) | `work_due`, `responsibility_changed` (closest) | No emitter from work assign / reassign commands | **BACKEND ONLY** (kind exists) · **MISSING** (runtime) |
| **Approval** | `approval_assigned`, `approval_decided` | No emitter from approval request/decide | **BACKEND ONLY** · **MISSING** (runtime) |
| **Commitment** | `commitment_due`, `commitment_overdue` | Helpers `commitmentNoticeKind` / `resolveGoneCommitmentNotices` in contracts; no API create/list | **BACKEND ONLY** · **MISSING** (runtime) |
| **Issue** (business Issue product) | No `issue_*` kind; Attention `issueIdentity` is key-dedup only (`lib/work/issue-identity.ts`) | Company OS Issue aggregate **MISSING** (Agent 3). `data_issue_review` is **data** review, not business Issue | **MISSING** (business Issue notices) · `data_issue_review` kind **BACKEND ONLY** unwired |
| **Decision** | Closest: `approval_decided` | Coordination / operational decisions do **not** have notification kinds | **LIVE BUT PARTIAL** as approval-decided *kind only* · coordination decision → notice **MISSING** |
| **Correction** (production / warehouse / release) | **None** | Corrections append rows; no notice kind | **MISSING** |
| **Delegation** | **None** | Workforce create/revoke delegation UI exists (`components/admin/member-admin-actions-panel.tsx`); no notification kind or emit | **MISSING** (as notification) · delegation **LIVE** as admin capability elsewhere |

Escalation awareness explicitly does **not** send notices: `EscalationLimits.sendsNotification: false` (`apps/os-web/lib/escalation/types.ts`).

Source link targets (when a notice exists in memory): `apps/os-web/lib/notifications/links.ts` — only existing routes; commitment without `partyId` drops the card.

---

## 3. Provider / System Health UI (human states)

**Unified owner “System Health” page covering App/API/DB/Auth/Map/Email/WhatsApp/AI/Backups/Monitoring:** **MISSING**.

`/sistema` (`apps/os-web/app/(app)/sistema/page.tsx`) is a **system.admin** authorization shell that **explicitly does not** open integration health (`SYSTEM_ADMIN_MEANING.includesIntegrationHealth: false` in `lib/roles/system-controls.ts`; copy: “No reescribe historial ni abre salud de integraciones.”). Treat integration health on that surface as **INTENTIONALLY DEFERRED**.

`/administracion/capacidades` is **org feature capability flags**, not provider uptime (`components/admin/capability-list.tsx`) — do not score as System Health.

| Surface | Human-facing state today | State |
|---|---|---|
| **App** | Session shell states: expired / revoked / denied / unavailable (`app/(app)/layout.tsx` → `SessionExpiredState`, `AccountInactiveState`, `AccessDeniedState`, `ServiceUnavailableState`) | **LIVE BUT PARTIAL** (access/availability only; not a health dashboard) |
| **API** | `GET /v1/health` liveness (`status: ok`, `service: os-api`); `GET /v1/health/ready` readiness (`apps/os-api/src/health.controller.ts`). Client helper `os-api-client.health()` exists; **unused** by any page | **BACKEND ONLY** |
| **DB** | Readiness path pings DB when configured (`pingDatabase` via `health-ready.ts`) — ops/scripts, not UI | **BACKEND ONLY** |
| **Auth** | Login + invite completion + shell session states; provider is Supabase Auth (ops), not a health tile | **LIVE BUT PARTIAL** (session UX) · provider health tile **MISSING** |
| **Map** | Desk-local human labels: “Vista geográfica en preparación” + kinds `unavailable` / `token_present_unwired` / `mock_unwired` (`lib/map/provider-status.ts`; shown on `/mapa` via `MapCoverageBanner`) | **LIVE BUT PARTIAL** (mapa only; not System Health) |
| **Email** | No provider status UI; OS transactional email not wired | **MISSING** |
| **WhatsApp** | Honest unwired copy on Mensajes + guidance; no send/health tile | **LIVE BUT PARTIAL** (honesty) · health panel **MISSING** |
| **AI** | Gate Spanish denials when off / capped (`lib/ai/limits.ts`); guidance `AI_FUTURE_UNWIRED`; no consolidated health tile | **LIVE BUT PARTIAL** (gate messages) · health panel **MISSING** |
| **Backups** | Ops runbooks / scripts only (Agent 11); no in-app backup status | **MISSING** (UI) · ops **PLANNED**/documented outside product |
| **Monitoring** | Health endpoints only; no Sentry/uptime UI in os-web | **MISSING** (UI) |

---

## 4. Product Feedback loop vs business issue

| Concept | What exists | State |
|---|---|---|
| **Product Feedback loop** (report product bug / suggest UX / in-app feedback to builders) | No route, form, command, or Ayuda CTA under `apps/os-web`. `/ayuda` is governed guidance + walkthrough only (`app/(app)/ayuda/page.tsx`). | **MISSING** |
| **FormFeedback / toasts** | Commercial/ops form success-error UI (`components/commercial/form-feedback.tsx`, `components/states/app-toast.tsx`) | **LIVE** as **interaction feedback** — **not** a product feedback loop |
| **Business issue** (open problem / incident / “problemas abiertos”) | No Issue aggregate / command / list. Attention `issueIdentity` only collapses attention keys (`lib/work/issue-identity.ts`). Work items, approvals, commitments, data-health findings are separate. Agent 3: “Problemas abiertos = MISSING (no Issue)”. | **MISSING** as product object |
| **Data issue / “Dato por revisar”** | Notification kind `data_issue_review` + Data Health findings on Mapa (`lib/party/data-health.ts`) | Data Health **LIVE BUT PARTIAL** (Agent 5). Notice kind **BACKEND ONLY** unwired. Not product feedback. |
| **Field “reportar problema”** | Agent 6: no dedicated field command | **MISSING** |

**Do not invent policy** that equates FormFeedback, Data Health, Attention, or WorkItem with Product Feedback or a Business Issue tracker. Separation is **observed absence**, not a coded taxonomy.

---

## 5. Change Log / Qué hay de nuevo

| Expected | State | Evidence |
|---|---|---|
| Product **“Qué hay de nuevo”** / release notes UI | **MISSING** | No matching route, copy, or component under `apps/os-web` (confirmed Agent 6 §8). |
| Engineering `CHANGELOG.md` (repo root) | **LIVE** as eng artifact only | `/CHANGELOG.md` — Keep a Changelog; **not** exposed in Company OS UI. |
| Per-customer **“Qué cambió”** | **LIVE** (palette path) | `lib/productivity/what-changed.ts` + Command Palette mode `changed` — **not** a product changelog. |
| Org-wide what-changed / release feed | **MISSING** | `PRODUCTIVITY_NOT_IMPLEMENTED` id `org-what-changed`. |

---

## 6. Gap register (Agent 8 lane)

1. Schema exists for `os_internal_notifications`; web port still claims `schema_not_available`; no API; UI unmounted → **do not claim LIVE inbox**.
2. No emit path for any of the nine kinds (assigned / approval / commitment / …).
3. No notification kinds for **correction** or **delegation**.
4. Unified Provider/System Health UI **MISSING**; `/sistema` intentionally excludes it.
5. Product Feedback loop **MISSING**; Business Issue product **MISSING**; do not conflate with Data Health or FormFeedback.
6. Product “Qué hay de nuevo” **MISSING**; do not equate with party “Qué cambió”.
7. Email / WhatsApp as notification channels remain **INTENTIONALLY DEFERRED** by contract (`channel = internal` only).

---

## 7. Scorecard (Agent 8)

| Subfeature | State |
|---|---|
| In-app notification contract + kinds | **BACKEND ONLY** |
| In-app notification DB table | **BACKEND ONLY** |
| In-app notification API + persistence wire | **MISSING** |
| In-app notification UI (mounted inbox) | **MISSING** (components exist, unmounted) |
| Email notifications | **INTENTIONALLY DEFERRED** |
| WhatsApp notifications | **INTENTIONALLY DEFERRED** |
| Trigger: assigned | Kind **BACKEND ONLY** · emit **MISSING** |
| Trigger: approval | Kind **BACKEND ONLY** · emit **MISSING** |
| Trigger: commitment | Kind **BACKEND ONLY** · emit **MISSING** |
| Trigger: issue (business) | **MISSING** |
| Trigger: decision (non-approval) | **MISSING** |
| Trigger: correction | **MISSING** |
| Trigger: delegation | **MISSING** |
| Provider/System Health UI (full matrix) | **MISSING** |
| Map / Auth / App human honesty fragments | **LIVE BUT PARTIAL** |
| API/DB health endpoints | **BACKEND ONLY** |
| Product Feedback loop | **MISSING** |
| Business Issue product | **MISSING** |
| Qué hay de nuevo (product) | **MISSING** |
| Qué cambió (customer) | **LIVE** (owned by Agent 6) |

---

## 8. Explicit non-goals of this receipt

- No emission policy, quiet hours, or recipient matrix invented.
- No wiring of persistence, API, or NotificationCenter mount.
- No Provider Health page design.
- No Product Feedback vs Issue taxonomy beyond what code already separates by absence.
- No HOSTED / BROWSER-VERIFIED claims (code-only).

---

## 9. Proof status

| Claim | Proof level |
|---|---|
| Internal-only contract + tests | IMPLEMENTED / TESTED in repo |
| Schema migration present | IMPLEMENTED in repo (apply/host state out of scope) |
| End-to-end inbox | UNPROVEN / not live |
| Email/WhatsApp delivery | Intentionally out of channel |
| System Health owner UI | MISSING |
| Product changelog UI | MISSING |
