# Receipt — T03 C5 follow-up: client import and the migration guard

Found by the os-database milestone suite after C8: 302/305 passing, plus the migration guard mismatch. Both were caused by C5 or C7 on this branch.

## 1. Client import broke on the C5 number contract

**Correction.** The tracked limitation written at C5 said `os-import` writes contacts directly. It does not. Import execute creates each contact through `UpdateContact`, so association history and identity review already applied. After C5 it sent `phone`/`whatsapp` as plain strings, so every imported row with a number failed with `VALIDATION_FAILED` after its party had been created.

**Fix:**
- `normalize-phone.ts`: `IMPORT_PHONE_COUNTRY = 'BO'`, declared because the client spreadsheet is Bolivian; never inferred from the digits. `normalizeBoliviaPhone` keeps its spreadsheet cleanup (Excel float, `591` without plus, leading zeros) and then applies the shared `normalizeContactNumber`.
- `import-command-service.ts`: execute sends `{ country: 'BO', number }` objects.

**Behaviour change.** Numbers that the shared rule refuses are now dropped in the dry run, the same way the import already drops invalid fragments. Before, they were accepted and then failed at execute. Examples: 7-digit nationals, and 8-digit numbers not starting with 2–4 or 6–7. The dry-run receipt does not count these as "extra phone not imported". Whether it should report them is an open question for the import UI lane.

## 2. Migration count guard

C5 (`20261018220000`) and C7 (`20261018230000`) added migrations, but `EXPECTED_MIGRATION_COUNT` stayed at 35. It is now 37, following the checkpoint rule. Staging fixture tooling still fails closed: it refuses any database without all 37 migrations. Nothing was applied outside the disposable database.

## Checks

Recorded in `evidence/T03-REVIEW-C5-FOLLOWUP-IMPORT/`:
- fixtures guard 30/30;
- os-import 29/29, including a new shared-rule case;
- party and import integration on disposable Postgres 23/23;
- mutation M12 caught (string phone at execute), source restored with identical sha256;
- os-web typecheck clean.

## States

TESTED locally. Not independently reviewed. No import was executed against shared data.
