# Custody and local acceptance — Lane B T03 customer UI

Date: 2026-11-13. Integrator: Control Tower (not the builder). State: **INTEGRATED locally at `c1c185ec`** (TESTED + LOCAL BROWSER CHECK). Not hosted, not user-accepted.

## Custody

| Item | Value |
|---|---|
| Candidate | `ac132021591bc818ebf666a5f0e124bcd9360796`, tree `b6950b9df7a5ff5095178a07e502f27c91062341` |
| Branch / base | `ct3/t03-customer-ui` / `95def36aae9f1ccc43116b6d40ba6da069fdfe94` |
| Frozen tag (local, annotated) | `review/t03-customer-ui-ac132021` |
| Review packet | `review-packets/REVIEW-PACKET-LANE-B-T03-CUSTOMER-UI.md` |
| Boundaries | 32 changed files, all inside the assignment's allowed set; no new dependencies |
| Candidate suite (acceptance copy at the tag) | os-web 1328/1328, `tsc` exit 0 |
| Builder worktree | untouched, clean at `ac132021`; builder servers on 3220/4220 left running |

## Integration fixes

Branch `ct3/t03-integration-fixes` (worktree `isalwa-wt-t03-integration-fixes`), one commit on top of the tag:

`71069113` fix(os-web): T03 integration fixes for legal-name drawer, coverage labels, former-contact end

1. **C2 legal name.** `customerAuthority.canEditLegalName` now passes page → `Cliente360Header` → `Cliente360ActionsMenu` → `CustomerEditForms` in the "Editar cliente" drawer (gated by `allowMutations && canEditParty`). Test: `cliente360-ux.test.ts`.
2. **C4 coverage labels.** `loadCliente360` resolves the acting advisor and recorder of every `coverageGrants` entry; the duplicate lookup in the page is removed. Test: `load-cliente-360.test.ts`.
3. **L1 former contact (confirmed mismatch).** The page took end date and reason only from the 20-item timeline window. The API returns `relationEndedAt` / `relationEndReason` on every contact; `lib/party/types.ts` now declares them and `contactRelationEnd` falls back to them. The note still comes only from the timeline. Test: `customer-self-service.test.ts`.

Not done, by instruction: no invented contact fields, no spreadsheet parser. The import review opens an existing batch (`?lote=`); creating a batch from a file stays a tracked gap.

Checks on `71069113`: os-web **1331/1331** (1328 + 3 new), `tsc` exit 0, `next build` exit 0 (`evidence/LANE-B-T03-ACCEPTANCE/`). ESLint is not configured for os-web in this repo (no flat config); not part of the evidence.

## Migration reconciliation

The builder receipt says the database was "35 migrations behind". That is wrong: it had **35 applied** and was **4 behind**.

`isalwa_laneb_disposable` (cluster `~/.isalwa-disposable-pg/commercial-v2`, port 54329):
- Before: 35 applied, `20260823120000_os_foundation_step10` … `20261016230000_os_customer_maintenance_t03`.
- Applied 2026-11-13 16:16: `20261018220000_os_contact_endpoints_t03`, `20261018230000_os_contact_identity_review_superseded_t03`, `20261019000000_os_issue_correction_requests_t03`, `20261019010000_os_issue_correction_evidence_t03`.
- After: 39, none failed or rolled back.

Other databases on the cluster: `isalwa_lanea_browser_disposable`, the four `isalwa_r4a_*_disposable`, `isalwa_review_t03_disposable` and `isalwa_t01_disposable` (the drifted template) are untouched at 35. `isalwa_integration_browser_disposable` (integrator, 39 applied 2026-11-13) and `isalwa_t03_acceptance_disposable` (this acceptance, created fresh, 39 applied) are integrator-owned. No port 5432, staging or hosted database was used.

## Local browser acceptance

