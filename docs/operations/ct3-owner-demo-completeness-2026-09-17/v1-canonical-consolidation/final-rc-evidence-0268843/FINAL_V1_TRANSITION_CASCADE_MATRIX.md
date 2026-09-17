# FINAL_V1_TRANSITION_CASCADE_MATRIX

**RC:** `02688431b9290b818c8fb245d68c086379363b3f`

| Transition | Trigger | Actor | Before→After | Related | Work | Next | Surfaces | Hosted | Negative |
|---|---|---|---|---|---|---|---|---|---|
| Create client | Agregar cliente | commercial.customer.create | none→Party | — | — | owner | Clientes; 360 | PARTIAL | tenant |
| Create opportunity | Nueva oportunidad | commercial | Party→Opp | Party | — | owner | 360; Opp list | PARTIAL | — |
| Create quote | Crear cotización | owner | Opp→Quote draft | Opp | — | owner | Quote; docs | PARTIAL | — |
| Quote PDF | Descargar | auth read | — | Quote | — | — | Documents | PARTIAL | cross-tenant PDF NOT_FOUND |
| Registrar enviada | manual send | owner | sent evidence | Quote | optional follow-up | owner | Quote status | PARTIAL | — |
| Schedule follow-up | human | owner | — | Quote | CreateWorkItem | owner | Trabajo; Inicio | PARTIAL | no auto SLA |
| Accept quote | accept | owner/rules | →accepted | Quote | — | owner | lists | PARTIAL | — |
| Request approval | Solicitar | quote owner | →Approval pending | Quote | Approval | named approver | Aprobaciones | PARTIAL | no cargo auto-pick |
| Decide approval | approve/reject | assignee | →decided | Quote | resolve | owner convert if ok | post-approval continue | PARTIAL | **never CreateOrder** |
| Convert→Pedido | Convertir | owner+convert.own | →Order | Quote/Order | **no** auto ops work | commercial→ops | Pedido | PARTIAL | coverage≠convert |
| Order prep review | Solicitar | authorized | — | Order | CreateWorkItem prep | Prod/Alm/Compras | ops desks | PARTIAL | no auto on convert |
| Record DN | DN command | delivery.record | — | DN | — | warehouse/coord | Docs; Entregas | PARTIAL | DN PDF scope |
| Record Salida | warehouse exit | warehouse | — | Exit | — | coordinación | progress | UNPROVEN RC | Nota≠Salida |
| Record Entrega | delivery | delivery | — | Delivery | — | finance ops | progress | UNPROVEN RC | Salida≠Entrega |
| Reassign owner | ReassignCommercialAccountOwner | commercial.account.reassign | ownerA→B | Party | — | new owner | history event | UNPROVEN | Asesor self-take deny |
| Coverage grant | **missing product command** | intended Jefe/Gerencia | — | grant | — | covered≠convert | — | NO | — |
| Conversation | manual register | commercial | — | Conversation | optional confirm | owner | Conversaciones | YES list | org isolation |
| Issue | issue commands | authorized | open↔resolved | Issue | Work links | assignee | Incidencias | PARTIAL | — |
| Commitment | register | authorized | — | Commitment | — | owner | Compromisos | PARTIAL | — |
| View As on | persona cookie | Carmen | broad→narrow | projection | mutations off | Carmen | wired pages | PARTIAL | A–J + hosted J |

Gaps: coverage grant UI; full hosted approve→convert→ops; Salida/Entrega hosted on this RC pack.
