# FINAL RC4 HOSTED BV RECEIPT (in-progress / not complete)

**RC4_SHA:** `9e1cfe3ee1f18e568b7f34254e5794cf49baa8b7`  
**WEB_DEPLOY_ID:** `dep-dam4rvrm8hqs73bk3ok0`  
**API_DEPLOY_ID:** `dep-dam4s07f3r2c73efstf0`  
**WEB_RUNTIME_SHA / API_RUNTIME_SHA:** `9e1cfe3ee1f18e568b7f34254e5794cf49baa8b7`  
**SAME_SHA_PROOF:** YES  
**RC4_HOSTED_CODE_FROZEN:** YES  

## 0. Scope-count reconciliation

| Field | Value |
|-------|--------|
| PRIOR_REPORTED_SCOPE_COUNT | 21 |
| CURRENT_CANONICAL_SCOPE_COUNT | 20 |
| PRIOR_21_SCOPE_SOURCE | Cut inspection prose labeled `OWNER_DEMO_SYNTH_BUSINESS_SCOPES (21 keys)` while listing the same 20-line block |
| CURRENT_20_SCOPE_SOURCE | `packages/os-database/src/staging-carmen-synth-demo-scopes.ts` at RC4_SHA (git history always length 20) + runtime membership `0f3da8a7-6d31-4e36-8f45-41331e6f5731` |
| SCOPE_PRESENT_IN_PRIOR_21_BUT_NOT_CURRENT_20 | NONE |
| CLASSIFICATION | **COUNTING_ERROR** |
| UNEXPLAINED_SCOPE_LOSS | **0** |
| SCOPE_COUNT_RECONCILED | YES |
| Evidence | `RC4_SCOPE_COUNT_RECONCILIATION.md` |

```
SYNTH_SCOPE_CORRECTION_NEEDED = NO
SYNTH_SCOPE_CORRECTION_EXECUTED = NO
```

## BV execution status

Full automated harness launch was blocked by host smart-mode policy. Hosted mutation BV continued via browser on disposable SYNTH (`datos=demo`) only.

**FULL_HOSTED_BV_STARTED = YES (partial)**  
**FULL_HOSTED_BV_COMPLETE = NO**

### Proven this pass (hosted UI)

| Item | Result | Evidence |
|------|--------|----------|
| `/auditoria` owner Demo | **PASS** | Loads filters + audit rows; no raw Next crash |
| Pedidos index | **PASS** | O-000002/003/004 visible under Demo |
| Pedido Maderas direct | **PASS** | O-000002 coherent with Cliente/Quote/docs |
| Solicitar revisión Producción | **PASS** | Clicked → `Revisión solicitada` + Ver trabajo |
| Solicitar revisión Almacén | **PASS** | Clicked → `Revisión solicitada` + Ver trabajo |
| Solicitar revisión Compras | **PASS** | Clicked → button disabled (pending UI refresh); mutation accepted |
| Conversaciones Revisar visible | **VISIBLE** | Andina thread shows Revisar / Ignorar |
| Conversaciones Revisar clicked | **UNPROVEN** | Click registered; durable persist not re-confirmed |
| Conversaciones Ignorar | **UNPROVEN** | Visible; click not completed this pass |
| Resolver incidencia | **PRODUCT_FAIL** | Detail route shows `Ocurrió un error al cargar la información` for SYNTH issues `01M2PRV5…` and `01M2PRV4…` |
| Escalar a Gerencia | **UNPROVEN** | Not completed this pass |
| Nota PDF human download | **UNPROVEN** | Control present (`Descargar PDF` / `Abrir PDF`); bytes not captured (API path 404 without app session route) |
| Fresh UI opp→quote→pedido | **UNPROVEN** | Not completed this pass |
| Quote PDF on user-created quote | **UNPROVEN** | Not completed this pass |

### OPEN P0 discovered on frozen RC4

1. **ISSUE_DETAIL_LOAD_ERROR** — `/incidencias/{id}?datos=demo` returns product error panel instead of issue body → blocks Resolver incidencia hosted proof.

