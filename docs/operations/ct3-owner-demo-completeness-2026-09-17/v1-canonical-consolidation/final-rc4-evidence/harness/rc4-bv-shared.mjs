/**
 * RC4-H shared hosted BV helpers — cookie, taxonomy, View As UI, Story Mode, OrderPrep locators.
 */

export const ROLE_PREVIEW_PERSONA_COOKIE = 'isalwa-os-role-preview-persona';
/** RC3 harness typo — cleared on exit for safety. */
export const LEGACY_ROLE_PREVIEW_PERSONA_COOKIE = 'isalwa-role-preview-persona';

export const CHECK_STATUSES = ['PASS', 'PRODUCT_FAIL', 'HARNESS_FAIL', 'BLOCKED', 'UNPROVEN'];

const PERSONA_MENU_LABEL = {
  asesor: 'Asesor',
  'jefe-comercial': 'Jefe comercial',
  gerencia: 'Gerencia',
  produccion: 'Producción',
  almacen: 'Almacén',
  compras: 'Compras',
  finanzas: 'Finanzas',
  entregas: 'Entregas',
};

export const STORY_MODE_DIALOG_LABEL = /Recorrido completo de ISALWA/i;
export const STORY_ADVANCE_BUTTON = /^Siguiente$/i;

/**
 * @param {string} id
 * @param {'PASS'|'PRODUCT_FAIL'|'HARNESS_FAIL'|'BLOCKED'|'UNPROVEN'} status
 * @param {string} [detail]
 * @param {Record<string, unknown>} [extra]
 * @param {{ checks: object[], push?: (row: object) => void }} reportSink
 */
export function check(reportSink, id, status, detail = '', extra = {}) {
  let resolved = status;
  let resolvedDetail = detail;
  if (!CHECK_STATUSES.includes(resolved)) {
    resolved = 'HARNESS_FAIL';
    resolvedDetail = `invalid_status:${status} — ${detail}`;
  }
  const row = { id, status: resolved, detail: String(resolvedDetail).slice(0, 1500), ...extra };
  reportSink.checks.push(row);
  if (reportSink.push) reportSink.push(row);
  console.log(`${String(resolved).padEnd(14)} ${id} — ${String(resolvedDetail).slice(0, 200)}`);
  return row;
}

/**
 * Map assertResourceLoaded result → RC4 taxonomy (never HARNESS_FAIL unless mis-invoked).
 * @param {{ ok: boolean, status: string, reason: string }} result
 */
export function statusFromResourceAssert(result) {
  if (result.ok && result.status === 'PASS') return 'PASS';
  if (/denied_or_error|Application error|missing_resource_id|missing_content_patterns/i.test(result.reason)) {
    return 'PRODUCT_FAIL';
  }
  if (/id_present_without_business_content|missing_customer_name/i.test(result.reason)) {
    return 'PRODUCT_FAIL';
  }
  return 'PRODUCT_FAIL';
}

export function loadPassword(homedir, existsSync, readFileSync, join) {
  const p = join(homedir(), '.isalwa-secrets', 'isalwa-os-staging-admin.password');
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8').trim() || null;
}

export async function dismissOverlays(page) {
  for (let i = 0; i < 10; i++) {
    const welcome = page.locator('[role="dialog"][aria-labelledby="intro-welcome-title"]');
    if ((await welcome.count()) > 0) {
      const skip = page.getByRole('button', { name: /Explorar por mi cuenta/i });
      if ((await skip.count()) > 0) await skip.first().click({ timeout: 4000 }).catch(() => null);
      else await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
    }
    const omitir = page.getByRole('button', { name: /^Omitir$/i });
    if ((await omitir.count()) > 0) await omitir.first().click({ timeout: 3000 }).catch(() => null);
    await page.keyboard.press('Escape').catch(() => null);
    await page.waitForTimeout(120);
  }
}

export async function bodyText(page) {
  return page.locator('body').innerText();
}

export async function demoCookie(page, base) {
  const cookies = await page.context().cookies(base);
  return cookies.find((c) => c.name === 'isalwa-demo-data-mode')?.value || null;
}

