# Mission 11 — Premium Product Polish · Plan

**Scope:** Visual presentation only (`apps/web`, `packages/ui`).  
**Out of scope:** Architecture, frameworks, routing, auth, APIs, DB models, business logic.

---

## Visual audit (current state)

### Strengths (keep / refine, do not rebuild)

- Porcelain + kiln + glaze palette already reads “premium product,” not admin template.
- Mission 10 motion system (`isalwa-enter`, whisper, risk bars, map pins, intro) is tasteful.
- `ExperienceHeader`, `Panel`, `Button`, `StatusPill` exist and are close to a design system.
- Pulso sentence + vitals, Radar risk-first rows, Personas hero cards, Territorio map, and Intro ceremony already feel intentional.

### Gaps (why it still feels “internal dashboard”)

| Area | Finding |
|------|---------|
| Spacing | Token scale exists (`--isalwa-space-*`) but pages mix Tailwind and arbitrary px (`18px 20px`, `11px`, `mb-7`/`mb-9`/`mb-11`). |
| Headers | Dual systems: `ExperienceHeader` vs hand-rolled kickers (Pulso, Cierre, Señal, Territorio). |
| Cards | Soft shadow/radius mostly correct; padding and hover elevation inconsistent. |
| Buttons | Primary/secondary/ghost exist; no danger variant; many Link-as-button duplicates. |
| Sidebar | Active rail is good; aside is not a column flex so footer does not pin; hover/active can be softer. |
| Typography | Kickers vary (11px / `text-sm`, tracking 0.14–0.18em); metric values not always dominant. |
| Memoria | Honest stub nested in a Panel — reads empty, not inviting. |
| Radar | High scores do not elevate enough vs mid scores. |
| Cierre / QuoteCanvas | Local style sprawl; catalog + history feel utilitarian vs enjoyable. |
| Tables | Personas table works but row height / hover / dividers need calm density. |

### Screenshots list (capture after polish)

1. Sidebar — active Pulso + hover Radar  
2. Pulso — sentence + vitals + attention inbox  
3. Radar — top urgency rows  
4. Personas — hero grid + table  
5. Personas dossier — identity + AI summary (if touched)  
6. Cierre — catalog + quote builder + history  
7. Memoria — guided empty composition  
8. Mobile — sidebar collapse + Pulso stack  

---

## Improvements planned

### Global design language

1. **Tokens** — Soften shadows slightly; bump panel radius (~16px); reinforce 8px rhythm; add label/kicker text token; keep porcelain aesthetic (desaturate if needed).
2. **Page chrome** — Shared utility classes: `.isalwa-page`, `.isalwa-kicker`, `.isalwa-metric`, `.isalwa-section`, `.isalwa-inbox-row`.
3. **ExperienceHeader** — Normalize spacing to 8px grid (mb-8, mt-2/3/4); uppercase tracking for kickers.
4. **Panel** — Optional `padded` prop; consistent soft border + lift hover.
5. **Button** — Add `danger`; normalize height/radius; keep press scale.
6. **StatusPill** — Slightly softer chip treatment; optional glaze/copper-adjacent info tone already fine.
7. **Motion** — Prefer existing CSS utilities; wire page entrances; no new animation libraries.

### Shell

- Make aside `flex flex-col`; pin footer with `mt-auto`.
- Softer hover, clearer active (rail + background).
- Cleaner brand row + ⌘K; align nav padding to 8px grid.

### Pages (presentation only)

| Screen | Plan |
|--------|------|
| **Pulso** | Align header to system; equal-height vitals; attention list as premium inbox; 8px padding rhythm. |
| **Radar** | Elevate score ≥90 (danger lift / stronger bar); better row padding & hover; focus rings via token. |
| **Personas** | Hero cards breathing room; table row height, hover, StatusPill segments; section labels. |
| **Cierre** | Header parity; history rows as inbox-like list; QuoteCanvas softer cards/search/chips (styles only). |
| **Memoria** | Remove double-panel emptiness; preview cards + timeline placeholders + soft guidance (no fake API). |
| **Señal / Territorio** | Light consistency pass only if time (padding / header) — already strong; do not redesign. |

### Components affected

- `packages/ui/src/tokens/tokens.css`
- `packages/ui/src/components/button.tsx`
- `packages/ui/src/components/panel.tsx`
- `packages/ui/src/components/status-pill.tsx`
- `packages/ui/src/components/experience.tsx`
- `packages/ui/src/index.ts` (if exports change)
- `apps/web/src/app/globals.css`
- `apps/web/src/components/app-shell.tsx`
- `apps/web/src/app/pulso/page.tsx`
- `apps/web/src/app/radar/page.tsx`
- `apps/web/src/app/personas/page.tsx`
- `apps/web/src/app/cierre/page.tsx`
- `apps/web/src/components/quote-canvas.tsx` (styles / classNames only)
- `apps/web/src/app/memoria/page.tsx`
- Light touch: `personas/[id]/page.tsx` only if quick header/CTA consistency fits

### Explicit non-goals

- No new UI library, no Framer Motion, no route/API/schema changes.
- Do not invent Memoria backend features.
- If a surface already looks excellent (Intro, map pins), refine only.

---

## Success criteria

Someone viewing screenshots believes this is mature enterprise SaaS (Linear / Stripe Dashboard calm), not a Bootstrap admin template — while all wording, metrics, and flows remain unchanged.
