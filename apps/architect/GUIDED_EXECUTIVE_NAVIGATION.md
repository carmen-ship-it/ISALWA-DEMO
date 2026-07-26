# Mission 12 — Guided Executive Navigation

Goal: nobody using Architect — Álvaro (client) or Carmen (consultant) —
should ever wonder "what do I click next?" Every major page now answers one
clear question with exactly one primary action; anything else on the page is
visibly quieter. **Presentation and wiring only** — no new engines, no new
routes, no new scores. Every CTA below points at a route or tab that already
existed before this mission.

## Page → question → primary CTA (client-facing workspace tabs)

| Page (tab) | Question it answers | Primary CTA | Quieter secondary |
| --- | --- | --- | --- |
| Dashboard (`executive` / Resumen) | ¿Qué debo hacer hoy? | **Revisar recomendaciones de hoy** once there's enough evidence and something to react to, otherwise **Continuar/Comenzar evaluación** | Ver informe |
| Assessment (`assessment` / Diagnóstico) | Ayúdame a responder preguntas | Continuar/Comenzar evaluación | — |
| Recommendations (`recommendations`) | ¿Qué debo implementar? | Ver plan de implementación (jumps to Roadmap) | Continuar evaluación |
| Roadmap (`roadmap` / Plan de implementación) | ¿Hacia dónde voy? | Ver documentos (jumps to Documentos) | Continuar evaluación |
| Business (`company` / Su empresa) | ¿Qué saben de mi empresa? | Continuar evaluación | Ver conocimiento del negocio (jumps to Conocimiento) |

Carmen (consultant mode) sees the same primary guidance on Dashboard and
Assessment, plus one extra quiet, tertiary link — **"Preparar la próxima
reunión"** — pointing at the existing `/preparation` brief, since that is the
one consultant-only action that matters before a client meeting. It never
competes with the primary CTA: it renders smallest, as a plain underlined
text link below the buttons, and only appears for `session.role ===
"consultant"`.

## What changed

### `components/workspace/next-step-cta.tsx` (extended, not replaced)

This was already the shared "what should I do now" panel used at the bottom
of every workspace tab (Mission 1). It gained:

- `onPrimaryClick` / `onSecondaryClick` — lets a CTA switch workspace tabs
  in-place (`setTab(...)`) instead of forcing a full navigation, for cases
  like "Ver plan de implementación" (Recommendations → Roadmap) where the
  destination is another tab of the same workspace, not a new route.
- An optional **tertiary** slot (`tertiaryHref`/`tertiaryLabel` or
  `onTertiaryClick`) — a single plain underlined text link, deliberately the
  quietest possible affordance, for supplementary guidance that must never
  compete with the page's one primary action (Carmen's meeting-prep nudge).
- Secondary actions now render as `variant="ghost"` at default size instead
  of a solid bordered `secondary` button at `size="lg"` — every existing
  caller of `NextStepCta` across the app automatically got a quieter
  secondary action from this one change, not just the five pages this
  mission targeted.

### `components/workspace/welcome-banner.tsx` (extended)

The Dashboard's top banner already carried a primary CTA (Mission 1); it now:

- Shows an explicit `¿Qué debo hacer hoy?` label directly above the button
  row, so the guiding question is literal, not implied by tone.
- Accepts `onContinueClick` so the primary button can jump to the
  Recommendations tab instead of only ever linking to `/discovery`.
- Its own secondary button ("Ver resumen ejecutivo", an in-page scroll) is
  now `variant="ghost"` to match the "one primary, quieter secondary" rule.

### `components/workspace/workspace-view.tsx`

- Added a single computed decision for the Dashboard's primary action —
  `showTodaysRecommendations` — true once `businessUnderstanding >= 40` (the
  same evidence bar `lib/executive/derive.ts` already uses for "Negocio
  comprendido") **and** there is at least one real recommendation or module
  to show. Below that bar, or with nothing to recommend yet, the CTA falls
  back to the existing dynamic `briefing.ctaLabel` ("Comenzar descubrimiento"
  / "Continuar descubrimiento"). This single boolean drives both the
  `WelcomeBanner` CTA and the bottom `NextStepCta` on Dashboard, so the page
  never shows two different opinions about what to do.
- Added a `preparationHref` constant (previously inlined once for
  `ArchitectNav`) and reused it for the new consultant-only tertiary links.
- **Dashboard (`executive`)**: bottom `NextStepCta` title is now the literal
  question, its primary now matches the dynamic decision above, and it gained
  the consultant-only "Preparar la próxima reunión" tertiary link.
- **Assessment (`assessment`)**: added the same guide (title "Ayúdame a
  responder preguntas", primary = continue/begin discovery, consultant
  tertiary = prepare meeting) as the very **first** element of the tab —
  previously this tab buried its only CTA under Diagnóstico progress,
  Company Evolution, Brand & Experience, Knowledge, and Recent Activity,
  meaning a user had to scroll past five sections to find out what to do
  next. The existing bottom CTA is kept (long tab, worth reinforcing at the
  end too) and now carries the same title.
- **Recommendations (`recommendations`)**: added the same guide at the top;
  fixed a latent mismatch where the existing bottom CTA's copy said "revise
  el plan de implementación or keep answering questions" but only ever wired
  "Continuar evaluación" — the primary action now actually is "Ver plan de
  implementación" (switches to the Roadmap tab), with "Continuar evaluación"
  demoted to the quieter secondary.
- **Roadmap (`roadmap`)**: same pattern — added the guide at the top and
  fixed the equivalent mismatch on the existing bottom CTA (description said
  "prepare el paquete de documentos", action now really does — "Ver
  documentos" switches to the Documentos tab).
- **Business (`company`)**: added the guide at the top and gave the existing
  bottom CTA the same title plus a new quiet secondary — "Ver conocimiento
  del negocio" (switches to the Conocimiento tab) — since that is where a
  user acts on "we don't know enough about X yet".

## Deliberately out of scope

- Tabs not named in the mission brief (Cómo funciona su empresa, Sistema
  recomendado, Cómo opera, Conocimiento, Perspectivas, ¿Qué pasa si…?,
  Documentos) were left as they were — they already have a single `NextStepCta`
  each and automatically picked up the quieter-secondary styling change, but
  their copy/targets were not rewritten, to keep this a small, reviewable
  change focused on the five pages the mission specified.
- No new pages, routes, tabs, or engines. `/preparation` already existed
  (Mission 5); this mission only adds a quieter pointer to it from two
  additional places.
- Client Mode vs Consultant Mode gating is unchanged — `CLIENT_VISIBLE_TAB_IDS`,
  `CONSULTANT_ONLY_PATHS`, and the `session.role === "consultant"` checks that
  already existed were reused, not modified. The new tertiary meeting-prep
  link is additionally gated on `isConsultant` at the call site, on top of
  the existing route-level gate.

## Verification

- `npm run typecheck` — clean.
- `npm run lint` — same 6 pre-existing warnings as Mission 11, in files this
  mission did not touch (`discovery-journey.tsx`,
  `lib/consulting/questions/index.ts`).
- Manually traced Álvaro's walkthrough (Resumen → Diagnóstico → Su empresa →
  Recomendaciones → Plan de implementación) and confirmed each page opens
  with one obvious next step, and that the two now-linked tab-jump CTAs
  (Recommendations → Roadmap, Roadmap → Documentos) land on the right tab.
- Confirmed Carmen's Dashboard and Diagnóstico tabs show the extra
  "Preparar la próxima reunión" link and that it is absent for the client
  role.
