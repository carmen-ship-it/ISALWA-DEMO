# Evaluation availability matrix — 2026-11-17

Source pin (frozen deploy): `5e7131ccb0221a9db026a1bc009f1bd2aec95f17`  
Branch: `ct3/v1-repairs`  
Org: `isalwa-eval-demo-v1` · DB: `eimvhirmaezssnevefly` · Auth: `qbpxuywtoycjpitxoblo`

States: **deployed+integrated** · **unseeded** · **lane-only** · **provider/decision blocked** · **not implemented**

| # | Surface | Route(s) | In current source | Permission (nav / page) | Data dependency | Seed action | Blocker | Shared evaluator nav |
|---|---|---|---|---|---|---|---|---|
| 1 | Inicio / Hoy | `/inicio` | deployed+integrated | any member | attention/quotes/work projections | seed commercial+conversations+commitments | none for shell | yes |
| 2 | Conversaciones | `/conversaciones` | deployed+integrated | customer read / claim | `OsCustomerConversation` | seed manual attentions labelled EVALUACIÓN | Meta never connected | yes |
| 3 | Clientes / 360 | `/clientes`, `/clientes/[id]` | deployed+integrated | commercial customer scopes | parties/contacts/accounts | seed customers+contacts+coverage | none | yes |
| 4 | Contacts / phones / lifecycle / coverage / corrections | Cliente 360 tabs | deployed+integrated | customer.edit / coverage / issue.manage | party commands | seed phone history, coverage, one correction where supported | issue.manage optional | yes (via 360) |
| 5 | Opportunities | `/oportunidades` | deployed+integrated | commercial | `OsOpportunity` | seed open + stage examples | none | yes |
| 6 | Quotes / approvals / issue / accept / order | `/cotizaciones`, `/aprobaciones`, `/pedidos` | deployed+integrated | create/edit/convert; price.approve for approve | T04 commands | seed draft / pending-approval / issued / accepted+order; synthetic jefe approver | real price matrix absent → always approve | yes |
| 7 | Payments | `/finanzas` | deployed+integrated | `payments.report` (+ oversight) | payment reports | seed EVALUACIÓN reports if command wired | no approved payment instructions; no bank truth | yes with payments.report |
| 8 | Compromisos | `/compromisos` | deployed+integrated | responsible member | commitments | seed CreateEmployeeCommitment | 48h engine not built | yes |
| 9 | Catalog | `/productos` | deployed shell; **catalog lane** `18a0f0c`/`c872470` not fully integrated with approved PDF/prices | browse | os-catalog package exists | show structure only; **Precio por confirmar** | PDF/price matrix + independent review before Vercel catalog promote | yes (empty/pending honest) |
| 10 | Map | `/mapa` | deployed+integrated (honest empty) | customer read | locations + Mapbox token | seed lat/long via CreateLocation; **no pins canvas without token** | `NEXT_PUBLIC_MAPBOX_*` absent | yes (list / pending) |
| 11 | Recorrido | shell Journey (`?story=1`) | deployed+integrated | `management.org.read` or `people.admin` | none (presentation) | grant management.org.read to shared seat | intended any-eval-org rule not implemented | yes |
| 12 | WhatsApp / AI | `/conversaciones`, assist | honesty only | — | provider | manual conversations only; AI proposal-only | Meta + AI budget | no send |

## Intentionally unavailable (honest)

- Real WhatsApp inbound/outbound (no Meta)
- Bank-verified payments
- Catalog PDF validation / share / invented prices
- Live Mapbox canvas without token
- Production / warehouse / purchasing desks (no ops scopes on shared seat)
- People admin / system admin / auditoria

## Act-on list (this P0)

1. Broaden shared seat commercial demo scopes (no admin).
2. Idempotent EVALUACIÓN fixture seed via command services.
3. Fix submitted→“Enviada” misleading label → “Emitida”.
4. Hosted browser proof after seed (frozen URL + Mac API).
5. Catalog lane / Mapbox / Meta remain decision/provider blocked — do not fake.
