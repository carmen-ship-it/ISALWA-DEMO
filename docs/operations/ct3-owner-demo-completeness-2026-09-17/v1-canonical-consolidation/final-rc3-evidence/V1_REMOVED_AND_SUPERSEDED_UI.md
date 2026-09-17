# V1_REMOVED_AND_SUPERSEDED_UI

**Updated:** 2026-09-17 Product Promise closure (PC-8)

| OLD_FEATURE | WHY_REMOVED | REPLACED_BY | LOCAL_PRESENT? | LIVE_PRESENT? | ROUTE / FILE | ACTION_REQUIRED |
|---|---|---|---|---|---|---|
| Floating **Mostrar recorrido** / `GuidePanel` | Story Mode sole full walkthrough | **Ver recorrido completo** | NO (deleted) | YES (stub on tip) | was `guide-panel.tsx` | Ship RC3 |
| `IntroCoach` multi-step “Continuar recorrido” | Competing guided walkthrough | Story Mode + short IntroWelcome | NO (deleted) | YES | was `intro-coach.tsx` | Ship RC3 |
| `MicroTourCoach` “Recorrido · n/m” | Competing multi-step tour | Story Mode | NO (deleted) | YES | was `micro-tour-coach.tsx` | Ship RC3 |
| Ayuda **Recorridos de sección** | Launched micro-tours | Story Mode CTA only | NO | YES | `walkthrough-help-panel.tsx` | Ship RC3 |
| `RoleQuickstartPanel` | Dead / unmounted | — | NO (deleted) | YES (dead file) | was `role-quickstart-panel.tsx` | Ship RC3 |
| `ContextualMicroTipCoach` | Dead / unmounted | — | NO (deleted) | YES (dead file) | was `contextual-micro-tip.tsx` | Ship RC3 |
| Legacy JOURNEYS product launcher | Superseded | Story Mode | NO launcher (data archived) | data wired historically | `journeys.ts` archive | Keep data; no UI |
| Compras OC authoring from Pedido | FUTURE_BY_DESIGN | Solicitar revisión de Compras | NO | NO | — | Do not invent OC |

**Keep:** `IntroWelcome` (FIRST_USE_INTRO), `LearningModeToggle` (PASSIVE_HELP), Story Mode.
