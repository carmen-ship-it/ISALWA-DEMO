---
name: Guided tour
description: How the optional guided tour overlay is architected and where data-tour attributes live
---

## Architecture

`components/guided-tour.tsx` — self-contained client component (`'use client'`). Manages all state internally (active, stepIdx, rect, navigating, cardIn). Renders fixed-position trigger button when inactive, spotlight overlay + popover card when active.

`components/app-shell.tsx` — imports GuidedTour and renders it inside a `<>…</>` Fragment alongside the main layout div. The Fragment wrapper is required; omitting it causes a SWC syntax error.

**Why Fragment:** AppShell's return previously returned a single `<div>`. Adding a second sibling element requires Fragment — SWC's JSX parser rejects two root elements without it.

## Spotlight approach
Four dark `position: fixed` panels (top/bottom/left/right) surround the target element's bounding rect with 10px padding. A separate highlight ring div renders between the panels and the card (z-index 9050). When no element is found, a full-screen dark overlay is used.

## Element discovery
`findElement(selector)` polls `document.querySelector('[data-tour="${selector}"]')` every 120ms for up to ~3 seconds after navigation. After finding, scrolls element into view and recalculates rect after 320ms settle time.

## data-tour attribute locations
| Attribute value | File |
|---|---|
| `pulso-sentence` | `app/pulso/page.tsx` — h1 |
| `pulso-vitals` | `app/pulso/page.tsx` — vitals grid div |
| `radar-list` | `app/radar/page.tsx` — `div.space-y-3` container |
| `personas-heroes` | `app/personas/page.tsx` — hero cards grid div |
| `territory-map` | `components/territory-map.tsx` — map canvas div |
| `cierre-catalog` | `components/quote-canvas.tsx` — catalog panel div |
| `senal-list` | `app/senal/page.tsx` — conversation list div |
| `senal-cobranzas-tab` | `app/senal/page.tsx` — Cobranzas Link via spread `{...(key === 'cobranzas' ? {'data-tour': ...} : {})}` |
| `cmdpalette-trigger` | `components/app-shell.tsx` — ⌘K kbd element |

## Trigger button
Fixed at `bottom: 26px, left: 20px`, hidden on mobile (`className="hidden md:flex"`). Renders as a pill over the dark sidebar column. Uses `color-mix(in srgb, white ...)` tokens for opacity against dark background.
