# Empty State System

Empty is not failure — it is a **teaching surface**.

Reuse `EmptyState` / `EmptyPanel`. No mascots, no grey voids.

---

## Anatomy

1. **Glyph** — restrained (◌ or domain mark), glaze wash circle  
2. **Title** — honest state (“Sin alertas abiertas”)  
3. **Description** — why this place matters + what good looks like  
4. **Primary action** — one button/link  
5. **Secondary** — optional quiet link  

---

## Per-experience empty copy (target)

| Experience | Title spirit | Primary action |
|------------|--------------|----------------|
| Pulso focus | “Todo en calma” | Ver Radar |
| Radar | “Sin alertas” | Volver a Pulso |
| Personas | “Sin clientes” | Seed / import (when exists) |
| Dossier timeline | “Aún sin actividad” | Registrar visita / Cotizar |
| Territorio | “Sin puntos en vista” | Ajustar filtros |
| Señal list | “Sin conversaciones” | Cambiar canal / Todos |
| Señal thread | “Seleccione una conversación” | (implicit list) |
| Cierre no account | “Sin cuentas” | Ir a Personas |
| Catalog no results | “Sin productos” | Limpiar búsqueda |
| Quote history | “Sin cotizaciones previas” | Empiece el canvas |
| Memoria | Teaching previews (already) | Ir a Personas |
| ⌘K no results | “Nada bajo ese nombre” | Clear / try code |

---

## Teaching devices (allowed)

- One **example row** ghosted (non-interactive) showing shape of data  
- **Quick actions** that deep-link to create/visit  
- Link to guided tour step  
- AI suggestion line only if grounded (“Busque H-VIP-001 en demo”)  

## Not allowed

- Lottie cartoons  
- Blame (“You haven’t…”)  
- Five CTAs  
- Fake charts  

---

## Empty vs error vs zero-good

| State | Tone |
|-------|------|
| Empty (no data yet) | Neutral teach |
| Zero that is healthy (no alerts) | Success-calm |
| Error (API down) | Warning kicker + retry |

Pulso “Todo en calma” is **zero-good**, not empty-failure.

---

## Implementation note

Prefer composition:

```tsx
<EmptyPanel title="…" description="…" action={<Link>…</Link>} />
```

Extend `EmptyPanel` compact for in-panel voids (Señal).
