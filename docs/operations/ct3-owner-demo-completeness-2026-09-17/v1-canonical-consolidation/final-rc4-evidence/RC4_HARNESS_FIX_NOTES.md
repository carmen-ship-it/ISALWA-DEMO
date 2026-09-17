# RC4-H hosted BV harness fix notes

RC4-H lives under `final-rc4-evidence/harness/` (`rc4-bv-shared.mjs`, `rc4-hosted-bv.mjs`, `rc4-hosted-bv-supplement.mjs`). RC3 evidence under `final-rc3-evidence/` is unchanged.

## A. View As cookie

- **Canonical cookie:** `isalwa-os-role-preview-persona` (matches `ROLE_PREVIEW_PERSONA_COOKIE` in `apps/os-web/lib/role-preview/persona-cookie.ts`).
- **RC3 harness bug:** wrote `isalwa-role-preview-persona`, so evaluation projection never activated and View As checks were false failures.
- **RC4 behavior:** `setViewAsPersona` opens shell **Vista de evaluación** / **Vista previa**, picks a `menuitemradio` preset, then verifies the canonical cookie; cookie fallback uses only the canonical name.
- **Exit:** `clearViewAsPersona` clicks **Volver a vista de evaluación** when shown and clears **both** `isalwa-os-role-preview-persona` and legacy `isalwa-role-preview-persona`.

## B. OrderPrep review buttons

- Product copy (`order-prep-card.tsx` / `ORDER_PREP_COPY`): each department section uses the same accessible label **`Solicitar revisión`** (not “Solicitar revisión Producción”, etc.).
- **RC4 locators:** scope by section kicker (`PRODUCCIÓN`, `ALMACÉN`, `COMPRAS` via `p.isalwa-section-label`), then `getByRole('button', { name: /^Solicitar revisión$/i })` inside that `<li>`.

## C. Story Mode advance

- **Open:** `getByRole('button', { name: /Ver recorrido completo/i })` (Inicio owner demo card / Ayuda).
- **Overlay:** `getByRole('dialog', { name: /Recorrido completo de ISALWA/i })`.
- **Advance:** footer `getByRole('button', { name: /^Siguiente$/i })`; count advances when **Paso n de m** changes (RC3 used wrong labels → `advanced=0`).

## D. Resource-loaded assertions

- Primary runner imports `assertResourceLoaded` / catalog from `final-rc3-evidence/rc3-hosted-bv-assertions.mjs` (read-only).
- **PASS** requires resource id + business `contentPatterns` in `main`, and rejects `AccessDenied` / error boundaries — not breadcrumb/nav chrome alone.
- Harness maps assert results via `statusFromResourceAssert` → **`PRODUCT_FAIL`** when content or deny gates fail (not **`HARNESS_FAIL`**).

## E. Result taxonomy

Every check uses exactly one of:

| Status | Meaning |
|--------|---------|
| **PASS** | Hosted proof succeeded |
| **PRODUCT_FAIL** | App/content/security/demo behavior failed |
| **HARNESS_FAIL** | Selector, cookie, or runner bug (e.g. invalid status, story open selector miss) |
| **BLOCKED** | Cannot run (missing staging password, login blocked) |
| **UNPROVEN** | Intentionally shallow or inconclusive (skipped mutation, partial commercial loop) |

`check()` in `rc4-bv-shared.mjs` rejects legacy `FAIL` / `PARTIAL` and coerces unknown values to **HARNESS_FAIL**. Known RC3 false negatives (wrong View As cookie, wrong OrderPrep/Story selectors) are fixed in RC4 so they surface as **PASS** or **PRODUCT_FAIL**, not mislabeled harness passes.
