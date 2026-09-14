# Isa Document Reconciliation — Wave 2

Candidate base: `29d63bc19928733068d691d27e038cf5f70dd506`

## Evidence source (locked)

Isa sent Carmen photographs of real ISALWA operating documents **after** the prior engineering pass finished.

This reconciliation uses **only Carmen’s transcription / visual reading**.

Engineering did **not** inspect the original photographs.

Where the transcription says “appears”, “unclear”, or leaves meaning unproven, uncertainty is preserved. Handwriting is not treated as canonical identity or role. Workflow is not inferred from a document title alone.

Migration apply: **NO** · Deploy: **NO** · Gate C purchase migration: untouched

---

## Distinct concepts (do not collapse)

1. Customer **Nota de Entrega**
2. **Recibo Oficial de Caja**
3. **Nota de Entrega de Fábrica**
4. **Nota de Salida de Almacén** (previously confirmed distinct from customer entrega)
5. **FinishedGoodsReceipt / Listo** (canonical Listo from prior pass — not auto-equal to Fábrica note)

---

## Document A — Nota de Entrega (customer)

Carmen transcription (prior evidence block):

| Fact | Certainty | Model status |
|---|---|---|
| Heading `NOTA DE ENTREGA` | Explicit | SUPPORTED (`nota_de_entrega`) |
| Date `14/09/2026` | Explicit | SUPPORTED (`deliveredAt` / note `bornAt`) |
| Printed number `007189` | Explicit | SUPPORTED — `externalDocumentNumber` (source-preserved; not generated) |
| Customer Comercial La Creación | **Appears** | PARTIAL — `deliveredTo` / party; do not invent Party from label |
| Address Alto San Pedro | **Appears** | MISSING_FIELD as note address snapshot |
| Cliente, NIT/C.I., Dirección, Exten., Telf. | Visible labels | MISSING_FIELD on DeliveryNote snapshot |
| Cantidad / Detalle | Visible | SUPPORTED (copied quantity + description) |
| P/Unit., Subtotal, Totals, A cuenta, Saldo | Visible | MISSING_FIELD on note lines — **historical snapshot/evidence only; must not update PriceList** |
| Placa de Camión / Fecha de pago | Visible labels | MISSING_FIELD on note |
| ENTREGADO POR VENDEDOR | Visible | PARTIAL — evidence role / opaque reference (no dedicated seller schema) |
| RECIBÍ CONFORME TRANSPORTISTA | Visible | MISSING_FIELD as dedicated transporter role |
| RECIBÍ CONFORME CLIENTE | Visible | SUPPORTED — `delivery_confirmation` + `recipient` + `signatureReference` (no signature platform) |
| Historical Capri/Cádiz 2da prices; total Bs 1,270 | Explicit example | Evidence only — not current pricing |
| Payment noted Efectivo 1,070 + QR 200 | Explicit | Separate operational payment fact (see Document B) |

**Boundary:** DeliveryNote cannot predate Delivery. Generated `noteNumber` = null. `numberingPolicy` = `unknown`.

---

## Document B — Recibo Oficial de Caja

Carmen transcription (ISA SOURCE EVIDENCE 2):

| Fact | Certainty | Model status |
|---|---|---|
| Branding Vitri / ISALWA S.R.L. | Visible | Provenance only — not ledger entity |
| Heading `RECIBO OFICIAL DE CAJA` | Explicit | Operational payment evidence only |
| Printed `Nº 007472` | Explicit | SUPPORTED (`source_reference`) |
| Date `14/09/2026` | Explicit | SUPPORTED (`reported_at`) |
| Amount `Bs. 1270` | Explicit | SUPPORTED (`amountCentavos` = `127000`) |
| “Recibí de” ≈ Comercial La Creación | **Appears** (handwriting) | PARTIAL — subject / note / label |
| Words ≈ Un mil doscientos setenta | **Appears consistent** | Not separately modeled (amount is numeric truth) |
| Printed fields Día/Mes/Año, Bs/$us/T/C, Recibí de, La suma de, Bolivianos/Dólares, Por concepto de, Total, A cuenta, Saldo, Recibí/Entregué Conforme, Nombre, C.I. | Visible labels | PARTIAL — concept/note; FX columns MISSING_FIELD; **not** ledger |
| Handwritten `QR 200 Bs.` + `Efectivo 1070 Bs.` | Explicit method evidence | SUPPORTED — `payload.tenders[]` |
| Total `1270 Bs.` | Explicit | Must equal tender sum |

