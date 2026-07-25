# Mission 14 — Implementation Plan

**Status:** Implemented — see `MISSION14_COMPLETE.md`  
**Frozen:** Mission 11 visual language · Mission 12 primitives · AI Constitution  
**Constraint:** Feel only — no business features, workflow changes, or architecture rewrites

---

## Scope (in)

| Part | Implementation approach |
|------|-------------------------|
| 1 Page transitions | Client `PageTransition` wrapper: content-only fade + 8px translate; sidebar/header untouched |
| 2 Scroll | Dossier sticky already; add optional reading progress on dossier; timeline `.isalwa-enter` already; no parallax |
| 3 Microinteractions | Tokenize hover/press via existing utilities; toast for copy; standardize focus |
| 4 Loading | Skeleton components for Radar/Personas/Señal list loading UI helpers; use Skeleton from UI |
| 5 Empty states | Enrich EmptyPanel/EmptyState copy + example + CTA on key pages |
| 6 ⌘K | Client-only: Nav + Commands + Recientes + Favorites (localStorage) + existing search |
| 7 Keyboard | `?` cheat sheet; `g` then key nav; Esc/arrows already |
| 8 Mobile | Safe-area CSS; Señal swipe-back hint; Personas cards verify; touch targets |
| 9 Motion tokens | Extend tokens.css with distance/opacity/scale/stagger named aliases; wire CSS vars |
| 10 Premium details | Contrast kiln hints; selection; toast; shortcut hints in palette |
| 11 Demo mode | `?demo=1` or `localStorage isalwa_demo_mode` + `NEXT_PUBLIC_DEMO_MODE`; force intro/tour |
| 12 Performance | CSS-only transitions; no new deps; document before/after notes |

## Scope (out)

- Backend search for quotes/invoices (no API changes) — palette commands navigate only  
- Narrated audio / music  
- Framer Motion  
- Redesign Territorio / QuoteCanvas internals (light token use only if cheap)  
- Shared-element FLIP  

## Architecture

```
apps/web/src/components/
  page-transition.tsx     # content transition
  toast-provider.tsx      # whisper toasts
  shortcut-sheet.tsx      # ? modal
  demo-mode.ts            # flag helpers
  command-palette.tsx     # extend (Raycast groups)
lib/
  recent-nav.ts           # localStorage ring
  preferences.ts          # intro/tour/demo keys
```

AppShell wraps children with `PageTransition` + `ToastProvider`.

## Motion token additions (tokens.css)

```
--isalwa-motion-instant: 0ms (or 40ms)
--isalwa-distance-enter: 8px
--isalwa-opacity-muted: 0.4
--isalwa-scale-press: 0.98
--isalwa-stagger-step: 40ms
```

Map to existing fast/base/slow/deliberate (no parallel timing system).

## Verification checklist

- [ ] prefers-reduced-motion → no content slide  
- [ ] Keyboard: ⌘K, ?, g-p / g-r / …, Esc  
- [ ] Intro persists across sessions  
- [ ] Tour persists when completed  
- [ ] Demo mode forces ceremony without trapping return users (flag off)  
- [ ] Types + build  
- [ ] Screenshots list in COMPLETE  

## PR discipline

One cohesive experience PR acceptable for Mission 14; avoid drive-by refactors outside listed files.
