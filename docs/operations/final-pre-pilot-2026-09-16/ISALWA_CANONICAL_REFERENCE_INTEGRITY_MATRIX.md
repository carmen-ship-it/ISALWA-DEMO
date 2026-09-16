# ISALWA Canonical Reference Integrity Matrix

**Date:** 2026-09-16  
**Worktree:** `.worktrees/wave2-remediation-integrate`  
**Branch:** `pre-pilot/company-os-pass`  
**FINAL_RUNTIME_SHA (hosted):** pending deploy after this fix SHA  
**Evidence:** code fix · unit/source tests · hosted BV after deploy

**Gap types only:** PASS · WIRING_DEFECT · PRESENTATION_DEFECT · DUPLICATE_TRANSCRIPTION_DEFECT · HISTORY_DEFECT · FOUNDATION_GAP · BUSINESS_DECISION_REQUIRED

---

| SURFACE | FIELD / ACTION | CURRENT INPUT TYPE | CLASSIFICATION | CANONICAL ENTITY | CONTEXT CAN BE INHERITED? | SELECTOR REQUIRED? | BACKEND AUTH CHECK | FIX APPLIED | HOSTED VERIFIED | REMAINING GAP | GAP TYPE |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `/finanzas` | Tipo de sujeto | select | BUSINESS_POLICY_FIELD | party \| order \| quote | N/A | no | type enum only | none | N/A | — | PASS |
| `/finanzas` | Pedido / Cliente / Cotización | SearchableSelect / ServerPartyTypeahead | CANONICAL_REFERENCE | Party / Order / Quote | YES from Pedido/Cliente360 (`?orderId`/`?partyId`/`?quoteId`) | **YES** | listOrders / lookupCustomers / listQuotes | **YES** | pending BV | — | **FIXED** |
| `/finanzas` | Etiqueta visible | derived from selection | derived display | subject label | from selection | no (derive) | N/A | **YES** | pending BV | — | **FIXED** |
| Cliente360 Finanzas | subject | hidden `partyId` | CANONICAL_REFERENCE | Party | YES | no | yes | already | prior | — | PASS |
| `/produccion` | Producto | catalog search → select hit only | CANONICAL_REFERENCE | Product | YES from Productos preview catalog | **YES** | catalog membership check | **YES** | pending BV | list-products API still FOUNDATION if preview missing | **FIXED** |
| `/mensajes` | Cliente | ServerPartyTypeahead (`lookupCustomers`) | CANONICAL_REFERENCE | Party | optional | **YES** | party auth | **YES** | pending BV | — | **FIXED** |
| `/mensajes` | Nombre del cliente | derived from party selection | derived display | Party displayName | from party | no (derive) | N/A | **YES** | pending BV | — | **FIXED** |
| `/mensajes` | opportunity / quote / order | SearchableSelect after party | CANONICAL_REFERENCE | Opp / Quote / Order | from party | **YES** | scoped `listPartyCommercialLinks` | **YES** | pending BV | — | **FIXED** |
| `/almacen` | producto / pedido line | SearchableSelect | CANONICAL_REFERENCE | Product / OrderLine | from SoR load | yes (done) | session + scopes | already | BV honest empty | allocate write | FOUNDATION_GAP (write) |
| `/compras` | pedido link | list select | CANONICAL_REFERENCE | Order | from listOrders | yes (done) | yes | already | BV honest empty | SoR queue write | FOUNDATION_GAP |
| `/compras` | copy “use su identificador” | select/open language | PRESENTATION | — | — | — | — | **YES** | pending BV | — | **FIXED** |
| `/entregas` | pedido link | list select | CANONICAL_REFERENCE | Order | from list | yes (done) | management.org.read | already | BV honest empty | delivery write | FOUNDATION_GAP |
| `/entregas` | copy smell | select/open language | PRESENTATION | — | — | — | — | **YES** | pending BV | — | **FIXED** |
| `/aprobaciones` | subject | hidden from context | CANONICAL_REFERENCE | Quote/Order | YES | no | yes | already | SSR | — | PASS |
| `/incidencias` | reference | hidden URL/context | CANONICAL_REFERENCE | Party/Order/… | YES | no | yes | already | Wave B | — | PASS |
| `/trabajo` | partyId | hidden | CANONICAL_REFERENCE | Party | YES | no | yes | already | prior | — | PASS |
| Compromisos | partyId | prop | CANONICAL_REFERENCE | Party | YES | no | yes | already | prior | — | PASS |
| Cliente360 | compose | reads | CANONICAL_REFERENCE | same SoR | N/A | N/A | yes | already | SSR | — | PASS |
| Quote lines | product | QuoteProductPicker | CANONICAL_REFERENCE / NEW_FACT special | Product | — | yes (done) | yes | already | prior | — | PASS |
| `/coordinacion` | linked case | display from model | CANONICAL_REFERENCE | governed case | should consume existing | N/A | — | statement-only | **UNPROVEN** | auto-matter criteria | BUSINESS_DECISION_REQUIRED |
| Inventory snapshot Ítem | itemLabel | free text | NEW_FACT / EXTERNAL | none | no | no | — | N/A | — | — | PASS (manual evidence) |
| Evidence panel | relatedRecordId | free text | CANONICAL_REFERENCE | varies | — | YES if mounted | — | not mounted | N/A | latent | DUPLICATE_TRANSCRIPTION_DEFECT (latent) |

---

## Summary

| Metric | Value |
|---|---|
| **MANUAL_OPAQUE_INTERNAL_ID_ENTRY** | **ZERO** on Finanzas · Producción · Mensajes (latent Evidence panel only if mounted) |
| **DUPLICATE_TRANSCRIPTION_DEFECTS_FOUND** | Finanzas subjectId+label · Producción productId · Mensajes customer/opp/quote/order IDs · Compras/Entregas copy |
| **DUPLICATE_TRANSCRIPTION_DEFECTS_FIXED** | **3 surfaces + 2 presentation copies** |
| **KNOWN_WIRING_DEFECTS_REMAINING** | latent Evidence `relatedRecordId` if mounted; foundation gaps on warehouse/compras/entregas writes |
| **Reuse (do not fork)** | `SearchableSelect` · `ServerPartyTypeahead` (`lookupCustomers`) · preview catalog · `listOrders` / `listQuotes` / `listOpportunities` · `ServerMemberTypeahead` pattern |

**STOP** — three opaque-ID surfaces FIXED in code; Control Tower refreshes final prelaunch after hosted BV.
