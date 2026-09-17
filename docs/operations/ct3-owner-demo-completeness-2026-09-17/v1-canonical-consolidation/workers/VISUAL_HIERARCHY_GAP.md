# Visual hierarchy — GAP RECEIPT

**Worker:** Visual hierarchy gap analyst  
**Date:** 2026-09-17  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo`  
**Authority:** CT3 visual contract (porcelain canvas · white ops surfaces · semantic navy/teal/amber/green/red · next-action hero · who-has-the-ball · Cliente360 command header · button hierarchy · scannable Resumen · activity timeline)  
**Reference acceptance:** `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/docs/operations/ct3-owner-demo-completeness-2026-09-17/CT3_VISUAL_ACCEPTANCE.md` (hosted review notes porcelain/kiln/tabs; **USER_ACCEPTED = NO**)  
**Scope:** Inspect only — no implementation in this receipt.

---

## VISUAL_HIERARCHY_STATUS

**PARTIAL** — Design **law exists in tokens** (`packages/ui/src/tokens/tokens.css`) and os-web remaps navy primary (`apps/os-web/app/globals.css`). Several **behaviors are implemented in logic** (next step, who-has-the-ball view model). **Hierarchy is fragmented**: multiple ad-hoc shells for the same job, Cliente360 splits identity across three bands, historial bypasses the shared `Timeline` primitive, and semantic tint vocabulary is applied inconsistently across commercial vs. inicio vs. cliente surfaces.

---

## Contract vs. current state (summary)

| Contract pillar | Token / primitive basis | Current CT3 signal | Gap severity |
|---|---|---|---|
| Porcelain canvas vs white work surfaces | `--isalwa-surface-canvas`, `--isalwa-surface-ops`, `Panel`, `PageSection` `surface` | `app-shell` + body wash use porcelain; many cards use white + `shadow-card-resting` | **Medium** — sticky/command bands and nested blocks leak porcelain or flat white without elevation |
| Semantic navy / teal / amber / green / red | `--isalwa-tint-*`, `--isalwa-surface-*`, `StatusPill`, `visual-status.ts` | Tabs + `ProcessStepIndicator` use tints; commercial progress + ball card mostly text color | **Medium** |
| Next-action hero | (no `@isalwa/ui` hero yet) | `ProximoPasoStrip`, `RecordNextStep`, `Cliente360Now` + `InsightCard` | **High** — three patterns, none reads as page hero |
| Who-has-the-ball card | `Panel` + `SectionHeader` pattern | `whoHasTheBallView` on quote page only; inline `<dl>`; separate `WhoToAskCard` elsewhere | **High** |
| Cliente360 command header | `ExperienceHeader`, `ActionBar`, `Button` / `action-hierarchy` | `PageHeader` + `Cliente360Sticky` + `Cliente360Header` | **High** — duplicate title lanes, no command-center composition |
| Primary vs secondary buttons | `Button` variants, `actionPrimaryClass` / `actionSecondaryClass` | Mixed glaze **text links** as actions; overflow menus vary | **Medium** |
| Scannable Resumen | `MetricCard`, `StatGroup`, `DashboardGrid`, `SectionHeader` | Dense `dl` grids; intelligence metrics not in `StatGroup`; next action duplicated | **High** |
| Activity timeline | `@isalwa/ui` `Timeline`, `ListRow` | `PartyTimelineList` custom list; historial origin block separate chrome | **Medium** |

---

## Existing `@isalwa/ui` primitives to **extend** (do not fork)

Use these as the only extension surface. Host-specific wrappers (`ProximoPasoStrip`, `RecordNextStep`, `WhoToAskCard`, `InicioVisualBand`) should converge **into** or **compose** these — not duplicate.

| Primitive | Path | Extend for hierarchy gaps |
|---|---|---|
| `Button` | `packages/ui/src/components/button.tsx` | Single primary per command row; contextual teal for ops-only; wire `action-hierarchy` link class as documented alias |
| `Panel` | `packages/ui/src/components/panel.tsx` | Who-has-the-ball, next-action hero shell (white ops + `shadow-card-resting`) |
| `PageContainer` / `PageSection` | `packages/ui/src/components/layout.tsx` | `surface`: `ops` \| `context` \| `active` \| `attention` for hero/context bands |
| `ExperienceHeader` | `packages/ui/src/components/experience.tsx` | Cliente360 command header (kicker + Newsreader title + `actions` slot) |
| `SectionHeader` | `packages/ui/src/components/layout.tsx` | Resumen section rhythm; ball card kickers |
| `ActionBar` | `packages/ui/src/components/layout.tsx` | Sticky command actions under header |
| `MetricCard` / `StatGroup` | `packages/ui/src/components/data.tsx` | Resumen intelligence counts at a glance |
| `InsightCard` | `packages/ui/src/components/data.tsx` | Optional **body** for next-action statement (not duplicate hero) |
| `Timeline` | `packages/ui/src/components/data.tsx` | Cliente360 / party historial with `tone` per event category |
| `ListRow` | `packages/ui/src/components/data.tsx` | Inbox-style historial rows with optional `railColor` |
| `StatusPill` / `Chip` | `packages/ui/src/components/status-pill.tsx`, `data.tsx` | Waiting / overdue / approval states on ball card |
| `EmptyState` / `EmptyPanel` | `experience.tsx`, `data.tsx` | Empty historial / no next step |
| `OperatingRow` / `OperatingListHeader` | `packages/ui/src/components/operating.tsx` | Dense commercial lists (already aligned) |
| `OverflowMenu` / `ContextDrawer` | `packages/ui/src/components/operating.tsx` | `+ Acciones` consolidation in command header |
| `FeedbackNote` | `packages/ui/src/components/operating.tsx` | Overdue / stale projection callouts near hero |
| `Skeleton` | `packages/ui/src/components/experience.tsx` | Resumen loading parity |

**Token law (already sufficient — consume, don’t invent):**  
`/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/packages/ui/src/tokens/tokens.css` — canvas/ops surfaces, button hierarchy aliases, `--isalwa-tint-{blue,teal,amber,red,green}`, glass chrome, rich card shadows.

**Host helpers to align (not new primitives):**  
`/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/ui/action-hierarchy.ts`,  
`/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/ui/visual-status.ts`.

---

## Implementation map (inspected)

| Concern | Primary artifacts |
|---|---|
| Tokens + os-web remap | `packages/ui/src/tokens/tokens.css`, `apps/os-web/app/globals.css` |
| Cliente360 chrome | `apps/os-web/components/cliente/cliente-360-header.tsx`, `cliente-360-nav.tsx`, `cliente-360-sticky.tsx`, `apps/os-web/app/(app)/clientes/[partyId]/page.tsx` |
| Resumen content | `apps/os-web/components/party/cliente-360-now.tsx`, `cliente-360-intelligence.tsx`, `party/cliente-360-owner-line.tsx` |
| Next step (UI) | `apps/os-web/components/shell/proximo-paso-strip.tsx`, `commercial/record-next-step.tsx` |
| Next step (logic) | `apps/os-web/lib/commercial/next-step.ts`, `apps/os-web/lib/cliente/next-action-display.ts` |
| Who has the ball | `apps/os-web/lib/work/who-has-the-ball.ts`, quote page inline UI `apps/os-web/app/(app)/clientes/[partyId]/cotizaciones/[quoteId]/page.tsx` |
| Who to ask (related) | `apps/os-web/components/certainty/who-to-ask-card.tsx`, `lib/certainty/who-to-ask.ts` |
| Process / progress | `apps/os-web/components/progress/process-step-indicator.tsx`, `commercial/commercial-progress-strip.tsx` |
| Historial | `apps/os-web/components/cliente/cliente-360-historial.tsx`, `commercial/party-timeline-list.tsx` |
| Semantic band precedent (Inicio) | `apps/os-web/components/inicio/inicio-visual-band.tsx` (local — should map to `PageSection` `surface` + tints, not a second system) |

---

## Top 15 concrete gaps (prioritized)

### 1. No canonical **next-action hero** in `@isalwa/ui`

**Evidence:** Three hosts — `ProximoPasoStrip` (sky context, single-line), `RecordNextStep` (plain white border box), `Cliente360Now` (`InsightCard` italic block).  
**Contract miss:** Next action should be the **largest focal surface** on record pages (quote/opportunity/pedido) and Cliente360 command band — not a tertiary strip.  
**Extend:** `PageSection` (`surface="active"` \| `"attention"` when overdue) + `Panel` + optional `Button` primary CTA slot; deprecate parallel shells incrementally.

### 2. Cliente360 **duplicates next action** (header strip + Resumen)

**Evidence:** `Cliente360Header` renders `ProximoPasoStrip`; `Cliente360Now` repeats the same composition with `InsightCard` (`apps/os-web/components/party/cliente-360-now.tsx`).  
**Contract miss:** One hero location; Resumen should **summarize**, not replay the same block.  
**Extend:** Keep hero in sticky command band only; Resumen uses `StatGroup` / short pointer link.

### 3. **Cliente360 command header** is not a command center

**Evidence:** `PageHeader` (`ExperienceHeader`) shows Newsreader title + “Volver” glaze link; sticky band shows **another** `text-sm` display name, emoji fact line, and actions (`cliente-360-header.tsx`).  
**Contract miss:** Single command header: kiln display title, status, owner, **one** primary + secondary, next-action hero attached.  
**Extend:** `ExperienceHeader` + `ActionBar` inside `Cliente360Sticky` with white ops surface; drop redundant page-level title or merge.

### 4. **Who-has-the-ball** has view model but no shared card component

**Evidence:** `whoHasTheBallView` tested in `lib/work/who-has-the-ball.test.ts`; UI only on quote page as raw `<dl>` inside `PageSection` (`cotizaciones/[quoteId]/page.tsx`). Not on Cliente360, opportunity, or pedido.  
**Contract miss:** Reusable “Quién tiene la pelota” card wherever ownership/waiting matters.  
**Extend:** Compose `Panel` + `SectionHeader` + `StatusPill`; feed `WhoHasTheBallView` (same pattern as `WhoToAskCard` but different copy model — **merge visually**, not two card designs).

### 5. **WhoToAskCard** vs ball card — parallel ownership UI

**Evidence:** `WhoToAskCard` uses `Panel` + kicker (`who-to-ask-card.tsx`); ball card uses unstyled definition list.  
**Contract miss:** One ownership/responsibility visual language.  
**Extend:** Single `@isalwa/ui`-backed responsibility panel with slots (`assigned` \| `waiting` \| `unassigned`).

### 6. **Porcelain bleeds into work surfaces** on Cliente360 sticky

**Evidence:** `Cliente360Sticky` background `color-mix(... porcelain 94%, white)` (`cliente-360-sticky.tsx`); tokens say porcelain = **canvas only** (`tokens.css` L50–54).  
**Contract miss:** Sticky command band should read as **white/glass ops chrome** on porcelain page.  
**Extend:** `--isalwa-glass-light-bg` + `shadow-card-resting` or `PageSection` `surface="ops"`.

### 7. **Resumen** lacks scan layer (metrics above the fold)

**Evidence:** `Cliente360Intelligence` uses plain `dl`/`Metric` divs; does not use `StatGroup` or `MetricCard` (`cliente-360-intelligence.tsx`). Resumen opens with long `Cliente360Now` prose grid.  
**Contract miss:** Executive scan — counts and state in **one row** before narrative.  
**Extend:** `DashboardGrid` + `StatGroup` or `MetricCard` row; move narrative “why/blockers” below fold.

### 8. **Activity timeline** bypasses `@isalwa/ui` `Timeline`

**Evidence:** `PartyTimelineList` — divide-y white rows, no vertical spine (`party-timeline-list.tsx`). `Timeline` used on incidencias/delivery/coordination, not Cliente360 historial.  
**Contract miss:** Consistent timeline scannability (dot tone = event category, meta line, body).  
**Extend:** Map `PartyTimelineEntryReadModel` → `TimelineItem[]` with `--isalwa-glaze` / `--isalwa-warning` / `--isalwa-success` tones; keep `ListRow` only if inbox density required.

### 9. Historial **split chrome** (porcelain origin block vs white list)

**Evidence:** `Cliente360Historial` origin events in porcelain bordered box; main list via `PartyTimelineList` on white (`cliente-360-historial.tsx`).  
**Contract miss:** One timeline surface on white ops card.  
**Extend:** `Timeline` with grouped items or `InsightCard` callout for conversation origin — not second background.

### 10. **Commercial progress strip** weak vs `ProcessStepIndicator`

**Evidence:** `CommercialProgressStrip` — text colors only, no tint chips (`commercial-progress-strip.tsx`). `ProcessStepIndicator` uses full semantic tint borders/backgrounds but only referenced from `map-quick-view-compact.tsx`.  
**Contract miss:** Same step vocabulary on quote/opportunity/pedido as map quick view.  
**Extend:** Reuse `ProcessStepIndicator` or extract chip styles to shared helper backed by `--isalwa-tint-*`.

### 11. **Primary vs secondary** action drift (glaze links compete with navy)

**Evidence:** `PageHeader` action “Volver” uses glaze `linkClass`; header uses navy `actionPrimaryClass` / `actionSecondaryClass` (`page.tsx`, `cliente-360-header.tsx`). Quote actions: PDF primary, send secondary, many tertiary (`quote-detail-actions.tsx`).  
**Contract miss:** Exactly **one** filled navy primary per command region; secondary outline; rest overflow.  
**Extend:** Enforce `action-hierarchy` on all command headers; tertiary only in `OverflowMenu`.

### 12. **`RecordNextStep` surface** not aligned with context/active tokens

**Evidence:** `RecordNextStep` uses `bg-white` + mist border only (`record-next-step.tsx`); overdue not surfaced visually (logic may exist elsewhere).  
**Contract miss:** Next step on commercial records should use `surface-context` or `surface-attention` like `ProximoPasoStrip` / tokens.  
**Extend:** `PageSection` wrapper with `surface` prop; link CTA as `Button` secondary or glaze link consistently.

### 13. **Cliente360Nav** non-embedded mode uses flat `bg-white` instead of glass token

**Evidence:** `cliente-360-nav.tsx` L43 `bg-white`; tokens define `--isalwa-glass-light-*` for sticky rails. Embedded mode relies on parent sticky (porcelain mix).  
**Contract miss:** Tabs float above porcelain with light glass + edge shadow.  
**Extend:** Apply glass tokens from `tokens.css` L178–193 (no new CSS file).

### 14. **Semantic tints underused** for waiting / overdue on ownership surfaces

**Evidence:** `visual-status.ts` defines overdue/pending surfaces; `ProximoPasoStrip` only colors “Vencido” text danger; ball card has no amber/red background for waiting on approval.  
**Contract miss:** Amber = waiting, red = overdue, green = complete — **surface** not just text.  
**Extend:** `StatusPill` + `visualStatusSurfaceClass` on ball rows and next-action hero.

### 15. **InicioVisualBand** pattern not available to Cliente360/commercial (local duplicate risk)

**Evidence:** `inicio-visual-band.tsx` maps tones to `--isalwa-tint-*` correctly; Cliente360/commercial do not reuse it — they invent one-off backgrounds.  
**Contract miss:** One semantic band API across Inicio, Cliente360 hero, commercial next step.  
**Extend:** Promote band behavior to `PageSection` `surface` + documented tone enum (or thin wrapper around `PageSection` only — **not** a second band component in `packages/ui` unless consolidating Inicio first).

---

## CT3_VISUAL_ACCEPTANCE cross-check

Hosted notes (`CT3_VISUAL_ACCEPTANCE.md`) confirm porcelain canvas, kiln titles, Cliente360 tabs, pedido next step — but **do not** certify hero hierarchy, ball card, Resumen scan layer, or unified timeline. Engineering review **≠** USER_ACCEPTED; gaps above are the delta for owner walkthrough.

---

## Recommended consolidation order (implementation planning only)

1. Token-backed **NextActionHero** composition (`PageSection` + `Panel` + `Button`) — replace `RecordNextStep` / elevate `ProximoPasoStrip`.  
2. **ResponsibilityCard** — unify `WhoToAskCard` + `whoHasTheBallView` presentation on `Panel`.  
3. **Cliente360 command header** merge (`ExperienceHeader` + sticky ops surface + dedupe next action).  
4. Resumen **StatGroup** row + historial **`Timeline` migration**.  
5. Commercial pages: **`ProcessStepIndicator`** (or shared chips) + ball card on opportunity/pedido.

---

## Proof states (per feature proof matrix)

| Subfeature | IMPLEMENTED | TESTED | BROWSER-VERIFIED |
|---|---|---|---|
| Token canvas/ops law | Yes (tokens + globals) | Partial (visual tests elsewhere) | Hosted porcelain noted |
| Next-action hero | Partial (fragments) | Logic tests (`next-step.test.ts`) | UNPROVEN as hero |
| Who-has-the-ball card | Logic only | `who-has-the-ball.test.ts` | Quote page only, UNPROVEN elsewhere |
| Cliente360 command header | Partial | UX tests (`cliente360-ux.test.ts`) | Tabs yes; command merge UNPROVEN |
| Button hierarchy | Partial | — | UNPROVEN (glaze drift) |
| Resumen scan layer | Partial | — | UNPROVEN |
| Activity timeline | Partial | — | UNPROVEN vs coordination/incidencias parity |

**Blocked lanes:** None for documentation. Implementation should not proceed without explicit product sign-off on hero placement (sticky vs in-tab Resumen).

---

## Files referenced

- `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/packages/ui/src/tokens/tokens.css`
- `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/packages/ui/src/index.ts`
- `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/docs/operations/ct3-owner-demo-completeness-2026-09-17/CT3_VISUAL_ACCEPTANCE.md`
- `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/components/cliente/cliente-360-header.tsx`
- `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/components/cliente/cliente-360-nav.tsx`
- `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/components/cliente/cliente-360-sticky.tsx`
- `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/components/shell/proximo-paso-strip.tsx`
- `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/components/commercial/record-next-step.tsx`
- `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/components/certainty/who-to-ask-card.tsx`
- `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/components/progress/process-step-indicator.tsx`
- `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/work/who-has-the-ball.ts`
