# AGENT 5 — EVIDENCE FIT receipt

**When:** 2026-09-16  
**Mode:** READ-ONLY product code · **write path only this file**  
**Audience:** Agents 1–4 labels/fields + Control Tower integrate gate  
**Not:** architecture redesign · product edits · invented PASS · fiscal/numbering policy

---

## Verdict (for CT)

Evidence **constrains** commercial / delivery / day labels. It does **not** authorize fake SKUs, fake revenue, OS-generated fiscal nota numbers, or automatic WhatsApp send.

| Residual | Status |
|---|---|
| Authoritative product catalog as quote pricing source | **ABSENT** for pilot truth — Productos = candidates / preview; **No es lista de precios** |
| Isa/Álvaro UAT answers (Q1–Q9) | **UNANSWERED** in-repo (`docs/uat/ISA_ALVARO_BUSINESS_QUESTIONS.md`) |
| Official / fiscal document numbering | **BUSINESS_DECISION_REQUIRED** — preserve `externalDocumentNumber` only |
| Real WhatsApp process | **Human send outside ISALWA**; in-app = manual conversation note only |

---

## Evidence corpus (searched)

| Source | What it proves |
|---|---|
| `docs/architecture/ISALWA_REAL_COMMERCIAL_DOCUMENT_FIT.md` | Cotización paper↔OS field fit; free-text lines primary; DN ≠ Quote |
| `docs/architecture/ISA_DOCUMENT_RECONCILIATION_WAVE2.md` | Real paper Nota / Caja / Fábrica concepts (Carmen transcription) |
| `docs/architecture/ISA_QUESTION_DOCUMENT_NUMBERING.md` | Printed #s exist; generation forbidden until answered |
| `docs/architecture/ISA_QUESTION_FACTORY_DELIVERY_NOTE.md` | Fábrica note role unmapped |
| `docs/data/CLIENT_DATA_INTAKE_MAPPING_PLAN.md` | `DATOS CLIENTES (1).xls` column structure (no PII in repo) |
| `docs/operations/V1_LAUNCH_SUPPORT_READINESS.md` | Real `xls_datos_clientes` import batch exists on staging; protect; do not reverse |
| `docs/uat/ISA_ALVARO_BUSINESS_QUESTIONS.md` | Open Isa/Álvaro decisions (cotización vs nota, trigger, numbering, Factura a, catalog mode, discounts…) |
| `packages/os-database/prisma/schema.prisma` | `OsQuote` / `OsQuoteLine` / `OsDeliveryNote*` / `OsPriceList` shapes |
| `packages/os-contracts/src/delivery.ts` | Pedido→Nota→Salida→Entrega human-created; provisional internal ref; no tax/invoice claim |
| `packages/os-database/prisma/fragments/price-list.prisma` | Versioned sourced price list ≠ quoted line price; **do not invent rows** |
| Productos / picker UI copy | Catalog candidates; special item; **not** price list |
| CT `control-tower-full-operating-loop-receipt.md` | Forbidden inventions + WhatsApp leave-ISALWA + DN write FOUNDATION_GAP |
| Handoff / Mensajes honesty | WhatsApp send **NOT LIVE** |

**Not in repo:** original XLS binary, Isa photograph originals, answered UAT sheet.

---

## 1) Cotización — fields **evidenced** (safe labels)

Use these for Agent 1 commercial close / convert / PDF honesty. Map amounts as **comercial**, never **ingresos**.

### Header (OS + paper fit)

