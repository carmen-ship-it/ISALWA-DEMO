# FINAL_V1_TEST_INVENTORY

**RC:** `02688431b9290b818c8fb245d68c086379363b3f`  
Tests listed protect RC behavior; hosted BV is separate.

## UNIT

| TEST | PROVES | DOES NOT PROVE | RESULT | SHA |
|---|---|---|---|---|
| `apps/os-web/lib/role-preview/role-preview.test.ts` | View As access, scopes, commercial list narrowing, desk allow-list, mutation banner contract | Hosted UX | PASS locally at tip | `02688431b9290b818c8fb245d68c086379363b3f` |
| `apps/os-web/lib/role-preview/evaluation-history-filter.test.ts` | Doc/history/audit negatives A–J fail-closed | Hosted interactive Asesor B | PASS | `02688431b9290b818c8fb245d68c086379363b3f` |
| `packages/os-contracts/src/commercial-authority.test.ts` | convert.own; coverage≠convert; reassign gates | Hosted convert | PASS (tip) | tip |
| `packages/os-work/src/commercial-approval.test.ts` | Approval never creates Pedido | Hosted approve click | PASS | tip |
| `apps/os-web/lib/commercial/post-approval-continue.test.ts` | Post-approval next ≠ auto Pedido | Hosted | PASS | tip |
| `apps/os-web/lib/demo/owner-company-context.test.ts` | Demo→SYNTH mapping | Hosted cookie race | PASS | tip |
| `apps/os-web/lib/demo/pf4-pdf-same-implementation.test.ts` | Demo/Story PDF same /api path | Byte PDF download | PASS | tip |
| `apps/os-web/lib/management/org-metrics.test.ts` | No revenue wording | Hosted Gerencia visuals | PASS | tip |
| `apps/os-web/lib/map/commercial-lens.test.ts` | No revenue; safe sums | Interactive map drag | PASS | tip |
| `apps/os-web/lib/progress/*` / delivery-progress tests | Nota/Salida/Entrega facts | Universal strip UI | PASS where present | tip |
| `apps/os-api/src/ai.controller.test.ts` | AI hides unauthorized evidence | Hosted OpenAI call | PASS | tip |

## INTEGRATION / API

| TEST | PROVES | DOES NOT PROVE | RESULT | SHA |
|---|---|---|---|---|
| `apps/os-api/src/tenant-isolation.test.ts` | Cross-tenant deny | Web palette path | PASS | tip |
| `apps/os-api/src/quote-pdf.http.test.ts` | Cross-tenant PDF NOT_FOUND | Owner BV PDF click | PASS | tip |
| `apps/os-api/src/customer-conversations.controller.test.ts` | Org-scoped conversation list | Hosted thread UX | PASS | tip |
| `packages/os-commercial/src/commercial-tenant-write.test.ts` | Write org enforcement | UI | PASS | tip |

## DATABASE

| TEST / FIXTURE | PROVES | DOES NOT PROVE | RESULT | SHA |
|---|---|---|---|---|
| `fixture:owner-demo` seed receipt | 5 conversations + demo graph IDs | Future densify drift | PASS applied 2026-09-17T13:10:41Z | seed @ RC train |
| schema migrations tip | latest migration name | Live apply if drift returns | SCHEMA_DRIFT NO at RC cut | tip |

## SECURITY NEGATIVE

| TEST | PROVES | DOES NOT PROVE | RESULT | SHA |
|---|---|---|---|---|
| evaluation-history-filter A–J | View As doc/history/audit fail-closed | Every hosted persona interactive | PASS | `02688431b9290b818c8fb245d68c086379363b3f` |
| commercial-authority cross-owner | Convert deny | Hosted other-Asesor | PASS | tip |
| quote-pdf cross-tenant | PDF deny | — | PASS | tip |

## HOSTED BROWSER

| TEST | PROVES | DOES NOT PROVE | RESULT | SHA |
|---|---|---|---|---|
| `carmen-owner-bv-results.json` | Login, Demo SYNTH, nav surfaces, durable conversations, admin deny, identity Carmen | Full View As matrix; PDF bytes; approve→convert | **21 PASS / 0 FAIL** | `02688431b9290b818c8fb245d68c086379363b3f` |
| `v1-rc-viewas-bv.json` | View As open Prod/Almacén/Asesor; mutation J blocked; historial/docs | Perfect audit heuristic; conversations under leftover View As | 14 PASS / 3 FAIL heuristics; recheck owner audit+conv PASS | `02688431b9290b818c8fb245d68c086379363b3f` |

## VISUAL

| TEST | PROVES | DOES NOT PROVE | RESULT | SHA |
|---|---|---|---|---|
| `screenshots/*.png` (10) | Desktop hierarchy/CTAs/tabs/Demo banner at RC | Mobile; computed CSS token audit | CAPTURED | `02688431b9290b818c8fb245d68c086379363b3f` |
