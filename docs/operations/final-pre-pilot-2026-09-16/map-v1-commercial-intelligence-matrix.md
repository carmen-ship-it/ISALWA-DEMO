# Map V1 commercial intelligence — discovery matrix

**When:** 2026-09-16  
**Worktree:** `.worktrees/wave2-remediation-integrate` · `pre-pilot/company-os-pass`  
**Authority:** PRESENTATION/WIRING of existing SoR reads only · no invented revenue · no fake coordinates

## Feature matrix

| MAP FEATURE | CURRENTLY IMPLEMENTED? | CANONICAL SOURCE | HOSTED-PROVEN? | SAFE LABEL | GAP |
|---|---|---|---|---|---|
| Customer pins | YES | `listPartyLocations` · confirmed lat/lng only | YES (prior MAP_LIVE) | Pines con coordenadas confirmadas | — |
| Cliente360 deep link | YES | `partyHref(partyId)` → `/clientes/[id]` | YES @ `03745ab` | Abrir Cliente 360 | — |
| Opportunity context | YES (this pass) | `listOpportunities` · open/non-cancelled | YES @ `03745ab` | Oportunidades abiertas · Valor de oportunidades | — |
| Quote context | YES (this pass) | `listQuotes` · non-cancelled · `totalCentavos` | YES @ `03745ab` | Cotizaciones · Valor cotizado | — |
| Order context | YES (this pass) | `listOrders` · non-cancelled · `totalCentavos` | YES @ `03745ab` | Pedidos · Valor de pedidos | — |
| Attention signals | NO filter | Inicio attention queues exist; **no party→map filter** | N/A | Atención · futuro | **FOUNDATION_GAP** |
| Commercial value | YES (safe labels) | expectedValue / quote total / order total | PENDING this SHA | Valor de oportunidades / cotizado / de pedidos | — |
| Revenue | NO | No authoritative revenue SoR | N/A | — | **NOT EVIDENCED** · never label Ingresos |
| Recent activity | NO dedicated map field | Party summary lacks map-facing last-activity aggregate | N/A | — | **FOUNDATION_GAP** |
| Coverage / data-health | YES | Map coverage banner + location incompleteness buckets + data-health section | YES (prior) | Cobertura · ubicación incompleta | — |
| Filters · clientes | YES | Party active search + confirmed coords | YES | Clientes | — |
| Filters · oportunidades / cotizaciones / pedidos | YES (this pass) | Party-ID sets from org list reads | PENDING this SHA | Capas disponibles | Filters hide pins without inventing geography |
| Filters · needs-attention | NO | Attention lacks party-scoped map read | N/A | Atención · próx. | **FOUNDATION_GAP** |

## Classification

| Lane | Verdict |
|---|---|
| Pins / coverage / Cliente360 link | Existing · preserve |
| Portfolio strip + party commercial snapshot + commercial layers | **PRESENTATION/WIRING** · implemented |
| Attention filter · authoritative revenue · recent-activity lens | **FOUNDATION_GAP / NOT EVIDENCED** · not invented |

## Safe commercial metrics (exact list)

1. Oportunidades (count)
2. Valor de oportunidades
3. Cotizaciones (count)
4. Valor cotizado
5. Pedidos (count)
6. Valor de pedidos

Disclaimer (always): *Montos comerciales de registros canónicos. No es ingreso, facturación ni cobranza confirmada.*
