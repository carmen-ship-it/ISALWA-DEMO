# CT3 COLLISION MAP — one writer per boundary

| Lane | Owns (write) | Must not touch |
|---|---|---|
| **CT3-A** visual/density/tabs/lists | Cliente360 real tab panels + `?tab=` URL, shared list scaling helpers, Compromisos **route** fix (`/compromisos` ≠ `/inicio`), next-step strip shell component, visual separation on pages A owns | Conversations domain, Quote PDF, demo fixtures, AI gateway |
| **CT3-B** commercial/PDF | Quote detail PDF CTAs, send record UX, follow-up after send, convert CTA, Documents tab table, opportunity create-quote CTA | Cliente360 tab router (A), Conversations, Story Mode |
| **CT3-C** conversations | `/conversaciones` route + nav under Trabajo, list/thread/context shell, manual register conversation, conversation model if needed | Quote PDF, Map, Management, AI provider |
| **CT3-D** smart context | Certainty badges, who-to-ask, recommended response, suggestion cards (deterministic), Ask format helpers | Conversation layout (C), demo seeds (E) |
| **CT3-E** demo + story | SYNTH DEMO fixtures, Story Mode, Ver ejemplo completo, demo banner/filter | REAL tenant, REAL_SEVEN |
| **CT3-F** pedido/ops | Pedido known-state card, ops desks next-step density | Conversations, Map, Cliente360 tabs |
| **CT3-G** map/mgmt | Map labels/hover/drawer, management funnel, freshness, progress steppers | Conversations, Quote PDF |
| **CT3-H** AI | Conversation context adapter, hosted reverify, hide if unproven | Conversation CRUD (C), demo seeds (E) |

Integrator merges only. No worker deploys.
