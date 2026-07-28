# Mission 26 — Living Company Deliverables

**Status:** Complete (PDF + DOCX generation shipped for all eight deliverables).
**App:** `apps/architect`
**Scope:** A Deliverables Center that composes eight always-current company documents
(Business Blueprint, Company Playbook, Employee Handbook, SOP Library, Job Description
Library, Training Academy, AI Playbook, Improvement Roadmap) strictly from existing
engines, versions them, tells the client when the brain has learned something new
("Update Available"), and lets them view online or download PDF/Word. It does **not**
add a second knowledge system, a second scoring model, or a competing deliverables
surface — it upgrades the existing `deliverables` tab / `DeliverablesPanel`.
**Plan:** Follows the Mission 25 governance layer (`docs/PRODUCT_CONSTITUTION.md`,
`docs/ENGINEERING_GUIDELINES.md`).
**Gate honored:** `docs/PRODUCT_CONSTITUTION.md`, `docs/ENGINEERING_GUIDELINES.md`,
`docs/RELEASE_CHECKLIST.md`, `docs/architecture/AI_CONSTITUTION.md`,
[`docs/ai/02_ARCHITECT_CONSTITUTION.md`](./docs/ai/02_ARCHITECT_CONSTITUTION.md).
**Follows:** Mission 25 (`c3923b4`, docs-only governance), Mission 24 (`28d4d7b`,
Autonomous Consulting Cycle). `git status` at mission start was clean — no interrupted
Mission 25 "Company OS" product WIP existed to absorb or stash (only the pre-existing,
unrelated `wip teach-architect-interrupted` stash, left untouched).
**Extends (unchanged):** `lib/blueprint` (`latestBlueprint`, versioning pattern copied,
never modified), `lib/deliverables/requirements.ts`'s `buildBlueprintDeliverable`
(reused verbatim, not re-derived), `lib/company-model`, `lib/processes`,
`lib/explanations/recommendation.ts`'s `explainWorkspaceRecommendations`,
`lib/readiness`'s `snapshotFromWorkspace`, `lib/deliverables/executive-summary.ts`'s
`buildExecutiveSummary` (for the one existing "vision" sentence), `lib/presentation`
label helpers, `components/workspace/deliverables-panel.tsx` (its `Article` / `Section`
/ `List` / `Empty` / `Meta` primitives are now exported and reused, not duplicated).

## Mission Objective

Álvaro asked, in effect, "where is ISALWA's actual operating manual — not a diagnostic
screen, a document I can hand to a new hire or a bank." This mission answers **What do
we know?** (every deliverable is a different lens on the same evidence Architect already
holds) and **Why does it matter?** (a Blueprint slide deck doesn't run a company; a
Playbook, a Handbook, and a set of SOPs do) — while staying honest about **What are we
trying to learn?** every deliverable prints its own "Needs More Knowledge" list instead
of inventing content Architect was never told.

## Protected Systems

- **Business Blueprint** (`lib/blueprint/`) — read-only. `generateBusinessBlueprintLiving`
  calls `latestBlueprint()` and `buildBlueprintDeliverable()`; it derives nothing new.
- **Deliverables** (`lib/deliverables/`) — extended via a new `lib/deliverables/living/`
  sibling folder, not modified. Mission 9's package (`generateDeliverables`,
  `DeliverablesPackage`, the eleven existing deliverable tabs) is untouched and still
  works exactly as before.
- **Company Model / Company Brain** (`lib/company-model/`,
  `lib/consulting-intelligence/company-brain.ts`) — read-only source for Company
  Playbook, Employee Handbook, and Job Description Library.
- **Process Model** (`lib/processes/`) — read-only source for SOP Library and Training
  Academy.
- **Consulting Intelligence** (`lib/consulting-intelligence/`) — read-only source
  (`workspace.conversationMemory.consulting.opportunities`) for Improvement Roadmap.
- **Retrieval / Readiness** (`lib/readiness/`) — `snapshotFromWorkspace` is the only
  input to the new knowledge fingerprint; no new evidence collector was added.
- **Client/Consultant boundary** — every Living Deliverable is client-safe by
  construction (no raw engine ids, no internal consulting vocabulary), so the Center is
  visible in both modes; nothing new was added to the consultant-only tabs.

