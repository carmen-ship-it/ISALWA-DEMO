---
name: ISALWA Motion System
description: Unified motion token layer — CSS globals + JS companion. Rules for transitions, animations, loading states, and reduced-motion compliance.
---

## The system

Two files form the motion layer:

- `apps/web/src/app/globals.css` — all keyframes, animation classes, transition utilities
- `apps/web/src/lib/motion.ts` — JS constants that mirror the CSS tokens exactly

## CSS token values (from tokens.css — do not reinvent)

```
--isalwa-motion-fast:       140ms   ← hover, chip toggles, icon swaps
--isalwa-motion-base:       220ms   ← panel reveals, message entrance
--isalwa-motion-slow:       360ms   ← overlay fades, tooltips, success flash
--isalwa-motion-deliberate: 520ms   ← page enters, bar fills, map pins

--isalwa-ease-out:    cubic-bezier(0.16, 1, 0.3, 1)
--isalwa-ease-in-out: cubic-bezier(0.45, 0, 0.15, 1)
--isalwa-ease-spring: cubic-bezier(0.22, 1.2, 0.36, 1)
```

Tokens.css already sets all motion tokens to 0ms under `prefers-reduced-motion: reduce`. Any inline transition that uses the CSS variables gets reduced-motion for free.

## Transition rules

**Never hardcode millisecond values.** Instead:

- In className (Tailwind): `duration-[var(--isalwa-motion-fast)]`
- In inline style: `transition: 'background-color var(--isalwa-motion-fast) var(--isalwa-ease-out)'`
- In JS animations: `import { dur, tFast } from '@/lib/motion'` then `dur('fast')` for ms, `tFast('transform', 'box-shadow')` for transition strings

**Be specific about properties.** Never use `transition: all` — it causes repaints on irrelevant properties and makes it hard to reason about what is animated.

## CSS utility classes available

| Class | Purpose |
|-------|---------|
| `.isalwa-t-fast` | Transition shorthand — bg, border, color, shadow, transform, opacity at fast speed |
| `.isalwa-t-base` | Same at base speed |
| `.isalwa-interactive` | t-fast + cursor:pointer + active:scale(0.97) — full interactive treatment |
| `.isalwa-enter` | Slide-up + fade entrance (deliberate speed) |
| `.isalwa-fade-in` | Opacity-only entrance (base speed) |
| `.isalwa-slide-left` | Slide from right + fade (base speed) |
| `.isalwa-whisper` | Small slide-up + fade (slow speed) |
| `.isalwa-message-in` | Message bubble entrance (base speed) |
| `.isalwa-enter-delay-1…10` | 60ms-step stagger delays (use with .isalwa-enter) |
| `.isalwa-skeleton` | Shimmer loading placeholder |
| `.isalwa-loading-dot` | 3-dot bounce animation (use 3 spans as siblings) |
| `.isalwa-alive-dot` | Ambient breathe pulse (for live indicators) |
| `.isalwa-success-flash` | One-shot green glow ring |
| `.isalwa-bar-expand` | Left-to-right progress bar fill |
| `.isalwa-map-pin` | Map pin entry animation |
| `.isalwa-hero-pin` | Map pin + continuous glaze pulse ring |
| `.isalwa-risk-pin` | Map pin + continuous danger pulse ring |
| `.cierre-quote-row` | Quote history row hover background |

## motion.ts exports

```ts
import { DURATION, EASING, reducedMotion, dur, stagger, t, tFast, tBase } from '@/lib/motion';

dur('fast')           // → 140 (or 0 on reduced-motion)
stagger(index)        // → index * 40ms (or 0 on reduced-motion)
tFast('transform')    // → 'transform 140ms cubic-bezier(0.16,1,0.3,1)' or 'none'
tBase('opacity', 'color') // → multi-property base-speed transition string or 'none'
```

## Loading states

- **Skeleton placeholder**: apply `.isalwa-skeleton` to div blocks mimicking content shape
- **3-dot indicator**: three `<span className="isalwa-loading-dot" />` siblings inside a button/span
- **Text fallback**: only when skeleton doesn't fit the context (e.g., "Sin resultados")

## Hover patterns

- **Background hover**: `onMouseEnter`/`onMouseLeave` is acceptable but must use token colors
- **Border hover**: `border-color var(--isalwa-motion-fast) var(--isalwa-ease-out)` — never `border-color 120ms`
- **Scale on press**: `.isalwa-interactive` class, or add `active:scale-[0.97]` to Tailwind buttons

## Reduced-motion compliance

CSS token collapse handles transitions automatically. For keyframe animations, globals.css sets `animation: none !important` on all animation classes under `@media (prefers-reduced-motion: reduce)`. JS animations must call `reducedMotion()` or `dur()` before running.

**Why:** Respect for users with vestibular disorders. The system is designed so that reduced-motion is a zero-effort guarantee — use the tokens and you get compliance for free.
