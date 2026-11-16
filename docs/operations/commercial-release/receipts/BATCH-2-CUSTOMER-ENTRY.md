# Receipt — Batch 2 customer entry / everyday self-service

Date: 2026-11-16. Integrator `/Users/carmen/projects/isalwa-wt-v1-repairs`, branch `ct3/v1-repairs`. Parent HEAD (Stage A): `11e4f38b1c7e637c66fda0f95a8bb1cc1233fb23`. Continuation: `CONTINUATION-2026-11-16.md` §7.

States: **IMPLEMENTED** · **TESTED LOCALLY**. Not independently reviewed. Not hosted. Not owner-accepted.

## What changed

| Gap | Behavior |
|---|---|
| Create gate | UI/shell use `actorCanCreateCustomer` (`commercial.customer.create` or steward), not steward-only. Helper/reader cannot register. |
| Labels | “Clientes”, “Registrar cliente”, “Buscar por nombre, teléfono o empresa”, “Editar datos”, “Guardar cambios”. |
| V2 §5.4 registration | Form collects contact + Bolivia phone (or “Sin teléfono disponible”); advisors cannot set legalName/NIT/email; shared phone → `DUPLICATE_REVIEW_REQUIRED` then required `duplicateReason` (no silent merge). |
| Import text→batch | Steward paste panel parses documented section-B rows → `ValidateClientImport` → `?lote=` phone review. `?lote=` alone is not presented as complete file import. |
| Archive payments | Unchanged: `PAYMENTS_UNVERIFIED_LABEL` (T07 unknown; never “Pagos: 0”). |

## Checks

Disposable DB: `isalwa_stage_a_disposable` @ `localhost:54329` / socket `/tmp`. Ports 4001 / 3200. Synthetic Stage A fixtures only.

| Check | Result | Evidence |
|---|---|---|
| HTTP create / deny / no-phone / duplicate / import | BATCH2_HTTP_OK true | `evidence/BATCH-2-CUSTOMER-ENTRY/http-results.txt` |
| os-web unit (party + import parser) | 27/27 | `evidence/BATCH-2-CUSTOMER-ENTRY/web-unit.txt` |
| os-web suite | see `web-test.txt` | `evidence/BATCH-2-CUSTOMER-ENTRY/web-test.txt` |
| Local browser (Chrome channel) | `ok: true` | `evidence/BATCH-2-CUSTOMER-ENTRY/browser-results.json` + PNGs |
| `tsc` / `next build` with `NEXT_PUBLIC_OS_API_URL=…/v1` | exit 0 | `.tmp/batch2-web-build2.txt` |

## Limits

- Independent review: not done.
- Binary spreadsheet upload UI: not invented; bounded text paste covers the approved section-B contract.
- Real customer import / ExecuteClientImport: not run (disabled / restricted).
- Hosted / live: UNPROVEN.

## Next

Batch 3 — T04 quotes / approval / immutable PDF / manual order (`CONTINUATION-2026-11-16.md` §8).
