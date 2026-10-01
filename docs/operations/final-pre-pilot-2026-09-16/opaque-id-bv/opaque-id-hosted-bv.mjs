/**
 * Hosted BV: opaque-ID fix surfaces — carmen.staging READ-SAFE.
 * Checks /finanzas, /produccion, /mensajes. No writes. Secret-safe.
 */
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('/Users/carmen/projects/isalwa/.tmp/pw-agent4/package.json');
const { chromium } = require('playwright-core');

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://os-web-staging.onrender.com';
const EMAIL = 'carmen.staging@isalwa.demo';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT_DIR = __dirname;
const REPORT = join(OUT_DIR, 'opaque-id-bv.json');
const EXPECTED_SHA = 'e9a7a02b5a2e2105e7f4c756e0bfd20b17fe7fed';

mkdirSync(OUT_DIR, { recursive: true });

function loadPassword(email) {
  const secretsDir = join(homedir(), '.isalwa-secrets');
  for (const name of [
    'isalwa-os-staging-wave-b-issue-memory-passwords.json',
    'isalwa-os-staging-wave-a-continuity-passwords.json',
    'isalwa-os-staging-wave2-role-passwords.json',
  ]) {
    const path = join(secretsDir, name);
    if (!existsSync(path)) continue;
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    if (raw[email]) return typeof raw[email] === 'string' ? raw[email] : raw[email].password;
    if (raw.passwords?.[email]) return raw.passwords[email];
  }
  if (email.startsWith('carmen.')) {
    const p = join(secretsDir, 'isalwa-os-staging-admin.password');
    if (existsSync(p)) return readFileSync(p, 'utf8').trim();
  }
  return null;
}

function norm(text) {
  return text.replace(/\s+/g, ' ').trim();
}

