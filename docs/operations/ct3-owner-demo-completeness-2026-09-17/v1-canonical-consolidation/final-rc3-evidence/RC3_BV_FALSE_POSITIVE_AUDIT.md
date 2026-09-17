# RC3 — Hosted BV / Playwright false-positive audit

**As of:** 2026-09-17  
**Scope:** Read-only audit of hosted BV assertion anti-patterns where `PASS` can fire on shell chrome (breadcrumb, sidebar, tab labels, `PageContainer`/`aria-label` vocabulary) while the main surface is `AccessDeniedState` / forbidden / empty.  
**Does not rewrite:** RC2 receipts under `final-rc2-evidence-8a153a4/`.  
**Confirmed hosted incident (RC2):** `pedido_maderas PASS` while Carmen owner on Maderas pedido `01M2PMA280…` rendered API `forbidden` → `AccessDeniedState` — matched breadcrumb **Pedido**.

---

## Why chrome fools `body.innerText()` checks

Authenticated app chrome always injects employee vocabulary into `document.body` text:

| Chrome source | File | Labels that match soft regexes |
|---|---|---|
| Path-derived breadcrumbs | `apps/os-web/lib/navigation/breadcrumbs.ts` L94–140; `shell-breadcrumbs.tsx` | `/clientes/:id` → **Cliente**; `/…/cotizaciones/:id` → **Cotización**; `/…/pedidos/:id` → **Pedido** (even when body is AccessDenied) |
| Forbidden pedido shell | `apps/os-web/app/(app)/clientes/[partyId]/pedidos/[orderId]/page.tsx` L73–75, L580–584 | `<PageContainer label="Pedido">` + `<AccessDeniedState />` |
| Forbidden quote (View As) | `…/cotizaciones/[quoteId]/page.tsx` L71–75 | `<PageContainer label="Cotización">` + AccessDenied |
| Forbidden cliente (View As) | `…/clientes/[partyId]/page.tsx` L127–131 | frame label **Cliente** + AccessDenied |
| AccessDenied copy | `apps/os-web/components/states/app-states.tsx` L74–92; `lib/i18n/es.ts` L59–61 | **Sin permiso** / **Sin permiso para esta sección** — does **not** remove breadcrumbs or sidebar |
| Sidebar / nav i18n | `lib/i18n/es.ts` (`nav.clientes`, `pedidos`, `cotizaciones`, `conversaciones`, `aprobaciones`, `auditoria`) | **Clientes**, **Pedidos**, **Cotizaciones**, **Conversaciones**, **Aprobaciones**, **Auditoría** on every authenticated page |
| Cliente360 tab strip | `lib/cliente/nav-sections.ts` | **Documentos**, **Historial**, **Comercial**, … when 360 loads (even empty tab panel) |

**Anti-pattern class:** `/(Pedido|Cliente|Cotizaci|Documento|Historial|Conversaci|Aprobaci|Auditor)/i.test(await page.locator('body').innerText())` without requiring resource ID / client name / business content and without forbidding AccessDenied.

---

## Required proof contract (RC3+)

A resource surface check may `PASS` only if **all** hold:

1. **Positive business anchor** — at least one of: resource number (`O-000002`, `Q-000002`), ULID in main content, or exact client display name (`DEMO MADERAS` / seeded name).
2. **Business content** — lifecycle / dossier / lines / next-step / document affordance that is **not** nav-only (e.g. order number in hero, lifecycle strip, quote lines).
3. **Negative chrome gate** — body must **not** match AccessDenied / forbidden vocabulary (see helper below).
4. Prefer scoping to `main[aria-label]` / role=`status` exclusion rather than raw `body`.

`PARTIAL` is allowed when UI is present but mutation depth is unproven. `PASS` on chrome-only is not.

---

## Risky assertions (by file)

### A. `/tmp/rc2-hosted-bv.mjs` (primary RC2 pack)

