# PP-6 — Visual hierarchy / mobile / global shell

**Lane:** PP-6  
**Mode:** READ-ONLY audit (no product code edited)  
**Date:** 2026-09-17  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo`  
**Local HEAD (committed):** `8f1ac76185af432bb244ea94b7ae6a647eaa0ebc`  
**Working tree:** dirty (RC3 product + evidence uncommitted; this receipt inspects on-disk sources including uncommitted hierarchy fixes)  
**Authority:** Frozen ISALWA language — porcelain canvas · kiln structure · glaze accents · Newsreader italic titles · uppercase kickers · 8px rhythm · soft elevation (`packages/ui/src/tokens/tokens.css`, Mission 11/12, AI Constitution)  
**Prior gap receipt:** `v1-canonical-consolidation/workers/VISUAL_HIERARCHY_GAP.md`  
**Hosted visual notes:** `CT3_VISUAL_ACCEPTANCE.md` (**USER_ACCEPTED = NO**)

---

## Verdict

| Field | Value |
|---|---|
| **PP6_STATUS** | **PARTIAL** |
| **LANGUAGE_LAW** | **PASS** — no competing palette/framework; porcelain/kiln/glaze still law |
| **HIERARCHY_COHERENCE** | **PARTIAL** — senior patterns landed; parallel shells and coverage gaps remain |
| **MOBILE_SHELL** | **PASS (code)** — drawer, safe-area, pane switches, Cliente360 tab select; hosted BV UNPROVEN for RC3 |
| **USER_ACCEPTED** | **NO** |
| **BROWSER_VERIFIED_RC3** | **UNPROVEN** (local static audit only) |
| **BLOCKS_RC3_CUT** | **No** as a functional security/auth gate — visual acceptance remains owner-walkthrough debt |

**One-line:** Design tokens and global shell still speak porcelain/kiln/glaze; hierarchy is better than the morning gap receipt (shared steppers, Timeline historial, ops sticky, WhoHasTheBallCard, StatGroup Resumen) but is not yet one command language across quote / opportunity / pedido / Cliente360, and whitespace on commercial record pages remains a mobile risk.

---

## Contract checklist

| Contract pillar | Expected | Current signal | Score |
|---|---|---|---|
| Porcelain canvas vs white ops | Canvas = porcelain; cards/command = white/ops/glass | `app-shell` canvas; `Cliente360Sticky` ops glass; commercial desks white | **PASS** |
| Kiln titles + glaze kickers | Newsreader italic + uppercase glaze kickers | `ExperienceHeader` / `isalwa-page-title` / `isalwa-kicker` widely used | **PASS** |
| Soft status chips | `StatusPill` muted tones; never neon | Shared `StatusPill` tones in `@isalwa/ui` | **PASS** |
| Next-action focal surface | One hero per record / Cliente360 command | `ProximoPasoStrip` (Cliente360) + `RecordNextStep` (commercial) — token-aligned twins, not one hero | **PARTIAL** |
| Who-has-the-ball | Shared responsibility card | `WhoHasTheBallCard` exists; **quote only** | **PARTIAL** |
| Tabs | Soft teal selected; mobile usable | Cliente360 `visual-status` tabs + `<select>` &lt;sm | **PASS** |
| Timeline | `@isalwa/ui` `Timeline` | Party historial + origin use `Timeline`; pedido page still ad-hoc list | **PARTIAL** |
| Progress steppers | Shared tint chips | Commercial → `ProcessStepIndicator`; delivery/pedido lifecycle still local twins | **PARTIAL** |
| Button ≠ input | Filled/outline actions ≠ mist field chrome | Design-system `Button` vs `.isalwa-field` distinct; host ad-hoc secondary/filter buttons can still rhyme with fields | **PARTIAL** |
| Dead whitespace | 8px rhythm; no empty luxury padding stacks | `p-8 md:p-10` + repeated `mt-10` on quote/pedido | **RISK** |
| Mobile | No body overflow; drawers/panes | Shell + Conversaciones + Mapa + Cliente360 patterns present | **PASS (code)** |

---

## 1. Tokens & global shell

### Tokens (law intact)

- Source of truth: `packages/ui/src/tokens/tokens.css` — `--isalwa-porcelain`, `--isalwa-kiln`, `--isalwa-glaze`, soft status, 8px `--isalwa-space-*`, panel radius 16, rich card shadows, glass chrome.
- Host remap: `apps/os-web/app/globals.css` sets `--isalwa-action` → kiln (command-center primary navy) and keeps porcelain canvas wash.
- Surface constitution honored in comments and sticky chrome: porcelain = canvas only; ops = white / glass.

### App shell

| Concern | Evidence | Notes |
|---|---|---|
| Canvas | `min-h-screen bg-[var(--isalwa-surface-canvas)]` | Porcelain page field |
| Desktop rail | Kiln/sky mix sidebar, collapsible ≥ lg | Brand = Newsreader italic “ISALWA” |
| Top chrome | `isalwa-glass-light` sticky header + safe-area | ⌘K, account, demo/eval controls |
| Mobile nav | Fixed overlay + porcelain drawer, Escape, focus trap, body scroll lock | Closes on route change |
| Breadcrumbs / banners | Under header; RolePreview + Demo banners | Header can feel crowded on 390 with demo+eval toggles |

**Language check:** No purple/indigo CRM skin, no Inter/Roboto hero stack, no second component library. Demo chrome uses near-glaze hex literals (`#2C8C88`, `#EAF6F4`) in a few demo files — **token drift**, not a new language, but should consume `--isalwa-glaze` / `--isalwa-teal-100`.

