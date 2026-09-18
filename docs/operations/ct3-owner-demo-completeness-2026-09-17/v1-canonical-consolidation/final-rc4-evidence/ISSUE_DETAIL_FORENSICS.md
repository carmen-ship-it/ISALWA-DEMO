# RC4 ISSUE_DETAIL forensics (no fix)

**RC4_SHA:** `9e1cfe3ee1f18e568b7f34254e5794cf49baa8b7`  
**Reproduced:** 2026-09-17 hosted Demo

## Capture

| Field | Value |
|-------|--------|
| ISSUE_ID | `01M2PRV5H1JTARSF3APN57PP0Y` (also `01M2PRV4BADXS6T1AGE2ZMZ0RX`) |
| ISSUE_STATUS | `in_progress` / `open` (DB) |
| ORG | SYNTH `01M2JKF77TXMJNDTKNCYNHH9G5` |
| ACTOR | `carmen.staging@isalwa.demo` (Conectado como Carmen) |
| VIEW_AS_STATE | OFF (owner evaluation) |
| DATA_MODE | Demo (`?datos=demo`, banner DEMO · DATOS FICTICIOS) |
| PAGE_ROUTE | `/incidencias/{issueId}?datos=demo` |
| SERVER_REQUEST | Next.js RSC render of `app/(app)/incidencias/[issueId]/page.tsx` |
| API_ROUTE | `GET /v1/issues/:issueId` via `createOsApiClient(...).getIssue(issueId)` |
| QUERY | path param issueId only |
| AUTH_DECISION | Not the failure mode: list shows issue under Demo; Carmen has `issue.manage`. Forbidden/not_found paths would render AccessDenied / “no encontrada”, not this string. |
| STACK / ROOT EXCEPTION | Non-`OsApiError` throw during page try-block → `classifyQueryError` fallback message exactly `Ocurrió un error al cargar la información.` (`lib/work/query-errors.ts` L24). That string is **only** returned when `err` is **not** an `OsApiError`. |
| EXPECTED BEHAVIOR | Issue detail with status, resolve affordance when authorized, journal, etc. |

## Root cause

**API/UI contract mismatch (serialization shape):**

1. `IssuesController.getIssue` returns a **flat** `IssueSummary` (`issueId`, `title`, …) — see `apps/os-api/src/issues.controller.ts` `toSummary` / `@Get(':issueId')`.
2. Web page does `const { issue } = await client.getIssue(issueId)` expecting `IssueDetailResponse` `{ issue: IssueDetail }` (`types.ts`), then reads `issue.title`, `issue.journal`, etc.
3. Destructured `issue` is `undefined` → TypeError → catch → generic QuerySurfaceState.

List endpoint works because it returns `{ items: IssueSummary[] }` which the list page consumes differently.

```
ISSUE_DETAIL_ROOT_CAUSE = API_GET_ISSUE_RETURNS_FLAT_SUMMARY_WHILE_WEB_EXPECTS_WRAPPED_ISSUE_DETAIL
CLASSIFICATION = SERIALIZATION
ISSUE_DETAIL_FIX_SCOPE = Align GET /v1/issues/:id (or web client adapter) to IssueDetailResponse { issue } including journal/relations/linkedWorkItems/version fields the detail page requires; preserve auth NOT_FOUND semantics
```

## Not yet implemented

Per Carmen order: forensics only. Belongs in RC5 P0.
