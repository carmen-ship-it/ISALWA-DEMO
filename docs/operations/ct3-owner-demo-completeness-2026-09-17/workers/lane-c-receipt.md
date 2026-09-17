# LANE CT3-C — Conversations receipt

**Date:** 2026-09-17  
**Lane:** CT3-C writer  
**Branch:** `ct3/lane-c-conversations`  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-lane-c-conversations`  
**Base:** `4b85b115c3fe0cf009f605d65b043b5e2fb7c11b`  
**LANE_IMPLEMENTATION_SHA:** *(filled after commit)*  
**REAL_SEVEN_MUTATED:** **NO**  
**Deploy / migrate:** not performed (lane receipt only)

---

## Carmen plain language

Trabajo now has **Conversaciones** (`/conversaciones`) — a three-column desk for company-entered conversation evidence. WhatsApp stays disconnected. Staff can **Registrar conversación** (existing form). Demo threads, when CT3-E supplies them, show **DEMO·WHATSAPP** and never claim live messaging.

---

## Delivered

| Capability | Proof state |
|---|---|
| `/conversaciones` authorized route | **IMPLEMENTED** |
| Nav under Trabajo (Mi trabajo, Conversaciones, Aprobaciones, Incidencias, Compromisos) | **IMPLEMENTED** + **TESTED** |
| Desktop 28/44/28 list · thread · Contexto ISALWA | **IMPLEMENTED** |
| Mobile stack + context/register drawers | **IMPLEMENTED** |
| Provider-neutral Conversation + Message model + adapters | **IMPLEMENTED** + **TESTED** |
| Filters: Todas / Necesitan respuesta / Seguimiento / Oportunidad posible / Incidencia posible | **IMPLEMENTED** + **TESTED** |
| Thread inbound left / outbound right; channel; no fake read ticks | **IMPLEMENTED** + **TESTED** |
| Context panel shell sections + CT3-D stub hooks | **IMPLEMENTED** |
| Global Registrar conversación (drawer + ⌘K action) | **IMPLEMENTED** + **TESTED** |
| DEMO·WHATSAPP badge/banner + fixture registry for CT3-E | **IMPLEMENTED** + **TESTED** |
| Search hook (`conversationPaletteItems` via search-extensions) | **IMPLEMENTED** + **TESTED** |
| Hosted / browser verify | **UNPROVEN** this SHA |

---

## Model decision

- **Reused** existing `OsCustomerConversation` / `ManualCustomerConversation` / `ManualConversationPanel` for company-entered evidence (channels `whatsapp` \| `manual` on the evidence row).
- **Added** presentation Conversation + Message model (`WHATSAPP` \| `PHONE` \| `IN_PERSON` \| `EMAIL` \| `OTHER`) with provider adapter interfaces (`manual` / `demo` / future stubs). **No Meta/Twilio coupling.**
- Existing API `GET /conversations` targets a legacy messaging DB shape not present in OS Prisma — left untouched; not used as the owner-demo desk source.
- **New tables / migrations:** **NOT NEEDED** for this lane. Message persistence beyond projecting manual evidence remains a residual if product later wants durable multi-bubble threads.

---

## Files changed

### Route / UI
- `apps/os-web/app/(app)/conversaciones/page.tsx`
- `apps/os-web/components/conversations/conversations-workspace.tsx`
- `apps/os-web/components/conversations/conversation-list.tsx`
- `apps/os-web/components/conversations/conversation-thread.tsx`
- `apps/os-web/components/conversations/conversation-context-panel.tsx`
- `apps/os-web/components/conversations/conversation-demo-badge.tsx`
- `apps/os-web/components/conversations/manual-conversation-panel.tsx` — optional `onRecorded`

### Lib
- `apps/os-web/lib/conversations/model.ts` (+ `model.test.ts`)
- `apps/os-web/lib/conversations/adapters.ts`
- `apps/os-web/lib/conversations/project-manual.ts`
- `apps/os-web/lib/conversations/search.ts`
- `apps/os-web/lib/conversations/copy.ts`
- `apps/os-web/lib/conversations/conversaciones-shell.test.ts`
- `apps/os-web/lib/navigation/nav-config.ts`
- `apps/os-web/lib/navigation/breadcrumbs.ts`
- `apps/os-web/lib/i18n/es.ts`
- `apps/os-web/lib/shell/command-palette.ts` (+ test)
- `apps/os-web/lib/productivity/search-extensions.ts`
- `apps/os-web/lib/productivity/not-implemented.ts`
- `apps/os-web/lib/productivity/saved-views.ts`
- `apps/os-web/lib/qa/access-matrix.ts`
- nav/test alignments: `commercial-ui-hardening.test.ts`, `system-admin-affordance.test.ts`

### Receipt
- `docs/operations/ct3-owner-demo-completeness-2026-09-17/workers/lane-c-receipt.md`

---

## Tests run (local)

```text
pnpm --filter @isalwa/os-contracts build
pnpm exec tsx --test \
  lib/conversations/model.test.ts \
  lib/conversations/conversaciones-shell.test.ts \
  lib/conversations/manual-conversation.test.ts \
  lib/commercial/commercial-ui-hardening.test.ts \
  lib/shell/command-palette.test.ts \
  lib/roles/system-admin-affordance.test.ts
→ pass (focused suites)
```

---

## Residuals

- **CT3-E:** SYNTH demo fixtures via `registerConversationFixtures` (empty by default).
- **CT3-D:** fill Contexto ISALWA section stubs (`emptyConversationContextHooks`).
- **CT3-H:** AI context adapter may consume the same Conversation model later.
- Durable Conversation/Message tables not added; session-local recorded list + fixture registry only.
- `/mensajes` remains capability-locked FUTURE (hidden from primary nav); not renamed to WhatsApp.
- Hosted browser proof: **UNPROVEN**.

---

## Honesty

- No live WhatsApp claim; no fake read ticks; no REAL tenant mutations; no deploy; no Quote/PDF/Map/Management/AI provider work.
