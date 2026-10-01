# UI-LIVE-1 — Commercial + Cliente 360 Live UAT Smoke Evidence

**Date:** 2026-08-24  
**Scope:** `apps/os-web` + running `os-api` + local Postgres  
**Gate:** **PASS (CONDITIONAL)** — API + SSR path verified; interactive Playwright not run  
**Log:** `.ui-live-1-evidence/smoke-2026-08-24T13-56-28-695Z.log`  
**Script:** `scripts/ui-live-1-smoke.mjs`

---

## Environment

| Item | Value |
|------|--------|
| Postgres | `postgresql://isalwa:isalwa@localhost:5432/isalwa` (local/test) |
| os-api | `http://localhost:4001` — `OS_AUTH_MODE=dev`, outbox worker enabled |
| os-web | `http://localhost:3200` — `NEXT_PUBLIC_OS_AUTH_MODE=dev` |
| Seed | Step17 restore seed → `.step17-evidence/seed-marker-ui-live-1.json` |
| Synthetic tenant | `Cliente Step17 S.A.` party + admin with `master_data.admin` |

**Not production.** No client production data used.

---

## Auth mode

**DEV** — `x-os-*` session headers (API) + `os_dev_session` cookie (SSR).  
**Not** Supabase production auth verified.

Login page SSR confirms dev entry: *“Modo desarrollo… Entrar (desarrollo)”*.

---

## Verification method

| Layer | Method |
|-------|--------|
| Commands | HTTP `POST /v1/commands/*` with idempotency keys |
| Reads | HTTP GET against os-api |
| UI SSR | HTTP GET os-web pages with dev session cookie |
| Interactive browser | **NOT RUN** (no Playwright in environment) |

---

## Routes exercised

- `/login` (dev mode copy)
- `/clientes`
- `/clientes/{partyId}` — Cliente 360 sections
- `/administracion/equipo`
- `/administracion/equipo/{memberId}` — member detail (manual SSR check)
- `/finanzas` — locked capability UX

---

## Commands exercised (successful run)

| Command | Result |
|---------|--------|
| CreateOpportunity | PASS |
| UpdateOpportunity / ChangeOpportunityStage / AssignOpportunityOwner | PASS (timeline confirms) |
| CreateQuote | PASS |
| AddQuoteLine / UpdateQuoteLine / RemoveQuoteLine | PASS |
| SubmitQuote | PASS |
| CreateWorkItem | PASS |
| RequestApproval / Approve | PASS (work_item subject — not commercial) |

---

## Results summary

| Area | Status |
|------|--------|
| Live stack | **PASS** |
| Clientes | **PASS** |
| Cliente 360 read | **PASS** |
| Opportunity write | **PASS** |
| Quote write | **PASS** |
| Historial (Party + Commercial + Work + Approval) | **PASS** |
| Workforce Admin | **PASS** |
| Projection refresh (~10s wait) | **PASS** |
| CreateOrder exposed | **NO** |
| Commercial approval exposed | **NO** |
| Finance locked | **YES** — nav `BLOQUEADO`, page *Próximamente* |
| Messaging | **NOT_CONFIGURED** in capability registry |
| Raw payload / contextSnapshot in Historial | **NOT observed** |

---

## Historial events observed (live API)

After smoke writes:

`approval.approved`, `approval.requested`, `work.created`, `quote.submitted`, `quote.line_*`, `quote.created`, `opportunity.stage_changed`, `opportunity.updated`, `opportunity.created`, `party.created`

---

## Projection refresh

- Outbox worker auto-polls (~5s interval)
- After ~10s wait, `GET /quotes/:id` returned `status: submitted`
- No stale banner required for this run; convergence observed without manual retry

---

## Negative UX verified

- **CreateOrder:** not in SSR HTML
- **Commercial approval actions:** not in SSR HTML
- **Finance:** locked (`LOCKED` capability + employee message)
- **Messaging:** `NOT_CONFIGURED` badge in shell nav
- No invented inventory/payment/credit labels in Cliente 360 SSR

---

## First attempt note

Initial smoke with dev `/dev/bootstrap` alone failed: bootstrap grants `people.admin` only; `ChangeRole` → `master_data.admin` returned 403; stale integration-test tenant IDs were invalid after DB reset. **Resolved** by Step17 documented seed with scoped admin.

---

## Backend bugs

**NONE** in successful run.

Observed non-blocking os-api startup outbox tick error on stale outbox rows (pre-existing local DB state) — did not block smoke.

---

## UI bugs found/fixed

**NONE** — no `apps/os-web` code changes required.

Smoke script updated (`scripts/ui-live-1-smoke.mjs`) to use Step17 marker instead of stale tenant fallback.

---

## Cross-lane change requests

**NONE**

---

## Carmen handoff gate

**LIVE BROWSER UAT STATUS:** **CONDITIONAL** — full employee data path proven via live API + SSR; interactive click-through browser not recorded.

**Exact next action:** Optional Playwright recording of login → dev bootstrap → Cliente 360 click path for full browser evidence.
