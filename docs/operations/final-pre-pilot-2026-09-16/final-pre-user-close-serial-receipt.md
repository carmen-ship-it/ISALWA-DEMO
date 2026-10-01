# FINAL PRE-USER CLOSE — Serial Control Tower receipt

> **SUPERSEDED for current-state claims.** Point-in-time serial-close receipt.  
> **Current truth:** LIVE `e9a7a02` · SAFE **YES** → `docs/handoff/ISALWA_FINAL_PRELAUNCH_SOURCE_FOR_EDITOR.md`

**Date:** 2026-09-16T18:10Z  
**Mode:** SERIAL ONLY · no Wave C · no Isa/Álvaro accounts · no invites  

---

## Runtime (at this write — historical)

| Field | Value |
|-------|-------|
| **FINAL_RUNTIME_SHA** | `1472796a7e31c8660eb928d0655900c98cf29c29` |
| **WEB_SHA** | `1472796a7e31c8660eb928d0655900c98cf29c29` (`dep-dald994doqps73fdmhc0` LIVE) |
| **API_SHA** | `1472796a7e31c8660eb928d0655900c98cf29c29` (`dep-dald8kpm57gc73d8qrtg` LIVE) |
| **WEB_API_SAME** | **YES** |

---

## Capability gates

| Field | Value |
|-------|-------|
| **MAP_LIVE** | **YES** (BROWSER-VERIFIED on `29b6f3f` · map-blank-fix-receipt) |
| **AI_LIVE** | **NO** |
| **PASSWORD_RESET_UX** | **BROWSER-VERIFIED** |
| **PASSWORD_RESET_EMAIL** | **UNPROVEN** |
| **PASSWORD_RESET_FULL_E2E** | **UNPROVEN** |
| **SELF_SERVICE_WITHOUT_CARMEN** | **NO** |
| **ENTER_ONCE_LOOP_CLOSURE** | **CONDITIONAL** |
| **HISTORICAL_TRUTH_PRESERVED** | **PARTIAL** (spine strong; contact/approval provenance weak) |
| **DUPLICATE_ENTRY_GAPS** | Almacén empty pedidos · Entregas unwired · Compras process-local ≠ SoR |
| **ACTIVE_DATA_INITIAL_ENTRY_POLICY** | Enter each canonical fact once in its SoR command; other surfaces re-link by id — never retype the same SoR attributes |

---

## Safety

| Field | Value |
|-------|-------|
| **CORE PILOT SAFE** | **CONDITIONAL YES** for Carmen staging walkthrough of commercial + work/issue/map (not ops Almacén/Entregas/Compras loop; not AI; not reset-without-Carmen) |
| **CARMEN_USER_ACCEPT_REQUIRED** | **YES** |
| **ISA_ACCOUNT_CREATED** | **NO** |
| **ALVARO_ACCOUNT_CREATED** | **NO** |
| **HANDOFF_MASTER_CLEAN** | **YES** (`docs/handoff/ISALWA_HANDOFF_MASTER_SOURCE_FOR_EDITOR.md`) |
| **SAFE_FOR_CARMEN_FINAL_WALKTHROUGH** | **YES** (conditional — know AI/reset-E2E/ops gaps) |
| **SAFE_FOR_ISA_ALVARO** | **NO** (at this write — **SUPERSEDED**; final source = **YES**) |

---

## Smallest remaining blockers for SAFE_FOR_ISA_ALVARO

1. Carmen **USER-ACCEPT**  
2. Isa + Álvaro **identity / email / day-one function / scopes** (business decision)  
3. Password-reset **EMAIL E2E** (or consciously accept admin-assisted recovery for pilot and keep copy honest)  
4. Decide whether to launch **without AI** (recommended until credentialed BV PASS)  

AI LIVE is **not** required to start core pilot if owners accept AI deferred.

---

## Lane receipts

| Lane | Result | Path |
|------|--------|------|
| 5 Password E2E | UNPROVEN | `password-reset-e2e-lane5-receipt.md` |
| 6 AI re-BV | AI_LIVE NO | `ai-assist-lane6-receipt.md` |
| 7 Enter-once | CONDITIONAL | `ISALWA_ENTER_ONCE_LOOP_CLOSURE_MATRIX.md` |
| 8 Master clean | YES | `docs/handoff/ISALWA_HANDOFF_MASTER_SOURCE_FOR_EDITOR.md` |

**STOP.**
