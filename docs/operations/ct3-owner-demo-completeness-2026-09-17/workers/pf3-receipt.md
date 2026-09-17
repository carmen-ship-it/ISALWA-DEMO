# PF-3 — Conversations demo completeness (post-finish)

**Lane:** PF-3  
**Branch:** `ct3/pf3-demo-conversations`  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-pf3-demo-conversations`  
**Base:** `6327f43c57f309227906931f6cc08ae54033410e`  
**REAL_SEVEN_MUTATED:** **NO**  
**seed.ts:** not touched

## Result

Demo `/conversaciones` (datos=demo) projects **5 SYNTH threads** with non-stub Contexto ISALWA:

| Thread | Signal | Context completeness |
|---|---|---|
| ANDINA | possible Opportunity | suggestion + reply + who-to-ask + Cliente360 / crear oportunidad |
| PROYECTOS | quote acceptance Q-DEMO-001 | suggestion + reply + real quote deep link |
| HOTEL | delivery question | certainty buckets + reply + pedido link |
| FERRETERÍA | possible Issue | suggestion + reply + crear incidencia |
| MADERAS | normal follow-up | follow-up rule + reply + pedido link |

Seeded-ids (PF-1) wired for party/quote/order/opportunity deep links. Demo RESPONSABLE hints assigned (never Cargo inference). No live WhatsApp claim.

## Files

- `apps/os-web/app/(app)/conversaciones/page.tsx`
- `apps/os-web/components/conversations/{conversation-context-panel,conversations-workspace}.tsx`
- `apps/os-web/lib/conversations/{build-context-panel,demo-fixtures,demo-suggestion-rules,model,project-manual}.ts`
- `apps/os-web/lib/conversations/{conversation-context,smart-context}.test.ts`
- `docs/operations/ct3-owner-demo-completeness-2026-09-17/workers/pf3-receipt.md`

## Tests

```text
pnpm --filter @isalwa/os-contracts build
pnpm exec tsx --test \
  lib/conversations/model.test.ts \
  lib/conversations/conversaciones-shell.test.ts \
  lib/conversations/manual-conversation.test.ts \
  lib/conversations/conversation-context.test.ts \
  lib/conversations/smart-context.test.ts
→ 29 pass / 0 fail
```

## Residuals

- Hosted / browser BV: **UNPROVEN** this lane (no deploy).
- Demo RESPONSABLE members are fixture hints (`demo-member-*`), not live WorkOS assignments.
- No PF-1 seed catalog change requested.
