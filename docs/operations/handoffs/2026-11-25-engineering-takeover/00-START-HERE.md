# ISALWA — Engineering takeover packet (2026-11-25)

**Audience:** Carmen’s new GitHub-only engineering agent  
**Owner:** Carmen  
**Parent outcome:** **PARTIAL** (local spine proven; hosted acceptance not done)  
**Cursor thread that produced this WIP:** `b6a344b1-1bdb-4b47-be28-1a0cab32bca6` (“ISALWA production update usability”)

## Read in this order

1. **This file**
2. [`01-LOCKED-DECISIONS.md`](./01-LOCKED-DECISIONS.md) — never re-ask
3. [`02-ENGINEER-STATUS.md`](./02-ENGINEER-STATUS.md) — what is proven vs open
4. [`03-OVERNIGHT-PROMPT.md`](./03-OVERNIGHT-PROMPT.md) — paste-ready exact instructions (same style as 2026-11-25 ACTIVE ENGINEERING EXECUTION)
5. [`04-SPINE-IDS.sanitized.json`](./04-SPINE-IDS.sanitized.json) + [`05-EVIDENCE.json`](./05-EVIDENCE.json)
6. [`06-FILE-INVENTORY.md`](./06-FILE-INVENTORY.md)
7. Historical context: [`archive/ISALWA_MASTER_HANDOFF_2026-10-16.md`](./archive/ISALWA_MASTER_HANDOFF_2026-10-16.md)

## Pin (after this push)

| Field | Value |
| --- | --- |
| Repo | `git@github.com:carmen-ship-it/ISALWA-DEMO.git` |
| Branch to use | `wip/overnight-handoff-20261125` |
| Prior local HEAD (before WIP commit) | `09cfedfb4842274e521b7b569fd482d0fa3fa9e9` |
| Remote tip before this push | `origin/ct3/v1-repairs` = `7fe8772a…` (**~40 commits behind local**; `09cfedfb` was Mac-only until this branch) |
| Worktree (Mac, optional) | `/Users/carmen/projects/isalwa-wt-v1-repairs` |
| Disposable DB | `isalwa_v1_repairs_verify_20261124_disposable` (do not expose / do not use for hosted) |
| Local ports (when Mac is used) | os-web `:3200`, os-api `:4001`, PG `:54329` |

## What this branch contains

- **All uncommitted November 24–25 engineering** that lived only on the Mac dirty tree (A1 dispatch, conversation coverage, warehouse CreateOrder path, spine HTTP test, elapsed-notice kinds, Spanish/shell polish, etc.).
- **This takeover packet** so a GitHub-only agent can recover decisions and continue without the Mac.
- **Sanitized spine IDs only** — session cookies were stripped. Recreate seats with `OS_AUTH_MODE=dev` on the disposable DB if you need live cookies.

## Operating law (non-negotiable)

- Carmen directs. Do not invent product decisions.
- One active writer on overlapping areas.
- No reset / clean / stash / discard of protected WIP.
- No `vercel --prod`. Never alter evaluation URL `https://isalwa-os-web-evaluation.vercel.app`.
- VISUAL FREEZE — functional fixes only.
- Statuses stay separate: SPECIFIED → IMPLEMENTED → TESTED LOCALLY → BROWSER VERIFIED LOCALLY → INTEGRATED → HOSTED → HOSTED JOURNEY VERIFIED → OWNER ACCEPTED.
- Cursor/agent PASS ≠ Carmen acceptance.
- Prefer GitHub as source of truth; Mac is slow and optional for recovery.

## How to instruct this agent (Carmen)

Use exact, screen-level instructions (see October master §1 and `03-OVERNIGHT-PROMPT.md`). End implementation returns with `CARMEN HANDOFF — WHAT I NEED TO KNOW`.

## Do not merge

This branch is a **WIP handoff**, not a merge-ready PR into `main`. Review before any promote.
