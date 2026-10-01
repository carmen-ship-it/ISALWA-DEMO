# Integration Contract (Conceptual)

**Status:** Increment 5.1 — extends Increment 5 finance/integration architecture  
**Related:** `FINANCE_ACCOUNTING_BOUNDARY.md`, `BOLIVIA_ACCOUNTING_DISCOVERY_MATRIX.md`, ADR-0008

---

## Unified integration model

Every external system connects through:

```
IntegrationConnection (tenant-scoped)
  → Adapter (vendor-specific module)
  → Ingest (idempotent) OR Outbound command
  → BusinessEvent(s)
  → Projection update
  → Attention / degraded mode if unhealthy
```

---

## Integration categories

| Category | OS authoritative | External authoritative | Adapter |
|----------|------------------|------------------------|---------|
| Accounting | Commercial commitments | GL, official invoice, AR/AP | Finance (D) |
| Fiscal / SIN | — | Fiscal documents | Fiscal (D) |
| Banking | Ingested payment events | Bank truth | Banking (D) |
| WhatsApp | Message artifacts + links | Meta delivery | Messaging (D) |
| Email | Message artifacts | Provider | Email (D) |
| Document storage | Metadata + ACL | Blob | Storage (C config) |
| Auth provider | Member ↔ AuthIdentity link | Credentials | Auth (C) |
| Logistics | Delivery requests (future) | Carrier | Logistics (D) |
| External accountant | — | Human + files | Manual/Excel (D) |

**QuickBooks:** Architect scaffold only — **not** ISALWA-validated, **not** Bolivia compatibility claim.

---

## IntegrationConnection record (conceptual)

- `organizationId`  
- `integrationType`  
- `connectionId`  
- `status`: disconnected | connecting | active | degraded | error  
- `capabilityKey` linkage  
- `credentialRef` (vault — never client bundle)  
- `lastSyncAt`, `lastError`, `healthCheckAt`  
- webhook endpoints / polling config  

---

## Ingest modes

| Mode | Use |
|------|-----|
| Webhook + idempotency key | WhatsApp, payments |
| Polling | Legacy systems without webhooks |
| Excel/CSV batch | Accountant export, fallback |
| Manual confirm | Low-confidence rows → quarantine |

---

## Degraded mode

- Connection `degraded` → attention for ops plane + user message in Command Center (business) vs ops dashboard (technical)  
- Manual capture path still emits events with `provenance: manual`  
- Stale projection TTL → `projection.stale` attention  

---

## Reconciliation

- `projection.conflict.detected` when OS and external disagree  
- WorkItem for human reconciliation — no silent pick  

---

## Audit

All connect/disconnect/sync: AuditLog + BusinessEvent `integration.*`

---

## Vendor lock-in prevention

Adapter interface in domain layer; vendor SDK only inside adapter module. Export/portability: events + party graph export ADR (future).
