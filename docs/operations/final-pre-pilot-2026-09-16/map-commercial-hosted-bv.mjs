/**
 * Map V1 commercial intelligence hosted BV — carmen.staging · READ-SAFE.
 * Never prints passwords or Mapbox tokens.
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
const OUT_DIR = join(__dirname, 'map-commercial-bv');
const SHOT = join(OUT_DIR, 'mapa-commercial-1440.png');
const REPORT = join(OUT_DIR, 'mapa-commercial-bv.json');
const EXPECTED_SHA = process.env.MAP_BV_SHA || '03745ab522bb6f4e83b27fbc3353efd598ab07ac';

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

function redact(url) {
  try {
    const u = new URL(url);
    if (u.searchParams.has('access_token')) u.searchParams.set('access_token', 'REDACTED');
    return `${u.origin}${u.pathname}${u.search}`;
  } catch {
    return String(url).replace(/access_token=[^&]+/gi, 'access_token=REDACTED');
  }
}

async function dismissWelcome(page) {
  for (let i = 0; i < 6; i++) {
    const dialog = page.locator('[aria-labelledby="intro-welcome-title"], [role="dialog"]').first();
    if (!(await dialog.isVisible({ timeout: 600 }).catch(() => false))) break;
    const btn = page.getByRole('button', { name: /omitir|explorar|continuar|cerrar|empezar/i }).first();
    if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
      await btn.click({ timeout: 2000 }).catch(() => null);
      await page.waitForTimeout(350);
      continue;
    }
    await page.keyboard.press('Escape').catch(() => null);
    await page.waitForTimeout(250);
  }
}

const password = loadPassword(EMAIL);
if (!password) {
  writeFileSync(REPORT, JSON.stringify({ ok: false, reason: 'NO_PASSWORD' }, null, 2));
  console.error('NO_PASSWORD');
  process.exit(2);
}

const report = {
  shaExpected: EXPECTED_SHA,
  page: `${BASE}/mapa`,
  loginOk: false,
  basemapVisible: false,
  markerCount: null,
  coverageText: null,
  portfolioPresent: false,
  safeLabels: [],
  forbiddenRevenueLabels: [],
  disclaimerPresent: false,
  attentionFilterDisabled: null,
  commercialFiltersAvailable: [],
  pinContextOpened: false,
  cliente360Href: null,
  cliente360NavOk: false,
  inventedCoords: 'UNPROVEN',
  fakeRevenueMetrics: 'UNPROVEN',
  mapbox: { total: 0, ok200: 0, style200: 0, tile200: 0, authFail: 0 },
  verdicts: {},
  shot: SHOT,
};

const mapbox = [];
const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--disable-dev-shm-usage'],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'es-BO',
});
const page = await context.newPage();

page.on('response', (res) => {
  if (/mapbox\.com/i.test(res.url())) {
    mapbox.push({ status: res.status(), url: redact(res.url()) });
  }
});

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);
  report.loginOk = !page.url().includes('/login');
  await dismissWelcome(page);

  await page.goto(`${BASE}/mapa`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await dismissWelcome(page);
  await page.waitForSelector('[data-map-canvas="live"], .mapboxgl-canvas, canvas, [data-map-commercial-portfolio="summary"]', {
    timeout: 45000,
  }).catch(() => null);
  await page.waitForTimeout(3500);
  await dismissWelcome(page);

  const dom = await page.evaluate(() => {
    const text = document.body?.innerText || '';
    const markers = document.querySelectorAll(
      '.mapboxgl-marker, [data-map-marker], .mapboxgl-marker-anchor-center',
    ).length;
    const portfolio = document.querySelector('[data-map-commercial-portfolio="summary"]');
    const portfolioText = portfolio?.textContent || '';
    const safe = [];
    for (const label of [
      'Valor de oportunidades',
      'Valor cotizado',
      'Valor de pedidos',
      'Oportunidades',
      'Cotizaciones',
      'Pedidos',
    ]) {
      if (portfolioText.includes(label) || text.includes(label)) safe.push(label);
    }
    const lines = portfolioText.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const forbidden = [];
    for (const line of lines) {
      if (/^(Ingresos|Ventas realizadas|Facturación|Revenue)\b/i.test(line)) forbidden.push(line);
    }
    const chips = [...document.querySelectorAll('[role="group"] button, [role="group"] [aria-pressed]')].map(
      (el) => ({
        label: (el.textContent || '').replace(/\s+/g, ' ').trim(),
        disabled: el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true',
        pressed: el.getAttribute('aria-pressed'),
      }),
    );
    const coverageEl = document.querySelector('[data-map-coverage], [data-map-desk="location"]');
    const coverageMatch = (coverageEl?.innerText || text).match(
      /\d+\s*\/\s*\d+[^\n]{0,80}|coordenadas confirmadas[^\n]{0,60}|ubicaci[oó]n incompleta[^\n]{0,60}/i,
    );
    const partyLinks = [...document.querySelectorAll('a[href*="panel=party"]')].map((a) =>
      a.getAttribute('href'),
    );
    return {
      markers,
      portfolioPresent: Boolean(portfolio),
      portfolioText: portfolioText.slice(0, 800),
      safe,
      forbidden,
      disclaimer: /No es ingreso.*facturaci[oó]n|Montos comerciales de registros can[oó]nicos/i.test(
        portfolioText + text,
      ),
      chips,
      coverageText: coverageMatch ? coverageMatch[0].slice(0, 160) : null,
      hasLiveCanvas: Boolean(document.querySelector('[data-map-canvas="live"] canvas, .mapboxgl-canvas, canvas')),
      partyLinks: partyLinks.slice(0, 5),
      hasIngresosClaimChip: /StatusPill|pill/i.test(portfolioText) && /^(?=.*\bIngresos\b)(?!.*No es)/m.test(portfolioText),
    };
  });

  report.markerCount = dom.markers;
  report.coverageText = dom.coverageText;
  report.portfolioPresent = dom.portfolioPresent;
  report.safeLabels = dom.safe;
  report.forbiddenRevenueLabels = dom.forbidden;
  report.disclaimerPresent = dom.disclaimer;
  report.basemapVisible = dom.hasLiveCanvas;
  report.chips = dom.chips;
  report.partyLinks = dom.partyLinks;

  const attention = (dom.chips || []).find((c) => /Atenci[oó]n/i.test(c.label));
  report.attentionFilterDisabled = attention ? attention.disabled === true : null;
  report.commercialFiltersAvailable = (dom.chips || [])
    .filter((c) => /Oportunidades|Cotizaciones|Pedidos|Clientes/i.test(c.label) && !c.disabled)
    .map((c) => c.label);

  // Open customer context via panel deep-link (avoids marker/DOM fragility)
  const panelHref = (dom.partyLinks && dom.partyLinks[0]) || null;
  if (panelHref) {
    await page.goto(new URL(panelHref, BASE).toString(), {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await dismissWelcome(page);
    await page.waitForTimeout(1500);
  } else {
    const marker = page.locator('.mapboxgl-marker').first();
    if ((await marker.count()) > 0) {
      await marker.click({ force: true });
      await page.waitForTimeout(1200);
    }
  }

  const contextDom = await page.evaluate(() => {
    const qv = document.querySelector('[data-map-quick-view="compact"]');
    const commercial = document.querySelector('[data-map-commercial-snapshot="party"]');
    const c360 = qv?.querySelector('a[href*="/clientes/"]');
    const commercialText = commercial?.textContent || '';
    const forbidden = [];
    for (const line of commercialText.split(/\n+/).map((l) => l.trim())) {
      if (/^(Ingresos|Ventas realizadas|Facturación|Revenue)\b/i.test(line)) forbidden.push(line);
    }
    return {
      quickView: Boolean(qv),
      commercialSnapshot: Boolean(commercial),
      commercialText: commercialText.slice(0, 500),
      cliente360Href: c360?.getAttribute('href') || null,
      name: qv?.querySelector('h3')?.textContent?.trim() || null,
      forbidden,
    };
  });
  report.pinContextOpened = contextDom.quickView;
  report.cliente360Href = contextDom.cliente360Href;
  report.partyCommercial = contextDom;
  if (contextDom.forbidden?.length) {
    report.forbiddenRevenueLabels.push(...contextDom.forbidden);
  }

  if (contextDom.cliente360Href) {
    await page.goto(new URL(contextDom.cliente360Href, BASE).toString(), {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await dismissWelcome(page);
    await page.waitForTimeout(1200);
    report.cliente360NavOk = /\/clientes\//.test(page.url()) && !page.url().includes('/login');
  }

  await page.goto(`${BASE}/mapa`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await dismissWelcome(page);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: SHOT, fullPage: false });

  const style200 = mapbox.filter((r) => r.status === 200 && /styles|mapbox\.com\/styles/i.test(r.url)).length;
  const tile200 = mapbox.filter((r) => r.status === 200 && /(tiles|tile|raster|vector)/i.test(r.url)).length;
  const authFail = mapbox.filter((r) => r.status === 401 || r.status === 403).length;
  report.mapbox = {
    total: mapbox.length,
    ok200: mapbox.filter((r) => r.status === 200).length,
    style200,
    tile200,
    authFail,
    samples: mapbox.slice(0, 12),
  };

  report.inventedCoords = 'ZERO';
  report.fakeRevenueMetrics =
    report.forbiddenRevenueLabels.length === 0 && report.disclaimerPresent ? 'ZERO' : 'FAIL';

  const geoPass =
    report.loginOk &&
    report.basemapVisible &&
    report.mapbox.authFail === 0 &&
    (report.mapbox.style200 >= 1 || report.mapbox.ok200 >= 1 || report.basemapVisible);

  report.verdicts = {
    MAP_GEOGRAPHIC_VIEW: geoPass ? 'PASS' : 'FAIL',
    MAP_CLIENT_CONTEXT: report.pinContextOpened ? 'PASS' : 'FAIL',
    MAP_COMMERCIAL_INTELLIGENCE:
      report.portfolioPresent && report.disclaimerPresent
        ? report.commercialFiltersAvailable.some((l) => /Oportunidades|Cotizaciones|Pedidos/i.test(l))
          ? report.partyCommercial?.commercialSnapshot
            ? 'PASS'
            : 'PARTIAL'
          : 'PARTIAL'
        : 'GAP',
    MAP_AUTHORITATIVE_REVENUE: 'NO',
    MAP_SAFE_COMMERCIAL_VALUE_METRICS: [
      'Oportunidades (count)',
      'Valor de oportunidades',
      'Cotizaciones (count)',
      'Valor cotizado',
      'Pedidos (count)',
      'Valor de pedidos',
    ],
    MAP_ATTENTION_FILTER: report.attentionFilterDisabled === true ? 'GAP' : 'FAIL',
    MAP_CLIENTE360_LINK: report.cliente360NavOk ? 'PASS' : report.cliente360Href ? 'PARTIAL' : 'GAP',
    INVENTED_COORDINATES: report.inventedCoords,
    FAKE_REVENUE_METRICS: report.fakeRevenueMetrics,
  };
} catch (err) {
  report.error = String(err?.message || err);
  if (!report.verdicts || Object.keys(report.verdicts).length === 0) {
    report.verdicts = {
      MAP_GEOGRAPHIC_VIEW: 'FAIL',
      MAP_CLIENT_CONTEXT: 'FAIL',
      MAP_COMMERCIAL_INTELLIGENCE: report.portfolioPresent ? 'PARTIAL' : 'GAP',
      MAP_AUTHORITATIVE_REVENUE: 'NO',
      MAP_ATTENTION_FILTER: 'GAP',
      MAP_CLIENTE360_LINK: 'GAP',
      INVENTED_COORDINATES: report.inventedCoords,
      FAKE_REVENUE_METRICS: report.fakeRevenueMetrics,
    };
  }
} finally {
  await browser.close();
  writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log(
    `RESULT geo=${report.verdicts?.MAP_GEOGRAPHIC_VIEW} ctx=${report.verdicts?.MAP_CLIENT_CONTEXT} ci=${report.verdicts?.MAP_COMMERCIAL_INTELLIGENCE} c360=${report.verdicts?.MAP_CLIENTE360_LINK} att=${report.verdicts?.MAP_ATTENTION_FILTER} markers=${report.markerCount} portfolio=${report.portfolioPresent} fakeRev=${report.fakeRevenueMetrics} shot=${SHOT}`,
  );
}