| Check id | Approx. lines | Assertion | Why false positive | Required replacement proof |
|---|---|---|---|---|
| `pedido_maderas` | ~314–317 | `/O-000002\|Pedido/` **and** `/MADERAS\|Nota de Entrega\|Preparaci/` | Left OR accepts breadcrumb **Pedido**. Right OR can still match if demo banner / residual chrome mentions MADERAS or prep words elsewhere; **does not forbid AccessDenied**. RC2 confirmed PASS-on-denied for related resume/finish variants. | Require `/O-000002/` (or order ULID) **and** `/DEMO\s+MADERAS\|MADERAS ORIENTE/` in `main`, **and** `assertResourceLoaded` (no AccessDenied). Do **not** accept bare `/Pedido/`. |
| `postsale_pedido_surface` | ~631–634 | `/Pedido\|Preparaci\|Nota de Entrega\|Salida\|Entrega/` | Single `/Pedido/` match → PASS on AccessDenied breadcrumb. | Same as pedido detail: order number + client name + lifecycle strip labels **inside** main; fail if AccessDenied. |
| `progress_vocabulary` | ~319–326 | Requires Cotización+Pedido+Preparación+Nota+Salida+Entrega | On AccessDenied usually PARTIAL (good), but breadcrumb Pedido/Cotización inflate partial confidence; can PASS if denied page somehow still shows strip from cached layout. | Gate with `assertResourceLoaded`; require labels inside lifecycle region / `[data-testid]` if present, not whole body. |
| `cliente360_tab_*` | ~292–299 | `!Cliente no disponible` + `/MADERAS\|Q-000002\|O-000002\|Cotizaci\|Pedido\|Documento\|Historial\|Actividad/` | Tab strip always emits **Documentos** / **Historial**; soft Cotizaci/Pedido match nav/breadcrumb without row content. | Per-tab: named client + tab-specific record (e.g. comercial → `Q-000002` or opportunity title; documentos → PDF/link href; historial → event verb + timestamp). Fail AccessDenied. |
| `quote_maderas` | ~306–309 | `/Q-000002\|Cotizaci/` && `/MADERAS/` | Breadcrumb **Cotización** satisfies left OR without quote number. | Require `Q-000002` (or quote ULID) + client name; no AccessDenied. |
| `quote_pdf_control` | ~601 | PDF button count **or** `/PDF\|Documento/` | **Documento** matches nav/tab chrome. | Require visible PDF control role/name (`Descargar PDF` / `Ver PDF`) or `a[href*="/pdf"]`; ignore bare Documento. |
| `quote_next_actions_visible` | ~602–603 | `/Registrar como enviada\|enviada\|Seguimiento\|Convertir a Pedido\|Aprobaci/` | **Aprobaci** matches sidebar **Aprobaciones**. | Require quote-scoped CTA (`getByRole('button', …)`) or copy in quote main; exclude nav. |
| `approval_does_not_auto_create_pedido_cue` | ~607–610 | `/no crea un pedido\|…\|Convertir a Pedido/` **or** convert button | Soft; less chrome-FP than Pedido-alone, but body scan can hit unrelated copy. | Prefer button count / exact quote cue string in main. |
| `historial_maderas` | ~728–730 | `/Historial\|Actividad\|evento\|camb/` **or** `text.length > 100` | Tab label **Historial** alone PASSes; length>100 always true on any shell page. | Require timeline event content (actor verb + time) for party; no AccessDenied; length gate alone = invalid. |
| `auditoria_desk` | ~731–733 | `!Application error` | AccessDenied / empty desk still PASS. | Require audit list row or empty-state **copy for audit**, plus `!AccessDenied`; or explicit exclusion message when View As. |
| `conversaciones_desk` | ~745–749 | `!Application error` | Nav **Conversaciones** + empty shell PASSes. | Require thread list / empty inbox copy / selected conversation party name; no AccessDenied. |
| `produccion_desk` / `almacen_desk` | ~641–647 | `!Application error` | Same class — load ≠ authorized business desk. | Desk-specific vocabulary + capability cue; fail AccessDenied / evaluation exclusion when expected to work. |
| `neg_asesor_audit_desk` | ~738–741 | `/no está disponible\|…\|deneg/` | If exclusion copy missing, **does not** require absence of audit rows; soft PARTIAL. Related finish script uses `/Auditor/` (see below) — worse. | PASS only if exclusion banner **and** zero audit row links; FAIL if audit table visible. |
| `neg_produccion_quote_direct` | ~700–706 | deny cues **or** `!Convertir a Pedido` | Absence of convert CTA ≠ denied quote (AccessDenied still has Cotización breadcrumb and can PASS via soft branch). | Require AccessDenied **or** evaluation exclusion copy; optionally assert no quote number / lines. |
| `mobile_pedido` (mobile pack) | ~757+ | `!Application error` | AccessDenied pedido still PASS. | Same hardened pedido proof at mobile viewport. |
| `pedidos_index_maderas` | ~331–334 | `/O-000002\|MADERAS/` | Relatively stronger if list empty and names absent; still can match sidebar/search residue. Prefer list row. | Require list row link containing order number or party name. |

