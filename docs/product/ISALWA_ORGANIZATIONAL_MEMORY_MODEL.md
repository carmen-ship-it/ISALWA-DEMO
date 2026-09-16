# ISALWA Organizational Memory Model

**Wave:** B — Issue / Resolution Memory  
**Status:** Canonical product model  
**AI in this wave:** OFF (evidence substrate only)

---

## What organizational memory is

Organizational memory is an **authorized read / evidence layer** over canonical business records. It is **not** a second source of truth and **not** a vector/AI store.

| Memory facet | Canonical source |
|--------------|------------------|
| Relationship | Party / customer history |
| Issue / Resolution | `OsIssue` lifecycle + journal + resolution cycles |
| Work | `OsWorkItem` |
| Decision | Approval / Coordination / BusinessEvent (where proven) |
| Commitment | `OsCommitment` |
| Operational | Existing domain records/events |
| Knowledge / SOP | Future governed knowledge |

Authorization is applied **before** any evidence text leaves the server.

---

## Issue vs Work

| | Issue | Work |
|---|-------|------|
| Meaning | Problem / exception / investigation / resolution / precedent | Task / action / due execution / completion |
| Engine | `@isalwa/os-issue` | `@isalwa/os-work` |
| When action needed | Issue → **linked** Work | Work stands alone |

**Never** duplicate Work inside Issue (`IssueTask` / `IssueTodo` forbidden).

---

## Issue vs Product Feedback

| | Business Issue | Product Feedback |
|---|---------------|------------------|
| About | Customer / operations / company problem | How ISALWA the product feels |
| Aggregate | `OsIssue` | `OsProductFeedback` |
| Auto-create Issue from feedback? | **No** | — |

---

## Issue lifecycle

`reported → triaged → in_progress → resolved → closed`  
`resolved|closed → reopened → in_progress`

Commands only — no generic status PATCH.

---

## Possible cause ≠ Confirmed cause

- **Possible cause:** journal entry type `possible_cause` (hypothesis).
- **Confirmed cause:** governed fields on Issue + `ConfirmIssueCause` (`issue.manage`).
- No automatic promotion. No AI.

---

## Resolution ≠ Outcome

- **Resolution:** how the problem was addressed (`ResolveIssue`).
- **Outcome:** what happened afterward (`RecordIssueOutcome`).
- Work completed ≠ Issue resolved.
- Close is explicit. Reopen preserves prior resolution cycles (append-only).

---

## Commitment semantics

Existing `OsCommitment` foundation (not a second aggregate):

- Who promised (`createdBy` / origin)
- What (`text`)
- Follow-up owner (`ownerMemberId`)
- Due (`dueAt`) — overdue = deterministic calendar day `America/La_Paz`
- Origin includes `employee_entered`, `human_confirmed_suggestion`, `customer_reported`
- **Customer-reported commitment ≠ payment confirmed**

Commitment ≠ Work (promise vs execution).

---

## Precedent retrieval (Antecedentes relacionados)

Deterministic, no AI:

- Explicit Issue relations (`related`, `previous_occurrence`, `recurrence_of`)
- Same authorized customer / structured shared references

Only Issues the viewer may read. Label: **Antecedentes relacionados** — never “IA encontró…”.

---

## Evidence service

Provider-neutral authorized retrieval (`memory-evidence-service` / `GET /v1/memory/evidence`):

- evidence type, canonical id, title, summary, occurredAt, provenance, deep link
- Filter authorization **before** return
- No snippet leakage for unauthorized records

---

## AI future boundary

Future AI may summarize, compare, surface precedent, suggest next steps.

AI may **never** independently: approve, confirm payment, confirm root cause, resolve/close Issue, change price, grant permission, terminate, merge identity, or alter business truth.

Wave B: **no** OpenAI SDK, embeddings, vector DB, AI keys, or `AI_ENABLED`.

---

## Termination continuity

Canonical collector `collectTerminationImpact` includes:

- `owned_issues` — active Issue current owner
- `open_commitments` — open Commitment follow-up owner
- Wave A coverage categories (no regression; no coverage mutation invented)

Reassignment changes current responsibility only. History remains.

---

## Nothing Disappears

Closed ≠ deleted. Reassignment ≠ history rewrite. Reporter / prior owners / journal authors remain attributable.
