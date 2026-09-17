# FINAL_V1_STAFF_RESPONSIBILITY

**Source:** `docs/operations/ct3-owner-demo-completeness-2026-09-17/REAL_STAFF_RESPONSIBILITY_RECONCILIATION.md` (DATOS CLIENTES workbook)  
**RC:** `02688431b9290b818c8fb245d68c086379363b3f`  
**INVENTED_STAFF_NAMES:** 0

## Five REAL imported staff (directory)

| NAME | CARGO | PERSON_ID |
|---|---|---|
| YUSELKA JUSTINIANO DURAN | ASESOR DE VENTA | **NOT_PROVEN** (no ULID bound in repo evidence) |
| JOSE LUIS VARGAS ALMANZA | ASESOR DE VENTA | **NOT_PROVEN** |
| EDWIN YAMIL CALERO VALDEZ | JEFE COMERCIAL | **NOT_PROVEN** |
| ISABELA RODA GUTIEREZ | GERENTE GENERAL | **NOT_PROVEN** |
| ALVARO MARTIN SANDOVAL MONTES | GERENTE GENERAL | **NOT_PROVEN** |

Counts: 2×ASESOR · 1×JEFE COMERCIAL · 2×GERENTE GENERAL.

## Layers (do not infer across)

| Layer | Status |
|---|---|
| BUSINESS IDENTITY (name+Cargo in workbook) | **YES** — five rows |
| LOGIN (AuthIdentity) | **NOT_PROVEN** for these five |
| MEMBERSHIP (org Member) | **NOT_PROVEN** for these five |
| CAPABILITY (scopes) | **NOT_PROVEN** from Cargo; scopes are Member-granted |
| APPROVAL AUTHORITY | **NOT_PROVEN** until governed assignee + `commercial.price.approve` / `approval.act` |

**Carmen staging login** (`carmen.staging@isalwa.demo`) is a **separate** evaluation actor with SYNTH membership/scopes — not one of the five REAL staff rows.

**Rule:** Cargo ≠ authority. Two Gerentes → never random/first pick.
