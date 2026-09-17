# CT3_DEVIATIONS

Do not hide differences inside residuals. Format: REQUESTED / ACTUAL / MATCH|DEVIATION / WHY / RECOMMENDED ACTION.

| # | REQUESTED | ACTUAL | MATCH / DEVIATION | WHY | RECOMMENDED ACTION |
|---|---|---|---|---|---|
| 1 | CT3 same-SHA deploy + hosted BV PASS | CT3 not pushed/deployed; live still CT2 `4b85b11` | **DEVIATION** | integrator mid-pass; aborts | Push/deploy after F/G decision; run addendum BV |
| 2 | All lanes A–I complete | F + G aborted; WIP not integrated | **DEVIATION** | user stop — no re-dispatch | Carmen: salvage WIP or accept gap |
| 3 | Navy literal `#12324A` | `--isalwa-kiln #18324b` | **DEVIATION** | frozen design tokens | Accept token map or retune tokens with design approval |
| 4 | Teal literal `#2C8C88` | `--isalwa-glaze #287a78` | **DEVIATION** | frozen tokens | same |
| 5 | Soft teal `#EAF6F4` | `--isalwa-teal-100 #e2f0ed` | **DEVIATION** | frozen tokens | same |
| 6 | Amber fills `#FFF5DB`/`#F6E3A6` | warning `#b8872e` + color-mix tints | **DEVIATION** | no literal amber fill tokens | map or add tokens |
| 7 | Soft green/red literal fills | success/danger color-mix | **DEVIATION** | token system | hosted verify after deploy |
| 8 | Pedido known-state + ops desk CT3 density | F not merged | **DEVIATION** | abort | salvage F or CT finish |
| 9 | Map valor labels / mgmt funnel / Inicio bands | G not merged | **DEVIATION** | abort | salvage G or CT finish |
| 10 | Conversaciones Contexto ISALWA fully smart | stubs + D helpers not fully wired in panel | **DEVIATION** | C stubWaiting; D library ready | integrator wire D into C panel |
| 11 | Durable DB conversation Message table | reused manual/evidence model; demo JSON fixtures | **DEVIATION** | smallest reuse | OK for V1 if accepted; else migrate |
| 12 | Demo seed applied + Story CTAs durable | seed script only; `seeded-ids.json` may be empty until run | **DEVIATION** | not applied | run SYNTH fixture |
| 13 | AI_OWNER_REVIEW_READY YES | NO — UNPROVEN; controls hide when blocked | **MATCH** to fail-safe rule | provider/hosted not proven | hosted reverify or keep hidden |
| 14 | Quote/DN PDF hosted click proof | UNPROVEN | **DEVIATION** | no CT3 live | BV after deploy+seed |
| 15 | Demo banner copy “Conversación de ejemplo. Datos ficticios.” | `Hilo de demostración. WhatsApp no está conectado…` + `DEMO·WHATSAPP` | **DEVIATION** | lane C wording | product approve or align copy |
| 16 | USER_ACCEPTED | NO | **MATCH** (required) | authority | Carmen only |
| 17 | Final artifacts before this commit | missing | **FIXED** | created now | this folder |

## KNOWN_DEVIATIONS_COUNT

**16 open product/engineering deviations** (row 17 closed by creating artifacts).

## Progress file

`PROGRESS_RECEIPT.md` superseded for handoff by `CT3_FINAL_RECEIPT.md` + this set.