### Confirmed business fact

A single real payment/receipt event can contain more than one payment method:

- Efectivo = 1070 BOB  
- QR = 200 BOB  
- Total = 1270 BOB  

**Do not treat as:** general ledger truth, bank reconciliation, tax ledger, accounting journal, or authoritative finance balances.

**Do not flatten** into one fake payment method.

Without structured tenders this would be `FOUNDATION_GAP — PAYMENT_TENDER_COMPONENTS`. Minimal additive `tenders[]` is inside the operational-payment boundary.

Ledger boundary: `confirmation` = `pending`; `reportedFactMayConfirmPayment()` = false.

---

## Document C — Nota de Entrega de Fábrica

Carmen transcription (ISA SOURCE EVIDENCE 3):

| Fact | Certainty | Notes |
|---|---|---|
| `ISALWA S.R.L.` + `NOTA DE ENTREGA DE FABRICA` | Explicit | Proves this named document **exists** |
| Printed `Nº 002693` | Explicit | External/source number evidence only |
| Date `27/08/2026` | Explicit | — |
| Original Fábrica / Copia 1 Cliente / Copia 2 Contabilidad | Explicit | Distinct copy set |
| Name ≈ JOSE LUIS | **Appears** | Do **not** infer driver/customer/warehouse/factory/transporter/other |
| Handwritten `CAMION` nearby | Handwritten | Uncertain; not role proof |
| Fields name/NIT/Cargo/Telf/DESCRIPCION/U/M/Blanco/qty cols/P/S/OBS/TOTALES/signatures | Visible labels | Not modeled as this type until role mapped |
| Printed rows (INODORO, TANQUE…, LAVAMANO, …) | Visible examples | Labels only |
| Handwritten (T. TANQUE ALTO, INODORO GRIS, T. MILAN, …) | Handwritten examples | Not canonical SKUs |
| Markings A / B / 2da | Visible examples | Meanings of A, B, P/S, and handwritten classifications **NOT proven** |

### Relationship analysis (title does not decide workflow)

| Candidate | Classification |
|---|---|
| Factory handoff evidence | UNKNOWN |
| Supporting citation for FinishedGoodsReceipt | UNKNOWN — may attach later; document ≠ Listo |
| Warehouse/factory outbound | UNKNOWN — ≠ proven Nota de Salida |
| Transport handoff | UNKNOWN |
| Direct factory/customer pickup | UNKNOWN |
| = customer Nota de Entrega | CONTRADICTED_BY_SOURCE |
| = FinishedGoodsReceipt / Listo | CONTRADICTED_BY_SOURCE (and forbidden auto-equality) |
| = Delivery | CONTRADICTED_BY_SOURCE |
| = Allocation | CONTRADICTED_BY_SOURCE |
| = Nota de Salida de Almacén | CONTRADICTED_BY_SOURCE (not proven; do not collapse) |

**Workflow role:** `BUSINESS_ROLE_REQUIRES_MAPPING`  
Also recorded as: `BUSINESS_DECISION_REQUIRED — FACTORY_DELIVERY_NOTE_ROLE`

Contract constant only: `FACTORY_DELIVERY_NOTE_KIND` — no write path.

FinishedGoodsReceipt remains canonical **Listo** from `29d63bc`. Analyze relationship only; do not equate.

---

## External printed numbers

Source-confirmed visible numbers: `007189`, `007472`, `002693`.

Proves externally visible/source document numbers exist.

Does **not** prove: algorithm, reset cadence, uniqueness, fiscal sequencing, preprinted books, or that OS should issue numbers.

Representation: `externalDocumentNumber` (delivery/outbound notes) and `source_reference` (caja). Generated assignment remains refused.

**BUSINESS_DECISION_REQUIRED — DOCUMENT_NUMBERING** if generation behavior is needed.

---

## Signature / acknowledgement

Preserve evidence metadata where supplied: who delivered, who received, transporter ack, client ack, source document, date, document number, signature/proof reference.

Current model: partial (customer confirmation + opaque reference; seller/transporter dedicated fields MISSING_FIELD). No digital-signature platform.

Delivery truth must not reduce to `status = delivered` alone.

---

## Code changes justified by these facts

| Change | Reason |
|---|---|
| `payload.tenders[]` on operational payment | Preserve 1070 + 200 without fake single method |
| `externalDocumentNumber` + unapplied migration | Preserve printed numbers without inventing generation |

Other visible form fields stay MISSING_FIELD / docs-only unless losing a confirmed structured fact.
