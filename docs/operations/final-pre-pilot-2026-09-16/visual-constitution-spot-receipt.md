# Visual constitution spot receipt — 2026-09-16

**Mode:** READ-ONLY · existing screenshots only · no browser · no UI edits · no deploy  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate`  
**Actor context:** prior BV as `carmen.staging` (READ-SAFE)  
**Canon:** `docs/architecture/AI_CONSTITUTION.md` · tokens `packages/ui/src/tokens/tokens.css`  
(`--isalwa-porcelain #f6f1e8` · `--isalwa-kiln #18324b` · `--isalwa-glaze #287a78`)

## Verdict

| Field | Value |
|-------|-------|
| **VISUAL_CONSTITUTION_PRESERVED** | **YES** |
| **Porcelain canvas dominates** | **YES** |
| **Navy (kiln) = structure/ink** | **YES** |
| **Teal (glaze) = accent only** | **YES** |
| **Competing visual language** | **NO** |
| **Browser opened this pass** | **NO** |
| **UI code edited** | **NO** |

## Corpus inspected (1440 only)

| Shot | Path |
|------|------|
| Mapa (post-fix) | `map-blank-diag/mapa-fixed-1440.png` |
| Almacén | `loop-visual-close/almacen-1440.png` |
| Entregas | `loop-visual-close/entregas-1440.png` |
| Compras | `loop-visual-close/compras-1440.png` |
| Finanzas | `opaque-id-bv/finanzas-1440.png` |
| Producción | `opaque-id-bv/produccion-1440.png` |
| Mensajes | `opaque-id-bv/mensajes-1440.png` |

Supporting token proof already recorded for loop desks: `loop-visual-close/loop-visual-bv.json` → `bodyBg: rgb(246, 241, 232)` · kiln/glaze/porcelain match tokens.

## Evidence by constitution axis

### Porcelain backgrounds (dominant)

Across all seven frames the main workspace is warm off-white/cream porcelain. White/soft cards sit on that canvas with soft elevation; porcelain remains the largest visual mass, not navy fills or dark chrome.

### Kiln sidebar + glaze accents (supporting, not dominant)

- Left nav is muted kiln-family teal/grey chrome (frozen sidebar language), not a second product skin.
- Glaze appears as: uppercase kickers (`UBICACIÓN`, `ALMACÉN`, `ENTREGA`, `COMPRAS`, `MENSAJES`), active nav/chip highlights, small status dots, occasional “Ejemplo” links — accent role only.
- Kiln/navy carries logo, Newsreader-style serif page titles, body ink, outline controls (`Buscar ⌘K`, `Mostrar recorrido`).

### Frozen typography / rhythm / elevation

- Serif italic/display titles + sans UI copy + uppercase kickers present on every desk.
- Rounded panels, pill chips/badges, calm soft borders — 8px-rhythm enterprise feel, no hard broadsheet grid, no neon glow, no purple-indigo marketing theme, no dark-mode shell.

### No competing visual language

| Risk pattern | Observed? |
|--------------|-----------|
| Purple / indigo gradient product skin | No |
| Dark-mode app chrome | No |
| Broadsheet / zero-radius newspaper layout | No |
| Alternate component system / foreign dashboard kit | No |
| Navy/teal flooding the canvas (replacing porcelain) | No |

**In-family exceptions (not competing languages):**

- Soft peach/tan and light-blue honesty badges (`No es stock oficial.`, `Dato manual`, `Sin número oficial`, etc.) — status tints within the design system.
- Map raster tiles (grayscale streets under porcelain chrome) — third-party map content, not alternate UI chrome.
- Recorrido popovers (`RECORRIDO · 1 / 3`) — on-token white cards with glaze kicker.

## Per-shot notes

| Route | Porcelain dominate | Kiln ink / glaze accent | Competing language |
|-------|--------------------|-------------------------|--------------------|
| `/mapa` (fixed) | Yes — cream canvas + white summary/list cards | Yes — serif “Mapa”, glaze “UBICACIÓN” / Clientes chip | No |
| `/almacen` | Yes | Yes — “Asignación a pedido”, glaze `ALMACÉN` | No |
| `/entregas` | Yes | Yes — serif “Entregas”, honesty badges in-family | No |
| `/compras` | Yes | Yes — “Cola de compras”, glaze `COMPRAS` | No |
| `/finanzas` | Yes | Yes — “Finanzas operativas”, panel cards | No |
| `/produccion` | Yes | Yes — serif title, glaze step chip “Planta” | No |
| mensajes desk | Yes | Yes — glaze `MENSAJES`, serif title | No |

## Method

1. Opened existing PNGs only (no navigation, no deploy).  
2. Judged canvas mass, accent role, typography, and absence of forbidden alternate skins against the frozen constitution.  
3. Cross-checked loop BV JSON token snapshots for porcelain/kiln/glaze values.

**STOP.**