## Existing Engines To Use

- `latestBlueprint`, `buildBlueprintDeliverable` — Business Blueprint.
- `workspace.companyModel` (`CompanyOrganization`, `CompanyDepartment`, `CompanyRole`,
  `CompanyDecisionFlow`, `CompanyInformationFlow`) — Company Playbook, Employee
  Handbook, Job Description Library.
- `workspace.businessProcesses` (`ProcessWorkflow`, steps, handoffs, exceptions) — SOP
  Library, Training Academy.
- `explainWorkspaceRecommendations` — AI Playbook.
- `workspace.conversationMemory.consulting.opportunities` (falls back to
  `workspace.opportunities`) — Improvement Roadmap.
- `snapshotFromWorkspace`, `workspace.businessUnderstanding` — the "brain fingerprint"
  behind Update Available, and the confidence ceiling for every deliverable.
- `buildExecutiveSummary` — reused once, for Company Playbook's "vision" sentence,
  instead of inventing a second vision-derivation.

No existing engine computes company mission/vision/values as first-class facts, so
Company Playbook's "values" and Employee Handbook's policy sections are reported as
**Needs More Knowledge** rather than guessed — searched `types/*.ts` for `mission`,
`vision`, `values` fields first; the only real hit was `ExecutiveSummaryDeliverable.vision`
and `BrandExperienceModel.employeeExperienceVision`, and the former is what's reused.

No PDF/DOCX generation path existed anywhere in the monorepo (`rg -i "pdf|docx"` across
`apps/architect` turned up only OCR/document-kind references) — `pdf-lib` (PDF) and
`docx` (Word) are the two new dependencies this mission adds, both pure JS, Node-runtime
only, kept out of the client bundle (see Implementation Strategy).

## Implementation Strategy

New files, in build order:

1. `types/living-deliverables.ts` — `LivingDeliverableKind`, per-kind content shapes,
   `LivingDeliverableVersion`, `LivingDeliverablesState`, `KnowledgeFingerprint`. Wired
   into `types/index.ts` and `types/workspace.ts` (`CompanyWorkspace.livingDeliverables?`,
   optional so existing persisted workspaces stay valid — same pattern as
   `consultingIntelligence?` / `lastOvernightReview?`). No DB migration: workspaces
   persist as one JSONB document (`supabase/migrations/001_pilot_persistence.sql`).
2. `lib/deliverables/living/fingerprint.ts` — `computeKnowledgeFingerprint`,
   `deliverableConfidence` (both compose existing Readiness/Blueprint numbers, never a
   new score).
3. `lib/deliverables/living/versioning.ts` — append-only version log, mirrors
   `lib/blueprint/derive.ts`'s `nextBlueprintVersion` / `appendBlueprintVersion` /
   `latestBlueprint`, generalized across the eight kinds on one flat array.
4. `lib/deliverables/living/evidence.ts` — narrows each engine's own evidence-source
   union into the Living Deliverable's display union (no new evidence ids).
5. `lib/deliverables/living/copy.ts` — the Spanish, company-name-interpolated CTA copy
   (generated in-engine per Constitution rule 6, since it can't be a static i18n string
   without drifting per company). Encodes the Carmen UX rule directly: `generateLabel`
   always reads "Generar el/la {Documento} de {Empresa}", never "Descargar PDF".
6. Eight generators — `business-blueprint.ts`, `company-playbook.ts`,
   `employee-handbook.ts`, `sop-library.ts`, `job-description-library.ts`,
   `training-academy.ts`, `ai-playbook.ts`, `improvement-roadmap.ts` — each a pure
   function `(workspace) => { title, content, evidence, missingInformation,
   contentSignalCount }`.
