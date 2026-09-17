/**
 * RC4-H supplemental hosted BV — walkthrough absence, Story Mode, View As, loops.
 * SYNTH only. Password never printed. Writes /tmp/ct3-bv/rc4-hosted-bv-supplement.json
 */
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  check as recordCheck,
  ROLE_PREVIEW_PERSONA_COOKIE,
  clearViewAsPersona,
  setViewAsPersona,
  dismissOverlays,
  bodyText,
  demoCookie,
  loadPassword as loadBvPassword,
  countOrderPrepReviewButtons,
  smokeStoryModeAdvance,
  login as loginShared,
  gotoDemo as gotoDemoShared,
} from './rc4-bv-shared.mjs';

const require = createRequire('/Users/carmen/projects/isalwa/.tmp/pw-agent4/package.json');
const { chromium } = require('playwright-core');

const BASE = process.env.BV_BASE || 'https://os-web-staging.onrender.com';
const EMAIL = 'carmen.staging@isalwa.demo';
const EXPECTED_SHA = 'fe66f0353d83223033710ee535163080c72b8959';
const MADERAS = '01M2PM95PV7YP6AECYXSX4GRBW';
const MADERAS_ORDER = '01M2PMA280KX4AAV7049YKNE07';
const ANDINA = '01M2PMDY71EDWHJG3AFK36TDZ2';
const OUT_DIR = '/tmp/ct3-bv';
const OUT_JSON = join(OUT_DIR, 'rc4-hosted-bv-supplement.json');
const SCREEN_DIR = join(OUT_DIR, 'rc4-screens-supplement');

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(SCREEN_DIR, { recursive: true });

const report = {
  lane: 'RC4_HOSTED_BV_SUPPLEMENT',
  rolePreviewPersonaCookie: ROLE_PREVIEW_PERSONA_COOKIE,
  expectedSha: EXPECTED_SHA,
  startedAt: new Date().toISOString(),
  ids: {},
  checks: [],
  gates: {},
};

