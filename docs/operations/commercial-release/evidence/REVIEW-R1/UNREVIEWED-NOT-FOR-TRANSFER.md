# UNREVIEWED — NOT FOR TRANSFER

Status set 2026-10-16 20:39 (owner instruction §5). Applies until resolved through an authorized review.

## Files

| File | SHA256 |
|---|---|
| `run-os-database.log.txt` | `262eba745ee253efe36589bb92996a911641c749a5401b42f986ef560e3e917c` |
| `run-os-web.log.txt` | `29e183d7bf441ccaebca2fec4ed0f9c7b799fae939948513ac471da1b7037a73` |
| `run-os-workforce.log.txt` | `d63bef861a5cb21996c3b10d4192f4b5c8b307cf48f695684e1591a2da9bf39d` |
| `run-os-api.log.txt` | `fd14ca0ea3473a4128557c6c121d88477fd5efed4efc9e5148faec6b4c16d77c` |

Introduced in local commit `e7d8d98` on `ct3/v1-repairs`. Every later commit on this branch contains them in history. No remote branch contains `e7d8d98` (checked 2026-10-16). Deleting the files in a later commit would not remove them from history.

**Blocker:** do not push, merge, upload, archive for transfer or share this branch, these files, or any bundle/archive that contains them. Local development continues.

## What happened

After the R1 evidence run, a filename-only scan (`rg -il` for three secret-like words) listed these four files. The next step, printing the matched lines, was rejected by auto-review: "Broad secret-like pattern search in review logs violates credential security boundaries without an exact user-requested security audit." It was not retried or worked around. No matched value was printed. A keyword match is not evidence of a secret, and synthetic fixtures do not prove the logs are safe.

## Blocked action (exact)

Print each matching line (±60 characters) from the four files, counted and deduplicated, to see what the matches are.

## Proposed authorized review (not executed)

1. An authorized reviewer, on this Mac, opens only these four files (hashes above) and classifies each match as test name/source text, fixture value, or credential-like value, without copying values into chat, tickets or commits.
2. If nothing is credential-like: record the reviewer, date, hashes and result here; the blocker can then be lifted for these files.
3. If anything is credential-like: rotate it first. Because the commits are unpushed, an authorized history rewrite of `ct3/v1-repairs` from `508f341` (drop the four files from `e7d8d98`, replay later commits, then expire reflog and prune) removes them from local history. That needs explicit authorization; this lane does not reset or rewrite history.
4. Earlier raw logs under `evidence/T00`–`T03` and the other `REVIEW-R1` logs are the same kind of raw runner output and were never scanned. Include them in the same review before any transfer.

## Review exports and snapshots (21:33 §6)

- This branch's Git history and any review snapshot taken from it stay marked UNREVIEWED — NOT FOR TRANSFER. The logs above have **not** been sanitized; no claim otherwise is made anywhere.
- The blocked inspection is not retried.
- Future review exports exclude the four files above (and the unscanned raw logs under `evidence/T00`–`T03` and `REVIEW-R1`) **before** any file is materialized: build the export from an explicit allowlist of paths, never by copying the tree and deleting afterwards.
- Runner output is written outside the repository first; only allowlisted lines are filtered into `evidence/` (done for R2 follow-up: raw output under `/tmp`, filtered on write).

## Evidence format from R2 on

Saved evidence keeps only allowlisted lines: test-result lines (`✔`, `✖`, `ℹ pass|fail`), build exit codes, typecheck error lines, source diffs for mutation checks, and SHA256 manifests of the tested source. No environment values, connection strings, tokens or raw headers. Source identity (commit, tree, manifest) is kept.
