/**
 * RC3+ hosted BV — refuse chrome-only PASS on AccessDenied / shell vocabulary.
 *
 * Prefer `page.locator('main')` over raw body; still apply denial gates because
 * AccessDeniedState renders inside main while breadcrumbs stay in chrome.
 *
 * @typedef {'pedido'|'quote'|'cliente'|'opportunity'|'approval'|'conversation'|'document'|'history'|'audit'|'work'} ResourceKind
 *
 * @typedef {{
 *   kind: ResourceKind,
 *   id: string | RegExp,
 *   customerName?: string | RegExp,
 *   contentPatterns?: Array<string | RegExp>,
 *   denyPatterns?: Array<string | RegExp>,
 *   scope?: 'main' | 'body',
 * }} AssertResourceOptions
 *
 * @typedef {{
 *   ok: boolean,
 *   status: 'PASS' | 'FAIL' | 'PARTIAL',
 *   reason: string,
 *   kind: ResourceKind,
 *   textSample: string,
 * }} AssertResourceResult
 */

export const ACCESS_DENIED_RE =
  /Sin permiso para esta secci[oó]n|Sin permiso\b|AccessDenied|no tiene permiso|Acceso denegado|forbidden|unauthorized|401\b|403\b/i;

export const ERROR_BOUNDARY_RE =
  /Application error|Something went wrong|Unhandled Runtime Error|This page couldn.?t load/i;

export const DEFAULT_DENY_PATTERNS = [ACCESS_DENIED_RE, ERROR_BOUNDARY_RE];

/** Shell-only labels that must never alone prove resource content. */
export const SHELL_VOCAB_ONLY_RE =
  /\b(Clientes|Cliente|Pedidos|Pedido|Cotizaciones|Cotizaci[oó]n|Documentos|Historial|Conversaciones|Aprobaciones|Auditor[ií]a|Trabajo)\b/i;

/**
 * @param {string | RegExp} value
 * @returns {RegExp}
 */
export function toRegExp(value) {
  if (value instanceof RegExp) return value;
  const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
}

/**
 * @param {import('playwright-core').Page | import('playwright').Page} page
 * @param {'main' | 'body'} [scope='main']
 */
export async function readScopedText(page, scope = 'main') {
  if (scope === 'body') {
    return page.locator('body').innerText();
  }
  const main = page.locator('main').first();
  if ((await main.count()) > 0) {
    return main.innerText();
  }
  return page.locator('body').innerText();
}

/**
 * Sync denial + anchor check against already-captured text.
 * Requires resource id AND at least one content pattern when contentPatterns provided;
 * when contentPatterns omitted, requires id AND (customerName OR non-empty business hint via id alone is FAIL).
 *
 * Contract: id is always required. contentPatterns (business content) is required for PASS.
 *
 * @param {string} text
 * @param {AssertResourceOptions} opts
 * @returns {AssertResourceResult}
 */
export function evaluateResourceLoaded(text, opts) {
  const kind = opts.kind;
  const sample = String(text ?? '').slice(0, 400);
  const denyList = [...DEFAULT_DENY_PATTERNS, ...(opts.denyPatterns ?? []).map(toRegExp)];

  for (const re of denyList) {
    if (re.test(text)) {
      return {
        ok: false,
        status: 'FAIL',
        reason: `denied_or_error:${re.source.slice(0, 80)}`,
        kind,
        textSample: sample,
      };
    }
  }

  if (opts.id == null || opts.id === '') {
    return {
      ok: false,
      status: 'FAIL',
      reason: 'missing_id_option',
      kind,
      textSample: sample,
    };
  }

  const idRe = toRegExp(opts.id);
  if (!idRe.test(text)) {
    return {
      ok: false,
      status: 'FAIL',
      reason: 'missing_resource_id',
      kind,
      textSample: sample,
    };
  }

  if (opts.customerName != null && opts.customerName !== '') {
    const nameRe = toRegExp(opts.customerName);
    if (!nameRe.test(text)) {
      return {
        ok: false,
        status: 'FAIL',
        reason: 'missing_customer_name',
        kind,
        textSample: sample,
      };
    }
  }

  const contentPatterns = opts.contentPatterns ?? [];
  if (contentPatterns.length === 0) {
    return {
      ok: false,
      status: 'FAIL',
      reason: 'missing_content_patterns',
      kind,
      textSample: sample,
    };
  }

  const matched = contentPatterns.some((p) => toRegExp(p).test(text));
  if (!matched) {
    return {
      ok: false,
      status: 'PARTIAL',
      reason: 'id_present_without_business_content',
      kind,
      textSample: sample,
    };
  }

  // Guard: id matched only via accidental shell word if id was too soft (caller responsibility).
  return {
    ok: true,
    status: 'PASS',
    reason: 'anchored_id_and_content',
    kind,
    textSample: sample,
  };
}

/**
 * Playwright-facing helper. FAILS on AccessDenied / Sin permiso / forbidden /
 * unauthorized / error boundary. Requires resource id + business content.
 *
 * @param {import('playwright-core').Page | import('playwright').Page} page
 * @param {AssertResourceOptions} opts
 * @returns {Promise<AssertResourceResult>}
 */
export async function assertResourceLoaded(page, opts) {
  const text = await readScopedText(page, opts.scope ?? 'main');
  return evaluateResourceLoaded(text, opts);
}

/**
 * Convenience: map AssertResourceResult → harness check status string.
 * @param {AssertResourceResult} result
 */
export function statusFromAssert(result) {
  return result.status;
}
