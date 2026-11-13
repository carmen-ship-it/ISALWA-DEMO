# Transfer clearance — restricted runner logs (2026-11-13)

Restriction: `evidence/REVIEW-R1/UNREVIEWED-NOT-FOR-TRANSFER.md` (set 2026-10-16 20:39 §5). Authority for this inspection: Carmen, 2026-11-13 10:47 ("explicitly authorizes local inspection of those named logs for transfer readiness"). Reviewer: the integrator agent in `/Users/carmen/projects/isalwa-wt-v1-repairs` at `ct3/v1-repairs` `44958998caa778782a0b466b807510212d532f1d`, acting under that authorization. It is an automated, value-free classification, not a human read, and not an independent code review.

## Clearance conditions named by the restriction, and their status

| Condition (restriction §"Proposed authorized review") | Status |
|---|---|
| 1. Open only the four files (hashes listed) and classify every match as test name/source text, fixture value or credential-like, without copying values | MET. Hashes verified before every pass: `run-os-database` `262eba74…e917c`, `run-os-web` `29e183d7…7a73`, `run-os-workforce` `d63bef86…bf39d`, `run-os-api` `fd14ca0e…d77c` (all OK). No value, excerpt or value hash left the procedure. |
| 2. Nothing credential-like → record reviewer, date, hashes, result; blocker can be lifted for these files | MET (this record). |
| 3. Anything credential-like → rotate first, then authorized history rewrite | NOT TRIGGERED. No rotation and no history rewrite needed. |
| 4. Include the earlier raw logs under `evidence/T00`–`T03` and the other `REVIEW-R1` logs before any transfer | MET. 120 files plus 17 members of `T00/s11-untracked-snapshot.tgz` (read in memory). |

## Procedure (outside the repository)

`/Users/carmen/projects/isalwa-transfer-readiness/r1-log-inspection/` — `PROCEDURE.md` (`044847b9…40a1`), `inspect.py` (`5f0f21f0…bdd9`), `refine.py` (`a33c47a7…46cb`), `pass3.py` (`d74b26c4…e7f`), `pass4.py` (`796de893…7cc57`), `pass5.py` (`308f9cf2…58dc7`). Outputs in `out/` (`summary.txt` `321599c4…0123`, `matches.tsv` `f2cd6bb5…5a20`, 301 rows, no values). Every pass ran through the normal shell security gate. None was rejected, so nothing was relocated or retried.

Passes: (1) twelve detector categories (private key, JWT, auth header, credentialed connection string, provider key formats, keyword assignment, env dump, cookie, high-entropy run, email, phone, bare keyword) with conservative classification; (2) shape and line kind of high-entropy hits; (3) context of the only opaque value and of bare keywords outside test lines, including a search of tracked source at `f76751d`, `f76751d^` and HEAD through `git cat-file` over stdin; (4) structure of that value; (5) email/phone domain buckets and the tracked paths that contain them.

## Findings by file and category (no values)

| Files | Category | Classification |
|---|---|---|
| The four named `REVIEW-R1` logs | 24 bare keywords | All on test-result lines (test names) |
| `REVIEW-R1/run-os-database.log.txt` | 2 emails (1 distinct pair) | Synthetic QA roster addresses on the project domain, present in committed source (`apps/os-api/src/qa-synth-roster.ts`, `apps/os-web/lib/qa/personas.ts`, test files) |
| Other `REVIEW-R1` logs | none | — |
| `T00`–`T03` (276 high-entropy hits) | 276 path-like | 260 in stack frames, 16 in other lines: local file paths |
| `T02/mutation-boundary-removed.txt` lines 28, 47, 66 | 1 opaque value ×3 | An os-api route literal followed by a 26-character ULID record id from the disposable test database; in no tracked source. Not credential-like |
| `T00`–`T03` | 20 email, 2 phone | Same 2 synthetic QA emails; 2 phone numbers present only in `packages/os-import` test files |
| `T00`–`T03`, `REVIEW-R1` | 7 keyword assignments, 5 env-dump | Values are code identifiers |
| `T00` tarball member `packages/os-delivery/src/delivery-replay-authorization.test.ts`, the restriction file itself | 5 bare keywords outside test lines | Prose; no value adjacent |

Result: **no credential-like value** in any inspected file. No credential rotation or shared-system change is required. The files are **not sanitized**: they are raw runner output containing local paths and synthetic QA identities, and they stay restricted originals, preserved unchanged. Detector-based classification can miss a secret in an unrecognized format; that residual risk is why the files stay out of every export.

## What is cleared

- The restriction's content blocker for the 4 named logs and the other raw logs under `T00`–`T03` and `REVIEW-R1`: nothing requires rotation or a history rewrite.
- A **fresh allowlisted source export** built without those files (below), consistent with the restriction's export rule (explicit allowlist, nothing materialized and then deleted).

## What is not cleared

- Pushing, merging or sharing `ct3/v1-repairs` **history**. The raw logs stay in history, and the branch also carries `docs/project-memory/**` (NOT-FOR-TRANSFER archive). Not pushed; not to be pushed.
- Independent code review of any commit from `e7d8d98` on. An export does not review code, does not complete unfinished features, and does not make anything hosted.

## Allowlisted source export

`/Users/carmen/projects/isalwa-transfer-readiness/export/isalwa-source-44958998.tar.gz` (sha256 `45bf371de05b6479c5c07765623da62680eec1887f51d63ba4eb0cc0e87298a5`), built with `git archive` from commit `44958998caa778782a0b466b807510212d532f1d` (tree `1cc412f1c792121cd8bb3ab7c7c5105f44241b94`) and allowlist `ALLOWLIST.txt` (`485f4c23…3f56`): `apps`, `packages`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `.npmrc`, `.gitignore`, `.prettierrc.json`, `.env.example`, `README.md`, `LICENSE`, `.github/workflows/ci.yml`, `docker/docker-compose.yml`. 2,406 files, 40 Prisma migrations, no Git history.

Excluded: `docs/**` (restricted evidence, project memory, chat indexes), `.cursor/**`, `scripts/**` (hosted/staging operational scripts), `seed/`, `tests/`, `assets/` (placeholders only), uncommitted worktree changes (the 7 regenerated Prisma client files and `.tmp/`).

Export credential scan (`export_scan.py` `4383df26…e248`, output `export-scan.txt` `c641d7cd…a164`, value-free): no private key, JWT or provider key. Authorization-header hits are `Bearer ${variable}` construction or Prisma runtime text; `.env.example` values are placeholders, a localhost development URL, and the fixture seed name that is also the code default. Committed generated Prisma client is older than the committed schema (`1d200814`); the build regenerates it (`os-database` `build` runs `prisma generate`).