async function main() {
  const password = loadPassword(EMAIL);
  if (!password) {
    writeFileSync(REPORT, JSON.stringify({ ok: false, error: 'PASSWORD_MISSING' }, null, 2));
    process.exit(1);
  }

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const results = {
    email: EMAIL,
    base: BASE,
    expectedSha: EXPECTED_SHA,
    at: new Date().toISOString(),
    surfaces: {},
  };

  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.fill('input[type="email"], input[name="email"]', EMAIL);
    await page.fill('input[type="password"], input[name="password"]', password);
    await Promise.all([
      page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 60000 }).catch(() => null),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForTimeout(1500);
    results.loginUrl = page.url();
    results.loginOk = !page.url().includes('/login');

    /** Dismiss welcome/tour until gone. Prefer Explorar / Omitir, else Escape. */
    async function dismissWelcome() {
      for (let i = 0; i < 8; i++) {
        const dismissBtn = page
          .getByRole('button', { name: /Explorar por mi cuenta|Omitir/i })
          .first();
        const btnVisible =
          (await dismissBtn.count()) > 0 &&
          (await dismissBtn.isVisible().catch(() => false));
        if (btnVisible) {
          await dismissBtn.click({ timeout: 3000 }).catch(() => null);
          await page.waitForTimeout(400);
          continue;
        }
        const tourCopy = page.getByText(/RECORRIDO\s*·/i);
        const dialogish = page.locator('[role="dialog"]');
        const stillTour =
          ((await tourCopy.count()) > 0 &&
            (await tourCopy.first().isVisible().catch(() => false))) ||
          ((await dialogish.count()) > 0 &&
            (await dialogish.first().isVisible().catch(() => false)));
        if (!stillTour) break;
        await page.keyboard.press('Escape').catch(() => null);
        await page.waitForTimeout(300);
      }
      const explore = page.getByRole('button', { name: /Explorar por mi cuenta/i });
      const omitir = page.getByRole('button', { name: /^Omitir$/i });
      const tour = page.getByText(/RECORRIDO\s*·/i);
      const exploreGone = !(
        (await explore.count()) > 0 && (await explore.first().isVisible().catch(() => false))
      );
      const omitirGone = !(
        (await omitir.count()) > 0 && (await omitir.first().isVisible().catch(() => false))
      );
      const tourGone = !(
        (await tour.count()) > 0 && (await tour.first().isVisible().catch(() => false))
      );
      return exploreGone && omitirGone && tourGone;
    }

    results.welcomeDismissedAfterLogin = await dismissWelcome();

    // --- /finanzas ---
    await page.goto(`${BASE}/finanzas`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2500);
    const finWelcomeGone = await dismissWelcome();
    const finBody = await page.locator('body').innerText();
    const hasIdentificadorLabel = /\bIdentificador\b/i.test(finBody);
    const hasEtiquetaLabel = /\bEtiqueta\b/i.test(finBody);
    const hasSubjectTypeSelect = (await page.locator('#finance-subject-type').count()) > 0;
    const hasOrderSearchableSelect = (await page.locator('#finance-subject-order').count()) > 0;
    const hasHonestEmptyOrders =
      /No hay pedidos abiertos autorizados para vincular/i.test(finBody);
    const orderSubjectOk = hasOrderSearchableSelect || hasHonestEmptyOrders;

    // Switch to party to assert typeahead mounts (empty order catalog hides SearchableSelect)
    const typeSelect = page.locator('#finance-subject-type');
    let partyTypeaheadVisible = false;
    let partyPlaceholder = null;
    if (hasSubjectTypeSelect) {
      await typeSelect.selectOption('party');
      await page.waitForTimeout(800);
      partyTypeaheadVisible = (await page.locator('#finance-subject-party').count()) > 0;
      partyPlaceholder = await page
        .locator('#finance-subject-party')
        .getAttribute('placeholder')
        .catch(() => null);
    }

    const finShot = join(OUT_DIR, 'finanzas-1440.png');
    await page.screenshot({ path: finShot, fullPage: false });

    const finPass =
      results.loginOk &&
      !hasIdentificadorLabel &&
      !hasEtiquetaLabel &&
      hasSubjectTypeSelect &&
      orderSubjectOk &&
      partyTypeaheadVisible;

    results.surfaces.finanzas = {
      path: '/finanzas',
      finalUrl: page.url(),
      verdict: finPass ? 'PASS' : 'FAIL',
      welcomeDismissed: finWelcomeGone,
      noFreeTextIdentificador: !hasIdentificadorLabel,
      noFreeTextEtiqueta: !hasEtiquetaLabel,
      hasSubjectTypeSelect,
      hasOrderSearchableSelect,
      hasHonestEmptyOrders,
      orderSubjectOk,
      partyTypeaheadVisible,
      partyPlaceholder,
      bodySnippet: norm(finBody).slice(0, 600),
      shot: finShot,
    };

    // --- /produccion ---
    await page.goto(`${BASE}/produccion`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    const prodWelcomeGone = await dismissWelcome();
    const prodBody = await page.locator('body').innerText();
    const prodShot = join(OUT_DIR, 'produccion-1440.png');
    await page.screenshot({ path: prodShot, fullPage: false });

    const hasRawIdLabel = /Identificador de producto/i.test(prodBody);
    const hasCatalogSearch = /Buscar producto|Seleccione un producto del catálogo/i.test(prodBody);
    const searchField = page
      .getByRole('searchbox')
      .or(page.locator('input[aria-label="Buscar producto"]'));
    let enterDoesNotCommitRaw = true;
    let beforeProductState = null;
    let afterProductState = null;
    if (await searchField.count()) {
      const field = searchField.first();
      beforeProductState = await page.locator('text=En uso').count();
      await field.fill('zz-not-a-real-product-id-opaque-bv');
      await field.press('Enter');
      await page.waitForTimeout(500);
      afterProductState = await page.locator('text=En uso').count();
      // Raw Enter must not commit a non-catalog id into "En uso"
      enterDoesNotCommitRaw = afterProductState === beforeProductState;
      await field.fill('');
    }

    const prodPass =
      results.loginOk && !hasRawIdLabel && hasCatalogSearch && enterDoesNotCommitRaw;

    results.surfaces.produccion = {
      path: '/produccion',
      finalUrl: page.url(),
      verdict: prodPass ? 'PASS' : 'FAIL',
      welcomeDismissed: prodWelcomeGone,
      noIdentificadorDeProducto: !hasRawIdLabel,
      catalogSearchPresent: hasCatalogSearch,
      enterDoesNotCommitRaw,
      beforeEnUso: beforeProductState,
      afterEnUso: afterProductState,
      bodySnippet: norm(prodBody).slice(0, 600),
      shot: prodShot,
    };

    // --- /mensajes ---
    await page.goto(`${BASE}/mensajes`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    const msgWelcomeGone = await dismissWelcome();
    const msgBody = await page.locator('body').innerText();
    const msgShot = join(OUT_DIR, 'mensajes-1440.png');
    await page.screenshot({ path: msgShot, fullPage: false });

    const partyInput = page.locator('#conversation-customer');
    const partyCount = await partyInput.count();
    const msgPartyPlaceholder =
      partyCount > 0 ? await partyInput.getAttribute('placeholder') : null;
    const hasPartyTypeaheadCopy =
      /Buscar cliente|Cliente/i.test(msgBody) ||
      (msgPartyPlaceholder != null && /cliente/i.test(msgPartyPlaceholder));
    const hasFreeTextPartyId =
      /Identificador de (cliente|parte)|Customer ID|partyId/i.test(msgBody);

    const msgPass =
      results.loginOk && partyCount > 0 && hasPartyTypeaheadCopy && !hasFreeTextPartyId;

    results.surfaces.mensajes = {
      path: '/mensajes',
      finalUrl: page.url(),
      verdict: msgPass ? 'PASS' : 'FAIL',
      welcomeDismissed: msgWelcomeGone,
      partyTypeaheadPresent: partyCount > 0,
      partyPlaceholder: msgPartyPlaceholder,
      hasPartyTypeaheadCopy,
      noFreeTextPartyId: !hasFreeTextPartyId,
      bodySnippet: norm(msgBody).slice(0, 600),
      shot: msgShot,
    };

    results.map = {
      finanzas: results.surfaces.finanzas.verdict,
      produccion: results.surfaces.produccion.verdict,
      mensajes: results.surfaces.mensajes.verdict,
    };
    results.ok =
      results.loginOk &&
      results.map.finanzas === 'PASS' &&
      results.map.produccion === 'PASS' &&
      results.map.mensajes === 'PASS';
  } finally {
    await browser.close();
  }

  writeFileSync(REPORT, JSON.stringify(results, null, 2));
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        ok: results.ok,
        loginOk: results.loginOk,
        map: results.map,
        surfaces: Object.fromEntries(
          Object.entries(results.surfaces)
            .filter(([k]) => ['finanzas', 'produccion', 'mensajes'].includes(k))
            .map(([k, v]) => [k, { verdict: v.verdict, finalUrl: v.finalUrl }]),
        ),
        report: REPORT,
      },
      null,
      2,
    ),
  );
  process.exit(results.ok ? 0 : 1);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
