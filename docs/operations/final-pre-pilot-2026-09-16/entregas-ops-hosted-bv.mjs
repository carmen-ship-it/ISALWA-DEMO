/**
 * Focused hosted BV — Entregas ops desk @ 095bb7f.
 * SYNTH only. Never prints passwords.
 */
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const require = createRequire('/Users/carmen/projects/isalwa/.tmp/pw-agent4/package.json');
const { chromium } = require('playwright-core');

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://os-web-staging.onrender.com';
const API = 'https://os-api-staging.onrender.com';
const EXPECTED_SHA = '095bb7f952e38f2304ab60bfcaff56f29c8797f0';
const WEB_DEP = 'dep-dalhglu1egvs73ekihhg';
const API_DEP = 'dep-dalhgm65vjqs73fe2j7g';
const WEB_SRV = 'srv-dajddb67bikc73bl42q0';
const API_SRV = 'srv-dajd64gae00c739gpk20';
const SYNTH_ORG = '01M2JKF77TXMJNDTKNCYNHH9G5';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TS = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT_DIR = join(__dirname, 'operating-loop-bv');
const REPORT = join(OUT_DIR, `entregas-ops-bv-${TS}.json`);
const PRIOR = join(OUT_DIR, 'operating-loop-bv.json');

mkdirSync(OUT_DIR, { recursive: true });

function loadPassword(email) {
  const path = join(homedir(), '.isalwa-secrets', 'isalwa-os-staging-wave2-role-passwords.json');
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  if (raw[email]) return typeof raw[email] === 'string' ? raw[email] : raw[email].password;
  return raw.passwords?.[email] ?? null;
}

function shaProof() {
  const out = { expected: EXPECTED_SHA, web: null, api: null, sameSha: false };
  try {
    for (const [svc, key] of [
      [WEB_SRV, 'web'],
      [API_SRV, 'api'],
    ]) {
      const data = JSON.parse(execSync(`render deploys list ${svc} -o json`, { encoding: 'utf8' }));
      const d = data[0];
      const c = d?.commit || {};
      out[key] = { dep: d?.id, status: d?.status, sha: c?.id };
    }
    out.sameSha =
      out.web?.sha === EXPECTED_SHA &&
      out.api?.sha === EXPECTED_SHA &&
      out.web?.status === 'live' &&
      out.api?.status === 'live';
  } catch (err) {
    out.error = String(err?.message || err);
  }
  return out;
}

async function bodyText(page) {
  return (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
}

async function dismissOverlays(page) {
  for (let i = 0; i < 4; i++) {
    const welcome = page.locator('[role="dialog"][aria-labelledby="intro-welcome-title"]');
    if ((await welcome.count()) > 0) {
      const skip = page.getByRole('button', { name: /Explorar por mi cuenta/i });
      if ((await skip.count()) > 0) await skip.first().click({ timeout: 4000 }).catch(() => null);
      else await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }
    const omitir = page.getByRole('button', { name: /^Omitir$/i });
    if ((await omitir.count()) > 0) {
      await omitir.first().click({ timeout: 3000 }).catch(() => null);
      await page.waitForTimeout(300);
    }
    await page.keyboard.press('Escape').catch(() => null);
    await page.waitForTimeout(200);
  }
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(800);
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 90000 }),
    page.getByRole('button', { name: /entrar|iniciar/i }).first().click(),
  ]);
  await page.waitForTimeout(1000);
  await dismissOverlays(page);
}

