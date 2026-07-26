# Mission 9 — Premium Executive Design System

**Status:** Complete
**App:** `apps/architect`
**Scope:** Presentation / CSS / tokens only — no functionality, business logic,
consulting engine, or data model changes.

## Goal

Architect worked correctly but read like an internal admin dashboard: every
surface was flat white, sections were visually identical, and there was no
hierarchy to tell an executive *where they are* or *what matters most*. This
mission is a visual polish pass so the product feels like McKinsey / Linear /
Stripe / Notion AI — calm, premium, and legible at a glance — **without**
inventing a second design system. Every change extends `@isalwa/ui` and the
existing token law in `packages/ui/src/tokens/tokens.css`.

## What shipped

### 1. Extended the shared design system (`@isalwa/ui`)

- `packages/ui/src/tokens/tokens.css` — added a named card-depth vocabulary
  (`--isalwa-shadow-resting` / `-hover` / `-floating`, aliasing the existing
  soft/lift shadows) and documented the canonical section-identity → color
  mapping already reserved in the token file.
- `packages/ui/src/tokens/chrome.css` **(new)** — the canonical `.isalwa-*`
  utility classes (kicker, page title, section label, chip, field, divider,
  count badge, enter/whisper animations, skeleton, risk bar, transitions)
  extracted from `apps/web`'s implementation so every host app shares one
  law instead of forking it. Also adds net-new **section-identity** classes:
  `.isalwa-surface-{blue,teal,amber,red,violet,green,gray}`,
  `.isalwa-ink-{color}`, `.isalwa-icon-chip`, `.isalwa-status-chip`.
  Exported from the package as `@isalwa/ui/chrome.css`.
- `packages/ui/package.json` — added the `./chrome.css` export.

`apps/web` was not touched — it keeps its own copy of the same classes. A
follow-up mission could point it at the shared file too, but that was out of
scope here (Architect-only mission).

### 2. Architect adopted the frozen law completely

- `app/layout.tsx` — swapped `DM Sans` / `Instrument Serif` for the law's
  actual typefaces, **Plus Jakarta Sans** (`--isalwa-font-sans`) and
  **Newsreader** (`--isalwa-font-display`), loaded the same way `apps/web`
  already does (`next/font/google` + a `<style>` override tag), so
  `architect-serif` and every `.isalwa-page-title` finally render the
  correct italic serif instead of falling back to Georgia/system fonts.
- `styles/globals.css` — imports `@isalwa/ui/tokens.css` **and**
  `@isalwa/ui/chrome.css`; body now uses `--isalwa-porcelain` +
  `--isalwa-surface-hero` (the same soft gradient wash as every other
  ISALWA surface) instead of flat `#fafafa`. `.architect-serif` now points
  at Newsreader italic — kept as a class name (not renamed) so the ~150
  existing call sites across the app picked up the correct typeface with a
  single change.

### 3. Section identity — "where am I" at a glance

`components/workspace/section-shell.tsx` is the single shared surface every
workspace tab is built from. Its tone map now renders one soft, unsaturated
hue per category (via the new `.isalwa-surface-*` / `.isalwa-ink-*`
classes), matching the mission's naming exactly:

| `SectionTone` | Color | Executive meaning |
| --- | --- | --- |
| `executive` | blue | Executive Summary |
| `health` | teal | Business Understanding |
| `problems` | amber | Recommendations |
| `risks` | red | Critical Risks |
| `blueprint` | violet | Roadmap / Architecture |
| `processes` | green | Implementation / how it operates |
| `deliverables` / `neutral` | gray | Knowledge / reference material |

Section headers now use `.isalwa-kicker` (tone-colored), `architect-serif`
titles, and a tone-matched `.isalwa-icon-chip` instead of a flat gray icon
badge — so the header's icon, kicker, and card wash all read as one
identity. `RoadmapTimeline` (a bespoke, non-`SectionShell` surface) was
re-tinted from an ad hoc orange to violet to match the same law.

### 4. Card depth, radius, and shadow consistency

