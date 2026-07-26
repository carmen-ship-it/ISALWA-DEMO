# White Label Company Experience

**App:** `apps/architect`
**Depends on:** Brand & Experience Studio (`MISSION10.md`, `lib/brand/`, `CompanyWorkspace.brandExperience`)
**Extends:** Presentation/settings layer only — no changes to the Brand engine's derivation logic, no new tenancy model, no parallel branding system.

## Goal

Every client should feel Architect was built for them. Carmen (consultant) configures a small set of cosmetic overrides in Spanish; Álvaro (client) sees the branded result automatically everywhere the brand model already surfaces — workspace, welcome message, and living report — with zero extra steps per visit.

## Two brand layers (deliberately separate)

| Layer | Type | Who sets it | Scope |
| --- | --- | --- | --- |
| **Derived brand model** | `BrandExperienceModel` (`workspace.brandExperience`) | Nobody — deterministically inferred from industry, blueprint, knowledge, meetings | Recommendation only, regenerates on every blueprint advance |
| **Consultant overrides** | `BrandOverrides` (`workspace.brandOverrides`) | Carmen, via the "Marca blanca" panel | Persists independently, survives blueprint regeneration |
| **Multi-tenant readiness** | `FutureWhiteLabelConfig` (`model.whiteLabel`) | Nobody yet — contracts only, `status: "designed"` | Partner/reseller SaaS tenancy — explicitly **out of scope** for this mission |

`applyBrandOverrides(model, overrides, fallbackCompanyName)` (`lib/brand/overrides.ts`) merges the two into one `EffectiveBrandExperience` — the single object every presentation surface reads. Empty override fields fall through to the derived recommendation; nothing is invented.

## Field-by-field mapping

| Requested field | Engine hook | Where it's edited | Where it applies automatically |
| --- | --- | --- | --- |
| Logo | `BrandOverrides.logoUrl` (URL string — no upload pipeline) | Marca blanca panel | Workspace header, living report header |
| Primary color | `BrandOverrides.primaryColor` → `EffectiveBrandExperience.cssVariables["--architect-brand-primary"]` | Marca blanca panel | Logo accent border (workspace header + report), settings preview swatch |
| Accent color | `BrandOverrides.accentColor` → `--architect-brand-accent` | Marca blanca panel | Settings preview swatch; CSS variable exposed on the workspace root `<main>` for future consumption |
| Industry (positioning) | `BrandOverrides.industryPositioning` overrides `brandProfile.industryPositioning` | Marca blanca panel | Effective value available wherever `EffectiveBrandExperience.industryPositioning` is read (currently the settings preview; not yet surfaced in client-facing copy — see gaps) |
| Terminology (business terms) | `BrandOverrides.terminologyOverrides` keyed by `term::preferredLabel`, merged via `applyBrandOverrides` into `EffectiveTerminologyEntry[]` | Marca blanca panel | Settings preview list |
| Department names | Same terminology-override mechanism, filtered to `term === "Department"` → `EffectiveBrandExperience.departmentTerminology` | Marca blanca panel | Settings preview list **and** the Company Model "Departamentos" list (`resolveEffectiveLabel()`, `lib/brand/overrides.ts`) |
| Homepage message | `BrandOverrides.homepageMessage` | Marca blanca panel | Replaces the auto-composed welcome description in `WelcomeBanner` (client + consultant home tab) |
| Illustration style | `BrandOverrides.illustrationStyle` (free text) | Marca blanca panel | Captured and persisted only — **no illustration rendering system exists in Architect** (see gaps) |
| Report branding | `BrandOverrides.reportBranding` (`showLogoOnReports`, `footerText`) | Marca blanca panel | Living report: logo visibility + footer text |

## Where the effective brand is consumed

