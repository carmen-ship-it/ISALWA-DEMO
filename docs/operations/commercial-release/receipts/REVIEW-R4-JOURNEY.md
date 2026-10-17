# Review R4 — Journey neutral: no fictitious label, no synthetic targets, no tenant or demo selection

Governing decision: owner message 2026-10-16 22:29, decision 3, from `RE-REVIEW_R3_R2F.md` §2.2 residuals 1–2. Base: `a8a3307260cb4d2ca29d75acff296ff9359255f0`. State: **IMPLEMENTED + TESTED (os-web unit)**. Not integrated, deployed, hosted or browser-verified. Not independently reviewed.

## Behavior

- **Heading and label.**
  - The overlay heading is now "Recorrido de ISALWA" (`STORY_MODE_TITLE`).
  - The header kicker is "Recorrido guiado". The unconditional `DEMO_FICTITIOUS_BADGE` is removed, so real data is never labeled "DEMO · ficticio".
  - The shell banner still shows only in demo mode, as R3 left it.
- **Links.**
  - `StoryModeStep.hrefFor(ids)` is replaced by a fixed `href` to a generic product page: `/conversaciones`, `/clientes`, `/oportunidades`, `/cotizaciones`, `/trabajo`, `/pedidos`, `/produccion`, `/almacen`, `/entregas`, `/inicio`, `/inicio?lente=gerencia`. Each page applies the person's own permissions.
  - The Journey no longer reads the seeded id map (`loadDemoSeedIdMap`) and links no synthetic record or seeded PDF.
  - The "Aplique el seed DEMO en SYNTH…" fallback is removed.
- **Copy.** Step text no longer names the demo client or demo/real filtering. CTA labels match the generic pages. The help panel describes the Journey as opening normal pages with the current company and permissions, without changing company or data.
- **No selection.** `openStory` and `closeStory` only toggle `?story=1` (verified in source). Step links carry no `datos`, organization or company parameter. `withStoryDemoDatos` remains only for shell navigation when the person has chosen Demo themselves; its doc now says it is not used by the Journey.
- **Unchanged and deferred.** The Journey gate (`canUseOwnerDemo`) and the demo data-mode filter remain until T10/T11 (full teacher/demo removal). Walkthrough content is rewritten in T20.

## Tests

- `os-web/lib/demo/owner-demo.test.ts`. Two tests replaced the seeded-id tests (expectation change, decision 3):
  - every step links a generic page; no `datos`/organization parameter, no PDF API, no demo naming in the copy;
  - neutral heading; the overlay has no badge, no seed map, no "seed DEMO"/SYNTH text, and no data-mode or organization calls.
- `os-web/lib/demo/pf4-pdf-same-implementation.test.ts`: the "Story Mode PDF CTAs resolve to seeded PDFs" test became "the Journey links no seeded PDF; its PDF steps open the generic list pages". The seeded `hrefHints` and PDF-route tests are unchanged.

## Checks

- os-web suite: 1298/0.
- os-web `tsc --noEmit`: exit 0.
- No server packages changed.

## Mutation checks (each source restored from a file backup and verified)

| Mutation | Caught by |
|---|---|
| overlay shows the fictitious-data badge again | owner-demo 1 fail |
| a step links a seeded record | owner-demo 1 fail |
| a step selects demo mode (`?datos=demo`) | owner-demo 1 fail |

Evidence: `evidence/REVIEW-R4-JOURNEY/` (allowlisted ✔/✖/ℹ lines, exit codes, `tested-source-manifest.sha256`).

## Not done / unproven

Browser verification (open/close keeps organization and data mode; heading; links) is UNPROVEN.