- `components/ui/{card,button,separator,progress}.tsx` — the four local
  primitives every panel in the app is built from now consume law tokens
  (`--isalwa-radius-panel`, `--isalwa-shadow-resting/-hover`,
  `--isalwa-kiln`, `--isalwa-glaze`) instead of ad hoc Tailwind
  `neutral-*`/`rounded-3xl`/hard-coded shadow values. `Card` gained an
  **optional** `interactive` prop (default `false`, so no existing caller's
  behavior changes) for a soft hover-lift on clickable cards.
- Repo-wide mechanical pass across ~60 files in `app/` and `components/`
  replaced every ad hoc Tailwind grayscale (`neutral-50…950`) and stray
  status color (`sky-*`, `emerald-*`, `rose-*`, `amber-*`, `violet-*`,
  `orange-*`, `stone-*`, `red-600`) with the matching law token or
  section-identity tint — same visual family, one source of truth. `24px`
  card corners (`rounded-3xl`) were normalized to the law's `16px` panel
  radius for a calmer, more enterprise silhouette.

### 5. Kiln chrome, calm motion, focus rings

- `components/workspace/executive/context-bar.tsx` — the persistent
  "where am I" strip now uses `--isalwa-kiln` (the frozen sidebar/chrome
  color) with white-on-dark opacity steps instead of Tailwind
  `neutral-950`/`neutral-300`, fixing a contrast mismatch the mechanical
  pass would otherwise have introduced on a dark background.
- `components/workspace/executive/guided-journey.tsx` — same dark-surface
  treatment for the active step card, plus its "complete" state now uses
  `.isalwa-surface-green` instead of ad hoc emerald.
- `components/nav/architect-nav.tsx`, `components/workspace/workspace-tabs.tsx`
  — nav links, tab chips, and the section-progress bar now use
  `--isalwa-mist` / `--isalwa-kiln` / `--isalwa-glaze` and the shared
  `.isalwa-risk-bar` progress pattern.
- All focus rings (previously a generic gray `neutral` Tailwind ring) now
  use `--isalwa-glaze` at low opacity — one calm, on-brand focus color
  everywhere.

### 6. Flagship executive surfaces

`WelcomeBanner`, `ExecutiveDashboard`, `ConfidenceMeter`, `NextStepCta`, the
login screen, and the discovery score card/stepper were hand-reviewed after
the mechanical pass to make sure progress bars, status dots, and icon chips
use the correct law color for their meaning (e.g. health-score progress →
`--isalwa-info`, confidence meter fill → `--isalwa-glaze`, DNA
strength/risk dots → `--isalwa-success` / `--isalwa-warning` /
`--isalwa-danger`) rather than a leftover Tailwind palette shade.

## Constraints honored

- No functionality, routing, data, or consulting-engine changes — every
  edit is a className/CSS/token change or a typography/asset swap.
- No parallel component system — extended `@isalwa/ui` tokens/chrome and
  the existing local `components/ui/*` primitives; did not introduce a new
  UI library or duplicate `Panel`/`Button`/`Chip`/etc.
- Frozen language preserved and, in the font case, *restored*: porcelain,
  kiln, glaze, Newsreader italic titles, uppercase kickers, 8px rhythm,
  soft elevation, calm motion.

## Verification

- `pnpm --filter @isalwa/ui typecheck`
- `pnpm --filter @isalwa/architect typecheck`
- Manual diff review of all ~60 touched files for stray/garbled class
  strings (a mechanical pass hazard) — none remaining.

## Follow-ups (not in scope here)

- Point `apps/web` at the new shared `@isalwa/ui/chrome.css` instead of its
  local copy, to fully retire the duplication (safe, but touches a second
  app — deliberately excluded from this Architect-only mission).
- Extend the same section-identity treatment to `KnowledgeCenter`,
  `BusinessProcessesPanel`, and `DeliverablesPanel` bespoke chrome (they
  already inherit the token-level fixes from the mechanical pass, but don't
  yet use `SectionShell` for their outer frame).
