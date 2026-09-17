# CT3-B lane receipt — commercial / PDF / documentos

**Lane:** CT3-B  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-lane-b-commercial`  
**Branch:** `ct3/lane-b-commercial`  
**Base:** `4b85b115c3fe0cf009f605d65b043b5e2fb7c11b`  
**Tip:** _(filled at commit)_  
**At:** 2026-09-17  
**Deployed:** NO (worker must not deploy)  
**REAL_SEVEN_MUTATED:** NO  
**Hosted:** **UNPROVEN** (code PASS ≠ hosted PASS)

## Owned scope completed

| Item | State | Notes |
|---|---|---|
| Opportunity primary Crear/Ver cotización + progress Cliente→Oportunidad→Cotización | **IMPLEMENTED** | No opaque IDs in labels; linked quote number surfaced |
| Quote creation discoverability (prefill cliente/oportunidad) | **IMPLEMENTED** | Create form shows Cliente + Oportunidad; CTA from opportunity |
| Quote detail top-right PDF + Registrar + Acciones | **IMPLEMENTED** | Primary Descargar PDF / Ver PDF when ready; secondary Registrar; Acciones menu |
| DOCUMENTO visual card | **IMPLEMENTED** | Cotización ref + PDF disponible / not-ready copy; no broken links |
| ENVÍO section + modal WhatsApp\|Email\|Otro + toast + follow-up | **IMPLEMENTED** | Durable `quote.send_recorded`; toast “Envío registrado.”; Programar seguimiento |
| Quote→Pedido confirmation modal + convert CTA | **IMPLEMENTED** | Confirmation shows quote/client/total; toast Pedido creado |
| Cliente360 Documentos compact table | **IMPLEMENTED** | Tipo/Referencia/Fecha/Estado/Relacionado/Acciones + Ver/Descargar PDF (content only; tab router owned by A) |
| Human PDF filenames | **IMPLEMENTED** | `Cotizacion-Q-….pdf` / `Nota-Entrega-….pdf` |

## Tests (local code)

| Suite | Result |
|---|---|
| `apps/os-web` CT3-B commercial unit set (27) | **PASS** |
| `packages/providers` quote PDF helpers (7) | **PASS** |

Commands:

```bash
cd apps/os-web && pnpm exec tsx --test \
  lib/commercial/ct3-lane-b-commercial.test.ts \
  lib/commercial/quote-pdf-ui.test.ts \
  lib/commercial/quote-manual-send.test.ts \
  lib/commercial/next-step.test.ts \
  lib/commercial/quote-follow-up.test.ts

cd packages/providers && pnpm exec tsx --test src/pdf/quote-pdf.test.ts
```

Hosted browser verify: **UNPROVEN** — integrator/CT3-I only.

## Residuals

1. Hosted BV of opportunity CTA, quote PDF/Envío/convert, Documentos table — **UNPROVEN**.
2. Email channel added to `QUOTE_MANUAL_SEND_CHANNELS` contract + command service; needs API deploy with web for end-to-end send by Email (local code ready).
3. Cliente360 `?tab=` router remains CT3-A; this lane only densified document table content.
4. Did not touch Conversations, Story Mode, demo seeds, AI provider.

## Collision hygiene

- Did **not** mutate REAL tenant / REAL seven.
- Did **not** deploy.
- Did **not** edit Cliente360 tab URL router.
