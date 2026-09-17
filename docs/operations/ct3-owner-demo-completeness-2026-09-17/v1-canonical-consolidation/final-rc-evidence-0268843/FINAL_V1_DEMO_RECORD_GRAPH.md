# FINAL_V1_DEMO_RECORD_GRAPH

**RC:** `02688431b9290b818c8fb245d68c086379363b3f`  
**Source of IDs:** `apps/os-web/lib/demo/seeded-ids.json` (seededAt 2026-09-17T13:10:41.619Z)  
**SYNTH org:** `01M2JKF77TXMJNDTKNCYNHH9G5`  
**REAL_SEVEN_MUTATED:** NO

## DEMO MADERAS ORIENTE — live graph

| Record | ID | Relationship | NORMAL ROUTE | VISIBLE OWNER? | VISIBLE RELEVANT VIEW-AS? | HOSTED PROVEN? |
|---|---|---|---|---|---|---|
| Client | `01M2PM95PV7YP6AECYXSX4GRBW` | root | /clientes/{id}?datos=demo | YES | Asesor subject / commercial | YES |
| Opportunity | `01M2PM9GD3P8CNE3HPS5QBCYW8` | of client | oportunidad under cliente | YES | commercial View As | PARTIAL |
| Quote | `01M2PM9KSJXN1K4CF45FT0H299 (Q-000002)` | of opportunity | /clientes/.../cotizaciones/01M2PM9KSJXN1K4CF45FT0H299 | YES | commercial; stripped ops View As | PARTIAL |
| Quote PDF | `01M2PM9KSJXN1K4CF45FT0H299` | document | /api/quotes/01M2PM9KSJXN1K4CF45FT0H299/pdf | YES | auth | PARTIAL |
| Pedido | `01M2PMA280KX4AAV7049YKNE07` | from quote | /clientes/.../pedidos/01M2PMA280KX4AAV7049YKNE07 | YES | ops desks | PARTIAL |
| Delivery Note | `01M2PMCSNXH644P1C4F832BGKQ` | of pedido | DN surfaces + PDF | YES | Almacén/Entregas | PARTIAL |
| DN PDF | `01M2PMCSNXH644P1C4F832BGKQ` | document | /api/delivery-notes/01M2PMCSNXH644P1C4F832BGKQ/pdf | YES | auth | PARTIAL |
| Finished goods | `01M2PMBKNGK4K5W4TVAENE1HE6` | warehouse fact | almacén / pedido context | YES | Almacén/Producción | UNPROVEN |
| Follow-up Work | `01M2PMA7E1B2P82AJA8YK7KT3P` | work | /trabajo | YES | Trabajo View As | PARTIAL |
| Order-prep Work | `01M2PMAB52J9J61RRY8S0N1YGR` | work | /trabajo + ops desks | YES | Producción/Almacén/Compras | PARTIAL |
| Commitment | `01M2PMBJFR51CQ579NQECY0JN4` | commitment | /compromisos | YES | — | UNPROVEN |
| Conversation | `owner-demo-conversation:maderas_oriente` | durable row | /conversaciones | YES | commercial View As | YES |

| Temporary coverage | — | none in seeded-ids | — | — | — | N/A |
| Approval / Issue / Salida / Entrega / Finance / Audit event IDs | not in seeded-ids | may exist as separate SoR | respective routes | if present | filtered | PARTIAL / UNPROVEN |

## Other DEMO scenarios

| Demo | Party | Conversation | Opportunity | Quote | Order | DN |
|---|---|---|---|---|---|---|
| constructora_andina | `01M2PMDY71EDWHJG3AFK36TDZ2` | `owner-demo-conversation:constructora_andina` | `01M2PRQZ90J8R9M9363C2A6N3Y` | `01M2PRR24KVC8EXSNWT5MVQPT6` (Q-000006) | `None` | `None` |
| proyectos_del_sur | `01M2PME87FZGJT8R22KPX921Z2` | `owner-demo-conversation:proyectos_del_sur` | `01M2PMEGAF02E90ZSCEDW11RRX` | `01M2PMEKQCXMJ99Z36S77EMD37` (Q-DEMO-001) | `None` | `None` |
| hotel_central | `01M2PMF0V0VHHYH19KBXH629E8` | `owner-demo-conversation:hotel_central` | `01M2PMF8ZW0AWE11WMAGG5PY0Z` | `01M2PMFBQFREFNHZNTQ2SFQF1Y` (Q-000004) | `01M2PMFQHJC5T6THD44N9SGPKB` | `01M2PMFVF55XJB0SCP1KG2HH9R` |
| ferreteria_norte | `01M2PMFXKD9VTWB21SQX0VEDJY` | `owner-demo-conversation:ferreteria_norte` | `01M2PMG5XFXXXDV08A8J9RSHCV` | `01M2PMG8N5JFGY9MCFSJT6NEV4` (Q-000005) | `01M2PMGHWHT6WF044JDV4HEZVT` | `None` |

All conversation IDs are durable `OsCustomerConversation` natural keys under SYNTH.
