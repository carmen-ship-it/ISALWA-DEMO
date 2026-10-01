# UI-5A — Commercial Opportunity + Quote Write Evidence

**Lane:** UI-5A — Commercial write (Opportunities + Quotes only)  
**Date:** 2026-08-24  
**App:** `apps/os-web` only  
**Gate:** **PASS (CONDITIONAL runtime integration)**

---

## Pre-flight

| Check | Result |
|-------|--------|
| Agent 3 blocker on Opportunity/Quote commands | **NONE** |
| G-02 CreateOrder | **OPEN** — UI must NOT expose CreateOrder |
| G-08 Commercial→Approval | **BLOCKED** — no approval UI |
| Command DTOs | `packages/os-contracts/src/commercial-commands.ts` |
| HTTP surface | `POST /v1/commands/:commandName` + `idempotency-key` header |

**Cross-lane change requests:** NONE

---

## COMMANDS WIRED

| Command | UI surface |
|---------|------------|
| CreateOpportunity | Cliente 360 → Nueva oportunidad |
| UpdateOpportunity | Oportunidad detail → Editar |
| ChangeOpportunityStage | Oportunidad detail → Cambiar etapa |
| CloseOpportunity | Oportunidad detail → Cerrar (ganada/perdida) |
| AssignOpportunityOwner | Oportunidad detail → Asignar responsable (admin directory) |
| CreateQuote | Oportunidad detail → Nueva cotización |
| AddQuoteLine | Cotización draft → Agregar línea |
| UpdateQuoteLine | Cotización draft → Guardar línea |
| RemoveQuoteLine | Cotización draft → Eliminar línea |
| UpdateQuote | Cotización draft → Notas / descuento general |
| SubmitQuote | Cotización draft → Enviar cotización |
| CancelQuote | Cotización draft → Cancelar cotización |

**NOT wired:** CreateOrder, CancelOrder, any Approval command.

---

## IMPLEMENTED

| Area | Location |
|------|----------|
| Command client | `lib/api/os-api-client.ts` → `executeCommand` |
| Server actions | `lib/commercial/actions.ts` |
| Money input parse | `lib/commercial/parse-money-input.ts` (BigInt centavos) |
| Command errors (ES) | `lib/commercial/command-errors.ts` |
| Opportunity create | `oportunidades/nueva`, Cliente 360 link |
| Opportunity actions | `opportunity-actions-panel.tsx` |
| Quote create | `cotizaciones/nueva` under opportunity |
| Quote editor | `quote-editor.tsx` on draft quote detail |
| Submitted quote policy copy | "Conversión a pedido pendiente de política comercial." |
| Idempotency | `createId()` per command via `idempotency-key` header |
| Double-submit guard | `CommandSubmitButton` + `useFormStatus` pending disable |
| Read refresh | `revalidatePath` on Cliente 360 + detail routes after mutations |

**Not invented:** probability, territory, approval thresholds, catalog policy, payment/inventory state.

---

## TESTED

| Suite | Result |
|-------|--------|
| `lib/commercial/ui-5a.test.ts` | 13 tests PASS |
| Full os-web suite | **78 tests PASS** |
| Typecheck + build | PASS |

---

## INTEGRATED

| Path | Status |
|------|--------|
| Browser → Postgres command smoke | **NOT VERIFIED** |
| CreateOrder UI | **NOT EXPOSED** (verified by test + grep) |
| Approval UI on quotes | **NOT EXPOSED** |

---

## G-02 / G-08

- **G-02:** OPEN — client policy decision pending; UI shows honest non-action copy on submitted quotes.
- **G-08:** E-01/E-03 closed; commercial subject types not in approval registry — **Approval integration still requires explicit subject-type extension** before any UI.

---

## Authorization

- Backend `PERMISSION_DENIED` / owner checks on edit commands — surfaced via `mapCommandError`.
- UI does not pre-filter command buttons by role except AssignOwner member list (admin directory availability).

---

## Money safety

- User BOB input → `parseBobInputToCentavos` (BigInt)
- Line/total display from backend centavo strings via existing `formatCentavos`
- No browser float for canonical totals

---

## Files touched (apps/os-web only)

```
lib/commercial/actions.ts
lib/commercial/command-types.ts
lib/commercial/command-errors.ts
lib/commercial/parse-money-input.ts
lib/commercial/member-options.ts
lib/api/os-api-client.ts
components/commercial/*
app/(app)/clientes/[partyId]/page.tsx
app/(app)/clientes/[partyId]/oportunidades/**
app/(app)/clientes/[partyId]/cotizaciones/[quoteId]/page.tsx
```
