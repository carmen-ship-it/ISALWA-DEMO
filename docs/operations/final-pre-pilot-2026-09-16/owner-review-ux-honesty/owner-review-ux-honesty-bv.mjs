/**
 * Hosted BV: owner-review UX honesty — carmen.staging READ-SAFE @1440.
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
const REPORT = join(OUT_DIR, 'owner-review-ux-honesty-bv.json');
const EXPECTED_SHA = '2c931b48fc2ef7370972c75872de066c8bf5c34b';

mkdirSync(OUT_DIR, { recursive: true });
console.log('start', new Date().toISOString());

function loadPassword(email) {
  const secretsDir = join(homedir(), '.isalwa-secrets');
  const p = join(secretsDir, 'isalwa-os-staging-admin.password');
  if (email.startsWith('carmen.') && existsSync(p)) return readFileSync(p, 'utf8').trim();
  return null;
}

function norm(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

async function dismissWelcome(page) {
  for (let i = 0; i < 5; i++) {
    const btn = page.getByRole('button', { name: /omitir|explorar|continuar|cerrar/i }).first();
    if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
      await btn.click({ timeout: 2000 }).catch(() => null);
      await page.waitForTimeout(300);
      continue;
    }
    break;
  }
}

async function main() {
  const password = loadPassword(EMAIL);
  if (!password) {
    writeFileSync(REPORT, JSON.stringify({ ok: false, error: 'PASSWORD_MISSING' }, null, 2));
    console.log('PASSWORD_MISSING');
    process.exit(1);
  }

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--disable-dev-shm-usage'],
  });
  console.log('browser launched');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(45000);

  const report = {
    email: EMAIL,
    base: BASE,
    expectedSha: EXPECTED_SHA,
    at: new Date().toISOString(),
    realSevenMutated: false,
    surfaces: {},
  };

  try {
    console.log('login…');
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.fill('input[type="email"], input[name="email"]', EMAIL);
    await page.fill('input[type="password"], input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);
    await dismissWelcome(page);
    report.loginOk = !page.url().includes('/login');
    console.log('loginOk', report.loginOk, page.url());

    async function visit(path, shot) {
      console.log('goto', path);
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForTimeout(1500);
      await dismissWelcome(page);
      await page.waitForTimeout(400);
      const body = norm(await page.locator('body').innerText());
      const shotPath = join(OUT_DIR, shot);
      await page.screenshot({ path: shotPath, fullPage: true });
      const tokens = await page.evaluate(() => {
        const cs = getComputedStyle(document.body);
        const root = getComputedStyle(document.documentElement);
        return {
          bodyBg: cs.backgroundColor,
          kiln: root.getPropertyValue('--isalwa-kiln').trim(),
          glaze: root.getPropertyValue('--isalwa-glaze').trim(),
          porcelain: root.getPropertyValue('--isalwa-porcelain').trim(),
          sidebarPresent: Boolean(document.querySelector('nav, aside, [data-shell-sidebar]')),
        };
      });
      return { path, shot: shotPath, bodySnippet: body.slice(0, 1200), body, tokens };
    }

    const almacen = await visit('/almacen', 'owner-review-almacen-1440.png');
    report.surfaces.almacen = {
      ...almacen,
      checks: {
        v1Validate:
          /Versión 1 · por validar/i.test(almacen.body) &&
          /producto terminado con los pedidos/i.test(almacen.body),
        noFakeAssignCta: !/\bAsignar al pedido\b/i.test(almacen.body),
        notAuthConfusion: !/Sin permiso de almacén/i.test(almacen.body),
        noDataVisible: /Todavía no hay producto|No hay pedidos|Qué puedo asignar|Qué está esperando/i.test(
          almacen.body,
        ),
      },
    };
    delete report.surfaces.almacen.body;

    const compras = await visit('/compras', 'owner-review-compras-1440.png');
    report.surfaces.compras = {
      ...compras,
      checks: {
        v1Validate:
          /Versión 1 · por validar/i.test(compras.body) &&
          /estructura propuesta para Compras/i.test(compras.body),
        noFakePersistCreate: !/\b(Crear pedido de compra|Guardar solicitud|Registrar compra)\b/i.test(
          compras.body,
        ),
        notAuthConfusion: !/Sin permiso para la cola de compras/i.test(compras.body),
        emptyIsV1: /Cola de compras · estructura propuesta|formalizar el registro/i.test(compras.body),
      },
    };
    delete report.surfaces.compras.body;

    const entregas = await visit('/entregas', 'owner-review-entregas-1440.png');
    report.surfaces.entregas = {
      ...entregas,
      checks: {
        v1Validate:
          /Versión 1 · por validar/i.test(entregas.body) &&
          /contexto que tendrá una entrega/i.test(entregas.body),
        noFakeWriteCta: !/\b(Registrar salida|Registrar entrega|Guardar salida|Guardar entrega)\b/i.test(
          entregas.body,
        ),
        notAuthConfusion: !/No tiene permiso para ver este registro de entrega/i.test(entregas.body),
        noDataVisible: /Todavía no hay|Sin movimientos|Sin pedidos/i.test(entregas.body),
      },
    };
    delete report.surfaces.entregas.body;

    const finanzas = await visit('/finanzas', 'owner-review-finanzas-1440.png');
    // Ensure Pedido subject type so empty-orders copy is visible
    const typeSelect = page.locator('#finance-subject-type, select[name="subjectType"]').first();
    if (await typeSelect.count()) {
      await typeSelect.selectOption({ label: 'Pedido' }).catch(async () => {
        await typeSelect.selectOption('order').catch(() => null);
      });
      await page.waitForTimeout(800);
    }
    const finBody = norm(await page.locator('body').innerText());
    await page.screenshot({ path: join(OUT_DIR, 'owner-review-finanzas-1440.png'), fullPage: true });
    report.surfaces.finanzas = {
      path: '/finanzas',
      shot: join(OUT_DIR, 'owner-review-finanzas-1440.png'),
      bodySnippet: finBody.slice(0, 1200),
      tokens: finanzas.tokens,
      checks: {
        availableCopy: /No hay pedidos abiertos disponibles para vincular en este momento/i.test(finBody),
        noAutorizadosCopy: !/pedidos abiertos autorizados para vincular/i.test(finBody),
        notPermissionTitle: !/Sin permiso para el registro operativo/i.test(finBody),
        hasSubjectUi: /Tipo de sujeto|Seleccionar pedido|Buscar cliente/i.test(finBody),
      },
    };

    const s = report.surfaces;
    report.ALMACEN_OWNER_REVIEW_STATE =
      s.almacen.checks.v1Validate && s.almacen.checks.noFakeAssignCta && s.almacen.checks.notAuthConfusion
        ? 'PASS'
        : 'FAIL';
    report.COMPRAS_OWNER_REVIEW_STATE =
      s.compras.checks.v1Validate && s.compras.checks.noFakePersistCreate && s.compras.checks.emptyIsV1
        ? 'PASS'
        : 'FAIL';
    report.ENTREGAS_OWNER_REVIEW_STATE =
      s.entregas.checks.v1Validate && s.entregas.checks.noFakeWriteCta && s.entregas.checks.notAuthConfusion
        ? 'PASS'
        : 'FAIL';
    report.FINANZAS_COPY_STATE =
      s.finanzas.checks.availableCopy &&
      s.finanzas.checks.noAutorizadosCopy &&
      s.finanzas.checks.notPermissionTitle
        ? 'PASS'
        : 'FAIL';
    report.NO_FAKE_WRITE_CTA =
      s.almacen.checks.noFakeAssignCta &&
      s.compras.checks.noFakePersistCreate &&
      s.entregas.checks.noFakeWriteCta
        ? 'YES'
        : 'NO';

    const tok = s.almacen.tokens;
    const porcelain =
      /rgb\(\s*246,\s*241,\s*232\s*\)/i.test(tok.bodyBg) || /#f6f1e8/i.test(tok.porcelain);
    report.VISUAL_NO_REGRESSION =
      tok.sidebarPresent && porcelain && Boolean(tok.kiln) && Boolean(tok.glaze) ? 'PASS' : 'FAIL';
    report.visualDetail = tok;

    report.ok =
      report.ALMACEN_OWNER_REVIEW_STATE === 'PASS' &&
      report.COMPRAS_OWNER_REVIEW_STATE === 'PASS' &&
      report.ENTREGAS_OWNER_REVIEW_STATE === 'PASS' &&
      report.FINANZAS_COPY_STATE === 'PASS' &&
      report.NO_FAKE_WRITE_CTA === 'YES' &&
      report.VISUAL_NO_REGRESSION === 'PASS';
  } catch (err) {
    report.ok = false;
    report.error = String(err?.stack || err);
    console.error('ERR', report.error);
  } finally {
    await browser.close().catch(() => null);
    writeFileSync(REPORT, JSON.stringify(report, null, 2));
    console.log(
      JSON.stringify(
        {
          ok: report.ok,
          ALMACEN: report.ALMACEN_OWNER_REVIEW_STATE,
          COMPRAS: report.COMPRAS_OWNER_REVIEW_STATE,
          ENTREGAS: report.ENTREGAS_OWNER_REVIEW_STATE,
          FINANZAS: report.FINANZAS_COPY_STATE,
          NO_FAKE_WRITE_CTA: report.NO_FAKE_WRITE_CTA,
          VISUAL: report.VISUAL_NO_REGRESSION,
        },
        null,
        2,
      ),
    );
  }
  process.exit(report.ok ? 0 : 1);
}

main();