export async function clearViewAsPersona(page) {
  const reset = page.getByRole('button', { name: /Volver a vista de evaluaci[oó]n/i });
  if ((await reset.count()) > 0) {
    await reset.first().click({ timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(400);
  }
  await page.evaluate(
    ([canonical, legacy]) => {
      for (const name of [canonical, legacy]) {
        document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
      }
    },
    [ROLE_PREVIEW_PERSONA_COOKIE, LEGACY_ROLE_PREVIEW_PERSONA_COOKIE],
  );
  await page.waitForTimeout(200);
}

/**
 * Prefer shell "Vista de evaluación" menu; fall back to canonical cookie only.
 * @param {import('playwright-core').Page} page
 * @param {string} persona RolePreviewPersonaId
 * @param {{ asesorMemberId?: string | null, forceCookie?: boolean }} [opts]
 */
export async function setViewAsPersona(page, persona, opts = {}) {
  const { asesorMemberId = null, forceCookie = false } = opts;

  if (!forceCookie) {
    const trigger = page.getByRole('button', { name: /Vista de evaluaci[oó]n|Vista previa/i });
    if ((await trigger.count()) > 0) {
      await trigger.first().click({ timeout: 5000 }).catch(() => null);
      await page.waitForTimeout(350);
      let clicked = false;
      if (persona === 'asesor') {
        if (asesorMemberId) {
          const opt = page.getByRole('menuitemradio').filter({ hasText: new RegExp(asesorMemberId, 'i') });
          if ((await opt.count()) > 0) {
            await opt.first().click({ timeout: 5000 });
            clicked = true;
          }
        }
        if (!clicked) {
          const asesorRow = page.getByRole('menuitemradio').filter({ hasText: /^Asesor ·/i });
          if ((await asesorRow.count()) > 0) {
            await asesorRow.first().click({ timeout: 5000 });
            clicked = true;
          } else {
            const plain = page.getByRole('menuitemradio', { name: /^Asesor$/i });
            if ((await plain.count()) > 0) {
              await plain.first().click({ timeout: 5000 });
              clicked = true;
            }
          }
        }
      } else {
        const label = PERSONA_MENU_LABEL[persona] ?? persona;
        const item = page.getByRole('menuitemradio', { name: new RegExp(`^${label}$`, 'i') });
        if ((await item.count()) > 0) {
          await item.first().click({ timeout: 5000 });
          clicked = true;
        }
      }
      if (clicked) {
        await page.waitForTimeout(500);
        const cookies = await page.context().cookies();
        const canonical = cookies.find((c) => c.name === ROLE_PREVIEW_PERSONA_COOKIE);
        if (canonical?.value) {
          return { ok: true, method: 'ui', cookieValue: canonical.value };
        }
      }
      await page.keyboard.press('Escape').catch(() => null);
    }
  }

  await page.evaluate(
    ({ cookieName, p }) => {
      document.cookie = `${cookieName}=${encodeURIComponent(p)}; path=/; max-age=86400; SameSite=Lax`;
    },
    { cookieName: ROLE_PREVIEW_PERSONA_COOKIE, p: persona },
  );
  return { ok: true, method: 'cookie' };
}

/** OrderPrep: three sections share button label "Solicitar revisión" — scope by section kicker. */
export async function countOrderPrepReviewButtons(page) {
  const sections = [
    { key: 'production', title: /^PRODUCCIÓN$/i },
    { key: 'warehouse', title: /^ALMACÉN$/i },
    { key: 'purchasing', title: /^COMPRAS$/i },
  ];
  const counts = {};
  for (const { key, title } of sections) {
    const section = page.locator('li').filter({ has: page.locator('p.isalwa-section-label').filter({ hasText: title }) });
    const btn = section.getByRole('button', { name: /^Solicitar revisión$/i });
    counts[key] = await btn.count();
  }
  return counts;
}

/**
 * Story Mode smoke — open overlay and advance via footer "Siguiente".
 * @param {import('playwright-core').Page} page
 * @param {number} [maxAdvances]
 */
export async function smokeStoryModeAdvance(page, maxAdvances = 5) {
  const openBtn = page.getByRole('button', { name: /Ver recorrido completo/i });
  const openCount = await openBtn.count();
  if (openCount === 0) {
    return { opened: false, advanced: 0, harnessFail: 'missing Ver recorrido completo' };
  }
  await openBtn.first().click({ timeout: 8000 });
  await page.waitForTimeout(400);
  const dialog = page.getByRole('dialog', { name: STORY_MODE_DIALOG_LABEL });
  if ((await dialog.count()) === 0) {
    return { opened: false, advanced: 0, harnessFail: 'story dialog not visible after open' };
  }
  let advanced = 0;
  for (let i = 0; i < maxAdvances; i++) {
    const progress = dialog.getByText(/Paso \d+ de \d+/i).first();
    const before = (await progress.count()) > 0 ? await progress.innerText() : '';
    const next = dialog.getByRole('button', { name: STORY_ADVANCE_BUTTON });
    if ((await next.count()) === 0) break;
    if (await next.isDisabled()) break;
    await next.click({ timeout: 5000 });
    await page.waitForTimeout(350);
    const after = (await progress.count()) > 0 ? await progress.innerText() : '';
    if (before && after && before !== after) advanced += 1;
  }
  return { opened: true, advanced, harnessFail: null };
}

export async function login(page, base, email, password, dismiss) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 45000 });
      await page.fill('input[type="email"], input[name="email"]', email);
      await page.fill('input[type="password"], input[name="password"]', password);
      await Promise.all([
        page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 90000 }).catch(() => null),
        page.click('button[type="submit"]'),
      ]);
      await page.waitForTimeout(2000);
      await dismiss(page);
      if (!page.url().includes('/login')) return { ok: true };
    } catch {
      await page.waitForTimeout(2500 * attempt);
    }
  }
  return { ok: !page.url().includes('/login') };
}

export async function gotoDemo(page, base, path, dismiss) {
  const sep = path.includes('?') ? '&' : '?';
  const url = path.startsWith('http') ? path : `${base}${path}${sep}datos=demo`;
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await dismiss(page);
  await page.waitForTimeout(600);
  return resp;
}
