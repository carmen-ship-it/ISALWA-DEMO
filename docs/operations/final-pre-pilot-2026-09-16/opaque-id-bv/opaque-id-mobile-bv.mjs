/**
 * Hosted BV (mobile 390×844): opaque-ID surfaces — carmen.staging READ-SAFE.
 * Checks /finanzas, /produccion, /mensajes. No writes. Secret-safe.
 * Also: no horizontal overflow blocking primary content; navy/teal preserved.
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
const REPORT = join(OUT_DIR, 'opaque-id-mobile-bv.json');
const EXPECTED_SHA = 'e9a7a02b5a2e2105e7f4c756e0bfd20b17fe7fed';
const VIEWPORT = { width: 390, height: 844 };

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

async function probeLayoutAndTokens(page) {
  return page.evaluate(() => {
    const docEl = document.documentElement;
    const body = document.body;
    const vw = window.innerWidth;
    const scrollW = Math.max(docEl.scrollWidth, body?.scrollWidth || 0);
    const clientW = docEl.clientWidth;
    // Primary content: main landmark or shell main; fallback body
    const main =
      document.querySelector('main') ||
      document.querySelector('[data-shell-main]') ||
      document.querySelector('[role="main"]') ||
      body;
    const mainRect = main.getBoundingClientRect();
    const mainOverflowX = main.scrollWidth > main.clientWidth + 2;
    // Blocking overflow: document wider than viewport by >8px OR main clipped off-screen
    const docOverflowPx = scrollW - clientW;
    const primaryBlocked =
      docOverflowPx > 8 ||
      mainOverflowX ||
      mainRect.right > vw + 8 ||
      mainRect.left < -8;

    const root = getComputedStyle(docEl);
    const tokens = {
      kiln: root.getPropertyValue('--isalwa-kiln').trim(),
      glaze: root.getPropertyValue('--isalwa-glaze').trim(),
      porcelain: root.getPropertyValue('--isalwa-porcelain').trim(),
    };
    const bodyBg = getComputedStyle(body).backgroundColor;
    const cssChunks = [];
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules || [])) {
          cssChunks.push(rule.cssText);
        }
      } catch {
        /* cross-origin */
      }
    }
    const cssSample = cssChunks.join('\n').slice(0, 80000);
    const navyHex =
      /#18324b|rgb\(\s*24\s*,\s*50\s*,\s*75\s*\)/i.test(cssSample) ||
      Boolean(tokens.kiln) ||
      /--isalwa-kiln/i.test(cssSample);
    const tealHex =
      /#287a78|rgb\(\s*40\s*,\s*122\s*,\s*120\s*\)/i.test(cssSample) ||
      Boolean(tokens.glaze) ||
      /--isalwa-glaze/i.test(cssSample);

    return {
      viewportW: vw,
      scrollWidth: scrollW,
      clientWidth: clientW,
      docOverflowPx,
      mainScrollWidth: main.scrollWidth,
      mainClientWidth: main.clientWidth,
      mainOverflowX,
      mainLeft: Math.round(mainRect.left),
      mainRight: Math.round(mainRect.right),
      noHorizontalOverflowBlocking: !primaryBlocked,
      tokens,
      bodyBg,
      navy: navyHex,
      teal: tealHex,
    };
  });
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
  const page = await browser.newPage({
    viewport: VIEWPORT,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const results = {
    email: EMAIL,
    base: BASE,
    expectedSha: EXPECTED_SHA,
    viewport: VIEWPORT,
    readSafe: true,
    realSevenMutated: 'NO',
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

    async function dismissWelcome() {
      for (let i = 0; i < 6; i++) {
        const explore = page.getByRole('button', { name: /Explorar por mi cuenta/i });
        const visible =
          (await explore.count()) > 0 && (await explore.first().isVisible().catch(() => false));
        if (!visible) {
          const dialogish = page.locator('[role="dialog"]');
          if ((await dialogish.count()) === 0) break;
          await page.keyboard.press('Escape').catch(() => null);
          await page.waitForTimeout(300);
          continue;
        }
        await explore.first().click({ timeout: 3000 }).catch(() => null);
        await page.waitForTimeout(400);
        if (
          (await explore.count()) === 0 ||
          !(await explore.first().isVisible().catch(() => false))
        ) {
          break;
        }
        await page.keyboard.press('Escape').catch(() => null);
        await page.waitForTimeout(300);
      }
      // Also dismiss RECORRIDO / tour sheet (Omitir or close) so primary form is visible
      for (let i = 0; i < 4; i++) {
        const omitir = page.getByRole('button', { name: /^Omitir$/i });
        const closeX = page.getByRole('button', { name: /cerrar|close/i });
        if ((await omitir.count()) > 0 && (await omitir.first().isVisible().catch(() => false))) {
          await omitir.first().click({ timeout: 2000 }).catch(() => null);
          await page.waitForTimeout(400);
          continue;
        }
        if ((await closeX.count()) > 0 && (await closeX.first().isVisible().catch(() => false))) {
          await closeX.first().click({ timeout: 2000 }).catch(() => null);
          await page.waitForTimeout(400);
          continue;
        }
        // Fallback: click the X icon inside recorrido card if labelled only visually
        const recorrido = page.locator('text=/RECORRIDO/i').first();
        if (await recorrido.isVisible().catch(() => false)) {
          await page.keyboard.press('Escape').catch(() => null);
          await page.waitForTimeout(300);
        } else {
          break;
        }
      }
      const still = page.getByRole('button', { name: /Explorar por mi cuenta/i });
      const tourStill = page.locator('text=/RECORRIDO ·/i');
      return (
        !(
          (await still.count()) > 0 && (await still.first().isVisible().catch(() => false))
        ) &&
        !(
          (await tourStill.count()) > 0 && (await tourStill.first().isVisible().catch(() => false))
        )
      );
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

    const finLayout = await probeLayoutAndTokens(page);
    if (partyTypeaheadVisible) {
      await page.locator('#finance-subject-party').scrollIntoViewIfNeeded().catch(() => null);
      await page.waitForTimeout(200);
    } else if (hasSubjectTypeSelect) {
      await page.locator('#finance-subject-type').scrollIntoViewIfNeeded().catch(() => null);
      await page.waitForTimeout(200);
    }
    const finShot = join(OUT_DIR, 'finanzas-390.png');
    await page.screenshot({ path: finShot, fullPage: false });

    const finPass =
      results.loginOk &&
      !hasIdentificadorLabel &&
      !hasEtiquetaLabel &&
      hasSubjectTypeSelect &&
      orderSubjectOk &&
      partyTypeaheadVisible &&
      finLayout.noHorizontalOverflowBlocking &&
      finLayout.navy &&
      finLayout.teal;

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
      layout: finLayout,
      bodySnippet: norm(finBody).slice(0, 600),
      shot: finShot,
    };

    // --- /produccion ---
    await page.goto(`${BASE}/produccion`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    const prodWelcomeGone = await dismissWelcome();
    const prodBody = await page.locator('body').innerText();

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
      enterDoesNotCommitRaw = afterProductState === beforeProductState;
      await field.fill('');
    }

    const prodLayout = await probeLayoutAndTokens(page);
    if (await searchField.count()) {
      await searchField.first().scrollIntoViewIfNeeded().catch(() => null);
      await page.waitForTimeout(200);
    }
    const prodShot = join(OUT_DIR, 'produccion-390.png');
    await page.screenshot({ path: prodShot, fullPage: false });

    const prodPass =
      results.loginOk &&
      !hasRawIdLabel &&
      hasCatalogSearch &&
      enterDoesNotCommitRaw &&
      prodLayout.noHorizontalOverflowBlocking &&
      prodLayout.navy &&
      prodLayout.teal;

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
      layout: prodLayout,
      bodySnippet: norm(prodBody).slice(0, 600),
      shot: prodShot,
    };

    // --- /mensajes ---
    await page.goto(`${BASE}/mensajes`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    const msgWelcomeGone = await dismissWelcome();
    const msgBody = await page.locator('body').innerText();

    const partyInput = page.locator('#conversation-customer');
    const partyCount = await partyInput.count();
    const msgPartyPlaceholder =
      partyCount > 0 ? await partyInput.getAttribute('placeholder') : null;
    const hasPartyTypeaheadCopy =
      /Buscar cliente|Cliente/i.test(msgBody) ||
      (msgPartyPlaceholder != null && /cliente/i.test(msgPartyPlaceholder));
    const hasFreeTextPartyId =
      /Identificador de (cliente|parte)|Customer ID|partyId/i.test(msgBody);

    const msgLayout = await probeLayoutAndTokens(page);
    if (partyCount > 0) {
      await partyInput.first().scrollIntoViewIfNeeded().catch(() => null);
      await page.waitForTimeout(200);
    }
    const msgShot = join(OUT_DIR, 'mensajes-390.png');
    await page.screenshot({ path: msgShot, fullPage: false });

    const msgPass =
      results.loginOk &&
      partyCount > 0 &&
      hasPartyTypeaheadCopy &&
      !hasFreeTextPartyId &&
      msgLayout.noHorizontalOverflowBlocking &&
      msgLayout.navy &&
      msgLayout.teal;

    results.surfaces.mensajes = {
      path: '/mensajes',
      finalUrl: page.url(),
      verdict: msgPass ? 'PASS' : 'FAIL',
      welcomeDismissed: msgWelcomeGone,
      partyTypeaheadPresent: partyCount > 0,
      partyPlaceholder: msgPartyPlaceholder,
      hasPartyTypeaheadCopy,
      noFreeTextPartyId: !hasFreeTextPartyId,
      layout: msgLayout,
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
            .map(([k, v]) => [
              k,
              {
                verdict: v.verdict,
                finalUrl: v.finalUrl,
                overflowOk: v.layout?.noHorizontalOverflowBlocking,
                navy: v.layout?.navy,
                teal: v.layout?.teal,
              },
            ]),
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
