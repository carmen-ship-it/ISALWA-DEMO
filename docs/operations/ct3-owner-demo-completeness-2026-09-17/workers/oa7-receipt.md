# OA-7 — Owner-path acceptance verifier receipt

**Lane:** OA-7  
**Branch:** `ct3/oa7-owner-verifier`  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-oa7-owner-verifier`  
**At:** 2026-09-17  
**Actor:** `carmen.staging@isalwa.demo`  
**Password source:** `~/.isalwa-secrets/isalwa-os-staging-admin.password` (never printed)

## Status

| Field | Value |
|---|---|
| **HOSTED_RUN** | **PENDING** |
| SCRIPT | `docs/operations/ct3-owner-demo-completeness-2026-09-17/oa7-owner-path-bv.mjs` |
| OWNER_PASS_CLAIMED | **NO** |
| BANNER_ONLY_PASS | **FORBIDDEN** (script fails DOMAIN_CONTENT if names empty despite banner) |
| PRODUCT_CODE_TOUCHED | **NO** (verifier + receipt only) |

## Why HOSTED_RUN=PENDING

Hosted owner proof runs **after** OA lanes integrate and staging deploy lands Demo→SYNTH for Carmen (OA-1 membership grant + company context). Running against current LIVE would reproduce known empty Clientes on REAL and invite greenwash.

Execute later:

```bash
OA7_EXECUTE=1 node docs/operations/ct3-owner-demo-completeness-2026-09-17/oa7-owner-path-bv.mjs
```

Default (no `OA7_EXECUTE`): structural dry report + TODO matrix; exit 0; writes `/tmp/ct3-bv/oa7-owner-path-results.json`.

## Category model (not collapsed)

| Category | Purpose |
|---|---|
| ROUTE_RENDER | HTTP/page loads without crash |
| DEMO_CONTEXT | Demo / Datos reales company context + banner/cookie |
| DOMAIN_CONTENT | Named DEMO rows / metrics — **not** chrome alone |
| INTERACTION | CTAs, PDF open, story controls, convert |
| PERSISTENCE | Nav/refresh retain Demo; decisions stick |
| CROSS_PAGE_COHERENCE | Same fact across quote/pedido/C360/audit |
| AUTHORIZATION | Carmen login + password present |
| NEGATIVE_SECURITY | REAL_SEVEN untouched; no fake authority |

## Closed-loop TODOs (steering addendum §6)

Approval → decision → quote/audit/next CTA → explicit Convertir → Pedido index + Cliente360 — registered as **TODO** checks with `closedLoop: true` in the script. Not PASS by omission. Depends on OA-2 / OA-3 behavior + hosted execute.

## Honesty gates

1. If Demo clients empty after OA-1 expected SYNTH: **FAIL** `DOMAIN_CONTENT` with org-lens evidence (`PRODUCCIÓN` / REAL vs evaluación / SYNTH) — do not PASS on banner.
2. PF-8 people-admin SYNTH methodology is **not** final owner proof.
3. `USER_ACCEPTED` unchanged / out of lane.

## Compact return

```
LANE: OA-7
BRANCH: ct3/oa7-owner-verifier
HOSTED_RUN: PENDING
SCRIPT: oa7-owner-path-bv.mjs
ACTOR: carmen.staging@isalwa.demo
OWNER_PASS_CLAIMED: NO
CLOSED_LOOP_APPROVAL_CONVERT: TODO stubs registered
```
