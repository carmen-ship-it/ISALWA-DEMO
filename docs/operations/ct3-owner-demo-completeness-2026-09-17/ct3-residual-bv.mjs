/**
 * CT3 residual hosted BV — DN PDF (coordinacion) + Story Mode (people-admin).
 * Secret-safe: never prints passwords. Writes /tmp/ct3-bv/results-residual.json
 */
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const require = createRequire('/Users/carmen/projects/isalwa/.tmp/pw-agent4/package.json');
const { chromium } = require('playwright-core');

const BASE = 'https://os-web-staging.onrender.com';
const FINAL = 'bd8b070806a0f09e6be5d98cc644d92122e58662';
const seeded = JSON.parse(
  readFileSync(
    '/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo/apps/os-web/lib/demo/seeded-ids.json',
    'utf8',
  ),
);

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

mkdirSync('/tmp/ct3-bv', { recursive: true });
const results = { FINAL, startedAt: new Date().toISOString(), checks: {} };
const ok = (n, p, d = '') => {
  results.checks[n] = { pass: !!p, detail: String(d).slice(0, 400) };
  console.log(p ? 'PASS' : 'FAIL', n);
};

const browser = await chromium.launch({ headless: true, channel: 'chrome' });

// --- DN PDF via coordinacion (delivery.record) ---
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const email = 'w2.coordinacion@isalwa.demo';
  const logged = await login(page, email);
  ok('coord_login', logged.ok, logged.reason || 'ok');
  if (logged.ok) {
    const r = await page.request.get(`${BASE}${seeded.hrefHints.deliveryNotePdf}`);
    ok('dn_pdf_http', r.status() === 200, String(r.status()));
    const ct = r.headers()['content-type'] || '';
    ok('dn_pdf_content_type', /pdf|octet/i.test(ct), ct);
  }
  await page.close();
}

// --- Story Mode via people-admin (canUseRolePreview) ---
{
  const candidates = [
    'w2.people-admin@isalwa.demo',
    'w2.owner@isalwa.demo',
    'w2.gerente@isalwa.demo',
  ];
  let storyPassed = false;
  let actorUsed = null;
  for (const email of candidates) {
    if (!loadPassword(email)) continue;
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const logged = await login(page, email);
    ok(`login_${email.split('@')[0]}`, logged.ok, logged.reason || 'ok');
    if (!logged.ok) {
      await page.close();
      continue;
    }
    await page.goto(`${BASE}/inicio?datos=demo&story=1`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await dismissOverlays(page);
    await page.waitForTimeout(1500);
    let body = await page.locator('body').innerText();
    const hasStory =
      /Paso 1 de 20|Recorrido completo|Salir del recorrido/i.test(body) &&
      /Siguiente/i.test(body) &&
      /Anterior/i.test(body);
    if (!hasStory) {
      const btn = page.getByRole('button', { name: /Ver recorrido completo/i }).first();
      if (await btn.count()) {
        await btn.click({ force: true });
        await page.waitForTimeout(1200);
        body = await page.locator('body').innerText();
      }
    }
    const pass =
      /Siguiente/i.test(body) &&
      /Anterior/i.test(body) &&
      /Salir del recorrido|Salir/i.test(body) &&
      /DEMO|Paso \d+ de 20/i.test(body);
    ok(`story_mode_${email.split('@')[0]}`, pass, pass ? 'opened' : 'missing_controls');
    if (pass) {
      storyPassed = true;
      actorUsed = email;
      // step once
      await page.getByRole('button', { name: /^Siguiente$/i }).click({ force: true }).catch(() => null);
      await page.waitForTimeout(500);
      const after = await page.locator('body').innerText();
      ok('story_mode_next', /Paso 2 de 20/i.test(after), 'step2');
      await page.close();
      break;
    }
    await page.close();
  }
  ok('story_mode_any_admin', storyPassed, actorUsed || 'none');
}

results.finishedAt = new Date().toISOString();
results.passCount = Object.values(results.checks).filter((c) => c.pass).length;
results.failCount = Object.values(results.checks).filter((c) => !c.pass).length;
writeFileSync('/tmp/ct3-bv/results-residual.json', JSON.stringify(results, null, 2));
console.log('SUMMARY', results.passCount, 'pass', results.failCount, 'fail');
await browser.close();
process.exit(results.failCount ? 2 : 0);
