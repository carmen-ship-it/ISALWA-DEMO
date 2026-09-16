# AGENT 3 — Delivery Documents receipt

**Agent:** AGENT 3 — DELIVERY DOCUMENTS  
**Branch:** `agent3/delivery-documents-wave2`  
**Worktree:** `.worktrees/wave2-remediation-integrate`  
**Date:** 2026-09-16  
**Data:** SYNTH only (no production REAL tenant mutation)

## Slice

Pedido → Nota de Entrega → Salida → Entrega as **explicit human-created** operational documents.

No automatic lifecycle. Official numbering policy not invented. Not an invoice. PDF download only (no WhatsApp send).

## Carmen handoff checklist

| Key | State | Evidence |
|-----|--------|----------|
| NOTA_DE_ENTREGA_CREATED_FROM_PEDIDO | **TESTED** (SYNTH) | `CreateNotaDeEntrega` + pedido UI “Crear nota de entrega” |
| NO_RETYPE | **TESTED** | partyId / orderId / line labels copied from Pedido; user enters qty + recipient + deliveredBy |
| PDF | **TESTED** (bytes) · hosted BV **UNPROVEN** | `GET /v1/delivery-notes/:id/pdf` + pdf-lib paper twin |
| SALIDA | **TESTED** | `RecordSalida` / “Registrar salida”; does not create nota; PDF download ≠ salida |
| ENTREGA | **TESTED** | `RecordEntrega` / “Registrar entrega”; does not auto-create nota |
| RECIPIENT | **TESTED** | required on create; stored + PDF |
| DELIVERED_BY | **TESTED** | required on create; stored + PDF |
| RECEIVED_BY | **TESTED** | null at create; set on `RecordEntrega` when nota linked |
| NUMBERING_PROVISIONAL | **TESTED** | immutable `NE-PILOT-<id>` · `numberingPolicy: provisional_internal` · optional `displayDocumentNumber` |
| UNKNOWN_POLICY_NOT_HARDCODED | **TESTED** | official sequence still refused; `DOCUMENT_NUMBERING` remains open |
| HISTORY | **TESTED** | `CorrectDeliveryDocument` append-only reverse/revision with reason |
| NEGATIVE_AUTH | **TESTED** | cross-tenant NOT_FOUND · unauthorized PERMISSION_DENIED · cancelled/invalid order rejected · qty > order line rejected when lines known |
| REAL_SEVEN_MUTATED | **TESTED** via **7 SYNTH orgs** | not production REAL tenants |

## Proof matrix (do not collapse)

| Capability | PLANNED | IMPLEMENTED | TESTED | INTEGRATED | DEPLOYED | HOSTED | BROWSER-VERIFIED | USER-ACCEPTED |
|------------|---------|-------------|--------|------------|----------|--------|------------------|---------------|
| Create nota from Pedido | yes | yes | yes (SYNTH) | code wired | no | no | no | no |
| Prefill / no retype | yes | yes | yes | code wired | no | no | no | no |
| Provisional numbering | yes | yes | yes | code wired | no | no | no | no |
| PDF download | yes | yes | yes (bytes) | code wired | no | no | no | no |
| Registrar salida | yes | yes | yes | code wired | no | no | no | no |
| Registrar entrega | yes | yes | yes | code wired | no | no | no | no |
| Append-only correction | yes | yes | yes | code wired | no | no | no | no |
| Pedido timeline | yes | yes | yes (memory + derived fallback) | code wired | no | no | no | no |
| Cliente timeline projection | yes | event types + facts registered | unit facts | outbox emit stub on prisma | no | **UNPROVEN** | no | no |
| Migration apply | yes | SQL present | n/a | n/a | no | **UNPROVEN** | n/a | n/a |

## Automated tests (this worktree)

| Suite | Result |
|-------|--------|
| `@isalwa/os-delivery` | **33 pass / 0 fail** |
| `@isalwa/providers` delivery PDF | **1 pass / 0 fail** |
| `@isalwa/os-read-fulfillment` | **22 pass / 0 fail** |

## Commands

- `CreateNotaDeEntrega`
- `RecordSalida` (alias retained: `RecordWarehouseExit`)
- `RecordEntrega` (legacy `RecordCustomerDelivery` does **not** auto-create nota)
- `CorrectDeliveryDocument`
- `RecordDeliveryEvidence`

## Numbering

- Identity: `internalDocumentRef = NE-PILOT-<noteId>` (immutable)
- Policy: `provisional_internal` only for pilot-safe display
- Future official display may use `displayDocumentNumber` without rewriting identity/history
- Spanish copy states this is **not** official ISALWA numbering

## Control Tower (not this agent)

1. Apply migration `20260920120000_os_delivery_documents_flexible`
2. Deploy os-api + os-web
3. Hosted BV: create nota from Pedido · PDF download · salida · entrega · auth negatives · desktop browser
4. Wire prisma `appendDomainEvent` → BusinessEvent/outbox for Cliente 360 timeline projection (Pedido timeline already derives from persisted rows when events are empty)

## Owner review question preserved

V1 does **not** force “Nota created at stage X.” Record tolerates “la crean aquí o en otro momento” without destructive redesign.

## Do not claim

- Official ISALWA document numbering
- Invoice / tax / fiscal meaning
- WhatsApp send
- Hosted or browser-verified PASS
- Production REAL-seven mutation (SYNTH parallel orgs only)
