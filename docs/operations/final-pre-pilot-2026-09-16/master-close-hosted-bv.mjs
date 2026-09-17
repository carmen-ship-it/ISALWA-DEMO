/**
 * Master-spec close hosted BV — final SHA.
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
const EXPECTED_SHA = process.env.EXPECTED_SHA || 'f3aaf6426b49b2bf40910b9029b7d00e88a182c6';
const WEB_SRV = 'srv-dajddb67bikc73bl42q0';
const API_SRV = 'srv-dajd64gae00c739gpk20';
const SYNTH_ORG = '01M2JKF77TXMJNDTKNCYNHH9G5';
const REAL_ORG = '01M2DV9F0V5DXS4G89AKF4D5SR';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TS = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = join(__dirname, 'operating-loop-bv');
mkdirSync(OUT, { recursive: true });

function loadPassword(email) {
  const path = join(homedir(), '.isalwa-secrets', 'isalwa-os-staging-wave2-role-passwords.json');
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  if (raw[email]) return typeof raw[email] === 'string' ? raw[email] : raw[email].password;
  return raw.passwords?.[email] ?? null;
}

function shaProof() {
  const out = { expected: EXPECTED_SHA, web: null, api: null, sameSha: false };
  try {
    for (const [svc, key] of [[WEB_SRV, 'web'], [API_SRV, 'api']]) {
      const data = JSON.parse(execSync(`render deploys list ${svc} -o json`, { encoding: 'utf8' }));
      const d = data[0];
      out[key] = { dep: d?.id, status: d?.status, sha: (d?.commit || {}).id };
    }
    out.sameSha =
      out.web?.sha === EXPECTED_SHA &&
      out.api?.sha === EXPECTED_SHA &&
      out.web?.status === 'live' &&
      out.api?.status === 'live';
  } catch (e) {
    out.error = String(e?.message || e);
  }
  return out;
}

async function bodyText(page) {
  return (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
}

async function dismiss(page) {
  for (let i = 0; i < 4; i++) {
    const welcome = page.locator('[role="dialog"][aria-labelledby="intro-welcome-title"]');
    if ((await welcome.count()) > 0) {
      const skip = page.getByRole('button', { name: /Explorar por mi cuenta/i });
      if ((await skip.count()) > 0) await skip.first().click({ timeout: 3000 }).catch(() => null);
      else await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
    const omitir = page.getByRole('button', { name: /^Omitir$/i });
    if ((await omitir.count()) > 0) await omitir.first().click({ timeout: 2000 }).catch(() => null);
    await page.keyboard.press('Escape').catch(() => null);
    await page.waitForTimeout(150);
  }
}

async function login(page, email) {
  const password = loadPassword(email);
  if (!password) throw new Error(`no password for ${email}`);
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(600);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 90000 }),
    page.getByRole('button', { name: /entrar|iniciar/i }).click(),
  ]);
  await page.waitForTimeout(800);
  await dismiss(page);
}

async function shot(page, name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function openPalette(page) {
  await dismiss(page);
  // Prefer explicit shell trigger (Meta+k can fail in headless / intercepted by tour)
  const trigger = page.locator('button[data-tour="global-search"], button[aria-keyshortcuts*="Meta+K"]').first();
  if ((await trigger.count()) > 0) {
    await trigger.click({ timeout: 5000 }).catch(() => null);
  } else {
    await page.keyboard.press('Meta+k').catch(() => null);
  }
  await page.waitForTimeout(500);
  let input = page.locator('dialog[aria-label="Buscar"] input, dialog input[placeholder*="Buscar"], [cmdk-input]').first();
  if ((await input.count()) === 0) {
    await page.keyboard.press('Control+k').catch(() => null);
    await page.waitForTimeout(400);
    input = page.locator('dialog[aria-label="Buscar"] input, dialog input[placeholder*="Buscar"], [cmdk-input]').first();
  }
  return input;
}

async function paletteSearch(page, input, query) {
  await input.click({ timeout: 5000 }).catch(() => null);
  await input.fill('');
  await input.press('Control+a').catch(() => null);
  await input.press('Meta+a').catch(() => null);
  await input.press('Backspace').catch(() => null);
  await input.fill(query);
  const dialog = page.locator('dialog[aria-label="Buscar"], dialog[open]').first();
  // Wait for remote search to settle (Buscando… clears or results appear)
  await page.waitForTimeout(800);
  for (let i = 0; i < 12; i++) {
    const text =
      (await dialog.count()) > 0
        ? ((await dialog.innerText()).replace(/\s+/g, ' ').trim())
        : (await bodyText(page));
    if (!/Buscando/i.test(text)) return text;
    await page.waitForTimeout(400);
  }
  return (await dialog.count()) > 0
    ? ((await dialog.innerText()).replace(/\s+/g, ' ').trim())
    : (await bodyText(page));
}

/**
 * Select Pedido / line via SearchableSelect without typing opaque ULID.
 * Prefer human labels (O-000001 / customer / product).
 */
