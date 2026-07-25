# Mission 17 — Commercial Timeline Engine

**Status:** Infrastructure complete (no UI / no WhatsApp product / no AI)  
**Parent constitution:** `docs/product/MISSION15_COMMERCIAL_PLATFORM.md` §2  
**Depends on:** Mission 15 (sequencing) · Mission 16 (geo foundation — orthogonal)  
**Developer guide:** `docs/guides/TIMELINE_ENGINE.md`

---

## Thesis

Everything commercial in ISALWA eventually writes into **one append-only timeline**.

Modules **emit**. The timeline **owns history**.

No CRM stage boards. No per-module activity feeds. No mutable “history rows.”

---

## Canonical event types

| Type | Chapter | Primary consumers |
|------|---------|-------------------|
| `account.created` | relación | Personas, Memoria, AI |
| `visit.scheduled` | campo | Personas, Radar, Notifications |
| `visit.completed` | campo | Personas, Pulso, Radar, Memoria, AI |
| `quote.created` | comercio | Personas, Revenue, Memoria |
| `quote.revised` | comercio | Personas, Revenue |
| `quote.sent` | comercio | Personas, Señal, Notifications |
| `quote.accepted` | comercio | Personas, Pulso, Revenue, Memoria |
| `order.confirmed` | comercio | Personas, Revenue |
| `invoice.issued` | comercio | Personas, Pulso, Collections, Revenue |
| `payment.allocated` | cobranza | Personas, Pulso, Collections, Revenue |
| `promise.made` | cobranza | Personas, Collections, Radar |
| `promise.broken` | cobranza | Personas, Collections, Radar, AI |
| `whatsapp.received` | señal | Señal, Personas, Radar, AI |
| `whatsapp.sent` | señal | Señal, Personas, Memoria |
| `task.completed` | interno | Personas, Notifications |
| `note.created` | interno | Personas, Memoria, AI |
| `credit.approved` | crédito | Personas, Collections, Revenue |
| `territory.reassigned` | territorio | Personas, Radar |

Defined in `@isalwa/domain/events` — extend the union + catalog together.

---

## Event shape

```
id                 ULID (immutable)
organizationId     tenant
accountId          customer (nullable only for org-level events)
actor              user | system
type               CommercialEventType (dotted)
title / body       human-readable
occurredAt         business time
payload.v = 1
  related          CommercialObjectRef
  evidence[]       entity | document | url | snapshot
  metadata         opaque bag (amounts, status, etc.)
```

Persisted today on Prisma `ActivityEvent` (`payloadJson` holds the versioned envelope).  
Future migrations may promote `relatedType` / `relatedId` columns — adapters absorb that.

---

## Packages

| Path | Role |
|------|------|
| `packages/domain/src/events/` | Types, catalog, factory, legacy normalize — **pure, no I/O** |
| `packages/contracts/src/events/` | Zod schemas + timeline DTO contracts |
| `packages/database/src/timeline/` | `emitCommercialEvent` · `buildActivityCreateManyInput` · `listAccountTimeline` |

Exports:

- `@isalwa/domain` / `@isalwa/domain/events`
- `@isalwa/contracts` / `@isalwa/contracts/events`
- `@isalwa/database` / `@isalwa/database/timeline`

---

## Adapters

**Write:** `emitCommercialEvent(db, args)` — only legal writer for new events.  
**Seed:** `buildActivityCreateManyInput(args)` — same factory, batch insert.  
**Read:** `listAccountTimeline(db, accountId)` — normalizes legacy underscore types.

API commerce + visits now emit through the write adapter (infrastructure alignment, not a product feature).

---

## Seeds

Universe seed emits canonical types including:

- `account.created`
- quote / order / invoice / payment.allocated
- `promise.made` (+ `promise.broken` when status broken)
- `visit.scheduled` + `visit.completed`
- per-message `whatsapp.received` / `whatsapp.sent`

Re-seed after pull to refresh event vocabulary.

---

## Design for future surfaces (not built)

| Surface | How it will use the timeline |
|---------|------------------------------|
| **Radar** | Project open risks from recent `promise.broken`, visit gaps, WA silence |
| **Pulso** | Aggregate vitals from payment / visit / invoice events |
| **Personas** | Dossier already reads timeline; switch fully to `family` + payload |
| **Memoria** | Story engine over chapters — no second store |
| **Señal** | Message events already typed; inbox remains operational projection |
| **Collections** | Promise + payment.allocated as source of truth |
| **AI** | Evidence must cite `evidence[]` / related refs |
| **Revenue** | Quote→cash path from commerce events |
| **Notifications** | Subscribe to type + score — never duplicate feeds |

---

## Non-goals (this mission)

- WhatsApp Cloud product  
- AI summaries / copilots  
- UI redesign / Memoria productization  
- Outbox / Kafka / multi-region buses  
- Mutable corrections (use compensating events later)

---

## Verification

- [x] Strong typing + catalog  
- [x] Append-only emit path  
- [x] Evidence + actor + org + customer + related  
- [x] Seed aligned  
- [x] Read adapter with legacy normalize  
- [x] Developer guide  
- [x] No UI redesign  

---

**Next:** Missions that *mutate* commerce must call `emitCommercialEvent`. Missions that *read* history must call `listAccountTimeline` (or projections derived from it).
