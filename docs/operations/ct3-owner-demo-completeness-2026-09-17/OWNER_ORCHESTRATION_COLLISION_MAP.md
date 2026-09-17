# OWNER ORCHESTRATION — PARALLEL COLLISION MAP

**At:** 2026-09-17  
**Base LIVE:** `e5f6d3aaabf95c49d5358caee5dba9058d97197f`  
**Integrator:** `ct3/owner-demo-completeness` @ worktree `ct3-owner-demo`  
**Steering:** ENGINEERING STEERING ADDENDUM — no invented business rules; cascade completeness.

## Ownership (ONE WRITER)

| Lane | Branch / worktree | OWNS | MUST NOT TOUCH |
|---|---|---|---|
| **OA-1** | CT integrator (shared) | Demo→SYNTH company context, `resolveDemoDataMode` / auth org header, OwnerDemoProvider cookie bridge, Carmen SYNTH membership grant | commercial convert semantics, conversation seed, story copy |
| **OA-2** | `ct3/oa2-commercial-journey` | quote approval UX next-step, convert CTA continuity, Pedido index visibility | auth org resolver, seed conversations |
| **OA-3** | `ct3/oa3-work-attention` | post-decision Work/Attention, Mi trabajo Mío/Equipo/Empresa clarity, next-action surfacing from **existing** next-step helpers | inventing assignees, inventing SLAs |
| **OA-4** | `ct3/oa4-conversations-durable` | seed `os_customer_conversations` for 5 DEMO clients; wire conversaciones page off durable API | JSON-only parallel UI; WhatsApp live claims |
| **OA-5** | `ct3/oa5-story-nav` | Story Mode hrefs inherit Demo company context; parity notes | company context resolver core |
| **OA-6** | `ct3/oa6-ops-mgmt-coverage` | ops/map/finance/mgmt demo row honesty under SYNTH | auth, approvals |
| **OA-7** | `ct3/oa7-owner-verifier` | owner-path verifier rewrite (Carmen) | product behavior |

## Mechanism split (do not conflate)

| Concept | Meaning |
|---|---|
| **Auth actor** | Carmen’s person / login (unchanged) |
| **Effective company context** | REAL Staging S.R.L. vs SYNTH — selected via Demo / Datos reales + `x-os-organization-id` among **proven memberships** |
| **Role preview** | UI nav/capability preview only — not auth, not tenant |

## Evidenced path (OA-1)

- Multi-org selector already exists: `x-os-organization-id` (`canonical-request-session.ts`)
- Carmen today: REAL membership only → Demo filter empty
- **Not** reuse QA Ver como target-member swap (that changes `actorMemberId` → impersonation)
- **Do** ensure Carmen has SYNTH membership + same already-granted owner-evaluation scopes; Demo sends SYNTH org header; Datos reales sends REAL

## INVENTED_BUSINESS_RULES

Target: **0**. Missing policy → `NOT EVIDENCED` / `BUSINESS_DECISION_REQUIRED` in transition matrix.
