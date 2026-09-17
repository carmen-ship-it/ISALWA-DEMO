# RC2 evidence — `8a153a4db43fd82e29d6db6173b668236e763b94`

**References RC1 (immutable):** `02688431b9290b818c8fb245d68c086379363b3f`  
**RC1 package:** `../final-rc-evidence-0268843/` (do not rewrite)

## Index

| Doc | Purpose |
|---|---|
| `RC1_TO_RC2_REQUIREMENT_DELTA.md` | Exact delta from RC1 |
| `RC2_SCORECARD_AND_VERDICT.md` | Canonical counts + gates |
| `RC2_HOSTED_PROVEN_DEFINITION.md` | Scorecard math (no conflicting counts) |
| `RC2_DEPLOY_STATUS.md` | Push / deploy / BV freeze state |
| `RC2_SHA.txt` | Exact tip SHA |

## Release-train state (this package cut)

| Step | State |
|---|---|
| Bounded parallel fixes | DONE |
| Integrate + unit tests | DONE (local) |
| Evidence reconciliation | THIS PACKAGE |
| Clean tree + push | DONE — tip on `origin/ct3/owner-demo-completeness` |
| Cut RC2 SHA | `8a153a4db43fd82e29d6db6173b668236e763b94` |
| ONE web+API deploy | **BLOCKED** — Render deploy auto-review denied (see `RC2_DEPLOY_STATUS.md`) |
| Hosted BV | **UNPROVEN** (blocked on deploy) |
| Freeze during BV | N/A until deploy |