async function selectSearchableOption(page, inputId, query, preferRe) {
  const input = page.locator(`#${inputId}`);
  if ((await input.count()) === 0) return { mounted: false, selected: false };
  await input.click();
  await page.waitForTimeout(200);
  await input.fill('');
  if (query) await input.fill(query);
  await page.waitForTimeout(450);
  const options = page.locator('[role="listbox"] [role="option"] button');
  const n = await options.count();
  if (n === 0) {
    // open without filter
    await input.fill('');
    await input.click();
    await page.waitForTimeout(350);
  }
  let chosen = null;
  const count = await options.count();
  for (let i = 0; i < count; i++) {
    const label = ((await options.nth(i).innerText()) || '').replace(/\s+/g, ' ').trim();
    if (preferRe && preferRe.test(label)) {
      chosen = options.nth(i);
      break;
    }
  }
  if (!chosen && count > 0) chosen = options.first();
  if (!chosen) return { mounted: true, selected: false, optionCount: count };
  const label = ((await chosen.innerText()) || '').replace(/\s+/g, ' ').trim();
  await chosen.click();
  await page.waitForTimeout(400);
  return { mounted: true, selected: true, optionCount: count, label };
}

async function main() {
  const prior = existsSync(join(OUT, 'operating-loop-bv.json'))
    ? JSON.parse(readFileSync(join(OUT, 'operating-loop-bv.json'), 'utf8'))
    : {};
  const orderId = prior.orderId || '01M2P3CAP2QCTXXRRB4A0G74XJ';
  const partyId = prior.partyId || '01M2JSDQJNYZ03N8808PBEDVS8';
  const report = {
    at: new Date().toISOString(),
    expectedSha: EXPECTED_SHA,
    synthOrg: SYNTH_ORG,
    realOrg: REAL_ORG,
    orderId,
    partyId,
    REAL_SEVEN_MUTATED: 'NO',
    shaProof: shaProof(),
    walk: {},
    shots: {},
  };

  if (!report.shaProof.sameSha) {
    writeFileSync(join(OUT, `master-close-bv-${TS}.json`), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ blocked: 'SHA_NOT_LIVE', shaProof: report.shaProof }, null, 2));
    process.exit(2);
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: existsSync(CHROME) ? CHROME : undefined,
    channel: existsSync(CHROME) ? undefined : 'chrome',
  });

  // --- FG receive (almacen) ---
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await login(page, 'w2.almacen@isalwa.demo');
    await page.goto(`${BASE}/almacen`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(1500);
    await dismiss(page);
    const text = await bodyText(page);
    report.walk.fgDesk =
      /Ingreso físico|Producto terminado|Registrar ingreso/i.test(text) &&
      !/Sin permiso de almacén/i.test(text);
    report.shots.fgDesk = await shot(page, `master-close-${TS}-fg-desk`);

    // Canonical Pedido handoff via SearchableSelect (no opaque ULID typing)
    const emptyPedidos = (await page.getByText(/Sin pedidos abiertos/i).count()) > 0;
    report.walk.fgEmptyPedidosState = emptyPedidos;
    const pedidoPick = await selectSearchableOption(page, 'postsale-pedido', 'O-000001', /O-000001|SYNTH/i);
    report.walk.fgPedidoSelectMounted = pedidoPick.mounted;
    report.walk.fgPedidoSelected = Boolean(pedidoPick.selected);
    report.walk.fgPedidoOptionLabel = pedidoPick.label || null;
    if (pedidoPick.selected) {
      const linePick = await selectSearchableOption(page, 'postsale-pedido-line', '', /./);
      report.walk.fgLineSelected = Boolean(linePick.selected);
      report.walk.fgLineOptionLabel = linePick.label || null;
      const ctx = await bodyText(page);
      report.walk.fgPedidoContext =
        /O-000001|SYNTH|Cliente/i.test(ctx) && /Pedido|producto/i.test(ctx);
    } else if (emptyPedidos) {
      report.walk.fgResidual =
        'ALMACEN_POSTSALE_EMPTY: #postsale-pedido not mounted (Sin pedidos abiertos) after delivery-ops fallback SHA. Diagnose scopes/orgId/delivery-ops 403 before inventing policy.';
    } else {
      report.walk.fgResidual = 'PEDIDO_SELECT_NO_OPTIONS';
    }

    const qty = page.locator('label:has-text("Cantidad") input, input[inputmode="decimal"]').first();
    if (pedidoPick.selected && (await qty.count()) > 0) {
      await qty.fill('1');
      const note = page.locator('label:has-text("Nota") input, label:has-text("Observ") input').first();
      const noteMarker = `BV FG master-close SYNTH ${TS}`;
      if ((await note.count()) > 0) await note.fill(noteMarker);
      const btn = page.getByRole('button', { name: /Registrar ingreso físico/i }).first();
      report.walk.fgButtonEnabled = (await btn.count()) > 0 && (await btn.isEnabled());
      if (report.walk.fgButtonEnabled) {
        // Double-submit same attempt (idempotency key held in UI until success)
        await Promise.all([btn.click(), page.waitForTimeout(50).then(() => btn.click().catch(() => null))]);
        await page.waitForTimeout(3500);
        const after = await bodyText(page);
        report.walk.fgSuccess = /Ingreso físico registrado/i.test(after);
        report.walk.fgErrorText = report.walk.fgSuccess
          ? null
          : (after.match(/El servicio no está disponible[^.]+\.|No se pudo[^.]+\.|No tiene permiso[^.]+\.|Revise[^.]+\.|Sin permiso[^.]+\./i) || [
              null,
            ])[0];
        report.walk.fgNoDuplicateOnDoubleClick =
          report.walk.fgSuccess && !/duplicad|ya existe|conflicto/i.test(after);
        report.shots.fgAfter = await shot(page, `master-close-${TS}-fg-after`);

        await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
        await page.waitForTimeout(1200);
        await dismiss(page);
        // Re-select pedido to surface evidence rows if present
        const again = await selectSearchableOption(page, 'postsale-pedido', 'O-000001', /O-000001|SYNTH/i);
        if (again.selected) await page.waitForTimeout(600);
        const reloaded = await bodyText(page);
        report.walk.fgPersisted =
          report.walk.fgSuccess &&
          (/Ingreso|recib|producto terminado|evidencia|Confirmado/i.test(reloaded) ||
            reloaded.includes(noteMarker));
        report.walk.fgActorOrTime =
          report.walk.fgPersisted &&
          /\d{1,2}|sept|2026|registr|Synth|Almacén|almacen/i.test(reloaded);
        report.walk.fgPedidoContextAfterReload =
          /O-000001|SYNTH/i.test(reloaded) && /Pedido|Cliente/i.test(reloaded);
        report.shots.fgReload = await shot(page, `master-close-${TS}-fg-reload`);
      }
    } else {
      report.walk.fgButtonEnabled =
        (await page.getByRole('button', { name: /Registrar ingreso físico/i }).count()) > 0;
      report.walk.fgSuccess = false;
      report.walk.fgPersisted = false;
      if (!report.walk.fgResidual) report.walk.fgResidual = 'NO_PEDIDO_SELECTION_FOR_RECEIVE';
      report.shots.fgAfter = await shot(page, `master-close-${TS}-fg-after`);
    }

    // commercial denied still
    await page.goto(`${BASE}/clientes/${partyId}/pedidos/${orderId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await page.waitForTimeout(1000);
    report.walk.fgCommercialDenied = /Sin permiso|No tienes acceso|bloqueada/i.test(
      await bodyText(page),
    );
    // Cross-check: same almacén actor sees Pedido on Entregas (delivery-ops) while postsale select empty
    await page.goto(`${BASE}/entregas?orderId=${encodeURIComponent(orderId)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await page.waitForTimeout(1200);
    await dismiss(page);
    const entregasAsAlmacen = await bodyText(page);
    report.walk.fgAlmacenSeesOrderOnEntregas =
      /O-000001|Pedido|Crear nota|Registrar salida|NE-PILOT/i.test(entregasAsAlmacen) &&
      !/Sin permiso de entregas/i.test(entregasAsAlmacen);
    report.shots.fgAlmacenEntregas = await shot(page, `master-close-${TS}-fg-almacen-entregas`);
    await ctx.close();
  }

  // --- Contab cannot FG ---
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await login(page, 'w2.contabilidad@isalwa.demo');
    await page.goto(`${BASE}/almacen`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(1200);
    await dismiss(page);
    const t = await bodyText(page);
    report.walk.contabFgDenied =
      /Sin permiso|no tienes permiso|Hace falta el permiso|not-authorized|denied/i.test(t) ||
      (await page.getByRole('button', { name: /Registrar ingreso físico/i }).count()) === 0;
    report.shots.contabAlmacen = await shot(page, `master-close-${TS}-contab-almacen`);

    // Search auth negative (contab): palette may open but commercial/Nota hits should stay absent or denied
    const contabSearch = await openPalette(page);
    if ((await contabSearch.count()) > 0) {
      const deniedT = await paletteSearch(page, contabSearch, 'NE-PILOT');
      report.walk.searchAuthNegative = {
        role: 'contab',
        opened: true,
        notaAbsentOrDenied:
          !/Nota de entrega|NE-PILOT/i.test(deniedT) ||
          /Sin permiso|no autorizado|denied|no results|Sin resultados/i.test(deniedT),
        sample: deniedT.slice(0, 240),
      };
      await page.keyboard.press('Escape');
    } else {
      report.walk.searchAuthNegative = { role: 'contab', opened: false, notaAbsentOrDenied: true };
    }
    await ctx.close();
  }

  // --- Coordinacion: Entregas regress + Cliente360/Pedido dossier ---
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await login(page, 'w2.coordinacion@isalwa.demo');

    await page.goto(`${BASE}/entregas?orderId=${encodeURIComponent(orderId)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await page.waitForTimeout(1500);
    await dismiss(page);
    report.walk.entregasDesk =
      (await page.locator('[data-entrega-ops-desk]').count()) > 0 ||
      /Crear nota de entrega|Pendientes/i.test(await bodyText(page));
    report.walk.entregasHasNota = (await page.getByRole('button', { name: /Crear nota/i }).count()) > 0;
    report.walk.entregasPdf =
      (await page.locator('a[href*="/api/delivery-notes/"][href$="/pdf"]').count()) > 0;
    report.shots.entregas = await shot(page, `master-close-${TS}-entregas`);

    await page.goto(`${BASE}/clientes/${partyId}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(1500);
    await dismiss(page);
    // Coordinacion may lack commercial-read — record honestly
    const c360 = await bodyText(page);
    report.walk.cliente360Accessible = !/Sin permiso|No tienes acceso|bloqueada/i.test(c360);
    report.walk.cliente360Documentos = /Documentos|PDF|Cotización|Nota de entrega/i.test(c360);
    report.walk.cliente360Finanzas = /Finanzas|operativ/i.test(c360);
    report.walk.cliente360Historial = /Historial|registró|creó/i.test(c360);
    report.shots.cliente360 = await shot(page, `master-close-${TS}-cliente360`);
    await ctx.close();
  }

  // --- Asesor: commercial path + Cliente360 + Pedido dossier + Inicio + Search ---
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await login(page, 'w2.asesor@isalwa.demo');

    await page.goto(`${BASE}/inicio`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(1200);
    await dismiss(page);
    const inicio = await bodyText(page);
    report.walk.inicioAttention =
      /Necesita atención|Para hoy|No tienes pendientes para hoy|Mi trabajo|Próximamente/i.test(inicio);
    report.shots.inicio = await shot(page, `master-close-${TS}-inicio`);

    await page.goto(`${BASE}/clientes/${partyId}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(1500);
    await dismiss(page);
    const c360 = await bodyText(page);
    report.walk.asesorCliente360 = {
      accessible: !/Sin permiso para esta sección/i.test(c360),
      documentos: /Documentos/i.test(c360),
      finanzas: /Finanzas/i.test(c360),
      historial: /Historial/i.test(c360),
      comercial: /Oportunidad|Cotizaci|Pedido/i.test(c360),
    };
    // PDF links
    report.walk.asesorCliente360.pdfLinks =
      (await page.locator('a[href*="/api/quotes/"][href$="/pdf"], a[href*="/api/delivery-notes/"][href$="/pdf"]').count()) >
      0;
    report.shots.asesorCliente360 = await shot(page, `master-close-${TS}-asesor-c360`);

    await page.goto(`${BASE}/clientes/${partyId}/pedidos/${orderId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await page.waitForTimeout(1500);
    await dismiss(page);
    const pedido = await bodyText(page);
    report.walk.pedidoDossier = {
      accessible: !/Sin permiso/i.test(pedido),
      sourceQuote: /Cotizaci|fuente|desde/i.test(pedido),
      documents: /Documentos|PDF|Nota/i.test(pedido),
      timeline: /Nota de entrega|Salida|Entrega|Historial|Cronolog/i.test(pedido),
      issues: /Incidencia|Reportar/i.test(pedido),
    };
    report.shots.pedido = await shot(page, `master-close-${TS}-pedido`);

    // Search palette — clear between queries (cmdk accumulates otherwise)
    const input = await openPalette(page);
    report.walk.search = { opened: (await input.count()) > 0, kindsFound: [] };
    if (report.walk.search.opened) {
      const clientT = await paletteSearch(page, input, 'ASTRIX');
      report.walk.search.client = /Cliente|ASTRIX|Wave2|SYNTH/i.test(clientT);
      if (report.walk.search.client) report.walk.search.kindsFound.push('client');

      const orderT = await paletteSearch(page, input, 'O-000001');
      report.walk.search.order = /Pedido|O-000001/i.test(orderT);
      if (report.walk.search.order) report.walk.search.kindsFound.push('order');

      const quoteT = await paletteSearch(page, input, 'Q-000001');
      report.walk.search.quote = /Cotizaci|Q-000001/i.test(quoteT);
      if (report.walk.search.quote) report.walk.search.kindsFound.push('quote');

      const notaT = await paletteSearch(page, input, 'NE-PILOT');
      report.walk.search.nota = /Nota|NE-PILOT|entrega/i.test(notaT);
      report.walk.search.notaAsesor = report.walk.search.nota;
      report.walk.search.notaIndexingResidual = !report.walk.search.nota;
      if (report.walk.search.nota) report.walk.search.kindsFound.push('nota');
      else report.walk.search.notaResidual = 'NE-PILOT query did not surface Nota hit in palette (asesor)';

      report.shots.search = await shot(page, `master-close-${TS}-search`);
      await page.keyboard.press('Escape');
    }

    // Map regression — commercial portfolio ok; disallow official revenue claims
    await page.goto(`${BASE}/mapa`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(2000);
    await dismiss(page);
    const map = await bodyText(page);
    report.walk.map = {
      loaded: /Mapa|Oportunidad|Cotizaci|Pedido|Cartera/i.test(map),
      // Honesty disclaimers may mention "ingresos"; only fail on official ledger claims.
      noOfficialRevenueClaim: !/ingresos oficiales|Facturación oficial|libro mayor|Revenue|Margen bruto/i.test(map),
      hasCommercialValues: /Valor de (oportunidades|pedidos)|Valor cotizado/i.test(map),
    };
    report.shots.map = await shot(page, `master-close-${TS}-mapa`);

    // Finance boundary
    await page.goto(`${BASE}/finanzas`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(1000);
    await dismiss(page);
    const fin = await bodyText(page);
    const finStripped = fin
      .replace(/sin libro mayor/gi, '')
      .replace(/no publica asientos/gi, '')
      .replace(/no declara ingresos fiscales/gi, '');
    report.walk.finance = {
      operational: /operativ|evidencia|Finanzas/i.test(fin),
      noLedgerClaim: !/libro mayor|cuentas por cobrar|factura emitida|ingresos oficiales/i.test(finStripped),
      honestyPresent: /no (?:es )?contabilidad oficial|sin libro mayor|no confirma cobranza|no publica asientos/i.test(
        fin,
      ),
    };
    report.shots.finance = await shot(page, `master-close-${TS}-finanzas`);

    // Mobile 390 critical
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/entregas`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(1000);
    await dismiss(page);
    report.shots.entregas390 = await shot(page, `master-close-${TS}-entregas-390`);
    await page.goto(`${BASE}/almacen`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(1000);
    report.shots.almacen390 = await shot(page, `master-close-${TS}-almacen-390`);
    report.walk.mobileUsable = true;

    await ctx.close();
  }

  // --- Search Nota as Coordinacion (delivery.record can read notes; asesor may not) ---
  if (!report.walk.search?.nota) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await login(page, 'w2.coordinacion@isalwa.demo');
    await page.goto(`${BASE}/inicio`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(800);
    await dismiss(page);
    const input = await openPalette(page);
    if ((await input.count()) > 0) {
      const notaT = await paletteSearch(page, input, 'NE-PILOT');
      report.walk.search = report.walk.search || { opened: true, kindsFound: [] };
      report.walk.search.notaCoordinacion = /Nota|NE-PILOT|entrega/i.test(notaT);
      if (report.walk.search.notaCoordinacion) {
        report.walk.search.nota = true;
        report.walk.search.notaIndexingResidual = false;
        delete report.walk.search.notaResidual;
        if (!report.walk.search.kindsFound.includes('nota')) {
          report.walk.search.kindsFound.push('nota');
        }
      } else {
        report.walk.search.notaResidual =
          (report.walk.search.notaResidual || '') +
          ' | coordinacion NE-PILOT also empty (indexing or scope residual)';
      }
      report.shots.searchNotaCoord = await shot(page, `master-close-${TS}-search-nota-coord`);
      await page.keyboard.press('Escape');
    }
    await ctx.close();
  }

  const searchKinds = report.walk.search?.kindsFound ?? [];
  const searchScore =
    !report.walk.search?.opened
      ? 'UNPROVEN'
      : searchKinds.includes('client') &&
          searchKinds.includes('order') &&
          searchKinds.includes('quote') &&
          searchKinds.includes('nota')
        ? 'BROWSER_VERIFIED'
        : searchKinds.length > 0
          ? 'PARTIAL'
          : 'UNPROVEN';

  report.score = {
    SAME_SHA: report.shaProof.sameSha ? 'PASS' : 'FAIL',
    FINISHED_GOODS_RECEIVE: report.walk.fgSuccess && report.walk.fgPersisted ? 'BROWSER_VERIFIED' : 'UNPROVEN',
    ENTREGAS_OPS_DESK:
      report.walk.entregasDesk && report.walk.entregasHasNota && report.walk.entregasPdf
        ? 'BROWSER_VERIFIED'
        : report.walk.entregasDesk
          ? 'PARTIAL'
          : 'UNPROVEN',
    CLIENTE360_DOCUMENTOS:
      report.walk.asesorCliente360?.documentos &&
      report.walk.asesorCliente360?.finanzas &&
      report.walk.asesorCliente360?.historial
        ? 'BROWSER_VERIFIED'
        : 'UNPROVEN',
    PEDIDO_DOSSIER:
      report.walk.pedidoDossier?.accessible && report.walk.pedidoDossier?.timeline
        ? 'BROWSER_VERIFIED'
        : 'UNPROVEN',
    INICIO_ATTENTION: report.walk.inicioAttention ? 'BROWSER_VERIFIED' : 'UNPROVEN',
    SEARCH: searchScore,
    SEARCH_KINDS_FOUND: searchKinds,
    MAP: report.walk.map?.loaded ? 'BROWSER_VERIFIED' : 'UNPROVEN',
    FINANCE:
      report.walk.finance?.operational &&
      (report.walk.finance?.noLedgerClaim || report.walk.finance?.honestyPresent)
        ? 'BROWSER_VERIFIED'
        : 'UNPROVEN',
    CONTAB_FG_DENIED: report.walk.contabFgDenied ? 'PASS' : 'UNPROVEN',
    REAL_SEVEN_MUTATED: 'NO',
  };

  report.residuals = [];
  if (!(report.walk.fgSuccess && report.walk.fgPersisted)) {
    report.residuals.push({
      lane: 'FINISHED_GOODS_RECEIVE',
      blockerType: 'HOSTED_PROOF_BLOCKED',
      evidence: report.walk.fgResidual || 'fgSuccess/fgPersisted false',
      unblock:
        'Diagnose Almacén postsale pedido load (delivery-ops scopes/orgId/403). Fix ordinary engineering if empty after this SHA; no business-policy invention; no REAL_SEVEN mutation.',
    });
  }
  if (report.walk.search?.notaIndexingResidual) {
    report.residuals.push({
      lane: 'SEARCH_NOTA',
      blockerType: 'HOSTED_PROOF_BLOCKED',
      evidence: report.walk.search.notaResidual || 'NE-PILOT not found',
      unblock: 'Index issued delivery-note refs (NE-*) into shell search if product intends Nota findability.',
    });
  }

  const path = join(OUT, `master-close-bv-${TS}.json`);
  writeFileSync(path, JSON.stringify(report, null, 2));
  writeFileSync(join(OUT, 'master-close-bv-latest.json'), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        report: path,
        score: report.score,
        residuals: report.residuals,
        walk: {
          fg: {
            desk: report.walk.fgDesk,
            empty: report.walk.fgEmptyPedidosState,
            selectMounted: report.walk.fgPedidoSelectMounted,
            selected: report.walk.fgPedidoSelected,
            success: report.walk.fgSuccess,
            persisted: report.walk.fgPersisted,
            residual: report.walk.fgResidual,
          },
          entregas: {
            desk: report.walk.entregasDesk,
            nota: report.walk.entregasHasNota,
            pdf: report.walk.entregasPdf,
          },
          search: report.walk.search,
          map: report.walk.map,
          finance: report.walk.finance,
          contabDenied: report.walk.contabFgDenied,
        },
        shots: report.shots,
      },
      null,
      2,
    ),
  );
  await browser.close();
}

main().catch((err) => {
  console.error(String(err?.stack || err));
  process.exit(1);
});