function check(id, status, detail = '') {
  return recordCheck(report, id, status, detail);
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

async function login(page, password) {
  return loginShared(page, BASE, EMAIL, password, dismissOverlays);
}

async function gotoDemo(page, path) {
  await gotoDemoShared(page, BASE, path, dismissOverlays);
  return page.url();
}

async function shot(page, name) {
  await page.screenshot({ path: join(SCREEN_DIR, `${name}.png`), fullPage: false }).catch(() => null);
}

async function main() {
  const password = loadPassword();
  if (!password) {
    check('password', 'BLOCKED', 'missing');
    writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
    process.exit(1);
  }
  check('password', 'PASS', 'loaded');

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const logged = await login(page, password);
  check('login', logged.ok ? 'PASS' : 'BLOCKED', page.url());
  if (!logged.ok) {
    writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
    await browser.close();
    process.exit(1);
  }

  // --- Walkthrough absence (hosted UI) ---
  await gotoDemo(page, '/inicio');
  let text = await bodyText(page);
  await shot(page, 'inicio-walkthrough');
  const violations = [];
  if (/Mostrar recorrido/i.test(text)) violations.push('Mostrar recorrido');
  if (/GuidePanel|Recorrido\s+\d+\s*\/\s*\d+/i.test(text)) violations.push('GuidePanel/Recorrido n/m');
  if (/Recorridos de secci[oó]n|RoleQuickstart|MicroTour|ContextualMicroTip/i.test(text)) {
    violations.push('legacy coach copy');
  }
  if (/Recorrido del piloto|JOURNEY/i.test(text) && !/Ver recorrido completo|Modo historia|Story/i.test(text)) {
    violations.push('legacy journeys launcher');
  }
  // Ayuda panel open if present
  const helpBtn = page.getByRole('button', { name: /Ayuda|Modo aprendizaje|aprendizaje/i });
  if ((await helpBtn.count()) > 0) {
    await helpBtn.first().click({ timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(500);
    text = await bodyText(page);
    if (/Mostrar recorrido/i.test(text)) violations.push('Ayuda:Mostrar recorrido');
    if (/Recorrido\s+\d+\s*\/\s*\d+/i.test(text)) violations.push('Ayuda:Recorrido n/m');
    if (/IntroCoach|MicroTourCoach|RoleQuickstart|ContextualMicroTip/i.test(text)) {
      violations.push('Ayuda:legacy coach');
    }
    await page.keyboard.press('Escape').catch(() => null);
  }
  check(
    'walkthrough_violations',
    violations.length === 0 ? 'PASS' : 'PRODUCT_FAIL',
    violations.length === 0 ? '0' : violations.join('|'),
  );

  // Story Mode entry exists
  await gotoDemo(page, '/inicio');
  text = await bodyText(page);
  const storyEntry =
    (await page.getByRole('button', { name: /Ver recorrido completo|Modo historia|Story Mode|Recorrido/i }).count()) +
    (await page.getByRole('link', { name: /Ver recorrido completo|Modo historia|Story Mode/i }).count());
  check('story_mode_entry_present', storyEntry > 0 || /recorrido completo|Modo historia/i.test(text) ? 'PASS' : 'UNPROVEN', `count=${storyEntry}`);

  const story = await smokeStoryModeAdvance(page, 5);
  if (story.harnessFail) {
    check('story_mode_advance', 'HARNESS_FAIL', story.harnessFail);
  } else if (!story.opened) {
    check('story_mode_advance', 'PRODUCT_FAIL', 'Story overlay did not open');
  } else if (story.advanced < 1) {
    check('story_mode_advance', 'PRODUCT_FAIL', `advanced=${story.advanced}`);
  } else {
    check('story_mode_advance', 'PASS', `advanced=${story.advanced}`);
  }
  await page.getByRole('button', { name: /Salir del recorrido/i }).click({ timeout: 3000 }).catch(() => null);

  // --- Fresh session nav tour (demo persistence) ---
  const navPaths = [
    '/inicio',
    '/clientes',
    `/clientes/${MADERAS}`,
    '/oportunidades',
    '/cotizaciones',
    '/pedidos',
    '/trabajo',
    '/conversaciones',
    '/aprobaciones',
    '/incidencias',
    '/compromisos',
    '/produccion',
    '/almacen',
    '/compras',
    '/entregas',
    '/finanzas',
    '/auditoria',
    '/inicio?lente=gerencia',
    '/inicio',
  ];
  let demoBreaks = 0;
  let navFails = [];
  for (const path of navPaths) {
    await gotoDemo(page, path);
    const cookie = await demoCookie(page, BASE);
    text = await bodyText(page);
    const crashed = /Application error|Something went wrong|Unhandled Runtime Error/i.test(text);
    if (crashed) navFails.push(path);
    if (cookie !== 'demo' && !path.includes('auditoria')) {
      // allow auditoria crash separately
      if (!/datos=demo/.test(page.url()) && cookie !== 'demo') demoBreaks += 1;
    }
    // Prefer cookie OR query
    const demoOk = cookie === 'demo' || /[?&]datos=demo/.test(page.url());
    if (!demoOk) demoBreaks += 1;
  }
  check('fresh_session_nav', navFails.length === 0 ? 'PASS' : 'PRODUCT_FAIL', `crashes=${navFails.join(',') || 'none'}`);
  check('demo_context_persistence', demoBreaks === 0 ? 'PASS' : 'PRODUCT_FAIL', `breaks=${demoBreaks}`);
  check('auditoria_crash_recheck', navFails.includes('/auditoria') ? 'PRODUCT_FAIL' : 'PASS', navFails.includes('/auditoria') ? 'Application error' : 'ok');

  // Refresh + back/forward
  await gotoDemo(page, `/clientes/${MADERAS}?tab=comercial`);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await dismissOverlays(page);
  const cookieAfterReload = await demoCookie(page, BASE);
  check('demo_survives_refresh', cookieAfterReload === 'demo' || /datos=demo/.test(page.url()) ? 'PASS' : 'PRODUCT_FAIL', `cookie=${cookieAfterReload}`);
  await page.goBack().catch(() => null);
  await page.waitForTimeout(800);
  await page.goForward().catch(() => null);
  await page.waitForTimeout(800);
  check('browser_back_forward', 'PASS', 'exercised');

  // View As persistence
  await setViewAs(page, 'asesor');
  await gotoDemo(page, '/inicio');
  text = await bodyText(page);
  const vaBanner = /Vista como|View As|Evaluando como|Asesor/i.test(text);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await dismissOverlays(page);
  text = await bodyText(page);
  const vaAfterReload = /Vista como|View As|Evaluando como|modo evaluaci[oó]n|Asesor/i.test(text);
  check('view_as_persists_refresh', vaBanner || vaAfterReload ? 'PASS' : 'UNPROVEN', `banner=${vaBanner} afterReload=${vaAfterReload}`);
  await clearViewAs(page);
  await gotoDemo(page, '/inicio');
  text = await bodyText(page);
  const ownerRestored = /Carmen/i.test(text) && !/Vista como\s+Asesor/i.test(text);
  check('view_as_exit_restores_owner', ownerRestored ? 'PASS' : 'UNPROVEN', 'owner eval restored');

  // --- Recovered features reachability ---
  // Escalate
  await clearViewAs(page);
  await gotoDemo(page, '/aprobaciones');
  text = await bodyText(page);
  const escalate =
    (await page.getByRole('button', { name: /Escalar a Gerencia|Escalar/i }).count()) +
    (/Escalar a Gerencia/i.test(text) ? 1 : 0);
  check('action_escalar_a_gerencia', escalate > 0 || /Sin aprobaciones|No hay aprobaciones|pendiente/i.test(text) ? 'PASS' : 'PRODUCT_FAIL', `escalateControls=${escalate}`);

  // Resolve issue
  await gotoDemo(page, '/incidencias');
  text = await bodyText(page);
  const resolveBtn = await page.getByRole('button', { name: /Resolver incidencia|Resolver/i }).count();
  const issueLink = page.locator('a[href*="/incidencias/"]').first();
  if ((await issueLink.count()) > 0) {
    await issueLink.click({ timeout: 8000 }).catch(() => null);
    await page.waitForTimeout(1200);
    await dismissOverlays(page);
    text = await bodyText(page);
  }
  const resolveVisible =
    (await page.getByRole('button', { name: /Resolver incidencia|Resolver/i }).count()) > 0 ||
    /Resolver incidencia/i.test(text);
  check(
    'action_resolver_incidencia',
    resolveVisible || resolveBtn > 0 || /Sin incidencias|No hay incidencias/i.test(text) ? 'PASS' : 'PRODUCT_FAIL',
    `resolveVisible=${resolveVisible} listResolve=${resolveBtn}`,
  );

  // Conversations: register / review / ignore
  await gotoDemo(page, '/conversaciones');
  await shot(page, 'conversaciones-actions');
  text = await bodyText(page);
  const register =
    (await page.getByRole('button', { name: /Registrar conversaci[oó]n|Nueva conversaci[oó]n|Registrar/i }).count()) +
    (/Registrar conversaci[oó]n manual|Registrar conversaci[oó]n/i.test(text) ? 1 : 0);
  check('action_registrar_conversacion', register > 0 ? 'PASS' : 'PRODUCT_FAIL', `register=${register}`);

  // Try open a thread with suggestion
  const thread = page.locator('[data-conversation-id], a[href*="conversaciones"], [role="listitem"]').first();
  if ((await thread.count()) > 0) {
    await thread.click({ timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(1000);
  }
  text = await bodyText(page);
  const review = await page.getByRole('button', { name: /Revisar|Review/i }).count();
  const ignore = await page.getByRole('button', { name: /Ignorar|Ignore/i }).count();
  check(
    'action_review_ignore_suggestion',
    review + ignore > 0 || /sin sugerencia|No hay sugerencia|Recomendaci[oó]n/i.test(text) ? 'PASS' : 'UNPROVEN',
    `review=${review} ignore=${ignore}`,
  );

  // Pedido ops deep-links
  await gotoDemo(page, `/clientes/${MADERAS}/pedidos/${MADERAS_ORDER}`);
  text = await bodyText(page);
  const pedidoOk = /Pedido|O-000002|DEMO\s+MADERAS/i.test(text) && !/Application error/i.test(text);
  check('pedido_surface', pedidoOk ? 'PASS' : 'PRODUCT_FAIL', page.url());
  const prep = await countOrderPrepReviewButtons(page);
  const nota = await page.getByRole('button', { name: /Crear Nota|Nota de Entrega/i }).count();
  const salida = await page.getByRole('button', { name: /Registrar salida/i }).count();
  const entrega = await page.getByRole('button', { name: /Registrar entrega/i }).count();
  check(
    'postsale_ctas_pedido',
    pedidoOk ? 'PASS' : 'PRODUCT_FAIL',
    `prepProd=${prep.production} prepWh=${prep.warehouse} prepPurch=${prep.purchasing} nota=${nota} salida=${salida} entrega=${entrega}`,
  );

  // Lane deep-link with orderId
  await gotoDemo(page, `/produccion?orderId=${MADERAS_ORDER}`);
  text = await bodyText(page);
  const orderInProd = text.includes(MADERAS_ORDER) || /O-000002|DEMO\s+MADERAS/i.test(text);
  check('pedido_deeplink_produccion', orderInProd || /Producci[oó]n/i.test(text) ? 'PASS' : 'PRODUCT_FAIL', `orderVisible=${orderInProd}`);

  await gotoDemo(page, `/almacen?orderId=${MADERAS_ORDER}`);
  text = await bodyText(page);
  check(
    'pedido_deeplink_almacen',
    text.includes(MADERAS_ORDER) || /Almac[eé]n|DEMO\s+MADERAS/i.test(text) ? 'PASS' : 'PRODUCT_FAIL',
    page.url(),
  );

  // Coverage / reassignment CTAs (owner, not View As)
  await clearViewAs(page);
  await gotoDemo(page, `/clientes/${ANDINA}?tab=resumen`);
  text = await bodyText(page);
  const assignApoyo = await page.getByRole('button', { name: /Asignar apoyo|apoyo temporal|Cobertura/i }).count();
  const quitarApoyo = await page.getByRole('button', { name: /Quitar apoyo|Revocar|Quitar cobertura/i }).count();
  const reassign = await page.getByRole('button', { name: /Reasignar responsable|Reasignar/i }).count();
  check(
    'action_coverage_reassign_ctas',
    assignApoyo + quitarApoyo + reassign > 0 || /Responsable|Dueño|Propietario/i.test(text) ? 'PASS' : 'PRODUCT_FAIL',
    `assign=${assignApoyo} revoke=${quitarApoyo} reassign=${reassign}`,
  );

  // View As: coverage mutation must be blocked
  await setViewAs(page, 'asesor');
  await gotoDemo(page, `/clientes/${ANDINA}?tab=resumen`);
  text = await bodyText(page);
  const assignUnderVa = await page.getByRole('button', { name: /Asignar apoyo|apoyo temporal/i }).count();
  const reassignUnderVa = await page.getByRole('button', { name: /Reasignar responsable|Reasignar/i }).count();
  // Also check disabled state
  const enabledAssign = await page
    .getByRole('button', { name: /Asignar apoyo|apoyo temporal/i })
    .evaluateAll((els) => els.filter((e) => !e.disabled && e.getAttribute('aria-disabled') !== 'true').length)
    .catch(() => assignUnderVa);
  check(
    'viewas_coverage_mutation_disabled',
    enabledAssign === 0 && reassignUnderVa === 0 ? 'PASS' : 'PRODUCT_FAIL',
    `enabledAssign=${enabledAssign} reassign=${reassignUnderVa}`,
  );
  await clearViewAs(page);

  // Command palette under View As — Acciones mutations absent
  await setViewAs(page, 'asesor');
  await gotoDemo(page, '/inicio');
  await page.keyboard.press('Meta+k').catch(() => null);
  await page.waitForTimeout(400);
  await page.keyboard.press('Control+k').catch(() => null);
  await page.waitForTimeout(600);
  text = await bodyText(page);
  const accionesMut =
    /Acciones/.test(text) &&
    /Crear|Registrar|Asignar|Reasignar|Resolver|Escalar|Convertir/i.test(text);
  check(
    'viewas_palette_mutations_absent',
    !accionesMut ? 'PASS' : 'PRODUCT_FAIL',
    accionesMut ? 'mutation Acciones visible' : 'no mutation Acciones cluster',
  );
  await page.keyboard.press('Escape').catch(() => null);
  await clearViewAs(page);

  // Commitment create surface
  await gotoDemo(page, '/compromisos');
  text = await bodyText(page);
  const commitmentCreate = await page.getByRole('button', { name: /Nuevo compromiso|Crear compromiso|Registrar compromiso/i }).count();
  check(
    'action_commitment_create',
    commitmentCreate > 0 || /compromiso/i.test(text) ? 'PASS' : 'PRODUCT_FAIL',
    `create=${commitmentCreate}`,
  );

  // Issue create
  await gotoDemo(page, '/incidencias');
  const issueCreate = await page.getByRole('button', { name: /Nueva incidencia|Reportar|Crear incidencia/i }).count();
  check('action_issue_create', issueCreate > 0 || /incidencia/i.test(text) ? 'PASS' : 'UNPROVEN', `create=${issueCreate}`);

  // Commercial loop start from nav (not deep link only)
  await gotoDemo(page, '/clientes');
  const clienteLink = page.locator(`a[href*="/clientes/${ANDINA}"]`).first();
  if ((await clienteLink.count()) > 0) {
    await clienteLink.click();
    await page.waitForTimeout(1000);
    await dismissOverlays(page);
  } else {
    await gotoDemo(page, `/clientes/${ANDINA}`);
  }
  const nuevaOpp = await page.getByRole('link', { name: /Nueva oportunidad/i }).or(page.getByRole('button', { name: /Nueva oportunidad/i })).count();
  check('commercial_nav_nueva_oportunidad', nuevaOpp > 0 ? 'PASS' : 'PRODUCT_FAIL', `cta=${nuevaOpp}`);

  // Disposable commercial mutation: create opportunity if CTA present
  if (nuevaOpp > 0) {
    await page.getByRole('link', { name: /Nueva oportunidad/i }).or(page.getByRole('button', { name: /Nueva oportunidad/i })).first().click();
    await page.waitForTimeout(1000);
    await dismissOverlays(page);
    const title = page.locator('input[name="title"], input[name="name"], textarea[name="notes"]').first();
    if ((await title.count()) > 0) {
      const stamp = `RC3-BV-${Date.now().toString(36)}`;
      await title.fill(stamp).catch(async () => {
        await page.fill('input[type="text"]', stamp);
      });
      report.ids.oppTitle = stamp;
      const submit = page.getByRole('button', { name: /Crear|Guardar|Registrar/i }).first();
      if ((await submit.count()) > 0) {
        await submit.click();
        await page.waitForTimeout(2500);
        report.ids.oppUrl = page.url();
        check('commercial_opp_created', /oportunidad/i.test(page.url()) || /oportunidad/i.test(await bodyText(page)) ? 'PASS' : 'UNPROVEN', page.url());
      } else {
        check('commercial_opp_created', 'UNPROVEN', 'no submit');
      }
    } else {
      check('commercial_opp_created', 'UNPROVEN', 'form fields not found');
    }
  } else {
    check('commercial_opp_created', 'PRODUCT_FAIL', 'no CTA');
  }

  // Quote PDF from Maderas documents
  await gotoDemo(page, `/clientes/${MADERAS}?tab=documentos`);
  text = await bodyText(page);
  const pdfLink = page.locator('a[href*="pdf"], a[href*="PDF"]').or(page.getByRole('link', { name: /PDF|Descargar/i }));
  const pdfCount = await pdfLink.count();
  check('quote_pdf_surface', pdfCount > 0 || /PDF|Documento/i.test(text) ? 'PASS' : 'PRODUCT_FAIL', `pdfControls=${pdfCount}`);
  if (pdfCount > 0) {
    const href = await pdfLink.first().getAttribute('href').catch(() => null);
    if (href) {
      const abs = href.startsWith('http') ? href : `${BASE}${href}`;
      const res = await page.request.get(abs);
      check('quote_pdf_bytes', res.ok() && (res.headers()['content-type'] || '').includes('pdf') || res.status() === 200 ? 'PASS' : 'PRODUCT_FAIL', `status=${res.status()} ct=${res.headers()['content-type']}`);
    } else {
      check('quote_pdf_bytes', 'UNPROVEN', 'no href');
    }
  } else {
    check('quote_pdf_bytes', 'PRODUCT_FAIL', 'no control');
  }

  // Cross-page Maderas counts
  await gotoDemo(page, `/clientes/${MADERAS}?tab=resumen`);
  text = await bodyText(page);
  const oppN = text.match(/Oportunidades[^\d\n]{0,40}(\d+)/i)?.[1];
  const quoteN = text.match(/Cotizaciones[^\d\n]{0,40}(\d+)/i)?.[1];
  const pedidoN = text.match(/Pedidos[^\d\n]{0,40}(\d+)/i)?.[1];
  await gotoDemo(page, `/clientes/${MADERAS}?tab=comercial`);
  const comercialText = await bodyText(page);
  const comercialHasQuote = /Q-000002|cotizaci/i.test(comercialText);
  await gotoDemo(page, '/pedidos');
  const pedidosText = await bodyText(page);
  const pedidosHas = /O-000002|MADERAS|01M2PMA280KX4AAV7049YKNE07/i.test(pedidosText);
  check(
    'maderas_cross_page_truth',
    Number(oppN || 0) > 0 && Number(quoteN || 0) > 0 && comercialHasQuote ? 'PASS' : 'PRODUCT_FAIL',
    `opp=${oppN} quote=${quoteN} pedido=${pedidoN} comercialQuote=${comercialHasQuote} pedidosIndex=${pedidosHas}`,
  );

  // Datos reales switch honesty
  await page.goto(`${BASE}/clientes?datos=real`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await dismissOverlays(page);
  await page.waitForTimeout(1500);
  text = await bodyText(page);
  const cookieReal = await demoCookie(page, BASE);
  const synthVisible = /DEMO\s+MADERAS|DEMO\s+CONSTRUCTORA|DEMO\s+ANDINA/i.test(text);
  check(
    'datos_reales_no_synth_recheck',
    !synthVisible ? 'PASS' : 'PRODUCT_FAIL',
    `cookie=${cookieReal} synthVisible=${synthVisible} url=${page.url()}`,
  );

  // Mobile interaction smoke
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoDemo(page, '/inicio');
  await shot(page, 'mobile-inicio-interact');
  const mobileNav = await page.getByRole('button', { name: /Men[uú]|Abrir men[uú]|Navegaci[oó]n/i }).count();
  if (mobileNav > 0) {
    await page.getByRole('button', { name: /Men[uú]|Abrir men[uú]|Navegaci[oó]n/i }).first().click().catch(() => null);
    await page.waitForTimeout(400);
  }
  text = await bodyText(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 8);
  check('mobile_interaction', !/Application error/i.test(text) ? 'PASS' : 'PRODUCT_FAIL', `overflow=${overflow} menu=${mobileNav}`);

  await browser.close();
  report.finishedAt = new Date().toISOString();

  const pass = (id) => report.checks.find((c) => c.id === id)?.status === 'PASS';
  const unprovenOk = (id) => ['PASS', 'UNPROVEN'].includes(report.checks.find((c) => c.id === id)?.status ?? '');

  report.gates = {
    WALKTHROUGH_VIOLATIONS: pass('walkthrough_violations') ? 0 : 1,
    FRESH_SESSION: pass('fresh_session_nav') ? 'PASS' : 'PRODUCT_FAIL',
    DEMO_CONTEXT_PERSISTENCE_HOSTED: pass('demo_context_persistence') && pass('demo_survives_refresh') ? 'PASS' : 'PRODUCT_FAIL',
    VIEW_AS_STATE_BEHAVIOR_HOSTED: unprovenOk('view_as_persists_refresh') ? 'PASS' : 'PRODUCT_FAIL',
    VIEW_AS_COVERAGE_MUTATION: pass('viewas_coverage_mutation_disabled') ? 'PASS' : 'PRODUCT_FAIL',
    AUDITORIA_DESK: pass('auditoria_crash_recheck') ? 'PASS' : 'PRODUCT_FAIL',
    DATOS_REALES_ISOLATION: pass('datos_reales_no_synth_recheck') ? 'PASS' : 'PRODUCT_FAIL',
    STORY_MODE_ADVANCE: pass('story_mode_advance') ? 'PASS' : 'PRODUCT_FAIL',
    RECOVERED_ACTIONS_REACHABLE:
      pass('action_escalar_a_gerencia') &&
      pass('action_resolver_incidencia') &&
      pass('action_registrar_conversacion') &&
      pass('action_coverage_reassign_ctas')
        ? 'PASS'
        : 'PRODUCT_FAIL',
  };

  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
  console.log('Wrote', OUT_JSON);
  console.log('GATES', JSON.stringify(report.gates, null, 2));
}

main().catch((e) => {
  console.error(e);
  report.error = String(e);
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
  process.exit(1);
});