Setup: os-api `tsx src/main.ts` on 127.0.0.1:4001 (`OS_AUTH_MODE=dev`), os-web `next start` on localhost:3200 from `71069113`, database `isalwa_t03_acceptance_disposable`. Fixtures: an untracked local seed script (`apps/os-api/.tmp-t03-acceptance/seed.ts` in the fix worktree, never committed) that refuses any other database. Synthetic members got explicit role rows, the same shape as `apps/os-api/src/t03-*.http.test.ts`. Customer data was created through the API as the authorized member. Browser sessions used the `os_dev_session` cookie; the API authorized every request. No owner permission was widened.

| Member | Role keys |
|---|---|
| owner (account owner) | `commercial.customer.create`, `commercial.customer.edit` |
| helper | `commercial.customer.edit` |
| coverage manager | `commercial.account.reassign`, `commercial.assignment.org`, `commercial.org.read`, `commercial.customer.edit` |
| steward | `master_data.admin`, `commercial.org.read` |
| issue manager | `issue.manage` |
| reader | `commercial.org.read` |
| outsider | `commercial.customer.edit` (no relation to the customers) |
| other-organization owner | own organization only |

Correction resolver: the account owner, assigned by the issue manager, which is the contract path (`AssignIssueOwner` requires the assignee to know and be able to edit the customer).

### Results (observed)

| Flow | Result |
|---|---|
| Coverage grant validation | 47-day window refused: "El apoyo temporal dura como máximo 30 días…"; nothing stored |
| Coverage grant | Coverage manager granted both offered actions to the helper; after reload: "Activo: Hugo Apoyo Sintético · Asignado por Carla Coordinadora Sintético · 13 nov – 21 nov · Cubre: Continuar oportunidades y cotizaciones · Editar datos del cliente". The helper then had edit and number controls |
| Coverage denied | Owner: no grant form, no revoke; API `GrantCustomerCoverage` as owner and as outsider → 403 |
| Coverage revoke | "Quitar apoyo temporal" → after reload "No hay apoyos temporales vigentes ni programados"; the helper lost edit and number controls |
| Identity review | New holder sees only the notice; the former customer is never shown. Stale submit (contact changed behind the open form) → "la página quedó desactualizada… No se creó un duplicado", nothing written. Fresh submit → history "identidad confirmada, número en uso · Confirmación presencial · Nota…" |
| Justified reveal | 5-character reason blocked; valid reason shows `+59170011002` in place, masked again after reload. One `contact.endpoint.revealed` event carrying the justification and no number. Reader: no history or reveal form; API reveal → 403 |
| Relationship end | "Otro" with a short note → "Describa el motivo (entre 10 y 500 caracteres)." Valid → "Contacto anterior · 2026-11-10 · Otro · Se jubiló…"; end form gone; summary switched to the remaining current contact. API `UpdateContact` on the ended contact → CONFLICT |
| Follow-up | Empty select and unchecked identity box on load. "Permitir seguimiento" without identity → contract message. "No más promociones" saved (v1), then "Permitir seguimiento" with identity and note (v2); each shown after reload |
| Archive refusal | 1 open commitment and 1 open work item: controls disabled with "Hay obligaciones abiertas…"; a forced submit was refused by the server; party unchanged (active, v0) |
| Archive / reactivate | After closing both obligations: steward archive → "Inactivo", reactivation form shown; reactivate → "Activo". Reader and owner `DeactivateParty` → 403; stale steward version → CONFLICT |
| Legal name drawer (fix 1) | Steward: legal-name field in "Editar cliente" drawer; "Indique el motivo del cambio." without a reason; saved with a reason and shown after reload; history "Razón social: — → … · Motivo: …". Owner: no field; API `UpdateParty` legal name → 403 |
| Import review | Steward, batch of 4 synthetic rows from `ValidateClientImport`: 1 accepted, 3 to fix. Correction "123" → "Revise los datos…"; row 2 corrected, row 3 omitted; stale second tab → "La fila cambió…". After reload: accepted 1, corrected 1, omitted 1, still to fix 1. Reader: no panel, no originals; other organization `ListImportPhoneReview` → 403 |
| Correction queue | Issue manager sees both synthetic corrections. Assigning the outsider and resolving without a decision were refused (no events). Owner assigned to both |
| Correction applied | After a rename to a value different from the request: "El valor registrado difiere… Explique la diferencia"; with the explanation → "Resuelto", stored `decision=applied`, `value_matched=false`, explanation and applied event present |
| Correction rejected | Only-reject path ("No hay cambios citables…") → "Corrección · Rechazada"; stale second tab refused without a duplicate |
| Denied access | Reader: read-only customer, no queue ("Sin permiso para esta sección"). Outsider and other organization: "Cliente no disponible". Other organization on the issue URL: "Incidencia no encontrada" |
| History | Customer history lists legal-name change, both follow-ups, relationship end with date/reason/note and contact updates, each with the actor |

