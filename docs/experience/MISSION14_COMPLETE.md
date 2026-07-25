# Mission 14 — Complete

**Status:** Implemented  
**Depends on:** Mission 11 (visual) · Mission 12 (primitives) · Mission 13 (blueprint)  
**Constraint honored:** Feel only — no business features, workflow redesign, or architecture rewrites

---

## Implemented systems

| Part | What shipped |
|------|----------------|
| **1 Page transitions** | `PageTransition` wraps main content in `AppShell`. Fade + `translateY(var(--isalwa-distance-enter))`. Sidebar / mobile top bar stay put. |
| **2 Scroll** | Sticky dossier identity bar (existing) + `ReadingProgress` on Personas dossier. Sticky section utility (`.isalwa-sticky-section`). Anchor `scroll-margin-top`. No decorative parallax. |
| **3 Microinteractions** | Tokenized press scale (`--isalwa-scale-press`), selection glaze tint, toast provider, interactive utilities already in globals. |
| **4 Loading** | Route `loading.tsx` for Radar / Personas / Señal with layout-matched skeletons (`experience-skeletons.tsx`). No spinners. |
| **5 Empty states** | `EmptyState` / `EmptyPanel` gained `example` + `walkthrough`. Teaching copy on Radar, Personas, Señal, Memoria, Señal thread. |
| **6 ⌘K** | Raycast-style groups: Fijos · Recientes · Navegación · Comandos · Resultados. Favorites + recent via `localStorage`. Existing search API unchanged. |
| **7 Keyboard** | `?` shortcut sheet · `g` then letter nav · Esc / arrows in palette & tour. Visible kbd hints. |
| **8 Mobile** | Safe-area insets on top bar, drawer footer, sticky actions. Personas mobile cards wired (no horizontal table scroll). Señal back control ≥44px. Desktop chrome unchanged as reference. |
| **9 Motion tokens** | Extended `tokens.css` + `lib/motion.ts` (`instant`, `normal`, distance, opacity, scale, stagger). Reduced-motion collapses all to 0. |
| **10 Premium details** | Kiln sidebar hint contrast, selection, toast stack, shortcut entry from palette, tour button contrast. |
| **11 Demo mode** | `?demo=1` / `localStorage isalwa_demo_mode` / `NEXT_PUBLIC_DEMO_MODE=1`. Forces intro + optional tour; off = no trap for return users. |
| **12 Performance** | CSS-only transitions. No new animation libraries. No new npm deps. |

---

## Motion tokens

```css
--isalwa-motion-instant: 40ms;
--isalwa-motion-fast: 140ms;
--isalwa-motion-base / --isalwa-motion-normal: 220ms;
--isalwa-motion-slow: 360ms;
--isalwa-motion-deliberate: 520ms;
--isalwa-distance-enter: 8px;
--isalwa-distance-whisper: 6px;
--isalwa-opacity-muted: 0.45;
--isalwa-scale-press: 0.98;
--isalwa-stagger-step: 40ms;
```

JS mirror: `DURATION` + `MOTION` in `apps/web/src/lib/motion.ts`.

---

## Transition architecture

```
AppShell
├── Sidebar / mobile chrome (stable)
└── #isalwa-main
    └── ToastProvider
        ├── PageTransition  ← only this animates on route change
        │     └── {children}
        ├── CommandPalette
        ├── ShortcutSheet
        └── GlobalHotkeys
GuidedTour (overlay, outside content)
```

Content fades/translates; chrome does not remount.

---

## Key files

| Path | Role |
|------|------|
| `apps/web/src/lib/preferences.ts` | Intro / tour / demo / recent / favorites |
| `apps/web/src/lib/demo-mode.ts` | Public demo flag surface |
| `apps/web/src/components/page-transition.tsx` | Content transition |
| `apps/web/src/components/command-palette.tsx` | ⌘K Raycast groups |
| `apps/web/src/components/shortcut-sheet.tsx` | `?` cheat sheet |
| `apps/web/src/components/global-hotkeys.tsx` | `g` + letter |
| `apps/web/src/components/toast-provider.tsx` | Whisper toasts |
| `apps/web/src/components/reading-progress.tsx` | Dossier progress |
| `apps/web/src/components/experience-skeletons.tsx` | Loading layouts |
| `packages/ui/src/tokens/tokens.css` | Motion token law |
| `docs/experience/MISSION14_IMPLEMENTATION_PLAN.md` | Pre-impl plan |

---

## Performance impact

| Metric | Expectation |
|--------|-------------|
| New dependencies | **0** |
| Animation runtime | CSS transitions / existing keyframes only |
| Layout shift | Content opacity/transform only — no size animation on chrome |
| Frame budget | Target 60 FPS; reduced-motion → instant |
| Bundle | Small client components already in shell |

Before/after: no Lighthouse run in this pass — measure on preview with Performance panel (Interaction to Next Paint on ⌘K open, route change CLS ≈ 0).

---

## Accessibility verification

- [x] Skip link retained  
- [x] Palette `role="dialog"` + listbox options + Escape  
- [x] Shortcut sheet labelled dialog  
- [x] Toasts `aria-live="polite"`  
- [x] Skeletons `aria-busy` / labels  
- [x] Tour Esc / arrow keys  
- [x] Focus-visible styles unchanged on nav  

---

## Reduced-motion verification

- [x] Token collapse in `tokens.css` (instant/fast/base/slow/deliberate → 0; distances → 0)  
- [x] `.isalwa-page-transition` forced visible / no transition under `prefers-reduced-motion`  
- [x] Existing enter/whisper/skeleton overrides retained  
- [x] Intro already short-circuits ceremony when reduced motion  

---

## Demo mode

| Flag | Behavior |
|------|----------|
| Off (default) | Intro once (`isalwa_intro_v1_done`); tour button hides after dismiss/complete |
| `?demo=1` | Intro plays again; tour can auto-start if not marked done |
| `demo=0` | Forces off even if localStorage set |

Never traps returning users when flags are off.

---

## Screenshots

Capture on a local or preview build (suggested set):

1. **Route transition** — Pulso → Radar (content fade; sidebar still)  
2. **⌘K** — empty query showing Recientes / Navegación / Comandos  
3. **⌘K search** — client hit under Resultados  
4. **Shortcut sheet** — `?` overlay  
5. **Radar skeleton** — throttle network, navigate to /radar  
6. **Radar empty** — teaching empty with example  
7. **Personas mobile** — card list (no horizontal scroll)  
8. **Dossier** — sticky bar + reading progress line  
9. **Demo intro** — `/?demo=1` ceremony  
10. **Reduced motion** — OS setting on; no content slide  

*(Binary screenshots intentionally omitted from git — attach in PR review notes.)*

---

## Remaining opportunities (post–M14)

- Optimistic UI on check-in / quote save (where API already supports)  
- Progressive section reveal via IntersectionObserver (`.isalwa-enter` on scroll)  
- Chart / map hover tokens in Territorio (light touch)  
- Copy-to-clipboard → `useToast`  
- FLIP shared-element between list → dossier (explicitly out of M14)  
- Narrated walkthrough audio (flagged in M13; still out)  
- Full Lighthouse / INP baseline commit in CI  

---

## Success check

The product should feel like one commercial operating system: stable chrome, connected routes, teaching empties, a keyboard-first palette, and motion that explains — never decoration.

A first-time user (or `?demo=1`) should notice: **this feels intentional.**
