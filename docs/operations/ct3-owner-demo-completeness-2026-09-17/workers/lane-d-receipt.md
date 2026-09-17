# CT3-D — Smart context + certainty receipt

**Date:** 2026-09-17  
**Lane:** CT3-D (SMART CONTEXT + CERTAINTY + RECOMMENDED RESPONSES + ACTION SUGGESTIONS)  
**Branch:** `ct3/lane-d-smart`  
**Base:** `4b85b115c3fe0cf009f605d65b043b5e2fb7c11b`  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-lane-d-smart`  
**REAL_SEVEN_MUTATED:** **NO**  
**Deploy:** not performed (worker lane)

---

## Carmen plain language

Conversation context can now show **CONFIRMADO / PENDIENTE DE CONFIRMAR / NO REGISTRADO** (green / amber / neutral) without AI probability labels. Freshness says **Actualizado hace… / ayer / Última actualización…** and only shows **Puede requerir confirmación** under the three allowed rules — never invents “desactualizado.”

**Quién preguntar** uses canonical **RESPONSABLE** name + team, or **“Aún no hay una persona responsable asignada.”** with gated **[Asignar responsable]**. Suggestion cards are **SUGERENCIA** only (**Revisar / Ignorar**, never auto-execute). Demo phrases (20 unidades, Q-DEMO-001, 3 piezas quebradas, Llámame el lunes, etc.) get deterministic **demo-marked** suggestions. Recommended replies are editable Spanish drafts with **[Copiar respuesta]** — **never auto-send WhatsApp**.

---

## Delivered

| Capability | Proof state |
|---|---|
| Certainty model labels + tones | **IMPLEMENTED** + **TESTED** |
| Freshness wording helpers | **IMPLEMENTED** + **TESTED** |
| Who-to-ask (canonical / absent + gated assign) | **IMPLEMENTED** + **TESTED** |
| Suggestion card structure + types | **IMPLEMENTED** + **TESTED** |
| Recommended reply panel (copy / optional registrar) | **IMPLEMENTED** + **TESTED** |
| Ask ISALWA section format helpers | **IMPLEMENTED** + **TESTED** |
| Deterministic demo suggestion rules | **IMPLEMENTED** + **TESTED** (demo-marked) |
| Hooks for CT3-C context panel (`smart-context` + component exports) | **IMPLEMENTED** |
| Hosted / browser verify | **UNPROVEN** (no deploy; layout owned by C) |
| Live AI inference | **UNPROVEN** / not claimed — demo rules only |

---

## Files

### Lib
- `apps/os-web/lib/certainty/model.ts`
- `apps/os-web/lib/certainty/freshness.ts`
- `apps/os-web/lib/certainty/who-to-ask.ts`
- `apps/os-web/lib/certainty/ask-format.ts`
- `apps/os-web/lib/certainty/index.ts`
- `apps/os-web/lib/certainty/certainty.test.ts`
- `apps/os-web/lib/conversations/suggestion-types.ts`
- `apps/os-web/lib/conversations/demo-suggestion-rules.ts`
- `apps/os-web/lib/conversations/recommended-reply.ts`
- `apps/os-web/lib/conversations/smart-context.ts`
- `apps/os-web/lib/conversations/smart-context.test.ts`

### Components (consume-ready for CT3-C)
- `apps/os-web/components/certainty/certainty-badge.tsx`
- `apps/os-web/components/certainty/freshness-label.tsx`
- `apps/os-web/components/certainty/who-to-ask-card.tsx`
- `apps/os-web/components/certainty/ask-isalwa-answer.tsx`
- `apps/os-web/components/certainty/index.ts`
- `apps/os-web/components/conversations/suggestion-card.tsx`
- `apps/os-web/components/conversations/recommended-reply-panel.tsx`
- `apps/os-web/components/conversations/smart-context-exports.ts`

### Receipt
- `docs/operations/ct3-owner-demo-completeness-2026-09-17/workers/lane-d-receipt.md`

---

## Honesty constraints honored

- Exactly three certainty states; no probability / % / confidence score labels
- No invented stale thresholds; no “desactualizado”
- Who-to-ask never infers from Cargo
- Suggestions never auto-execute; demo rules marked `isDemo`
- Recommended reply never auto-sends WhatsApp
- Did **not** own `/conversaciones` layout (C), demo DB seeds (E), AI gateway (H), Quote PDF (B)
- REAL untouched; no deploy

---

## Tests run (local)

```text
apps/os-web: tsx --test \
  lib/certainty/certainty.test.ts \
  lib/conversations/smart-context.test.ts
→ 17 pass / 0 fail
```

---

## Residuals / unblock for Control Tower

1. **CT3-C** must wire these components into the conversation context panel / thread shell.
2. **CT3-E** may attach demo thread fixtures that feed `matchDemoSuggestionRules`.
3. **CT3-H** owns live Ask ISALWA provider path; hide live Ask if unproven — D only provides answer **format** helpers.
4. Hosted browser verify of suggestion + reply UX remains **UNPROVEN** until integrate + deploy by CT3.

---

## Merge note

Safe to cherry-pick / merge into `ct3/owner-demo-completeness`. No migration. No REAL_SEVEN touch.
