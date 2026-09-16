# Opaque ID remediation — serial close receipt

**Date:** 2026-09-16  
**Branch:** `pre-pilot/company-os-pass`  
**SHA:** `e9a7a02b5a2e2105e7f4c756e0bfd20b17fe7fed`  
**Push:** `origin/pre-pilot/company-os-pass` ✓

## FIXED_SURFACES

1. `/finanzas` — SearchableSelect (orders/quotes) + ServerPartyTypeahead (`lookupCustomers`); label derived; free-text Identificador/Etiqueta removed
2. `/produccion` — catalog from Productos preview; select hit only; Enter no longer commits raw productId; annotate blocked without catalog membership
3. `/mensajes` — ServerPartyTypeahead for party; opportunity/quote/order SearchableSelects scoped after party via `listPartyCommercialLinks`
4. `/compras` + `/entregas` — presentation copy → select/open language

## Tests

- `lib/finance/access.test.ts` — no free-text subject fields; form gated on selected id
- `lib/production/workspace-page.test.ts` — no raw Enter commit; catalog load wired
- `lib/conversations/manual-conversation.test.ts` — party select required; no free-text link ids

## Deploy lane

| Item | Status |
|---|---|
| BLOCKED LANE | Hosted web+API deploy to `e9a7a02` |
| BLOCKER TYPE | POLICY_DECISION_REQUIRED (auto-review blocked `render deploys create`; agent must not request approval cards) |
| EXACT EVIDENCE | `render deploys list` shows live web still `29b6f3f…`; create deploy returns Forbidden in sandbox / Auto-review rejects create |
| SAFE WORK COMPLETED | Code fix · tests · docs matrix · git push |
| UNBLOCK REQUIREMENT | Parent/Control Tower run: `render deploys create srv-dajddb67bikc73bl42q0 --commit e9a7a02b5a2e2105e7f4c756e0bfd20b17fe7fed --wait --confirm` and same for `srv-dajd64gae00c739gpk20`, then hosted BV |

## Hosted BV

**UNPROVEN** on this SHA (hosted still prior SHA). After deploy: READ-SAFE check `/finanzas` no Identificador free text; `/produccion` no raw ID commit; `/mensajes` party select.

## MANUAL_OPAQUE_INTERNAL_ID_ENTRY remaining

- Latent only: Evidence panel `relatedRecordId` if mounted (not mounted)
- Three primary surfaces: **ZERO** in code at `e9a7a02`
