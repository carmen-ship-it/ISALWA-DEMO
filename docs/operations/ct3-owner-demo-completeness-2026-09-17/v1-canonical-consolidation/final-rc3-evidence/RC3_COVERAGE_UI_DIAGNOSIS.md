# RC3 — Temporary coverage (Apoyo temporal) UI diagnosis

**As of:** 2026-09-17  
**Scope:** Cliente360 `TemporaryCoveragePanel` + `ServerMemberTypeahead` member picker.  
**Trigger:** RC2 Playwright failed interacting with `input[name=actingAdvisorMemberId]` / `#coverage-helper`.  
**Does not rewrite:** RC2 receipts under `final-rc2-evidence-8a153a4/`.  
**Code changes this note:** none (read-only diagnosis; product not broken for humans).

---

## Verdict

| Question | Answer |
|---|---|
| **Classification** | **HARNESS** (selector / interaction pattern), not PRODUCT |
| Human can grant/revoke? | **Yes** — accessible labeled combobox + submit / revoke buttons |
| Product-broken UI? | **No** — intentional hidden value field + visible combobox pattern (same as reassign owner) |
| Minimal product fix needed? | **None** for human usability. Optional a11y polish only if BV wants stronger `getByRole` anchors (not required). |

---

## 1. Where the UI lives

| Piece | Path |
|---|---|
| Panel | `apps/os-web/components/party/temporary-coverage-panel.tsx` |
| Member picker | `apps/os-web/components/operating/server-member-typeahead.tsx` |
| Mount | `apps/os-web/app/(app)/clientes/[partyId]/page.tsx` (Cliente360 identity block) |
| Grant/revoke actions | `apps/os-web/lib/commercial/actions.ts` (`grantCustomerCoverageAction` / `revokeCustomerCoverageAction`) |
| Search | `apps/os-web/lib/workforce/member-search.ts` → `searchActiveMembersAction` (min 2 chars, debounce 220ms) |

Panel shows when `commercialAccount?.id` and `ownerMemberId` exist. Manage affordances require `canManageCoverage` (`detail.commercialAuthority?.canManageCoverage === true` and not evaluation desk).

Copy anchors (already PASS in RC2 UI probe):

- Heading **Apoyo temporal**
- Canonical owner line + warning: *no cambia el responsable* / *no autoriza convertir*
- Grant CTA **Asignar apoyo temporal**
- Revoke CTA **Quitar apoyo temporal** (when `activeCoverage` present)

---

## 2. How the member picker works

`TemporaryCoveragePanel` grant form:

```tsx
<label htmlFor="coverage-helper">Quién apoya temporalmente</label>
<ServerMemberTypeahead
  id="coverage-helper"
  name="actingAdvisorMemberId"
  required
  excludeMemberId={canonicalOwnerMemberId}
  placeholder="Buscar miembro activo de la empresa"
/>
```

`ServerMemberTypeahead` renders **two** inputs:

1. **Hidden value (form payload)**  
   `<input type="hidden" name={name} value={selectedId} />`  
   → DOM: `input[name="actingAdvisorMemberId"]` — **not visible, not clickable**.

2. **Visible searchable combobox**  
   `<input id={id} type="text" role="combobox" … />`  
   → DOM: `#coverage-helper` — **no `name` attribute**.  
   Label `htmlFor="coverage-helper"` associates correctly with this field.

Human / a11y flow:

1. Focus combobox via label **Quién apoya temporalmente** (or tab).
2. Type ≥2 characters → server search → `role="listbox"` / `role="option"` opens.
3. Select via mouse (`mousedown` on option) or keyboard (ArrowUp/Down + Enter). Selection writes id into the hidden input.
4. Submit **Asignar apoyo temporal**.
5. With active grant: panel swaps to status + **Quitar apoyo temporal** (no typeahead).

Same pattern as `ReassignOwnerForm` (`#reassign-owner` + hidden `ownerMemberId`).

---

## 3. Why RC2 Playwright failed

RC2 evidence (`FINAL_RC2_RECEIPT.md`): coverage UI present; grant/revoke mutation UNPROVEN; “typeahead timeout / option click flaky.”

Likely harness mistakes:

