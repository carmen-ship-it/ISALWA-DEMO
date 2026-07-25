# Experience Roadmap

Prioritized blueprint for future missions. **No implementation in Mission 13.**

Effort: S ≤1d · M 2–3d · L 1–2w · XL >2w  
Impact: Low / Med / High on “OS feel” + demo emotion

---

## P0 — Foundation fixes (ship first)

| ID | Item | Effort | Impact | Notes |
|----|------|--------|--------|-------|
| P0.1 | Intro remember forever (`localStorage`) + skip stay | S | High | Fixes re-show every session |
| P0.2 | Tour completion persistence | S | High | `isalwa_tour_v1_done` |
| P0.3 | ⌘K static navigation commands | S | High | Jump experiences without search |
| P0.4 | ⌘K Recientes (local) | S | Med | Empty-query value |
| P0.5 | Route content enter consistency (PageContainer + enter) | M | High | Extend M12; Territorio excepted |
| P0.6 | Skeleton pass: Radar, Personas, Señal list | M | High | Loading system |
| P0.7 | Wire Personas mobile cards fully | S | High | CSS hooks exist |
| P0.8 | Kiln hint contrast audit + fix | S | Med | A11y |
| P0.9 | `aria-live` on quote send / payment | S | Med | |
| P0.10 | Document shortcut `?` modal (read-only first) | S | Med | |

**Quick wins:** P0.1, P0.2, P0.3, P0.7, P0.8

---

## P1 — OS cohesion

| ID | Item | Effort | Impact |
|----|------|--------|--------|
| P1.1 | Content crossfade transition helper | M | High |
| P1.2 | Señal swipe-back + polish empty panels | M | High |
| P1.3 | Territorio filters → Chip + bottom sheet mobile | M | High |
| P1.4 | QuoteCanvas adopt SearchField/Chip/Button | L | High |
| P1.5 | ⌘K quotes/invoices search | M | High |
| P1.6 | ⌘K commands (nueva cotización, etc.) | M | Med |
| P1.7 | G-then-key navigation | M | Med |
| P1.8 | Contextual coach marks (first Cierre) | M | Med |
| P1.9 | Mobile short tour (4 steps) | M | Med |
| P1.10 | Toast system (copy/save/undo) | M | High |
| P1.11 | Dossier scroll reveal once for timeline | S | Low |
| P1.12 | Shared-element-ish name continuity (typography match) | S | Med |
| P1.13 | Table keyboard j/k + Enter | M | Med |
| P1.14 | Optimistic quote lines polish | S | Med |

---

## P2 — Premium depth

| ID | Item | Effort | Impact |
|----|------|--------|--------|
| P2.1 | AI group in ⌘K | L | Med |
| P2.2 | Favorites in ⌘K | M | Low |
| P2.3 | Milestone moments (quiet success) | M | Med |
| P2.4 | Back-stack scroll restore | M | Med |
| P2.5 | Map last-view cache | M | Low |
| P2.6 | Offline read Pulso | L | Med |
| P2.7 | GPS check-in sheet | L | Med |
| P2.8 | Bottom tabs experiment (research first) | L | Unknown |
| P2.9 | Demo progress whisper bar | S | Low |
| P2.10 | Replace Señal emoji SLA with typographic mark | S | Low |

---

## P3 — Optional spectacle

| ID | Item | Effort | Impact | Risk |
|----|------|--------|--------|------|
| P3.1 | Opt-in Spanish narrated tour | XL | Med | Scope / brand audio |
| P3.2 | UI sounds (off by default) | M | Low | Annoyance |
| P3.3 | True shared-element FLIP transitions | L | Med | Complexity |
| P3.4 | Camera evidence on visits | L | Med | Permissions |
| P3.5 | NL commands in ⌘K | XL | Med | AI cost / accuracy |
| P3.6 | Per-vertical experience packs | XL | High | Only after grammar stable |

**Default: silence.** P3 audio/voice only with explicit product approval.

---

## Suggested mission slicing

| Future mission | Picks from |
|----------------|------------|
| M14 Onboarding & memory | P0.1–0.2, P1.8–1.9 |
| M15 Command OS | P0.3–0.4, P1.5–1.7, P2.1 |
| M16 Loading & toasts | P0.6, P1.10, P1.14 |
| M17 Señal/Territorio cohesion | P1.2–1.3 |
| M18 QuoteCanvas systemize | P1.4 |
| M19 Mobile gestures | P1.2, P2.7 |
| M20 Emotional milestones | P2.3 |

Each mission = small PRs; reuse `@isalwa/ui`; update these docs when shipping.

---

## Impact vs effort (quick map)

```
High impact, low effort     → P0.1 P0.2 P0.3 P0.7 P0.8
High impact, medium effort  → P0.5 P0.6 P1.1 P1.2 P1.10
High impact, high effort    → P1.4 P1.5 P3.1
Low impact                  → defer P2.9 P3.2
```

---

## Risks

| Risk | Mitigation |
|------|------------|
| Motion novelty creeps in | Why-is-this-moving test + constitution |
| ⌘K becomes a junk drawer | Strict IA groups |
| Voice/sound surprises enterprise | Default off; captions |
| Parallel “mobile design” | Extend M12 patterns only |
| Scope inflation | P0 before any P3 |

---

## Definition of roadmap done (for a slice)

Matches AI Constitution DoD: consistent UI, mobile OK, a11y, no duplicate primitives, docs updated, types/build pass, behavior preserved.