- `components/workspace/workspace-view.tsx` — computes `effectiveBrand = applyBrandOverrides(...)` once per render; feeds the workspace header logo/accent, `cssVariables` on the page root, `WelcomeBanner.brandMessage`, and `CompanyModelPanel.departmentNames`.
- `components/report/report-view.tsx` — computes the same `EffectiveBrandExperience` for the living report (logo, accent border, footer text).
- `components/workspace/brand-settings-panel.tsx` — Carmen's Spanish editing surface. Shows a live preview of the draft before saving; "Restablecer a valores derivados" clears all overrides back to the Brand engine's recommendation.

Both consumers use the exact same `applyBrandOverrides()` call with the same three inputs (`workspace.brandExperience`, `workspace.brandOverrides`, `workspace.companyName`) — one merge function, no duplicated logic, no parallel branding system.

## Access control

- The "Marca blanca" settings panel only renders when `session?.role === "consultant"` (Carmen). Álvaro never sees the editing UI.
- The branded *result* (logo, colors, homepage message, terminology, report branding) is unconditional — both roles see the same `effectiveBrand`, satisfying "Álvaro sees branded experience" without a client/consultant fork in the brand path.

## Constitution constraint honored: frozen design language

The ISALWA AI Constitution freezes the visual language (Porcelain backgrounds, kiln sidebar, glaze accents, Newsreader italic titles, 8px rhythm) and forbids introducing a second visual language. Primary/accent color overrides are therefore **intentionally scoped narrowly** — a logo accent border and the settings preview swatches — rather than re-skinning buttons, backgrounds, or navigation chrome. The `--architect-brand-primary` / `--architect-brand-accent` CSS variables are computed and exposed on the workspace root for any future, explicitly-approved chrome consumption, but nothing beyond the logo accent reads them today. This is a deliberate boundary, not an oversight.

## Honest gaps

1. **No logo upload.** `logoUrl` is a pasted URL. There is no file upload, storage bucket, or CDN pipeline — consistent with Mission 10's "future intake" contracts (`BRAND_ASSET_UPLOAD_PROVIDERS`), which remain `status: "planned"`.
2. **Illustration style is captured but not rendered.** No illustration/imagery system exists anywhere in Architect yet. The field is persisted for a future mission and shown as a text preference only.
3. **Primary/accent colors do not re-skin the app.** By constitution, the frozen design tokens (`packages/ui/src/tokens/tokens.css`) remain the single visual source of truth. Overrides currently affect only the logo accent border and the settings preview — see "Constitution constraint" above.
4. **Department-name overrides apply to one surface.** They rename the primary "Departamentos" list in the Company Model panel (`CompanyModelPanel`), which reads names 1:1 from the same blueprint departments the terminology engine derives from. They do **not** propagate into relationship, ownership, or information-flow labels elsewhere in the Company Model — those are precomputed display strings from a separate derivation domain (`lib/company-model/`, out of scope for a Brand-engine presentation extension) and would require touching that engine's derivation, which this mission deliberately avoids ("never rewrite working systems").
5. **Industry positioning override isn't yet quoted in client-facing copy.** It's merged into `EffectiveBrandExperience.industryPositioning` and visible in the consultant's settings preview, but no client-facing surface currently quotes that field back (the workspace header shows the raw industry classification label, not the positioning sentence). Wiring it in would be a small follow-up once a natural copy slot is identified.
6. **No multi-tenant white-labeling.** `FutureWhiteLabelConfig` (custom domains, hiding ISALWA branding, partner theme packs) remains `enabled: false` / `status: "designed"` — untouched contracts for a future partner/reseller mission, not part of this single-tenant cosmetic override work.

## Verification

- `npm run typecheck` — passes
- `npm run lint` — passes (pre-existing unrelated warnings only)
- Manual flow: Carmen opens a workspace → Diagnóstico tab → "Marca blanca" → sets logo/colors/message/terminology → saves → reloads as Álvaro (client role) → workspace header, welcome message, department names, and living report all reflect the saved overrides without any client-side action.
