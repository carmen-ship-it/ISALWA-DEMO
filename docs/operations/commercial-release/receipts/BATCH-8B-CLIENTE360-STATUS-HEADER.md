# Receipt — Batch 8B: Cliente 360 next-step header

Date: 2026-11-17. Integrator `/Users/carmen/projects/isalwa-wt-v1-repairs`, branch `ct3/v1-repairs`. Parent HEAD: `28353597`. Authority: `CONTINUATION-2026-11-16.md` §13; V2 §17.1; gap #2 in `BATCH-8-SHELL-MAP.md`.

States: **IMPLEMENTED** · **TESTED LOCALLY** (unit/static + `tsc`). Not independently reviewed. **Not browser-verified.** Not pushed, not deployed. No schema change, no API change, no new dependency. Conversation contract WIP (Batch 5B) was left untouched.

## Shipped

| Requirement | What exists |
|---|---|
| **Above the tabs** | Sticky Cliente 360 band now shows **Próximo paso** (`ProximoPasoStrip`), then **Responsable**, **Última atención**, **Problemas abiertos** (`Cliente360StatusHeader` via existing `StatGroup`). No payment tab. |
| **Next step** | Reuses `composeCliente360` / `displayCliente360NextAction` (work follow-ups already ranked overdue → soonest due → stable id). |
| **Owner** | From commercial account composition; absent = `Sin responsable asignado` (or existing no-account copy). |
| **Última atención** | Stable read of `listCustomerConversations({ partyId })`, mapped to a minimal `AttentionSummary` (id / occurredAt / reason / summary) so mid-change conversation contract fields are not required. Newest `occurredAt`, id tie-break. Link `/conversaciones?c=…`. |
| **Problemas abiertos** | Honest `fetchCommercialSection` around `listIssues`; count excludes resolved/closed; link to `?tab=trabajo`. |
| **Absent copy (V2)** | `Sin próximo paso registrado` · `Sin responsable asignado` · `Sin atención registrada` · `Sin problemas abiertos`. |
| **Error ≠ absence** | Failed follow-up / attention / issues reads show unavailable copy and danger surface; never a calm empty or a pretending zero. Intelligence `openIssues` is `number \| null` (`—` when unread). |
| **UI reuse** | `@isalwa/ui` `StatGroup` + existing `ProximoPasoStrip` (shell tone: context / attention / danger). No new design system. |

## Checks

| Check | Result |
|---|---|
| `lib/cliente/status-header.test.ts` + `cliente360-ux.test.ts` + related cliente tests | **pass** |
| `os-web` `tsc --noEmit` | exit 0 |
| Browser | Not run |

## Honest gaps

1. Not browser-verified at 390px / 1440px.
2. Last attention still calls the existing customer-conversations list GET; only the **shape used** is minimized. If that list fails while Batch 5B lands, the header shows unavailable (not inventing absence from commitments).
3. Trabajo-tab issue list still renders empty when the issues read failed (header is honest; tab empty-state follow-up not in this batch).
4. Not independently reviewed, not pushed.
