# Client data intake — mapping plan

**Status:** PLANNED design — **no importer implemented, no rows loaded**  
**Date:** 2026-09-02 (reconciled **2026-09-13** with commercial paper evidence)  
**Source:** `DATOS CLIENTES (1).xls` (outside repo; confidential)  
**Rule:** Structure/categories only. No real names, emails, phones, or GPS URLs.

Related:

- `docs/architecture/ISA_ALVARO_DEMO_AND_REAL_DATA_READINESS.md`
- `docs/architecture/ISALWA_REAL_COMMERCIAL_DOCUMENT_FIT.md`
- `docs/uat/ISA_ALVARO_BUSINESS_QUESTIONS.md`

---

## Source inventory

| Section | Logical type | Approx. rows | Columns |
|---------|--------------|--------------|---------|
| A | ISALWA **employee** roster | 5 | Nombre, Apellido, Correo, Cargo |
| B | **Customer** contact + commercial name + GPS | 7 | Nombre, Apellido, Nombre comercial, Celular, Teléfono, Ubicación GPS |

Identity rule: **do not** treat section B people as OrganizationMembers. **do not** create AuthIdentity from any spreadsheet email.

---

## Mapping matrix

| SOURCE SECTION | SOURCE FIELD | CANONICAL ENTITY | CANONICAL FIELD | TRANSFORM | VALIDATION | DUPLICATE RULE | IMPORTABLE TODAY? | REQUIRES DECISION? | NOTES |
|----------------|--------------|------------------|-----------------|-----------|------------|----------------|-------------------|--------------------|-------|
| A Staff | Nombre + Apellido | Person | givenName, familyName | Trim; title-case optional | Non-empty | Match existing Person by normalized name **+** email if present | **No** (no intake command) | Role mapping | Employees ≠ customers |
| A Staff | Correo | AuthIdentity (future invite) / **not** auto-created | email | Lowercase trim | Email format | Unique per provider identity | **No** | Invite workflow | Spreadsheet must **not** create AuthIdentity rows |
| A Staff | Cargo | RoleAssignment | roleKey (indirect) | Map label → OS roleKey | Must map to known role | N/A | **No** | **YES** — map `ASESOR DE VENTA` / `JEFE COMERCIAL` / `GERENTE GENERAL` → OS keys | Labels are job titles, not scopes |
| A Staff | (implied) | OrganizationMember | employment/access | Invite → activate path | Lifecycle | One active membership period | **No** | — | Use InviteMember when unblocked |
| B Customer | Nombre comercial | Party | displayName (partyKind=organization) | Trim; uppercase compare key | Non-empty | Exact / fuzzy commercial name | **No** | — | Primary customer business label |
| B Customer | Nombre + Apellido | Contact | givenName, familyName | Trim | Prefer non-empty | Same party + same phone/name | **No** | — | Contact of org party; not employee |
| B Customer | Celular | Contact | phone / whatsapp | Normalize BO (`+591…`); Excel number → string | Digits length | Phone among possible match keys | **No** | Normalization rules | Excel number storage loses formatting |
| B Customer | Teléfono | Contact | phone | Same | Optional | Same | **No** | — | Empty in current file |
| B Customer | Ubicación GPS | **NO CANONICAL HOME YET** | — | Parse Maps URL → lat/lng **later**; store URL as provenance only if model allows | Must not call geocoders in intake without approval | Location proximity scoring later | **No** | **YES** — Location model | **REAL_DATA_MODEL_GAP** |
| B Customer | (implied role) | PartyRoleAssignment | roleKey=`customer` | Assign on create | Effective-dated | — | **No** | — | Fits PartyGraph |
| B Customer | (optional) | CommercialAccount | partyId, ownerMemberId? | 1:1 with Party today | — | — | **No** | Salesperson assignment | No salesperson column in sheet |
| — | NIT / razón social | FiscalIdentity | nit, razonSocial | — | — | Strong match key | N/A | — | **Absent from workbook** |
| — | Opportunity / Quote / Order | — | — | — | — | — | N/A | — | Not in workbook |
| — | WorkItem | — | — | — | — | — | N/A | — | Not in workbook |
| — | FinanceProjection | — | — | — | — | — | N/A | — | Not in workbook / Finance LOCKED |

---

