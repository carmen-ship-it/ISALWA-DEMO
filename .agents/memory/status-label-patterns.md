---
name: Status label patterns
description: All raw API status strings must be mapped to Spanish before display in any UI component
---

## Rule
Never render raw API status strings directly in the UI. Always map through a label helper first.

**Why:** The API returns English snake_case values ("ok", "at_risk", "watch", "hold", "paid", "overdue", "accepted", "follow_up", etc.) that must appear in Spanish for ISALWA's Bolivian users.

**How to apply:** Each page file that shows status values defines its own helpers (creditLabel, invoiceLabel, quoteLabel, visitTone, etc.). When adding a new page, check whether it renders any `.status`, `.creditStatus`, `.result`, or similar API fields and add helpers before the JSX.

## Known mappings (as of Mission 08)

### Credit status (personas/[id] and personas/page.tsx)
- `ok` → "Crédito OK" (personas list) / "Crédito al día" (dossier)
- `watch` / `at_risk` → "Vigilar" / "En vigilancia"  
- `hold` → "Bloqueado"

### Invoice status
- `paid` → "Pagado", `overdue` → "Vencido", `partial` → "Parcial", `open` → "Abierto", `draft` → "Borrador"

### Quote status
- `draft` → "Borrador", `sent` → "Enviado", `accepted` → "Aceptado", `rejected` → "Rechazado"

### Visit status
- `completed`/`done` → "Realizada", `missed`/`no_show` → "No show", `scheduled` → "Agendada"

### Timeline body translation (translateBody helper in personas/[id]/page.tsx)
Uses regex replace on known tokens: sold→"Venta cerrada", not_available→"Sin disponibilidad", follow_up→"Seguimiento", quoted→"Cotizado", accepted→"Aceptado", etc.