### B. `/tmp/rc2-hosted-bv-resume.mjs` / `/tmp/rc2-hosted-bv-finish.mjs`

| Check id | Approx. lines | Assertion | Why false positive | Required replacement proof |
|---|---|---|---|---|
| `pedido_maderas` | resume ~158–161; finish ~162–165 | **`/O-000002\|Pedido/` only** | **Confirmed anti-pattern.** Breadcrumb **Pedido** on AccessDenied → PASS. | Order number **or** ULID + client name + `assertResourceLoaded`. |
| `postsale_pedido_surface` | finish ~356–359 | `/Pedido\|Preparaci\|Nota…/` | Same as main pack. | Hardened pedido surface proof. |
| `progress_vocabulary` | resume/finish ~163–170 | multi-label body scan | Same caveats as main. | Scoped lifecycle region + denial gate. |
| `historial_maderas` | finish ~420–421 | **hardcoded `PASS`** after goto | URL navigation alone; no content, no denial check. | Timeline business content + no AccessDenied. |
| `auditoria_desk` | finish ~422–423 | **hardcoded `PASS`** | Same. | Audit rows or intentional empty + auth gate. |
| `conversaciones_desk` | finish ~424–426 | **hardcoded `PASS`** | Same. | Conversation business content. |
| `gerencia_lens` | finish ~427–429 | **hardcoded `PASS`** | Same class. | Gerencia metrics/copy present; no error/denied. |
| `produccion_desk` / `almacen_desk` | finish ~361–364 | **hardcoded `PASS`** | Same. | Desk content proof. |
| `neg_ops_audit_desk` | finish ~413–416 | `/…\|deneg\|Auditor/` | **`/Auditor/` matches sidebar Auditoría** while Production View As on `/auditoria` — can PASS without proving exclusion. | Require exclusion banner; **forbid** treating bare Auditoría nav as proof. |
| `mobile_pedido` | finish ~437–442 | `!Application error` | AccessDenied still PASS. | Hardened pedido proof. |
| `cliente360_comercial_has_records` | resume/finish ~150–157 | `/Q-000002\|oportunidad\|Cotizaci/` | Soft **Cotizaci** / oportunidad without requiring seeded quote when chrome/tabs present. | Prefer `Q-000002` or named opportunity row. |
| `quote_next_actions_visible` | finish ~346–349 | `/enviad\|Seguimiento\|Convertir\|Aprobaci\|PDF/` | **Aprobaci** / PDF chrome. | Quote-main CTAs only. |
| `approval_does_not_auto_create_pedido_cue` | finish ~327–331 | `/…\|Aprobaci/` | Sidebar Aprobaciones. | Explicit convert/copy in quote main. |
| `postsale_dn_affordance` | finish ~372 | `/Nota/` on **entregas** body | Extremely soft; any “Nota” substring. | DN create/link role or `Nota de Entrega` exact phrase in desk main. |

### C. `docs/operations/ct3-owner-demo-completeness-2026-09-17/oa7-owner-path-bv.mjs`

| Check id | Approx. lines | Assertion | Why false positive | Required replacement proof |
|---|---|---|---|---|
| `pedido_detail_maderas` (`CROSS_PAGE_COHERENCE`) | ~489–494 | `/O-000002\|Pedido/` && `!CLIENTE_UNAVAILABLE_RE` | Breadcrumb **Pedido**; `CLIENTE_UNAVAILABLE_RE` does **not** catch AccessDenied (“Sin permiso…”). | Order number + client name + deny AccessDenied/Sin permiso. |
| `quote_visible` | ~458–465 | `/Q-000002\|Cotizaci[oó]n/` && `!CLIENTE_UNAVAILABLE` | Breadcrumb **Cotización** without quote id. | Require `Q-000002` + no AccessDenied. |
| Conversaciones domain | ~581–582 | `countDemoNames > 0` **or** `/Conversaci/` | Sidebar **Conversaciones** alone PASSes. | Demo party/thread title or empty-inbox copy scoped to workspace main. |

### D. `docs/operations/ct3-owner-demo-completeness-2026-09-17/carmen-owner-bv-post-scope.mjs`

| Check id | Approx. lines | Assertion | Why false positive | Required replacement proof |
|---|---|---|---|---|
| `cliente360_demo_open_read` | ~592–595 | `/cliente\|oportunidad\|cotizaci\|pedido/i` **or** demo name hits | Breadcrumb **Cliente** + nav **Clientes/Cotizaciones/Pedidos** → PASS without named client content. | Prefer `c360Demo >= 1` (DEMO markers) **required**; drop bare cliente/pedido ORs, or AND with markers + no AccessDenied. |
| Nav availability map | ~425–427 | `navAvailable(body, [/Clientes\|Cotizaciones\|Conversaciones/])` | Intentionally chrome — OK if labeled as **nav presence**, not domain content. | Keep as nav-only evidence; never roll into DOMAIN_CONTENT PASS. |

