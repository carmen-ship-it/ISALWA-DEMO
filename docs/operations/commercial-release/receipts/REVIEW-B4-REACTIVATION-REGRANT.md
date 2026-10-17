# Receipt — B4: reactivation does not restore previous authority

Sources:
- 23:47 §B item 4. "Reactivation must not silently restore previous commercial authority. Require authorized review/regrant, including primary-role-derived authority, using existing lifecycle/grant primitives where possible. Do not invent a parallel permissions system."
- `RE-REVIEW_R4_QUEUE.md` §3 note: "Role assignments revive on reactivation … Recommendation: the reactivation screen shows the grants that will apply again, or reinstatement starts with only the primary role."

## 1. Problem

Suspension never ended role assignments. `ActivateMember` on a suspended member ended delegations and received coverage (R4 reactivation, `REVIEW-R4-REACTIVATION.md`). Every role assignment came back as it was:
- additional commercial grants such as `commercial.customer.create` or `commercial.quote.convert.own`;
- a primary role that is itself a permission, such as `people.admin`.

## 2. Change: existing primitives only

**Command (`os-workforce`, `activateMember`)**
- On reinstatement (suspended → active), in the same transaction, every open role assignment whose key confers authority is ended at the activation time:
  - selection is `roleKeysThatConferAuthority`, the same gate `computeEffectiveScopes` uses;
  - ending uses `endActiveRoleAssignmentsForKey`, the store primitive behind `ChangeRole` and `EndAdditionalRole`.
- **Job-title labels** (for example `sales_rep`, `Asesor`) stay; they confer nothing.
- **Rows are kept** with `endedAt` set, so history is preserved. The `member.activated` payload lists `endedRoleKeys`.
- **First activation of an invited member** is not a reinstatement. The role given at invitation stays.

**Regrant: no new mechanism**
- Additional permissions come back through `GrantAdditionalRole`. The grantor must hold the scope in their own right and be within reach; people.admin alone is refused.
- A primary role that is a permission comes back through `ChangeRole`, with its usual checks and preview.
- So the "authorized review" is the existing grant path. Nobody, including the admin who reactivates, gets authority back as a side effect.

**UI (`member-admin-actions-panel.tsx`)**
- The "Reactivar acceso" panel lists the permissions that will end (`reactivationEndedRoleKeys`, which mirrors the command) and says they are assigned again only after review. It also says delegations and received coverage do not come back.
- The success message says previous permissions were not restored. The guidance catalog line is updated to match.

## 3. Checks (evidence `evidence/REVIEW-B4-REACTIVATION-REGRANT/`, allowlisted lines; sources in `tested-source-manifest.sha256`)

| Check | Result |
|---|---|
| Build (`@isalwa/os-api^...`) | exit 0 |
| Typecheck os-contracts, os-workforce, os-query, os-api, os-web | exit 0 each |
| Unit `reactivation-lifecycle.test.ts` (3 new) | 8/8 |
| New HTTP + PG `review-b4-reactivation-regrant.http.test.ts` | 3/3 |
| os-contracts / os-workforce / os-query | 185 / 148 / 114, 0 failures |
| os-api (serial, established command) | 292/292 |
| os-database (serial, disposable PG) | 303/303 |
| os-web lib + components | 1301/1301 |

Mutations (`mutations.txt`), run inline; sources restored with sha256 verified:

| Mutation | Caught by |
|---|---|
| M1: reinstatement ends no role assignment | unit 1, HTTP 3 |
| M2: only `commercial.*` grants end (primary scope survives) | unit 1, HTTP 1 |
| M3: UI note lists no permissions | os-web 1 |

What the HTTP test shows (real `SuspendMember` then `ActivateMember` over HTTP):
- **Seller (`sales_rep`, customer create, own-quote convert):**
  - creates a customer before;
  - after reinstatement, `endedRoleKeys` lists both grants, only `sales_rep` stays active, both rows are kept as ended, and `CreateParty` gets 403.
- **Regrant:**
  - people.admin without the scope gets 403 on `GrantAdditionalRole`, with no write;
  - an admin who holds the scope grants it (201), and the seller creates a customer again;
  - quote conversion stays off because it was not granted again.
- **Primary role as permission (`people.admin`):** it ends at reinstatement (`GET /v1/members` 403) and returns only through `ChangeRole` (200 afterwards).

## 4. Status and limitations

- IMPLEMENTED; LOCALLY TESTED. **Not independently reviewed.** BROWSER CHECK UNPROVEN: the reactivation panel wasn't opened in a browser.
- **Manager range is not ended.** Manager assignments where the reinstated member is the manager stay; the reports keep their manager. Removing that range would change the reports' structure, so it is a decision (BUSINESS_DECISION_REQUIRED). B2 already lists direct reports as unresolved ownership at suspension, and `ChangeManager` is the existing tool.
- **Reserved technical scopes** held as role assignments also end, and come back only out of band (they are never granted through a command).
- **Members reactivated before this change** keep the grants that revived; there is no backfill. A dry-run listing like `REVIEW-R4-BACKFILL-DRYRUN.md` would be needed.
- There is no "restore the same grants" shortcut on purpose: each grant goes through its own grantor check.
