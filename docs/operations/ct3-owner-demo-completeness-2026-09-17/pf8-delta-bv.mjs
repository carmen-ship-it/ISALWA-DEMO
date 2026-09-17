/**
 * PF-8 targeted hosted BV — post-demo completeness delta.
 * Secret-safe: never prints passwords. Writes /tmp/ct3-bv/pf8-results.json
 */
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const require = createRequire('/Users/carmen/projects/isalwa/.tmp/pw-agent4/package.json');
const { chromium } = require('playwright-core');

const BASE = 'https://os-web-staging.onrender.com';
const TIP = '969bbe3833f5aa874a0b017d2f4e61c112748a2b';
const ORG = '01M2JKF77TXMJNDTKNCYNHH9G5';
const seeded = JSON.parse(
  readFileSync(
    '/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/demo/seeded-ids.json',
    'utf8',
  ),
);
const maderas = seeded.clients.find((c) => c.key === 'maderas_oriente');

function loadPassword(email) {
  const files = [
    join(homedir(), '.isalwa-secrets', 'isalwa-os-staging-wave2-role-passwords.json'),
    join(homedir(), '.isalwa-secrets', 'isalwa-os-staging-wave-a-continuity-passwords.json'),
  ];
  for (const f of files) {
    if (!existsSync(f)) continue;
    const raw = JSON.parse(readFileSync(f, 'utf8'));
    const bag = raw.passwords || raw;
    const v = bag[email];
    if (typeof v === 'string' && v) return v;
    if (v && typeof v.password === 'string' && v.password) return v.password;
  }
  return null;
}

async function dismissOverlays(page) {
  for (let i = 0; i < 6; i++) {
    const welcome = page.locator('[role="dialog"][aria-labelledby="intro-welcome-title"]');
    if ((await welcome.count()) > 0) {
      const skip = page.getByRole('button', { name: /Explorar por mi cuenta/i });
      if ((await skip.count()) > 0) await skip.first().click({ timeout: 4000 }).catch(() => null);
      else await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }
    const omitir = page.getByRole('button', { name: /^Omitir$/i });
    if ((await omitir.count()) > 0) await omitir.first().click({ timeout: 3000 }).catch(() => null);
    await page.keyboard.press('Escape').catch(() => null);
    await page.waitForTimeout(200);
  }
}

async function login(page, email) {
  const password = loadPassword(email);
  if (!password) return { ok: false, reason: 'pw_missing' };
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 45000 });
      await page.fill('input[type="email"], input[name="email"]', email);
      await page.fill('input[type="password"], input[name="password"]', password);
      await Promise.all([
        page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 90000 }).catch(() => null),
        page.click('button[type="submit"]'),
      ]);
      await page.waitForTimeout(2500);
      await dismissOverlays(page);
      if (!page.url().includes('/login')) return { ok: true };
    } catch {
      await page.waitForTimeout(3000 * attempt);
    }
  }
  return { ok: !page.url().includes('/login') };
}

async function bodyText(page) {
  return page.locator('body').innerText();
}

mkdirSync('/tmp/ct3-bv', { recursive: true });
const results = {
  lane: 'PF-8',
  tip: TIP,
  org: ORG,
  startedAt: new Date().toISOString(),
  checks: {},
};
const ok = (n, p, d = '') => {
  results.checks[n] = { pass: !!p, detail: String(d).slice(0, 500) };
  console.log(p ? 'PASS' : 'FAIL', n, String(d).slice(0, 120));
};

const browser = await chromium.launch({ headless: true, channel: 'chrome' });

const PAGES_NO_OLD_WALK = [
  ['inicio', '/inicio?datos=demo'],
  ['cliente360', seeded.hrefHints.cliente360 + '?datos=demo'],
  ['trabajo', '/trabajo?datos=demo'],
  ['finanzas', '/finanzas?datos=demo'],
  ['mapa', '/mapa?datos=demo'],
  ['pedido', seeded.hrefHints.order + '?datos=demo'],
];

