# V1 CANONICAL CONSOLIDATION — CONTROL TOWER

**Updated:** 2026-09-17 (release-train discipline)  
**Committed tip:** `5032e6c` (+ pending integration commit for View As / convert)  
**LIVE staging:** WEB+API **`8e24b7f`** (`dep-daltmtu5vjqs738kr0vg` / `dep-daltofv40ujc73f83nig`)  
**V1_OWNER_REVIEW_RC_SHA:** **NOT CUT**  
**Policy:** [`DEPLOYMENT_POLICY_RELEASE_TRAIN.md`](./DEPLOYMENT_POLICY_RELEASE_TRAIN.md) — **NO MICRO-DEPLOYS**

## Status bus

| Lane | Status | Notes |
|---|---|---|
| Freeze / live-vs-local ledger | **DONE** | `CURRENT_V1_STATE_SNAPSHOT.*`, `LIVE_VS_LOCAL_CAPABILITY_LEDGER.md` |
| CR-2 View As | **IN PROGRESS (local)** | projection + Asesor subject + mutation gate; lists: opp/quote only |
| CR-3 convert.own | **LOCAL TESTED** | coverage≠convert; scopes.ts owns convert.own constant |
| CR-1 scopes clarify | **LOCAL** | full V1 business-eval (not admin bypass) |
| CR-4..8 / visual | **PARKED for serial** | after View As surfaces + RC |
| Ship/BV | **BLOCKED** | wait RC; do not micro-deploy |
| USER_ACCEPTED | **NO** | |

## Carmen SYNTH architecture (locked)

- Membership = **full V1 business-evaluation** coverage across departments
- Forbidden: people.admin / master_data.admin / qa.access / system.admin (and equivalents)
- Owner-eval view (no View As) = **broad** intentional Company OS surface
- View As = **narrow projection only**; identity stays Carmen; mutations **off**
- Asesor View As = **person-specific** synthetic advisor subject

## Collision boundaries (one writer)

Unchanged — see prior table. Main agent = control tower / integrator. No parallel writers on auth resolver, role-projection, global shell, migrations, or shared transition engine.

## Safe parallel work remaining

Only **independent** docs/gap receipts or non-shared leaf surfaces. If work touches shared projection/shell → **serial integration**.

## Artifacts

- `CURRENT_V1_STATE_SNAPSHOT.md` / `.json`
- `LIVE_VS_LOCAL_CAPABILITY_LEDGER.md`
- `SUPERSESSION_MAP.md`
- `EXACT_LOCAL_DELTA.md` / `EXACT_INTEGRATED_DELTA.md`
- `DEPLOYMENT_POLICY_RELEASE_TRAIN.md`
