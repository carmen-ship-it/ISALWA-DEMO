# SHIP + OWNER PROOF RECEIPT — FINAL

**At:** 2026-09-17  
**FINAL_OWNER_CORRECTION_SHA:** `8e24b7f73971cb538377371d4670897930bcd250`

## Membership scope correction

```
CARMEN_SYNTH_MEMBERSHIP_APPLIED = YES
CARMEN_SYNTH_SCOPE_COUNT_BEFORE = 23
CARMEN_SYNTH_SCOPE_COUNT_AFTER = 20
PEOPLE_ADMIN_PRESENT = NO
MASTER_DATA_ADMIN_PRESENT = NO
QA_ACCESS_PRESENT = NO
SYSTEM_ADMIN_PRESENT = NO
OWNER_EVAL_BUSINESS_CAPABILITIES_SUFFICIENT = PASS
OWNER_EVAL_ADMIN_BYPASS_REQUIRED = NO
ROLE_PREVIEW_CHANGES_AUTHORITY = NO
REAL_MEMBERSHIP_CHANGED = NO
REAL_STAFF_MEMBERSHIPS_CHANGED = NO
REAL_SEVEN_MUTATED = NO
CARMEN_SYNTH_MEMBERSHIP_MINIMUM_SCOPE = PASS
```

Detail: `CARMEN_SYNTH_MEMBERSHIP_SCOPE_CORRECTION.md`

### BEFORE_SCOPES (23) → AFTER_SCOPES (20)

**REMOVED:** `people.admin`, `master_data.admin`, `qa.access` (endedAt preserved)  
**ADDED:** *(none)*  
**RETAINED:** 20 business scopes (see correction doc rationale table)  
**Approval:** via `commercial.price.approve` only — not admin bypass

## Deploy + reseed

| Field | Value |
|---|---|
| WEB | `dep-daltmtu5vjqs738kr0vg` **live** `8e24b7f…` |
| API | `dep-daltofv40ujc73f83nig` **live** `8e24b7f…` |
| SAME_SHA_PROOF | **YES** |
| Prior 4900634 deploy | completed then superseded |
| DURABLE_CONVERSATIONS_RESEEDED | **YES** |
| DURABLE_CONVERSATION_ROWS | **5** |

## Carmen hosted owner BV

```
CARMEN_OWNER_BV = PASS (21/21 on tip 8e24b7f)
ADMIN_BYPASS_USED = NO (all recorded actions)
USER_ACCEPTED = NO
SAFE_TO_BEGIN_CARMEN_PRODUCT_ACCEPTANCE = YES (engineering BV PASS; product acceptance still Carmen)
SAFE_TO_INVITE_ISA_ALVARO = NO
```

Negatives: `/administracion` denied; no system Controles; no Ver-como QA; Demo=SYNTH clientes nameHits=6; durable conversations markers=8; Cliente360 DEMO ANDINA open.

Mutations: read-only BV only; `ADMIN_BYPASS_USED=NO`.

Receipt: `CARMEN_OWNER_BV_RECEIPT.md` · raw `/tmp/ct3-bv/carmen-owner-bv-results.json`

## Follow-up fixes shipped with membership correction

1. Multi-membership login probe (REAL→SYNTH org selector) — `994a138`
2. Demo cookie authoritative over login company default — `8e24b7f`