---

## 2. Status chips

| Artifact | Role | Compliance |
|---|---|---|
| `StatusPill` (`packages/ui/.../status-pill.tsx`) | Non-interactive status | Soft mixes of success/warning/danger/info + `manual` (copper) + `demo` (dashed) |
| `Chip` (`.isalwa-chip`) | Interactive filter/toggle | Pill radius, pressed = soft glaze — correctly **not** a StatusPill |
| Host usage | Work, map, conversations, commercial, certainty | Generally import `StatusPill`; no neon custom chips found on major desks |

**Finding:** Chip vocabulary is coherent. Risk is **over-use of StatusPill as decoration** on map portfolio value lines (info/neutral piles) — scannability, not language break.

---

## 3. Next-action

| Shell | Surface | Used on |
|---|---|---|
| `ProximoPasoStrip` | `surface-context` / `surface-attention` + Newsreader statement + StatusPill overdue | Cliente360 sticky command |
| `RecordNextStep` | Same context surface recipe | Quote, opportunity, pedido |

**Improvements vs gap receipt:** `RecordNextStep` no longer plain white-only; Cliente360 Resumen (`Cliente360Now`) **points to** `#cliente360-command` instead of replaying a second InsightCard hero.

**Remaining gap:** Two host components for one job — no single `@isalwa/ui` NextActionHero. Quote page stacks **progress strip + PageHeader actions + RecordNextStep + WhoHasTheBallCard** before the document card — focal hierarchy competes rather than one clear hero.

---

## 4. Who-has-the-ball

| Layer | State |
|---|---|
| Logic | `whoHasTheBallView` + tests — **IMPLEMENTED / TESTED** |
| UI card | `WhoHasTheBallCard` — `Panel` + `SectionHeader` kicker “Responsabilidad” + StatusPill tone + waiting amber band |
| Mount points | **Quote detail only** (`cotizaciones/[quoteId]/page.tsx`) |

**Missing mounts:** opportunity, pedido, Cliente360 Resumen / Trabajo. `WhoToAskCard` remains a parallel certainty pattern (same Panel language — acceptable if both stay Panel+kicker).

**Proof:** IMPLEMENTED (card) · TESTED (view model) · BROWSER-VERIFIED **UNPROVEN** · coverage **incomplete**.

---

## 5. Tabs

| Surface | Pattern | Mobile |
|---|---|---|
| Cliente360 | `clienteTabActiveClass` / inactive — glaze underline + `surface-active` | `<select>` below `sm`; horizontal scroll tabs ≥ sm |
| Inicio lenses | `InicioLensTabs` — mist/white inactive, kiln active border | Flex wrap |
| Conversaciones filters | List filter chips inside pane | List ↔ thread pane switch |
| Producción / Mapa | `Chip` toggles | Mapa map/list Chip pair |

**Finding:** Cliente360 tabs match constitution. Sticky command band uses ops glass (`Cliente360Sticky`) — prior porcelain-bleed gap **closed** in current sources.

---

## 6. Timeline

| Surface | Implementation |
|---|---|
| Cliente360 historial | `PartyTimelineList` → `@isalwa/ui` `Timeline` with semantic tones |
| Conversation origin callout | Separate ops `Timeline` block (white ops, not porcelain box) |
| Incidencias / delivery / coordination / admin access | Shared `Timeline` |
| Pedido detail historial | **Custom** `<details>` + mapped rows (not `Timeline`) |

**Finding:** Major historial path aligned; pedido still a local list — hierarchy inconsistency on the post-sale desk.

