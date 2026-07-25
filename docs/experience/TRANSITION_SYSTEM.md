# Transition System

How ISALWA moves between places without feeling like a website of pages.

---

## Persistence model

| Layer | Behavior |
|-------|----------|
| Kiln sidebar | **Persistent** across experience routes (desktop) |
| Mobile top bar | Persistent within app; drawer overlays |
| Porcelain content | Crossfades / enters on route change |
| Intro `/` | Full-bleed; no shell — special case |
| Dossier sticky identity | Persists while scrolling dossier |
| Quote sticky actions | Persist while editing quote (mobile) |

The sidebar does **not** animate away on navigation. That stability is the OS feel.

---

## Route transition recipe (target)

1. User activates nav / ⌘K / in-app link  
2. Content region opacity → 0 (fast, ≤140ms) **or** instant under reduced motion  
3. Scroll position resets to top of main (except back-stack restore later)  
4. New content mounts with `.isalwa-enter` on header; children stagger  
5. Focus moves to `#isalwa-main` or page H1  

**Do not:** slide the entire viewport; morph the sidebar; use 3D flips.

---

## Shared-element candidates (sparingly)

Only when identity continuity matters:

| From | To | Element |
|------|----|---------|
| Personas hero / table name | Dossier H1 | Account name |
| Radar row title | Dossier | Account name |
| Pulso focus row | Radar / dossier | Title string |
| Quote number in history | Quote detail | Mono number |

If shared-element tech is costly, **fade + matching typography** is enough for v1.

---

## Overlay transitions

| Overlay | Enter | Exit |
|---------|-------|------|
| ⌘K | Whisper + fade backdrop | Fade |
| Mobile nav | Slide-left panel + fade scrim | Reverse / instant reduced |
| Tour card | Whisper | Fade |
| Toast | Whisper from bottom-right | Fade |

---

## When motion stops

- After enter choreography completes  
- When user is mid-typing (never animate layout under caret)  
- When `prefers-reduced-motion`  
- When tab is hidden (pause loops: alive-dot, pin pulse)

---

## Back navigation

- Browser back should feel instant (no replay of long enters)
- Señal mobile: list ← thread is a **state** transition, not a full route spin
- Preserve list scroll position when returning from dossier (P1)

---

## Anti-patterns

- Different transition per experience (breaks OS)
- Loading gate that blocks transition >1s without skeleton
- Animating while data pop-in causes layout jump — reserve space first