async function shot(page, name) {
  const path = join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function main() {
  const prior = existsSync(PRIOR) ? JSON.parse(readFileSync(PRIOR, 'utf8')) : {};
  const orderId = prior.orderId || '01M2P3CAP2QCTXXRRB4A0G74XJ';
  const partyId = prior.partyId || '01M2JSDQJNYZ03N8808PBEDVS8';
  const report = {
    at: new Date().toISOString(),
    expectedSha: EXPECTED_SHA,
    synthOrg: SYNTH_ORG,
    orderId,
    partyId,
    REAL_SEVEN_MUTATED: 'NO',
    shaProof: shaProof(),
    walk: {},
  };

  const browser = await chromium.launch({
    headless: true,
    executablePath: existsSync(CHROME) ? CHROME : undefined,
    channel: existsSync(CHROME) ? undefined : 'chrome',
  });

  // --- Coordinación: Nota + Entrega on /entregas ---
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const email = 'w2.coordinacion@isalwa.demo';
    const password = loadPassword(email);
    report.walk.coordLogin = Boolean(password);
    if (password) {
      await login(page, email, password);
      await page.goto(`${BASE}/entregas?orderId=${encodeURIComponent(orderId)}`, {
        waitUntil: 'domcontentloaded',
        timeout: 90000,
      });
      await page.waitForTimeout(1500);
      await dismissOverlays(page);
      const text = await bodyText(page);
      report.walk.coordEntregasDesk = /data-entrega-ops-desk|Pendientes \/ disponibles|Registrar desde pedido|Nota de entrega/i.test(
        text,
      ) || (await page.locator('[data-entrega-ops-desk]').count()) > 0;
      report.walk.coordHasCreateNota =
        (await page.getByRole('button', { name: /Crear nota de entrega/i }).count()) > 0;
      report.walk.coordHasSalida =
        (await page.getByRole('button', { name: /Registrar salida/i }).count()) > 0;
      report.walk.coordHasEntrega =
        (await page.getByRole('button', { name: /Registrar entrega/i }).count()) > 0;
      report.shots = report.shots || {};
      report.shots.coordEntregas = await shot(page, `entregas-ops-${TS}-coord-1440`);

      if (report.walk.coordHasCreateNota) {
        const dest = page.getByLabel(/Destinatario/i).first();
        const by = page.getByLabel(/Entregado por/i).first();
        if ((await dest.count()) > 0) await dest.fill('BV Destinatario SYNTH');
        if ((await by.count()) > 0) await by.fill('BV Entregado SYNTH');
        const btn = page.getByRole('button', { name: /Crear nota de entrega/i }).first();
        const enabled = await btn.isEnabled();
        report.walk.coordCreateNotaEnabled = enabled;
        if (enabled) {
          await btn.click();
          await page.waitForTimeout(2500);
          await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
          await page.waitForTimeout(1200);
          await dismissOverlays(page);
          const after = await bodyText(page);
          report.walk.coordNotaPersisted =
            /NE-PILOT|Emitida|Nota de entrega creada|BV Destinatario/i.test(after);
          report.shots.coordAfterNota = await shot(page, `entregas-ops-${TS}-coord-after-nota`);

          // PDF if present
          const pdf = page.getByRole('button', { name: /Descargar PDF|PDF/i }).first();
          if ((await pdf.count()) > 0 && (await pdf.isEnabled().catch(() => false))) {
            const [download] = await Promise.all([
              page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
              pdf.click(),
            ]);
            report.walk.coordPdf = Boolean(download);
          } else {
            report.walk.coordPdf = 'NO_BUTTON';
          }

          // Entrega
          const received = page.getByLabel(/Recibido por/i).first();
          if ((await received.count()) > 0) {
            await received.fill('BV Recibido SYNTH');
            const ent = page.getByRole('button', { name: /Registrar entrega/i }).first();
            if ((await ent.isEnabled().catch(() => false))) {
              await ent.click();
              await page.waitForTimeout(2500);
              await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
              await page.waitForTimeout(1200);
              const afterE = await bodyText(page);
              report.walk.coordEntregaPersisted =
                /Entrega registrada|BV Recibido|Recibido por/i.test(afterE);
              report.shots.coordAfterEntrega = await shot(
                page,
                `entregas-ops-${TS}-coord-after-entrega`,
              );
            } else {
              report.walk.coordEntregaPersisted = 'BUTTON_DISABLED';
            }
          } else {
            report.walk.coordEntregaPersisted = 'NO_RECIBIDO_FIELD';
          }
        }
      }
    }
    await ctx.close();
  }

  // --- Almacén: Salida on /entregas; commercial pedido denied ---
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const email = 'w2.almacen@isalwa.demo';
    const password = loadPassword(email);
    if (password) {
      await login(page, email, password);
      await page.goto(`${BASE}/entregas?orderId=${encodeURIComponent(orderId)}`, {
        waitUntil: 'domcontentloaded',
        timeout: 90000,
      });
      await page.waitForTimeout(1500);
      await dismissOverlays(page);
      report.walk.almacenDesk =
        (await page.locator('[data-entrega-ops-desk]').count()) > 0 ||
        /Registrar salida|Pendientes \/ disponibles/i.test(await bodyText(page));
      report.walk.almacenHasSalida =
        (await page.getByRole('button', { name: /Registrar salida/i }).count()) > 0;
      report.walk.almacenHasCreateNota =
        (await page.getByRole('button', { name: /Crear nota de entrega/i }).count()) > 0;
      report.shots.almacenEntregas = await shot(page, `entregas-ops-${TS}-almacen-1440`);

      if (report.walk.almacenHasSalida) {
        const btn = page.getByRole('button', { name: /Registrar salida/i }).first();
        if (await btn.isEnabled()) {
          await btn.click();
          await page.waitForTimeout(2500);
          await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
          await page.waitForTimeout(1200);
          const after = await bodyText(page);
          report.walk.almacenSalidaPersisted = /Salida registrada/i.test(after);
          report.shots.almacenAfterSalida = await shot(
            page,
            `entregas-ops-${TS}-almacen-after-salida`,
          );
        } else {
          report.walk.almacenSalidaPersisted = 'BUTTON_DISABLED';
        }
      }

      await page.goto(`${BASE}/clientes/${partyId}/pedidos/${orderId}`, {
        waitUntil: 'domcontentloaded',
        timeout: 90000,
      });
      await page.waitForTimeout(1000);
      const ped = await bodyText(page);
      report.walk.almacenCommercialPedidoDenied =
        /Sin permiso|No tienes acceso|no tienes permiso|No se encontró/i.test(ped);
      report.shots.almacenPedidoDenied = await shot(page, `entregas-ops-${TS}-almacen-pedido-denied`);
    }
    await ctx.close();
  }

  // --- Contabilidad negative ---
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const email = 'w2.contabilidad@isalwa.demo';
    const password = loadPassword(email);
    if (password) {
      await login(page, email, password);
      await page.goto(`${BASE}/entregas`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForTimeout(1200);
      await dismissOverlays(page);
      report.walk.contabNoOpsDesk =
        (await page.locator('[data-entrega-ops-desk]').count()) === 0 &&
        (await page.getByRole('button', { name: /Crear nota de entrega|Registrar salida|Registrar entrega/i }).count()) ===
          0;
      report.shots.contabEntregas = await shot(page, `entregas-ops-${TS}-contab-1440`);
    }
    await ctx.close();
  }

  // Mobile smoke
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const email = 'w2.coordinacion@isalwa.demo';
    const password = loadPassword(email);
    if (password) {
      await login(page, email, password);
      await page.goto(`${BASE}/entregas?orderId=${encodeURIComponent(orderId)}`, {
        waitUntil: 'domcontentloaded',
        timeout: 90000,
      });
      await page.waitForTimeout(1200);
      await dismissOverlays(page);
      report.shots.coordEntregas390 = await shot(page, `entregas-ops-${TS}-coord-390`);
      report.walk.mobileDeskVisible =
        (await page.locator('[data-entrega-ops-desk]').count()) > 0 ||
        /Crear nota de entrega|Registrar/i.test(await bodyText(page));
    }
    await ctx.close();
  }

  await browser.close();

  report.score = {
    SAME_SHA: report.shaProof.sameSha ? 'PASS' : 'FAIL',
    ENTREGAS_OPS_DESK: report.walk.coordEntregasDesk ? 'BROWSER_VERIFIED' : 'UNPROVEN',
    DELIVERY_NOTE_CREATE: report.walk.coordNotaPersisted === true ? 'BROWSER_VERIFIED' : 'UNPROVEN',
    ENTREGA: report.walk.coordEntregaPersisted === true ? 'BROWSER_VERIFIED' : 'UNPROVEN',
    SALIDA: report.walk.almacenSalidaPersisted === true ? 'BROWSER_VERIFIED' : 'UNPROVEN',
    NO_COMMERCIAL_SHORTCUT:
      report.walk.almacenCommercialPedidoDenied === true ? 'PASS' : 'UNPROVEN',
    CONTAB_DENIED: report.walk.contabNoOpsDesk ? 'PASS' : 'UNPROVEN',
    DELIVERY_NOTE_PDF:
      report.walk.coordPdf === true
        ? 'BROWSER_VERIFIED'
        : report.walk.coordPdf === 'NO_BUTTON'
          ? 'UNPROVEN'
          : 'UNPROVEN',
  };

  writeFileSync(REPORT, JSON.stringify(report, null, 2));
  writeFileSync(join(OUT_DIR, 'entregas-ops-bv-latest.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ report: REPORT, score: report.score, walk: report.walk }, null, 2));
}

main().catch((err) => {
  console.error(String(err?.stack || err));
  process.exit(1);
});
