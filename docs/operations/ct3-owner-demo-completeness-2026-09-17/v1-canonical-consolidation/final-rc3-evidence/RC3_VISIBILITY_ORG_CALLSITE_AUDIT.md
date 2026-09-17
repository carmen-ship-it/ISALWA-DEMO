# RC3 — `visibility=org` call-site audit

**Date:** 2026-09-17  
**Scope:** Every os-web production call site that requests `visibility=org` (literal or via `commercialListQueryFromProjection` / `listPartyScoped`) for **Orders, Quotes, Opportunities, Work, or search**.  
**Method:** Read-only ripgrep + source inspection. Tests listed separately (not production surfaces).  
**API contract (all rows):** `visibility=org` → `resolveOwnerReadScope` requires **`commercial.org.read`**; tenant isolation via `organizationId` on the session. Default list lens remains `own` when visibility is omitted.

### RISK rule

**RISK** = unconditional org (or org-first) request that is **org-wide or party-graph-wide** and lacks **both**:

1. a client-side capability probe / desk gate before requesting, **and**
2. Vista de evaluación narrowing (`commercialListQueryFromProjection` / `ownerMemberId` / `filterByCommercialOwner` / `evaluationBlocksDirectParty`).

API `commercial.org.read` alone does **not** clear RISK when View As Asesor must not see other owners’ records (see `RC3_VIEW_AS_ORDER_NARROWING.md`).

---

## Summary

| Class | Count | RISK rows |
|---|---|---|
| RC3-A party graph (`listPartyScoped` / org-then-fallback) | 5 functions / 7 resource calls | **4 RISK** (Cliente360 + documentos + finanzas; quote related-orders mitigated) |
| `commercialListQueryFromProjection` producer + desk consumers | 1 producer + 5 consumers | 0 RISK (narrowing by design) |
| Search / command palette | 1 file (multiple resources) | 0 RISK (probe + projection + owner filter) |
| Leadership / Inicio queues / Trabajo | 4 | **2 RISK** (leadership org load + owner work queue ignore View As) |
| View As bootstrap / auditoría subject set | 2 | 0 RISK (picker gated; auditoría owner-narrowed) |
| Tests only | several | n/a |

---

## Call-site table

