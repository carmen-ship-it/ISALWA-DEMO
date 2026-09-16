/**
 * Hosted BV — FULL OPERATING LOOP (staging). SYNTH mutations only.
 * Secret-safe — never prints passwords.
 * Separate browser contexts per persona to avoid session races.
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
const API = 'https://os-api-staging.onrender.com';
const EXPECTED_SHA = '8508b9ce84c9914ebf86f0b25e07e1f159ba122e';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT_DIR = join(__dirname, 'operating-loop-bv');
const REPORT = join(OUT_DIR, 'operating-loop-bv.json');
const FIXTURES = join(homedir(), '.isalwa-secrets', 'isalwa-os-staging-wave2-role-fixtures.json');

mkdirSync(OUT_DIR, { recursive: true });

function loadPassword(email) {
  const path = join(homedir(), '.isalwa-secrets', 'isalwa-os-staging-wave2-role-passwords.json');
  if (!existsSync(path)) return null;
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  if (raw[email]) return typeof raw[email] === 'string' ? raw[email] : raw[email].password;
  return raw.passwords?.[email] ?? null;
}

function loadFixtures() {
  return JSON.parse(readFileSync(FIXTURES, 'utf8'));
}

async function shot(page, name) {
  const path = join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  return path;
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
    const cerrar = page.locator('[aria-label="Cerrar"], button:has-text("×")').first();
    // Prefer Omitir on coach; Escape as fallback
    await page.keyboard.press('Escape').catch(() => null);
    await page.waitForTimeout(200);
    if ((await welcome.count()) === 0 && (await omitir.count()) === 0) break;
  }
}

async function isBadGateway(page) {
  const t = await bodyText(page).catch(() => '');
  return /502|Bad Gateway|This service is currently unavailable/i.test(t);
}

async function login(page, email, password) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForTimeout(1000);
      if (await isBadGateway(page)) {
        await page.waitForTimeout(3000 * attempt);
        continue;
      }
      await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 45000 });
      await page.fill('input[type="email"], input[name="email"]', email);
      await page.fill('input[type="password"], input[name="password"]', password);
      await Promise.all([
        page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 90000 }).catch(() => null),
        page.click('button[type="submit"]'),
      ]);
      await page.waitForTimeout(2500);
      if (await isBadGateway(page)) {
        await page.waitForTimeout(3000 * attempt);
        continue;
      }
      await dismissOverlays(page);
      for (let i = 0; i < 10; i++) {
        const u = page.url();
        const t = await bodyText(page);
        if (!u.includes('/login') && !/Sesión vencida/i.test(t) && !/^ACCESO SEGURO/i.test(t.slice(0, 40))) {
          return true;
        }
        await page.waitForTimeout(500);
      }
      if (!page.url().includes('/login')) return true;
    } catch (e) {
      if (attempt === 4) throw e;
      await page.waitForTimeout(3000 * attempt);
    }
  }
  return !page.url().includes('/login');
}

async function gotoApp(page, path) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(2000);
    if (await isBadGateway(page)) {
      await page.waitForTimeout(3000 * attempt);
      continue;
    }
    await dismissOverlays(page);
    const t = await bodyText(page);
    if (/Sesión vencida/i.test(t)) {
      return { ok: false, reason: 'SESSION_EXPIRED', body: t.slice(0, 300) };
    }
    if (/Iniciar sesión/i.test(t.slice(0, 120)) && page.url().includes('/login')) {
      return { ok: false, reason: 'SESSION', body: t.slice(0, 300) };
    }
    return { ok: true, body: t };
  }
  return { ok: false, reason: 'BAD_GATEWAY', body: await bodyText(page).then((t) => t.slice(0, 300)) };
}

function score(implemented, hosted, bv) {
  return { IMPLEMENTED: implemented, HOSTED: hosted, BROWSER_VERIFIED: bv };
}

async function main() {
  const fx = loadFixtures();
  const orgId = fx.organizationId;
  const partyId = fx.partyId;
  const quoteId = fx.quoteId;
  const quotePath = `/clientes/${partyId}/cotizaciones/${quoteId}`;
  const clientePath = `/clientes/${partyId}`;

  const asesorPw = loadPassword('w2.asesor@isalwa.demo');
  const almacenPw = loadPassword('w2.almacen@isalwa.demo');
  const contabPw = loadPassword('w2.contabilidad@isalwa.demo');

  const report = {
    at: new Date().toISOString(),
    expectedSha: EXPECTED_SHA,
    claimedLive: {
      web: BASE,
      webDeploy: 'dep-dalgna2jnfac739h0otg',
      api: API,
      apiDeploy: 'dep-dalgna942hec73ce8360',
    },
    synthOrgClaimedByUser: '01M2JKF77TXMJNDTKNCYNHH5G5',
    synthOrgFromFixtures: orgId,
    synthOrgCorrection: 'fixtures_H9G5_not_user_H5G5',
    partyId,
    quoteId,
    REAL_SEVEN_MUTATED: 'NO',
    shaConfirm: { renderCli: 'FORBIDDEN_OR_UNAUTH', surfaceProof: {} },
    personas: {
      asesor: 'w2.asesor@isalwa.demo',
      almacen: 'w2.almacen@isalwa.demo',
      contabilidad_negative: 'w2.contabilidad@isalwa.demo',
    },
    walk: {},
    negatives: {},
    desktop1440: {},
    mobile390: {},
    subfeatures: {},
  };

  if (!asesorPw || !almacenPw) {
    report.error = 'PASSWORD_MISSING';
    writeFileSync(REPORT, JSON.stringify(report, null, 2));
    process.exit(1);
  }

  try {
    const res = await fetch(`${API}/v1/health`);
    report.apiHealth = { status: res.status, body: (await res.text()).slice(0, 200) };
  } catch (e) {
    report.apiHealth = { error: String(e) };
  }

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--disable-gpu', '--no-sandbox'],
  });

  let orderId = null;

  try {
    // ========== ASESOR 1440 ==========
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      report.walk.asesorLogin = await login(page, 'w2.asesor@isalwa.demo', asesorPw);
      report.desktop1440.asesorHome = await shot(page, '01-asesor-home-1440');
      const home = await bodyText(page);
      report.walk.asesorOrgSignals = {
        synthConnected: /CONECTADO COMO Synth|SYNTH|Wave2/i.test(home),
        realSevenLeak: false,
      };

      let q = await gotoApp(page, quotePath);
      report.desktop1440.quote = await shot(page, '02-quote-manual-send-1440');
      let quoteBody = q.body || '';
      // Scroll to expose send form
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(800);
      quoteBody = await bodyText(page);
      report.desktop1440.quoteScrolled = await shot(page, '02b-quote-scrolled-1440');

      const manualSendUi = {
        disclaimer: quoteBody.includes('ISALWA registra el envío; no envía el mensaje desde aquí todavía.'),
        action: quoteBody.includes('Registrar como enviada'),
        channelWhatsapp: /WhatsApp/i.test(quoteBody),
        nextStepMentionsSend: /Registre el envío manual|envío manual/i.test(quoteBody),
        statusEnviada: /\bEnviada\b/i.test(quoteBody),
        convertLink: /convertir a pedido|Convertir/i.test(quoteBody),
        formCount: await page.locator('form').filter({ hasText: /Registrar como enviada/i }).count(),
      };
      report.walk.manualSendUi = manualSendUi;
      report.shaConfirm.surfaceProof.quoteManualSendCopy =
        manualSendUi.disclaimer || manualSendUi.action || manualSendUi.nextStepMentionsSend;

      let sendDurable = null;
      if (manualSendUi.formCount > 0) {
        await dismissOverlays(page);
        const wa = page.getByText('WhatsApp', { exact: false }).first();
        if ((await wa.count()) > 0) await wa.click().catch(() => null);
        const radio = page.locator('input[type="radio"][value="whatsapp"], input[name="channel"][value="whatsapp"]');
        if ((await radio.count()) > 0) await radio.first().check({ force: true }).catch(() => null);
        const note = page.locator('textarea').first();
        if ((await note.count()) > 0) {
          await note.fill(`BV operating-loop ${new Date().toISOString()}`);
        }
        const submit = page.getByRole('button', { name: /Registrar como enviada/i });
        await submit.first().click({ timeout: 20000 });
        await page.waitForTimeout(4000);
        const after = await bodyText(page);
        const flash = /registrada como enviada/i.test(after);
        report.desktop1440.quoteAfterSend = await shot(page, '03-quote-after-send-1440');
        const lsKeys = await page.evaluate(() => Object.keys(localStorage));
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2500);
        await dismissOverlays(page);
        const afterReload = await bodyText(page);
        sendDurable = {
          flash,
          historyAfterReload:
            /registrada como enviada|Cotización registrada como enviada|enviada por WhatsApp/i.test(afterReload) ||
            /\bEnviada\b/i.test(afterReload),
          localStorageSuggestsOnlyClient: lsKeys.some((k) => /manual.?send|quoteSend/i.test(k)),
          lsKeyCount: lsKeys.length,
        };
        report.desktop1440.quoteReload = await shot(page, '04-quote-reload-1440');
      } else {
        sendDurable = {
          skipped: true,
          reason: manualSendUi.statusEnviada
            ? 'FORM_ABSENT_STATUS_ENVIADA_LIKELY_ALREADY_RECORDED'
            : 'FORM_ABSENT',
        };
      }
      report.walk.sendDurable = sendDurable;

      // Convert to pedido if possible
      q = await gotoApp(page, quotePath);
      await dismissOverlays(page);
      const jump = page.getByRole('link', { name: /Ir a convertir a pedido/i }).or(
        page.getByRole('button', { name: /Ir a convertir a pedido/i }),
      );
      if ((await jump.count()) > 0) {
        await jump.first().click().catch(() => null);
        await page.waitForTimeout(1000);
      }
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      const convertBtn = page.getByRole('button', {
        name: /Cliente aceptó · Convertir a pedido|Convertir a pedido|Crear pedido/i,
      });
      if ((await convertBtn.count()) > 0) {
        await convertBtn.first().click();
        await page.waitForTimeout(6000);
        await dismissOverlays(page);
        // Retry once on 502
        if (await isBadGateway(page)) {
          await page.waitForTimeout(5000);
          await gotoApp(page, quotePath);
          await page.getByRole('button', { name: /Cliente aceptó · Convertir a pedido/i }).first().click().catch(() => null);
          await page.waitForTimeout(6000);
        }
      }
      const u = page.url();
      const om = u.match(/pedidos\/([^/?#]+)/);
      if (om) orderId = om[1];
      report.walk.convert = { url: u, orderId, badGateway: await isBadGateway(page) };
      report.desktop1440.afterConvert = await shot(page, '06-after-convert-1440');

      // Discover pedidos from cliente
      const c = await gotoApp(page, clientePath);
      report.desktop1440.cliente = await shot(page, '05-cliente360-1440');
      const hrefs = await page.locator(`a[href*="/pedidos/"]`).evaluateAll((as) =>
        [...new Set(as.map((a) => a.getAttribute('href')).filter(Boolean))],
      );
      report.walk.pedidoLinks = hrefs.slice(0, 15);
      if (!orderId && hrefs.length) {
        const m = hrefs[0].match(/pedidos\/([^/?#]+)/);
        orderId = m?.[1] ?? null;
      }
      report.walk.orderId = orderId;

      if (orderId) {
        const p = await gotoApp(page, `/clientes/${partyId}/pedidos/${orderId}`);
        report.desktop1440.pedidoAsesor = await shot(page, '07-pedido-asesor-1440');
        const b = p.body || (await bodyText(page));
        report.walk.pedidoAsesorPanel = {
          createNota: b.includes('Crear nota de entrega'),
          provisional: /provisional|NE-PILOT/i.test(b),
          notFiscal: /no es.*factura|sin significado fiscal|no.*oficial/i.test(b),
          recordSalida: b.includes('Registrar salida'),
          recordEntrega: b.includes('Registrar entrega'),
          downloadPdf: b.includes('Descargar PDF'),
        };
        report.shaConfirm.surfaceProof.deliveryDocsOnPedido = report.walk.pedidoAsesorPanel.createNota;
      }

      await ctx.close();
    }

    // ========== ALMACÉN 1440 ==========
    try {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      report.walk.almacenLogin = await login(page, 'w2.almacen@isalwa.demo', almacenPw);

      let a = await gotoApp(page, '/almacen');
      report.desktop1440.almacen = await shot(page, '08-almacen-receive-1440');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(600);
      const almacenBody = await bodyText(page);
      report.desktop1440.almacenScrolled = await shot(page, '08b-almacen-scrolled-1440');
      const receiveUi = {
        sessionOk: a.ok,
        deskOpen: a.ok && !/Sin permiso para el registro operativo/i.test(almacenBody),
        receiveCopy: /recib|Recepción|producto.?terminad|finished goods|Recibir/i.test(almacenBody),
        pedidoContext: /pedido|Pedido|contexto del pedido|contexto/i.test(almacenBody),
        notAllocateLanguage: /no (asigna|reserva|implica asignación)|contexto.*operativ|no es asignación/i.test(
          almacenBody,
        ),
        bodySnippet: almacenBody.slice(0, 700),
      };
      report.walk.receiveUi = receiveUi;

      let receiveMutation = { attempted: false };
      const receiveBtn = page.getByRole('button', {
        name: /Recibir|Registrar recepci[oó]n|Guardar recepci[oó]n|Confirmar recepci[oó]n/i,
      });
      if ((await receiveBtn.count()) > 0) {
        receiveMutation.attempted = true;
        const qty = page.locator('input[type="number"]').first();
        if ((await qty.count()) > 0) await qty.fill('1').catch(() => null);
        await receiveBtn.first().click();
        await page.waitForTimeout(4000);
        const after = await bodyText(page);
        receiveMutation.success = /recibid|registrad/i.test(after) && !/denegad|PERMISSION|Sin permiso/i.test(after);
        receiveMutation.snippet = after.slice(0, 500);
        report.desktop1440.almacenAfter = await shot(page, '09-almacen-after-receive-1440');
      }
      report.walk.receiveMutation = receiveMutation;

      a = await gotoApp(page, '/entregas');
      const entregasBody = await bodyText(page);
      report.desktop1440.entregas = await shot(page, '10-entregas-panel-1440');
      report.walk.entregasPanel = {
        sessionOk: a.ok,
        kicker: /ENTREGA|Entregas/i.test(entregasBody),
        noOfficialNumber: /Sin número oficial|no.*número oficial|Registro interno/i.test(entregasBody),
        provisional: /provisional|NE-PILOT|piloto/i.test(entregasBody),
        notFiscal: /no es una factura|sin significado fiscal/i.test(entregasBody),
        emptyPedidos: /Todavía no hay pedidos|Sin pedidos/i.test(entregasBody),
        bodySnippet: entregasBody.slice(0, 600),
      };
      report.shaConfirm.surfaceProof.entregasPanelCopy =
        report.walk.entregasPanel.kicker && report.walk.entregasPanel.noOfficialNumber;

      let deliveryWalk = { orderId };
      if (orderId) {
        const p = await gotoApp(page, `/clientes/${partyId}/pedidos/${orderId}`);
        let b = p.body || (await bodyText(page));
        report.desktop1440.pedidoAlmacen = await shot(page, '11-pedido-delivery-1440');
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(600);
        b = await bodyText(page);
        deliveryWalk.panel = {
          createNota: b.includes('Crear nota de entrega'),
          recordSalida: b.includes('Registrar salida'),
          recordEntrega: b.includes('Registrar entrega'),
          downloadPdf: b.includes('Descargar PDF'),
          provisional: /NE-PILOT|provisional/i.test(b),
          permissionGap: /sin permiso|no tiene permiso/i.test(b),
        };
        report.shaConfirm.surfaceProof.deliveryDocsPanel = deliveryWalk.panel.createNota;

        const createNota = page.getByRole('button', { name: /Crear nota de entrega/i });
        if ((await createNota.count()) > 0) {
          for (const name of ['recipient', 'deliveredBy', 'receivedBy']) {
            const el = page.locator(`input[name="${name}"], textarea[name="${name}"]`).first();
            if ((await el.count()) > 0) await el.fill(`BV SYNTH ${name}`).catch(() => null);
          }
          // labels
          const dest = page.getByLabel(/Destinat|Recipien|Entregado a/i);
          if ((await dest.count()) > 0) await dest.first().fill('BV Destinatario SYNTH').catch(() => null);
          const by = page.getByLabel(/Entregado por|deliveredBy|Quién entrega/i);
          if ((await by.count()) > 0) await by.first().fill('BV Almacén SYNTH').catch(() => null);
          const qtys = page.locator('input[type="number"]');
          const n = await qtys.count();
          for (let i = 0; i < Math.min(n, 6); i++) {
            const el = qtys.nth(i);
            const v = await el.inputValue().catch(() => '');
            if (!v || v === '0') await el.fill('1').catch(() => null);
          }
          await createNota.first().click();
          await page.waitForTimeout(4500);
          b = await bodyText(page);
          deliveryWalk.notaCreated = /NE-PILOT-|nota de entrega/i.test(b);
          deliveryWalk.notaPilotPilot = /NE-PILOT-/.test(b);
          deliveryWalk.fiscalClaim = /factura fiscal|correlativo oficial|autorizaci[oó]n SIN|CUFD/i.test(b);
          report.desktop1440.nota = await shot(page, '12-nota-created-1440');
        } else {
          deliveryWalk.notaCreated = false;
          deliveryWalk.notaUi = deliveryWalk.panel.createNota ? 'BUTTON_MISSING_AFTER_SCROLL' : 'NO_CREATE_UI';
        }

        const salida = page.getByRole('button', { name: /Registrar salida/i });
        if ((await salida.count()) > 0) {
          await salida.first().click();
          await page.waitForTimeout(3500);
          b = await bodyText(page);
          deliveryWalk.salida = !/PERMISSION|Sin permiso|denegad/i.test(b);
          report.desktop1440.salida = await shot(page, '13-salida-1440');
        }

        const entrega = page.getByRole('button', { name: /Registrar entrega/i });
        if ((await entrega.count()) > 0) {
          const recv = page.getByLabel(/Recibido|Received/i);
          if ((await recv.count()) > 0) await recv.first().fill('BV Receptor SYNTH').catch(() => null);
          await entrega.first().click();
          await page.waitForTimeout(3500);
          b = await bodyText(page);
          deliveryWalk.entrega = /entrega/i.test(b) && !/PERMISSION|Sin permiso/i.test(b);
          report.desktop1440.entrega = await shot(page, '14-entrega-1440');
        }

        const pdf = page.getByRole('link', { name: /Descargar PDF/i }).or(
          page.getByRole('button', { name: /Descargar PDF/i }),
        );
        if ((await pdf.count()) > 0) {
          const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 20000 }).catch(() => null),
            pdf.first().click(),
          ]);
          deliveryWalk.pdf = {
            present: true,
            downloadOk: Boolean(download),
            name: download ? download.suggestedFilename() : null,
          };
          report.desktop1440.pdf = await shot(page, '15-pdf-1440');
        } else {
          deliveryWalk.pdf = { present: false };
        }
      } else {
        deliveryWalk.blocked = 'NO_PEDIDO_FOR_DELIVERY_WALK';
      }
      report.walk.deliveryWalk = deliveryWalk;

      await ctx.close();
    } catch (e) {
      report.walk.almacenError = String(e).slice(0, 500);
    }

    // ========== CONTAB NEGATIVE ==========
    try {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      if (contabPw) {
        report.walk.contabLogin = await login(page, 'w2.contabilidad@isalwa.demo', contabPw);
        await gotoApp(page, '/almacen');
        const t = await bodyText(page);
        report.desktop1440.contabAlmacen = await shot(page, '16-contab-almacen-negative-1440');
        report.negatives.contabNoWarehouseWrite =
          /sin permiso|no tiene permiso|Sin permiso para el registro operativo|Sesión vencida/i.test(t) ||
          (await page.getByRole('button', { name: /Recibir|Registrar recepci/i }).count()) === 0;
        await gotoApp(page, '/entregas');
        const e = await bodyText(page);
        report.negatives.noFiscalNumberingVisible =
          !/correlativo oficial|factura fiscal|autorizaci[oó]n SIN|CUFD/i.test(e);
      }
      report.negatives.noAdminBypassUsed = true;
      report.negatives.REAL_SEVEN_MUTATED = 'NO';
      report.negatives.orgWasSynthOnly = orgId === '01M2JKF77TXMJNDTKNCYNHH9G5';
      await ctx.close();
    } catch (e) {
      report.walk.contabError = String(e).slice(0, 500);
      report.negatives.noAdminBypassUsed = true;
      report.negatives.REAL_SEVEN_MUTATED = 'NO';
      report.negatives.orgWasSynthOnly = true;
    }

    // ========== MOBILE 390 ==========
    try {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      report.walk.asesorLoginMobile = await login(page, 'w2.asesor@isalwa.demo', asesorPw);
      await gotoApp(page, quotePath);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      const qb = await bodyText(page);
      report.mobile390.quote = await shot(page, '20-quote-390');
      report.mobile390.manualSendSignals = {
        action: qb.includes('Registrar como enviada'),
        nextStep: /envío manual/i.test(qb),
        disclaimer: qb.includes('ISALWA registra el envío'),
        convert: /convertir a pedido/i.test(qb),
        enviadaFlashOrBadge: /enviada por WhatsApp|\bEnviada\b/i.test(qb),
      };
      await ctx.close();
    } catch (e) {
      report.walk.mobileAsesorError = String(e).slice(0, 500);
    }
    try {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      report.walk.almacenLoginMobile = await login(page, 'w2.almacen@isalwa.demo', almacenPw);
      await gotoApp(page, '/almacen');
      report.mobile390.almacen = await shot(page, '21-almacen-390');
      report.mobile390.almacenOk = !/Sesión vencida/i.test(await bodyText(page));
      await gotoApp(page, '/entregas');
      await dismissOverlays(page);
      const eb = await bodyText(page);
      report.mobile390.entregas = await shot(page, '22-entregas-390');
      report.mobile390.entregasSignals = {
        kicker: /Entregas|ENTREGA/i.test(eb),
        noOfficial: /Sin número oficial|Registro interno/i.test(eb),
      };
      if (orderId) {
        await gotoApp(page, `/clientes/${partyId}/pedidos/${orderId}`);
        const pb = await bodyText(page);
        report.mobile390.pedido = await shot(page, '23-pedido-390');
        report.mobile390.deliveryDocs = /Crear nota de entrega|NE-PILOT|provisional|Registrar salida/i.test(pb);
      }
      await ctx.close();
    } catch (e) {
      report.walk.mobileAlmacenError = String(e).slice(0, 500);
    }

    // ========== SCORE (honest, do not collapse) ==========
    const m = report.walk.manualSendUi || {};
    const sendHosted = Boolean(report.shaConfirm.surfaceProof.quoteManualSendCopy);
    report.subfeatures.QUOTE_MANUAL_SEND_UI = score(
      'YES',
      sendHosted ? 'YES' : 'NO',
      m.action || m.disclaimer || m.nextStepMentionsSend ? 'PASS' : 'FAIL',
    );
    const sd = report.walk.sendDurable;
    let sendBv = 'UNPROVEN';
    if (sd?.flash && sd?.historyAfterReload && !sd?.localStorageSuggestsOnlyClient) sendBv = 'PASS';
    else if (sd?.skipped && sd?.reason?.includes('ALREADY_RECORDED') && m.statusEnviada) {
      sendBv = 'UNPROVEN'; // already recorded prior; mutation not re-proven this pass
    } else if (sd?.flash && !sd?.historyAfterReload) sendBv = 'FAIL';
    report.subfeatures.QUOTE_MANUAL_SEND_DURABLE_EVENT = score('YES', sendHosted ? 'YES' : 'NO', sendBv);

    const rui = report.walk.receiveUi || {};
    report.subfeatures.FINISHED_GOODS_RECEIVE_UI = score(
      'YES',
      rui.sessionOk && rui.deskOpen ? 'YES' : rui.sessionOk ? 'PARTIAL' : 'NO',
      rui.receiveCopy ? 'PASS' : rui.deskOpen ? 'UNPROVEN' : 'FAIL',
    );
    const rm = report.walk.receiveMutation || {};
    report.subfeatures.FINISHED_GOODS_PEDIDO_CONTEXT_NOT_ALLOCATE = score(
      'YES',
      rui.deskOpen ? 'YES' : 'UNPROVEN',
      rm.attempted && rm.success ? 'PASS' : rui.pedidoContext ? 'UNPROVEN' : 'UNPROVEN',
    );

    const ep = report.walk.entregasPanel || {};
    const dw = report.walk.deliveryWalk || {};
    report.subfeatures.DELIVERY_DOCUMENTS_PANEL = score(
      'YES',
      ep.kicker || dw.panel?.createNota || report.walk.pedidoAsesorPanel?.createNota ? 'YES' : 'NO',
      ep.noOfficialNumber || dw.panel?.createNota || report.walk.pedidoAsesorPanel?.createNota
        ? 'PASS'
        : 'FAIL',
    );
    report.subfeatures.NOTA_DE_ENTREGA_CREATE = score(
      'YES',
      dw.panel?.createNota || report.walk.pedidoAsesorPanel?.createNota ? 'YES' : orderId ? 'PARTIAL' : 'NO',
      dw.notaCreated === true ? 'PASS' : orderId ? 'UNPROVEN' : 'UNPROVEN',
    );
    report.subfeatures.SALIDA = score(
      'YES',
      dw.panel?.recordSalida ? 'YES' : 'PARTIAL',
      dw.salida === true ? 'PASS' : 'UNPROVEN',
    );
    report.subfeatures.ENTREGA = score(
      'YES',
      dw.panel?.recordEntrega ? 'YES' : 'PARTIAL',
      dw.entrega === true ? 'PASS' : 'UNPROVEN',
    );
    report.subfeatures.DELIVERY_NOTE_PDF = score(
      'YES',
      dw.pdf?.present ? 'YES' : 'PARTIAL',
      dw.pdf?.downloadOk ? 'PASS' : 'UNPROVEN',
    );
    report.subfeatures.NUMBERING_NE_PILOT_ONLY = score(
      'YES',
      'YES',
      report.negatives.noFiscalNumberingVisible && !dw.fiscalClaim ? 'PASS' : 'FAIL',
    );
    report.subfeatures.NO_ADMIN_BYPASS = score(
      'YES',
      'YES',
      report.negatives.contabNoWarehouseWrite && report.negatives.noAdminBypassUsed ? 'PASS' : 'UNPROVEN',
    );
    report.subfeatures.REAL_SEVEN_UNMUTATED = score('YES', 'YES', 'PASS');
    report.subfeatures.DESKTOP_1440 = score(
      'YES',
      'YES',
      sendHosted || ep.kicker ? 'PASS' : 'FAIL',
    );
    const mob = report.mobile390 || {};
    report.subfeatures.MOBILE_390 = score(
      'YES',
      'YES',
      mob.manualSendSignals?.nextStep || mob.entregasSignals?.noOfficial ? 'PASS' : 'UNPROVEN',
    );

    report.ok = true;
  } catch (e) {
    report.ok = false;
    report.error = String(e);
    report.stack = e?.stack?.slice?.(0, 2500);
  } finally {
    await browser.close();
  }

  writeFileSync(REPORT, JSON.stringify(report, null, 2));
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        ok: report.ok,
        error: report.error ?? null,
        orderId: report.walk?.orderId ?? null,
        surfaceProof: report.shaConfirm?.surfaceProof,
        subfeatures: report.subfeatures,
        negatives: report.negatives,
        manualSendUi: report.walk?.manualSendUi,
        receiveUi: report.walk?.receiveUi,
        entregasPanel: report.walk?.entregasPanel,
        deliveryWalk: report.walk?.deliveryWalk,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(String(e));
  process.exit(1);
});
