# CT3_COLOR_RECEIPT

**Source:** `packages/ui/src/tokens/tokens.css` + `apps/os-web/lib/ui/visual-status.ts`  
**HOSTED VERIFIED:** **NO** (CT3 not on live SHA)

| SEMANTIC USE | REQUESTED | ACTUAL CSS TOKEN / VALUE | WHERE USED (source) | HOSTED VERIFIED |
|---|---|---|---|---|
| Primary action / authority | Navy `#12324A` | `--isalwa-kiln: #18324b` (≈ target; **not literal #12324A**) | primary buttons / kiln authority | NO |
| Active / current | Teal `#2C8C88` | `--isalwa-glaze: #287a78` (≈ target; **not literal #2C8C88**) | selected tab underline `clienteTabActiveClass`, operational accents | NO |
| Selected soft surface | Soft teal `#EAF6F4` | `--isalwa-teal-100: #e2f0ed` → `--isalwa-surface-active` (≈; **not literal #EAF6F4**) | selected tab bg | NO |
| Context / info | Sky `#DDEEF6` | `--isalwa-sky-100: #edf5f8` / `--isalwa-sky-200: #d9eaf2` → `--isalwa-surface-context` | contextual surfaces | NO |
| Confirmed / completed | Soft green `#E7F4EC` | `color-mix(... var(--isalwa-success) #3a7a52 12%, white)` + `--isalwa-tint-green` | certainty confirmed, completed steps | NO |
| Pending / due soon | Amber `#FFF5DB` / `#F6E3A6` | `--isalwa-warning: #b8872e` + `color-mix(...12%, white)` / `--isalwa-tint-amber` / `--isalwa-surface-attention` (**not literal amber hex fills**) | pending certainty, due soon | NO |
| Overdue / error | Soft red `#FBE9E7` | `color-mix(... var(--isalwa-danger) #a63d36 10%, white)` / `--isalwa-tint-red` | overdue | NO |
| Canvas | Porcelain existing | `--isalwa-porcelain: #f6f1e8` → `--isalwa-surface-canvas` | app canvas | NO |
| Work surface | White | `--isalwa-white: #ffffff` → cards/`deskPanelClass` | panels | NO |

## Conformance

**COLOR_SPEC_CONFORMANCE = PARTIAL (token-mapped, not literal hex; hosted unverified).**

Do not claim “colors updated.” Deviations from literal requested hex are intentional reuse of frozen kiln/glaze tokens — listed in `CT3_DEVIATIONS.md`.
