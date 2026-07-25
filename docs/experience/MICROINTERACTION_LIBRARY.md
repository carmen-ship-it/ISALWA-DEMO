# Microinteraction Library

Catalog of small interactions. Implement later via `@isalwa/ui` + tokens — do not invent one-offs.

---

## Buttons

| State | Behavior |
|-------|----------|
| Hover | Color/border ≤140ms |
| Press | Scale 0.98 |
| Focus | Shadow focus ring |
| Loading | Disable + optional 3-dot (existing) |
| Success | Optional one-shot flash |
| Danger | Soft danger fill (existing variant) |

Links that act as buttons must share Button visual language (constitution).

---

## Inputs & search

| Event | Behavior |
|-------|----------|
| Hover | Border mist → glaze mix |
| Focus | Glaze border + focus ring |
| Type | No layout shift |
| Debounced search | 90–120ms; show skeleton rows if >200ms |
| Clear | Instant; restore placeholder |

Use `SearchField` / `.isalwa-field`.

---

## Chips & filters

- `Chip` with `aria-pressed`  
- Active = glaze wash  
- Press scale  
- Multi-filter: chips do not jump layout  

---

## Cards & panels

- Interactive Panel: lift + border glaze mix  
- Non-interactive: static soft shadow  
- Enter: deliberate + stagger  
- Selection: 8% glaze wash (Señal active pattern)  

---

## Tables

- Row hover wash  
- Focusable primary cell / whole-row activation (keyboard)  
- Sort indicator rotate 140ms (when sorting exists)  
- Mobile: switch to cards (Mission 12 pattern)  

---

## Inbox / list rows

- Priority rail color = meaning (no animation needed)  
- Hover: “Abrir →” fades in  
- Active: background wash  
- Enter stagger on first paint  

---

## Maps

- Pin enter spring once  
- Hero pulse / risk pulse loops (status only)  
- Hover card whisper-in  
- Filter chip press  
- Pan/zoom: native; no custom inertia theater  

---

## Timeline

- Vertical line static  
- Nodes appear with enter  
- Placeholder mode for Memoria teaching  
- Expand detail: height auto with base opacity — avoid accordion bounce  

---

## Charts / vitals

- Bar expand from left once  
- Count-up metrics via `AnimatedValue`  
- Tone accent bar static color (motion only on fill)  

---

## Notifications / toasts

| Kind | UI |
|------|-----|
| Success | Whisper toast, 3s, glaze |
| Error | Toast + inline if form |
| Info | Neutral mist |
| Undo | Action button 5s |

No notification center animation spam.

---

## Undo

Reversible actions (delete draft line, dismiss tip):

1. Optimistic apply  
2. Toast with Undo  
3. Timeout commits  

Irreversible (send quote, record payment): confirm inline, not motion.

---

## Loading / saving

See `LOADING_SYSTEM.md`. Micro pattern: button label → dots → restore; never freeze whole app.

---

## Command palette

- Open: fade + whisper  
- List selection: highlight wash  
- Enter: navigate + close  
- Empty query: recent/favorites  

---

## Tour

- Spotlight dim fade  
- Card whisper  
- Step change: 140ms content swap  

---

## Copy feedback

Clipboard success: toast “Copiado” or inline check 1.2s (Señal replies).

---

## Forbidden micros

- Shake on error (use color + text)  
- Elastic bounce  
- Hover that reveals essential actions **only** (mobile dies) — always provide non-hover path  
