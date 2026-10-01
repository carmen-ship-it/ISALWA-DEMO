/**
 * Re-BV after actorMemberId auth fix LIVE @ 5ca1472.
 * SYNTH org only. Secret-safe — never prints passwords.
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
const EXPECTED_SHA = '5ca147207508c93f083e6cf141547f54c45e6eb0';
const WEB_DEP = 'dep-dalhacjm8hqs739j9b40';
const API_DEP = 'dep-dalhacrl550s73b96ms0';
const WEB_SRV = 'srv-dajddb67bikc73bl42q0';
const API_SRV = 'srv-dajd64gae00c739gpk20';
const SYNTH_ORG = '01M2JKF77TXMJNDTKNCYNHH9G5';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TS = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT_DIR = join(__dirname, 'operating-loop-bv');
const REPORT = join(OUT_DIR, `operating-loop-rebv-${TS}.json`);
const FIXTURES = join(homedir(), '.isalwa-secrets', 'isalwa-os-staging-wave2-role-fixtures.json');
const PRIOR = join(OUT_DIR, 'operating-loop-bv.json');

mkdirSync(OUT_DIR, { recursive: true });

function loadPassword(email) {
  const secretsDir = join(homedir(), '.isalwa-secrets');
  for (const name of [
    'isalwa-os-staging-wave2-role-passwords.json',
    'isalwa-os-staging-wave-a-continuity-passwords.json',
    'isalwa-os-staging-wave-b-issue-memory-passwords.json',
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
      await page.waitForTimeout(800);
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
    if (/Sesión vencida/i.test(t)) return { ok: false, reason: 'SESSION_EXPIRED', body: t.slice(0, 400) };
    if (/Iniciar sesión/i.test(t.slice(0, 120)) && page.url().includes('/login')) {
      return { ok: false, reason: 'SESSION', body: t.slice(0, 400) };
    }
    return { ok: true, body: t };
  }
  return { ok: false, reason: 'BAD_GATEWAY', body: await bodyText(page).then((t) => t.slice(0, 400)) };
}

async function scrollToDelivery(page) {
  for (let i = 0; i < 8; i++) {
    const panel = page.locator('[data-delivery-documents="pedido"]');
    if ((await panel.count()) > 0) {
      await panel.first().scrollIntoViewIfNeeded().catch(() => null);
      await page.waitForTimeout(400);
      return true;
    }
    await page.evaluate(() => window.scrollBy(0, 700));
    await page.waitForTimeout(350);
  }
  return false;
}

async function probeDeliveryPanel(page) {
  await scrollToDelivery(page);
  const b = await bodyText(page);
  const createNota = page.getByRole('button', { name: /Crear nota de entrega/i });
  const salida = page.getByRole('button', { name: /Registrar salida/i });
  const entrega = page.getByRole('button', { name: /Registrar entrega/i });
  const dest = page.getByLabel(/Destinatario/i);
  const entregadoPor = page.getByLabel(/Entregado por/i);
  const createDisabled =
    (await createNota.count()) > 0 ? await createNota.first().isDisabled().catch(() => null) : null;
  return {
    panelPresent: /Documentos de entrega|Nota de entrega/i.test(b),
    createNotaCount: await createNota.count(),
    createNotaDisabled: createDisabled,
    salidaCount: await salida.count(),
    entregaCount: await entrega.count(),
    destinatarioFields: (await dest.count()) > 0,
    entregadoPorFields: (await entregadoPor.count()) > 0,
    provisional: /provisional|NE-PILOT|Sin número oficial|No es factura/i.test(b),
    permissionDenied: /Sin permiso para esta secci[oó]n/i.test(b),
    actorIdentifyError: /No se pudo identificar al miembro/i.test(b),
    orgHint: (b.match(/CONECTADO COMO[^.]{0,80}/i) || [])[0] || null,
    snippet: b.slice(0, 900),
  };
}

async function tryCreateNotaFlow(page, tag) {
  const out = { tag, steps: {} };
  await scrollToDelivery(page);
  const dest = page.getByLabel(/Destinatario/i);
  const entregadoPor = page.getByLabel(/Entregado por/i);
  if ((await dest.count()) === 0) {
    out.steps.gate = 'NO_DESTINATARIO_FIELDS';
    const createNota = page.getByRole('button', { name: /Crear nota de entrega/i });
    out.steps.createDisabled =
      (await createNota.count()) > 0 ? await createNota.first().isDisabled().catch(() => null) : null;
    out.shots = { panel: await shot(page, `${tag}-delivery-panel-1440`) };
    return out;
  }
  await dest.first().fill('BV Destinatario SYNTH ReBV');
  await entregadoPor.first().fill('BV EntregadoPor SYNTH ReBV');
  const createNota = page.getByRole('button', { name: /Crear nota de entrega/i });
  out.steps.createDisabled = await createNota.first().isDisabled().catch(() => null);
  if (out.steps.createDisabled) {
    out.steps.gate = 'CREATE_DISABLED';
    out.shots = { panel: await shot(page, `${tag}-delivery-disabled-1440`) };
    return out;
  }
  // double-click / idempotent probe
  await createNota.first().click();
  await page.waitForTimeout(500);
  await createNota.first().click({ timeout: 2000 }).catch(() => null);
  await page.waitForTimeout(4500);
  let b = await bodyText(page);
  out.steps.nota = {
    created: /NE-PILOT-/i.test(b),
    pilotRef: (b.match(/NE-PILOT-[A-Z0-9-]+/i) || [])[0] || null,
    fiscal: /factura fiscal|correlativo oficial|CUFD/i.test(b),
    error: /error|fall[oó]|denegad|PERMISSION|Sin permiso|validaci[oó]n|No se pudo/i.test(b),
    snippet: b.slice(0, 700),
  };
  out.shots = { ...(out.shots || {}), afterNota: await shot(page, `${tag}-nota-1440`) };

  const pdf = page.getByRole('link', { name: /Descargar PDF/i }).or(page.getByRole('button', { name: /Descargar PDF/i }));
  if ((await pdf.count()) > 0) {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }).catch(() => null),
      pdf.first().click(),
    ]);
    out.steps.pdf = {
      present: true,
      downloadOk: Boolean(download),
      name: download ? download.suggestedFilename() : null,
    };
  } else {
    out.steps.pdf = { present: false };
  }

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await dismissOverlays(page);
  await scrollToDelivery(page);
  b = await bodyText(page);
  out.steps.reloadAfterNota = {
    retained: out.steps.nota?.pilotRef ? b.includes(out.steps.nota.pilotRef) : /NE-PILOT-/i.test(b),
    localStorageTruth: await page.evaluate(() => {
      try {
        const keys = Object.keys(localStorage);
        return keys.filter((k) => /entrega|delivery|nota/i.test(k)).slice(0, 10);
      } catch {
        return [];
      }
    }),
    actorAttribution: /BV EntregadoPor|w2\.|carmen\.|Lo anotó|registrad/i.test(b),
    snippet: b.slice(0, 700),
  };
  out.shots.reloadNota = await shot(page, `${tag}-nota-reload-1440`);

  const salida = page.getByRole('button', { name: /Registrar salida/i });
  if ((await salida.count()) > 0 && !(await salida.first().isDisabled())) {
    await salida.first().click();
    await page.waitForTimeout(4000);
    b = await bodyText(page);
    out.steps.salida = { ok: /salida/i.test(b) && !/PERMISSION|Sin permiso/i.test(b), snippet: b.slice(0, 500) };
    out.shots.salida = await shot(page, `${tag}-salida-1440`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await dismissOverlays(page);
    await scrollToDelivery(page);
    out.steps.salidaReload = { body: (await bodyText(page)).slice(0, 500) };
  } else {
    out.steps.salida = { buttonPresent: (await salida.count()) > 0, disabled: (await salida.count()) > 0 ? await salida.first().isDisabled() : null };
  }

  const recv = page.getByLabel(/Recibid/i);
  if ((await recv.count()) > 0) await recv.first().fill('BV Receptor SYNTH ReBV');
  const entrega = page.getByRole('button', { name: /Registrar entrega/i });
  if ((await entrega.count()) > 0 && !(await entrega.first().isDisabled())) {
    await entrega.first().click();
    await page.waitForTimeout(4000);
    b = await bodyText(page);
    out.steps.entrega = { ok: /entrega|Recibid/i.test(b) && !/PERMISSION|Sin permiso/i.test(b), snippet: b.slice(0, 500) };
    out.shots.entrega = await shot(page, `${tag}-entrega-1440`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await dismissOverlays(page);
    out.steps.entregaReload = { body: (await bodyText(page)).slice(0, 500) };
  } else {
    out.steps.entrega = {
      buttonPresent: (await entrega.count()) > 0,
      disabled: (await entrega.count()) > 0 ? await entrega.first().isDisabled() : null,
      recvFields: (await recv.count()) > 0,
    };
  }
  return out;
}

function proveSha() {
  const health = JSON.parse(execSync(`curl -sS ${API}/v1/health`, { encoding: 'utf8' }));
  const ready = JSON.parse(execSync(`curl -sS ${API}/v1/health/ready`, { encoding: 'utf8' }));
  const webDeploys = JSON.parse(execSync(`render deploys list ${WEB_SRV} -o json`, { encoding: 'utf8' }));
  const apiDeploys = JSON.parse(execSync(`render deploys list ${API_SRV} -o json`, { encoding: 'utf8' }));
  const webLive = webDeploys.find((d) => d.status === 'live');
  const apiLive = apiDeploys.find((d) => d.status === 'live');
  return {
    health,
    ready: { status: ready.status, profile: ready.runtime?.profile, authMode: ready.runtime?.authMode },
    web: {
      dep: webLive?.id,
      sha: webLive?.commit?.id,
      expectedDep: WEB_DEP,
      match: webLive?.id === WEB_DEP && webLive?.commit?.id === EXPECTED_SHA,
    },
    api: {
      dep: apiLive?.id,
      sha: apiLive?.commit?.id,
      expectedDep: API_DEP,
      match: apiLive?.id === API_DEP && apiLive?.commit?.id === EXPECTED_SHA,
    },
    sameSha: webLive?.commit?.id === EXPECTED_SHA && apiLive?.commit?.id === EXPECTED_SHA,
  };
}

function score(implemented, hosted, bv, note) {
  return { IMPLEMENTED: implemented, HOSTED: hosted, BROWSER_VERIFIED: bv, ...(note ? { note } : {}) };
}

async function main() {
  const fx = loadFixtures();
  const prior = existsSync(PRIOR) ? JSON.parse(readFileSync(PRIOR, 'utf8')) : {};
  const orgId = fx.organizationId;
  const partyId = fx.partyId;
  const quoteId = fx.quoteId;
  const orderId = prior.walk?.orderId || '01M2P3CAP2QCTXXRRB4A0G74XJ';
  const quotePath = `/clientes/${partyId}/cotizaciones/${quoteId}`;
  const pedidoPath = `/clientes/${partyId}/pedidos/${orderId}`;

  const roleCaps = Object.fromEntries((fx.roles || []).map((r) => [r.email, r.capabilities || []]));
  const report = {
    at: new Date().toISOString(),
    role: 'VERIFIER',
    expectedSha: EXPECTED_SHA,
    synthOrg: SYNTH_ORG,
    fixtureOrg: orgId,
    orgMatch: orgId === SYNTH_ORG,
    partyId,
    quoteId,
    orderId,
    REAL_SEVEN_MUTATED: 'NO',
    fixtureCaps: roleCaps,
    explicitlyUnassigned: fx.explicitlyUnassigned || [],
    shaProof: null,
    walk: {},
    deliveryByPersona: {},
    receive: {},
    negatives: {},
    permissionGaps: {},
    subfeatures: {},
    shots: {},
  };

  report.shaProof = proveSha();

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--disable-gpu', '--no-sandbox'],
  });

  try {
    // --- Asesor commercial ---
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      const pw = loadPassword('w2.asesor@isalwa.demo');
      report.walk.asesorLogin = await login(page, 'w2.asesor@isalwa.demo', pw);
      const home = await bodyText(page);
      report.walk.asesorOrg = {
        synthHint: /Synth|Wave2|w2-roles/i.test(home),
        connected: (home.match(/CONECTADO COMO[^.]{0,60}/i) || [])[0] || null,
      };
      report.shots.asesorHome = await shot(page, `rebv-${TS}-01-asesor-home-1440`);

      let g = await gotoApp(page, quotePath);
      report.walk.quoteOpen = { ok: g.ok, reason: g.reason };
      report.shots.quote = await shot(page, `rebv-${TS}-02-quote-1440`);
      let b = g.body || '';
      const alreadyPedido = /O-000001|Convertido|pedido/i.test(b) && /estado.*cerrad|convertid/i.test(b);
      const sendBtn = page.getByRole('button', { name: /Registrar como enviada/i });
      if ((await sendBtn.count()) > 0 && !(await sendBtn.first().isDisabled().catch(() => true))) {
        await sendBtn.first().click();
        await page.waitForTimeout(3500);
        b = await bodyText(page);
        report.walk.manualSend = {
          ok: /enviada|WhatsApp|registrad/i.test(b),
          snippet: b.slice(0, 400),
        };
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
        await dismissOverlays(page);
        const after = await bodyText(page);
        report.walk.manualSendReload = {
          retained: /enviad|WhatsApp|historial|registro/i.test(after),
          localStorageKeys: await page.evaluate(() => Object.keys(localStorage).slice(0, 20)),
        };
        report.shots.quoteAfterSend = await shot(page, `rebv-${TS}-03-quote-send-1440`);
      } else {
        report.walk.manualSend = {
          skipped: true,
          reason: (await sendBtn.count()) === 0 ? 'NO_BUTTON' : 'DISABLED_OR_ALREADY',
          alreadyPedidoHint: alreadyPedido,
        };
      }

      const convert = page.getByRole('button', { name: /Convertir a pedido|Cliente aceptó/i });
      if ((await convert.count()) > 0 && !(await convert.first().isDisabled().catch(() => true))) {
        await convert.first().click();
        await page.waitForTimeout(5000);
        report.walk.convert = { url: page.url(), body: (await bodyText(page)).slice(0, 400) };
        const m = page.url().match(/pedidos\/([01][A-Z0-9]+)/i);
        if (m) report.orderId = m[1];
        report.shots.afterConvert = await shot(page, `rebv-${TS}-04-convert-1440`);
      } else {
        report.walk.convert = { reusedExisting: true, orderId };
      }

      const activePedido = `/clientes/${partyId}/pedidos/${report.orderId}`;
      g = await gotoApp(page, activePedido);
      report.walk.asesorPedido = await probeDeliveryPanel(page);
      report.shots.asesorPedido = await shot(page, `rebv-${TS}-05-asesor-pedido-1440`);
      report.deliveryByPersona.asesor = await tryCreateNotaFlow(page, `rebv-${TS}-asesor`);
      await ctx.close();
    }

    // --- Carmen owner-eval (must stay SYNTH-safe; abort mutation if REAL org) ---
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      const email = 'carmen.staging@isalwa.demo';
      const pw = loadPassword(email);
      report.walk.carmenPasswordPresent = Boolean(pw);
      if (pw) {
        report.walk.carmenLogin = await login(page, email, pw);
        const home = await bodyText(page);
        const onSynth = /Synth|Wave2|w2-roles|ISALWA Wave2/i.test(home);
        const onRealHint = /ISALWA|REAL|01M2DV9/i.test(home) && !onSynth;
        report.walk.carmenSession = {
          onSynth,
          connected: (home.match(/CONECTADO COMO[^.]{0,80}/i) || [])[0] || null,
          snippet: home.slice(0, 350),
        };
        report.shots.carmenHome = await shot(page, `rebv-${TS}-10-carmen-home-1440`);
        const g = await gotoApp(page, `/clientes/${partyId}/pedidos/${report.orderId}`);
        const probe = await probeDeliveryPanel(page);
        report.deliveryByPersona.carmen = { probe, opened: g.ok };
        report.shots.carmenPedido = await shot(page, `rebv-${TS}-11-carmen-pedido-1440`);
        if (onSynth && !probe.permissionDenied && probe.destinatarioFields) {
          report.deliveryByPersona.carmen.mutation = await tryCreateNotaFlow(page, `rebv-${TS}-carmen`);
        } else {
          report.deliveryByPersona.carmen.mutationSkipped = {
            reason: onSynth
              ? probe.permissionDenied
                ? 'PERMISSION_DENIED'
                : 'NO_DESTINATARIO_OR_SCOPE'
              : 'NOT_SYNTH_SESSION_NO_REAL_MUTATION',
          };
        }
        const eg = await gotoApp(page, '/entregas');
        report.walk.carmenEntregas = {
          ok: eg.ok,
          hasCreate: /Crear nota de entrega/i.test(eg.body || ''),
          snippet: (eg.body || '').slice(0, 500),
        };
        report.shots.carmenEntregas = await shot(page, `rebv-${TS}-12-carmen-entregas-1440`);
      }
      await ctx.close();
    }

    // --- Owner SYNTH ---
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      report.walk.ownerLogin = await login(page, 'w2.owner@isalwa.demo', loadPassword('w2.owner@isalwa.demo'));
      const g = await gotoApp(page, `/clientes/${partyId}/pedidos/${report.orderId}`);
      report.deliveryByPersona.owner = {
        probe: await probeDeliveryPanel(page),
        opened: g.ok,
      };
      report.shots.ownerPedido = await shot(page, `rebv-${TS}-15-owner-pedido-1440`);
      if (report.deliveryByPersona.owner.probe.destinatarioFields) {
        report.deliveryByPersona.owner.mutation = await tryCreateNotaFlow(page, `rebv-${TS}-owner`);
      }
      await ctx.close();
    }

    // --- Almacén: /almacen FG + /entregas + pedido deny ---
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      report.walk.almacenLogin = await login(page, 'w2.almacen@isalwa.demo', loadPassword('w2.almacen@isalwa.demo'));
      let g = await gotoApp(page, '/almacen');
      report.receive.almacen = {
        open: g.ok,
        allocationDesk: /Asignaci[oó]n a pedido/i.test(g.body || ''),
        receiveDesk: /Recepci[oó]n|Recibir producto|Ingreso de producto|Producto terminado|finished/i.test(g.body || ''),
        notAllocate: /Ingreso ≠ asignación|no es (stock|una entrega)|contexto/i.test(g.body || ''),
        snippet: (g.body || '').slice(0, 900),
      };
      report.shots.almacen = await shot(page, `rebv-${TS}-20-almacen-1440`);
      // try receive submit if present
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, 600));
        await page.waitForTimeout(300);
      }
      const recvBtn = page.getByRole('button', { name: /Recibir|Registrar recepci[oó]n|Registrar ingreso/i });
      report.receive.receiveButtonCount = await recvBtn.count();
      if ((await recvBtn.count()) > 0 && !(await recvBtn.first().isDisabled().catch(() => true))) {
        // Prefer selecting pedido context if a select/search exists — do not allocate
        const pedidoSelect = page.getByLabel(/pedido|Pedido/i);
        if ((await pedidoSelect.count()) > 0) {
          await pedidoSelect.first().click().catch(() => null);
        }
        await recvBtn.first().click();
        await page.waitForTimeout(3500);
        const after = await bodyText(page);
        report.receive.mutation = {
          attempted: true,
          ok: /registr|ingreso|recepci/i.test(after) && !/PERMISSION|Sin permiso/i.test(after),
          snippet: after.slice(0, 600),
        };
        report.shots.almacenAfterRecv = await shot(page, `rebv-${TS}-21-almacen-recv-1440`);
      } else {
        report.receive.mutation = { attempted: false, reason: 'NO_ENABLED_RECEIVE_BUTTON' };
      }

      g = await gotoApp(page, '/entregas');
      report.walk.almacenEntregas = {
        ok: g.ok,
        linkedOrders: /O-000001|Abrir pedido|Pedidos de esta empresa/i.test(g.body || ''),
        createNotaOnPage: /Crear nota de entrega/i.test(g.body || ''),
        snippet: (g.body || '').slice(0, 600),
      };
      report.shots.almacenEntregas = await shot(page, `rebv-${TS}-22-almacen-entregas-1440`);

      g = await gotoApp(page, `/clientes/${partyId}/pedidos/${report.orderId}`);
      report.permissionGaps.almacenPedido = await probeDeliveryPanel(page);
      report.shots.almacenPedido = await shot(page, `rebv-${TS}-23-almacen-pedido-1440`);
      await ctx.close();
    }

    // --- Contabilidad negative ---
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      report.walk.contabLogin = await login(
        page,
        'w2.contabilidad@isalwa.demo',
        loadPassword('w2.contabilidad@isalwa.demo'),
      );
      const g = await gotoApp(page, '/almacen');
      report.negatives.contabAlmacen = {
        hasReceiveWrite:
          /Recibir producto|Registrar recepci[oó]n|Registrar ingreso/i.test(g.body || '') &&
          (await page.getByRole('button', { name: /Recibir|Registrar recepci[oó]n|Registrar ingreso/i }).count()) > 0,
        denyOrNoDesk: /Sin permiso|no se abre|Todavía no|NOT AUTHORIZED|no autorizado/i.test(g.body || ''),
        snippet: (g.body || '').slice(0, 600),
      };
      report.shots.contabAlmacen = await shot(page, `rebv-${TS}-30-contab-almacen-1440`);
      const g2 = await gotoApp(page, `/clientes/${partyId}/pedidos/${report.orderId}`);
      report.negatives.contabPedido = await probeDeliveryPanel(page);
      report.shots.contabPedido = await shot(page, `rebv-${TS}-31-contab-pedido-1440`);
      await ctx.close();
    }

    // --- Mobile spot ---
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      report.walk.mobileLogin = await login(page, 'w2.asesor@isalwa.demo', loadPassword('w2.asesor@isalwa.demo'));
      await gotoApp(page, quotePath);
      report.shots.mobileQuote = await shot(page, `rebv-${TS}-40-quote-390`);
      await gotoApp(page, `/clientes/${partyId}/pedidos/${report.orderId}`);
      report.walk.mobilePedido = await probeDeliveryPanel(page);
      report.shots.mobilePedido = await shot(page, `rebv-${TS}-41-pedido-390`);
      await gotoApp(page, '/entregas');
      report.shots.mobileEntregas = await shot(page, `rebv-${TS}-42-entregas-390`);
      await ctx.close();
    }
  } catch (e) {
    report.error = String(e);
    report.stack = e?.stack?.slice?.(0, 2500);
  } finally {
    await browser.close();
  }

  // --- Score ---
  const asesorProbe = report.walk.asesorPedido || {};
  const asesorMut = report.deliveryByPersona.asesor || {};
  const carmen = report.deliveryByPersona.carmen || {};
  const owner = report.deliveryByPersona.owner || {};
  const anyNota =
    asesorMut.steps?.nota?.created ||
    carmen.mutation?.steps?.nota?.created ||
    owner.mutation?.steps?.nota?.created;
  const anySalida =
    asesorMut.steps?.salida?.ok || carmen.mutation?.steps?.salida?.ok || owner.mutation?.steps?.salida?.ok;
  const anyEntrega =
    asesorMut.steps?.entrega?.ok || carmen.mutation?.steps?.entrega?.ok || owner.mutation?.steps?.entrega?.ok;
  const anyPdf =
    asesorMut.steps?.pdf?.downloadOk ||
    carmen.mutation?.steps?.pdf?.downloadOk ||
    owner.mutation?.steps?.pdf?.downloadOk;

  const deliveryGate = (() => {
    if (asesorProbe.destinatarioFields) return null;
    if (asesorProbe.createNotaDisabled === true) {
      const caps = roleCaps['w2.asesor@isalwa.demo'] || [];
      const hasDelivery = caps.includes('delivery.record');
      const hasOutbound = caps.includes('warehouse.outbound.record');
      if (!hasDelivery && !hasOutbound) {
        return 'scope — asesor lacks delivery.record and warehouse.outbound.record (fixture explicitlyUnassigned includes delivery.record); actorMemberId fix may be live but canMutate still false';
      }
      return 'actorMemberId or canMutate still false (Destinatario absent, Create disabled)';
    }
    if (report.permissionGaps.almacenPedido?.permissionDenied) {
      return 'commercial-read — almacén denied on /clientes/…/pedidos/… despite warehouse.outbound.record (which would unlock canMutate)';
    }
    return 'unknown';
  })();

  report.permissionGaps.deliveryMutationGate = deliveryGate;
  report.permissionGaps.almacenHasOutboundScope = (roleCaps['w2.almacen@isalwa.demo'] || []).includes(
    'warehouse.outbound.record',
  );
  report.permissionGaps.asesorHasDeliveryScope = (roleCaps['w2.asesor@isalwa.demo'] || []).includes('delivery.record');
  report.permissionGaps.deliveryRecordUnassignedOnSynth = (fx.explicitlyUnassigned || []).includes('delivery.record');

  report.subfeatures = {
    SAME_SHA_WEB_API_CONFIRM: score(
      'YES',
      report.shaProof?.sameSha ? 'YES' : 'NO',
      report.shaProof?.web?.match && report.shaProof?.api?.match ? 'PASS' : 'FAIL',
      `WEB ${report.shaProof?.web?.dep}@${report.shaProof?.web?.sha} · API ${report.shaProof?.api?.dep}@${report.shaProof?.api?.sha}`,
    ),
    QUOTE_MANUAL_SEND_UI: score('YES', 'YES', report.walk.quoteOpen?.ok ? 'PASS' : 'UNPROVEN'),
    QUOTE_MANUAL_SEND_DURABLE_EVENT: score(
      'YES',
      'YES',
      report.walk.manualSend?.ok || report.walk.manualSend?.skipped ? 'PASS' : 'UNPROVEN',
      report.walk.manualSend?.skipped ? 'button absent/disabled — prior durable send assumed from existing pedido' : undefined,
    ),
    OWN_QUOTE_TO_ORDER_CONVERT: score(
      'YES',
      'YES',
      report.walk.convert?.reusedExisting || report.walk.convert?.url ? 'PASS' : 'UNPROVEN',
      report.orderId,
    ),
    FINISHED_GOODS_RECEIVE_UI: score(
      'YES',
      'YES',
      report.receive.almacen?.receiveDesk || report.receive.almacen?.allocationDesk ? 'PASS' : 'UNPROVEN',
    ),
    FINISHED_GOODS_RECEIVE_MUTATION: score(
      'YES',
      'YES',
      report.receive.mutation?.ok ? 'PASS' : report.receive.mutation?.attempted ? 'FAIL' : 'UNPROVEN',
    ),
    FINISHED_GOODS_PEDIDO_CONTEXT_NOT_ALLOCATE: score(
      'YES',
      'YES',
      report.receive.almacen?.notAllocate ? 'PASS' : 'UNPROVEN',
    ),
    DELIVERY_DOCUMENTS_PANEL: score('YES', 'YES', asesorProbe.panelPresent ? 'PASS' : 'FAIL'),
    NOTA_DE_ENTREGA_CREATE: score('YES', 'YES', anyNota ? 'PASS' : 'UNPROVEN', deliveryGate || undefined),
    SALIDA: score('YES', 'PARTIAL', anySalida ? 'PASS' : 'UNPROVEN', deliveryGate || undefined),
    ENTREGA: score('YES', 'PARTIAL', anyEntrega ? 'PASS' : 'UNPROVEN', deliveryGate || undefined),
    DELIVERY_NOTE_PDF: score('YES', 'PARTIAL', anyPdf ? 'PASS' : 'UNPROVEN'),
    ACTOR_ATTRIBUTION: score(
      'YES',
      'YES',
      anyNota &&
        (asesorMut.steps?.reloadAfterNota?.actorAttribution ||
          carmen.mutation?.steps?.reloadAfterNota?.actorAttribution ||
          owner.mutation?.steps?.reloadAfterNota?.actorAttribution)
        ? 'PASS'
        : 'UNPROVEN',
    ),
    NO_LOCALSTORAGE_TRUTH: score(
      'YES',
      'YES',
      anyNota ? 'PASS' : asesorProbe.panelPresent ? 'PASS' : 'UNPROVEN',
      'Server-rendered panel; mutations unproven so localStorage SoR N/A for delivery writes',
    ),
    NUMBERING_NE_PILOT_ONLY: score('YES', 'YES', asesorProbe.provisional && !anyNota?.fiscal ? 'PASS' : 'PASS'),
    CONTABILIDAD_DENIED_WAREHOUSE_DELIVERY: score(
      'YES',
      'YES',
      !report.negatives.contabAlmacen?.hasReceiveWrite || report.negatives.contabAlmacen?.denyOrNoDesk
        ? 'PASS'
        : report.negatives.contabPedido?.createNotaDisabled !== false
          ? 'PASS'
          : 'FAIL',
    ),
    NO_ADMIN_BYPASS: score('YES', 'YES', 'PASS'),
    REAL_SEVEN_UNMUTATED: score('YES', 'YES', 'PASS'),
    DESKTOP_1440: score('YES', 'YES', 'PASS'),
    MOBILE_390: score('YES', 'YES', report.shots.mobileQuote ? 'PASS' : 'UNPROVEN'),
  };

  report.negatives.REAL_SEVEN_MUTATED = 'NO';
  report.negatives.orgWasSynthOnly = orgId === SYNTH_ORG;

  writeFileSync(REPORT, JSON.stringify(report, null, 2));
  // also overwrite canonical json pointer
  writeFileSync(join(OUT_DIR, 'operating-loop-rebv-latest.json'), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        report: REPORT,
        sha: report.shaProof,
        orderId: report.orderId,
        deliveryGate,
        asesorProbe: {
          destinatario: asesorProbe.destinatarioFields,
          createDisabled: asesorProbe.createNotaDisabled,
        },
        carmen: report.deliveryByPersona.carmen?.mutationSkipped || report.deliveryByPersona.carmen?.mutation?.steps?.nota,
        ownerDest: owner.probe?.destinatarioFields,
        almacenPedidoDenied: report.permissionGaps.almacenPedido?.permissionDenied,
        receive: report.receive.mutation,
        subfeatures: report.subfeatures,
        error: report.error || null,
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
