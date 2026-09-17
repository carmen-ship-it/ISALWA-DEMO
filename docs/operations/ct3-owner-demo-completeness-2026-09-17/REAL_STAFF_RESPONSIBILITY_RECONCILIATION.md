# REAL staff responsibility — DATOS CLIENTES reconciliation

**Date:** 2026-09-17  
**Source:** `/Users/carmen/Downloads/DATOS CLIENTES (1).xls` · sheet `Hoja1` rows 1–6 (Staff block)  
**Also present:** `DATOS CLIENTES.xls`, `(2)`, `(3)`, and `DATOS_CLIENTES_ISA_2026-09-14.xls`  
**INVENTED_STAFF_NAMES:** **0**  
**REAL_STAFF_AUTO_GRANTED_AUTH:** **NO**

## Counts

| Cargo | Count |
|---|---|
| ASESOR DE VENTA | 2 |
| JEFE COMERCIAL | 1 |
| GERENTE GENERAL | 2 |
| **TOTAL** | **5** |

## Actual names (workbook evidence)

| PERSON_NAME | CARGO | HAS_LOGIN | HAS_MEMBER | BUSINESS_RESPONSIBILITY | APPROVAL_AUTHORITY |
|---|---|---|---|---|---|
| YUSELKA JUSTINIANO DURAN | ASESOR DE VENTA | NOT_PROVEN | NOT_PROVEN | Commercial advisor (directory) | NOT_PROVEN — Cargo alone grants none |
| JOSE LUIS VARGAS ALMANZA | ASESOR DE VENTA | NOT_PROVEN | NOT_PROVEN | Commercial advisor (directory) | NOT_PROVEN — Cargo alone grants none |
| EDWIN YAMIL CALERO VALDEZ | JEFE COMERCIAL | NOT_PROVEN | NOT_PROVEN | Commercial leadership (directory) | NOT_PROVEN until governed `commercial.price.approve` / exception assignment |
| ISABELA RODA GUTIEREZ | GERENTE GENERAL | NOT_PROVEN | NOT_PROVEN | Management (directory) | NOT_PROVEN — do not auto-pick between two Gerentes |
| ALVARO MARTIN SANDOVAL MONTES | GERENTE GENERAL | NOT_PROVEN | NOT_PROVEN | Management (directory) | NOT_PROVEN — do not auto-pick between two Gerentes |

Emails are present in the workbook (staff identity context only). This pass does **not** create AuthIdentity, Member, login, or scopes from those rows.

## Routing rules locked by this addendum

1. Company isolation before approver resolution (REAL≠SYNTH).
2. Own-quote conversion only when actor is governed commercial owner + conversion capability.
3. Exactly one JEFE COMERCIAL → may resolve to that person **only if** approval capability is configured for them — Cargo alone is insufficient.
4. Two GERENTE GENERAL → never pick first/alphabetical/random; show Gerencia queue / pending assign if no governed assignee.
5. Historical actors preserved; no hardcoded names in routing code.

## BUSINESS_DECISION_REQUIRED / BUSINESS_CONFIGURATION_REQUIRED

- Discount % / amount auto-threshold for commercial exception.
- Which Gerente receives which management approval types when both are eligible.
- Runtime HAS_LOGIN / HAS_MEMBER for the five staff (needs staging Person/Member read; membership apply still SECURITY_GATE for Carmen SYNTH).
