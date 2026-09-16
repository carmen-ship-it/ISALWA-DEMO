/**
 * Hosted AFTER visual contact shots for the visual-system pass.
 * Never prints secrets. Loads passwords from ~/.isalwa-secrets only.
 *
 * Usage:
 *   node scripts/wave2-visual-hosted-after-shots.mjs
 * Optional:
 *   HOSTED_VISUAL_EMAIL=... HOSTED_VISUAL_PASSWORD=... OUT_DIR=...
 */
import { chromium } from 'playwright-core';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

const BASE = process.env.HOSTED_VISUAL_URL || 'https://os-web-staging.onrender.com';
const OUT =
  process.env.OUT_DIR ||
  join(
    process.cwd(),
    'docs/operations/visual-system-pass-2026-09-15/shots/hosted-after',
  );
const SHA = process.env.HOSTED_VISUAL_SHA || '780a54eb7aca8ad1eada519e530fd1052753dc4c';

mkdirSync(OUT, { recursive: true });

function loadPasswordFor(email) {
  const fromEnv = process.env.HOSTED_VISUAL_PASSWORD;
  if (fromEnv && process.env.HOSTED_VISUAL_EMAIL === email) return fromEnv;
  const secretsDir = join(homedir(), '.isalwa-secrets');
  const candidates = [
    'isalwa-os-staging-wave2-role-passwords.json',
    'isalwa-os-staging-role-passwords.json',
    'staging-passwords.json',
  ];
  for (const name of candidates) {
    const path = join(secretsDir, name);
    if (!existsSync(path)) continue;
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    if (typeof raw === 'string') continue;
    if (raw[email]) return typeof raw[email] === 'string' ? raw[email] : raw[email].password;
    if (raw.passwords?.[email]) return raw.passwords[email];
    if (raw.roles) {
      for (const role of Object.values(raw.roles)) {
        if (role?.email === email && role?.password) return role.password;
      }
    }
    for (const value of Object.values(raw)) {
      if (value && typeof value === 'object' && value.email === email && value.password) {
        return value.password;
      }
    }
  }
  // Admin password file used historically for carmen.staging in some runs
  if (email.startsWith('carmen.')) {
    const adminPw = join(secretsDir, 'isalwa-os-staging-admin.password');
    if (existsSync(adminPw)) return readFileSync(adminPw, 'utf8').trim();
  }
  return null;
}

const PERSONAS = [
  {
    id: 'real',
    email: process.env.HOSTED_VISUAL_EMAIL || 'carmen.staging@isalwa.demo',
    routes: [
      '/inicio',
      '/clientes',
      '/oportunidades',
      '/cotizaciones',
      '/trabajo',
      '/aprobaciones',
      '/productos',
      '/produccion',
      '/almacen',
      '/compras',
      '/entregas',
      '/coordinacion',
      '/finanzas',
      '/mapa',
      '/ayuda',
      '/mensajes',
      '/administracion',
    ],
    openFirstCliente: true,
  },
  {
    id: 'synth-gerente',
    email: 'w2.gerente@isalwa.demo',
    routes: ['/inicio', '/mapa', '/produccion', '/finanzas', '/aprobaciones'],
    openFirstCliente: false,
  },
];

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 30000 });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 90000 }),
    page.click('button[type="submit"]'),
  ]);
}

async function shot(page, name, width, height) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(500);
  const file = join(OUT, `${name}-${width}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function runPersona(browser, persona) {
  const password = loadPasswordFor(persona.email);
  if (!password) {
    return { id: persona.id, email: persona.email, ok: false, reason: 'PASSWORD_MISSING' };
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  const files = [];
  try {
    await login(page, persona.email, password);
    files.push(await shot(page, `${persona.id}-after-login`, 1440, 900));

    // Font probe on inicio
    await page.goto(`${BASE}/inicio`, { waitUntil: 'networkidle', timeout: 90000 });
    const fonts = await page.evaluate(() => {
      const title =
        document.querySelector('h1, [class*="display"], .isalwa-display') ||
        document.querySelector('header h1, main h1');
      const body = document.body;
      const cs = (el) => (el ? getComputedStyle(el) : null);
      const t = cs(title);
      const b = cs(body);
      return {
        titleFont: t?.fontFamily || null,
        titleStyle: t?.fontStyle || null,
        bodyFont: b?.fontFamily || null,
        canvasBg: b?.backgroundColor || null,
      };
    });
    writeFileSync(join(OUT, `${persona.id}-font-probe.json`), JSON.stringify(fonts, null, 2));

    for (const route of persona.routes) {
      const slug = route.replace(/^\//, '').replace(/\//g, '-') || 'root';
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForTimeout(700);
      files.push(await shot(page, `${persona.id}-${slug}`, 1440, 900));
      files.push(await shot(page, `${persona.id}-${slug}`, 390, 844));
    }

    if (persona.openFirstCliente) {
      await page.goto(`${BASE}/clientes`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForTimeout(800);
      const href = await page.evaluate(() => {
        const link = document.querySelector('a[href^="/clientes/"]');
        return link ? link.getAttribute('href') : null;
      });
      if (href && href !== '/clientes/nuevo') {
        await page.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await page.waitForTimeout(900);
        files.push(await shot(page, `${persona.id}-cliente360`, 1440, 900));
        files.push(await shot(page, `${persona.id}-cliente360`, 390, 844));
      }
    }

    return { id: persona.id, email: persona.email, ok: true, files: files.length, fonts };
  } catch (error) {
    return {
      id: persona.id,
      email: persona.email,
      ok: false,
      reason: String(error?.message || error).slice(0, 200),
    };
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const results = [];
for (const persona of PERSONAS) {
  results.push(await runPersona(browser, persona));
}
await browser.close();

const receipt = {
  shaExpected: SHA,
  baseUrl: BASE,
  out: OUT,
  capturedAt: new Date().toISOString(),
  results: results.map((r) => ({
    id: r.id,
    email: r.email,
    ok: r.ok,
    reason: r.reason || null,
    files: r.files || 0,
    fonts: r.fonts || null,
  })),
};
writeFileSync(join(OUT, 'receipt.json'), JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt, null, 2));
if (!results.some((r) => r.ok)) process.exit(2);