### Gates (honest)

```
PRODUCT_PROMISES_TOTAL = 118
PROMISE_BUCKET_SUM = 118  (ledger baseline preserved; not re-scored hosted)

RC3_MISSING_ACTIONS_7_HOSTED = 3/7 PASS (OrderPrep ×3); NOT 7/7
  PASS: Solicitar revisión Producción / Almacén / Compras
  PRODUCT_FAIL: Resolver incidencia (detail load)
  UNPROVEN: Review, Ignore, Escalar a Gerencia

MANUAL_ACTIONS_V1_PROMISED = 41
MANUAL_ACTIONS_V1_HOSTED_REACHABLE = UNPROVEN (inventory not fully walked)
MANUAL_ACTIONS_V1_HOSTED_MISSING = UNPROVEN

MANUAL_DATA_ENTRY_HOSTED = UNPROVEN
FRESH_UI_CREATED_JOURNEY = UNPROVEN
QUOTE_PDF_HUMAN_DOWNLOAD = UNPROVEN
QUOTE_PDF_BYTES_VALID = UNPROVEN
NOTA_PDF_HUMAN_DOWNLOAD = UNPROVEN
NOTA_PDF_BYTES_VALID = UNPROVEN
USER_CREATED_DATA_CROSS_PAGE_SYNC = UNPROVEN
SEED_DEPENDENCY_PRODUCT_GAPS = UNPROVEN
HUMAN_FORM_USABILITY_BLOCKERS = UNPROVEN

FULL_*_LOOP_HOSTED = UNPROVEN (not fully closed this pass)
LOOPS_WITH_DEAD_ENDS_HOSTED = UNPROVEN

AUDIT_ROUTE_HOSTED = PASS
AUDIT_ERROR_STATE_HOSTED = PASS (no crash)
PEDIDOS_INDEX_SINGLE_TRUTH_HOSTED = PASS (seeded; fresh UI pedido not yet)

FRESH_SESSION / DEMO_CONTEXT / VIEW_AS / DATA_MODE = UNPROVEN (partial Demo banner only)
HOSTED_TENANT_NEGATIVES / RESOURCE / VIEW_AS_SECURITY / SEARCH = UNPROVEN
STORY_MODE_PASS = UNPROVEN
EMPTY/ERROR/LOADING = UNPROVEN
DESKTOP_EXPERIENCE = UNPROVEN
MOBILE_HOSTED = UNPROVEN

PARTIAL_PROMISES_STILL_OPEN = P-C360-02, P-C360-08, P-COM-10, P-COM-12, P-VIS-02, P-VIS-03, UPR-15, UPR-36
AI_OWNER_REVIEW_READY = NO

REAL_SEVEN_MUTATED = NO

FIVE_LAYER_CONTRACT = PASS (scope count + same SHA + no correction executed)
FIVE_LAYER_PRODUCT = FAIL (issue detail load)
FIVE_LAYER_JOURNEY = UNPROVEN
FIVE_LAYER_SECURITY = UNPROVEN
FIVE_LAYER_EXPERIENCE = UNPROVEN

OPEN_P0 = 1 (ISSUE_DETAIL_LOAD_ERROR)
OPEN_P1 = TBD
OPEN_POLISH = preserved PARTIAL set

SAFE_TO_BEGIN_CARMEN_PRODUCT_ACCEPTANCE = NO
SAFE_TO_INVITE_ISA_ALVARO = NO
USER_ACCEPTED = NO
```

## Next required before Carmen acceptance

1. Fix **issue detail load** on RC4+ (or confirm RC5) so Resolver incidencia is hostable.  
2. Finish Review / Ignore persist proof + Escalar a Gerencia.  
3. Complete fresh UI commercial journey + Quote/Nota PDF byte proof.  
4. Complete security / View As / Story / mobile / role matrix.  
5. Re-run remaining BV without claiming PASS for UNPROVEN rows.
