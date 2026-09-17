# CT3 COLLISION MAP — one writer per boundary

| Lane | Owns (write) | Must not touch |
|---|---|---|
| **CT3-A** visual/density/tabs/lists | `cliente-360-*` nav/tabs shell, shared list/table primitives, page density CSS tokens usage, global next-step strip components under `components/shell` / `components/ui` patterns, Compromisos route fix if in shell nav | Conversations domain, Quote PDF, demo fixtures, AI gateway |
| **CT3-B** commercial/PDF | Quote detail PDF CTAs, send record UX, follow-up after send, convert CTA, documents table presentation on Cliente360 Documents, opportunity create-quote CTA | Cliente360 tab routing (A), Conversations, Story Mode |
| **CT3-C** conversations | `/conversaciones` route, conversation list/thread/context shell, manual register conversation, nav item under Trabajo, conversation contracts/schema if needed | Quote PDF, Map layers, Management metrics, AI provider gateway |
| **CT3-D** smart context | Certainty badges, who-to-ask, recommended response panel, suggestion cards (deterministic), Ask ISALWA response format helpers | Conversation route shell (C owns layout), demo seed data (E) |
| **CT3-E** demo + story | SYNTH demo fixtures/seed, Story Mode UI, Ver ejemplo completo, demo banner/filter | Real tenant data, production migrations that mutate REAL |
| **CT3-F** pedido/ops next-step | Pedido known-state card, prep polish, production/warehouse/purchasing/delivery page density + next-step | Conversations, Map, Cliente360 tab router |
| **CT3-G** map/mgmt/progress/freshness | Map labels/hover/drawer polish, management funnel visual, freshness labels, progress steppers shared helpers if under `lib/management` / `lib/map` | Conversations, Quote PDF actions |
| **CT3-H** AI reverify | Hosted AI adapter for conversation context, AI panel format, hide controls if unproven | Conversation CRUD (C), demo seeds (E) |

Shared read-only OK. Integrator merges SHAs only.
