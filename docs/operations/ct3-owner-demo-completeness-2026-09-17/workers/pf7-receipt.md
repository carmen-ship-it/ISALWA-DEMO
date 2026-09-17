# LANE PF-7 — Audit / historial / coherence receipt

**Lane:** PF-7  
**Branch:** `ct3/pf7-audit-coherence`  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-pf7-audit-coherence`  
**Base:** `6327f43c57f309227906931f6cc08ae54033410e`  
**LANE_IMPLEMENTATION_SHA:** `573d64b7a6278b64bef916702612dccee828bc15`  
**Deployed:** NO · **REAL_SEVEN_MUTATED:** NO · **Hosted:** UNPROVEN

## Delivered

| Item | State |
|---|---|
| Auditoría filters include conversation + demo actions; web re-humanize | IMPLEMENTED + TESTED |
| Audit detail resource deep links (quote/order/conversation) | IMPLEMENTED + TESTED |
| Cliente360 Historial → Auditoría + conversation-origin facts | IMPLEMENTED |
| Provenance domain (`conversation-provenance` / humanize) | IMPLEMENTED + TESTED |
| DEMO MADERAS Quote↔Pedido↔Cliente360↔Audit coherence tests | TESTED |
| `pf7-seed-requests.md` for BusinessEvent/Audit density | REQUESTED → PF-1 |

## Tests

```text
tsx --test lib/audit/demo-coherence.test.ts lib/audit/humanize.test.ts \
  lib/audit/filter-options.test.ts lib/audit/url-state.test.ts \
  lib/audit/format-snapshot.test.ts lib/conversations/conversation-context.test.ts
→ 24 pass / 0 fail
```

## Residuals

1. Hosted BV that Auditoría returns rows for MADERAS/Cotización/Pedido/Conversación — needs PF-1 densify + deploy.  
2. `hrefHints.audit` still `/inicio` in seeded artifact until PF-1 fixes.  
3. conversation.recorded / created_from_conversation sample events may be absent until seed request applied.
