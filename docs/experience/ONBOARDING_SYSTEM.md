# Onboarding System

First impression + continuous learning — without trapping users.

---

## Goals

1. Brand moment worthy of “operating system”  
2. Orient to Pulso in under 10 seconds  
3. Optional deeper tour for demos / new hires  
4. Never block work  
5. Remember completion permanently (device)  

---

## A. Brand intro (extends current)

**Source today:** `intro-experience.tsx` on `/`

| Aspect | Spec |
|--------|------|
| Audience | First open on device / profile |
| Duration | Full ≤7s; reduced-motion ≤1.5s |
| Beats | Wordmark → tagline → init checks → live KPI → CTA |
| Skip | Click / Esc — always |
| Exit | Fade → `/pulso` |
| Memory | **Upgrade** `sessionStorage` → `localStorage` key `isalwa_intro_v1_done` |
| Return visits | Skip intro; land `/pulso` (or last route P2) |
| Replay | Settings / Help “Ver introducción” |
| Sound | Off (see Sound & Voice) |
| Voiceover | Off by default; opt-in pack later |

**When it disappears forever:** After successful completion or explicit skip — until user replays or storage cleared.

---

## B. Guided tour (extends current)

**Source today:** `guided-tour.tsx` — 9 steps, no persistence, desktop FAB

| Aspect | Spec |
|--------|------|
| Trigger | FAB “Recorrido”; Help; first week tip (dismissible) |
| Persistence | `localStorage` `isalwa_tour_v1_done` |
| Mobile | Dedicated short tour (4 steps) or coach marks — not tiny desktop clone |
| Keys | ←/→, Esc, Saltar (keep) |
| Demo mode | Presenter can force-show tour ignoring done flag |

Align steps with `DEMO_JOURNEY.md` emotional arc, not feature dump.

---

## C. Contextual teaching (P1+)

- First empty Radar → empty system copy  
- First Cierre open → one coach mark on last-price  
- Dismiss forever per tip id  

No stacked tooltips.

---

## D. Auth-era onboarding (future)

When Auth lands: intro once per **user**, sync flag server-side; device local as cache.

---

## Anti-patterns

- Forced video  
- Multi-step modal wall before Pulso  
- Tour that cannot skip  
- Auto-playing voice  
- Re-showing intro every session (current sessionStorage behavior — fix)  