const COVERAGE = [
  ['Inicio', '/inicio?datos=demo'],
  ['Clientes', '/clientes?datos=demo'],
  ['Oportunidades', '/oportunidades?datos=demo'],
  ['Cotizaciones', '/cotizaciones?datos=demo'],
  ['Mapa', '/mapa?datos=demo'],
  ['Trabajo', '/trabajo?datos=demo'],
  ['Conversaciones', '/conversaciones?datos=demo'],
  ['Incidencias', '/incidencias?datos=demo'],
  ['Compromisos', '/compromisos?datos=demo'],
  ['Produccion', '/produccion?datos=demo'],
  ['Almacen', '/almacen?datos=demo'],
  ['Compras', '/compras?datos=demo'],
  ['Entregas', '/entregas?datos=demo'],
  ['Finanzas', '/finanzas?datos=demo'],
  ['Gerencia', '/inicio?lente=gerencia&datos=demo'],
];

// --- people-admin: story + banner + walkthrough removal + coverage ---
{
  const email = 'w2.people-admin@isalwa.demo';
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const logged = await login(page, email);
  ok('people_admin_login', logged.ok, logged.reason || 'ok');

  if (logged.ok) {
    // Banner + toggle on inicio demo
    await page.goto(`${BASE}/inicio?datos=demo`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await dismissOverlays(page);
    await page.waitForTimeout(1200);
    let body = await bodyText(page);
    ok('demo_banner', /DEMO\s*[·•]\s*DATOS FICTICIOS/i.test(body), 'banner');
    ok(
      'demo_toggle',
      /Datos reales/i.test(body) && /\bDemo\b/i.test(body),
      'toggle labels',
    );

    // Story Mode reachable
    const storyBtn = page.getByRole('button', { name: /Ver recorrido completo/i }).first();
    const storyLink = page.getByRole('link', { name: /Ver recorrido completo/i }).first();
    let storyLauncher = (await storyBtn.count()) > 0 || (await storyLink.count()) > 0;
    if (!storyLauncher && /Ver recorrido completo/i.test(body)) storyLauncher = true;
    ok('story_mode_launcher', storyLauncher, 'Ver recorrido completo');

    await page.goto(`${BASE}/inicio?datos=demo&story=1`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await dismissOverlays(page);
    await page.waitForTimeout(1500);
    body = await bodyText(page);
    if (!/Siguiente/i.test(body)) {
      const btn = page.getByRole('button', { name: /Ver recorrido completo/i }).first();
      if (await btn.count()) {
        await btn.click({ force: true });
        await page.waitForTimeout(1200);
        body = await bodyText(page);
      }
    }
    const storyOpen =
      /Siguiente/i.test(body) &&
      /Anterior/i.test(body) &&
      (/Salir del recorrido/i.test(body) || /Salir/i.test(body)) &&
      (/Paso \d+ de 20/i.test(body) || /DEMO/i.test(body));
    ok('story_mode_open', storyOpen, storyOpen ? 'opened' : 'missing_controls');

    // Old walkthrough removed across key pages
    let oldFound = [];
    for (const [name, path] of PAGES_NO_OLD_WALK) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await dismissOverlays(page);
      await page.waitForTimeout(800);
      const t = await bodyText(page);
      if (/Mostrar recorrido/i.test(t)) oldFound.push(name);
    }
    ok('old_walkthrough_removed', oldFound.length === 0, oldFound.join(',') || 'none');

    // Coverage matrix: pages load in demo mode (HTTP + not blank crash)
    const coverage = {};
    let demoVisibleHits = 0;
    for (const [name, path] of COVERAGE) {
      const resp = await page.goto(`${BASE}${path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 90000,
      });
      await dismissOverlays(page);
      await page.waitForTimeout(700);
      const status = resp ? resp.status() : 0;
      const t = await bodyText(page);
      const crashed = /Application error|digest|Unhandled/i.test(t);
      const hasDemoCue =
        /DEMO\s*[·•]\s*DATOS FICTICIOS/i.test(t) ||
        /DEMO MADERAS|DEMO CONSTRUCTORA|DEMO PROYECTOS|DEMO HOTEL|DEMO FERRETER/i.test(t) ||
        /Datos reales/i.test(t);
      if (hasDemoCue) demoVisibleHits += 1;
      coverage[name] = {
        status,
        crashed,
        hasDemoCue,
        pass: status >= 200 && status < 400 && !crashed,
      };
      ok(`coverage_${name}`, coverage[name].pass, `status=${status} demoCue=${hasDemoCue}`);
    }
    results.coverage = coverage;
    ok(
      'demo_data_visible_any_page',
      demoVisibleHits >= 3,
      `hits=${demoVisibleHits}/${COVERAGE.length}`,
    );

    // Cross-page coherence DEMO MADERAS
    await page.goto(`${BASE}${seeded.hrefHints.cliente360}?datos=demo`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await dismissOverlays(page);
    await page.waitForTimeout(1000);
    const c360 = await bodyText(page);
    ok('coherence_cliente360_maderas', /DEMO MADERAS/i.test(c360), 'name');

    await page.goto(`${BASE}${seeded.hrefHints.quote}?datos=demo`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await dismissOverlays(page);
    await page.waitForTimeout(1000);
    const quoteBody = await bodyText(page);
    ok(
      'coherence_quote',
      /Q-000002|01M2PM9KSJXN1K4CF45FT0H299/i.test(quoteBody) && /DEMO MADERAS/i.test(quoteBody),
      'quote+party',
    );
    ok(
      'quote_pdf_cta',
      /Descargar PDF|Ver PDF/i.test(quoteBody),
      'Ver/Descargar present',
    );

    await page.goto(`${BASE}${seeded.hrefHints.order}?datos=demo`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await dismissOverlays(page);
    await page.waitForTimeout(1000);
    const orderBody = await bodyText(page);
    ok(
      'coherence_pedido',
      /O-000002|01M2PMA280KX4AAV7049YKNE07/i.test(orderBody) && /DEMO MADERAS/i.test(orderBody),
      'order+party',
    );

    await page.goto(`${BASE}${seeded.hrefHints.documents}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await dismissOverlays(page);
    await page.waitForTimeout(1000);
    const docsBody = await bodyText(page);
    ok(
      'coherence_docs',
      /Ver PDF|Descargar|Cotizaci|Nota/i.test(docsBody),
      'docs links',
    );

    // Quote PDF same route family (authenticated fetch)
    const qPdf = await page.request.get(`${BASE}${seeded.hrefHints.quotePdf}`);
    const qCt = qPdf.headers()['content-type'] || '';
    ok(
      'quote_pdf_http',
      qPdf.status() === 200 && /pdf|octet/i.test(qCt),
      `${qPdf.status()} ${qCt}`,
    );
  }
  await page.close();
}

// --- coordinacion: DN PDF ---
{
  const email = 'w2.coordinacion@isalwa.demo';
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const logged = await login(page, email);
  ok('coord_login', logged.ok, logged.reason || 'ok');
  if (logged.ok) {
    const r = await page.request.get(`${BASE}${seeded.hrefHints.deliveryNotePdf}`);
    const ct = r.headers()['content-type'] || '';
    ok('dn_pdf_http', r.status() === 200 && /pdf|octet/i.test(ct), `${r.status()} ${ct}`);
  }
  await page.close();
}

// Artifact markers
ok(
  'real_seven_mutated_artifact',
  seeded.REAL_SEVEN_MUTATED === 'NO',
  String(seeded.REAL_SEVEN_MUTATED),
);
ok('seeded_org_is_synth', seeded.organizationId === ORG, seeded.organizationId);
ok('maderas_ids_present', !!(maderas?.quoteId && maderas?.orderId && maderas?.deliveryNoteId), 'ids');

results.finishedAt = new Date().toISOString();
results.passCount = Object.values(results.checks).filter((c) => c.pass).length;
results.failCount = Object.values(results.checks).filter((c) => !c.pass).length;
writeFileSync('/tmp/ct3-bv/pf8-results.json', JSON.stringify(results, null, 2));
console.log('SUMMARY', results.passCount, 'pass', results.failCount, 'fail');
await browser.close();
process.exit(results.failCount ? 2 : 0);
