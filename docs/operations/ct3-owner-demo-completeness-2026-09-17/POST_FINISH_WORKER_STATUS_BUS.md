# CT3 POST-FINISH WORKER STATUS BUS

**Integrator tip:** `b6855f0bb1bbab715211b68d5e864ce5336a782c` (`ct3/owner-demo-completeness`)

| Lane | Status | HEAD / notes |
|---|---|---|
| PF-1 commercial+fixture | RUNNING (nudge to commit) | dirty worktree; sole seed owner |
| PF-2 operations | RUNNING (nudge to commit) | dirty worktree |
| PF-3 conversations | RUNNING (nudge to commit) | dirty worktree |
| PF-4 PDF verify | **INTEGRATED** | `fb9c2d4` → merge on tip |
| PF-5 map/mgmt | RUNNING (nudge to commit) | dirty worktree; owns inicio lens risk |
| PF-6 walkthrough/story | **INTEGRATED** | `028898c` → merge on tip |
| PF-7 audit/coherence | RUNNING (nudge to commit) | dirty worktree |
| PF-8 verifier | WAITING | after PF-1…7 + deploy + seed |

## States (required distinction)

| State | Value |
|---|---|
| CODE_READY | **PARTIAL** — PF-4+PF-6 in; PF-1/2/3/5/7 pending commit |
| SEED_APPLIED | **NO** — densify re-apply not yet on SYNTH (prior seed still live) |
| DEMO_DATA_VISIBLE_HOSTED | **UNPROVEN** |
| DEMO_MODE_POPULATED_ACROSS_PRODUCT | **NO** (not claimed until hosted density visible) |

FIXTURE_OWNER = PF-1 · SHELL/STORY = PF-6 · PDF = PF-4 · MAP/MGMT = PF-5 · CONVERSATION = PF-3
