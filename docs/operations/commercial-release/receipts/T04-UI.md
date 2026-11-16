# T04 — UI wiring (quote lifecycle)

Authority: CONTINUATION §8. Domain and API: `T04-DOMAIN-API.md`. This step wires the screens to that lifecycle. It adds no second quote flow and no new design primitives.

Order on screen: **Preparar cotización → Guardar borrador → Solicitar aprobación → Emitir cotización → Descargar PDF → Registrar aceptación → Crear pedido.**

## 1. What is wired

| Screen | Change |
| --- | --- |
| Cliente 360 header and actions menu | "Preparar cotización" (`prepareQuoteTarget`). Exactly one open opportunity → new quote (or its draft). None → the existing new-opportunity flow. Several, or the list unreadable → the Comercial tab. It never creates a Sale and never guesses between opportunities. |
| Next step, command palette, new-quote page title | "Crear cotización" → "Preparar cotización" where it is the customer-facing start. The submit button of the creation form keeps "Crear cotización". |
| Quote editor | Header "Guardar borrador" (draft only). "Emitir cotización" / "Emitiendo…" replaces Presentar. Helper copy says issuance is not a send and needs approval of the exact terms first. The line-edit "Guardar cambios" is unchanged. |
| Approval panel | Shown for draft quotes. A `<select>` of members who hold `commercial.price.approve` replaces the free typeahead for quotes. The requester is never offered. No eligible member → an honest empty state and a disabled button. After approval the panel says Emitir is next. |
| Acceptance | New section "Aceptación del cliente" (`#registrar-aceptacion`). Channel (WhatsApp / Llamada / Visita / Presencial / Otro), date, evidence, hidden `expectedRevision` = `quote.revisionNumber`. Shown for an issued, not yet accepted quote. `router.refresh()` after success. |
| Crear pedido | Replaces "Convertir a Pedido". Offered only for `accepted` quotes without an order. `canConvertToOrder` in the query service now means `status === 'accepted'`. |
| PDF | "Descargar PDF" is kept. With `issuedDocumentHash` it shows "Documento emitido · hash …" plus a disclosure that the PDF bytes are not compared to the hash. |
| Sticky bar, detail actions, guidance | One primary CTA per stage: Emitir → Registro de envío → Registrar aceptación → Crear pedido. Guidance copy no longer says Presentar/Convertir. |

Command allowlist: `RecordQuoteCustomerAcceptance` is in `UI_5A_COMMERCIAL_COMMANDS`. Server action: `recordQuoteCustomerAcceptanceAction` in `lib/commercial/actions.ts`. Labels and copy: `lib/commercial/quote-lifecycle.ts`.

## 2. API and read-model additions this step needed

- **Read model.** `QuoteSummaryReadModel` gains optional nullable `issuedAt`, `issuedDocumentHash`, `issuedRevisionNumber`, `customerAcceptedAt`. Without them the UI could not tell an issued quote from a legacy `submitted` one.
- **Migration** `20261020010000_os_quote_read_model_issuance_t04` adds four nullable columns to `os_quote_read_models`. `EXPECTED_MIGRATION_COUNT` is 41. **Not applied to any database in this step.** Apply it, then refresh or replay the quote projection. Until then, issued quotes read as not issued in the UI.
- **Endpoint** `GET /members/price-approver-options` (`MemberQueryService.listPriceApproverOptions`). Scope `member_active`. It applies the same rule as `RequestApproval`: role assignments through `computeEffectiveScopes` and `canApproveCommercialPrice`, not the caller. It reads at most five pages of 100 and reports `hasMore`; the UI says so when the list is truncated.
- The generated Prisma client was regenerated.

## 3. Tests

- `lib/commercial/quote-lifecycle.test.ts` (new): the seven labels, the acceptance action and allowlist, channel mapping, acceptance availability, self-exclusion, hash display, and the `prepareQuoteTarget` branches.
- Updated for the new labels and copy: next-step, linked-quote, post-approval-continue, product-picker, quote-builder (usability and hosted-corrective), quote-follow-up, quote-manual-send, quote-phone-progress, quote-post-send-state, guidance, mobile-390-proof, command-palette, who-has-the-ball, ct3-lane-b-commercial.
- os-query: the projection-consumer fixture has the T04 `QuoteRecord` fields and asserts the new read-model fields. os-api: the new GET is in the inspection-read inventory.

## 4. Remaining gaps

- **PDF hash pin.** The PDF is still rendered from the read model. It is not compared to `issuedDocumentHash`. The UI says so.
- **Price-approve range.** Not modelled. Any holder of `commercial.price.approve` is listed.
- **`boundRevision` is not shown.** The UI says a material change voids the approval. The server enforces it at Emitir.
- **Status label.** `submitted` still reads "Enviada" in `@isalwa/ui` status pills and in the timeline ("Cotización presentada"). Changing it touches `packages/ui` and many tests, so it is deferred.
- **Timeline label** for `quote.customer_acceptance.recorded` is missing from the os-web timeline labels.
- **Delegation and cargo** are not counted in the approver list (as in the domain rule).
- **os-api** `inspection-reads.adversarial` still fails on `GET /parties/:partyId/followup-preferences`, which is missing from its inventory at HEAD. This is not part of T04.
