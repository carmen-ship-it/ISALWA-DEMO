# Mission 27 — Living Company Operating System

**Status:** Shipped (product pass)  
**Depends on:** Mission 25 (OS hub), Mission 26 (living generators), Mission 22 Teach framing  
**Does not rewrite:** Readiness, Blueprint, Consulting Intelligence, living generators

## Principle

> **Deliverables are outputs. The Company Operating System is the product.**  
> Never optimize around creating documents. Always optimize around improving how the company operates. Every PDF, DOCX, knowledge base, training course, AI assistant, or dashboard is simply another representation of the same Company Brain.

Codified in `docs/ai/02_ARCHITECT_CONSTITUTION.md` rule 9.

## What shipped

- Shared **Sistema operativo de la empresa** center (OS tab + Documentos):
  - Product promise + pipeline ending in **Resultados de negocio**
  - Honest progress bars (Conocimiento / Sistema operativo / Documentación / Capacitación / Automatización)
  - Capability categories (Fundamentos / Personas / Operaciones / IA / Crecimiento) over the existing eight kinds
  - Alive cards: status, % complete, built-from inventory, missing, **Business Impact**, why it matters
  - Verbs: **Construir** / **Construir nueva versión** / **Exportar PDF|Word** / **Enseñar a Architect**
- Compose: `lib/consulting-intelligence/company-operating-system.ts`
- Copy: `lib/deliverables/living/copy.ts` (Build/Export language)
- UI: `living-deliverables-center.tsx`; OS panel wraps the same center

## Out of scope (later)

- Mission 28 — Executive Package ZIP  
- Mission 29 — Mejorar (Teach scoped to missingInformation)  
- Mission 30 — Proactive Update Available after new evidence  
- New deliverable kinds / empty shells

## Verification

- `npm run typecheck` / `npm run lint` in `apps/architect`
- Client Mode: OS tab shows categories + Build CTAs; Teach opens Knowledge