7. `lib/deliverables/living/index.ts` — `generateLivingDeliverableVersion` (pure) and
   `regenerateLivingDeliverable` (persists via `getClientCompanyMemoryStore`, appends a
   timeline event, same shape as `lib/deliverables/index.ts`'s `generateDeliverables`).
   Never auto-runs: only called from a user click.
8. `lib/deliverables/living/export/document-model.ts` — the shared `ExportDocument`
   intermediate representation (no template in React).
9. `lib/deliverables/living/export/compose.ts` — `composeLivingDeliverableDocument`,
   pure, isomorphic (client + server safe), turns a version into `ExportDocument`.
10. `lib/deliverables/living/export/pdf.ts` — `pdf-lib` two-pass text-flow renderer:
    cover page, table of contents with real computed page numbers, numbered
    header/footer content pages ("Página X de Y · Generado por Architect"), revision
    history page.
11. `lib/deliverables/living/export/docx.ts` — `docx` renderer: cover page, Word
    heading styles (so Word's native "Update Field" TOC works), footer with
    `PageNumber.CURRENT` / `PageNumber.TOTAL_PAGES` fields, revision-history table.
12. `app/api/deliverables/living/export/route.ts` (Node runtime) — receives the
    already-composed `ExportDocument` + format in the POST body (same pattern as
    `app/api/interview/route.ts` / `app/api/documents/ocr/route.ts` receiving
    client-held state rather than re-fetching from the server-restricted
    `getClientCompanyMemoryStore()`), returns the binary with a `Content-Disposition`
    download header. This keeps `pdf-lib`/`docx` out of the client bundle entirely
    (confirmed: `/workspace/[id]` First Load JS dropped from 745 kB to 484 kB once the
    client component imported `compose.ts` directly instead of the `export/index.ts`
    barrel that also re-exports the two Node-only renderers).
13. `components/workspace/living-deliverable-article.tsx` — "View Online" renderer,
    reusing `Article` / `Section` / `List` / `Empty` from `deliverables-panel.tsx`
    (newly exported, not duplicated).
14. `components/workspace/living-deliverables-center.tsx` — the Center itself: one card
    per deliverable kind with Readiness, Confidence, Evidence, Missing Information, Last
    Generated, Version, and the Carmen-specified generate → view/download flow (see UX
    section below).
15. `components/workspace/deliverables-panel.tsx` — extended: `LivingDeliverablesCenter`
    now renders above the untouched Mission 9 package in both its "no package yet" and
    "package generated" branches. `Article`/`Section`/`List`/`Empty`/`Meta` exported.

No new client-visible Spanish copy was added outside `lib/deliverables/living/copy.ts`
and the eight generator files — chrome-level UI strings (card labels like "Ver en
línea", "Descargar PDF") stay as plain literals matching the rest of
`deliverables-panel.tsx`'s existing non-i18n Spanish literals, consistent with how that
file already writes chrome directly rather than through `lib/i18n` (Client Mode is
Spanish-only there today; a future i18n pass would need to touch that whole file, not
just this mission's addition).

## UX flow (Carmen, mid-mission refinement)

The primary action on every card is never "Download PDF" — it is generation, phrased as
building the company's own artifact (`livingDeliverableCopy` interpolates the real
`workspace.companyName`, e.g. *"Generar el Manual del Empleado de ISALWA"*). Download
PDF / Download Word buttons are rendered **conditionally on a version already
existing** — they are simply absent from the card until the first generation completes.
After the click: `regenerateLivingDeliverable` composes from Company Brain (honest
"Needs More Knowledge" sections allowed), persists, and only then does the card reveal
Version / Readiness / Confidence / Evidence / Missing Information plus "Ver en línea",
"Descargar PDF", "Descargar Word". When the brain fingerprint has moved since the last
generation, the primary button relabels to "Actualizar…" with an "Actualización
disponible" badge — regeneration is always the user's choice, never automatic.

## Versioning model

`CompanyWorkspace.livingDeliverables.versions` is one flat, append-only array (mirrors
`workspace.blueprints`) holding every `LivingDeliverableVersion` ever generated, across
all eight kinds. Each version stores `version`, `generatedAt`, `confidence`,
`evidenceCount`, `evidence`, `missingInformation`, and a `fingerprint`
(`{ evidenceCount, understandingPercent, blueprintVersion, companyModelGeneratedAt }`
— all numbers other engines already publish). `isUpdateAvailable` recomputes the current
fingerprint and compares; nothing is overwritten, only marked `superseded`.

## Definition of Done

- [x] Every claim/number shown to a client traces to evidence (blueprint, company
      model, processes, consulting opportunities, explained recommendations — see
      "Existing Engines To Use").
- [x] No new scoring model / parallel engine — confirmed above per protected system.
- [x] Client Mode / Consultant Mode boundary respected — Living Deliverables Center is
      client-safe by construction, shown in both modes; consultant-only Mission 9 tabs
      unchanged.
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm build` pass (see Verification).
- [x] Mobile + accessibility preserved — grid collapses to one column below `sm:`,
      buttons keep visible focus rings from the shared `Button` component, no new
      color-only signal (badges pair color with text).
- [x] No duplicated components — `Article`/`Section`/`List`/`Empty` reused, not forked;
      no new Dialog/Modal primitive introduced (the "View Online" panel is an inline
      `AnimatePresence` expand, the same pattern `DeliverablesPanel`'s tab switch
      already uses).
- [x] PDF works for all eight text deliverables (not just Blueprint) — the shared
      `pdf.ts` / `docx.ts` renderers are generic over `ExportDocument`, so every kind
      gets both formats, not just one.

## Verification

```bash
git diff --stat main   # confirms the touched-file list matches this doc
pnpm --filter @isalwa/architect typecheck   # passes
pnpm --filter @isalwa/architect lint        # passes (pre-existing unrelated warnings only)
pnpm --filter @isalwa/architect build       # passes, 14/14 static pages generated
```

## What PDF/DOCX actually do vs. what's deferred

- **Working now, for all eight deliverables:** View Online (in-app, from composed
  content — never a hardcoded template), Download PDF (cover + table of contents with
  real page numbers + numbered content pages with header/footer branding + revision
  history page), Download Word (cover page, native Word heading styles, footer page-number
  fields, revision-history table — editable in Word, unlike the PDF).
- **Deferred, reported honestly, not faked:** the DOCX table of contents is a Word
  field that must be refreshed once ("right-click → Update Field", noted directly on the
  cover page) rather than pre-rendered with page numbers the way the PDF's TOC is —
  Word computes real pagination only at layout time, and faking numbers on export would
  be a confidence lie the moment the reader's page count differs. Custom Newsreader/serif
  branded typography was not embedded into the binaries (both renderers use
  Helvetica/Word defaults) — matching brand fonts exactly in a hand-built PDF layout
  engine was judged lower priority than shipping working PDF+DOCX for all eight
  documents within this mission; a follow-up can embed the brand typeface into
  `pdf.ts`/`docx.ts` without touching the compose layer. PowerPoint/Notion/Confluence/
  Jira/Linear/GitHub/Cursor export targets remain exactly as before (Mission 9's
  `DELIVERABLE_EXPORT_CONTRACTS`, status `"planned"`/`"designed"`) — untouched by this
  mission.

## How Álvaro opens it

Workspace → **Documentos** tab (existing `deliverables` tab, both Client and Consultant
Mode) → the new **Centro de Entregables Vivos** section at the top, above the existing
consulting package. Each of the eight cards starts with a single button phrased as
building that company's own document; after it completes, "Ver en línea" opens an inline
preview and "Descargar PDF" / "Descargar Word" download the real files.

## Deliberately out of scope

- No auto-regeneration on new evidence — "Update Available" is a badge, never a
  background rewrite, per the mission's hard rule.
- No second Company Playbook/Handbook data store — everything renders live from
  `workspace.companyModel` / `workspace.blueprints` / `workspace.businessProcesses` at
  generation time; only the composed **output** (title, prose, evidence refs) is
  persisted as a version, never a duplicated copy of the source models.
- No real training videos, quizzes, or certificates — Training Academy generates
  outlines only, plus the honest future-roadmap note, per the mission brief.
- No brand-font-accurate PDF/DOCX typography (see above) — functional executive
  documents shipped now; visual-identity polish is a follow-up, not a blocker.
- No changes to Mission 9's `DeliverablesPanel` tabs, `DeliverableExportContract`
  status values, or the `generateDeliverables` package — fully additive.

## Receipt Update

See [`docs/ai/04_ARCHITECT_RECEIPT.md`](./docs/ai/04_ARCHITECT_RECEIPT.md) — row added
under "Completed missions" with this mission's commit hash.
