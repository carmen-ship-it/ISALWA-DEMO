# ISALWA — Real Commercial Document Fit

**Status:** Discovery + fit analysis — **no Delivery Note domain, no numbering policy, no Finance**  
**Date:** 2026-09-13  
**Evidence:** (1) prior XLS structure analysis; (2) real ISALWA commercial paper photo (Isa) — **concepts only**, no customer identifiers reproduced here.  
**Related:** `ISA_ALVARO_DEMO_AND_REAL_DATA_READINESS.md`, `CLIENT_DATA_INTAKE_MAPPING_PLAN.md`, `docs/uat/ISA_ALVARO_BUSINESS_QUESTIONS.md`

---

## Critical question — Cotización vs Nota de Entrega

**Do not assume QUOTE = DELIVERY NOTE.**

| Option | Meaning | Verdict |
|--------|---------|---------|
| A | Same layout, different lifecycle / document type | **Most likely from evidence shape** — paper looks like a shared commercial form; OS already separates Quote vs Order lifecycle |
| B | Same commercial object with status/type | Possible; **not evidenced** in OS or Isa wording |
| C | Truly the same operational document | **Not assumed** — Isa said they look *practically* the same, not that they are the same record |
| D | Unclear — needs Isa/Álvaro decision | **REQUIRED** before modeling Nota de Entrega |

**Engineering stance:** treat as **D until answered**, implement only Quote realism that maps to existing Quote/QuoteLine. Do **not** implement Nota de Entrega. Do **not** bypass G-02 Order by inventing a delivery shortcut.

Likely governed flow (hypothesis only — not policy):

`Cotización → (aceptación) → Pedido (Order) → ¿Nota de Entrega?`

G-02 CreateOrder remains **DECISION PENDING**. Delivery Note remains **NOT MODELED**.

---

## Real-world fit matrix

| # | BUSINESS CONCEPT | CURRENT OS HOME | FIT | GAP | BUSINESS DECISION NEEDED? | IMPLEMENTABLE WITHOUT NEW POLICY? |
|---|------------------|-----------------|-----|-----|---------------------------|-----------------------------------|
| 1 | Document number | `Quote.quoteNumber` (human string; unique per org). Generated as `Q-######` from org quote count (`commercial-command-service.ts`). Internal id is separate ULID. | **PARTIAL** | Customer-facing format/sequence rules (yearly? branch? type?) not governed. Fixtures previously used `COT-YYYY-###` which is **not** runtime format. | **YES** — numbering rules | Display existing `quoteNumber` yes. Changing allocation rules = policy. |
| 2 | Date | `createdAt`, `submittedAt` on Quote | **PASS** | Paper “document date” vs created vs submitted not labeled for print | Optional UX label | Yes — map to existing timestamps |
| 3 | Customer name | `Party.displayName` (+ opportunity/quote `partyId`) | **PASS** | — | No | Yes |
| 4 | NIT/CI | `FiscalIdentity.nit` + `razonSocial` (effective-dated on Party). Commands: create optional + `UpdateFiscalIdentity` | **PARTIAL** | XLS has **no** NIT. Party HTTP detail / Cliente 360 UI **do not expose** fiscal fields today | Collection workflow when to capture NIT | Domain yes; UI exposure is bounded enhancement |
| 5 | Address | **No canonical Location/Address** | **GAP** | REAL_DATA_MODEL_GAP (also XLS GPS) | **YES** — Location model / deferral | Not without Location decision |
| 6 | Phone | `Contact.phone` / `whatsapp` | **PASS** | Multi-phone normalization on intake | No for demo | Yes |
| 7 | Quantity | `QuoteLine.quantity` (int ≥ 1) | **PASS** | — | No | Yes |
| 8 | Description / detail | `QuoteLine.description` (required free text) | **PASS** | Catalog policy separate | Catalog vs free text | Free text already works |
| 9 | Unit price | `QuoteLine.unitPriceCentavos` (BOB centavos) | **PASS** | — | No | Yes |
| 10 | Line subtotal | `QuoteLine.lineTotalCentavos` | **PASS** | — | No | Yes |
| 11 | Total | `Quote.subtotalCentavos`, `headerDiscountCentavos`, `totalCentavos` | **PASS** | — | Discount approval (G-08 adjacent) | Totals yes; discount **policy** separate |
| 12 | Billing recipient / “Factura a” | No dedicated ship-to / bill-to on Quote. Closest: Party + FiscalIdentity.razonSocial | **GAP / PARTIAL** | Distinct bill-to party vs customer party not modeled on commercial docs | **YES** — what “Factura a” means | Not as first-class field without decision |
| 13 | Billing identity / CI | Same FiscalIdentity (NIT field used for tax id; CI not a separate type) | **PARTIAL** | CI vs NIT semantics; person vs org | Whether CI uses same FiscalIdentity | Domain can store string; semantics need decision |
| 14 | Payment / value fields | Quote totals only. No cash/payment capture on commercial doc. Finance **LOCKED** | **GAP** (intentional) | Payment ≠ quote total | Finance later | Do not invent ledger fields |
| 15 | Delivery recipient | Not on Quote/Order | **GAP** | May belong on Delivery Note / Order ship-to | **YES** with DN lifecycle | No |
| 16 | Delivered-by | Not modeled | **GAP** | Role on delivery event | With DN | No |
| 17 | Received-by / signature | Not modeled | **GAP** | Acknowledgment artifact | With DN | No |
| 18 | Quote vs Delivery Note | Quote + Order exist; **no DeliveryNote** entity/commands/UI | **GAP** | Semantic distinction | **YES** (critical Q) | Quote print maybe; DN **no** |

