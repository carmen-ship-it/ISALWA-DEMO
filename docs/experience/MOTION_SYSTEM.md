# Motion System

**Law:** Motion explains, reassures, teaches, or connects. If it does none, remove it.

**Stack (frozen):** CSS tokens + `lib/motion.ts` + `globals.css` utilities. No Framer Motion unless explicitly approved later.

---

## Token table (canonical)

| Token | Duration | Use |
|-------|----------|-----|
| `--isalwa-motion-fast` | 140ms | Hover, press, chip, color |
| `--isalwa-motion-base` | 220ms | Panel reveal, message in, standard enter |
| `--isalwa-motion-slow` | 360ms | Overlay, whisper, success flash |
| `--isalwa-motion-deliberate` | 520ms | Page enter, bar fill, map pin |

| Easing | Use |
|--------|-----|
| `--isalwa-ease-out` | Default UI |
| `--isalwa-ease-in-out` | Loops, shimmer |
| `--isalwa-ease-spring` | Map pins only (rare) |

`prefers-reduced-motion: reduce` → all durations **0ms** in tokens; keyframe utilities disabled in globals.

JS must use `dur()`, `reducedMotion()`, `stagger()`, `t()` from `apps/web/src/lib/motion.ts`.

---

## Why-is-this-moving? test

Before any new animation:

1. **Explain** — Does it show cause → effect? (bar fill = score magnitude)
2. **Reassure** — Does it confirm action landed? (success burst on check-in)
3. **Teach** — Does it direct attention? (tour spotlight, enter stagger hierarchy)
4. **Connect** — Does it link two states? (shared element name → dossier)

If none apply → static.

---

## Allowed motion vocabulary

| Verb | Implementation | Where |
|------|----------------|-------|
| Enter | `.isalwa-enter` + stagger | Lists, vitals, cards |
| Whisper | `.isalwa-whisper` | Insight, toasts, overlays |
| Fade | `.isalwa-fade-in` | Tooltips, drawers backdrop |
| Slide-left | `.isalwa-slide-left` | Mobile nav drawer |
| Lift | Panel `interactive` hover | Cards |
| Press | `active:scale(0.98)` | Buttons |
| Fill | `.isalwa-bar-expand` / risk bar | Scores |
| Settle | Map pin spring | Territorio |
| Pulse | Alive-dot / hero-pin / risk-pin | Live / risk only |
| Count | `AnimatedValue` + `dur('deliberate')` | Metrics |

## Forbidden

- Parallax on app chrome
- Bounce/elastic on forms
- Continuous attention-stealing loops (except status “live”)
- Page-wide slide transitions that move the sidebar
- Confetti / particle systems
- Motion that delays task completion >300ms for power users without skip

---

## Choreography patterns

### Hierarchy enter
Parent header enters first; children stagger 40ms (cap 12). Metrics count after layout paint.

### Attention
Risk/urgency uses color + bar width first; motion only reinforces (bar expand once).

### Confirmation
One-shot `.isalwa-success-flash` or toast whisper — never modal for routine success.

### Spatial
Map pins: spring settle then optional pulse. Clusters: expand with base duration.

---

## Reduced motion contract

| Full motion | Reduced |
|-------------|---------|
| Intro 7.5s ceremony | Ready state @ 1.5s |
| Count-up | Snap to value |
| Enter/stagger | Instant opacity 1 |
| Drawer slide | Instant show |
| Pin spring | Instant place |

Never disable information — only decoration.

---

## Implementation guidance (future)

- Prefer class utilities over ad-hoc ms strings
- New keyframes only if vocabulary lacks a verb
- Document each new verb here before merging