---

## 7. Progress steppers

| Component | Backing | Where |
|---|---|---|
| `ProcessStepIndicator` | Tint green / teal / amber / mist chips | Map quick view; **via** `CommercialProgressStrip` on quote/opportunity |
| `DeliveryProgressStrip` | Same tint recipe, local markup | Entregas list |
| `PedidoLifecycleStrip` | Similar ✓/○ chips inside white `PageSection` | Pedido detail |

**Finding:** Commercial lane consolidated (gap #10 from morning receipt **mitigated**). Delivery + pedido lifecycle still **forked steppers** — same visual intent, three code paths. Prefer wrapping `ProcessStepIndicator` (or shared `toneClass`) before inventing a fourth.

---

## 8. Button ≠ input

**Design system (PASS):**

- `Button` primary = filled action; secondary = **kiln-border** outline on white; contextual = glaze fill.
- `.isalwa-field` = mist border, full-width, placeholder — hover/focus glaze, not filled.
- `.isalwa-chip` = shorter pill, cursor pointer, pressed glaze wash.

**Host drift (PARTIAL):**

- Many forms re-copy field classes inline (`bg-white` + mist border + `radius-control`) instead of `SearchField` / `.isalwa-field` — same look, harder to keep distinct from outline buttons.
- Filter / toolbar controls on list desks sometimes use white + mist border at `h-10` (closer to fields than to `Button` secondary kiln outline).
- Auth login/reset inputs use `rounded-full` — diverges from `radius-control` field law (auth-only; not app shell).

**Rule reminder for future work:** one filled navy primary per command region; secondary = kiln outline; fields = mist; never style a submit control as a blank mist field.

---

## 9. Dead whitespace risks (major routes)

| Route | Hierarchy note | Whitespace / density risk |
|---|---|---|
| `/inicio` | Visual band + summary + queues | Generally composed; management lens can stack tall — expected |
| `/clientes` + Cliente360 | Sticky command + tabs + StatGroup Resumen | Good above-the-fold intent; sticky + shell header ≈ double chrome on short viewports |
| Quote detail | Progress + header + next + ball + many `PageSection` `p-8 md:p-10` + `mt-10` | **High** empty luxury padding between sections on mobile |
| Opportunity | Progress + next + large white section | Medium |
| Pedido | Next + **PageHeader + PedidoDetailHero** (duplicate title energy) + lifecycle + known-state + ops cards each `p-8 md:p-10` | **High** — long vertical desert between facts |
| `/conversaciones` | 3-pane desktop; list/thread mobile | `min-h-[32rem]` desktop panels OK; mobile OK |
| `/compromisos`, `/trabajo`, `/cotizaciones`, `/oportunidades` | Operating lists + toolbars | Low–medium; empty states intentional |
| `/mapa` | Map + Chip panes | Mobile pane switch present |
| `/entregas`, `/almacen`, `/produccion`, `/finanzas` | Desk tables / strips | Medium — desk cards use white ops consistently |

**Recommendation (planning only):** keep 8px rhythm; prefer `p-5`/`p-6` inside stacked record sections; reserve `p-8 md:p-10` for single hero cards, not every section.

---

## 10. Mobile considerations (code audit)

| Pattern | Present? | Notes |
|---|---|---|
| Mobile nav drawer + focus trap | Yes | `app-shell.tsx` |
| Safe-area insets | Yes | Header top, rail bottom, drawer |
| Cliente360 tab select &lt;sm | Yes | Avoids cramped tab overflow |
| Conversaciones list/thread panes | Yes | Context drawer on mobile |
| Mapa map/list Chip | Yes | |
| Horizontal body overflow | Prior hosted note PASS @390 (`CT3_VISUAL_ACCEPTANCE`) | **RC3 re-proof UNPROVEN** |
| Sticky Cliente360 under `top-14` | Yes | Competing with glass header height on small screens |
| Demo/eval controls in header | Yes | Can crowd primary chrome during owner demo |

---

## Delta vs morning `VISUAL_HIERARCHY_GAP.md`

| Gap (prior) | Now |
|---|---|
| Who-has-the-ball = raw `<dl>` only | **Shared card** on quote |
| Commercial progress weak vs ProcessStepIndicator | **CommercialProgressStrip wraps ProcessStepIndicator** |
| Historial bypasses Timeline | **PartyTimelineList + origin use Timeline** |
| Cliente360 sticky porcelain bleed | **Ops glass sticky** |
| Resumen no StatGroup | **Cliente360Intelligence → StatGroup** |
| Next action duplicated in Resumen | **Pointer to command band** |
| Next-action / ball / steppers / pedido timeline / whitespace | Still open as noted above |

---

## Major-route scorecard (owner-demo surfaces)

| Route | Language | Hierarchy | Mobile (code) |
|---|---|---|---|
| Inicio | PASS | PASS | PASS |
| Clientes list | PASS | PASS | PASS |
| Cliente360 | PASS | PARTIAL (command strong; ball absent) | PASS |
| Cotización | PASS | PARTIAL (stack + padding) | RISK (padding) |
| Oportunidad | PASS | PARTIAL | PASS |
| Pedido | PASS | PARTIAL (duplicate hero energy + padding + local timeline) | RISK |
| Conversaciones | PASS | PASS | PASS |
| Compromisos / Trabajo | PASS | PASS | PASS |
| Mapa | PASS | PASS | PASS |
| Entregas / ops desks | PASS | PARTIAL (stepper forks) | PASS |

---

## Proof matrix (feature-proof states)

| Subfeature | IMPLEMENTED | TESTED | BROWSER-VERIFIED | USER-ACCEPTED |
|---|---|---|---|---|
| Token porcelain/kiln/glaze law | Yes | Token/CSS present | Prior hosted note | **NO** |
| Global shell + mobile drawer | Yes | — | Prior @390 | **NO** |
| StatusPill soft chips | Yes | — | Partial prior | **NO** |
| Next-action surfaces | Yes (2 hosts) | next-step logic tests | UNPROVEN as single hero | **NO** |
| WhoHasTheBallCard | Yes (quote only) | view-model tests | UNPROVEN | **NO** |
| Cliente360 tabs + sticky | Yes | cliente360 UX tests | Prior tabs note | **NO** |
| Timeline historial | Yes (party) | — | UNPROVEN | **NO** |
| Process steppers | Yes (commercial shared) | — | UNPROVEN | **NO** |
| Button ≠ input | Partial | — | UNPROVEN | **NO** |

---

## Findings to carry (no code in this lane)

1. **Keep** token law; replace demo hex literals with glaze/teal tokens when next touching those files.  
2. **Mount** `WhoHasTheBallCard` on opportunity / pedido (and optionally Cliente360) using existing view model.  
3. **Converge** `DeliveryProgressStrip` / `PedidoLifecycleStrip` onto `ProcessStepIndicator` or shared tone helper.  
4. **Pedido historial** → `Timeline` like party historial.  
5. **Tighten** quote/pedido section padding (`p-5`/`p-6`, fewer `mt-10` stacks) before owner walkthrough.  
6. **Do not** invent a second visual system — extend `@isalwa/ui` + existing host strips.  
7. Hosted BV after RC3 cut must re-check 390 width, Cliente360 sticky+header chrome, and quote/pedido scroll length — mark BROWSER-VERIFIED only after that pass.

---

## Files inspected (non-exhaustive)

- `packages/ui/src/tokens/tokens.css`, `packages/ui/src/tokens/chrome.css`
- `packages/ui/src/components/button.tsx`, `status-pill.tsx`, `data.tsx` (SearchField/Chip/Timeline)
- `apps/os-web/app/globals.css`, `apps/os-web/app/(app)/layout.tsx`
- `apps/os-web/components/shell/app-shell.tsx`, `proximo-paso-strip.tsx`
- `apps/os-web/components/cliente/cliente-360-{sticky,nav,header,historial,intelligence}.tsx`
- `apps/os-web/components/party/cliente-360-now.tsx`
- `apps/os-web/components/work/who-has-the-ball-card.tsx`
- `apps/os-web/components/commercial/{record-next-step,commercial-progress-strip,party-timeline-list}.tsx`
- `apps/os-web/components/progress/process-step-indicator.tsx`
- `apps/os-web/components/delivery/delivery-progress-strip.tsx`
- `apps/os-web/components/operations/{pedido-lifecycle-strip,pedido-detail-hero}.tsx`
- `apps/os-web/lib/ui/{action-hierarchy,visual-status}.ts`
- Major routes under `apps/os-web/app/(app)/{inicio,clientes,conversaciones,trabajo,compromisos,mapa,entregas}/` and commercial record pages

---

## Lane closure

```
PP6_STATUS = PARTIAL
LANGUAGE_LAW = PASS
HIERARCHY_COHERENCE = PARTIAL
MOBILE_SHELL_CODE = PASS
BROWSER_VERIFIED_RC3 = UNPROVEN
USER_ACCEPTED = NO
PRODUCT_CODE_EDITED = NO
```
