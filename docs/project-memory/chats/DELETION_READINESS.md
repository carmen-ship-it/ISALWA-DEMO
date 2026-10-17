# Chat deletion readiness — 2026-10-17

**No chat was deleted.** The full per-chat list, with reason and preservation locators, is in `DELETION_READINESS.csv` (156 ISALWA parent chats). Generate it with `tools/index_chats.py`.

Scope:
- Every chat in the Cursor projects named `*isalwa*` is included.
- Chats in `empty-window` need at least one ISALWA mention.
- In every project, a chat where CCA and "Rose" mentions outnumber ISALWA mentions is out of scope. Several CCA chats were opened inside the ISALWA folder.
- 11 out-of-scope chats are listed in `OUT_OF_SCOPE_CHATS.csv`. They are not ISALWA memory, and this archive makes no deletion judgement on them. One of them, `ddd43714` (2026-10-01 Mac disk-space audit), covers both companies (500 ISALWA mentions) and needs a separate review before any deletion.
- No CCA, Rose or FRR file references remain in the ISALWA attachment index.

## Rules applied (see `tools/index_chats.py`)

- **HOLD_ACTIVE:** the current integrator chat, or any chat active on or after 2026-10-16 (lanes, independent review, takeover).
- **NOT_READY:** a chat is NOT_READY if any of these holds:
  - a user turn is not preserved **verbatim in full** (whole normalized body) in the takeover/recovery packages, the review evidence, tracked repo docs or this archive;
  - it references an attachment (see `../attachments/INDEX.csv`). Mac-local copies don't count as durable;
  - it has subagent transcripts that haven't been reviewed for unique tool evidence.
- **READY_CANDIDATE:** none of the above applies. Agent-side output was then checked by hand (below). Deletion still requires Carmen's confirmation.
- System turns (tool catalogs, subagent lists, "Briefly inform the user…" notifications) and exact duplicate turns aren't counted as user content.

## Result

| Status | Chats |
|---|---|
| READY_CANDIDATE | 2 |
| HOLD_ACTIVE | 4 |
| NOT_READY | 150 |

### READY_CANDIDATE (preservation shown)

| Chat | Date | Project | User content preserved at | Agent-side output preserved at |
|---|---|---|---|---|
| `53d50449-fd21-44a3-8e65-b587345daefd` | 2026-07-24 | `empty-window` | takeover `originals/O01_PRODUCT_VISION_KICKOFF_ISALWA_OS.md` (verbatim, provenance header) | 423 bytes of agent text (a source-verification remark); the blueprint it wrote is `docs/product/PRODUCT_BLUEPRINT.md`, added in `68c4e5567b168d1430ac1ca657c245058e77eb0f`, on 84 remote-tracking branches |
| `8fc2c2e3-04a6-4fa6-bfac-34f6a50249d5` | 2026-07-25 | `Users-carmen-Projects-isalwa` | takeover `originals/O02_ISALWA_ARCHITECT_MISSION_0_INTERVIEW_APP.md` | 270 bytes of agent text; output `apps/architect/MISSION0.md` and `docs/VISION.md`, added in `cba94bcd56e187ed13b0c5e0385d8dad029c7ec8`, on 82 remote-tracking branches |

Caveats: the takeover package is a Mac-local folder plus a delivered transfer ZIP (`SOURCE_INDEX.csv` S20, S33). Delete these two chats only after confirming the engineer's copy of the ZIP is retained.

### HOLD_ACTIVE

| Chat | Why |
|---|---|
| `6e146cf5-2f69-4c8a-86ce-a29202d046ee` | Current integrator chat (09-20 → now). Holds unextracted 09-20 → 10-01 owner prompts and the live-only messages |
| `a64e43f4-13db-4080-8f1f-1ad2f7cd7738`, `68227e6c-452b-4308-9a12-5b392c515323` | Lane A (T05 catalog) chats ("Execute lane A only."). Hold until lane A's candidate is reviewed and integrated; the auto-review incident is disclosed in `c872470` |
| `9a9b1f36-90f7-4955-995e-b9a681687b20` | Lane B (T10/T11 demo removal) chat ("Execute lane B only."); lane active |

### NOT_READY: why (150 chats)

| Blocker | Chats |
|---|---|
| Unpreserved user turns only | 113 |
| Unpreserved turns + subagent transcripts | 19 |
| Unpreserved turns + attachments | 6 |
| Unpreserved turns + attachments + subagents | 12 |

Most are one-prompt worker chats from September: **97 chats are blocked by exactly one unpreserved user turn**, typically an engineering prompt that exists nowhere else. By month: Sep 127, Jul 14, Aug 7, Oct 2.

## What would make more chats deletable (not done in this task)

1. **Extract the remaining unique engineering prompts verbatim** with `tools/extract_instructions.py`. These are the prompts only, not whole chats: one file per month, the turns listed as `preserved_verbatim=no` in `USER_TURN_COVERAGE.csv`. Re-run the indexer afterwards.
2. **Check agent-side output** per chat, as done above: a receipt or commit on origin, or the final report preserved.
3. **Review the subagent transcripts** of the 31 chats that have them, for evidence that isn't in a receipt.
4. **Decide attachment storage** (`../attachments/INDEX.csv`). The screenshots in the Cursor asset folders are Mac-local only.
5. Carmen confirms each deletion batch.

## Missing material that no chat deletion may lose

See `../CURRENT_STATE.md` § Missing material. In particular, the 2026-10-16 23:57 and 2026-10-17 00:08 messages survive only partially; `../history/2026-10-live-only-messages.md` has what remains.
