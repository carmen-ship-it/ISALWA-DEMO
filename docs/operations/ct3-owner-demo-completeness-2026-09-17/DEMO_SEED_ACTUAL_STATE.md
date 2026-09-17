# DEMO_SEED_ACTUAL_STATE

**Forensic · read-only · queried 2026-09-17**  
**DB:** staging Postgres via `~/.isalwa-secrets/isalwa-os-staging.external-database-url` (secrets not printed)  
**SYNTH org:** `01M2JKF77TXMJNDTKNCYNHH9G5`  
**Id map source:** `apps/os-web/lib/demo/seeded-ids.json` (`seededAt: 2026-09-17T04:09:03.115Z`) + `packages/os-database/src/owner-demo/seed.ts` / `catalog.ts`  
**Database name observed:** `isalwa_os_staging`

---

## Verdict strip

| Field | Value |
|---|---|
| DEMO parties in SYNTH matching catalog | **5 / 5** (all seeded party IDs present) |
| Seeded primary commercial IDs present | **YES** (quotes, orders, DNs, FG, work, commitment as listed in map) |
| Densify extras beyond primary map | **YES** (extra opps, work, commitment, issues) |
| `os_customer_conversations` for DEMO parties | **0** (fixtures live in `apps/os-web/lib/demo/conversations.json`, not DB) |
| Approvals on DEMO quotes | **0** |
| DEMO names on REAL org | **0** |
| `REAL_SEVEN_MUTATED` | **NO** |

---

## REAL_SEVEN_MUTATED

Protected names on REAL org `01M2DV9F0V5DXS4G89AKF4D5SR`:

| display_name | party_id | created_at / updated_at |
|---|---|---|
| COMERCIAL ALVAREZ | `01M2EAG28AGG7PKB99CAFYAZFK` | 2026-09-13 21:24:13Z (unchanged) |
| COMERCIAL ASTRIX | `01M2EAG2EQ14RKAATF94930TFY` | 2026-09-13 21:24:13Z |
| COMERCIAL GARCIA | `01M2EAG1JC5ZR3MXVABBDXK30R` | 2026-09-13 21:24:12Z |
| COMERCIAL MICRISTAL | `01M2EAG0ZC786YEQ7VC55T364A` | 2026-09-13 21:24:11Z |
| COMERCIAL TORREZ | `01M2EAG160CNAHSC7MH9Z5BBGV` | 2026-09-13 21:24:12Z |
| COMERCIAL VAINSA | `01M2EAG1BZ923Z1KNK9BN46EEB` | 2026-09-13 21:24:12Z |
| IMPORTAMEC | `01M2EAG2N21FF7B7C0Z9QKB8Q1` | 2026-09-13 21:24:13Z |

No REAL_SEVEN `updated_at >= 2026-09-17`. No `DEMO %` party names on REAL org.  
**REAL_SEVEN_MUTATED = NO.**

---

## Counts by type (5 DEMO parties)

| Type | Count in DB |
|---|---:|
| parties | 5 |
| opportunities | 7 |
| quotes | 5 |
| orders | 3 |
| commitments | 2 |
| delivery notes | 2 |
| finished-goods receipts (context party/order) | 2 |
| warehouse exits (demo orders) | 1 |
| work items (party/quote/order subject) | 8 |
| issues (via `os_issue_references` party) | 3 |
| approvals on demo quotes | 0 |
| `os_customer_conversations` | 0 |

---

## Client 1 — `maderas_oriente` (story primary)

| Entity | ID / value | Status / notes |
|---|---|---|
| party | `01M2PM95PV7YP6AECYXSX4GRBW` | DEMO MADERAS ORIENTE · active · matches seed map |
| opportunity | `01M2PM9GD3P8CNE3HPS5QBCYW8` | won · DEMO MADERAS — loop sano |
| quote | `01M2PM9KSJXN1K4CF45FT0H299` | Q-000002 · **accepted** · 450000 |
| order | `01M2PMA280KX4AAV7049YKNE07` | O-000002 · open |
| delivery note | `01M2PMCSNXH644P1C4F832BGKQ` | NE-PILOT-DEMO-01M2PMCSNX · issued · delivered_at set |
| warehouse exit | `01M2PMCTX0YXFTHKA5A5HBBRRB` | order→DN linked |
| finished goods | `01M2PMBKNGK4K5W4TVAENE1HE6` | qty 10 · `[is_demo]` |
| commitments | `01M2PMBJFR51CQ579NQECY0JN4` (fulfilled, seed map) · `01M2PRTNAV9VB8BNWQTXTRA9MP` (open, densify) | |
| work | `01M2PMA7E1B2P82AJA8YK7KT3P`, `01M2PMAB52J9J61RRY8S0N1YGR` (seed map) · plus densify `01M2PRRN1V581TQYF4R4RVF2NV`, `01M2PRRRF6Y2J0Z9EKZHZJACV7` (completed), `01M2PRTR1QDX59DGF05TQK6SMG`, `01M2PRTVS20CBHZJJ7KNXMKJH9` | |
| conversations (DB) | — | none |
| approvals | — | none |
| issues | — | none |

