# Loading System

**Rule:** Spinners are a last resort. Prefer skeletons, progressive reveal, and optimism.

---

## Hierarchy of preference

1. **Show structure immediately** (skeleton matching final layout)  
2. **Progressive** — paint header + known chrome; stream data  
3. **Optimistic** — apply likely result; reconcile  
4. **Determinate progress** — when duration known (upload)  
5. **Indeterminate spinner** — only multi-second opaque server work with no layout  

---

## Patterns by surface

| Surface | Pattern |
|---------|---------|
| Pulso | Skeleton vitals grid → count-up when data ready; keep last sentence if refreshing |
| Radar | Skeleton risk rows (3–5) |
| Personas | Skeleton hero cards + table rows |
| Dossier | Sticky bar from route param/name if known; skeleton body |
| Señal list | Skeleton convo rows |
| Señal thread | Skeleton bubbles |
| Cierre catalog | Existing `.isalwa-skeleton` rows |
| Quote submit | Button loading dots; keep canvas interactive otherwise |
| Map | Soft map surface first; pins enter when points arrive |
| ⌘K | Instant UI; debounced results; tiny skeleton list if slow |
| Intro | Ceremony *is* the wait — fetch pulse during brand moment |

---

## Skeleton law

- Use `Skeleton` component or `.isalwa-skeleton`  
- Match radius (control vs panel)  
- Never skeleton text that lies about final length by >2×  
- Shimmer respects reduced motion (static mist fill — already in globals)  

---

## Optimistic updates

| Action | Optimistic? |
|--------|-------------|
| Add quote line | Yes |
| Change qty | Yes |
| Send quote | No — wait confirm |
| Accept quote | No |
| Payment | No |
| Check-in | Yes pin/state; confirm server |
| Dismiss tip / tour step | Yes |
| Suggested reply insert | Yes into composer |

On failure: revert + inline error (no blame animation).

---

## Predictive placeholders

- Catalog: show category chips from last fetch while requerying  
- Search: show recent under query until results  
- Map: show last bounds vignette (P2)  

---

## Anti-patterns

- Full-page centered spinner on every navigation  
- Blocking the sidebar during load  
- “Loading…” text without structure  
- Fake progress bars that jump to 99%  

---

## Accessibility

- `aria-busy` on regions replacing content  
- Don’t remove focus into a disappearing spinner  
- Announce completion for slow sends via `aria-live` polite  
