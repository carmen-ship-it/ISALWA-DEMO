# Mission 25 — Product Constitution & Company Operating System

> **Follow-on:** the permanent Architect AI context system
> ([`docs/ai/README.md`](./docs/ai/README.md)) builds directly on this mission's governance
> layer — read it first when starting a new mission; it extends, and cross-links back to, every
> doc this mission established.

**Status:** Complete (governance pass + Company OS product pass)
**App:** `apps/architect`
**Depends on:** Missions 0–18 + Discovery Agent roadmap (P0 → F); governance pass also
codifies the 2026-07-27 product/security audit. Product pass depends on Mission 21 (Company
Brain) and Mission 26 (Living Company Deliverables) — the OS hub **composes** those surfaces,
it does not replace them.

This mission shipped in two passes:

1. **Governance pass** (`c3923b4`) — documentation only.
2. **Company Operating System product pass** — client-facing OS hub tab that frames
   Conversation → Knowledge → Company Brain → Operating System and routes into Mission 26
   living deliverables (no second catalog).

---

## Pass 1 — Product Constitution & Security Foundation

**Commit:** `c3923b4` — `docs: Mission 25 — Product Constitution & Security Foundation`

### Goal

Before Missions 19–24 continue, establish **permanent governance docs** so future missions have a
single, stable place to check product intent, security posture, engineering process, past
architectural decisions, operations, and release quality — instead of re-deriving them from
scattered mission docs and audits each time.

### Hard constraints honored

| Constraint | Status |
| --- | --- |
| No runtime behavior changed | ✅ — zero `.ts`/`.tsx`/config files touched |
| No business logic changed | ✅ |
| AI / Discovery / Readiness / Consulting / Retrieval / Blueprint / Knowledge / Process / Deliverables / Executive engines untouched | ✅ |
| Documentation-only file writes | ✅ — new files under `docs/`, this file, and README additions |
| No secrets committed | ✅ — env variable **names** only, never values |
| No invented runtime features | ✅ |

### What was established

Six permanent governance documents under `docs/` (scoped to `apps/architect`):

1. **[`docs/PRODUCT_CONSTITUTION.md`](../../docs/PRODUCT_CONSTITUTION.md)**
2. **[`docs/SECURITY_POSTURE.md`](../../docs/SECURITY_POSTURE.md)**
3. **[`docs/ENGINEERING_GUIDELINES.md`](../../docs/ENGINEERING_GUIDELINES.md)**
4. **[`docs/ARCHITECTURE_DECISIONS.md`](../../docs/ARCHITECTURE_DECISIONS.md)**
5. **[`docs/OPERATIONS_RUNBOOK.md`](../../docs/OPERATIONS_RUNBOOK.md)**
6. **[`docs/RELEASE_CHECKLIST.md`](../../docs/RELEASE_CHECKLIST.md)**

Root and Architect READMEs gained a Governance section. Full detail for this pass remains in
git history at `c3923b4`.

---

## Pass 2 — Company Operating System hub (product)

### Goal

Give Álvaro one client-facing place that answers: *Architect has learned enough to start
building your company's operating system* — framed as the pipeline Conversation → Knowledge →
Company Brain → Operating System — without inventing a second deliverables catalog.

Mission 26 already owns generation, versioning, Update Available, and PDF/DOCX export inside
Documentos (`LivingDeliverablesCenter`). This pass is a **presentation hub**: readiness,
confidence, evidence counts, and CTAs come from living deliverable overview + knowledge
fingerprint. Generate / preview / update buttons open Documentos and focus the matching kind.

### Hard constraints honored

| Constraint | Status |
| --- | --- |
| No parallel living-deliverables catalog | ✅ — composes `buildLivingDeliverablesOverview` |
| No second scoring model | ✅ — confidence / evidence from Mission 26 versions + fingerprint |
| Extend consulting-intelligence, do not rewrite Company Brain | ✅ — new `company-operating-system.ts` sibling |
| Reuse `@isalwa` / local UI primitives (`Card`, `Button`, section tones) | ✅ |
| Spanish client copy | ✅ — panel strings Spanish; tab labels in `es.ts` / `en.ts` |
| Client Mode visible | ✅ — `operatingSystem` in `CLIENT_VISIBLE_TAB_IDS` |
| Teach-Architect stash untouched | ✅ |
| Full ChatGPT receipt not rewritten here | ✅ — receipt row only in `04_ARCHITECT_RECEIPT.md` |

### What shipped

| Surface | Role |
| --- | --- |
| `lib/consulting-intelligence/company-operating-system.ts` | `buildCompanyOperatingSystem(workspace)` — modules from living overview + roadmap tiles (AI knowledge base, evolution timeline) |
| `components/workspace/company-operating-system-panel.tsx` | Client hub UI: pipeline kicker, module cards, evolution strip |
| `workspace-tabs.tsx` | `operatingSystem` tab id, order, client visibility, client label key |
| `workspace-view.tsx` | Renders panel when `activeTab === "operatingSystem"`; CTAs set focus kind + switch to Documentos |
| `deliverables-panel.tsx` / `living-deliverables-center.tsx` | Optional `focusKind` deep-link (scroll + expand + highlight) — generation UI stays Mission 26 |
| `lib/i18n/messages/{es,en}.ts` | `workspaceTabs.operatingSystem` / `operatingSystemClient` |

### Pipeline framing (client)

1. Conversación  
2. Conocimiento  
3. Company Brain  
4. Operating System  

Every module card shows readiness label, confidence, evidence count, “generado desde”, last
updated, and a Spanish “porque entendemos…” sentence. Living kinds deep-link into Centro de
Entregables Vivos; roadmap modules stay honest (“Próximamente” / open Documentos).

### Protected systems

- **Mission 26 living deliverables** — read + navigate only; no second generator.
- **Company Brain** (`company-brain.ts`) — unchanged; OS sits beside it in the tab rail.
- **Orientation panel export** — kept on the consulting-intelligence barrel (must not be
  replaced when adding OS exports).

### Deliberately out of scope

- Rebuilding generate / export UI (owned by Mission 26).
- Teach-Architect stash / learning-summary extension.
- Full ChatGPT agent receipt rewrite (parent follow-up after teach stash).

### Definition of Done (product pass)

- [x] Tab visible in Client Mode (`Sistema operativo de mi empresa`).
- [x] Panel composes from Company Brain–backed living deliverables + fingerprint.
- [x] CTAs route into Documentos / focus living deliverable kind.
- [x] Types / lint / build pass for `apps/architect`.
- [x] `MISSION25.md` documents both passes.
- [x] `docs/ai/04_ARCHITECT_RECEIPT.md` updated with OS hub entry.
- [x] Committed + pushed (no `--no-verify`, no force push).
