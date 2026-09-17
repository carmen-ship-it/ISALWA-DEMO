# Approval / responsibility — BUSINESS_DECISION_REQUIRED

**Date:** 2026-09-17  
**Pass:** OWNER PATH + INTELLIGENT COMPANY-OS ORCHESTRATION (approval addendum)  
**INVENTED_APPROVAL_RULES:** **0**

## Known approval rules implemented (evidence-backed)

1. **RequestApproval** requires an explicit `approverMemberId` who is an **active member of the same organization** (`getMemberInOrg`). Cross-company selection fails closed.
2. **Decide (Approve/Reject)** is limited to the assigned approver or an active `approval.act` delegate — not Cargo/title.
3. **Commercial subject request** is limited to the subject owner (`canRequestCommercialSubjectApproval`) — not arbitrary titles.
4. **Convert Quote → Pedido** uses `commercial.quote.convert.own` (and related authority) — advisor may convert **own** eligible quote; title alone does not grant convert of others.
5. **`commercial.price.approve` / `commercial.exception.authorize`** exist as scopes — Cargo/title never grant them (`scopesGrantedByCargoOrTitle` → `[]`).
6. Approval attention derives to the **assigned approver** while status is `pending`; clears when decided.
7. Quote UI shows **Pendiente de aprobación de [persona · departamento evidenciado]** + **Ver solicitud**; approval never auto-creates Pedido.

## BUSINESS_DECISION_REQUIRED (do not invent)

| Question | Current safe behavior | Affected transitions |
|---|---|---|
| Exact discount % / amount threshold that **auto-requires** commercial exception approval | Only **explicit** human-initiated RequestApproval; no automatic threshold trigger | Quote line pricing → approval |
| Full commercial approval matrix (which capability maps to which role/queue when multiple eligible) | Requester **explicitly selects** same-company active member; no “pick first row” | Approval request |
| Auto-assign when multiple eligible approvers exist | Leave person selection explicit; show missing-config copy if none assigned | Approver resolution |
| Exact Cargo→capability mapping for display beyond evidenced department | Show person name + evidenced `departmentName` only; never grant scopes from Cargo | Responsibility display |
| Nota / Production SLA ownership for approval-like reviews | Explicit review request only where modeled; unknown policy parked | Ops review |

## BUSINESS_CONFIGURATION_REQUIRED

When no eligible same-company approver can be chosen for a needed approval type:

> Falta asignar quién aprueba este tipo de solicitud

Do not fabricate an assignee.

## REAL staff Cargo (DATOS CLIENTES) — display context only

See `REAL_STAFF_RESPONSIBILITY_RECONCILIATION.md`.

- 2 × ASESOR DE VENTA — YUSELKA JUSTINIANO DURAN · JOSE LUIS VARGAS ALMANZA
- 1 × JEFE COMERCIAL — EDWIN YAMIL CALERO VALDEZ
- 2 × GERENTE GENERAL — ISABELA RODA GUTIEREZ · ALVARO MARTIN SANDOVAL MONTES

`REAL_STAFF_AUTO_GRANTED_AUTH = NO` · `RANDOM_APPROVER_SELECTION = NO` · `CARGO_ALONE_GRANTS_AUTHORITY = NO`
