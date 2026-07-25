# Scrolling System

Scroll is reading the business — not a theme-park ride.

---

## Principles

1. **Native scrolling first** — smooth, predictable, finger-friendly  
2. **No parallax theater** on product chrome  
3. **Sticky only for orientation or action**  
4. **Long pages may tell a story** — dossiers & Memoria — via reveal, not gimmicks  
5. **Lists are tools** — dense, fast, minimal scroll chrome  

---

## Sticky inventory

| Surface | Sticky | Why |
|---------|--------|-----|
| Desktop sidebar | Viewport | OS navigation |
| Mobile top bar | Top | Brand + menu |
| Dossier identity bar | Top | Who am I working on? |
| Quote actions | Bottom (mobile) | Commit within thumb reach |
| Señal composer | Bottom of thread | Reply without losing place |
| Table header | Optional desktop | Orientation in long cartera |

---

## Story scroll (allowed)

### Dossier
1. Identity + InsightCard (relationship)  
2. Vitals (health)  
3. Timeline reveal (staggered events)  
4. Commerce panels (work)  

Compression: as user scrolls, sticky bar **already** compresses identity — do not add further shrink animations unless they clarify.

### Memoria
Placeholder timeline already models future story scroll — keep enter/stagger.

### Pulso / Radar / Personas list
**No** story scroll — instrument density.

---

## Card / section enter on scroll

Prefer **initial mount stagger** over scroll-triggered animation (avoids jank and a11y issues).

Scroll-triggered reveal only if:

- Section is below fold on long dossier  
- Uses IntersectionObserver once  
- Respects reduced motion (instant)  
- Never hides content from screen readers  

---

## Progress indicators

| Context | Progress UI |
|---------|-------------|
| Demo journey / guided story | Optional thin glaze bar (P2) |
| Form wizards | Step dots if multi-step ever lands |
| Infinite lists | None — use “load more” or virtualize quietly |
| File upload | Determinate bar |

No circular spinners as scroll decoration.

---

## Mobile scroll specifics

- `100dvh` shells (Señal) must account for mobile browser chrome  
- Avoid nested scroll traps; one primary scroller per pane  
- Pull-to-refresh: only if it maps to a real reload (P2) — never fake  

---

## Forbidden

- Horizontal page scroll  
- Scroll-jacking  
- Parallax hero on app pages  
- Sticky stacks that eat >30% of mobile viewport  
