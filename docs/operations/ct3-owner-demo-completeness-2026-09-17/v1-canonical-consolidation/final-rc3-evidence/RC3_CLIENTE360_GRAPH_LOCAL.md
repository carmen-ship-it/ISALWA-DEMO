# RC3 — CLIENTE360_GRAPH_LOCAL

**As of:** 2026-09-17  
**Scope:** Cliente360 party commercial graph — Pedidos under `visibility=org` after RC3-A.  
**Deploy:** Not deployed. Hosted Resumen Pedidos count **UNPROVEN**.

---

## Scoreboard

| Gate slice | Result | Evidence |
|---|---|---|
| **LOAD_CLIENTE360_ORDERS_ORG** | **PASS** | `load-cliente-360.ts` + source contract test |
| **API_PARTY_LIST_ORG (G)** | **PASS** | `order-owner-eval-read.test.ts` **G** |
| **HOSTED_RESUMEN_PEDIDOS** | **UNPROVEN** | Needs deploy + BV |

---

## Graph wiring

`apps/os-web/lib/cliente/load-cliente-360.ts` — `listPartyScoped`:

1. Prefer `listOrders({ partyId, limit: 10, visibility: 'org', ...commercialQuery })`
2. On deny/error → fallback without `visibility` (own / people.admin unrestricted)

Same pattern for opportunities and quotes. View As must pass `commercialQuery` from `commercialListQueryFromProjection` so Carmen’s org.read does not leak under Asesor projection (see `RC3_VISIBILITY_ORG_CALLSITE_AUDIT.md`).

---

## Citations

| Proof | Location |
|---|---|
| Loader requests org visibility before own fallback | `apps/os-web/lib/cliente/load-cliente-360.test.ts` — `requests party orders with visibility=org before own-lens fallback` (**extended** source contract) |
| Freshness / section isolation still load | Same file — `loadCliente360 null freshness` suite |
| API: party + `visibility=org` returns seeded Maderas Pedido; own lens empty for non-owner | `packages/os-query/src/commercial/order-owner-eval-read.test.ts` **G** |
| Owner-eval detail read (graph prerequisite) | Same file **A** |

---

## Commands run (local)

```bash
cd apps/os-web && node --import tsx --test lib/cliente/load-cliente-360.test.ts
# → pass (incl. Pedido graph RC3 contract)

cd packages/os-query && node --import tsx --test \
  src/commercial/order-owner-eval-read.test.ts
# → 6 pass / 0 fail (A–G)
```

---

## Explicit non-claims

| Claim | Status |
|---|---|
| Hosted Cliente360 Resumen Pedidos > 0 for DEMO Maderas | **UNPROVEN** |
| View As Asesor party graph narrow (call-site RISK noted in audit) | Separate — see `RC3_VISIBILITY_ORG_CALLSITE_AUDIT.md` |

---

## Verdict

**CLIENTE360_GRAPH_LOCAL = PASS** for loader + API party-list org graph. Hosted UI count remains a separate BV gate.