All persisted state was cross-checked in the acceptance database (business events by type, correction records, contact end fields, coverage grant revoked).

### Follow-up select

The follow-up select is empty by design: `required`, a disabled "Elija" option, and the current value displayed above ("Teléfono: Sin preferencia registrada" / "No más promociones" / "Permitir seguimiento"). L2 defines no default and requires an explicit staff record. **Not a defect.**

## Findings

No blocking finding from this acceptance. Non-blocking follow-ups:

1. Action forms clear the user's entries after a validation error (React form-action reset); the error stays visible. Seen on relationship end; same pattern elsewhere.
2. Refusals for assigning an ineligible owner and for resolving a correction without a decision show only "Revise los datos ingresados e intente de nuevo."
3. The issue manager is offered the generic "Resolver incidencia" form on a correction issue, which the server refuses.
4. Coverage grant and revoke appear as "Actividad registrada" in the customer history (no web label for `customer_coverage.*`; predates T03).
5. Coverage end date entered as "Hasta 20 nov" is displayed as "21 nov, 12:00 a. m.".
6. The contact drawer still offers "Editar contacto" for an ended contact; the server refuses it (CONFLICT).
7. The Cliente 360 summary card shows a number under identity review as the customer's phone; the contact row beside it shows "En revisión de identidad". C5 excludes it from the quote PDF and customer list (verified: list `primaryPhone: null`); the summary card is not named in the contracts. Product decision.
8. Correction candidate events show a raw ISO timestamp; the issue page shows the related customer as a raw ID for a viewer who cannot read the customer.
9. No spreadsheet parser: a batch must already exist (`ValidateClientImport` via API). Tracked gap; C9 reviews an existing batch.

## Remaining gaps

- Independent review: PASS WITH FOLLOW-UPS, no blocking findings (`isalwa-transfer-readiness/review-packets/REVIEW-LANE-B-T03-ac132021.md`). Its required items are resolved: legal-name drawer and former-contact fields (`71069113`), coverage labels (`71069113`), receipt migration sentence (`f7baee8a`).
- Integrated: merge `c1c185ec` into `ct3/v1-repairs`. On `c1c185ec`: os-web 1331/1331, `tsc` exit 0, `next build` exit 0.
- Reviewer follow-ups not fixed (non-blocking): archived customers still show contact and number forms the API refuses (permission flags ignore archived status); former contacts still show change/retire/identity-review forms; raw commitment state codes and ISO dates in the relationship-end preview; an optional 1–9 character note on a non-"other" reason gets a generic refusal; correction-read failure falls back to the generic resolve form; up to three extra API calls per contact; two display-name edit forms and a few non-design-system elements; no tests for archive/reactivate payload builders; commit `29e6c9e8` does not build alone; contacts deactivated by an import reversal show as "Contacto anterior" without an end date.
- Import execution (`ExecuteClientImport`) was not exercised in the browser.
- Hosted proof: UNPROVEN (no hosting).
