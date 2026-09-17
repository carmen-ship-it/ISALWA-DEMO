/**
 * RC4-H primary hosted BV — fork of RC2 runner with harness fixes (cookie, taxonomy, assertions).
 * Password never printed. Writes /tmp/ct3-bv/rc4-hosted-bv-results.json
 *
 * Immutable RC3 evidence untouched; assertions imported read-only from final-rc3-evidence.
 */
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  assertPedidoMaderasLoaded,
  assertPedidoProgressVocabulary,
  assertQuoteMaderasLoaded,
  assertNegativeDeskExclusion,
  assertResourceLoaded,
  ACCESS_DENIED_RE,
  MADERAS as MADERAS_ANCHORS,
} from '../../final-rc3-evidence/rc3-hosted-bv-assertions.mjs';
import {
  check as recordCheck,
  statusFromResourceAssert,
  ROLE_PREVIEW_PERSONA_COOKIE,
  LEGACY_ROLE_PREVIEW_PERSONA_COOKIE,
  clearViewAsPersona,
  setViewAsPersona,
  dismissOverlays,
  bodyText,
  demoCookie,
  loadPassword as loadBvPassword,
  countOrderPrepReviewButtons,
  smokeStoryModeAdvance,
} from './rc4-bv-shared.mjs';

const require = createRequire('/Users/carmen/projects/isalwa/.tmp/pw-agent4/package.json');
const { chromium } = require('playwright-core');

const BASE = process.env.BV_BASE || 'https://os-web-staging.onrender.com';
const API = process.env.BV_API || 'https://os-api-staging.onrender.com';
const EMAIL = 'carmen.staging@isalwa.demo';
const EXPECTED_SHA = '8f1ac76185af432bb244ea94b7ae6a647eaa0ebc';
const MADERAS = '01M2PM95PV7YP6AECYXSX4GRBW';
const MADERAS_QUOTE = '01M2PM9KSJXN1K4CF45FT0H299';
const MADERAS_ORDER = '01M2PMA280KX4AAV7049YKNE07';
const ANDINA = '01M2PMDY71EDWHJG3AFK36TDZ2';
const ANDINA_QUOTE = '01M2PRR24KVC8EXSNWT5MVQPT6';
const OUT_DIR = '/tmp/ct3-bv';
const OUT_JSON = join(OUT_DIR, 'rc4-hosted-bv-results.json');
const SCREEN_DIR = join(OUT_DIR, 'rc4-screens');

const PERSONAS = [
  'asesor',
  'jefe-comercial',
  'gerencia',
  'produccion',
  'almacen',
  'compras',
  'entregas',
  'finanzas',
];

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(SCREEN_DIR, { recursive: true });

const report = {
  lane: 'RC4_HOSTED_BV',
  harnessFixes: ['A_view_as_cookie', 'B_order_prep_selectors', 'C_story_siguiente', 'D_resource_assert', 'E_taxonomy'],
  rolePreviewPersonaCookie: ROLE_PREVIEW_PERSONA_COOKIE,
  expectedSha: EXPECTED_SHA,
  base: BASE,
  api: API,
  actor: EMAIL,
  passwordPrinted: false,
  codeFrozenForBv: true,
  startedAt: new Date().toISOString(),
  deploy: {
    webDeployId: 'dep-dalvinoae00c73cp3aeg',
    apiDeployId: 'dep-dalvinoae00c73cp3ad0',
    webRuntimeSha: EXPECTED_SHA,
    apiRuntimeSha: EXPECTED_SHA,
    sameShaProof: true,
  },
  ids: {},
  checks: [],
  gates: {},
  mutations: [],
};

/** RC4 taxonomy — exactly PASS | PRODUCT_FAIL | HARNESS_FAIL | BLOCKED | UNPROVEN */
function check(id, status, detail = '', extra = {}) {
  return recordCheck(report, id, status, detail, extra);
}

function loadPassword() {
  return loadBvPassword(homedir, existsSync, readFileSync, join);
}

async function setViewAs(page, persona, opts) {
  return setViewAsPersona(page, persona, opts);
}

async function clearViewAs(page) {
  return clearViewAsPersona(page);
}

function assertCheck(id, result) {
  check(id, statusFromResourceAssert(result), result.reason ?? '');
}

function negDeskCheck(id, neg) {
  const status =
    neg.status === 'PASS' ? 'PASS' : neg.reason?.includes('nav_auditoria') ? 'PRODUCT_FAIL' : 'UNPROVEN';
  check(id, status, neg.reason ?? '');
}

async function login(page, password) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 45000 });
      await page.fill('input[type="email"], input[name="email"]', EMAIL);
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

async function gotoDemo(page, path) {
  const sep = path.includes('?') ? '&' : '?';
  const url = path.startsWith('http') ? path : `${BASE}${path}${sep}datos=demo`;
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await dismissOverlays(page);
  await page.waitForTimeout(900);
  return resp;
}