---

## Client 2 — `constructora_andina`

| Entity | ID / value | Status / notes |
|---|---|---|
| party | `01M2PMDY71EDWHJG3AFK36TDZ2` | DEMO CONSTRUCTORA ANDINA · active |
| opportunities | `01M2PRQZ90J8R9M9363C2A6N3Y` (seed · open · calificacion) · `01M2PRV8WVWV1TK6C0DFZKMGEK` (densify · open · propuesta) | |
| quote | `01M2PRR24KVC8EXSNWT5MVQPT6` | Q-000006 · **draft** · 840000 · no order (matches seed `orderId: null`) |
| order / DN / FG / commitment / work / issues / approvals | — | none |
| conversations (DB) | — | none |

---

## Client 3 — `proyectos_del_sur` (convert-path story)

| Entity | ID / value | Status / notes |
|---|---|---|
| party | `01M2PME87FZGJT8R22KPX921Z2` | DEMO PROYECTOS DEL SUR · active |
| opportunity | `01M2PMEGAF02E90ZSCEDW11RRX` | open · negociacion |
| quote | `01M2PMEKQCXMJ99Z36S77EMD37` | **Q-DEMO-001** · **submitted** · 168000 · no order (convert remaining) |
| work | `01M2PRTZFJRPD8CHATN7384KMD` | open · subject quote Q-DEMO-001 (densify) |
| order / DN / FG / commitment / issues / approvals | — | none |
| conversations (DB) | — | none (JSON fixture only: acceptance text for Q-DEMO-001) |

---

## Client 4 — `hotel_central`

| Entity | ID / value | Status / notes |
|---|---|---|
| party | `01M2PMF0V0VHHYH19KBXH629E8` | DEMO HOTEL CENTRAL · active |
| opportunities | `01M2PMF8ZW0AWE11WMAGG5PY0Z` (seed · open) · `01M2PRVBYAE4W5XHS4WW60RR5J` (densify · **lost**) | |
| quote | `01M2PMFBQFREFNHZNTQ2SFQF1Y` | Q-000004 · accepted · 208000 |
| order | `01M2PMFQHJC5T6THD44N9SGPKB` | O-000003 · open |
| delivery note | `01M2PMFVF55XJB0SCP1KG2HH9R` | issued · **no** delivered_at (pedido sin salida story) |
| finished goods | `01M2PMFTWP925CRMWGHP5K488B` | qty 4 · `[is_demo]` |
| warehouse exit | — | none for this order |
| work | `01M2PRV2KR2B5WY6GDJQBD6PTA` | densify · party subject |
| conversations / approvals / issues | — | none |

---

## Client 5 — `ferreteria_norte`

| Entity | ID / value | Status / notes |
|---|---|---|
| party | `01M2PMFXKD9VTWB21SQX0VEDJY` | DEMO FERRETERÍA NORTE · active |
| opportunity | `01M2PMG5XFXXXDV08A8J9RSHCV` | open |
| quote | `01M2PMG8N5JFGY9MCFSJT6NEV4` | Q-000005 · accepted · 180000 |
| order | `01M2PMGHWHT6WF044JDV4HEZVT` | O-000004 · open |
| DN / FG / warehouse exit | — | none (matches seed nulls) |
| issues | `01M2PRV4BADXS6T1AGE2ZMZ0RX` (open) · `01M2PRV5H1JTARSF3APN57PP0Y` (in_progress) · `01M2PRV6A5X9JJFSRPA4S8EPT0` (resolved) | densify |
| conversations / approvals / commitments / work | — | none in DB for work/commitments |

---

## Conversations note

`OWNER_DEMO_CONVERSATIONS` in `packages/os-database/src/owner-demo/catalog.ts` is attached to the seed receipt object in `seed.ts`, but **does not insert** into `os_customer_conversations`. UI/demo path uses `apps/os-web/lib/demo/conversations.json` (`purpose: ct3-e-owner-demo-conversation-fixtures`).

---

## Seed map fidelity

Every non-null ID in `seeded-ids.json` `clients[]` was present in DB (`t`). Densify run added entities **not** listed as primary keys in that file (extra opps, work, commitment, issues) while preserving the five DEMO party identities.
