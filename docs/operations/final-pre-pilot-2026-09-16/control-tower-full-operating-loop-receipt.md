# CONTROL TOWER — FULL OPERATING LOOP consolidated receipt

**When:** 2026-09-16T21:45Z  
**Integrator / sole deployer:** Control Tower (this chat)  
**REAL_SEVEN_MUTATED:** **NO**

---

## Runtime truth (do not collapse)

| Field | Value |
|---|---|
| Prior LIVE (map tip) | `03745ab522bb6f4e83b27fbc3353efd598ab07ac` |
| Integrated merge tip | `c13daf3430bba36f5ada1458eed8a3f81ef1c357` |
| **FINAL_RUNTIME_SHA (SAME web+API)** | **`8508b9ce84c9914ebf86f0b25e07e1f159ba122e`** |
| WEB_DEPLOY | `dep-dalgna2jnfac739h0otg` **LIVE** · `srv-dajddb67bikc73bl42q0` |
| API_DEPLOY | `dep-dalgna942hec73ce8360` **LIVE** · `srv-dajd64gae00c739gpk20` |
| Migrations applied on staging | `20260920120000_os_delivery_documents_flexible` · `20260920120000_os_finished_goods_receipt_pedido_context` |
| Health | API `/v1/health` ok · `/v1/health/ready` ready (db + outbox + attention) |
| Branch | `pre-pilot/company-os-pass` (pushed) |

Deploy repair commits after merge tip (hosted build/runtime): `00793e1` → `b900cc8` → `8508b9c`.

---

## Worker SHAs consumed

| Worker | Tip / feature | Integrated |
|---|---|---|
| Agent 1 commercial close | `40a4003` / receipt tip `cc3fc0c` | Yes → merge `131021a` |
| Agent 2 finished-goods | `2c6cd11` / tip `c051616` | Yes → merge `dd1708b` |
| Agent 3 delivery (CT completed) | `ae955b9` | Yes |
| Agent 4 operating day | `65e9b8c` / tip `445d5ed` | Yes → merge `c13daf3` |
| Agent 5 evidence | RO receipt only | Constraints held |

---

## Feature matrix (subfeatures separate)

| Subfeature | Code | Automated test | Hosted | Browser-verified |
|---|---|---|---|---|
| RecordQuoteManualSend → `quote.send_recorded` | **IMPLEMENTED** | package tests PASS | **HOSTED** @ `8508b9c` | **PENDING** (SYNTH walk in flight) |
| ReceiveFinishedGoods + Pedido context (not allocate) | **IMPLEMENTED** | package tests PASS | **HOSTED** + migration | **PENDING** |
| CreateNotaDeEntrega / RecordSalida / RecordEntrega | **IMPLEMENTED** | package tests PASS | **HOSTED** + migration | **PENDING** |
| Delivery note provisional PDF (NE-PILOT) | **IMPLEMENTED** | providers + panel copy tests | **HOSTED** | **PENDING** |
| Inicio today / event work offers | **IMPLEMENTED** | lane tests | **HOSTED** | **PENDING** |
| Map commercial lens (prior) | **IMPLEMENTED** | prior | **HOSTED** (ancestry) | **BROWSER-VERIFIED PASS** @ `03745ab` |
| WhatsApp provider send | N/A | — | — | intentional manual only |
| Official fiscal numbering | N/A | — | — | **HELD** NE-PILOT only |

---

## Persistence / DB acceptance

| Lane | SoR | Evidence |
|---|---|---|
| Manual quote send | Postgres `BusinessEvent` (`quote.send_recorded`) | Agent 1 receipt + commercial service |
| Finished goods receive | `os_finished_goods_receipts` + event; context_* columns live | Migration applied; columns verified |
| Delivery documents | `os_delivery_notes` / exits / deliveries; `document_kind` + `numbering_policy`; exit `delivery_note_id` | Migration applied; columns verified |
| No localStorage truth | HELD for these writes | Server actions → API commands |
| Idempotency | Org-scoped keys on commercial / FG / delivery paths | Package tests |
| Tenant FKs | organizationId on all lookups/writes | Package isolation tests |
| No fiscal numbering | `NE-PILOT-*` provisional only | Copy + PDF disclaimer |

---

## Actor / Carmen owner-eval

| Item | State |
|---|---|
| Carmen BUSINESS grant includes delivery + FG + warehouse exit | Spec already lists `DELIVERY_RECORD_SCOPE`, `WAREHOUSE_*`, FG receive/allocate — **no admin bypass** |
| FUTURE_ROLE_MATRIX | Separate; not used as live grant |
| Grant re-run this round | Not required for scope list (already includes ops scopes); refresh only if membership drifted |
| Owner-demo hosted walk | **UNPROVEN** this round (SYNTH BV first) |

---

## Carmen handoff (plain language)

### 1. Can an employee start with a customer and reach delivery without retyping the business?

**Closer than before — write path is now hosted.**  
Commercial close (PDF → record external send → convert to Pedido with lines) and post-sale FG receive + Nota→Salida→Entrega commands are on the same SHA with migrations applied. Hosted browser proof of the full interactive walk is still in progress and must not be claimed PASS until the SYNTH receipt lands.

### 2. Where does the employee still leave ISALWA?

- WhatsApp / channel send (manual record only)
- Official fiscal paper numbering
- Formal accounting / facturación / cobranza ledger
- Production as order-owned work (still annotation)

### 3. What remains manual but intentionally supported?

- Human quote → pedido convert
- Manual send registry
- Human FG receive and delivery confirmations (no auto-delivery-from-order)
- Finanzas operational evidence

### 4. What Isa/Álvaro still need to decide?

- Official nota numbering policy
- Order ↔ production linkage
- Coordinación criteria
- Whether V1 ops-write formalization is accepted for employee day-1

### 5. Tomorrow vs owner-review

| Audience | Verdict |
|---|---|
| Owner-review (Carmen eval login) | **YES — code+host ready**; interactive BV pending |
| Real employee day-1 | **NO** until BV PASS + USER-ACCEPT |
| USER_ACCEPTED | **NO** |

---

## Deploy failures fixed this round

1. Lockfile missing `@isalwa/os-delivery` under os-api → frozen install fail  
2. Stale Prisma client missing FG context columns  
3. `os-delivery` build typecheck on ExitRow test doubles  
4. Runtime `ERR_MODULE_NOT_FOUND` because FG/delivery pointed `main` at TypeScript `src` — now emit `dist` like peer OS packages  

---

## Next proof gate

SYNTH desktop+mobile adversarial walk receipt:  
`docs/operations/final-pre-pilot-2026-09-16/operating-loop-hosted-bv-receipt.md` (in flight).  
Do not mark BROWSER-VERIFIED PASS until that file scores subfeatures.