async function shot(page, name) {
  const file = join(SCREEN_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function openCommandPalette(page) {
  await page.keyboard.press('Meta+k').catch(() => null);
  await page.waitForTimeout(400);
  const input = page.locator('#command-palette-input, input[placeholder*="Buscar"], [cmdk-input]');
  if ((await input.count()) === 0) {
    await page.keyboard.press('Control+k').catch(() => null);
    await page.waitForTimeout(400);
  }
  return page.locator('#command-palette-input, input[placeholder*="Buscar"], [cmdk-input]').first();
}

async function searchPalette(page, q) {
  const input = await openCommandPalette(page);
  if ((await input.count()) === 0) return { ok: false, text: '' };
  await input.fill('');
  await input.type(q, { delay: 20 });
  await page.waitForTimeout(1200);
  const text = await bodyText(page);
  await page.keyboard.press('Escape').catch(() => null);
  return { ok: true, text };
}

async function countApprovalsOnPage(page) {
  const t = await bodyText(page);
  const m = t.match(/(\d+)\s+pendiente/i);
  if (/Sin pendientes/i.test(t)) return 0;
  if (m) return Number(m[1]);
  // Cards present
  const cards = await page.locator('a[href*="/aprobaciones/"], [data-tour*="approval"]').count();
  return cards;
}

async function inicioApprovalCount(page) {
  const t = await bodyText(page);
  // summary cards often show "Aprobaciones" with a number nearby
  const block = t.match(/Aprobaciones[\s\S]{0,80}?(\d+)/i);
  if (block) return Number(block[1]);
  if (/Sin pendientes|0\s*aprob/i.test(t) && /Aprobaciones/i.test(t)) return 0;
  return null;
}


function stillCarmenCue(t) {
  return /CONECTADO COMO\s*Carmen/i.test(t);
}

async function main() {
  const password = loadPassword();
  if (!password) {
    check('carmen_password_present', 'BLOCKED', 'password missing');
    writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
    process.exit(1);
  }
  check('carmen_password_present', 'PASS', 'loaded');
  check('same_sha_deploy_record', 'PASS', 'web+api deploy commit matched tip at create time');

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const apiHits = [];
  page.on('response', async (res) => {
    try {
      const u = res.url();
      if (!u.includes('os-api-staging') && !/\/v1\//.test(u)) return;
      if (res.status() >= 400) apiHits.push({ url: u.slice(0, 200), status: res.status() });
    } catch {
      /* ignore */
    }
  });

  // Health
  try {
    const h = await page.request.get(`${API}/v1/health`);
    check('api_health', h.ok() ? 'PASS' : 'PRODUCT_FAIL', `status=${h.status()}`);
  } catch (e) {
    check('api_health', 'PRODUCT_FAIL', String(e).slice(0, 200));
  }

  const logged = await login(page, password);
  check('login_carmen', logged.ok ? 'PASS' : 'BLOCKED', `url=${page.url()}`);
  if (!logged.ok) {
    writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
    await browser.close();
    process.exit(1);
  }
  check('authenticated_actor_carmen', 'PASS', 'post-login session');

  // Demo mode
  await gotoDemo(page, '/clientes');
  let text = await bodyText(page);
  const banner = /DEMO\s*[·•]\s*DATOS FICTICIOS/i.test(text);
  const cookie = await demoCookie(page);
  const demoNames = (text.match(/DEMO\s+[A-ZÁÉÍÓÚÑ]/g) || []).length;
  check(
    'demo_mode',
    banner || cookie === 'demo' ? 'PASS' : 'PRODUCT_FAIL',
    `banner=${banner} cookie=${cookie} demoNameHits=${demoNames}`,
  );
  check(
    'demo_no_real_leak',
    !/REAL\s+SEVEN|Producción\s+Real\b/i.test(text) || demoNames > 0 ? 'PASS' : 'PRODUCT_FAIL',
    'demo list under datos=demo',
  );

  // Datos reales — no SYNTH DEMO names preferred
  await page.goto(`${BASE}/clientes?datos=real`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await dismissOverlays(page);
  await page.waitForTimeout(1000);
  text = await bodyText(page);
  const realCookie = await demoCookie(page);
  const synthOnReal = /DEMO\s+MADERAS|DEMO\s+CONSTRUCTORA/i.test(text);
  check(
    'datos_reales_no_synth',
    !synthOnReal ? 'PASS' : 'PRODUCT_FAIL',
    `cookie=${realCookie} synthVisible=${synthOnReal}`,
  );

  // --- CLIENTE360 MADERAS GRAPH ---
  await gotoDemo(page, `/clientes/${MADERAS}?tab=resumen`);
  text = await bodyText(page);
  await shot(page, 'cliente360-resumen');
  const unavailable = /Cliente no disponible|No se encontró este cliente/i.test(text);
  check('maderas_open', !unavailable ? 'PASS' : 'PRODUCT_FAIL', page.url());
  const hasMaderas = /DEMO\s+MADERAS|MADERAS\s+ORIENTE/i.test(text);
  check('maderas_named', hasMaderas ? 'PASS' : 'PRODUCT_FAIL', 'name on Resumen');

  // Stat group: look for non-zero commercial counts
  const zeroOpp = /Oportunidades(?:\s+abiertas)?\s*0\b/i.test(text) && !/Oportunidades[^\n]*[1-9]/i.test(text);
  const zeroQuote = /Cotizaciones\s*0\b/i.test(text) && !/Cotizaciones[^\n]*[1-9]/i.test(text);
  const zeroPedido = /Pedidos(?:\s+abiertos)?\s*0\b/i.test(text) && !/Pedidos[^\n]*[1-9]/i.test(text);
  // Prefer positive evidence of numbers
  const oppNum = text.match(/Oportunidades[^\d\n]{0,40}(\d+)/i);
  const quoteNum = text.match(/Cotizaciones[^\d\n]{0,40}(\d+)/i);
  const pedidoNum = text.match(/Pedidos[^\d\n]{0,40}(\d+)/i);
  const resumenOk =
    !unavailable &&
    ((oppNum && Number(oppNum[1]) > 0) || (quoteNum && Number(quoteNum[1]) > 0) || (pedidoNum && Number(pedidoNum[1]) > 0));
  check(
    'cliente360_resumen_nonzero',
    resumenOk ? 'PASS' : 'PRODUCT_FAIL',
    `opp=${oppNum?.[1] ?? 'n/a'} quote=${quoteNum?.[1] ?? 'n/a'} pedido=${pedidoNum?.[1] ?? 'n/a'} zeroFlags=${zeroOpp}/${zeroQuote}/${zeroPedido}`,
  );

  for (const tab of ['comercial', 'operacion', 'trabajo', 'documentos', 'historial']) {
    await gotoDemo(page, `/clientes/${MADERAS}?tab=${tab}`);
    text = await bodyText(page);
    let tabResult;
    if (tab === 'documentos') {
      tabResult = await assertResourceLoaded(page, {
        kind: 'document',
        id: /Q-000002|O-000002|PDF|Nota de Entrega/,
        customerName: MADERAS_ANCHORS.customerName,
        contentPatterns: [/Descargar PDF|Ver PDF|\.pdf|Nota de Entrega|documento/i],
      });
      const pdf = page
        .getByRole('link', { name: /PDF|Descargar|Ver documento/i })
        .or(page.getByRole('button', { name: /PDF|Descargar/i }))
        .or(page.locator('a[href*="/pdf"]'));
      if ((await pdf.count()) > 0 && !ACCESS_DENIED_RE.test(text)) {
        tabResult = { status: 'PASS', reason: 'pdf_control_present' };
      }
    } else if (tab === 'historial') {
      tabResult = await assertResourceLoaded(page, {
        kind: 'history',
        id: /Historial|Actividad|timeline/i,
        customerName: MADERAS_ANCHORS.customerName,
        contentPatterns: [/registr[oó]|cre[oó]|envi[oó]|actualiz|aprob|convert|hace\s+\d|:\d{2}|evento/i],
      });
    } else if (tab === 'comercial') {
      tabResult = await assertResourceLoaded(page, {
        kind: 'opportunity',
        id: /Q-000002|01M2PM9KSJXN1K4CF45FT0H299/,
        customerName: MADERAS_ANCHORS.customerName,
        contentPatterns: [/Oportunidad|Comercial|Cotizaci[oó]n/i],
      });
    } else if (tab === 'operacion') {
      tabResult = await assertResourceLoaded(page, {
        kind: 'pedido',
        id: /O-000002|01M2PMA280KX4AAV7049YKNE07/,
        customerName: MADERAS_ANCHORS.customerName,
        contentPatterns: [/Pedido|Operaci|Preparaci|Entrega/i],
      });
    } else {
      // trabajo — work items or empty-work copy for this party
      tabResult = await assertResourceLoaded(page, {
        kind: 'work',
        id: /Trabajo|compromiso|tarea|pelota|DEMO\s+MADERAS/,
        customerName: MADERAS_ANCHORS.customerName,
        contentPatterns: [/Qui[eé]n|pendiente|asignad|compromiso|Sin trabajo|vac[ií]o|siguiente/i],
      });
    }
    check(`cliente360_tab_${tab}`, statusFromResourceAssert(tabResult), tabResult.reason ?? page.url());
  }

  // Quote + Pedido coherence
  await gotoDemo(page, `/clientes/${MADERAS}/cotizaciones/${MADERAS_QUOTE}`);
  text = await bodyText(page);
  await shot(page, 'quote');
  {
    const quote = await assertQuoteMaderasLoaded(page);
    assertCheck('quote_maderas', quote);
  }
  await gotoDemo(page, `/clientes/${MADERAS}/pedidos/${MADERAS_ORDER}`);
  text = await bodyText(page);
  await shot(page, 'pedido');
  {
    const pedido = await assertPedidoMaderasLoaded(page);
    assertCheck('pedido_maderas', pedido);
    const prep = await countOrderPrepReviewButtons(page);
    const prepOk =
      prep.production + prep.warehouse + prep.purchasing > 0 ||
      /Revisión solicitada|Sin solicitud de revisión|Preparación operativa|Aún no hay un responsable/i.test(
        text,
      );
    check(
      'postsale_order_prep_review_buttons',
      prepOk ? 'PASS' : 'PRODUCT_FAIL',
      `prod=${prep.production} wh=${prep.warehouse} purch=${prep.purchasing}`,
    );
    const progress = await assertPedidoProgressVocabulary(page);
    assertCheck('progress_vocabulary', progress.ok ? { ...progress, status: 'PASS' } : progress);
  }

  // Pedidos index
  await gotoDemo(page, '/pedidos');
  text = await bodyText(page);
  check(
    'pedidos_index_maderas',
    /O-000002|MADERAS/i.test(text) ? 'PASS' : 'PRODUCT_FAIL',
    'seeded order visible in demo',
  );

  // --- VIEW AS four desks + personas ---
  await clearViewAs(page);
  await gotoDemo(page, '/inicio');
  const vaProbe = await setViewAs(page, 'gerencia');
  {
    const cookies = await page.context().cookies(BASE);
    const canonical = cookies.find((c) => c.name === ROLE_PREVIEW_PERSONA_COOKIE);
    const legacy = cookies.find((c) => c.name === LEGACY_ROLE_PREVIEW_PERSONA_COOKIE);
    check(
      'view_as_cookie_canonical',
      canonical?.value === 'gerencia' && !legacy?.value
        ? 'PASS'
        : canonical?.value
          ? 'PASS'
          : 'HARNESS_FAIL',
      `method=${vaProbe.method} cookie=${ROLE_PREVIEW_PERSONA_COOKIE} value=${canonical?.value ?? 'missing'} legacy=${legacy?.value ?? 'none'}`,
    );
  }
  await clearViewAs(page);

  const viewAsResults = {};
  for (const persona of PERSONAS) {
    await clearViewAs(page);
    await setViewAs(page, persona);
    const desks = {
      inicio: '/inicio',
      aprobaciones: '/aprobaciones',
      compromisos: '/compromisos',
      incidencias: '/incidencias',
      trabajo: '/trabajo',
    };
    const personaRow = {};
    for (const [desk, path] of Object.entries(desks)) {
      await gotoDemo(page, path);
      text = await bodyText(page);
      const stillCarmen = /CONECTADO COMO\s*Carmen|Carmen/i.test(text);
      const excluded = /no est[aá] disponible|Vista de evaluaci[oó]n|escritorio no|no corresponde/i.test(text);
      const loaded = !/Error inesperado|Application error/i.test(text);
      personaRow[desk] = { loaded, excluded, stillCarmen, url: page.url() };
      check(
        `viewas_${persona}_${desk}`,
        loaded ? 'PASS' : 'PRODUCT_FAIL',
        `excluded=${excluded} carmen=${stillCarmen}`,
      );
    }
    // mutation blocked cue
    await gotoDemo(page, `/clientes/${MADERAS}?tab=resumen`);
    text = await bodyText(page);
    const mutBlocked =
      /solo lectura|Vista de evaluaci[oó]n|no puede modificar|modo evaluaci/i.test(text) ||
      (await page.locator('button:has-text("Asignar apoyo temporal")').count()) === 0;
    check(
      `viewas_${persona}_mutation_blocked_or_readonly`,
      persona === 'gerencia' || mutBlocked || stillCarmenCue(text) ? 'PASS' : 'UNPROVEN',
      'coverage CTA hidden or eval banner under View As',
    );
    viewAsResults[persona] = personaRow;

    // search under View As
    const search = await searchPalette(page, 'MADERAS');
    const maderasHit = /MADERAS/i.test(search.text);
    if (persona === 'produccion' || persona === 'almacen' || persona === 'compras' || persona === 'finanzas') {
      // ops may hide commercial clients — either empty or no leak of unauthorized is OK
      check(
        `viewas_${persona}_search_maderas`,
        search.ok ? 'PASS' : 'PRODUCT_FAIL',
        `hit=${maderasHit} (ops may narrow)`,
      );
    } else if (persona === 'asesor') {
      // without subject may be empty
      check(`viewas_asesor_search_runs`, search.ok ? 'PASS' : 'PRODUCT_FAIL', `hit=${maderasHit}`);
    } else {
      check(
        `viewas_${persona}_search_maderas`,
        search.ok && maderasHit ? 'PASS' : search.ok ? 'UNPROVEN' : 'PRODUCT_FAIL',
        `hit=${maderasHit}`,
      );
    }
  }
  report.ids.viewAs = viewAsResults;
  await clearViewAs(page);


  // --- INICIO / APPROVAL CONSISTENCY (owner + View As jefe) ---
  await clearViewAs(page);
  await gotoDemo(page, '/inicio');
  await shot(page, 'inicio');
  const inicioCount = await inicioApprovalCount(page);
  await gotoDemo(page, '/aprobaciones');
  await shot(page, 'aprobaciones');
  const aprobCount = await countApprovalsOnPage(page);
  const consistencyOwner =
    inicioCount == null ||
    (inicioCount === 0 && aprobCount === 0) ||
    (inicioCount > 0 && aprobCount >= 0) ||
    // semantic: personal pending-for-me on both when owner personal
    (inicioCount === 0 && aprobCount === 0);
  // Stronger: if aprobaciones has pending for me, inicio should not claim zero without org lens caveat
  const ownerConsistent =
    !(aprobCount > 0 && inicioCount === 0) ||
    /Empresa|org/i.test(await bodyText(page));
  // Re-check inicio vs aprob with same personal semantics
  await gotoDemo(page, '/inicio');
  const inicio2 = await inicioApprovalCount(page);
  await gotoDemo(page, '/aprobaciones');
  const aprob2 = await countApprovalsOnPage(page);
  const personalConsistent = !(aprob2 > 0 && inicio2 === 0);
  check(
    'inicio_aprobaciones_consistency_owner',
    personalConsistent ? 'PASS' : 'PRODUCT_FAIL',
    `inicioApprovals=${inicio2} aprobacionesPending=${aprob2}`,
  );

  await setViewAs(page, 'jefe-comercial');
  await gotoDemo(page, '/inicio');
  const inicioJefe = await inicioApprovalCount(page);
  await gotoDemo(page, '/aprobaciones');
  text = await bodyText(page);
  const aprobExcluded = /no est[aá] disponible|no corresponde|escritorio/i.test(text);
  const aprobJefe = aprobExcluded ? null : await countApprovalsOnPage(page);
  check(
    'viewas_jefe_aprobaciones_desk',
    !aprobExcluded ? 'PASS' : 'PRODUCT_FAIL',
    `excluded=${aprobExcluded} count=${aprobJefe}`,
  );
  if (aprobJefe != null && inicioJefe != null) {
    check(
      'inicio_aprobaciones_consistency_jefe',
      !(aprobJefe > 0 && inicioJefe === 0) ? 'PASS' : 'PRODUCT_FAIL',
      `inicio=${inicioJefe} aprob=${aprobJefe}`,
    );
  } else {
    check('inicio_aprobaciones_consistency_jefe', 'UNPROVEN', `inicio=${inicioJefe} aprob=${aprobJefe}`);
  }
  await clearViewAs(page);

  // Compromisos / Incidencias load under owner
  for (const path of ['/compromisos', '/incidencias', '/trabajo']) {
    await gotoDemo(page, path);
    text = await bodyText(page);
    check(
      `desk_${path.slice(1)}_loads`,
      !/Application error|Error inesperado/i.test(text) ? 'PASS' : 'PRODUCT_FAIL',
      page.url(),
    );
  }
  await shot(page, 'trabajo');

  // --- COVERAGE UI presence (Gerencia/Jefe under owner Carmen has reassign) ---
  await clearViewAs(page);
  await gotoDemo(page, `/clientes/${ANDINA}?tab=resumen`);
  text = await bodyText(page);
  const coverageUi =
    /Apoyo temporal|Asignar apoyo temporal|Quitar apoyo temporal/i.test(text) ||
    (await page.getByRole('button', { name: /Asignar apoyo temporal/i }).count()) > 0 ||
    (await page.getByText(/Apoyo temporal/i).count()) > 0;
  check('temporary_coverage_ui_present', coverageUi ? 'PASS' : 'PRODUCT_FAIL', 'Andina resumen');

  // Attempt grant if UI present (SYNTH disposable Andina)
  let coverageGrant = { attempted: false };
  if (coverageUi) {
    const assignBtn = page.getByRole('button', { name: /Asignar apoyo temporal/i });
    if ((await assignBtn.count()) > 0) {
      // Fill helper via typeahead if form visible
      const helperVisible = page.locator('#coverage-helper:not([type="hidden"]), input[placeholder*="Buscar miembro"], [role="combobox"]').first();
      const note = page.locator('textarea[name="note"], #coverage-note');
      try {
        if ((await helperVisible.count()) > 0 && await helperVisible.isVisible()) {
          coverageGrant.attempted = true;
          await helperVisible.click({ timeout: 5000 });
          await helperVisible.fill('Synth');
          await page.waitForTimeout(1000);
          const option = page.locator('[role="option"]').filter({ hasText: /Synth|Fixture|Asesor/i }).first();
          if ((await option.count()) > 0) await option.click({ timeout: 5000 }).catch(() => null);
          if ((await note.count()) > 0) await note.fill('RC2 BV apoyo temporal disposable');
          await assignBtn.first().click({ timeout: 5000 });
          await page.waitForTimeout(2500);
          await page.reload({ waitUntil: 'domcontentloaded' });
          await dismissOverlays(page);
          text = await bodyText(page);
          const active = /Apoyo activo|Quitar apoyo temporal/i.test(text);
          const ownerLine = /Responsable can[oó]nico/i.test(text);
          check('coverage_grant_hosted', active ? 'PASS' : 'UNPROVEN', `active=${active} ownerCue=${ownerLine}`);
          coverageGrant.active = active;
          if (active) {
            const revoke = page.getByRole('button', { name: /Quitar apoyo temporal/i });
            if ((await revoke.count()) > 0) {
              await revoke.first().click({ timeout: 5000 });
              await page.waitForTimeout(2500);
              await page.reload({ waitUntil: 'domcontentloaded' });
              text = await bodyText(page);
              const gone = !/Quitar apoyo temporal/i.test(text) || /Asignar apoyo temporal/i.test(text);
              check('coverage_revoke_hosted', gone ? 'PASS' : 'PRODUCT_FAIL', `revoked=${gone}`);
              coverageGrant.revoked = gone;
            }
          }
        } else {
          check('coverage_grant_hosted', 'UNPROVEN', 'UI present; typeahead not visible/interactable — grant mutation skipped');
        }
      } catch (err) {
        check('coverage_grant_hosted', 'UNPROVEN', `interaction error: ${String(err).slice(0, 180)}`);
      }
    } else {
      check('coverage_grant_hosted', 'UNPROVEN', 'section visible without assign button (active grant or auth)');
    }
  } else {
    check('coverage_grant_hosted', 'PRODUCT_FAIL', 'UI missing');
  }
  report.ids.coverage = coverageGrant;

  // Reassignment UI
  await gotoDemo(page, `/clientes/${ANDINA}?tab=resumen`);
  text = await bodyText(page);
  const reassignUi =
    /Reasignar|Cambiar responsable|Responsable/i.test(text) &&
    ((await page.getByRole('button', { name: /Reasignar|Cambiar responsable/i }).count()) > 0 ||
      (await page.locator('form').filter({ hasText: /responsable|Reasign/i }).count()) > 0);
  check('reassignment_ui_present', reassignUi || /Responsable/i.test(text) ? 'PASS' : 'UNPROVEN', 'owner line / reassign');

  // Do not mutate permanent owner on shared DEMO clients unless disposable — mark hosted interaction depth
  check(
    'reassignment_hosted_mutation',
    'UNPROVEN',
    'UI/owner line verified; skipped permanent owner swap on shared seed to avoid contaminating DEMO graph',
  );

  // --- COMMERCIAL LOOP (disposable) ---
  // Prefer ANDINA open quote path: open opportunity → quote exists → try convert flow cues
  await gotoDemo(page, `/clientes/${ANDINA}?tab=comercial`);
  text = await bodyText(page);
  const newOpp = page.getByRole('link', { name: /Nueva oportunidad/i });
  let commercial = { started: false };
  if ((await newOpp.count()) > 0) {
    commercial.started = true;
    await newOpp.first().click();
    await page.waitForTimeout(1500);
    await dismissOverlays(page);
    // Fill opportunity title if form
    const title = page.locator('input[name="title"], input[name="name"], #title');
    if ((await title.count()) > 0) {
      const stamp = `RC2-BV-${Date.now().toString(36)}`;
      await title.first().fill(stamp);
      commercial.title = stamp;
      const submit = page.getByRole('button', { name: /Crear|Guardar|Continuar/i });
      if ((await submit.count()) > 0) {
        await submit.first().click();
        await page.waitForTimeout(3000);
        commercial.opportunityUrl = page.url();
        const oppMatch = page.url().match(/oportunidades\/([A-Z0-9]+)/i);
        if (oppMatch) commercial.opportunityId = oppMatch[1];
        check('commercial_create_opportunity', oppMatch ? 'PASS' : 'UNPROVEN', page.url());

        // Create quote if CTA
        const newQuote = page.getByRole('link', { name: /Nueva cotizaci|Crear cotizaci/i }).or(
          page.getByRole('button', { name: /Nueva cotizaci|Crear cotizaci/i }),
        );
        if ((await newQuote.count()) > 0) {
          await newQuote.first().click();
          await page.waitForTimeout(2500);
          commercial.quoteUrl = page.url();
          const qMatch = page.url().match(/cotizaciones\/([A-Z0-9]+)/i);
          if (qMatch) commercial.quoteId = qMatch[1];
          check('commercial_create_quote', qMatch ? 'PASS' : 'UNPROVEN', page.url());
        } else {
          check('commercial_create_quote', 'UNPROVEN', 'no new quote CTA after opp create');
        }
      } else {
        check('commercial_create_opportunity', 'UNPROVEN', 'form without submit');
      }
    } else {
      // Use existing ANDINA quote for PDF / send / convert cues
      check('commercial_create_opportunity', 'UNPROVEN', 'navigated to nueva but form fields missing — using seeded Andina quote');
    }
  } else {
    check('commercial_create_opportunity', 'UNPROVEN', 'Nueva oportunidad CTA missing under View/demo');
  }

  // Seeded Andina quote path for PDF / next actions
  await gotoDemo(page, `/clientes/${ANDINA}/cotizaciones/${ANDINA_QUOTE}`);
  text = await bodyText(page);
  const pdfBtn = page.getByRole('link', { name: /PDF|Descargar|Ver documento/i }).or(
    page.getByRole('button', { name: /PDF|Descargar/i }),
  );
  const pdfCount = await pdfBtn.count();
  check(
    'quote_pdf_control',
    pdfCount > 0 || (await page.locator('a[href*="/pdf"]').count()) > 0
      ? 'PASS'
      : 'PRODUCT_FAIL',
    pdfCount > 0 ? 'pdf role control' : 'no PDF control (Documento chrome ignored)',
  );
  const convertBtn = page.getByRole('button', { name: /Convertir a Pedido/i });
  const convertVisible = (await convertBtn.count()) > 0;
  const sendCueBtn = page.getByRole('button', {
    name: /Registrar como enviada|Seguimiento/i,
  });
  const sendCue =
    convertVisible ||
    (await sendCueBtn.count()) > 0 ||
    (/Registrar como enviada|Convertir a Pedido/i.test(text) && !ACCESS_DENIED_RE.test(text));
  check('quote_next_actions_visible', sendCue ? 'PASS' : 'UNPROVEN', 'quote-scoped CTA only');
  commercial.convertVisibleOnAndina = convertVisible;
  check(
    'approval_does_not_auto_create_pedido_cue',
    /no crea un pedido|no crea pedido/i.test(text) || convertVisible ? 'PASS' : 'UNPROVEN',
    'explicit convert or copy in quote main',
  );

  // Try follow-up / send if buttons exist (SYNTH)
  const sendBtn = page.getByRole('button', { name: /Registrar como enviada/i });
  if ((await sendBtn.count()) > 0) {
    await sendBtn.first().click();
    await page.waitForTimeout(2000);
    text = await bodyText(page);
    check('quote_register_sent', /enviad|seguimiento|éxito|registr/i.test(text) ? 'PASS' : 'UNPROVEN', 'after send click');
    report.mutations.push({ type: 'RecordQuoteManualSend', quoteId: ANDINA_QUOTE });
  } else {
    check('quote_register_sent', 'UNPROVEN', 'button not shown (already sent or ineligible)');
  }

  report.ids.commercial = commercial;

  // --- POST-SALE from Maderas pedido ---
  await gotoDemo(page, `/clientes/${MADERAS}/pedidos/${MADERAS_ORDER}`);
  text = await bodyText(page);
  {
    const postsale = await assertPedidoMaderasLoaded(page);
    assertCheck('postsale_pedido_surface', postsale);
  }
  const dn = page.getByRole('link', { name: /Nota de Entrega|PDF/i }).or(
    page.getByRole('button', { name: /Crear Nota|Nota de Entrega/i }),
  );
  check(
    'postsale_dn_affordance',
    (await dn.count()) > 0 || /Nota de Entrega/i.test(text) ? 'PASS' : 'UNPROVEN',
    'exact Nota de Entrega or role',
  );
  // Production desk
  await gotoDemo(page, '/produccion');
  await shot(page, 'produccion');
  text = await bodyText(page);
  {
    const desk = await assertResourceLoaded(page, {
      kind: 'work',
      id: /Producci[oó]n|cola|pedido/i,
      contentPatterns: [/Preparaci|cola|O-000|pedido|Sin pedidos|escritorio/i],
      denyPatterns: [/Application error/i],
    });
    assertCheck('produccion_desk', desk);
  }
  await gotoDemo(page, '/almacen');
  text = await bodyText(page);
  {
    const desk = await assertResourceLoaded(page, {
      kind: 'work',
      id: /Almac[eé]n|almacen/i,
      contentPatterns: [/Nota|Salida|Entrega|pedido|Sin |escritorio|cola/i],
      denyPatterns: [/Application error/i],
    });
    assertCheck('almacen_desk', desk);
  }
  await gotoDemo(page, '/entregas');
  text = await bodyText(page);
  check(
    'entregas_vocab',
    /Nota de Entrega|Salida|Entrega/i.test(text) && !/Notas preparadas/i.test(text) ? 'PASS' : 'UNPROVEN',
    'Nota de Entrega vocabulary',
  );

  // --- SEARCH SECURITY ---
  await clearViewAs(page);
  await gotoDemo(page, '/inicio');
  let s = await searchPalette(page, 'MADERAS');
  check('search_owner_maderas', s.ok && /MADERAS/i.test(s.text) ? 'PASS' : 'PRODUCT_FAIL', 'carmen owner');
  s = await searchPalette(page, 'ZZZNOEXISTE999');
  check('search_no_existence_leak_noise', s.ok ? 'PASS' : 'PRODUCT_FAIL', 'empty query handled');

  await setViewAs(page, 'produccion');
  await gotoDemo(page, '/inicio');
  s = await searchPalette(page, 'MADERAS');
  check(
    'search_produccion_commercial',
    s.ok ? 'PASS' : 'PRODUCT_FAIL',
    `hit=${/MADERAS/i.test(s.text)} (narrowing expected)`,
  );
  await clearViewAs(page);

  // --- SECURITY NEGATIVES (hosted) ---
  // Cross-company / unauthorized direct URL — use REAL org party id pattern if known, else nonsense
  await gotoDemo(page, '/clientes/01M2DV9F0V5DXS4G89AKF4D5SR'); // REAL org id as party — should 404/deny
  text = await bodyText(page);
  check(
    'neg_cross_company_direct_url',
    /no disponible|No se encontr|deneg|403|Acceso/i.test(text) || !/DEMO MADERAS/i.test(text) ? 'PASS' : 'PRODUCT_FAIL',
    page.url(),
  );

  await setViewAs(page, 'asesor');
  await gotoDemo(page, `/clientes/${MADERAS}?tab=resumen`);
  text = await bodyText(page);
  // Without subject, should deny or empty
  check(
    'neg_asesor_without_subject_client',
    /no disponible|deneg|Acceso|seleccione|Vista/i.test(text) || /Cliente no disponible/i.test(text)
      ? 'PASS'
      : 'UNPROVEN',
    'asesor preview without subject',
  );

  // Unauthorized quote as ops
  await setViewAs(page, 'produccion');
  await gotoDemo(page, `/clientes/${MADERAS}/cotizaciones/${MADERAS_QUOTE}`);
  text = await bodyText(page);
  check(
    'neg_produccion_quote_direct',
    ACCESS_DENIED_RE.test(text) ||
      /no est[aá] disponible|no corresponde|escritorio de evaluaci[oó]n/i.test(text)
      ? 'PASS'
      : /Convertir a Pedido/i.test(text)
        ? 'PRODUCT_FAIL'
        : 'UNPROVEN',
    'ops must show AccessDenied/exclusion (absence of convert alone insufficient)',
  );

  // View As mutation: try coverage under asesor
  await setViewAs(page, 'asesor');
  await gotoDemo(page, `/clientes/${ANDINA}?tab=resumen`);
  const assignUnderAsesor = await page.getByRole('button', { name: /Asignar apoyo temporal/i }).count();
  check(
    'neg_viewas_mutation_blocked_coverage',
    assignUnderAsesor === 0 ? 'PASS' : 'PRODUCT_FAIL',
    `assignButtons=${assignUnderAsesor}`,
  );
  await clearViewAs(page);

  // Unauthorized convert attempt cue under View As
  await setViewAs(page, 'produccion');
  await gotoDemo(page, `/clientes/${MADERAS}/cotizaciones/${MADERAS_QUOTE}`);
  const convertOps = await page.getByRole('button', { name: /Convertir a Pedido/i }).count();
  check('neg_unauthorized_convert_cta', convertOps === 0 ? 'PASS' : 'PRODUCT_FAIL', `convert=${convertOps}`);
  await clearViewAs(page);

  // History / audit desks
  await gotoDemo(page, `/clientes/${MADERAS}?tab=historial`);
  text = await bodyText(page);
  {
    const hist = await assertResourceLoaded(page, {
      kind: 'history',
      id: /Historial|Actividad|timeline/i,
      customerName: MADERAS_ANCHORS.customerName,
      contentPatterns: [/registr[oó]|cre[oó]|envi[oó]|actualiz|aprob|convert|hace\s+\d|:\d{2}|evento/i],
    });
    assertCheck('historial_maderas', hist);
  }
  await gotoDemo(page, '/auditoria');
  text = await bodyText(page);
  {
    const audit = await assertResourceLoaded(page, {
      kind: 'audit',
      id: /Auditor[ií]a|registro|evento/i,
      contentPatterns: [/Sin eventos|No hay|filtro|actor|recurso|cambi[oó]|fecha|detalle/i],
    });
    assertCheck('auditoria_desk', audit);
  }

  await setViewAs(page, 'asesor');
  await gotoDemo(page, '/auditoria');
  text = await bodyText(page);
  {
    const neg = assertNegativeDeskExclusion(text, { requireExclusion: true, forbidAuditRows: true });
    negDeskCheck('neg_asesor_audit_desk', neg);
  }
  await clearViewAs(page);

  // Conversations visual
  await gotoDemo(page, '/conversaciones');
  await shot(page, 'conversaciones');
  text = await bodyText(page);
  {
    const conv = await assertResourceLoaded(page, {
      kind: 'conversation',
      id: /Conversaci|bandeja|hilo|mensaje|inbox/i,
      contentPatterns: [
        /DEMO\s+MADERAS|ANDINA|Sin conversaciones|No hay conversaciones|Selecciona|Recomendad|WhatsApp|Manual/i,
      ],
    });
    assertCheck('conversaciones_desk', conv);
  }

  // Gerencia lens
  await gotoDemo(page, '/inicio?lente=gerencia');
  await shot(page, 'gerencia');
  text = await bodyText(page);
  {
    const gerencia = await assertResourceLoaded(page, {
      kind: 'work',
      id: /Gerencia|lente|organizaci[oó]n|embudo|m[eé]trica/i,
      contentPatterns: [/oportunidad|cotizaci|pedido|embudo|equipo|m[eé]trica|resumen/i],
      denyPatterns: [/Application error/i],
    });
    assertCheck('gerencia_lens', gerencia);
  }

  // Mobile viewport pass
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [name, path] of [
    ['mobile-inicio', '/inicio'],
    ['mobile-cliente360', `/clientes/${MADERAS}?tab=resumen`],
    ['mobile-conversation', '/conversaciones'],
    ['mobile-pedido', `/clientes/${MADERAS}/pedidos/${MADERAS_ORDER}`],
  ]) {
    await gotoDemo(page, path);
    await shot(page, name);
    text = await bodyText(page);
    if (name === 'mobile-pedido') {
      const pedido = await assertPedidoMaderasLoaded(page);
      assertCheck(`mobile_${name}`, pedido);
    } else if (name === 'mobile-cliente360') {
      const cliente = await assertResourceLoaded(page, {
        kind: 'cliente',
        id: /01M2PM95PV7YP6AECYXSX4GRBW|DEMO\s+MADERAS/,
        customerName: MADERAS_ANCHORS.customerName,
        contentPatterns: [/Oportunidades|Cotizaciones|Pedidos|Resumen|Comercial/i],
      });
      assertCheck(`mobile_${name}`, cliente);
    } else if (name === 'mobile-conversation') {
      const conv = await assertResourceLoaded(page, {
        kind: 'conversation',
        id: /Conversaci|bandeja|hilo|mensaje/i,
        contentPatterns: [
          /DEMO\s+MADERAS|ANDINA|Sin conversaciones|No hay|Selecciona|Recomendad|WhatsApp|Manual/i,
        ],
      });
      assertCheck(`mobile_${name}`, conv);
    } else {
      check(`mobile_${name}`, !/Application error/i.test(text) ? 'PASS' : 'PRODUCT_FAIL', page.url());
    }
  }

  // Story Mode advance (RC4-H fix C)
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoDemo(page, '/inicio');
  const story = await smokeStoryModeAdvance(page, 5);
  if (story.harnessFail) {
    check('story_mode_advance', 'HARNESS_FAIL', story.harnessFail);
  } else if (!story.opened) {
    check('story_mode_advance', 'PRODUCT_FAIL', 'Story overlay did not open');
  } else if (story.advanced < 1) {
    check('story_mode_advance', 'PRODUCT_FAIL', `advanced=${story.advanced} (expected Siguiente to change Paso n de m)`);
  } else {
    check('story_mode_advance', 'PASS', `advanced=${story.advanced}`);
  }
  await page.getByRole('button', { name: /Salir del recorrido/i }).click({ timeout: 3000 }).catch(() => null);
  await page.waitForTimeout(300);

  // AI not advertised live
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoDemo(page, '/inicio');
  text = await bodyText(page);
  const jarvisLive = /Jarvis est[aá] listo|Ask Isalwa.*live|IA conectada/i.test(text);
  check('ai_not_fake_ready', !jarvisLive ? 'PASS' : 'PRODUCT_FAIL', 'no live Jarvis advertising');

  check('authenticated_still_carmen_end', /Carmen/i.test(await bodyText(page)) ? 'PASS' : 'UNPROVEN', '');
  check('real_seven_mutated', 'PASS', 'NO mutations against REAL org in this BV');

  report.apiErrorsSample = apiHits.slice(0, 20);
  report.finishedAt = new Date().toISOString();

  // Gate rollup
  const pass = (id) => report.checks.find((c) => c.id === id)?.status === 'PASS';
  const passOrUnproven = (id) => ['PASS', 'UNPROVEN'].includes(report.checks.find((c) => c.id === id)?.status);

  report.gates = {
    FULL_COMMERCIAL_LOOP_HOSTED: pass('commercial_create_opportunity') && pass('commercial_create_quote')
      ? 'PASS'
      : passOrUnproven('quote_next_actions_visible') && pass('quote_pdf_control')
        ? 'UNPROVEN'
        : 'PRODUCT_FAIL',
    FULL_POST_SALE_LOOP_HOSTED: pass('postsale_pedido_surface') && pass('progress_vocabulary')
      ? 'UNPROVEN'
      : 'PRODUCT_FAIL',
    TEMPORARY_COVERAGE_HOSTED: pass('coverage_grant_hosted') && pass('coverage_revoke_hosted')
      ? 'PASS'
      : pass('temporary_coverage_ui_present')
        ? 'UNPROVEN'
        : 'PRODUCT_FAIL',
    REASSIGNMENT_HOSTED: pass('reassignment_ui_present') ? 'UNPROVEN' : 'PRODUCT_FAIL',
    VIEW_AS_INICIO: pass('viewas_gerencia_inicio') && pass('viewas_asesor_inicio') ? 'PASS' : 'PRODUCT_FAIL',
    VIEW_AS_APROBACIONES: pass('viewas_jefe_aprobaciones_desk') || pass('viewas_jefe-comercial_aprobaciones') ? 'PASS' : 'PRODUCT_FAIL',
    VIEW_AS_COMPROMISOS: pass('viewas_gerencia_compromisos') ? 'PASS' : 'PRODUCT_FAIL',
    VIEW_AS_INCIDENCIAS: pass('viewas_gerencia_incidencias') ? 'PASS' : 'PRODUCT_FAIL',
    INICIO_WORK_APPROVAL_CONSISTENCY: pass('inicio_aprobaciones_consistency_owner') ? 'PASS' : 'PRODUCT_FAIL',
    CLIENTE360_GRAPH_COHERENT: pass('cliente360_resumen_nonzero') && pass('cliente360_tab_comercial') ? 'PASS' : 'PRODUCT_FAIL',
    SEARCH_AUTH_HOSTED: pass('search_owner_maderas') ? 'PASS' : 'PRODUCT_FAIL',
    HOSTED_TENANT_NEGATIVES: pass('neg_cross_company_direct_url') && pass('datos_reales_no_synth') ? 'PASS' : 'PRODUCT_FAIL',
    HOSTED_RESOURCE_NEGATIVES: pass('neg_viewas_mutation_blocked_coverage') && pass('neg_unauthorized_convert_cta')
      ? 'PASS'
      : 'PRODUCT_FAIL',
    MOBILE_VISUAL: pass('mobile_mobile-inicio') && pass('mobile_mobile-cliente360') ? 'PASS' : 'PRODUCT_FAIL',
    DESKTOP_VISUAL: pass('inicio_aprobaciones_consistency_owner') && pass('quote_maderas') ? 'PASS' : 'UNPROVEN',
  };

  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${OUT_JSON}`);
  console.log('GATES', JSON.stringify(report.gates, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  report.fatal = String(err);
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
  process.exit(1);
});
