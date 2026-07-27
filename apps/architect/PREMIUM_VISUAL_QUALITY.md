# Premium Visual Quality Pass

**Status:** Complete
**App:** `apps/architect` (+ shared `packages/ui` tokens)
**Scope:** Presentation / CSS / className only — no functionality, routing,
business logic, or consulting-engine changes.

## Goal

Architect already had a real design system (Mission 9 — Premium Executive
Design System) and Mission 13's dashboard density, but several surfaces
still read as an internal admin tool rather than something a client would
pay a premium consultant to hand them: too much flat white, cards that
blended into the page, single-layer drop shadows, thin ad hoc dividers, and
a Living Report that read as a stack of form fields instead of a bound
executive document. This pass is a visual-quality upgrade — **not** a
redesign — that elevates the existing frozen language (porcelain, kiln,
glaze, Newsreader italic titles, uppercase kickers, 8px rhythm) instead of
replacing it.

## What shipped

### 1. Extended the shared token law (`packages/ui/src/tokens/tokens.css`)

Every addition is additive — nothing existing was renamed or removed, so
every current caller keeps its exact prior look until it opts in.

- **Richer shadow vocabulary** — `--isalwa-shadow-{resting,hover,floating}-rich`:
  multi-layer versions of the existing single-layer `-soft`/`-lift`/-floating`
  shadows (same kiln-at-low-alpha color, more layers stacked) so elevation
  reads as considered depth instead of one flat drop-shadow.
- **`--isalwa-inset-highlight`** — a 1px inset top highlight, the faint
  "glass edge" Linear/Stripe/Notion panels use instead of a flat single
  border.
- **`--isalwa-shadow-card-{resting,hover}`** — the rich shadow + inset
  highlight pre-combined into one token, specifically so it can be consumed
  via a Tailwind arbitrary-value utility (`shadow-[var(--isalwa-shadow-card-resting)]`).
  This keeps it inside Tailwind's own utility layer so existing `shadow-none`
  overrides at call sites still win through `tailwind-merge` — see
  "Constraints & gotchas" below.
- **`--isalwa-space-20` / `--isalwa-space-24`** (96px / 128px) — larger 8px-
  rhythm steps reserved for gaps *between* major sections, not padding
  inside a card.
- **`--isalwa-page-max-report`** (760px) — a narrower, printed-page-like
  measure for the Living Report body.
- **`--isalwa-surface-app`** — a layered radial-gradient wash (soft glaze
  top-left glow + soft copper top-right glow) composed with the existing
  `--isalwa-surface-hero`, replacing a single flat linear gradient as the
  page background.
- **Glass tokens** (`--isalwa-glass-dark-*`, `--isalwa-glass-light-*`,
  `--isalwa-glass-blur`) — reserved for sticky/floating chrome only (context
  bar, sticky tab rail). Documented as deliberately rare so it stays
  premium instead of becoming a second aesthetic.

### 2. Extended the shared chrome (`packages/ui/src/tokens/chrome.css`)

- `.isalwa-divider-fade` — a hairline that dissolves at both ends instead of
  running edge-to-edge.
- `.isalwa-section-gap` — applies `--isalwa-space-20` as `margin-top` between
  a container's children, for the large gaps between major sections.
- `.isalwa-glass-dark` / `.isalwa-glass-light` — the glass tokens above,
  packaged as utility classes.
- `.isalwa-card-premium` — an opt-in richer elevation class, documented for
  contexts that don't need `tailwind-merge` compatibility (Card itself uses
  the Tailwind-arbitrary-value form instead — see below).

### 3. Core primitives (`apps/architect/components/ui/*`)

- **`Card`** — default elevation upgraded to the multi-layer
  `--isalwa-shadow-card-resting` (+ inset highlight), border softened to the
  shared `--isalwa-border-subtle` token. Kept as a `shadow-[var(...)]`
  Tailwind arbitrary-value class (not a bespoke unlayered class) specifically
  so the ~10 existing call sites using `shadow-none` to flatten nested cards
  keep working via `tailwind-merge`.
- **`Button`** — default/secondary variants gained a matching richer hover
  shadow and a 1px hover/press lift (`hover:-translate-y-px`,
  `active:translate-y-0`) for a calmer, more tactile press.
- **`Separator`** — now a fade-to-transparent gradient line instead of a
  hard edge-to-edge rule (horizontal and vertical).
- **`Progress`** — fill is now a soft glaze→kiln gradient with the law's
  `ease-out` easing instead of a flat color snapping to width.

### 4. `SectionShell` — the shared surface every workspace tab is built from

More generous default padding (`px-6 py-7` → `sm:px-8 sm:py-9`, hero
`sm:px-10 sm:py-12`), the richer card shadow, and a new fade divider between
the header (kicker/title/description) and the body content — separating
identity from content without a hard rule.

### 5. The Living Report (`components/report/report-view.tsx`)

This was the most form-like surface in the app and is named explicitly in
the mission brief — restructured presentation only, every data source and
prop is unchanged:

- The whole report body is now bound in a single premium `Card` panel (a
  "paper" document) at a narrower `--isalwa-page-max-report` measure,
  instead of a bare page of stacked sections.
- Section labels no longer use the shared `.isalwa-kicker` class (which
  would force the glaze accent everywhere); most stay a quiet neutral slate
  label with a numbered index (01, 02, 03…) for report-like structure.
- A handful of executive-critical sections (Resumen ejecutivo, Patrones de
  riesgo, Puntos de dolor, Recomendaciones, Plan de implementación, Riesgos,
  Conclusión ejecutiva) borrow the same section-identity tint tokens
  `SectionShell` uses elsewhere (Mission 9) as a tinted callout — reusing an
  existing pattern instead of inventing a new one, and reserved for the
  sections an executive would actually flag in a printed report.
- Replaced the hard `<Separator />` between every one of 16 sections with
  `.isalwa-section-gap` (96px rhythm) — whitespace does the separating, the
  way Stripe/Notion long-form documents work, instead of a ruled line per
  section.
- Intro/lead sentences render in Newsreader italic at a larger size (an
  editorial "deck" line under each section label) instead of small italic
  gray text.
- Sections fade in on scroll (`whileInView`, once) instead of all animating
  on mount, appropriate for a long document.

### 6. Chrome polish

- **`ContextBar`** — glass-on-kiln (`isalwa-glass-dark`: translucent +
  blurred) instead of a flat solid fill, plus a soft bottom glow instead of
  a hard 1px rule. Same frozen kiln color underneath.
- **`WorkspaceTabs`** — sticky rail uses the shared glass-light token
  (consistent with the context bar above it), active tab pill gained a
  resting shadow, and the section-progress bar is now the same glaze→kiln
  gradient as `Progress`.
- **`ArchitectNav`** — active/hover states now use the shared transition
  token and a resting shadow on the active pill instead of a flat gray fill.
- **`WelcomeBanner`** — the "Recomendación de hoy" callout gained a resting
  shadow with a hover lift.
- **`ExecutiveDashboard` / `WorkspaceView`** — the 8-section briefing and the
  Dashboard tab's outer stack now use `.isalwa-section-gap` (96px) instead
  of a fixed 64px `space-y-16`, for expensive-feeling separation between
  major sections.
- **Login** (`app/login/page.tsx`, `components/auth/login-form.tsx`) — the
  form now sits inside a `Card` panel with a focus-ring token on inputs,
  instead of floating fields directly on the page background.

### 7. Global surface (`apps/architect/styles/globals.css`)

- `body` background now uses `--isalwa-surface-app` (layered radial glows +
  the existing hero gradient) instead of a single flat linear gradient.
- `.isalwa-sticky-section` now consumes the shared glass-light tokens
  instead of a bespoke inline blur value.

## Constraints honored

- No functionality, data, routing, or consulting-engine changes — every
  edit is a className/CSS/token change.
- No parallel design system — every new token/utility extends
  `packages/ui/src/tokens/{tokens,chrome}.css`; no new UI library, no
  duplicate `Card`/`Button`/`SectionShell`.
- Frozen language preserved: porcelain, kiln, glaze, Newsreader italic
  titles, uppercase kickers, 8px rhythm — all reused, none replaced. Glass
  is intentionally rare (2 sticky chrome surfaces only), per the "glass only
  where appropriate" brief.
- `pnpm --filter @isalwa/ui typecheck`, `pnpm --filter @isalwa/architect
  typecheck`, and `pnpm --filter @isalwa/architect build` all pass clean.

## Constraints & gotchas for future missions

- `apps/architect/styles/globals.css` documents that CSS written outside a
  Tailwind `@layer` block (which is exactly what `packages/ui`'s
  `tokens.css`/`chrome.css` are) beats **every** Tailwind utility class
  regardless of source order, because Tailwind v4 treats its own utilities
  as a lower-priority layer. This is why `Card`'s new elevation is written
  as a `shadow-[var(--isalwa-shadow-card-resting)]` Tailwind arbitrary value
  instead of a bespoke `.isalwa-card-premium` class — the former lets
  `tailwind-merge` correctly resolve a call site's `shadow-none` override;
  the latter would silently defeat it. Keep this in mind before adding any
  new "law" class that a call site might need to override via a plain
  Tailwind utility.
- `.isalwa-card-premium` is still defined in `chrome.css` as a documented
  opt-in for contexts that don't need that override behavior (e.g. a
  one-off non-`Card` element that will never receive a `shadow-none`
  override).

## Files changed

- `packages/ui/src/tokens/tokens.css`
- `packages/ui/src/tokens/chrome.css`
- `apps/architect/styles/globals.css`
- `apps/architect/components/ui/card.tsx`
- `apps/architect/components/ui/button.tsx`
- `apps/architect/components/ui/separator.tsx`
- `apps/architect/components/ui/progress.tsx`
- `apps/architect/components/workspace/section-shell.tsx`
- `apps/architect/components/report/report-view.tsx`
- `apps/architect/components/workspace/executive/context-bar.tsx`
- `apps/architect/components/workspace/workspace-tabs.tsx`
- `apps/architect/components/nav/architect-nav.tsx`
- `apps/architect/components/workspace/welcome-banner.tsx`
- `apps/architect/components/workspace/executive/executive-dashboard.tsx`
- `apps/architect/components/workspace/workspace-view.tsx`
- `apps/architect/components/auth/login-form.tsx`

## Explicitly out of scope

Per the mission brief: no i18n work, no adaptive reports, no uploads
pipeline changes, and no other queued mission started. This was one visual
pass, on top of everything Mission 9 and Mission 13 already built.