---

## Quote UX vs paper (enterable today)

| Paper need | OS Quote UI | Status |
|------------|-------------|--------|
| Customer | Inherited from Party / opportunity path | **FIT** |
| Lines | Add/edit/remove in draft | **FIT** |
| Quantity | Field | **FIT** |
| Description | Free text | **FIT** |
| Unit price (Bs.) | Field | **FIT** |
| Line subtotal | Shown (computed) | **FIT** |
| Total | Shown | **FIT** |
| Address / NIT / Factura a / signatures | Not on quote form | **GAP** (see matrix) |

**Submitted quote:** lines + totals are shown read-only (2026-09-13 UX fix). Conversion CTA remains honest (“pendiente de política”).

---

## Product catalog behavior (current exact)

| Mode | Evidence |
|------|----------|
| **Primary** | **Free text** — `AddQuoteLine.description` required string |
| **Optional** | `productRef` optional nullable string on line — **not** a governed catalog, no SKU picker in os-web |
| **Hybrid?** | Soft hook only; UI does not require or resolve catalog |

**Demo:** free text is enough. **Production catalog:** separate business decision (see UAT questions).

---

## Document numbering

| Aspect | Current |
|--------|---------|
| Internal id | ULID/UUID on `quoteId` — **not** customer-facing |
| Human-readable | `quoteNumber` string, unique per `organizationId` |
| Allocation | `Q-` + zero-padded count+1 at create time |
| Yearly / branch / type sequences | **Not implemented** |
| Collision under concurrent creates | Count-based; uniqueness relies on DB unique constraint |

**Classification:** human-readable exists → not a raw-UUID gap. Format/sequence policy → **COMMERCIAL DOCUMENT GAP + BUSINESS_DECISION_REQUIRED**.

---

## Tax / billing metadata (not Finance)

| Layer | Status |
|-------|--------|
| Canonical `FiscalIdentity` (nit, razonSocial, effective-dated) | **SUPPORTED** in PartyGraph |
| Spreadsheet NIT | **Absent** — do not invent |
| Party detail HTTP / Cliente 360 display | **NOT EXPOSED** (`fiscalIdentities` not on PartyDetailResponse) |
| Ledger / SIN e-invoicing | **Out of scope** — Finance locked |

Billing identity metadata ≠ accounting truth.

---

## Printable Quote / PDF

| Item | Status |
|------|--------|
| Governed os-web/os-api Quote PDF route | **NOT IMPLEMENTED** |
| Provider port `PdfProvider.renderQuotePdf` | Exists (mock) under `packages/providers` — used by **legacy** `apps/api` commerce, **not** OS commercial path |
| Preferred architecture | Canonical Quote → server render → printable PDF (no third-party PDF SaaS) |
| Quote printable | **READY TO IMPLEMENT** from data fields that already exist (customer name, number, dates, lines, totals). Address/NIT/Factura-a on the PDF need data exposure or explicit “omit until collected”. |
| Delivery Note PDF | **BLOCKED** — semantics not governed |

**Verdict:** `QUOTE PRINTABLE DOCUMENT` → **READY TO IMPLEMENT** (bounded) / **NEEDS DATA GAP** for address & billing block on the form / **NEEDS POLICY** for DN.

---

## Delivery Note

| Status | Detail |
|--------|--------|
| **NOT MODELED** | No entity, events, commands, or UI |
| Blocked by | Cotización vs Nota decision + G-02 Order authority |
| Action | Ask Isa/Álvaro; do not implement |

---

## Additional gaps from paper (beyond XLS)

XLS already flagged Location/GPS. Paper adds operational concepts:

1. Sequential customer-facing document number **policy**
2. Bill-to / “Factura a” distinct from trade customer
3. Delivery / receive acknowledgment roles
4. Payment value fields on the paper form (cash/ops — not OS Finance)
5. Quote vs delivery note document type

None of these reopen Party / CommercialAccount / Workforce / AuthIdentity / RBAC / outbox architecture.

---

## What may be implemented without new policy

- Show/edit Quote lines, qty, description, unit price, totals (already)
- Read-only submitted quote document view (done 2026-09-13)
- Synthetic BOB product-line fixtures
- Quote print/PDF from existing Quote fields (omit gaps or pull FiscalIdentity when UI exposes it)
- Expose FiscalIdentity on Cliente 360 as **display/edit of existing command** (bounded; not Finance)

## What requires decision first

- Nota de Entrega semantics and lifecycle
- Document numbering rules
- Meaning of “Factura a”
- Location/GPS model
- G-02 CreateOrder authority
- G-08 commercial approval / discount governance
- Product catalog mandate
