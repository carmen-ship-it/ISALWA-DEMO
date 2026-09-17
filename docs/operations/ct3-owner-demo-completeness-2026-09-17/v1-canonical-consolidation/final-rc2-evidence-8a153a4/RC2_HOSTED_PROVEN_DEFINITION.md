# RC2 — HOSTED_PROVEN definition (canonical)

**Supersedes** RC1 conflicting summaries that stated both `HOSTED_PROVEN = 3` and `HOSTED_PROVEN = 9`.

## Definitions (apply to the 37 master requirement rows)

| Metric | Definition |
|---|---|
| **HOSTED_PROVEN** | Count of rows whose `browser` field **starts with** `YES` (parenthetical notes allowed). Excludes `PARTIAL`, `UNPROVEN`, `NO`. |
| **SECURITY_PROVEN** | Count of rows with a durable security negative proof in code/API **or** hosted fail-closed evidence recorded for that requirement (unit-only may contribute; hosted subset is noted separately). |
| **VISUALLY_PROVEN** | Count of primary desktop surfaces with a screenshot artifact in the RC package (RC1: 10 shots). Mobile is a separate gate. |

## RC1 recalculation (from `_req_counts.json` rows)

Applying **HOSTED_PROVEN** as starts-with-`YES`:

`A01, A03, B01, B02, I01, J01, M01, O01, Q01` → **9**

Exact equality `browser === "YES"` (no notes) → **3** (`B01, B02, I01`) — this was the `_req_counts.browser_yes` artifact and is **not** used going forward.

**Canonical RC1 HOSTED_PROVEN = 9** (matches scorecard; supersedes the “3 strict YES” summary line).

## RC2 note

RC2 hosted BV has **not** re-run after tip `8a153a4…` because deploy is blocked. Until BV completes:

- Do **not** inflate HOSTED_PROVEN beyond RC1’s 9 for carried-forward rows.
- New RC2 capabilities that are code-complete remain **HOSTED = UNPROVEN** (not counted in HOSTED_PROVEN).
