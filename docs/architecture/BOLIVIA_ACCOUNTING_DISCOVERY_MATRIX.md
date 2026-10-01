# Bolivia Accounting / Finance — Discovery Matrix

**Status:** Discovery aid — **no vendor selected**, no compatibility claims  
**Purpose:** Ensure OS architecture can connect to whatever legitimate system ISALWA uses

---

## Legend

| Label | Meaning |
|-------|---------|
| KNOWN | Documented in repo with source |
| INFERRED | Reasonable from context — validate |
| CANDIDATE | Category or product name for investigation only |
| REQUIRES ISALWA VALIDATION | Must ask client/accountant |

---

## Category matrix

| Category | Description | ISALWA status |
|----------|-------------|---------------|
| **A** Spreadsheet / manual | Excel + accountant | REQUIRES ISALWA VALIDATION (often likely for SMB) |
| **B** Local Bolivian accounting software | Local contabilidad platforms | CANDIDATE — product name unknown |
| **C** International cloud accounting | QuickBooks, Zoho Books, etc. | CANDIDATE — Bolivia fiscal fit unknown |
| **D** ERP with Bolivia localization | SAP B1, Odoo+local, etc. | CANDIDATE — scale unknown |
| **E** SIN / e-invoicing intermediary | Fiscal gateway providers | INFERRED need medium-term; REQUIRES ISALWA VALIDATION |
| **F** Accountant-operated hosted | External accountant runs software | CANDIDATE |

**KNOWN:** Architect `quickbooks` connector = **scaffolded**, not live, not ISALWA-validated (`lib/connectors/catalog.ts`).

---

## Evaluation dimensions (per category — fill during discovery)

| Dimension | Why it matters |
|-----------|----------------|
| NIT / razón social handling | Account fiscal identity |
| SIN / electronic invoicing | Invoice issuance path |
| Accounts receivable | Collections projection |
| Accounts payable | Future purchasing/finance |
| API availability | Real-time projection |
| Webhooks | Event-driven sync |
| Excel/CSV export | Fallback ingest |
| Multi-user access | Cobranzas vs contabilidad roles |
| Audit trail | Align with OS audit |
| Inventory integration | Warehouse bridge later |
| Data export / portability | Tenant exit |
| Implementation complexity | Dual-run, cutover |
| Cost | Planificación bands |
| Offline / manual fallback | Degraded mode |

Use **REQUIRES ISALWA VALIDATION** for every cell until interview/upload evidence exists.

---

## Candidate products (investigation only — NOT compatibility claims)

| Name | Category | Notes |
|------|----------|-------|
| QuickBooks | C | Scaffold in Architect; Bolivia fiscal unknown |
| Zoho Books | C | CANDIDATE |
| Odoo | D | CANDIDATE |
| SAP Business One | D | CANDIDATE |
| Local Bolivian platforms | B | REQUIRES ISALWA VALIDATION — do not assume vendor |
| Excel + external accountant | A | REQUIRES ISALWA VALIDATION |

---

## Discovery questions (see Planificación derive `finance-q-*`)

1. What system is used today?  
2. Who operates it?  
3. Who issues invoices?  
4. Is SIN/e-invoicing active?  
5. How are payments recorded?  
6. How is AR tracked?  
7. Who approves credit?  
8. What happens when accounting system is unavailable?  

---

## Architecture requirements regardless of vendor

- Adapter interface in OS (not vendor SDK in domain layer)  
- Idempotent ingest + staging quarantine  
- Projection model with conflict state  
- No second ledger in OS  
- Finance capability LOCKED until approved + connected  
