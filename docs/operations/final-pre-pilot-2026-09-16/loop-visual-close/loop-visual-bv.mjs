/**
 * Hosted READ-SAFE BV: Almacén / Entregas / Compras loop + visual no-regression @ 1440.
 * Actor: carmen.staging only. No writes. Secret-safe.
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
const REPORT = join(OUT_DIR, 'loop-visual-bv.json');
const SHA = '29b6f3f37fcf848a4a16248f34e39eeb33d1e463';

const ROUTES = [
  { path: '/almacen', label: 'almacen' },
  { path: '/entregas', label: 'entregas' },
  { path: '/compras', label: 'compras' },
];

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

function analyzeVisual(cssText, bodyBg) {
  const navy = /#18324b|rgb\(\s*24\s*,\s*50\s*,\s*75\s*\)/i.test(cssText) || /--isalwa-kiln/i.test(cssText);
  const teal = /#287a78|rgb\(\s*40\s*,\s*122\s*,\s*120\s*\)/i.test(cssText) || /--isalwa-glaze/i.test(cssText);
  const porcelain =
    /#f6f1e8|#f3f1ed|rgb\(\s*246\s*,\s*241\s*,\s*232\s*\)/i.test(cssText + ' ' + (bodyBg || '')) ||
    /--isalwa-porcelain/i.test(cssText);
  return { navy, teal, porcelain, bodyBg };
}

function classifyRoute(label, text) {
  const t = text || '';
  const foundationLie =
    /foundation[_ ]?gap|no implementado en esta versión|cableado pendiente|wiring pending|pedidos:\s*\[\]/i.test(
      t,
    ) || /esta pantalla aún no está conectada/i.test(t);
  const permissionDeny =
    /no tiene permiso|sin permiso|acceso denegado|no puede ver esta página|permission/i.test(t) &&
    /no (puede|tiene)/i.test(t);

  if (label === 'almacen') {
    const wiredPedidoSurface =
      /Asignación a pedido/i.test(t) &&
      (/A qué pedido/i.test(t) || /Todavía no hay producto para asignar/i.test(t) || /pedido/i.test(t));
    const ready = /data-warehouse-status="ready"|Asignación a pedido/i.test(t) && !permissionDeny;
    const honestEmpty = /Todavía no hay producto para asignar|Cuando haya ingreso/i.test(t);
    const pedidoFactsListed =
      /Abrir pedido/i.test(t) || /Pedido\s+\d+/i.test(t) || /ord_[a-z0-9]+/i.test(t);
    return {
      wiredPedidoSurface,
      readyDesk: ready,
      honestEmpty,
      pedidoFactsListed,
      foundationLie,
      permissionDenyLikely: permissionDeny && !wiredPedidoSurface,
    };
  }

  if (label === 'entregas') {
    const wiredPedidoSurface =
      /Pedidos de esta empresa/i.test(t) ||
      (/PEDIDO/i.test(t) && /identificador del pedido/i.test(t));
    const honestEmpty =
      /Todavía no hay pedidos abiertos/i.test(t) ||
      /aún no tiene salidas/i.test(t) ||
      /No se inventan movimientos/i.test(t);
    const pedidoFactsListed = /Abrir pedido/i.test(t);
    return {
      wiredPedidoSurface,
      readyDesk: /Entregas/i.test(t) && wiredPedidoSurface && !permissionDeny,
      honestEmpty,
      pedidoFactsListed,
      foundationLie,
      permissionDenyLikely: permissionDeny && !wiredPedidoSurface,
    };
  }

  // compras
  const wiredPedidoSurface =
    /Pedidos para vincular/i.test(t) || (/PEDIDO/i.test(t) && /No reescriba las líneas/i.test(t));
  const honestEmpty =
    /Sin pedidos abiertos para vincular/i.test(t) || /cola local vacía no es un fallo/i.test(t);
  const pedidoFactsListed = /Abrir pedido/i.test(t);
  return {
    wiredPedidoSurface,
    readyDesk: /Cola de compras|Compras/i.test(t) && wiredPedidoSurface && !permissionDeny,
    honestEmpty,
    pedidoFactsListed,
    foundationLie,
    permissionDenyLikely: permissionDeny && !wiredPedidoSurface,
  };
}

const password = loadPassword(EMAIL);
if (!password) {
  writeFileSync(REPORT, JSON.stringify({ ok: false, reason: 'PASSWORD_MISSING', sha: SHA }, null, 2));
  console.log('FAIL PASSWORD_MISSING');
  process.exit(2);
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const report = {
  at: new Date().toISOString(),
  sha: SHA,
  email: EMAIL,
  base: BASE,
  viewport: { width: 1440, height: 900 },
  readSafe: true,
  routes: {},
};

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 90000 }),
    page.click('button[type="submit"]'),
  ]);
  report.login = 'OK';
  report.loginUrl = page.url();

  // dismiss welcome once
  await page.waitForTimeout(800);
  const skip = page.getByRole('button', { name: /Explorar por mi cuenta/i });
  if (await skip.count()) {
    await skip.click();
    report.welcomeDismissed = true;
    await page.waitForTimeout(600);
  } else {
    await page.keyboard.press('Escape');
    report.welcomeDismissed = false;
  }

  for (const route of ROUTES) {
    await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(1800);
    // dismiss again if reappears
    const skip2 = page.getByRole('button', { name: /Explorar por mi cuenta/i });
    if (await skip2.count()) {
      await skip2.click();
      await page.waitForTimeout(500);
    }

    const shot = join(OUT_DIR, `${route.label}-1440.png`);
    await page.screenshot({ path: shot, fullPage: false });

    const probe = await page.evaluate(() => {
      const text = document.body?.innerText || '';
      const bodyBg = getComputedStyle(document.body).backgroundColor;
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
      const root = getComputedStyle(document.documentElement);
      const tokens = {
        kiln: root.getPropertyValue('--isalwa-kiln').trim(),
        glaze: root.getPropertyValue('--isalwa-glaze').trim(),
        porcelain: root.getPropertyValue('--isalwa-porcelain').trim(),
        mist: root.getPropertyValue('--isalwa-mist').trim(),
      };
      const sidebar = document.querySelector('aside, [data-shell-sidebar], nav[aria-label*="principal" i]');
      const sidebarW = sidebar ? Math.round(sidebar.getBoundingClientRect().width) : 0;
      return {
        url: location.href,
        title: document.title,
        text,
        bodyBg,
        cssSample: cssChunks.join('\n').slice(0, 120000),
        tokens,
        sidebarW,
        warehouseStatus: document.querySelector('[data-warehouse-status]')?.getAttribute('data-warehouse-status'),
        welcomeStill: /Bienvenido a ISALWA/i.test(text),
      };
    });

    const visual = analyzeVisual(
      `${probe.cssSample}\n${JSON.stringify(probe.tokens)}`,
      probe.bodyBg,
    );
    // Prefer CSS variables when present
    if (probe.tokens.kiln) visual.navy = true;
    if (probe.tokens.glaze) visual.teal = true;
    if (probe.tokens.porcelain || /246,\s*241,\s*232/.test(probe.bodyBg || '')) visual.porcelain = true;

    const signals = classifyRoute(route.label, probe.text);
    const loopOk =
      report.login === 'OK' &&
      !probe.welcomeStill &&
      !/\/login/.test(probe.url) &&
      signals.wiredPedidoSurface &&
      !signals.foundationLie &&
      !signals.permissionDenyLikely;

    report.routes[route.label] = {
      path: route.path,
      finalUrl: probe.url,
      title: probe.title,
      shot,
      shotBytes: existsSync(shot) ? readFileSync(shot).length : 0,
      bodyBg: probe.bodyBg,
      tokens: probe.tokens,
      sidebarW: probe.sidebarW,
      warehouseStatus: probe.warehouseStatus || null,
      welcomeStill: probe.welcomeStill,
      bodySnippet: probe.text.replace(/\s+/g, ' ').trim().slice(0, 420),
      visual,
      signals,
      LOOP_OK: loopOk,
    };
  }

  const routeOk = ROUTES.every((r) => report.routes[r.label]?.LOOP_OK);
  const visualOk = ROUTES.every(
    (r) =>
      report.routes[r.label]?.visual?.navy &&
      report.routes[r.label]?.visual?.teal &&
      report.routes[r.label]?.visual?.porcelain,
  );
  const anyFoundationLie = ROUTES.some((r) => report.routes[r.label]?.signals?.foundationLie);
  const anyPedidoListed = ROUTES.some((r) => report.routes[r.label]?.signals?.pedidoFactsListed);
  const anyHonestEmpty = ROUTES.some((r) => report.routes[r.label]?.signals?.honestEmpty);

  report.LOOP_BV = routeOk && !anyFoundationLie ? 'PASS' : 'FAIL';
  report.VISUAL_NO_REGRESSION = visualOk ? 'PASS' : 'FAIL';
  report.pedidoFactsPresentSomewhere = anyPedidoListed;
  report.honestEmptySeen = anyHonestEmpty;
  report.ok = report.LOOP_BV === 'PASS' && report.VISUAL_NO_REGRESSION === 'PASS';

  writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log(
    `RESULT LOOP_BV=${report.LOOP_BV} VISUAL=${report.VISUAL_NO_REGRESSION} pedidoListed=${anyPedidoListed} honestEmpty=${anyHonestEmpty} ok=${report.ok}`,
  );
  for (const r of ROUTES) {
    const row = report.routes[r.label];
    console.log(
      `  ${r.label}: LOOP_OK=${row.LOOP_OK} wired=${row.signals.wiredPedidoSurface} lie=${row.signals.foundationLie} listed=${row.signals.pedidoFactsListed} navy=${row.visual.navy} teal=${row.visual.teal}`,
    );
  }
} catch (err) {
  report.ok = false;
  report.error = String(err.message || err).slice(0, 400);
  writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log('FAIL', report.error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