| Mistake | Why it fails |
|---|---|
| `locator('[name="actingAdvisorMemberId"]').click()` / `fill()` | Targets **hidden** input → Playwright “not visible” / force-click useless |
| Treating `#coverage-helper` as the named field | `#coverage-helper` is the combobox; value is not in that element’s `name` |
| Clicking option with `click()` only after blur race | Options commit on **`mousedown`** (blur-safe for humans); flaky if list closed or query &lt; 2 chars |
| Expecting grant form when coverage already active | Grant form (and `#coverage-helper`) **unmounts** when `activeCoverage` is set — only revoke remains |

This is **not** evidence that humans cannot grant/revoke.

---

## 4. PRODUCT vs HARNESS

### HARNESS (primary)

Fix BV to drive the **combobox**, not the hidden input. Do not invent a parallel select.

### PRODUCT

No blocking product defect for grant/revoke by a human with `canManageCoverage`.

**Non-blocking notes** (do not treat as RC3 must-fix):

| Note | Severity | Suggested direction (if ever touched) |
|---|---|---|
| Hidden `name` + separate `id` confuses harness authors | Doc/harness | Document selectors (below); keep pattern |
| Options are `div[role=option]` not `<button>` | OK for a11y | Prefer `getByRole('option')` in BV |
| Optional: `aria-label` on combobox if label association ever breaks | Polish | Keep single `htmlFor` / combobox; no second picker |

**Do not:** add a native `<select>`, duplicate member dropdown, or expose a visible raw-id field “for tests.”

---

## 5. Correct BV selectors (grant → revoke)

Preconditions: owner (or coverage manager) session; Cliente360 for party with commercial account; **no** active coverage for grant path (or revoke first).

### Grant

```js
// Scope to Apoyo temporal section when possible
const panel = page.getByRole('heading', { name: /Apoyo temporal/i }).locator('..');

// Combobox — NOT the hidden name=actingAdvisorMemberId
const helper = page.getByRole('combobox', { name: /Quién apoya temporalmente/i });
// equivalents:
//   page.locator('#coverage-helper')
//   page.getByLabel(/Quién apoya temporalmente/i)

await helper.click();
await helper.fill('Br'); // ≥2 chars; use a real active member display prefix ≠ canonical owner
await page.getByRole('listbox', { name: /Miembros/i }).waitFor({ state: 'visible' });
await page.getByRole('option').first().click(); // or: helper.press('ArrowDown'); helper.press('Enter');

await page.getByRole('button', { name: /Asignar apoyo temporal/i }).click();
await expect(page.getByText(/Apoyo activo:/i)).toBeVisible();
```

**Never:**

```js
page.locator('input[name="actingAdvisorMemberId"]').click(); // hidden
page.locator('input[name="actingAdvisorMemberId"]').fill('…'); // wrong surface
```

Hidden input may be asserted **after** selection only:

```js
await expect(page.locator('input[name="actingAdvisorMemberId"]')).toHaveValue(/.+/);
```

### Revoke

```js
await page.getByRole('button', { name: /Quitar apoyo temporal/i }).click();
await expect(page.getByRole('button', { name: /Asignar apoyo temporal/i })).toBeVisible();
```

### Proof contract (mutation)

UI presence alone = PARTIAL (RC2 already had that). Hosted PASS for TEMPORARY_COVERAGE requires:

1. Grant success copy or **Apoyo activo:** + helper name  
2. Canonical warning still true (owner label unchanged)  
3. Revoke restores grant form  
4. Prefer main content; do not PASS on sidebar alone  

---

## 6. Summary for Control Tower

| Item | Status |
|---|---|
| Apoyo temporal panel | Implemented on Cliente360 |
| Human grant/revoke via labeled combobox | Usable |
| RC2 click on `name=actingAdvisorMemberId` / confusion with `#coverage-helper` | **HARNESS** |
| Product rewrite / parallel picker | **Not required** |
| Next BV action | Use combobox role/label selectors above; prove grant→revoke mutation |

**Gate implication:** `TEMPORARY_COVERAGE_HOSTED` remains PARTIAL until harness uses correct interaction; do not open a product bug for “hidden input not clickable.”
