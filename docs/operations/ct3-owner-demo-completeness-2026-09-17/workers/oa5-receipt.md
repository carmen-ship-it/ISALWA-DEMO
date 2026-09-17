# OA-5 — Story Mode nav inherits Demo context

**Date:** 2026-09-17  
**Lane:** OA-5 (STORY NAV)  
**Branch:** `ct3/oa5-story-nav`  
**Base tip:** `9ce5303a4925fbd985eb84646b1852fef6fbce0d`  
**Lane tip:** `21bb6a4273689d83096c3e36a154072e1793aea9` (`21bb6a4`) — docs self-pin; code at Implementation  
**Implementation:** `fb2330e51c0b040e26753e3a4095d4a155ff8ad5` (`fb2330e`)  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-oa5-story-nav`  
**REAL_SEVEN_MUTATED:** **NO**  
**Deploy:** not performed (worker lane)  
**Hosted:** **UNPROVEN**

---

## Carmen plain language

Story Mode CTA deep links to app pages now keep Demo on (`?datos=demo`), so SSR desks stay in Demo when the owner clicks through the 20-step recorrido. PDF download API routes stay unchanged. Company-context cookie/header selection remains OA-1 (`OwnerDemoProvider`); this lane only fixes Story hrefs.

---

## Delivered

| Capability | Proof state |
|---|---|
| All Story Mode **app page** hrefs include `datos=demo` (20 steps) | **IMPLEMENTED** + **TESTED** |
| Existing `?datos=` left intact (no duplicate) | **IMPLEMENTED** + **TESTED** |
| Raw PDF API hrefs (`/api/.../pdf`) unchanged | **IMPLEMENTED** + **TESTED** |
| Does not rewrite company resolver / auth org header | **IMPLEMENTED** (by design; OA-1 owns) |
| Hosted / browser verify | **UNPROVEN** (no deploy) |

---

## Files

- `apps/os-web/lib/demo/story-mode-steps.ts` — `withStoryDemoDatos` / `storyHref` wrapper for page CTAs
- `apps/os-web/lib/demo/owner-demo.test.ts` — asserts all 20 seeded steps + helpers + null fallbacks
- `docs/operations/ct3-owner-demo-completeness-2026-09-17/workers/oa5-receipt.md`

---

## Tests run

```bash
cd apps/os-web && node --import tsx --test \
  lib/demo/owner-demo.test.ts \
  lib/demo/pf4-pdf-same-implementation.test.ts
```

**Result:** 10 pass / 0 fail

---

## Residuals

1. Hosted Story Mode click-through after integrator merge/deploy — **UNPROVEN**
2. Carmen seeing SYNTH parties still depends on OA-1 membership grant (SECURITY_GATE) — **not owned by OA-5**
3. Company cookie / `x-os-organization-id` selection remains OA-1

---

## Integration notes

- Sole owner of Story Mode **href query parity** for `datos=demo`.
- Did **not** touch `OwnerDemoProvider`, auth org resolver, seed, or PDF engines.
- Integrator: merge after OA-1 code tip; no conflict expected with OA-2…OA-4 file ownership.
