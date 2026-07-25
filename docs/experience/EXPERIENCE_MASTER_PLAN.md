# ISALWA Experience Master Plan

**Mission:** 13 — Planning only (no implementation)  
**Status:** Blueprint for all future visual / interaction missions  
**Frozen:** Mission 11 (visual polish), Mission 12 (design system), AI Constitution  
**Date:** 2026-07-25

---

## Thesis

Most CRMs are collections of screens.

**ISALWA is an operating system for commercial work.**

People should remember the *feeling* — calm control, instrument-grade clarity, purposeful motion — not a feature checklist.

Closing line we want in their head:

> “I wish every piece of software felt like that.”

That line already lives in `docs/product/DEMO_JOURNEY.md`. This plan makes it durable across the product, not only the demo.

---

## What “operating system” means here

| CRM collection | ISALWA OS |
|----------------|-----------|
| Pages you visit | Instruments you inhabit |
| Forms you fill | Decisions you make |
| Notifications that nag | Signals that earn attention |
| Chatbots that interrupt | A copilot that waits |
| Motion for decoration | Motion that teaches |

**Apple rule:** Nothing moves without answering *why*.

---

## Binding constraints (from constitution)

- Extend existing systems — never parallel stacks
- Reuse `@isalwa/ui` and Mission 11/12 tokens
- Business logic wins over aesthetics
- Prefer small PRs when implementing later
- Reduced motion is first-class, not an afterthought
- No childish delight; premium enterprise restraint

---

## Existing foundation (do not discard)

| System | Today | Extend toward |
|--------|-------|---------------|
| Intro ceremony | `intro-experience.tsx` · ~7.5s · `sessionStorage` | Permanent first-run flag + shorter return path |
| Guided tour | 9 steps · no persistence · desktop FAB | Persist completion · mobile-safe · contextual tips |
| Motion tokens | CSS + `lib/motion.ts` | Page transitions · shared-element rules |
| ⌘K | Account/product search only | Commands · recent · AI · quotes/invoices |
| Shell | Kiln sidebar · mobile drawer | Persistent instruments · optional collapse |
| Empty / skeleton | `EmptyState` · CSS skeleton | Per-experience teaching empties |
| AI voice | Pulso sentence · `InsightCard` · Señal templates | Copilot presence, never chatbot chrome |

---

## Document map

| Spec | File |
|------|------|
| This overview | `EXPERIENCE_MASTER_PLAN.md` |
| Product feel | `PRODUCT_FEEL_GUIDE.md` |
| Motion law | `MOTION_SYSTEM.md` |
| Page transitions | `TRANSITION_SYSTEM.md` |
| Scroll storytelling | `SCROLLING_SYSTEM.md` |
| Microinteractions | `MICROINTERACTION_LIBRARY.md` |
| Loading | `LOADING_SYSTEM.md` |
| Empty states | `EMPTY_STATE_SYSTEM.md` |
| First run / tour | `ONBOARDING_SYSTEM.md` |
| Audio | `SOUND_AND_VOICE.md` |
| ⌘K vision | `COMMAND_PALETTE_VISION.md` |
| A11y experience | `ACCESSIBILITY_EXPERIENCE.md` |
| Mobile | `MOBILE_EXPERIENCE.md` |
| Prioritized backlog | `EXPERIENCE_ROADMAP.md` |

---

## Section answers (executive)

### 1. First impression
One brand ceremony on first install/login — extend current intro. ~5–7s max for full ceremony; ~1.5s reduced-motion. Remember with **localStorage** (not only session). Never replay automatically after completion; replay only from settings / tour. No music by default. Optional Spanish voiceover is **off** until user opts in (see Sound & Voice).

### 2. Page transitions
Persistent kiln sidebar + porcelain content crossfade (120–220ms). No slide-the-whole-app. Shared-element only for named heroes (account name → dossier). Honor `prefers-reduced-motion` → instant swap + opacity if needed.

### 3. Scrolling
Calm native scroll; no parallax theater. Sticky: dossier identity, quote actions, Señal composer. Storytelling scroll only on long dossiers / Memoria — timeline reveal via existing enter/stagger. Progress indicators only for long demo/story pages, not every list.

### 4. Microinteractions
Documented in library: press scale already on Button; focus ring tokens; table/inbox hover; map pin spring; undo toasts later. Everything uses motion tokens.

### 5. Loading
Skeletons over spinners. Progressive Pulso vitals. Optimistic quote line add. Predictive placeholders for catalog. Spinner only for irrevocable multi-second jobs.

### 6. Empty states
Every empty teaches: what this place is, one example, one next action. Reuse `EmptyState` / `EmptyPanel`. No cartoon mascots.

### 7. Sound
**Default: silent.** Optional UI ticks off by default. No intro music in v1. If sound lands later: user toggle, respect OS mute, never autoplay voice.

### 8. Voice
Optional premium narrated walkthrough (ES primary, EN later) — **opt-in**, play once, skip always, replay from help. Not required for product completeness.

### 9. Command palette
Becomes the nervous system: navigate · customers · quotes · invoices · commands · recent · favorites · AI ask. Search remains the default tab.

### 10. Keyboard
Full cheat sheet in roadmap; ⌘K, Esc, arrows already; add G-then-key nav, quote builder shortcuts, tour keys.

### 11. Mobile
Native-feeling continuation of Mission 12: drawer, master-detail, sticky actions, thumb zones. Future: camera check-in, GPS visit, bottom sheets — without redesigning desktop.

### 12. Accessibility
Motion collapse already in tokens. Extend: skip link done; focus order audits; live regions for saves; contrast checks on kiln hints.

### 13. AI presence
Copilot, not chatbot. Speaks as Pulso sentence, InsightCard, suggested replies. Always summonable via ⌘K / “Ask ISALWA”. Never a floating bubble that nags.

### 14. Emotional moments
Quiet milestones: first accepted quote, VIP open, collections recovered — soft glaze flash + one-line copy. Never confetti.

### 15. Premium details
100-item list in Product Feel Guide — cursor, selection, copy toast, hover timing, depth, type, focus.

### 16. Scalability
Experience grammar (instruments · signals · memory · close) is industry-agnostic. Verticals swap seed/domain, not chrome.

### 17. Critique
Summary in Product Feel Guide + Roadmap risks. Strong: Pulso voice, Radar risk-first, porcelain system. Weak: Señal/Territorio still dialected; tour not persisted; ⌘K too thin; mobile Personas table wiring; no loading choreography yet.

---

## North-star metrics (qualitative)

After a session, users should report:

1. Calm within 10 seconds (Pulso)
2. Knew where to go without hunting
3. Motion felt purposeful, not decorative
4. Would show a peer “how software can feel”

---

## Implementation note

**This mission ships documents only.**  
Future missions implement slices from `EXPERIENCE_ROADMAP.md` as small PRs against frozen Mission 11/12 systems.