| FILE | FUNCTION | RESOURCE | WHY_ORG_VISIBILITY_IS_REQUIRED | CAPABILITY_REQUIRED | VIEW_AS_NARROWING_APPLIED? | CROSS_TENANT_FILTER? | RESOURCE_FILTER? | FALLBACK_BEHAVIOR | RISK? |
|---|---|---|---|---|---|---|---|---|---|
| `apps/os-web/lib/role-preview/commercial-list-query.ts` | `commercialListQueryFromProjection` | Quotes / Opportunities / Orders (params producer) | Asesor: Carmen has org.read; slice via `ownerMemberId`. Gerencia: org commercial desk. | `commercial.org.read` (API) when `visibility=org` emitted | **Yes** — Asesor → `ownerMemberId`; missing subject → impossible owner; Jefe → `team`; inactive → `{}` | API session `organizationId` | `ownerMemberId` when Asesor | Returns `{}` if projection inactive / no commercialVisibility | No |
| `apps/os-web/lib/cliente/load-cliente-360.ts` | `loadCliente360` → `listPartyScoped` | Opportunities | Party Resumen must reconcile records owned by other members for actors with org.read (RC3-A) | `commercial.org.read` (API); no client probe | **No** | API session tenant | **`partyId`**, `limit: 10` | On org deny/error → retry **without** visibility (own / people.admin unrestricted) | **RISK** — View As Asesor can still org-read full party commercial graph |
| `apps/os-web/lib/cliente/load-cliente-360.ts` | `loadCliente360` → `listPartyScoped` | Quotes | Same party-graph reconcile | Same | **No** | API session tenant | **`partyId`**, `limit: 10` | Same org→own fallback | **RISK** (same class) |
| `apps/os-web/lib/cliente/load-cliente-360.ts` | `loadCliente360` → `listPartyScoped` | Orders | Same; unblocks DEMO Maderas Pedido count under owner-eval | Same | **No** | API session tenant | **`partyId`**, `limit: 10` | Same org→own fallback | **RISK** (same class) |
| `apps/os-web/lib/cliente/document-links.ts` | `loadDocumentLinks` | Orders | Need peer-owned orders to attach Nota de Entrega PDF links on party documentos | `commercial.org.read` (API) | **No** | API session tenant | **`partyId`**, `limit: 20` | Inner try org; catch → list without visibility; outer catch continues empty section | **RISK** — View As not applied; quotes path still own-lens only (asymmetric) |
| `apps/os-web/lib/cliente/finance-summary.ts` | `loadClienteFinanceSummary` | Orders | Aggregate open-order totals across party owners for Cliente360 Finanzas | `commercial.org.read` (API) | **No** | API session tenant | **`partyId`**, `limit: 100` | Org try → catch own-lens; outer → `unavailable` | **RISK** (same class) |
| `apps/os-web/app/(app)/clientes/[partyId]/cotizaciones/[quoteId]/page.tsx` | `QuoteDetailPage` (related orders) | Orders | Accepted quote → related Pedido may be owned by another member; org.read needed to link | `commercial.org.read` (API) | **Yes** — `...commercialListQueryFromProjection(evaluation)` after hardcoded `visibility:'org'` (spread can override to `team` / add `ownerMemberId`); detail also `evaluationBlocksDirectParty` | API session tenant | **`quoteId`**, **`partyId`**, `limit: 5` | Org(+projection) fail → same filters without explicit org (projection still spread) | No (mitigated; see View As evidence) |
| `apps/os-web/lib/shell/command-search.ts` | `searchPalette` → `probeLens` | Opportunities (probe) | Discover whether team/org commercial lenses are allowed before search fan-out | `commercial.org.read` for org probe | **Yes** — skips org probe when evaluation `commercialVisibility` is `own` or `team` | API session tenant | `limit: 1` | Probe false/partial; session → fail search | No |
| `apps/os-web/lib/shell/command-search.ts` | `searchPalette` | Opportunities | Palette search across leadership lenses | Same; only if `evaluationAllowsDesk(...,'commercial')` and probe passed | **Yes** — `...commercialQuery` + `filterByCommercialOwner` | API session tenant | `q`, `status:open`, `limit`, optional `visibility` from lenses | Denied calls skipped; `partial` flag | No |
| `apps/os-web/lib/shell/command-search.ts` | `searchPalette` | Quotes | Same | Same | **Yes** | API session tenant | `q`, `limit`, visibility lenses | Same | No |
| `apps/os-web/lib/shell/command-search.ts` | `searchPalette` | Orders | Same | Same | **Yes** | API session tenant | `q`, `limit`, visibility lenses | Same | No |
| `apps/os-web/lib/shell/command-search.ts` | `searchPalette` | Work | Org/team work lens when probed (skips when evaluation own) | `commercial.org.read` for org work | Partial — Asesor adds `ownerMemberId` on default call; lens calls do **not** spread commercialQuery; post-filter `filterWorkForEvaluation` | API session tenant | `q`, `status:open`, visibility lenses | Same | No (post-filter; lens fan-out still capability-probed) |
| `apps/os-web/lib/shell/command-search.ts` | `relatedForParty` | Opportunities / Quotes / Orders / Work | Expand palette hits for matched parties under same lenses | Same as search | Commercial: **Yes** (`commercialQuery` + owner filter). Work: subject `partyId` only | API session tenant | **`partyId`**, limits 4, visibility lenses | Same collect denials | No |
| `apps/os-web/app/(app)/inicio/page.tsx` | `InicioPage` | Opportunities / Quotes | Personal responsibility strip under View As / owner lens | Emitted only when projection says org/team/own params | **Yes** — `...commercialQuery`; post `filterCommercialOwnerRowsForEvaluation` | API session tenant | `status`, `limit` | `safeInicioSectionFetch` → section unavailable | No |
| `apps/os-web/app/(app)/oportunidades/page.tsx` | page default export | Opportunities | Org/team desk when Gerencia/Jefe View As (or inactive `{}`) | Desk gated `evaluationAllowsDesk(...,'commercial')`; API org.read if org | **Yes** — `...commercialListQueryFromProjection` | API session tenant | status/stage/q/cursor/limit | `EvaluationDeskExcluded` if desk blocked | No |
| `apps/os-web/app/(app)/cotizaciones/page.tsx` | page default export | Quotes | Same | Same | **Yes** | API session tenant | status/q/cursor/limit | Same | No |
| `apps/os-web/app/(app)/mapa/page.tsx` | `loadCommercialLens` (via `MapaPage`) | Opportunities / Quotes / Orders | Map commercial portfolio under evaluation visibility | Desk `evaluationAllowsDesk(...,'map')`; API org.read if org | **Yes** — `commercialQuery` into listQuery; parties also `filterByCommercialOwner` | API session tenant | `limit: 100` (+ projection params) | Per-list `.catch` → empty items | No |
| `apps/os-web/lib/role-preview/load-asesor-options.ts` | `loadEvaluationAsesorOptions` | Opportunities / Quotes | Enumerate distinct commercial owners for Asesor View As picker | Client: caller `canUseRolePreview` (`people.admin` \| `management.org.read`). API: `commercial.org.read` | N/A (bootstrap before subject chosen) | API session tenant | `status` + `limit: 100` (org-wide) | `catch` → `[]` | No* — intentional org-wide for picker; empty if org.read denied |
| `apps/os-web/lib/shell/load-shell-context.ts` | `loadShellContext` (caller) | — | Gates asesor options load | `canUseRolePreview` | N/A | — | — | Skips load if cannot preview | No |
| `apps/os-web/app/(app)/auditoria/page.tsx` | page (Asesor subject resource set) | Opportunities / Quotes | Build `allowedResourceIds` for audit filter under Asesor View As | `commercial.org.read` (API) | **Yes** — `visibility:org` **+** `ownerMemberId: subject` | API session tenant | owner + limit 100 | `.catch` → empty items | No |
| `apps/os-web/lib/leadership/load-inicio-leadership.ts` | `loadLeadershipView` / `loadInicioLeadership` | Opportunities / Quotes / Work | Inicio Empresa leadership lane (org) | Client probe via `listOpportunities({visibility:'org'})`; API `commercial.org.read` | **No** — always loads org if probe allows; not filtered by evaluation persona | API session tenant | status/limit; work open/overdue/followUp | Probe denied/unavailable → `hidden`; bundle deny → `hidden`/`unavailable` | **RISK** — under View As Asesor, org leadership still loads if Carmen has org.read (UI may still offer Empresa lens) |
| `apps/os-web/lib/inicio/queues.ts` | `workItemsQueryForLens` | Work | Owner Inicio command queue uses org work visibility | Resolved when lens=`owner` (`management.org.read` or leadershipOrgReady) | **No** | API session tenant | `status:open`, `limit` | Caller `safeInicioSectionFetch` → unavailable | **RISK** — org work queue driven by real capabilities, not View As |
| `apps/os-web/lib/inicio/load-command-queues.ts` | `loadInicioCommandQueues` | Work | Applies `workItemsQueryForLens(lens)` | Indirect | Post-filters elsewhere on Inicio page for some queues; this fetch itself not projection-narrowed | API session tenant | via query helper | Safe fetch | **RISK** (inherits queues.ts) |
| `apps/os-web/app/(app)/trabajo/page.tsx` | `TrabajoPage` | Work | User/Empresa tab `view=org` | Client `probeWorkOrgLens`; View As: org tab only if persona=`gerencia` | **Yes** when evaluation active (gerencia only); Asesor forced off org | API session tenant | status/open, overdue, q, subject, optional `ownerMemberId` for Asesor | Forbidden probe → tab hidden | No |
| `apps/os-web/lib/work/trabajo-lens.ts` | `probeWorkOrgLens` | Work | Capability probe for Empresa tab | `commercial.org.read` | N/A (probe) | API session tenant | `limit: 1` | Forbidden → false | No |

