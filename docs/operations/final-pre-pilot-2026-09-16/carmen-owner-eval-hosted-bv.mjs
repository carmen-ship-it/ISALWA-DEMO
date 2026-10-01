/**
 * Hosted BV: carmen.staging owner-evaluation desks after BUSINESS scope grant.
 * Secret-safe — never prints passwords.
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
const OUT_DIR = join(__dirname, 'carmen-owner-eval-bv');
const REPORT = join(OUT_DIR, 'carmen-owner-eval-bv.json');

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

const DENY = 'Sin permiso para el registro operativo';
const ROUTES = [
  { path: '/finanzas', label: 'finanzas', expectDeskKicker: 'Registro operativo' },
  { path: '/almacen', label: 'almacen' },
  { path: '/compras', label: 'compras' },
  { path: '/produccion', label: 'produccion' },
];

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
  const results = { email: EMAIL, base: BASE, at: new Date().toISOString(), routes: {} };

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

    for (const route of ROUTES) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(2000);
      const body = await page.locator('body').innerText();
      const shot = join(OUT_DIR, `${route.label}-1440.png`);
      await page.screenshot({ path: shot, fullPage: false });
      const deny = body.includes(DENY);
      const wrongDeny =
        /Sin permiso|No tienes permiso|no se abre el escritorio/i.test(body) &&
        !/sesión|otra empresa/i.test(body);
      const deskOpenSignals = {
        hasRegistroOperativo: /Registro operativo/i.test(body),
        hasFinanzasOperativas: /Finanzas operativas/i.test(body),
        hasAnoteEvidencia: /Anote evidencia de pago reportada/i.test(body),
        emptyHonest: /Todavía no hay|Sin pedidos|Sin registros|vacío|aún no|en preparación/i.test(body),
      };
      results.routes[route.label] = {
        path: route.path,
        finalUrl: page.url(),
        statusHint: page.url().includes(route.path) ? 'REACHED' : 'REDIRECTED',
        denyPhrasePresent: deny,
        permissionDenyLikely: wrongDeny && deny,
        deskOpenSignals,
        bodySnippet: body.replace(/\s+/g, ' ').slice(0, 500),
        shot,
      };
    }

    const fin = results.routes.finanzas;
    results.FINANCE_OPERATIONAL_ACCESS =
      fin && !fin.denyPhrasePresent && fin.deskOpenSignals.hasFinanzasOperativas
        ? 'PASS'
        : 'FAIL';
    results.ok = results.loginOk && results.FINANCE_OPERATIONAL_ACCESS === 'PASS';
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
        FINANCE_OPERATIONAL_ACCESS: results.FINANCE_OPERATIONAL_ACCESS,
        routes: Object.fromEntries(
          Object.entries(results.routes).map(([k, v]) => [
            k,
            {
              denyPhrasePresent: v.denyPhrasePresent,
              permissionDenyLikely: v.permissionDenyLikely,
              deskOpenSignals: v.deskOpenSignals,
              statusHint: v.statusHint,
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
