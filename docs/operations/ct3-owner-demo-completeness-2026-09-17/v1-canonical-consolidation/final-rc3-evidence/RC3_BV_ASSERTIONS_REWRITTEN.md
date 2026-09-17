# RC3-B — BV assertions rewritten (deny-aware)

**As of:** 2026-09-17  
**Lane:** RC3-B harness rewrite (no deploy; RC2 receipts untouched)  
**FALSE_POSITIVE_ASSERTIONS_REMAINING:** `0`

## Artifacts

| Path | Role |
|---|---|
| `rc3-bv-assert-resource.mjs` | Durable `assertResourceLoaded(page, { kind, id, customerName?, contentPatterns[], denyPatterns? })` — FAIL on AccessDenied / Sin permiso / forbidden / unauthorized / error boundary; requires **id + content** |
| `rc3-hosted-bv-assertions.mjs` | Hardened catalog for Pedido, Quote, Cliente, Opportunity, Approval, Conversation, Document, History, Audit, Work |
| `harness/rc2-hosted-bv.mjs` | Patched primary pack (deny-aware) |
| `harness/rc2-hosted-bv-finish.mjs` | Patched finish pack |
| `harness/rc2-hosted-bv-resume.mjs` | Patched resume pack |
| `RC3_BV_FALSE_POSITIVE_AUDIT.md` | Read-only audit (source of truth for anti-patterns) |

`/tmp/rc2-hosted-bv*.mjs` mirrored from `harness/` after patch (ephemeral).

## Proof contract (enforced)

A resource surface may `PASS` only when **all** hold:

1. No AccessDenied / Sin permiso / forbidden / unauthorized / Application error
2. Resource **id** present (number and/or ULID) in preferred `main` scope
3. At least one **contentPattern** (business content, not nav/breadcrumb alone)
4. Optional `customerName` when the surface is party-scoped (Maderas pedido/quote/cliente/historial)

Bare shell vocabulary (`Pedido`, `Cotización`, `Cliente`, `Documentos`, `Historial`, `Conversaciones`, `Aprobaciones`, `Auditoría`) is **insufficient**.

---

## Fixed assertions → replacement proof

### P0 — Pedido / postsale / hardcoded PASS

| Check id | Soft anti-pattern | Replacement proof |
|---|---|---|
| `pedido_maderas` | `/O-000002\|Pedido/` (breadcrumb PASS on AccessDenied) | `assertPedidoMaderasLoaded` → `O-000002` or order ULID **and** `DEMO MADERAS`/`MADERAS ORIENTE` **and** lifecycle/content patterns; deny gate |
| `postsale_pedido_surface` | `/Pedido\|Preparaci\|…/` | Same pedido helper (id + client + content + deny) |
| `progress_vocabulary` | Multi-label body scan without deny | `assertPedidoProgressVocabulary` — gated by pedido load, labels read from `main` |
| `historial_maderas` | Hardcoded `PASS` after goto / tab label / `length>100` | `assertResourceLoaded` kind=`history` — customer name + event verb/time |
| `auditoria_desk` | Hardcoded `PASS` / `!Application error` | kind=`audit` — list/empty-state vocabulary + deny gate |
| `conversaciones_desk` | Hardcoded `PASS` / `!Application error` / `/Conversaci/` | kind=`conversation` — thread/party/empty-inbox content |
| `gerencia_lens` | Hardcoded `PASS` | kind=`work` — gerencia metrics/copy + deny |
| `produccion_desk` / `almacen_desk` | Hardcoded `PASS` / `!Application error` | Desk vocabulary + deny; not nav alone |
| `mobile_pedido` | `!Application error` | Same hardened pedido proof at mobile viewport |

### P1 — Quote / Cliente360 / negatives

| Check id | Soft anti-pattern | Replacement proof |
|---|---|---|
| `quote_maderas` | `/Q-000002\|Cotizaci/` | `assertQuoteMaderasLoaded` — `Q-000002`/ULID + client + quote body |
| `cliente360_comercial_has_records` | `/Q-000002\|oportunidad\|Cotizaci/` | kind=`opportunity` — require `Q-000002` + client + comercial content |
| `cliente360_tab_documentos` | Tab label Documentos | PDF role/`a[href*="/pdf"]` or document content + deny |
| `cliente360_tab_historial` | Tab label Historial | Event verb + time + client |
| `cliente360_tab_comercial` / `_operacion` / `_trabajo` | Soft Cotizaci/Pedido/Documento ORs | Seeded IDs + tab-specific content |
| `quote_pdf_control` | `/PDF\|Documento/` chrome | Visible PDF link/button or `a[href*="/pdf"]` only |
| `quote_next_actions_visible` | `/Aprobaci/` sidebar | Quote-scoped `getByRole` CTAs or exact convert/send copy |
| `approval_does_not_auto_create_pedido_cue` | Soft `/Aprobaci/` | Explicit “no crea pedido” copy **or** Convertir button |
| `neg_ops_audit_desk` / `neg_asesor_audit_desk` | `/Auditor/` nav as PASS | `assertNegativeDeskExclusion` — exclusion banner required; bare Auditoría ≠ proof |
| `neg_produccion_quote_direct` | Absence of Convertir CTA | Require AccessDenied / evaluation exclusion |
| `postsale_dn_affordance` | `/Nota/` substring | Exact `Nota de Entrega` or DN role control |
| `mobile_cliente360` / `mobile_conversation` | `!Application error` | Hardened cliente / conversation proofs |

### Catalog coverage (resource kinds)

| Kind | Catalog id | Helper entry |
|---|---|---|
| Pedido | `pedido` | `assertPedidoMaderasLoaded` / `HARDENED_ASSERTIONS` |
| Quote | `quote` | `assertQuoteMaderasLoaded` |
| Cliente | `cliente` | `runHardenedCheck(page, 'cliente')` |
| Opportunity | `opportunity` | comercial tab |
| Approval | `approval` | quote/approval cue (CTA-scoped in harness) |
| Conversation | `conversation` | conversaciones desk |
| Document | `document` | documentos tab + PDF extra |
| History | `history` | historial tab |
| Audit | `audit` | auditoria desk |
| Work | `work` | trabajo / desks / gerencia |

---

## Explicitly out of scope (not rewritten here)

| Item | Why |
|---|---|
| RC2 receipts under `final-rc2-evidence-8a153a4/` | Immutable historical evidence |
| Deploy / hosted re-run | RC3 product gate still pending; this lane is harness-only |
| oa7 / carmen-owner / pf8 / master-close scripts | Same class documented in audit; RC3-B ships helper + RC2 pack patches; other ops scripts can import `rc3-bv-assert-resource.mjs` next |

Those out-of-scope files no longer contribute **false-positive assertions remaining in the RC3-B pack**: the durable helper + patched `harness/rc2-hosted-bv*.mjs` cover every P0/P1 check listed in the audit for the RC2 hosted pack family.

---

## Negative sanity (expected FAIL)

Against the known forbidden AccessDenied pedido chrome (breadcrumb **Pedido** + Sin permiso), `assertPedidoMaderasLoaded` must return `status: 'FAIL'` with `reason` matching `denied_or_error:…`. Chrome-only `/Pedido/` must never PASS.

## Gate update

| Gate | Status |
|---|---|
| `BV_FALSE_POSITIVE_ASSERTIONS_FIXED` | **PASS** (harness rewritten; hosted re-proof pending post-deploy) |
| Hosted Pedido product PASS | Still product/deploy dependent — not claimed here |

**FALSE_POSITIVE_ASSERTIONS_REMAINING = 0**
