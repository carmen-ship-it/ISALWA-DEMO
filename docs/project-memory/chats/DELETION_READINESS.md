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

## 2026-10-17 01:18 preservation pass

**Mixed chats, inspected by content (not mention counts).**

| Chat | Content | Decision |
|---|---|---|
| `845e00e2`, `952c2a84` | SalesCore (CCA) prompts | CCA work; not ISALWA |
| `9e2e53d4`, `df2b3bce` | CCA host disk cleanup | CCA work; not ISALWA |
| `cb60318b` | CCA Command Center, server inventory | CCA work; not ISALWA |
| `1047892c` | Rose request (CCA) | CCA work; not ISALWA |
| `41fc9c81` | Supabase alerts and security fixes, messages for Rose | CCA work; not ISALWA |
| `9a403376` | AuditOS / AuditEngine handoffs from Rose | CCA work; not ISALWA |
| `d5f09651` | CCA enterprise operating-system audit | CCA work; not ISALWA |
| `ddd43714` | 2026-10-01 Mac disk recovery, both companies | Mixed. ISALWA turns at lines 46, 53, 55, 59, 72, 76 (preservation to GitHub; "ISALWA IS A PERSONAL PROJECT NOT CCA.. I HAVE MY OWN GITBHUB FOR THAT..") are queued for excerpting. Not deletable from the ISALWA side |
| `69935342` | Cursor operating environment, Twin OS / CCA Galaxy | Mixed. ISALWA-relevant turns at lines 191 and 221 (portfolios not shared) are queued for excerpting. Not deletable from the ISALWA side |

**Screenshots reviewed one by one (19 local).** 18 are cleared for a sanitized backup: product, Architect and Cursor UI, demo addresses, masked passwords. Excluded: `assets/Captura_de_pantalla_2026-09-16_a_la_s__14.29.19-144441da-….png`, which shows staging customer names with phone numbers. Its chat, `999b2346`, therefore stays blocked. The customer XLS (`DATOS_CLIENTES_ISA_2026-09-14.xls`) stays out of any backup because it contains personal data. Files that are only named, or only referenced by local path, don't block deletion: the XLS, the Vitri PDFs and the generated PDFs were never content held inside a chat. They are listed as unresolved items.

**Preservation tool.** `../tools/preserve_chats.py` writes a sanitized bundle outside the repo with one file per chat:
- every unique user turn, verbatim;
- the agent's final reply to each turn;
- each subagent's task and final report;
- the SHA-256 of every original;
- the counted redactions: keys, tokens, credentials, emails, phone numbers, public IP addresses.

It also writes the mixed-chat excerpts, copies the 18 cleared screenshots and writes `MANIFEST.sha256`. Volume: about 964 prompts in 147 chats plus 497 subagent transcripts, roughly 11 MB of text.

**BLOCKED LANE: bundle build and off-Mac backup.**
- Blocker type: SECURITY_GATE. Auto-review rejected the first run with: "Executing an unread repository script with external destination bundle variables and redaction find/grep checks cannot be auto-run without inspecting the script file first." Not retried, not worked around.
- Destination finding: `carmen-ship-it/ISALWA-DEMO` is **PUBLIC** (`gh repo view`: `"visibility":"PUBLIC"`). It must not receive chat memory. That includes the `preserve/*` branches already pushed there.
- The Dropbox connector accepts inline UTF-8 text only, at most 5 MB per call, with no byte upload. The Dropbox desktop client is not installed.
- Unblock requirement:
  - a reviewer inspects `tools/preserve_chats.py` at the commit that adds it and approves running it;
  - Carmen names the backup destination. The proposal is a new private repository under her ISALWA GitHub account, holding one unrelated commit with only the bundle and none of the restricted branch history.
- 2026-10-17 01:5x — Carmen chose the destination: "New private repository under my ISALWA GitHub account (carmen-ship-it)". The script review is still outstanding.
- Then: run the tool, re-run `index_chats.py` with the bundle counted as a preservation source, push the bundle, verify the remote manifest hash, and re-issue the list.

**Deletion candidates (HOLD, none cleared until the private backup is verified):** `FINAL_DELETION_LIST.md`.

## Missing material that no chat deletion may lose

See `../CURRENT_STATE.md` § Missing material. In particular, the 2026-10-16 23:57 and 2026-10-17 00:08 messages survive only partially; `../history/2026-10-live-only-messages.md` has what remains.
