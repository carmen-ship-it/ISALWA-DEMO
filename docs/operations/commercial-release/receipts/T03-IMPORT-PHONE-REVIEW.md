# Receipt — client import: no silent phone data loss

Instruction 2026-10-18 22:56 §1. Commit `39b6a9b8`. It replaces the dry-run dropping introduced in `70617a5e`.

## Behaviour

- **Every value is kept.** For each customer row, the restricted import record stores:
  - the batch country and whether it was explicit or the recorded Bolivia default;
  - the original Celular and Teléfono cell text;
  - every value read from the cells, with its original text, spreadsheet cleanup applied, shared-rule result and refusal reason.

  Nothing is dropped. A fractional Excel number is flagged instead of being truncated.
- **Counts.** The receipt reports accepted, invalid, corrected, omitted and extra values, plus the number of rows needing correction. It lists each value that is not a plain stored number, with the row, a masked original (`•••345`), the reason and the proposed action:
  - `correct_or_omit`;
  - `import_corrected`;
  - `import_without_number`;
  - `keep_in_import_record_only`.
- **Originals only to reviewers.** `ListImportPhoneReview` returns the original values. It requires `master_data.admin`, the same scope as every import command, and its result is never sealed into the replay table. Receipts, events and audit payloads carry masked values and counts only.
- **Explicit decisions.** `ResolveImportPhoneValue` takes `correct` (with a number that must pass the shared rule) or `omit`. Each decision requires:
  - a reason of 10–500 characters;
  - the row version as listed.

  It records the actor, time and reason in the row. The decision, the recomputed batch receipt, the event (`import.row.phone_resolved`), the outbox message and the audit entry commit in one transaction with a version check.

  Additional rules:
  - A stale version is `CONFLICT`.
  - Values that passed the shared rule cannot be rewritten through review.
  - Decisions close when the batch is imported or rolled back.
- **Possible duplicates.** A corrected number that belongs to an existing customer, or to another row in the batch, turns a `CREATE` row into `POSSIBLE_DUPLICATE` (`CORRECTED_PHONE_MATCH`).
- **Execution gate.** Execution refuses the whole batch with `IMPORT_PHONE_REVIEW_REQUIRED` (409) while any row it would create has an unresolved value. Nothing is written. Batches dry-run before this change have no provenance and are refused with `IMPORT_DRY_RUN_OUTDATED` (409); they must be dry-run again. Imported numbers go through `UpdateContact` with the batch country.
- **Existing contacts.** Execution writes only rows to create. A matched or possible-duplicate row never touches an existing contact, so a failed new value cannot blank a valid stored number. A regression test covers this.
- **Omission does not mean "no phone".** The contact is created without that number, and the import record keeps the original and the reviewer's decision.

## Country and validator

- The batch payload accepts `phoneCountry` from `CONTACT_PHONE_COUNTRIES`. Only `BO` exists today, so the default is visible in every receipt and in the review read. It can be overridden once the shared contract adds countries.
- `checkContactNumber` (os-contracts) returns the shared rule's refusal reason:
  - `unsupported_country`;
  - `empty`;
  - `invalid_characters`;
  - `other_country_code`;
  - `wrong_length`;
  - `unassigned_leading_digit`.

  `normalizeContactNumber` is built on it, with unchanged verdicts.
- No new prefix restriction was added. The 21:22 decision fixes one canonical rule with explicit country and no inference from digit count. It does not fix leading digits. The Bolivian rule (8 digits, starting with 2–4 for landlines or 6–7 for mobiles) is the C5 engineering default.

  The repo's only workbook profile (`docs/data/CLIENT_DATA_INTAKE_MAPPING_PLAN.md`) is structural:
  - Celular arrives as Excel numbers, sometimes several per cell;
  - Teléfono is empty.

  No real values were inspected. Values failing only the leading-digit check are reported as `unassigned_leading_digit`, so a reviewer decides them explicitly. **DATA_CONFIRMATION_REQUIRED:** confirm the leading-digit rule against a representative extract before any real import.

## Atomicity: what holds and what does not

- **Holds:**
  - The execution gate refuses before any write.
  - Each reviewer decision is atomic with its receipt, event, outbox and audit (M14).
  - Retrying a decision with the same key replays it without a second version or event.
  - Retrying execution after success returns the stored receipt; after a mid-run failure, per-row keys replay finished writes.
- **Does not hold:** an import batch is not one transaction. Each row is written by separate party, contact and location commands. A failure mid-batch leaves earlier rows written until the retry or the batch reversal. This is unchanged and recorded.

## Checks

Recorded in `evidence/T03-IMPORT-PHONE-REVIEW/`:
- The new integration suite has 6 tests covering:
  - the mixed batch and the gate, with nothing written;
  - masked receipts and events;
  - originals in review, not in replay;
  - correction and omission, with stale, invalid and valid-value refusals;
  - same-key replay;
  - import of decided values and closure after import;
  - an existing valid number preserved;
  - a corrected-number duplicate;
  - transactional rollback of a decision;
  - legacy batch refusal.
- Mutations M13 and M14 were caught.
- Milestone at `39b6a9b8`: all suites listed in the evidence passed in full, with no failures.

## Assigned, not done

Import UI wiring (dry-run review table, decision form, country display) belongs to the customer UI lane; no os-web import client exists. The contract is in `contracts/T03-CUSTOMER-UI-CONTRACTS.md` §C9. Not independently reviewed. Browser: UNPROVEN. No import was run against shared data.
