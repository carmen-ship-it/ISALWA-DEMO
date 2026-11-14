# Local browser check — Lane B T03 customer UI

Code: `edcdfe555e1b664fddc70da3a76599e817220019`
os-web: `next dev` on `localhost:3220`
os-api: `tsx src/main.ts` on `localhost:4220`, `OS_AUTH_MODE=dev`
Database: `isalwa_laneb_disposable` at `localhost:54329` (socket `/tmp`)

The database had 35 applied migrations and did not yet have the four additive T03 migrations (`20261018220000` through `20261019010000`). The columns and tables were absent, so this was not the drifted template. `prisma migrate deploy` applied those four. `isalwa_t01_disposable` was not migrated or copied.

## Identities

`Entrar (desarrollo)` on `/login` created a new synthetic organization and a `people.admin` member and landed on `/inicio` as "Conectado como Admin". That admin opened the other organization's customer and saw "Cliente no disponible" / "No se encontró este cliente o no está disponible."

The five contract roles do not exist on that login button. They were created in one synthetic organization with `PrismaOsWorkforceStore.seedAdminMember`, then `people.admin` was removed and the role rows below were written, the same shape as `apps/os-api/src/t03-customer-authority-flags.http.test.ts`. The browser then sent the `os_dev_session` cookie that `devBootstrapAction` writes. The API still authorized each member.

| Role | Role keys | Coverage |
|---|---|---|
| owner | `commercial.customer.create`, `commercial.customer.edit` | account owner |
| coverage-edit | `commercial.customer.edit` | `commercial.work`, `customer.edit` |
| coverage-work | `commercial.customer.edit` | `commercial.work` |
| steward | `master_data.admin`, `commercial.org.read` | none. `commercial.org.read` is required for a steward to open the customer; `master_data.admin` alone is 404 in the API test |
| reader | `commercial.org.read` | none |

Customer: synthetic organization "Ferreteria UI", one active contact "Ana Quispe" created with `UpdateContact` as the owner.

## Customer record

| Control | owner | coverage-edit | coverage-work | steward | reader |
|---|---|---|---|---|---|
| Legal name text "Ferreteria UI S.R.L." | present | present | absent | present | absent |
| `input[name=displayName]` | 1 | 1 | 0 | 1 | 0 |
| `input[name=legalName]` | 0 | 0 | 0 | 1 | 0 |
| `input[name=endsOn]` (grant form) | 0 | — | 0 | 0 | 0 |
| Change / retire number | present | present (`newPhone` 1) | absent | present | absent |
| Masked history `•••567` | present | present | absent | present | absent |
| "Compromisos abiertos del cliente" and "Envíos automáticos no configurados." | present | present | absent | present | absent |
| "No más promociones" and "No me escriban" | present, select empty, identity checkbox unchecked | same (3 selects, value empty, checkbox unchecked) | absent | same | absent |
| Archive button and "Pagos: no verificados en esta versión" | absent | absent | absent | present | absent |
| "Solicitar corrección de datos" | present | present | present | present | present |
| Both coverage grants listed (active, helper, actions, dates) | present | present | present | present | present |

The grant form stays hidden because `commercialAuthority.canManageCoverage` is false for these roles. The API test already asserts `owner.canManageCoverage === false`. No revoke control was shown.

## List and correction queue

Steward `/clientes`: "CONSULTAR IDENTIDAD DE UN CLIENTE" and "REVISAR TELÉFONOS DEL LOTE" with an empty batch field. The other four roles do not get that block.

`/incidencias?view=correction_attention` for all five: "Sin permiso para esta sección". None has `issue.manage`, and the Correcciones tab is absent (`a[href*=correction_attention]` count 0 on the customer page).

## Refusal

`POST /v1/commands/UpdateParty` as coverage-work returned `403` `{"code":"PERMISSION_DENIED"}`. The display-name field is also absent for that role.

## Not exercised in the browser

Grant submit, revoke, identity-review resolution, reveal, ending the relationship, a former-contact line, follow-up submit, archive or reactivate submit, an import batch with rows, and the correction resolve form including `CORRECTION_VALUE_DIFFERS`. Those stay IMPLEMENTED and unit-tested where a builder test exists, and UNPROVEN as a browser action.