| Label (ES) | Evidence home | Notes |
|---|---|---|
| Cotización / número | `OsQuote.quoteNumber` | Runtime format `Q-######` (not invent COT-YYYY or fiscal #) |
| Cliente | `Party.displayName` via `partyId` | Inherited; do not retype |
| Fecha | `createdAt` / `submittedAt` | Paper “document date” labeling optional UX only |
| Moneda | `currency` default `BOB` | |
| Subtotal / Descuento cabecera / Total | `subtotalCentavos`, `headerDiscountCentavos`, `totalCentavos` | Safe map label: **Valor cotizado** — **no es ingreso** |
| Estado | `status` (draft / submitted / …) | |
| Notas | `notes` | |
| Oportunidad (link) | `opportunityId` optional | Automatic from route when present |

### Lines (OS + paper fit)

| Label (ES) | Evidence home | Notes |
|---|---|---|
| Descripción / Detalle | `OsQuoteLine.description` **required** | Primary mode = **free text** |
| Cantidad | `quantity` | |
| Unidad | `unitLabel` optional | |
| P/Unit. (Bs.) | `unitPriceCentavos` | Advisor-quoted; **not** PriceList amount |
| Desc. línea | `discountCentavos` | Discount **policy** still BD (UAT Q9) |
| Subtotal línea | `lineTotalCentavos` | |
| Ref. producto (opcional) | `productRef` nullable | Soft hook — **not** governed SKU mandate |

### Explicitly **not** on cotización (do not invent UI as if live)

- NIT/CI block on quote form (FiscalIdentity exists on Party; XLS has **no** NIT — do not invent)
- Address / ship-to / “Factura a” as first-class quote fields (BD + model gaps)
- Payment / a cuenta / saldo on quote (paper ops ≠ Finance; Finance locked for ledger)
- Delivered-by / received-by / signatures (belong to Nota / delivery evidence)
- Demo catalog SKUs as “the” product master for pilot PASS

---

## 2) Nota de Entrega — fields **evidenced**

Paper (Isa via Carmen transcription) + domain contracts. **Do not collapse** with Cotización, Recibo de Caja, Nota de Salida, or Nota de Entrega de Fábrica.

### Distinct document kinds (labels must stay separate)

| Kind | Evidence | Agent 3 rule |
|---|---|---|
| Nota de Entrega (cliente) | `nota_de_entrega` / Document A | Customer delivery note |
| Nota de Salida de Almacén | `nota_de_salida` | Warehouse exit — **does not create** customer nota |
| Nota de Entrega de Fábrica | `nota_de_entrega_de_fabrica` | Exists on paper; **role unmapped** — constant only |
| Recibo Oficial de Caja | operational payment evidence | **Not** delivery note; not ledger |

### Nota fields safe to name when presenting existing truth

| Label | Evidence | Constraint |
|---|---|---|
| Nota de entrega | heading + `documentKind` | Human-created from Pedido — not auto from order |
| Fecha | `bornAt` / `deliveredAt` | |
| Nº externo / impreso | `externalDocumentNumber` | Source-preserved only (e.g. `007189`) — **no OS fiscal sequence** |
| Ref. interna piloto | `internalDocumentRef` (e.g. `NE-PILOT-…`) | Provisional; not official paper # |
| Pedido / Cliente | `orderId` / `partyId` | Copy from order — no invented lines |
| Cantidad / Detalle | `OsDeliveryNoteLine` qty + description | Copied from order lines when present |
| Entregado por | `deliveredBy` | Opaque/evidence — no invented seller schema |
| Recibido por | `receivedBy` | Blank until Entrega recorded |
| Observaciones | `observations` | |

### Paper-visible but **MISSING / do not invent as complete OS fields**

- Cliente / NIT-C.I. / Dirección / Exten. / Telf. **snapshot on note**
- P/Unit., Subtotal, Totals, A cuenta, Saldo on note lines — historical evidence only; **must not update PriceList**
- Placa de Camión / Fecha de pago
- Dedicated transporter ack role
- Official numberingPolicy generation (`numberingPolicy` = unknown / provisional_internal only)

### Lifecycle honesty (Agents 2–3)

`Pedido → Nota de Entrega → Salida → Entrega` = **explicit human steps**. PDF download does not create salida/entrega. Hosted **write** commands = FOUNDATION_GAP per CT — Agent 3 must not fake write UI as PASS.

---

## 3) Price list / catalog — residual

| Layer | Evidence | Constraint for Agents 1–4 |
|---|---|---|
| Quote line price | `unitPriceCentavos` on line | **Authoritative for that quote** |
| `OsPriceList` / `OsPriceEntry` | Schema + sourced provenance fields | Versioned list ≠ advisor quote; **do not insert demo prices** |
| Productos desk | “Candidatos… **No es lista de precios**” | Label honestly |
| Quote product picker | Catalog optional + **Ítem especial / fuera de catálogo** | If catalog empty/unconnected: free text / special item — **no invented SKUs** |
| Producción catalog | Preview catalog select-only | Membership check; empty = honest empty |
| UAT Q8 | Unanswered | Do not claim “fixed catalog only” or “free text only” as company policy |

**RESIDUAL if authoritative product catalog absent:**  
Agents may show picker empty / special-item path / free-text description. They **must not** seed demo SKUs, Capri/Cádiz examples from paper as live catalog, or label Productos as lista de precios.

---

## 4) Customer XLS — evidenced columns only

**Source name:** `DATOS CLIENTES (1).xls` (confidential, outside repo). Staging batch marker: `xls_datos_clientes`.

| Section | Columns evidenced | Maps to |
|---|---|---|
| A Staff | Nombre, Apellido, Correo, Cargo | Person / future invite — **not** customers; Cargo ≠ invent roleKey without table |
| B Customer | Nombre, Apellido, Nombre comercial, Celular, Teléfono, Ubicación GPS | Party.displayName, Contact, phone/whatsapp; GPS = Location decision |

**Absent from XLS (never invent from import narrative):** NIT, razón social, quote/order lines, document numbers, payment fields, delivery note fields.

---

## 5) Isa / Álvaro feedback — status

| Artifact | Status |
|---|---|
| UAT questions Q1–Q9 | Written; **answers not recorded in-repo** |
| Document numbering question | Open — store printed # only |
| Factory note role | Open — do not equate to Listo/Salida/Entrega |
| Owner-review access | Carmen shared eval login — **not** Isa/Álvaro individual accounts |
| Post-review product feedback | Separate `OsProductFeedback` capability — not business Issue |

Until answers land: treat Cotización ≠ Nota as default separation; DN trigger = BD; numbering = preserve external only.

---

## 6) Current process — WhatsApp

**Real process for send:** human sends on WhatsApp **outside** ISALWA.

| In ISALWA | Label |
|---|---|
| Mensajes | Manual conversation / registry note |
| Channel | **No conectado** / send **NOT LIVE** |
| Leave-ISALWA point (CT) | WhatsApp send |

Agents **must not** claim automatic send, Señal delivery, or WhatsApp as ingresos.

---

## Constraints by agent (Labels / fields)

### Agent 1 — Commercial Close

- **Use:** cliente, oportunidad, cotización #, líneas (desc/qty/unit/price/totals), Valor cotizado, convert→pedido inherits lines, follow-up text, **manual** mensaje record.
- **Do not invent:** demo SKUs as catalog truth, Ingresos/Revenue, fiscal quote numbering, auto WhatsApp send, Factura-a/NIT on quote without Party fiscal exposure + evidence.
- **PDF:** existing quote fields only; omit address/NIT/Factura-a if not collected.

### Agent 2 — Post-Sale Spine

- **Use:** pedido context that already exists; producción as **annotation** (“quema ≠ pedido”); almacén/entregas **read** of linked pedido — no retyped opaque IDs.
- **Do not invent:** order↔production auto-link (BD), fake SLA, fake finished-goods allocate as live write, collapsing Fábrica note into Listo.

### Agent 3 — Delivery Documents

- **Use only evidenced labels:** Nota de entrega · Nota de salida · Entrega · `externalDocumentNumber` · provisional internal ref · line qty/description from pedido · entregado/recibido por when present.
- **Do not invent:** official/fiscal numbering algorithm, tax/invoice claims, PriceList updates from note prices, auto-nota from pedido/salida/PDF, factory-note workflow, hosted write PASS without API registration.

### Agent 4 — Operating Day

- **Use:** overdue/attention from real work clocks; commercial counts as oportunidades / cotizaciones / pedidos — **Valor cotizado / valor de pedidos**, never Ingresos.
- **Do not invent:** production SLA, cobranza confirmed, WhatsApp-driven attention as live channel.

---

## Forbidden inventions (reject list — binds Agents 1–4)

1. Fake / demo catalog SKUs presented as authoritative ISALWA product master  
2. Fake revenue / Ingresos / facturación / cobranza confirmada from quote or order totals  
3. Fake accounting / ledger postings  
4. Automatic WhatsApp send  
5. OS-generated fiscal / official nota numbering (or claiming paper # was issued by OS)  
6. Arbitrary delivery-note trigger or approval threshold as company policy  
7. Arbitrary production SLA  
8. Equating Cotización = Nota de Entrega = Nota de Fábrica = Recibo de Caja  
9. Inventing NIT from XLS (absent)  
10. Seeding PriceList / PriceEntry rows from paper historical prices  

---

## Return

| Item | Value |
|---|---|
| **Receipt path** | `docs/operations/final-pre-pilot-2026-09-16/operating-loop-workers/agent5-evidence-fit-receipt.md` |
| **Top constraints** | (1) Cotización fields = quote/lines + Valor cotizado only · (2) Nota = human Pedido→Nota; external # preserve-only · (3) No demo SKUs / no revenue / no fiscal numbering · (4) Catalog residual = free text / special item / honest empty · (5) WhatsApp = human send external |

**AGENT 5 DONE.** No product code changed.
