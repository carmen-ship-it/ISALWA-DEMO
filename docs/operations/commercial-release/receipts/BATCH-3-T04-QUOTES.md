# Receipt — Batch 3 T04 quotes / approval / PDF / order

Date: 2026-11-16. Integrator `/Users/carmen/projects/isalwa-wt-v1-repairs`, branch `ct3/v1-repairs`. Parent HEAD (Batch 2): `5737c17b172eafd83bff067503251c44ad2dabf0`. Continuation: `CONTINUATION-2026-11-16.md` §8. Detail: `T04-DOMAIN-API.md`, `T04-UI.md`.

States: **IMPLEMENTED** · **TESTED LOCALLY** (package/unit + disposable PG migrations). Not independently reviewed. Not hosted. Not owner-accepted. Real first approver identity remains blocked for live activation (synthetic `commercial.price.approve` OK locally).

## Lifecycle wired

draft → Solicitar aprobación (exact revision, `commercial.price.approve`, no self-approve) → Emitir (`SubmitQuote` + issued hash) → Descargar PDF (hash disclosed, bytes not pinned) → Registrar aceptación → Crear pedido.

| Step | UI | Server |
|---|---|---|
| Preparar cotización | Cliente 360 + next-step / palette | Existing CreateQuote / opportunity path |
| Guardar borrador | Quote editor header | UpdateQuote* |
| Solicitar aprobación | Draft panel; eligible price-approver select | RequestApproval + boundRevision |
| Emitir cotización | Replaces Presentar | SubmitQuote requires current approval; sets issued* |
| Descargar PDF | Existing download + hash disclosure | Live render; hash not compared |
| Registrar aceptación | New section | RecordQuoteCustomerAcceptance |
| Crear pedido | Replaces Convertir a Pedido | CreateOrder requires accepted + current approval; unique (org, quote) |

## Migrations (disposable only)

- `20261020000000_os_quote_issuance_acceptance_t04`
- `20261020010000_os_quote_read_model_issuance_t04`
- `EXPECTED_MIGRATION_COUNT` = 41. Applied to `isalwa_stage_a_disposable` @ 54329.

## Checks

| Check | Result |
|---|---|
| os-contracts / os-commercial / os-work / os-database (disposable) | Pass per domain work (incl. lifecycle unit + PG concurrency) |
| os-web suite | 1356/1356 |
| Typecheck os-web / os-api / packages touched | exit 0 |
| inspection-reads inventory | Added party `followup-preferences` + price-approver-options |

## Limits / blockers kept distinct

- Independent review: not done.
- PDF not pinned to `issuedDocumentHash`; discount/units/validity in PDF still incomplete.
- Price-approve **range** not modelled (any holder of the scope may approve).
- Status pill still says “Enviada” for submitted/issued (deferred; many UI package tests).
- Real approver identity / thresholds: not invented; live activation blocked.
- No WhatsApp provider send; manual send remains human declaration only.
- No push / deploy / real data.

## Next

Batch 4 — catalog (independent review of candidate first), or continue Batch 5 conversations if catalog remains blocked.