\*Picker is org-wide by design; treat as **accepted residual**, not View As leak into desks.

---

## RC3-A focus notes

### `listPartyScoped` (Cliente360)

```44:76:apps/os-web/lib/cliente/load-cliente-360.ts
  // Party-scoped commercial graph: prefer org visibility so Resumen reconciles to
  // canonical records owned by other members (people.admin own-lens is unrestricted,
  // but commercial.org.read actors still need visibility=org).
  const listPartyScoped = async <T,>(
    withOrg: () => Promise<T>,
    without: () => Promise<T>,
  ): Promise<T> => {
    try {
      return await withOrg();
    } catch {
      return without();
    }
  };
  // … listOpportunities / listQuotes / listOrders with partyId + visibility:'org'
```

- Required for owner-eval **without** View As (Maderas Pedido on Resumen).
- **Does not** call `commercialListQueryFromProjection` → **RISK** under Asesor View As on a shared party (shows peer-owned rows).

### Documentos / Finanzas

- Orders: org-first + partyId (same RISK class).
- Quotes in `document-links.ts`: **no** `visibility=org` (own-lens only) — not an org call site; possible **under-read** gap for peer-owned quote PDFs, inverse of the Pedido fix.

### Quote related orders

- Hardcodes `visibility:'org'` then spreads `commercialListQueryFromProjection` → View As narrowing restored (see `RC3_VIEW_AS_ORDER_NARROWING.md`).

