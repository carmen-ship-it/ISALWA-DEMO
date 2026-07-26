# Mission 13 — Executive Cockpit

**Status:** Complete  
**App:** `apps/architect`  
**Depends on:** Missions 2–9.5 (consumes existing models only)  
**Extends:** Mission 9.5 `lib/executive/derive.ts` — does **not** rewrite consulting / blueprint / process / solution / deliverables / reasoning engines

## Goal

After onboarding, Architect becomes the **daily home page for executives** — a living cockpit, not another report.

## Hard constraints honored

- Everything deterministic
- No AI / LLM
- No notifications
- No email
- Read only
- Spanish executive UI labels
- Parallel missions 10–12 (questions / preparation / company-model) left untouched

## Architecture

```text
CompanyWorkspace
  ├── conversationMemory.consulting
  ├── businessProcesses / solutionArchitecture / blueprints
  ├── knowledge / timeline / openQuestions / painPoints
  │
  ▼
deriveExecutiveExperience(workspace)          // Mission 9.5 (extended)
  ├── journey / dashboard / modules / …       // unchanged presentation packs
  └── cockpit: deriveExecutiveCockpit(...)    // Mission 13
        ├── executive-score      composite 0–100 health
        ├── daily-summary        Spanish scan line
        ├── priorities           now / next / later
        ├── alerts               open risks (no push)
        ├── recommendations      quick wins + strategic
        └── surfaces             departments, discoveries,
                                 decisions, automation,
                                 AI readiness, roadmap
```

## Surfaces (Spanish labels in UI)

| Surface | Label |
| --- | --- |
| Business Health | Salud del negocio |
| Department Health | Salud por departamento |
| Current Priorities | Prioridades actuales |
| Open Risks | Riesgos abiertos |
| Quick Wins | Victorias rápidas |
| Strategic Opportunities | Oportunidades estratégicas |
| Recent Discoveries | Descubrimientos recientes |
| Pending Decisions | Decisiones pendientes |
| Automation Progress | Avance de automatización |
| AI Readiness | Preparación para IA |
| Roadmap Progress | Avance de la hoja de ruta |

## Files

### `lib/executive/` (extend existing folder)

| File | Role |
| --- | --- |
| `types.ts` | Cockpit contracts |
| `cockpit.ts` | `deriveExecutiveCockpit` assembler |
| `executive-score.ts` | Weighted composite score |
| `daily-summary.ts` | Short Spanish daily summary |
| `recommendations.ts` | Prioritized quick wins / strategic |
| `alerts.ts` | Open risks + attention (no push) |
| `priorities.ts` | Current priorities list |
| `derive.ts` | Attaches `cockpit` to experience model |
| `index.ts` | Public exports |

### UI

- `components/workspace/executive/executive-dashboard.tsx` — enhanced first-tab cockpit
- `components/workspace/workspace-view.tsx` — executive tab wired as daily home

## Intentionally deferred

- Push notifications
- Email digests / alerts
- Writable actions from the cockpit
- Parallel dashboard surfaces (second home tab)
- Deep company-model pack UI (tolerates presence/absence of Mission 12)

## Definition of done

1. lib modules + types
2. UI wired into executive-first workspace view
3. This document
4. Typecheck
5. Commit + push