### E. `docs/operations/ct3-owner-demo-completeness-2026-09-17/pf8-delta-bv.mjs`

| Check id | Approx. lines | Assertion | Why false positive | Required replacement proof |
|---|---|---|---|---|
| `coherence_pedido` | ~253–256 | `/O-000002\|01M2PMA280…/` **and** `/DEMO MADERAS/` | **Relatively hardened** (good pattern). Still missing explicit AccessDenied gate (denied page unlikely to show both anchors). | Add `assertResourceLoaded`; keep ID + client name AND. |
| `coherence_quote` | ~235–238 | quote id/number **and** DEMO MADERAS | Same — good baseline. | Add denial gate. |
| `coherence_docs` | ~266–269 | `/Ver PDF\|Descargar\|Cotizaci\|Nota/` | Soft Cotizaci/Nota can match tab/nav without PDF href. | Require `a[href*="/pdf"]` or Ver/Descargar PDF control. |

### F. `docs/operations/final-pre-pilot-2026-09-16/master-close-hosted-bv.mjs`

| Check / field | Approx. lines | Assertion | Why false positive | Required replacement proof |
|---|---|---|---|---|
| `walk.cliente360Documentos` | ~373 | `/Documentos\|PDF\|Cotización\|Nota de entrega/` | Tab label **Documentos** alone. | PDF href or document row. |
| `walk.cliente360Historial` | ~375 | `/Historial\|registró\|creó/` | Tab **Historial** alone. | Event verb + subject. |
| `walk.asesorCliente360` tabs | ~400–402 | `/Documentos/`, `/Historial/` | Tab chrome = “tab exists”, not content. | Separate “tab chrome” vs “tab content” scores. |
| `walk.asesorCliente360.comercial` | ~403 | `/Oportunidad\|Cotizaci\|Pedido/` | Soft vocabulary. | Seeded IDs / row titles. |
| `walk.pedidoDossier` | ~418–423 | `accessible: !/Sin permiso/`; `sourceQuote`/`documents`/`timeline` soft regexes | Accessible gate is good; soft fields can still match breadcrumb Cotización / Documentos without dossier. | For each subfield require ID or role-scoped content **and** keep Sin permiso fail. |
| `walk.search.order` | ~436 | `/Pedido\|O-000001/` | Palette chrome kind label **Pedido** without hit. | Require `O-000001` (or result row). |
| `walk.search.client` / `.quote` | ~432, ~440 | `/Cliente\|…/` / `/Cotizaci\|Q-…/` | Kind labels in palette. | Require display name / `Q-` number in result. |
| Almacén context cues | ~232, ~278 | `/…\|Cliente/` && `/Pedido\|…/` | Generic chrome words. | Prefer `O-000001` / SYNTH name. |

### G. Other ops BV harnesses (lower RC3 priority; same class)

| File | Pattern | Risk |
|---|---|---|
| `docs/operations/final-pre-pilot-2026-09-16/loop-visual-bv.mjs` ~76–108 | `/Pedido\s+\d+/`, `/PEDIDO/` with stronger companions | Mostly OK when AND’d with specific copy; avoid bare Pedido. |
| `docs/operations/final-pre-pilot-2026-09-16/operating-loop-hosted-bv.mjs` | Role buttons with **Convertir a pedido** | Low FP (role-scoped). |
| `docs/operations/final-pre-pilot-2026-09-16/entregas-ops-hosted-bv.mjs` / `operating-loop-bv-delivery-focus.mjs` | Mostly action-button oriented | Lower chrome risk. |
| `docs/operations/ct3-owner-demo-completeness-2026-09-17/ct3-residual-bv.mjs` | body text used; review before reuse | Treat as untrusted until hardened. |

### H. `apps/` Playwright / e2e

No dedicated hosted BV `*.mjs` under `apps/` matched this audit sweep. Unit/source-lock tests that `assert.match(…, /AccessDeniedState/)` on **source** are fine (not browser body). Do not confuse with hosted BV.

---

## AccessDenied patterns tests must treat as FAIL for “resource loaded”

When proving Cliente / Quote / Pedido / Approval / Conversation / Documento / Audit / History **content**:

