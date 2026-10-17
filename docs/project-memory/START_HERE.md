# ISALWA project memory — START HERE

Bounded archive so old chats can eventually be deleted without losing unique information. It **points to** authoritative records; it does not replace them. Read this page, then retrieve only the sections your task needs.

## 1. Authoritative records (read these, not copies)

| Need | Authority |
|---|---|
| Current plan | `docs/product/COMMERCIAL_RELEASE_V2.md` + `docs/product/COMMERCIAL_INTERACTIONS_A1.md` + `docs/product/COMMERCIAL_SELF_SERVICE_A2.md` |
| Decision matrix | `docs/operations/commercial-release/REUSE_MAP.md`: §12 authoritative commercial authority matrix, §13 consolidated engineering decisions, §8 new vs previous, §11 demo artifacts |
| Task state / checkpoint | `docs/operations/COMMERCIAL_RELEASE_CHECKPOINT.md` (with receipts under `docs/operations/commercial-release/receipts/`) |
| Review findings, reserved owner decisions, transfer blocker | `docs/operations/commercial-release/REVIEW_RECONCILIATION.md` |
| Lanes and file ownership | `docs/operations/commercial-release/LANES.md` |
| V1 repair backlog | `docs/reviews/V1_REPAIR_LEDGER.md` |
| Engineering rules | `docs/architecture/AI_CONSTITUTION.md`; `.cursor/rules/` |
| Product/app inventory (do not redo) | takeover package `03`, `04`, `05` (`SOURCE_INDEX.csv` S23–S25) |

## 2. This folder

| File | Use it for |
|---|---|
| `CURRENT_STATE.md` | Dated snapshot: source identity, lanes, open queue, missing material. The checkpoint wins on conflict. |
| `DECISIONS.md` | Register of consequential decisions: speaker, exact excerpt, locator, supersession; customer evidence kept apart from agent proposals; contradictions preserved |
| `SOURCE_INDEX.csv` | Every source with locator (repo + commit + path, or folder), SHA-256, authority, sensitivity, availability |
| `history/YYYY-MM.md` | Monthly summaries (labelled), pointing to originals |
| `history/2026-10-instructions-verbatim.md` | 33 consequential October instructions, verbatim, with chat/line/sha256 headers |
| `history/2026-10-live-only-messages.md` | Messages that exist in no transcript store (23:57 partial, 00:08 summary, 00:12 verbatim) |
| `history/2026-10-17-disk-cleanup-survey.md` | Read-only disk survey (tool evidence) |
| `attachments/INDEX.csv` | Attachments: filename, source, durable locator, SHA-256, sensitivity, availability |
| `attachments/CHAT_ATTACHMENT_REFERENCES.csv` | Where each attachment was referenced in a chat |
| `chats/CHAT_INDEX.csv` | One row per ISALWA parent chat (metadata only) |
| `chats/USER_TURN_COVERAGE.csv` | Each user turn: preserved verbatim or not, and where |
| `chats/DELETION_READINESS.csv`, `chats/DELETION_READINESS.md` | Chat-by-chat deletion readiness with the reason and the preservation locators |
| `chats/FINAL_DELETION_LIST.md` | The current approved list: chat → preservation location → backup proof → unresolved |
| `tools/preserve_chats.py` | Builds the sanitized per-chat bundle outside the repo (not yet run: awaiting review) |
| `chats/OUT_OF_SCOPE_CHATS.csv` | Chats where CCA or Rose content dominates: not ISALWA memory, no judgement made here (`ddd43714` is mixed and needs separate review) |
| `tools/` | Read-only, inspectable generators for the CSVs and the verbatim extract |

## 3. Rules for this folder

- **One documentation writer.** The writer edits only `docs/project-memory/**` and the one-line entry reference in `.cursor/rules/isalwa-ai-constitution.mdc`. It never edits application code or authoritative specifications/checkpoints. Commits go through the sole integrator (`ct3/v1-repairs`).
- Exact wording for consequential instructions; anything else is labelled **SUMMARY**. Record date, speaker, locator and supersession. Never rewrite a historical decision; add a later row that supersedes it.
- Customer evidence (Isa, Álvaro, relayed) stays separate from agent proposals.
- Code already at a verified commit is referenced as repository + commit + path, never copied.
- Large or binary files are never committed without an explicit storage decision. Personal data (the customer XLS, screenshots) is referenced by path and hash only.
- Excluded: credentials, contact details not needed for engineering, and restricted logs (`evidence/REVIEW-R1/**`, the review `snapshot/`). **This archive lives on a NOT-FOR-TRANSFER branch.** That status does not authorize pushing the branch or sharing this folder.
- **No chat is deleted** until `chats/DELETION_READINESS.csv` shows READY_CANDIDATE with locators, and Carmen confirms.

## 4. Regenerating the indexes

```bash
python3 docs/project-memory/tools/index_chats.py        # chats/*.csv, attachments/CHAT_ATTACHMENT_REFERENCES.csv
python3 docs/project-memory/tools/index_attachments.py  # attachments/INDEX.csv
```

Both only read transcripts, asset folders and the repo. They write only inside `docs/project-memory/`.
