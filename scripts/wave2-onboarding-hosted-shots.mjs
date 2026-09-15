/**
 * Hosted onboarding acceptance shots. Never prints secrets.
 */
import { chromium } from 'playwright-core';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

const BASE = process.env.HOSTED_VISUAL_URL || 'https://os-web-staging.onrender.com';
const OUT =
  process.env.OUT_DIR ||
  join(process.cwd(), 'docs/operations/onboarding-pass-2026-09-15/shots');
const SHA = process.env.HOSTED_VISUAL_SHA || '4aea0e6089ddd0e9949c55544ea74efa1b515c6a';
const GUIDE_KEY = 'isalwa.os-web.guide.v1';

mkdirSync(OUT, { recursive: true });

function loadPassword(email) {
  const secrets = join(homedir(), '.isalwa-secrets');
  if (email.startsWith('carmen.')) {
    const admin = join(secrets, 'isalwa-os-staging-admin.password');
    if (existsSync(admin)) return readFileSync(admin, 'utf8').trim();
  }
  const path = join(secrets, 'isalwa-os-staging-wave2-role-passwords.json');
  if (!existsSync(path)) return null;
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  if (raw[email]) return typeof raw[email] === 'string' ? raw[email] : raw[email].password;
  for (const value of Object.values(raw)) {
    if (value && typeof value === 'object' && value.email === email && value.password) {
      return value.password;
    }
  }
  return null;
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 90000 }),
    page.click('button[type="submit"]'),
  ]);
}

async function shot(page, name, width = 1440, height = 900) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(600);
  const file = join(OUT, `${name}-${width}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function clearGuide(page) {
  await page.evaluate((key) => localStorage.removeItem(key), GUIDE_KEY);
}

async function setGuide(page, record) {
  await page.evaluate(
    ({ key, record }) => localStorage.setItem(key, JSON.stringify(record)),
    { key: GUIDE_KEY, record },
  );
}

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const email = 'carmen.staging@isalwa.demo';
const password = loadPassword(email);
if (!password) {
  console.error(JSON.stringify({ ok: false, reason: 'PASSWORD_MISSING' }));
  process.exit(2);
}

const context = await browser.newContext();
const page = await context.newPage();
const files = [];
const notes = [];

try {
  await login(page, email, password);

  // Fresh welcome
  await clearGuide(page);
  await page.goto(`${BASE}/inicio`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(800);
  files.push(await shot(page, '01-welcome', 1440, 900));
  files.push(await shot(page, '01-welcome', 390, 844));

  // Start intro
  const start = page.getByRole('button', { name: 'Conocer ISALWA' });
  if (await start.count()) {
    await start.click();
    await page.waitForTimeout(900);
  }
  files.push(await shot(page, '02-inicio-coach', 1440, 900));

  // Advance toward clientes
  const verClientes = page.getByRole('button', { name: 'Ver clientes' });
  if (await verClientes.count()) {
    await verClientes.click();
    await page.waitForTimeout(1200);
  } else {
    await page.goto(`${BASE}/clientes`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  }
  files.push(await shot(page, '03-clientes-coach', 1440, 900));

  // Open preferred customer
  const link = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('a[href^="/clientes/"]')];
    const alvarez = nodes.find((n) => (n.textContent || '').toUpperCase().includes('ALVAREZ'));
    const href = (alvarez || nodes.find((n) => /^\/clientes\/[^/]+$/.test(n.getAttribute('href') || '')))?.getAttribute('href');
    return href;
  });
  if (link) {
    await page.goto(`${BASE}${link}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(1000);
    files.push(await shot(page, '04-cliente360-coach', 1440, 900));
    files.push(await shot(page, '04-cliente360-coach', 390, 844));
    notes.push({ realCustomer: link });
  }

  await page.goto(`${BASE}/mapa`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(1000);
  files.push(await shot(page, '05-mapa-coach', 1440, 900));
  files.push(await shot(page, '05-mapa-coach', 390, 844));

  // Coverage probe
  const coverage = await page.evaluate(() => {
    const el = document.querySelector('[data-tour="map-coverage"]');
    return el?.textContent?.trim() ?? null;
  });
  notes.push({ mapCoverageText: coverage });

  // Finance jargon probe
  await page.goto(`${BASE}/finanzas`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(800);
  const financeText = await page.evaluate(() => document.body.innerText);
  notes.push({
    financeHasScopeKey: /finance\.operational\.record/.test(financeText),
    financeDenialSnippet: (financeText.match(/No tienes permiso[^\n]*/)?.[0] ?? null),
  });
  files.push(await shot(page, '06-finanzas', 1440, 900));

  // Ayuda + learning mode
  await page.goto(`${BASE}/ayuda`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(800);
  files.push(await shot(page, '07-ayuda', 1440, 900));

  // Force learning mode on/off via storage then reload
  await setGuide(page, {
    version: 2,
    currentJourneyId: null,
    stopIndex: 0,
    completedJourneyIds: [],
    panelHidden: true,
    welcomeSeen: true,
    introCompleted: true,
    introSkipped: false,
    introStepIndex: 6,
    learningModeEnabled: true,
    pageTourSeen: {},
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  files.push(await shot(page, '08-learning-on', 1440, 900));

  await setGuide(page, {
    version: 2,
    currentJourneyId: null,
    stopIndex: 0,
    completedJourneyIds: [],
    panelHidden: true,
    welcomeSeen: true,
    introCompleted: true,
    introSkipped: false,
    introStepIndex: 6,
    learningModeEnabled: false,
    pageTourSeen: {},
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  files.push(await shot(page, '09-learning-off', 1440, 900));

  // Ops desks
  for (const route of ['produccion', 'aprobaciones']) {
    await page.goto(`${BASE}/${route}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(700);
    files.push(await shot(page, `10-${route}`, 1440, 900));
  }

  writeFileSync(
    join(OUT, 'receipt.json'),
    JSON.stringify(
      {
        shaExpected: SHA,
        baseUrl: BASE,
        capturedAt: new Date().toISOString(),
        email,
        files: files.length,
        notes,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ ok: true, files: files.length, notes }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, reason: String(error?.message || error).slice(0, 300) }));
  process.exit(2);
} finally {
  await browser.close();
}
