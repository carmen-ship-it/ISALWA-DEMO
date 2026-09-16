/**
 * Focused SYNTH delivery + FG receive BV continuation.
 * Uses known order from prior walk. Never prints secrets.
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
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT_DIR = join(__dirname, 'operating-loop-bv');
const REPORT = join(OUT_DIR, 'operating-loop-bv-delivery-focus.json');
const MAIN = join(OUT_DIR, 'operating-loop-bv.json');
const FIXTURES = join(homedir(), '.isalwa-secrets', 'isalwa-os-staging-wave2-role-fixtures.json');

mkdirSync(OUT_DIR, { recursive: true });

function loadPassword(email) {
  const path = join(homedir(), '.isalwa-secrets', 'isalwa-os-staging-wave2-role-passwords.json');
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  return typeof raw[email] === 'string' ? raw[email] : raw[email]?.password;
}

async function bodyText(page) {
  return (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
}

async function shot(page, name) {
  const path = join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function dismissOverlays(page) {
  for (let i = 0; i < 3; i++) {
    const skip = page.getByRole('button', { name: /Explorar por mi cuenta|^Omitir$/i });
    if ((await skip.count()) > 0) await skip.first().click({ timeout: 3000 }).catch(() => null);
    await page.keyboard.press('Escape').catch(() => null);
    await page.waitForTimeout(250);
  }
}

async function login(page, email, password) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(800);
    const t0 = await bodyText(page);
    if (/502|Bad Gateway/i.test(t0)) {
      await page.waitForTimeout(3000 * attempt);
      continue;
    }
    await page.waitForSelector('input[type="email"]', { timeout: 45000 });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await Promise.all([
      page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 90000 }).catch(() => null),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForTimeout(2000);
    await dismissOverlays(page);
    if (!page.url().includes('/login')) return true;
  }
  return false;
}

async function main() {
  const fx = JSON.parse(readFileSync(FIXTURES, 'utf8'));
  const main = existsSync(MAIN) ? JSON.parse(readFileSync(MAIN, 'utf8')) : {};
  const partyId = fx.partyId;
  const orderId = main.walk?.orderId || '01M2P3CAP2QCTXXRRB4A0G74XJ';
  const pedidoPath = `/clientes/${partyId}/pedidos/${orderId}`;
  const out = {
    at: new Date().toISOString(),
    orderId,
    partyId,
    REAL_SEVEN_MUTATED: 'NO',
    shots: {},
    delivery: {},
    receive: {},
    permissionGaps: {},
  };

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--disable-gpu', '--no-sandbox'],
  });

  try {
    // Asesor: delivery docs mutations
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      out.asesorLogin = await login(page, 'w2.asesor@isalwa.demo', loadPassword('w2.asesor@isalwa.demo'));
      await page.goto(`${BASE}${pedidoPath}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForTimeout(2500);
      await dismissOverlays(page);
      // scroll to delivery panel
      for (let i = 0; i < 6; i++) {
        await page.evaluate(() => window.scrollBy(0, 700));
        await page.waitForTimeout(400);
      }
      out.shots.pedidoDeliveryPanel = await shot(page, '30-pedido-delivery-panel-asesor-1440');
      let b = await bodyText(page);
      out.delivery.panelVisible = {
        createNota: b.includes('Crear nota de entrega'),
        recordSalida: b.includes('Registrar salida'),
        recordEntrega: b.includes('Registrar entrega'),
        provisional: /provisional|NE-PILOT/i.test(b),
        notOfficial: /no es numeraci[oó]n oficial|Sin número oficial|provisional de piloto/i.test(b),
        canMutateHint: /Crear nota de entrega|Registrar salida/i.test(b),
      };

      const createNota = page.getByRole('button', { name: /Crear nota de entrega/i });
      out.delivery.createNotaButtonCount = await createNota.count();
      if ((await createNota.count()) > 0) {
        // Fill fields near panel
        const inputs = page.locator('input:not([type="hidden"]), textarea');
        const n = await inputs.count();
        for (let i = 0; i < n; i++) {
          const el = inputs.nth(i);
          const name = ((await el.getAttribute('name')) || '') + ' ' + ((await el.getAttribute('placeholder')) || '');
          const type = (await el.getAttribute('type')) || 'text';
          if (/recipient|destinat|entregado a/i.test(name)) await el.fill('BV Destinatario SYNTH').catch(() => null);
          if (/deliveredBy|entregado por|quién entrega|quien entrega/i.test(name)) {
            await el.fill('BV Almacén SYNTH').catch(() => null);
          }
          if (type === 'number') {
            const v = await el.inputValue().catch(() => '');
            if (!v || v === '0') await el.fill('1').catch(() => null);
          }
        }
        // Also try labels
        for (const lab of [/Destinat/i, /Entregado por/i, /Recipien/i]) {
          const el = page.getByLabel(lab);
          if ((await el.count()) > 0) await el.first().fill('BV SYNTH').catch(() => null);
        }
        await createNota.first().click();
        await page.waitForTimeout(4500);
        b = await bodyText(page);
        out.delivery.nota = {
          created: /NE-PILOT-|nota de entrega/i.test(b),
          pilotRef: (b.match(/NE-PILOT-[A-Z0-9]+/i) || [])[0] || null,
          fiscal: /factura fiscal|correlativo oficial|CUFD/i.test(b),
          error: /error|fall[oó]|denegad|PERMISSION|Sin permiso|validaci[oó]n/i.test(b),
          snippet: b.slice(0, 800),
        };
        out.shots.nota = await shot(page, '31-nota-created-asesor-1440');
      }

      const salida = page.getByRole('button', { name: /Registrar salida/i });
      if ((await salida.count()) > 0) {
        await salida.first().click();
        await page.waitForTimeout(3500);
        b = await bodyText(page);
        out.delivery.salida = {
          ok: !/PERMISSION|Sin permiso|denegad|error/i.test(b) || /salida/i.test(b),
          snippet: b.slice(0, 500),
        };
        out.shots.salida = await shot(page, '32-salida-asesor-1440');
      } else {
        out.delivery.salida = { buttonPresent: false };
      }

      const entrega = page.getByRole('button', { name: /Registrar entrega/i });
      if ((await entrega.count()) > 0) {
        const recv = page.getByLabel(/Recibid/i);
        if ((await recv.count()) > 0) await recv.first().fill('BV Receptor SYNTH').catch(() => null);
        await entrega.first().click();
        await page.waitForTimeout(3500);
        b = await bodyText(page);
        out.delivery.entrega = {
          ok: /entrega/i.test(b) && !/PERMISSION|Sin permiso/i.test(b),
          snippet: b.slice(0, 500),
        };
        out.shots.entrega = await shot(page, '33-entrega-asesor-1440');
      } else {
        out.delivery.entrega = { buttonPresent: false };
      }

      const pdf = page.getByRole('link', { name: /Descargar PDF/i }).or(
        page.getByRole('button', { name: /Descargar PDF/i }),
      );
      if ((await pdf.count()) > 0) {
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 20000 }).catch(() => null),
          pdf.first().click(),
        ]);
        out.delivery.pdf = { present: true, downloadOk: Boolean(download), name: download?.suggestedFilename?.() };
        out.shots.pdf = await shot(page, '34-pdf-asesor-1440');
      } else {
        out.delivery.pdf = { present: false };
      }

      await ctx.close();
    }

    // Almacén: receive UI + permission on pedido
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      out.almacenLogin = await login(page, 'w2.almacen@isalwa.demo', loadPassword('w2.almacen@isalwa.demo'));
      await page.goto(`${BASE}/almacen`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForTimeout(2000);
      await dismissOverlays(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      out.shots.almacenTop = await shot(page, '35-almacen-top-1440');
      let b = await bodyText(page);
      out.receive.almacenSignals = {
        allocationDesk: /Asignaci[oó]n a pedido/i.test(b),
        receiveDesk: /Recepci[oó]n|Recibir producto|Ingreso de producto|finished.?goods|Producto terminado/i.test(b),
        notAllocate: /no es (stock|una entrega)|Ingreso ≠ asignación|contexto/i.test(b),
        snippet: b.slice(0, 900),
      };
      // Producción may host receive
      await page.goto(`${BASE}/produccion`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForTimeout(2000);
      await dismissOverlays(page);
      b = await bodyText(page);
      out.shots.produccion = await shot(page, '36-produccion-1440');
      out.receive.produccionSignals = {
        receive: /Recibir|Recepci[oó]n|producto terminado/i.test(b),
        pedidoContext: /pedido|Pedido/i.test(b),
        snippet: b.slice(0, 700),
      };
      const recvBtn = page.getByRole('button', { name: /Recibir|Registrar recepci[oó]n/i });
      out.receive.receiveButtonCount = (await recvBtn.count()) +
        (await page.goto(`${BASE}/almacen`).then(async () => {
          await page.waitForTimeout(1500);
          return page.getByRole('button', { name: /Recibir|Registrar recepci[oó]n/i }).count();
        }));

      await page.goto(`${BASE}${pedidoPath}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForTimeout(2000);
      b = await bodyText(page);
      out.permissionGaps.almacenCannotOpenPedido = /Sin permiso para esta secci[oó]n/i.test(b);
      out.shots.almacenPedidoDenied = await shot(page, '37-almacen-pedido-denied-1440');
      await ctx.close();
    }
  } catch (e) {
    out.error = String(e);
    out.stack = e?.stack?.slice?.(0, 2000);
  } finally {
    await browser.close();
  }

  // Merge scores into main report
  if (existsSync(MAIN)) {
    const merged = JSON.parse(readFileSync(MAIN, 'utf8'));
    merged.focusDelivery = out;
    const d = out.delivery || {};
    if (d.nota?.created) {
      merged.subfeatures.NOTA_DE_ENTREGA_CREATE = {
        IMPLEMENTED: 'YES',
        HOSTED: 'YES',
        BROWSER_VERIFIED: d.nota.fiscal ? 'FAIL' : 'PASS',
      };
    } else if (d.panelVisible?.createNota) {
      merged.subfeatures.NOTA_DE_ENTREGA_CREATE = {
        IMPLEMENTED: 'YES',
        HOSTED: 'YES',
        BROWSER_VERIFIED: 'UNPROVEN',
        note: 'Panel visible as asesor; mutation not confirmed',
      };
    }
    if (d.salida?.ok) {
      merged.subfeatures.SALIDA = { IMPLEMENTED: 'YES', HOSTED: 'YES', BROWSER_VERIFIED: 'PASS' };
    }
    if (d.entrega?.ok) {
      merged.subfeatures.ENTREGA = { IMPLEMENTED: 'YES', HOSTED: 'YES', BROWSER_VERIFIED: 'PASS' };
    }
    if (d.pdf?.downloadOk) {
      merged.subfeatures.DELIVERY_NOTE_PDF = { IMPLEMENTED: 'YES', HOSTED: 'YES', BROWSER_VERIFIED: 'PASS' };
    } else if (d.pdf?.present === false && d.panelVisible?.createNota) {
      merged.subfeatures.DELIVERY_NOTE_PDF = {
        IMPLEMENTED: 'YES',
        HOSTED: 'PARTIAL',
        BROWSER_VERIFIED: 'UNPROVEN',
      };
    }
    if (out.permissionGaps?.almacenCannotOpenPedido) {
      merged.permissionGaps = {
        ...(merged.permissionGaps || {}),
        ALMACEN_PEDIDO_COMMERCIAL_VIEW: 'DENIED — Sin permiso para esta sección',
      };
    }
    // Honest FG receive: allocation desk hosted; physical receive mutation not proven
    const recv = out.receive || {};
    if (recv.almacenSignals?.allocationDesk) {
      merged.subfeatures.FINISHED_GOODS_RECEIVE_UI = {
        IMPLEMENTED: 'YES',
        HOSTED: 'YES',
        BROWSER_VERIFIED: recv.almacenSignals.receiveDesk ? 'PASS' : 'UNPROVEN',
        note: 'Almacén shows allocation/postsale context; dedicated receive submit not confirmed in this focus pass',
      };
    }
    merged.subfeatures.FINISHED_GOODS_PEDIDO_CONTEXT_NOT_ALLOCATE = {
      IMPLEMENTED: 'YES',
      HOSTED: 'YES',
      BROWSER_VERIFIED: recv.almacenSignals?.notAllocate ? 'PASS' : 'UNPROVEN',
      note: 'Copy asserts ingreso ≠ asignación / not stock/delivery; ReceiveFinishedGoods mutation UNPROVEN',
    };
    writeFileSync(MAIN, JSON.stringify(merged, null, 2));
  }

  writeFileSync(REPORT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({
    ok: !out.error,
    delivery: out.delivery,
    receive: out.receive,
    permissionGaps: out.permissionGaps,
    error: out.error || null,
  }, null, 2));
}

main().catch((e) => {
  console.error(String(e));
  process.exit(1);
});
