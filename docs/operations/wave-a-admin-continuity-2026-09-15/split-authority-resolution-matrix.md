# Wave A close — split-authority resolution matrix

**Date:** 2026-09-15  
**Deploy candidate:** `a97e17e156f58648beac4c0cd78d3245cc614e85`  
**Invariant:** `people.admin` does **not** imply commercial or approval authority.

| Blocker | people.admin resolve directly? | Other authority | Exact command | Required scope | UI on member detail | If people.admin unauthorized |
| --- | --- | --- | --- | --- | --- | --- |
| Work (open) | **YES** | — | `ReassignWork` | `people.admin` | **Trabajo activo** | N/A |
| Commercial account | **NO** | Commercial account reassign | `ReassignCommercialAccountOwner` | `commercial.account.reassign` | Links under Continuidad comercial | Spanish: needs distinct commercial permission; ask account admin; client links |
| Opportunity (open) | **YES** (may assign any open) | Owner / commercial edit paths | `AssignOpportunityOwner` | `people.admin` (admin path) | **Reasignar oportunidades** | N/A for admin |
| Quote (non-cancelled) | **NO** | Cancel quote (owner/authorized) | `CancelQuote` only — **no AssignQuoteOwner** | existing commercial cancel auth | Links + fail-closed copy | Explains no reassignment; open quote to manage/cancel |
| Order (open) | **NO** | Cancel order | `CancelOrder` only — **no AssignOrderOwner** | existing commercial cancel auth | Links + fail-closed copy | Explains no reassignment; open order to manage/cancel |
| Pending approval (assigned approver) | **NO** | Assigned approver or `approval.act` delegate | `Approve` / `Reject` | `member_active` + gate | Link to `/aprobaciones` | Explains must decide; no reassign approver |
| Direct reports | **YES** | — | `ChangeManager` (per report) | `people.admin` | Organización / Continuidad responsable | N/A |
| Active delegation FROM/TO | **YES** | — | `RevokeDelegation` | `people.admin` | Delegaciones | N/A |
| Customer coverage (primary) | **NO** | **FOUNDATION_GAP** — no Grant/Revoke/ReplaceCoverage command | none | — | Responsabilidades + Continuidad comercial | Spanish: fail-closed; ask who manages commercial coverage; people.admin does not gain coverage authority |
| Customer coverage (acting / temporary) | **NO** | **FOUNDATION_GAP** | none | — | same | same |

No capability strings in operator UI.
