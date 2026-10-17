# Chat deletion candidates — 2026-10-17

**HOLD: no chat is cleared for deletion.** Per Carmen at 2026-10-17 01:25: "Hold chat deletion until the standalone private backup has been created and its contents verified. The two listed chats are candidates, not yet cleared under our backup requirement." The final list is issued only after the private backup exists and its remote contents have been verified against `MANIFEST.sha256`.

Deletion happens only through Cursor's normal interface, by Carmen. No agent deletes chats or edits Cursor's chat database.

## Candidates (not cleared)

| Chat ID / title | Preservation location | Backup proof | Unresolved |
|---|---|---|---|
| `53d50449-fd21-44a3-8e65-b587345daefd` — 2026-07-24 product vision kickoff (Cursor project `empty-window`) | User side: takeover `originals/O01_PRODUCT_VISION_KICKOFF_ISALWA_OS.md`, verbatim. Agent output: `docs/product/PRODUCT_BLUEPRINT.md`, added in commit `68c4e5567b168d1430ac1ca657c245058e77eb0f` | Inside transfer ZIP `539bd75d05b73162c26a0bd81aec5630c47419f6138c6c498cbb8ab265290336`; the extracted O01 SHA-256 `1abf00d8…64eea8d` matches the package checksum. The engineer confirmed receipt and verification on 2026-10-16 15:44. The commit is on GitHub `carmen-ship-it/ISALWA-DEMO` and is an ancestor of `main` (GitHub API, 2026-10-17) | None. The agent's 423-character remark in the chat is not preserved; it was judged non-unique |
| `8fc2c2e3-04a6-4fa6-bfac-34f6a50249d5` — 2026-07-25 Architect Mission 0 interview app (`Users-carmen-Projects-isalwa`) | User side: takeover `originals/O02_ISALWA_ARCHITECT_MISSION_0_INTERVIEW_APP.md`. Agent output: `apps/architect/MISSION0.md` and `docs/VISION.md`, added in commit `cba94bcd56e187ed13b0c5e0385d8dad029c7ec8` | The same transfer ZIP; the extracted O02 SHA-256 `2596db35…f9d3a005` matches. The commit is on GitHub and is an ancestor of `main` | None. The agent's 270-character remark is not preserved; it was judged non-unique |

## Excluded

- **Active:** `6e146cf5` (this integrator chat), `a64e43f4` and `68227e6c` (lane A), `9a9b1f36` (lane B).
- **Missing unique content (150 chats):**
  - 147 are fully covered by `tools/preserve_chats.py`, but the bundle build and off-Mac backup are blocked (`DELETION_READINESS.md` § 2026-10-17). They can be re-listed once that lane is unblocked.
  - `999b2346` also needs an owner decision on a screenshot that shows customer phone numbers.
  - Per-chat reasons are in `DELETION_READINESS.csv`.
- **Mixed and CCA chats (11):** `OUT_OF_SCOPE_CHATS.csv`. Not judged from the ISALWA side. `ddd43714` and `69935342` contain ISALWA turns that are queued for excerpting.

Caveat for both deletable chats: the takeover package on this Mac and the engineer's copy of the ZIP are the only copies of O01 and O02. The public GitHub repository holds only the commits.
