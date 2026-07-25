# Mission 12 — Design System Consolidation · Audit

**Date:** 2026-07-25  
**Frozen baseline:** `MISSION11_PLAN.md`, `MISSION11_COMPLETE.md` (do not undo)  
**Scope:** Consistency only — extract-reuse, not redesign.

---

## Verdict

Mission 11 chrome is real on Radar, Personas list, Cierre list, and Memoria.  
Señal, Territorio, dossier body, QuoteCanvas, and quote/invoice details still feel like parallel systems (inline styles + local TOKEN maps).

**Goal:** one product, one dialect.

---

## Screenshots (capture set)

Place captures under `docs/design/screenshots/m12/`:

| # | File | What to show |
|---|------|----------------|
| 1 | `01-sidebar-desktop.png` | Kiln sidebar, active Pulso, soft hover |
| 2 | `02-pulso.png` | Kicker + sentence + vitals + inbox |
| 3 | `03-radar.png` | Critical row elevation |
| 4 | `04-personas.png` | Heroes + table |
| 5 | `05-dossier.png` | Sticky bar + AI insight + vitals |
| 6 | `06-cierre.png` | Catalog + quote + history |
| 7 | `07-senal.png` | Inbox + thread (pre-mobile fix) |
| 8 | `08-territorio.png` | Map + stats strip |
| 9 | `09-memoria.png` | Preview + timeline placeholders |
| 10 | `10-mobile-nav.png` | Responsive nav |
| 11 | `11-mobile-senal.png` | Stacked master-detail |
| 12 | `12-mobile-personas.png` | Cards instead of wide table |

*Capture after Phase 3 for mobile shots; before/after optional for Señal.*

---

## Page inventory

| Route | File | Chrome tier |
|-------|------|-------------|
| `/` | `app/page.tsx` → Intro | Ceremony (leave) |
| `/pulso` | `pulso/page.tsx` | Half — `.isalwa-page`, custom header |
| `/radar` | `radar/page.tsx` | Aligned |
| `/personas` | `personas/page.tsx` | Aligned |
| `/personas/[id]` | `personas/[id]/page.tsx` | Half — page class, inline body |
| `/territorio` | `territorio` → `territory-map.tsx` | Pre-system |
| `/senal` | `senal/page.tsx` | Pre-system |
| `/cierre` | `cierre/page.tsx` | Aligned |
| `/cierre/cotizaciones/[id]` | detail page | Pre-system |
| `/cierre/facturas/[id]` | detail page | Pre-system |
| `/memoria` | `memoria/page.tsx` | Aligned |

---

## Inconsistency matrix

| Area | Finding |
|------|---------|
| Spacing | Mission 11 pages use 8px rhythm; Señal/Territorio/details use arbitrary inline px |
| Typography | Dual headers — `ExperienceHeader` vs hand-rolled kickers |
| Buttons | `Button` underused; many Link-as-button copies |
| Icons | No shared icon size scale; timeline icons local |
| Radius | Panel 16px on M11; some 4–10px freelancing remains in map/tooltips |
| Hover | `.isalwa-inbox-row` / `.cierre-quote-row` / `.senal-convo-row` — three cousins |
| Empty states | `EmptyState` vs hand-rolled in Pulso/Señal/QuoteCanvas/dossier |
| Loading | `Skeleton` component unused; CSS `.isalwa-skeleton` only in QuoteCanvas |
| Cards | Pulso vitals ≠ Señal stats ≠ dossier vitals |
| Tables | Personas `min-w-[640px]` forces horizontal scroll on mobile |
| Forms | `.isalwa-field` exists; command palette / payment still ad-hoc |
| Headers | See chrome tier table |
| Badges/chips | `StatusPill` vs custom pills in QuoteCanvas/Territorio |
| Page widths | `.isalwa-page` max 1120px; Señal/Territorio full bleed without container |
| Animations | Strong CSS system; `lib/motion.ts` **dead** (zero imports) |
| Focus | Global good; some `tabIndex={-1}` card traps; table rows not fully keyboard |
| Responsive | Señal fixed 340px pane; dossier `grid-cols-3`; map minHeight 540 |

---

## Component gap analysis

| Candidate | Status | Closest existing |
|-----------|--------|------------------|
| PageContainer | Partial (`.isalwa-page`) | Promote to component |
| PageSection | Missing | Bordered white sections |
| SectionHeader | Missing | `.isalwa-section-label` |
| MetricCard | Missing | Pulso vitals |
| StatGroup | Missing | Señal/Territorio strips |
| ListRow | Missing | inbox / cierre / senal rows |
| EmptyPanel | Partial | `EmptyState` |
| SearchField | Missing | `.isalwa-field` |
| Chip | Partial | CSS `.isalwa-chip` unused in TSX |
| ActionBar | Missing | Dossier sticky |
| Timeline | Missing | Dossier + Memoria |
| InsightCard | Missing | AI blockquote |
| Toolbar | Missing | Tabs/filters |
| DashboardGrid | Missing | Responsive grids |
| SidebarSection | Missing | Dossier side column |

**Keep as-is (excellent):** Intro, Radar risk cards, map pin motion, CommandPalette whisper.

---

## Dead / duplicate code

- `apps/web/src/lib/motion.ts` — unused  
- CSS utilities unused in TSX: `.isalwa-t-fast`, `.isalwa-t-base`, `.isalwa-interactive`, `.isalwa-chip`, `.isalwa-tooltip`, `.isalwa-count-badge`, `.isalwa-divider`  
- `Skeleton` React export unused  
- `ExperiencePlaceholder` unused  
- Duplicate channel colors: `senal/page.tsx` ↔ `signal-conversation.tsx`  
- Local `TOKEN` in `quote-canvas.tsx`

---

## Priority ranked consolidation plan

1. Extract `PageContainer`, `SectionHeader`, `MetricCard`, `StatGroup`, `ListRow`, `SearchField`, `Chip`, `ActionBar`, `Timeline`, `InsightCard`, `PageSection`  
2. Adopt on Pulso, Radar (light), Personas, Cierre, Memoria, dossier, details  
3. Señal + Territorio header/stats onto shared primitives (layout preserved)  
4. Mobile: collapsible nav drawer, Señal master-detail stack, Personas card list, no horizontal scroll, sticky QuoteCanvas actions  
5. Wire `motion.ts`; a11y landmarks + focus; soft micro-interactions only  
6. Perf: drop dead utilities or adopt them; no new deps  

---

## Explicit non-goals

- No redesign of Intro, Radar risk-first pattern, or map pins  
- No API / route / auth / DB changes  
- Do not undo Mission 11 tokens, shadows, or porcelain aesthetic
