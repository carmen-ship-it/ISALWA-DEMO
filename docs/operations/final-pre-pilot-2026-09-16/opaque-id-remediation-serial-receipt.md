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
| Deploy + hosted BV | **CLOSED** — LIVE `e9a7a02` web `dep-daleg6m5vjqs73f40ug0` · api `dep-daleg6m5vjqs73f40u2g` · WEB_API_SAME YES |
| Hosted BV | **PASS** — `/finanzas` · `/produccion` · `/mensajes` @1440 + @390 · `opaque-id-hosted-bv-receipt.md` · `opaque-id-mobile-bv-receipt.md` |

## Hosted BV

**PASS** on `e9a7a02` (desktop + mobile). REAL_SEVEN_MUTATED=NO.

## MANUAL_OPAQUE_INTERNAL_ID_ENTRY remaining

- Latent only: Evidence panel `relatedRecordId` if mounted (not mounted)
- Three primary surfaces: **ZERO** hosted-proven at `e9a7a02`
