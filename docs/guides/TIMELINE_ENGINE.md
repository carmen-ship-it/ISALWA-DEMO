# Commercial Timeline Engine — Developer Guide

**Mission:** 17  
**Constitution:** Mission 15 §2  
**Spec:** `docs/product/MISSION17_TIMELINE_ENGINE.md`

---

## Rules

1. **Never** `prisma.activityEvent.create` with ad-hoc `type` strings.  
2. **Never** update or delete timeline rows to “fix” history. Emit a new event.  
3. **Never** create a second activity table per module.  
4. **Always** use `@isalwa/domain/events` types + `emitCommercialEvent`.  
5. **Always** attach `related` (and preferably `evidence`) when an entity exists.

---

## Emit (API / services)

```ts
import { emitCommercialEvent, getPrisma } from '@isalwa/database';
import { createId } from '@isalwa/ts-utils';

await emitCommercialEvent(prisma, {
  id: createId(),
  type: 'quote.created',
  organizationId,
  accountId,
  actor: { kind: 'user', userId },
  occurredAt: new Date(),
  title: `Cotización ${number} creada`,
  body: optionalDetail,
  related: { type: 'quote', id: quoteId },
  metadata: { totalCentavos: total.toString() },
});
```

Inside a transaction, pass `tx` as the first argument.

---

## Seed batch

```ts
import { buildActivityCreateManyInput } from '../timeline/emit';

activityBatch.push(
  buildActivityCreateManyInput({
    id: stableId('act', 'visit', visitId),
    type: 'visit.completed',
    organizationId: ORG.id,
    accountId,
    actor: { kind: 'user', userId: ownerId },
    occurredAt: completedAt,
    related: { type: 'visit', id: visitId },
  }),
);
```

---

## Read

```ts
import { listAccountTimeline } from '@isalwa/database';

const { items } = await listAccountTimeline(prisma, accountId, { take: 40 });
// items[].canonicalType — dotted taxonomy (null if unknown legacy)
// items[].family — prefix for icons (visit, quote, whatsapp, …)
// items[].payload — { v:1, related?, evidence?, metadata? }
```

Legacy underscore types (`quote_created`) are normalized on read.

---

## Add a new event type

1. Add to `COMMERCIAL_EVENT_TYPES` in `packages/domain/src/events/types.ts`  
2. Add catalog entry in `catalog.ts` (chapter + consumers)  
3. Rebuild `@isalwa/domain` and `@isalwa/contracts`  
4. Emit from the mutating use-case  
5. Do **not** add a UI surface in the same PR unless the mission says so  

---

## Packages cheat-sheet

| Import | Purpose |
|--------|---------|
| `@isalwa/domain/events` | Types, catalog, `buildCommercialEvent`, `normalizeEventType` |
| `@isalwa/contracts/events` | Zod validation for API boundaries |
| `@isalwa/database` / `./timeline` | Persist + read adapters |

---

## Testing mindset

- Assert **type + related.id + occurredAt** after a mutation.  
- Assert seed counts include `payment.allocated` / `whatsapp.received`.  
- Prefer contract schema parse on timeline API responses when adding new endpoints.
