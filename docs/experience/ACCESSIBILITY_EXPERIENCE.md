# Accessibility Experience

Accessibility is part of the premium feel — not a bolt-on.

---

## Contracts already in place

- `prefers-reduced-motion` collapses motion tokens + disables keyframes  
- Global `:focus-visible` + `--isalwa-shadow-focus`  
- Skip link “Saltar al contenido” → `#isalwa-main`  
- `lang="es-BO"`  
- Nav `aria-current`  
- Señal `role="tablist"` / `aria-selected`  
- Drawer dialog labeling  

---

## Motion

| Requirement | Spec |
|-------------|------|
| Reduced motion | Instant transitions; snap metrics; short intro |
| No information only in motion | Bars have width + numeric label |
| Pause loops in hidden tabs | Pin pulse / alive-dot |

---

## Contrast

| Surface | Action |
|---------|--------|
| Body on porcelain | Maintain AA |
| Kiln sidebar hints | Audit; lighten if <3:1 |
| Status pills | Keep soft fills; ensure text contrast |
| Map pins on aerial | Halo / border for separation |

---

## Keyboard (product-wide)

See also Command Palette vision.

| Shortcut | Action |
|----------|--------|
| ⌘/Ctrl+K | Palette |
| Esc | Close overlay / blur |
| ←/→ | Tour steps when open |
| `/` | Focus search when safe (P1; not when typing in fields) |
| `g` then `p` | Pulso (P1) |
| `g` then `r` | Radar |
| `g` then `c` | Cierre |
| `g` then `s` | Señal |
| `?` | Shortcut cheat sheet (P1) |

### Workflow keys (P1–P2)

| Context | Keys |
|---------|------|
| Quote canvas | `A` add focused product; `⌘↵` send |
| Señal | `j`/`k` move threads; `r` focus composer |
| Personas table | `j`/`k` move; Enter open |
| Map | arrows pan (P2); Enter select |

Power users should complete demo journey without mouse except map.

---

## Focus & tab order

1. Skip link  
2. Nav (desktop) / Menú (mobile)  
3. Page header actions  
4. Main content controls  
5. Overlays when open (trap)  

Fix: Personas hero cards — ensure single tab stop per card (Link wraps content).  
Fix: Table rows — activate via Enter on focused row or primary link only (document pattern).

---

## Screen readers

- One `<main>` per view (`PageContainer`)  
- Experience label via `aria-label`  
- Live regions: polite for “Cotización enviada”, assertive for payment errors  
- Tour: announce step title on change  
- Don’t rely on `title` alone for icon buttons — `aria-label`  

---

## Touch targets

≥44×44px on mobile primary actions.  
Don’t rely on hover-only “Abrir →”.

---

## Testing ritual (DoD)

- Keyboard-only pass of Pulso → Radar → dossier → Cierre  
- VoiceOver/TalkBack spot check InsightCard + Señal  
- Forced `prefers-reduced-motion` intro + nav  
- Contrast check kiln hints  
