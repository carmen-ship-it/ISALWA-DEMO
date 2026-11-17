# Evaluation inventory — candidate `7ddf258b`

Source: `ct3/v1-repairs` @ `7ddf258b` / tree `9c42e782` (evaluation notice/docs + Batch 5B attention states / Nota interna). Stage A `11e4f38b` is included. Not production. Not independently reviewed. Not hosted yet. Export: rebuild `isalwa-source-7ddf258b.tar.gz` (see `EVALUATION-PHASE4-HOSTING-PREP.md`); older `a8f3fc3a` export is superseded.

Spanish UI. Design system tokens only. Evaluation notice (when `NEXT_PUBLIC_OS_EVALUATION_NOTICE=1` or runtime profile `evaluation`):

> Entorno de evaluación · Los datos utilizados para esta revisión no son operación comercial real.

## A. WORKING AND AVAILABLE

| Area | Routes / actions | Required role / scope (summary) |
|---|---|---|
| Enter / leave | Login (dev local only), logout | Member of org |
| Hoy / shell | `/inicio`, nav, command palette, notices bell | Active membership |
| Clientes | `/clientes` search/list; `/clientes/[id]` Cliente 360 (próximo paso, responsable, última atención, problemas); edit allowed names/contacts; history | Customer read / edit per authority |
| Registrar cliente | `/clientes` drawer / nuevo §5.4 | `commercial.customer.create` |
| Import paste | Steward text → ValidateClientImport | Steward / import authority |
| Archive / reactivate | Cliente actions | Steward / archive authority |
| Corrections | Issue correction path (no generic resolve fallback) | `issue.manage` where applicable |
| Coverage | List/revoke grants | Coverage manage |
| Conversaciones | `/conversaciones` Registrar atención, filters, search, Tomar conversación; attention states; **Nota interna** (Solo equipo); Mensaje pane blocked (WhatsApp no conectado, Enviar disabled) | Customer visibility / claim / holder-or-manager for state |
| Cotizaciones | Draft → solicitar aprobación → Emitir → Descargar PDF (hash pinned) → Registrar aceptación → Crear pedido | Quote edit + `commercial.price.approve` + convert |
| Pedidos | View order from accepted quote | Order read |
| Finanzas | Report payment, per-tender verify, allocations | `payments.report` / `payments.confirm` |
| Compromisos | Create / reschedule / reassign / cancel; detail; handover queue; stored notices | Responsible member / manager rules |
| Mapa | `/mapa` list + honest “en preparación” without Mapbox token | Same customer visibility |
| Sistema | `/sistema` channel honesty (No conectado / AI sin verificar) | system.admin for some |

Synthetic data only for evaluation. No real customer import.

## B. VISIBLE BUT NOT YET CONNECTED

| Item | How it must present |
|---|---|
| WhatsApp send / delivery | Honest disconnected; no fake Enviar success |
| Email channel | No conectado |
| Map canvas pins | “Vista geográfica en preparación” without token |
| Payment instruction share | Absent until published approved content |
| Catalog share / verified prices | Blocked — do not claim Compartir catálogo |
| AI proposals | Configurada sin verificar / mock; no paid authoritative answer |
| Conversation release/reassign of a held chat | Not built (held chats stay with holder; NOT_HOLDER if another tries state change) |
| Inbound reopen / WhatsApp webhook | Rule defined; **no inbound caller** — Esperando al cliente / Resuelta only change by hand |
| 48h follow-up / due scheduler / sound | Not built |
| Price-approve range | Any scope holder may appear; range not modelled |

## C. NOT IN THIS EVALUATION

- Production WhatsApp / Meta number / real messages  
- Real emails, real payments, real customer import  
- Catalog PDF validation / approved Vitri prices  
- T12–T14 adapters (A01–A22, H01–H09) as live systems  
- Independent review sign-off  
- Render live data  
## Evaluator script (Isa / Álvaro)

See `EVALUATION-SCRIPT-ISA-ALVARO.md`. No click-coaching inside the app.
