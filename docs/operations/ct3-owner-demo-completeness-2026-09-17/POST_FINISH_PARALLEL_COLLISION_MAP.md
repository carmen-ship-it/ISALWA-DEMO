# CT3 POST-FINISH — PARALLEL LANE COLLISION MAP

**At:** 2026-09-17T03:47Z  
**Integrator tip (base):** `6327f43c57f309227906931f6cc08ae54033410e` on `ct3/owner-demo-completeness`  
**Mode:** TRUE multitask — CT3 integrates; workers own private branches/worktrees.

## Ownership (ONE WRITER)

| Boundary | Owner | Files |
|---|---|---|
| Canonical demo seed/fixtures | **PF-1** | `packages/os-database/src/owner-demo/{seed,catalog,guards}.ts` |
| Ops desk pages + loaders | **PF-2** | produccion/almacen/compras/entregas/trabajo/incidencias/compromisos + load-* |
| Conversations UI/context | **PF-3** | `app/(app)/conversaciones/**`, `components/conversations/**`, `lib/conversations/**` |
| PDF routes/UI/docs | **PF-4** | quote/DN pdf routes, Cliente360 documentos PDF CTAs |
| Map + management | **PF-5** | `mapa/**`, `components/map/**`, `lib/map/**`, `components/management/**`, `lib/management/**` |
| Walkthrough + demo chrome | **PF-6** | walkthrough/**, components/demo/**, owner-demo-identity, resolve-demo-data-mode |
| Audit / historial / coherence tests | **PF-7** | auditoria/**, lib/audit/**, provenance (non-UI), coherence tests |
| Final delta BV | **PF-8** | READ-ONLY after integration |

## Cross-lane contracts

- Non–PF-1 lanes needing SYNTH rows → `workers/pfN-seed-requests.md` (PF-1 consumes).
- PF-2/3/5/7 must not edit `seed.ts`.
- PF-6 sole owner of GuidePanel retirement / Story Mode launcher / DEMO banner / toggle.
- PF-4 sole owner of any PDF shared changes.
- PF-8 starts only after PF-1…PF-7 integrated or rejected.

## Seed apply status (integrator)

Prior seed attempt FAILED: staging Postgres unreachable from agent host (`Can't reach database server`). Integrator retries with full network; if still blocked → PROVIDER_BLOCKED / HOSTED_PROOF_BLOCKED for densify apply only; code/fixture SHAs still ship.

**Update:** Auto-review blocked agent outbound seed (credential + remote mutation boundary). **BLOCKED LANE:** owner-demo densify re-apply. **BLOCKER TYPE:** SECURITY_GATE / CREDENTIAL_BLOCKED. Existing SYNTH seed from prior CT3 apply remains the live fixture until an authorized operator re-runs seed. Workers continue code/fixture source work.
