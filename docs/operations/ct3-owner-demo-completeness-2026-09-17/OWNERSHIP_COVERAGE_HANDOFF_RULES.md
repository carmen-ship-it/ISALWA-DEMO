# Ownership, coverage, handoff & workflow triggers

**Date:** 2026-09-17  
**INVENTED_WORKFLOW_RULES:** **0**  
**OTHER_ADVISOR_AUTOMATIC_TAKEOVER:** **NO**  
**PRODUCTION_AUTOMATIC_TRIGGER_FROM_PEDIDO:** **NO**  
**WAREHOUSE_AUTOMATIC_TRIGGER_FROM_PEDIDO:** **NO**  
**PURCHASING_AUTOMATIC_TRIGGER_FROM_PEDIDO:** **NO**  
**OVERDUE_AUTOMATIC_ESCALATION_WITHOUT_POLICY:** **NO**  
**UNOWNED_CLIENT_RANDOM_ASSIGNMENT:** **NO**

## Locked engineering facts (do not re-ask)

| Question | Answer |
|---|---|
| Ownership history persist? | **YES** |
| Temporary helper becomes owner? | **NO** |
| Approval creates Pedido? | **NO** |
| Conversion explicit? | **YES** |
| Explicit operational review creates Work? | **YES** (when requested) |
| Fabricate department action? | **NO** |
| History/audit on meaningful mutations? | **YES** |
| Random owner when unowned? | **NO** |

## One commercial owner

Canonical owner is singular (`ownerMemberId` / commercial account primary).

Collaborators may view / help / receive **explicit** Work or **active** `commercial.customer.coverage` grants.

Coverage grant type: `commercial.customer.coverage`  
- `primary` = owner  
- `acting` = temporary support (does **not** rewrite canonical owner)  
Convert may use active coverage only when `canConvertQuoteToOrder` + `coverageAuditForConvert` allow it — that is **explicit grant**, not absence auto-takeover.

Product gap: full temporary-coverage / reassignment UI still listed under `PRODUCTIVITY_NOT_IMPLEMENTED` (`coverage-reassignment`, `team-coverage-picker`). Termination impact already distinguishes primary vs acting coverage labels.

## Temporary coverage vs permanent reassignment

| | Temporary coverage | Permanent reassignment |
|---|---|---|
| Owner field | unchanged | changes via explicit action |
| History | records delegation/grant | preserves previous owner |
| Convert | only if grant + capability say so | new owner + capability |

Reassignment authority by Cargo alone: **NO**. If no capability configured → **BUSINESS_DECISION_REQUIRED** (request reassignment / view only).

## Operational triggers

Pedido creation does **not** auto-create Production / Warehouse / Purchasing Work.

Safe CTAs (explicit only): Solicitar revisión a Producción / Almacén / Compras.

Delivery facts remain separate: Nota ≠ Salida ≠ Entrega.

Follow-up Work only when human schedules a due date — no invented 24h/3d/7d SLA.

Overdue: show “Vencido desde …” only; no automatic manager escalation without policy.

## Who has the ball (UI helper)

`apps/os-web/lib/work/who-has-the-ball.ts` surfaces:

- Responsable comercial (or pendiente de asignar)
- Apoyo temporal (only if evidenced)
- Esperando aprobación de [person · Cargo]
- Siguiente paso / Esperar decisión

## BUSINESS_DECISION_REQUIRED (company policy only)

1. Who may permanently reassign commercial owner (exact capability matrix).
2. Whether acting coverage always includes convert, or convert stays owner-only in some cases beyond current grant semantics.
3. Default assignment when new client has no owner.
4. When Production / Warehouse / Purchasing are **obligatorily** involved.
5. Overdue escalation ladder (when / to whom).
6. Discount % / amount auto-threshold for commercial exception approval.
7. Which Gerente General receives which management approval when both eligible.