### Search

- Org lens only after `probeLens` and evaluation visibility allowlist; commercial lists spread projection + `filterByCommercialOwner`.

---

## Not production org-request sites (excluded from RISK table)

| Location | Why excluded |
|---|---|
| `apps/os-web/lib/role-preview/role-preview.test.ts` | Unit expectations for projection shape |
| `apps/os-web/lib/inicio/inicio-command.test.ts` | Asserts `workItemsQueryForLens('owner')` → org |
| `apps/os-web/lib/roles/role-homes.test.ts` | Fixture visibility metadata |
| `packages/os-query/.../leadership-visibility.test.ts` | API contract tests |
| `packages/os-query/.../order-owner-eval-read.test.ts` | RC3-A Pedido auth tests |
| `apps/os-api/.../inspection-reads.adversarial.test.ts` | Adversarial denials |
| `apps/os-web/lib/roles/attention.ts` / `access.ts` | Read attention **row** visibility field — do not request list visibility |

---

## Explicit non-call (no `visibility=org` found)

These list Orders/Quotes/Opportunities/Work **without** org visibility (default own / other filters only) — out of scope for RISK but relevant for completeness:

- Warehouse / postsale / delivery / purchasing order loaders
- `lib/finance/load-subject-options.ts`
- `lib/productivity/actions.ts` party-scoped lists
- `administracion/equipo/[memberId]` (uses `ownerMemberId`, not org visibility)
- Cliente360 **Work** (`listWorkItems` subject party/account — no org visibility)
- `command-search` `collectDeliveryDocuments` order seed (`listOrders` open, no visibility)

---

## Recommended follow-ups (not done in this audit)

1. **RISK — Cliente360 / documentos / finanzas:** When `evaluation.active && persona==='asesor'`, either skip org-first or merge `commercialListQueryFromProjection` so party graph respects subject owner (preserve org-first when View As **off** for RC3-A owner-eval).
2. **RISK — Inicio leadership / owner work queue:** Hide or re-filter org leadership + `workItemsQueryForLens('owner')` when evaluation persona is Asesor/Jefe.
3. **Symmetry:** Consider org-first for quote PDF listing in `document-links.ts` when View As off (mirror orders).
4. Keep Pedido/Quote **detail** on `evaluationBlocksDirectParty` (already applied).

---

## Evidence cross-links

- `RC2_TO_RC3_DEFECT_DELTA.md` — why orders need org visibility alignment  
- `RC3_VIEW_AS_ORDER_NARROWING.md` — View As leak class vs list narrowing  
- `RC3_PEDIDO_AUTH_TRACE.md` — getOrder / listOrders auth path  