| Signal | Where | Treat as |
|---|---|---|
| `Sin permiso para esta sección` / `Sin permiso` pill | `AccessDeniedState` | **FAIL** resource PASS |
| `role="status"` AccessDenied empty state | `app-states.tsx` | **FAIL** |
| Breadcrumb-only **Pedido** / **Cotización** / **Cliente** | `breadcrumbs.ts` | **insufficient** |
| Sidebar nav labels alone | `es.ts` nav.* | **insufficient** |
| Cliente360 tab labels alone | `nav-sections.ts` | **insufficient** for tab content |
| `!Application error` / hardcoded PASS after `goto` | finish harness | **insufficient** |
| `CLIENTE_UNAVAILABLE_RE` only | oa7 | **incomplete** — misses AccessDenied |

---

## Draft hardened helper (doc-only; not shipped)

```js
/** RC3+ hosted BV — refuse chrome-only PASS */
const ACCESS_DENIED_RE =
  /Sin permiso para esta secci[oó]n|Sin permiso\b|AccessDenied|no tiene permiso|Acceso denegado/i;

const SHELL_VOCAB_ONLY_RE =
  /\b(Clientes|Cliente|Pedidos|Pedido|Cotizaciones|Cotizaci[oó]n|Documentos|Historial|Conversaciones|Aprobaciones|Auditor[ií]a)\b/i;

/**
 * @param {string} text body or prefer main innerText
 * @param {{
 *   resourceId?: RegExp,      // O-000002 | Q-000002 | ULID
 *   clientName?: RegExp,      // DEMO MADERAS
 *   businessContent?: RegExp, // lifecycle / lines / event verb
 * }} anchors
 */
function assertResourceLoaded(text, anchors = {}) {
  if (ACCESS_DENIED_RE.test(text)) {
    return { ok: false, status: 'FAIL', reason: 'access_denied_chrome' };
  }
  const hasId = anchors.resourceId ? anchors.resourceId.test(text) : false;
  const hasClient = anchors.clientName ? anchors.clientName.test(text) : false;
  const hasBiz = anchors.businessContent ? anchors.businessContent.test(text) : false;
  if (!hasId && !hasClient) {
    return { ok: false, status: 'FAIL', reason: 'missing_resource_or_client_anchor' };
  }
  if (anchors.businessContent && !hasBiz) {
    return { ok: false, status: 'PARTIAL', reason: 'anchor_without_business_content' };
  }
  // Optional: if ONLY shell vocab matched and no id — already failed above
  return { ok: true, status: 'PASS', reason: 'anchored' };
}

// Example: Maderas pedido
// assertResourceLoaded(mainText, {
//   resourceId: /O-000002|01M2PMA280KX4AAV7049YKNE07/,
//   clientName: /DEMO\s+MADERAS|MADERAS\s+ORIENTE/,
//   businessContent: /Preparaci[oó]n|Nota de Entrega|Registrado|L[ií]neas/,
// });
```

Prefer `page.locator('main').innerText()` over `body` to reduce sidebar hits; still apply `ACCESS_DENIED_RE` because AccessDenied renders inside `main`.

---

## Priority for RC3 BV rewrite

1. **P0** — Any `pedido_*` / `postsale_pedido_*` using `/Pedido/` without order id (resume/finish + oa7 + main OR-branch).  
2. **P0** — Finish harness hardcoded `PASS` after goto (historial / auditoria / conversaciones / desks).  
3. **P1** — Quote `/Cotizaci/` without `Q-…`; Cliente360 tab Documentos/Historial chrome; conversaciones `/Conversaci/`.  
4. **P1** — Negative desks matching `/Auditor/` nav.  
5. **P2** — Soft Aprobaci/PDF/Documento body scans; master-close tab-only scores.

---

## Audit verdict

| Claim | Status |
|---|---|
| RC2 `pedido_maderas` false positive mechanism identified | **YES** — breadcrumb **Pedido** (+ resume/finish regex weaker than main) |
| Soft vocabulary PASS still widespread in `/tmp/rc2-hosted-bv*.mjs` | **YES** |
| oa7 / carmen-owner / master-close share class | **YES** |
| pf8 pedido/quote coherence mostly ID+name (better) | **YES** — still add denial gate |
| apps/ hosted BV scripts | **None found** in this sweep |
| RC2 receipts rewritten | **NO** (by design) |

**HOSTED_PROVEN** for FULL_POST_SALE / pedido detail must remain **NO** until a harness using the proof contract above PASSes against the known forbidden pedido URL (negative) and an authorized pedido URL (positive).
