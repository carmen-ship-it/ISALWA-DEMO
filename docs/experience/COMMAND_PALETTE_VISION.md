# Command Palette Vision

⌘K is the **cortex** of ISALWA OS — not a search box with ambitions.

**Today:** `command-palette.tsx` + `/v1/search` → accounts & products only.

---

## Principles

1. Open anywhere in <100ms perceived  
2. Keyboard-first; mouse welcome  
3. Grouped results; scannable  
4. Recent > raw search when query empty  
5. AI is a **group**, not a takeover  
6. Every result has a clear verb (Ir / Abrir / Crear / Ejecutar)  

---

## Information architecture

```
⌘K
├── Recientes
├── Favoritos (P2)
├── Navegación (experiences)
├── Clientes
├── Cotizaciones / Facturas (P1)
├── Productos
├── Comandos (P1)
└── Preguntar a ISALWA (P2)
```

---

## Capabilities roadmap

| Capability | Priority | Notes |
|------------|----------|-------|
| Accounts → dossier | Exists | Keep |
| Products → Cierre | Exists | Keep |
| Jump to Pulso/Radar/… | P0 | Static nav commands |
| Quotes by number | P1 | API search extend |
| Invoices by number | P1 | |
| Commands: Nueva cotización, Check-in | P1 | Contextual account if selected |
| Recent local | P0 | localStorage ring buffer |
| Favorites | P2 | Pin accounts |
| Filters `status:open` | P2 | |
| AI ask | P2 | Returns Insight + links; not chat thread inside palette |
| Natural language nav | P3 | “clientes en silencio” → Radar |

---

## Interaction spec

| Key | Action |
|-----|--------|
| ⌘/Ctrl+K | Toggle |
| Esc | Close |
| ↑↓ | Move |
| Enter | Execute |
| ⌘↵ | Open in background (P2) |
| Tab | Jump groups (P2) |

Empty query: Recientes + Navegación.  
Typing: ranked search; debounce 90ms.

---

## Visual

Reuse porcelain panel, lift shadow, whisper enter (already).  
Groups: uppercase kickers.  
Meta: mono codes right-aligned.

---

## Anti-patterns

- Becoming a second Señal  
- Showing raw JSON  
- AI streaming that traps focus  
- Results without destinations  
