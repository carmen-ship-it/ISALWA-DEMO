# Admin Self-Service vs Engineering Boundary

**Status:** Increment 5.1  
**Related:** ADR-0011, `API_SERVICE_CONTRACT.md`

---

## Handoff principle

After handoff, **ISALWA authorized administrators** perform normal organizational and master-data administration **without Carmen or engineering**.

Engineering remains required for software architecture, new capabilities, schema evolution, infrastructure, security-model changes, and new integration types.

---

## Classification

| Class | Meaning |
|-------|---------|
| **A** | Normal admin self-service (authorized, audited, event-backed) |
| **B** | Governed approval workflow |
| **C** | Engineering / architecture change |
| **D** | External system / integration owner |

**Admin self-service ≠ security bypass.** Every command: tenant-scoped, authorized, validated, audited.

---

## Administrability matrix

| Action | Class | Notes |
|--------|-------|-------|
| Add employee | A | Person + Member |
| Invite employee | A | Auth invite |
| Deactivate employee | A | Revoke access |
| Reactivate / rehire | A | Same Person path |
| Change department | A | Effective-dated |
| Change manager | A | Effective-dated |
| Change role | A/B | B if grants finance/credit approval |
| Delegate authority | A/B | B if delegates approval types |
| Reassign work | A | Manager/admin |
| Add customer | A | Party + customer role |
| Add supplier | A | Party + supplier role |
| Add vendor | A | Usually supplier role |
| Add distributor | A | Party role + segment |
| Add partner | A | Party role |
| Add contact | A | Contact edge |
| Correct master data | A | Audit logged |
| Change legal name | B | Fiscal/commercial impact |
| Change NIT | B | ADR-0004 |
| Merge parties | B | Financial risk |
| Change account owner | A/B | Policy-dependent |
| Change payment terms | B | Often external authority |
| Change credit limit | B | Finance projection / external |
| Change approval authority | B | Security-sensitive |
| Activate capability | B | Planificación + engineering connect |
| Connect accounting system | C/D | Integration |
| Connect WhatsApp | C/D | WABA + credentials |
| Change fiscal integration | C/D | SIN adapter |
| Create new department | A/B | A if within org template; B if new capability |
| Create new role (permission template) | B/C | C if new capabilities in system |
| New operational relationship type | C | Schema/capability extension |

---

## Administrative scopes (proposed)

| Scope | Examples |
|-------|----------|
| `people.admin` | Members, invite, dept, delegation |
| `master_data.admin` | Party create/update (non-fiscal) |
| `fiscal.admin` | NIT, merge approval |
| `org.admin` | Departments, capability activation *request* |
| `integration.admin` | View health; connect often C/D |

Final role names: **CLIENT VALIDATION REQUIRED**.

---

## Carmen / engineering scenarios

- New OS module or capability  
- Database migration  
- New Party role type in schema  
- New integration adapter type  
- Security model change  
- Break-glass support (audited, time-boxed)  

---

## Planificación

Derived in `admin-governance.ts` — all `propuesta` until client approves policies.