## Categories that map cleanly (when importer exists)

| Category | Destination |
|----------|-------------|
| Commercial / trade name | `Party.displayName` (+ `customer` role) |
| Customer person name | `Contact` on that party |
| Mobile / phone | `Contact.phone` / `whatsapp` (after normalize) |
| Staff person name | `Person` (+ future membership via invite) |
| Staff job title | Decision table → `RoleAssignment.roleKey` |

---

## Categories requiring normalization

| Category | Issue |
|----------|--------|
| Celular as Excel number | Leading-zero / float risk; must coerce to digit string |
| Multi-phone cell | Split on `/` or `,`; primary vs secondary |
| Google Maps URL | Hosts include `maps.google.com` and `maps.app.goo.gl`; short links lack inline coords |
| Cargo labels | Spanish HR titles ≠ OS scope keys |
| Name casing / accents | Normalize for duplicate scoring only |

---

## Duplicate strategy (design only — do not auto-merge)

Match outcomes: `CREATE` | `MATCH` | `POSSIBLE_DUPLICATE` | `REQUIRES_REVIEW`

| Key | Weight / use |
|-----|----------------|
| Normalized commercial name | Primary for Party |
| Normalized phone | Strong for Contact / possible Party link |
| Email | Strong for Person/staff; **absent** on customers in this file |
| NIT | Strongest — **not present** |
| Normalized location | Later, after Location model |
| Combination score | Name + phone; never silent merge |

Reuse existing Party duplicate-candidate / merge **after** intake for review — not as the bulk loader.

---

## REAL_DATA_MODEL_GAPS

1. **Location / Address / GPS** — OS schema has no Address/Location/lat-lng/PostGIS entity. Legacy Account locations are **not** the OS destination. Maps URLs cannot become canonical coordinates without a governed model (+ optional offline parse; **no geocoding API in this stage**). **Reinforced 2026-09-13:** commercial paper also expects an address block on documents — same gap.
2. **ContactMethod** — channels are flat columns on `Contact`; acceptable for this sheet.
3. **Multi-store under one owner** — not indicated by this file (7 unique commercial names). Revisit if a larger extract shows shared owners. **Business question open** (Isa/Álvaro Q6).
4. **Bill-to / “Factura a” vs trade customer** — not in XLS; appears on paper. Party + `FiscalIdentity` can hold NIT/razón social for **one** party; distinct bill-to party on a Quote is **not** modeled. Do not invent NIT from the sheet (absent).
5. **Delivery Note / delivered-by / received-by** — not in XLS; paper evidence only. **Not an intake mapping** until document lifecycle is decided. Do not import into Quote.

### Commercial paper concepts that are **not** XLS intake columns

| Concept | Intake? | Notes |
|---------|---------|-------|
| Quote lines / products | No | Operational documents, not the client roster sheet |
| Document numbers | No | Runtime commercial numbering policy |
| Payment fields on paper | No | Not Finance; not roster |
| Signatures | No | Delivery acknowledgment — future |

---

## Import gates (2026-09-13 — still closed)

Do **not** import until all of:

1. Hosted staging works  
2. Auth works (`isalwa-os-auth-staging`, no external `OS_AUTH_MODE=dev`)  
3. Tenant boundary works  
4. Managed DB exists  
5. Backup exists + restore proof **or** explicit bounded staging exception approved  
6. Importer has dry-run / validation / receipt  
7. Location/GPS treatment is explicit (model **or** defer GPS and import parties/contacts without it)

---

## Import batch contract (future)

```
importBatchId
rowsReceived / rowsValid / rowsRejected
created / matched / possibleDuplicates / manualReview / errors
```

Commands (names illustrative): dry-run, validate, import, reverse-batch.  
Every mutation: BusinessEvent + AuditLog + Outbox.  
**AuthIdentity / provider invite:** out of band — never from this XLS alone.

---

## First real-data gate (before any load)

1. Location/GPS decision (model slice **or** explicit deferral: import parties/contacts **without** GPS).  
2. Cargo → roleKey decision table (for staff section, if in scope).  
3. Implemented dry-run importer with receipts + duplicate review.  
4. ISALWA written approval.  
5. Staging (or approved non-prod) isolation — **never** overwrite Step17 by silent replace.  
6. No Auth accounts created from the sheet.
