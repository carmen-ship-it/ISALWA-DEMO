# Pilot leadership visibility V1

Provisional, reversible read default for demo and V1. Not Isa/Álvaro business policy.

Scopes are not assigned by this change. They are not inferred from Cargo, department, or `people.admin`.

## Read scopes

| Scope | Meaning |
| --- | --- |
| `commercial.team.read` | Read commercial records owned by **direct reports** only |
| `commercial.org.read` | Read org-wide opportunities, quotes, and open/overdue work in the same tenant |

Direct report means one active `managerMemberId` hop. No recursive hierarchy.

Personal attention stays the signed-in member's queue. Default opportunity and quote lists stay personal unless `visibility=team` or `visibility=org` is requested and the matching scope is present. Existing `people.admin` list behavior is unchanged and is not a substitute for these scopes.

## Not granted

- `people.admin`
- `master_data.admin`
- approval authority
- reassignment
- order conversion
- user administration

Orders stay on the existing owner / `people.admin` read. This pilot does not widen order reads.

## Reversal

Remove the role assignment. Callers without the scope receive `PERMISSION_DENIED` on `visibility=team` and `visibility=org`. Inicio hides those sections.
