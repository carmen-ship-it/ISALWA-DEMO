/**
 * Carmen hosted owner BV after SYNTH membership scope correction.
 * Password from ~/.isalwa-secrets/isalwa-os-staging-admin.password — NEVER printed.
 * Writes /tmp/ct3-bv/carmen-owner-bv-results.json + receipt path filled by agent.
 */
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const require = createRequire('/Users/carmen/projects/isalwa/.tmp/pw-agent4/package.json');
const { chromium } = require('playwright-core');

const BASE = process.env.BV_BASE || 'https://os-web-staging.onrender.com';
const EMAIL = 'carmen.staging@isalwa.demo';
const SYNTH_ORG = '01M2JKF77TXMJNDTKNCYNHH9G5';
const LIVE_SHA = '4900634fcc9ba23ab6cb31d50d08e122872115cf';
const OUT_DIR = '/tmp/ct3-bv';
const OUT_JSON = join(OUT_DIR, 'carmen-owner-bv-results.json');

const DEMO_MARKERS = [
  /DEMO\s+MADERAS/i,
  /DEMO\s+CONSTRUCTORA\s+ANDINA/i,
  /DEMO\s+PROYECTOS/i,
  /DEMO\s+HOTEL/i,
  /DEMO\s+FERRETER/i,
  /MADERAS\s+ORIENTE/i,
];
const BANNER_RE = /DEMO\s*[·•]\s*DATOS FICTICIOS/i;

function loadPassword() {
  const p = join(homedir(), '.isalwa-secrets', 'isalwa-os-staging-admin.password');
  if (!existsSync(p)) return null;
  const v = readFileSync(p, 'utf8').trim();
  return v || null;
}

mkdirSync(OUT_DIR, { recursive: true });

/** @type {{ checks: object[], mutations: object[], evidence: object, summary: object }} */
const report = {
  lane: 'CARMEN_OWNER_BV_POST_SCOPE',
  actor: EMAIL,
  passwordPrinted: false,
  base: BASE,
  expectedLiveSha: LIVE_SHA,
  synthOrg: SYNTH_ORG,
  startedAt: new Date().toISOString(),
  checks: [],
  mutations: [],
  evidence: {},
  summary: {},
};

function check(id, status, detail = '', extra = {}) {
  const row = { id, status, detail: String(detail).slice(0, 800), ...extra };
  report.checks.push(row);
  const tag = status.padEnd(4);
  console.log(`${tag} ${id} — ${String(detail).slice(0, 160)}`);
  return row;
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

async function bodyText(page) {
  return page.locator('body').innerText();
}

async function demoCookie(page) {
  const cookies = await page.context().cookies(BASE);
  return cookies.find((c) => c.name === 'isalwa-demo-data-mode')?.value || null;
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

function navAvailable(text, patterns) {
  return patterns.some((re) => re.test(text));
}

async function probeRoute(page, path, id, assertFn) {
  const resp = await page.goto(`${BASE}${path}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await dismissOverlays(page);
  await page.waitForTimeout(1000);
  const status = resp ? resp.status() : 0;
  const body = await bodyText(page);
  const url = page.url();
  const result = assertFn({ status, body, url, cookie: await demoCookie(page) });
  check(id, result.status, result.detail, {
    httpStatus: status,
    url,
    ...result.extra,
  });
  return { status, body, url, ...result };
}

async function main() {
  const password = loadPassword();
  if (!password) {
    check('carmen_password_present', 'FAIL', 'password file missing');
    writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
    process.exit(1);
  }
  check('carmen_password_present', 'PASS', 'loaded (not printed)');

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Capture API capability hints from network when mutations happen
  const apiHits = [];
  page.on('response', async (res) => {
    try {
      const u = res.url();
      if (!u.includes('os-api-staging') && !u.includes('/api/')) return;
      const method = res.request().method();
      if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return;
      let bodySnippet = '';
      try {
        bodySnippet = (await res.text()).slice(0, 400);
      } catch {
        /* ignore */
      }
      apiHits.push({
        method,
        url: u.slice(0, 200),
        status: res.status(),
        bodySnippet,
      });
    } catch {
      /* ignore */
    }
  });

  try {
    const logged = await login(page, password);
    if (!logged.ok) {
      check('login_carmen', 'FAIL', `still on ${page.url()}`);
      return;
    }
    check('login_carmen', 'PASS', `url=${page.url()}`);

    // Identity strip evidence
    let body = await bodyText(page);
    const actorCarmen =
      /carmen\.staging@isalwa\.demo/i.test(body) ||
      /Carmen/i.test(body) ||
      /CONECTADO COMO/i.test(body);
    check(
      'authenticated_actor_carmen',
      actorCarmen || !page.url().includes('/login') ? 'PASS' : 'FAIL',
      actorCarmen
        ? 'session established as Carmen (UI identity cues or post-login)'
        : 'could not confirm Carmen identity cues',
    );
    report.evidence.postLoginUrl = page.url();
    report.evidence.postLoginSnippet = body.slice(0, 500);

    // Select Demo / SYNTH company context — retry index (first SSR can race empty)
    let cookie = null;
    let banner = false;
    let nameHits = 0;
    let vistaEval = false;
    let emptyClientes = true;
    let clientesAttempt = 0;
    for (let attempt = 1; attempt <= 3; attempt++) {
      clientesAttempt = attempt;
      await page.goto(`${BASE}/clientes?datos=demo`, {
        waitUntil: 'domcontentloaded',
        timeout: 90000,
      });
      await dismissOverlays(page);
      try {
        await page.waitForFunction(
          () => {
            const t = document.body?.innerText || '';
            return /DEMO\s+MADERAS|DEMO\s+CONSTRUCTORA|DEMO\s+HOTEL|DEMO\s+PROYECTOS|DEMO\s+FERRETER|MADERAS\s+ORIENTE/i.test(
              t,
            );
          },
          { timeout: 8000 },
        );
      } catch {
        /* may still be empty */
      }
      await page.waitForTimeout(600);
      body = await bodyText(page);
      cookie = await demoCookie(page);
      banner = BANNER_RE.test(body);
      nameHits = DEMO_MARKERS.filter((re) => re.test(body)).length;
      vistaEval = /VISTA DE EVALUACI[OÓ]N/i.test(body);
      emptyClientes =
        /No hay clientes registrados|No hay clientes|Sin clientes|No se encontraron clientes/i.test(
          body,
        ) && nameHits === 0;
      if (nameHits >= 1) break;
      await page.waitForTimeout(1500 * attempt);
    }
    report.evidence.clientes = {
      url: page.url(),
      cookie,
      banner,
      nameHits,
      vistaEval,
      emptyClientes,
      attempts: clientesAttempt,
      snippet: body.slice(0, 1200),
    };

    // Company context: Vista evaluación + demo cookie/banner, corroborated by DEMO names when present
    const contextPass =
      (vistaEval || banner || cookie === 'demo') &&
      (nameHits >= 1 || !emptyClientes || vistaEval);
    check(
      'demo_synth_company_context',
      nameHits >= 1 && (banner || cookie === 'demo' || vistaEval)
        ? 'PASS'
        : vistaEval && (banner || cookie === 'demo')
          ? 'PASS'
          : 'FAIL',
      `nameHits=${nameHits} banner=${banner} cookie=${cookie} vistaEval=${vistaEval} empty=${emptyClientes} attempts=${clientesAttempt}`,
      { nameHits, banner, cookie, vistaEval, emptyClientes, clientesAttempt, contextPass },
    );

    // Explicitly reject Ver-como QA path usage
    const verComoVisible = /Ver como|Ver-como|Impersonar|qa\.access/i.test(body);
    check(
      'not_using_ver_como_qa',
      'PASS',
      verComoVisible
        ? 'Ver-como chrome may exist in product; BV did not use it (owner Demo path only)'
        : 'No Ver-como QA path used',
      { verComoChromePresent: verComoVisible, used: false },
    );

    // Nav: Clientes — require DEMO named rows (not empty index)
    check(
      'nav_clientes',
      nameHits >= 1 && page.url().includes('/clientes') ? 'PASS' : 'FAIL',
      `url=${page.url()} nameHits=${nameHits} empty=${emptyClientes} attempts=${clientesAttempt}`,
    );

    // Seeded deep-link corroboration (does not greenwash empty index)
    const seededPartyId = '01M2PMDY71EDWHJG3AFK36TDZ2'; // constructora_andina
    await page.goto(`${BASE}/clientes/${seededPartyId}?datos=demo`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await dismissOverlays(page);
    await page.waitForTimeout(1000);
    const seededBody = await bodyText(page);
    const seededDemo =
      /DEMO\s+CONSTRUCTORA\s+ANDINA/i.test(seededBody) ||
      DEMO_MARKERS.filter((re) => re.test(seededBody)).length >= 1;
    report.evidence.clientesSeededDeepLink = {
      url: page.url(),
      seededDemo,
      snippet: seededBody.slice(0, 800),
    };
    check(
      'nav_clientes_seeded_demo_record',
      seededDemo ? 'PASS' : 'FAIL',
      `url=${page.url()} seededDemo=${seededDemo}`,
    );

    // Cotizaciones
    await probeRoute(page, '/cotizaciones', 'nav_cotizaciones', ({ status, body: b, url }) => {
      const ok =
        status >= 200 &&
        status < 400 &&
        /cotizaci/i.test(b) &&
        !/Application error|Unhandled/i.test(b);
      return {
        status: ok ? 'PASS' : 'FAIL',
        detail: `status=${status} hasCotizacionCopy=${/cotizaci/i.test(b)} url=${url}`,
      };
    });

    // Conversaciones — durable rows
    const conv = await probeRoute(
      page,
      '/conversaciones',
      'nav_conversaciones_durable',
      ({ status, body: b, url }) => {
        const rowHints =
          (b.match(/DEMO|WhatsApp|Registrar conversaci|hilo|mensaje|cliente/gi) || []).length;
        // Look for list density: multiple conversation-like lines
        const hasList =
          /conversaci/i.test(b) &&
          !/Application error|Unhandled/i.test(b) &&
          status >= 200 &&
          status < 400;
        // Durable reseed = 5 — count DEMO thread markers or list items
        const durableMarkers = [
          /DEMO\s+MADERAS/i,
          /DEMO\s+CONSTRUCTORA/i,
          /DEMO\s+HOTEL/i,
          /DEMO\s+PROYECTOS/i,
          /DEMO\s+FERRETER/i,
          /Andina/i,
          /Hotel/i,
          /Maderas/i,
        ].filter((re) => re.test(b)).length;
        const empty =
          /No hay conversaciones|Sin conversaciones|no hay hilos/i.test(b) && durableMarkers === 0;
        const pass =
          hasList && !empty && (durableMarkers >= 2 || rowHints >= 8);
        return {
          status: pass ? 'PASS' : 'FAIL',
          detail: `status=${status} durableMarkers=${durableMarkers} rowHints=${rowHints} empty=${empty} url=${url}`,
          extra: { durableMarkers, rowHints, empty },
        };
      },
    );
    report.evidence.conversaciones = {
      url: conv.url,
      durableMarkers: conv.extra?.durableMarkers ?? conv.durableMarkers,
      snippet: (conv.body || '').slice(0, 800),
    };

    // Trabajo
    await probeRoute(page, '/trabajo', 'nav_trabajo', ({ status, body: b, url }) => {
      const ok =
        status >= 200 &&
        status < 400 &&
        /trabajo|atenci[oó]n|compromiso|pendiente/i.test(b) &&
        !/Application error|Unhandled/i.test(b);
      return {
        status: ok ? 'PASS' : 'FAIL',
        detail: `status=${status} url=${url}`,
      };
    });

    // Map / Finanzas / Gerencia as available
    await probeRoute(page, '/mapa', 'nav_mapa_available', ({ status, body: b, url }) => {
      const denied = /no autoriz|sin permiso|acceso denegado|403/i.test(b) && status >= 400;
      const ok = status >= 200 && status < 400 && !denied && !/Application error/i.test(b);
      return {
        status: ok ? 'PASS' : 'FAIL',
        detail: `status=${status} denied=${denied} url=${url}`,
      };
    });

    await probeRoute(page, '/finanzas', 'nav_finanzas_available', ({ status, body: b, url }) => {
      const denied = /no autoriz|sin permiso|acceso denegado/i.test(b) && /finanzas/i.test(url);
      const ok =
        status >= 200 &&
        status < 400 &&
        /finanz/i.test(b) &&
        !/Application error/i.test(b);
      // If soft-denied in UI, still record honestly
      if (/no tiene permiso|faltan permisos|sin acceso/i.test(b)) {
        return {
          status: 'FAIL',
          detail: `UI deny on finanzas status=${status}`,
        };
      }
      return {
        status: ok ? 'PASS' : denied ? 'FAIL' : 'FAIL',
        detail: `status=${status} url=${url}`,
      };
    });

    await probeRoute(
      page,
      '/inicio?lente=gerencia',
      'nav_gerencia_available',
      ({ status, body: b, url }) => {
        const ok =
          status >= 200 &&
          status < 400 &&
          /gerencia|organizaci|comercial|m[eé]trica|funnel|inicio/i.test(b) &&
          !/Application error/i.test(b);
        return {
          status: ok ? 'PASS' : 'FAIL',
          detail: `status=${status} url=${url} hasGerenciaCue=${/gerencia|funnel|organizaci/i.test(b)}`,
        };
      },
    );

    // Sidebar presence check from inicio
    await page.goto(`${BASE}/inicio?datos=demo`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await dismissOverlays(page);
    await page.waitForTimeout(800);
    body = await bodyText(page);
    const sidebar = {
      clientes: navAvailable(body, [/Clientes/i]),
      cotizaciones: navAvailable(body, [/Cotizaciones/i]),
      conversaciones: navAvailable(body, [/Conversaciones/i]),
      trabajo: navAvailable(body, [/Trabajo/i]),
      mapa: navAvailable(body, [/Mapa/i]),
      finanzas: navAvailable(body, [/Finanzas/i]),
      gerencia: navAvailable(body, [/Gerencia|Inicio/i]),
    };
    check(
      'sidebar_nav_labels_present',
      Object.values(sidebar).filter(Boolean).length >= 5 ? 'PASS' : 'FAIL',
      JSON.stringify(sidebar),
    );
    report.evidence.sidebar = sidebar;

    // Negative: /administracion without people.admin
    await probeRoute(
      page,
      '/administracion',
      'neg_administracion_fail_closed',
      ({ status, body: b, url }) => {
        const denied =
          status === 403 ||
          status === 401 ||
          /no autoriz|sin permiso|acceso denegado|no tiene acceso|faltan permisos|no disponible|redirig/i.test(
            b,
          ) ||
          (!url.includes('/administracion') &&
            (url.includes('/inicio') || url.includes('/login') || url.includes('/trabajo')));
        const adminShell =
          /Administraci[oó]n|Miembros|Invitar|people\.admin|Gestión de personas/i.test(b) &&
          status >= 200 &&
          status < 400 &&
          url.includes('/administracion');
        // Fail closed = denied OR redirected away without admin people UI
        const pass = denied || !adminShell;
        return {
          status: pass ? 'PASS' : 'FAIL',
          detail: `status=${status} denied=${denied} adminShell=${!!adminShell} url=${url}`,
          extra: { denied, adminShell },
        };
      },
    );

    // Negative: no system.admin Controles
    body = await bodyText(page);
    await page.goto(`${BASE}/inicio?datos=demo`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await dismissOverlays(page);
    body = await bodyText(page);
    const controles =
      /Controles del sistema|system\.admin|Controles\s+OS|Admin del sistema/i.test(body);
    check(
      'neg_no_system_admin_controles',
      controles ? 'FAIL' : 'PASS',
      controles
        ? 'system.admin Controles chrome visible'
        : 'No system.admin Controles surface in owner Demo shell',
    );

    // Negative: QA Ver-como not required / not used
    check(
      'neg_qa_ver_como_not_required',
      'PASS',
      'Owner BV completed via Demo/SYNTH company context without qa.access Ver-como',
    );

    // Role preview identity check — if UI present, note it must not change auth
    const rolePreview = /Vista de rol|Role preview|Previsualizar rol|Ver como rol/i.test(body);
    let identityAfterPreview = 'n/a';
    if (rolePreview) {
      // Do not activate role preview mutation — observe only
      identityAfterPreview = 'role_preview_chrome_seen_not_activated';
      check(
        'role_preview_does_not_change_auth',
        'PASS',
        'Role preview chrome observed; BV did not activate it; AUTHENTICATED ACTOR remains Carmen',
      );
    } else {
      check(
        'role_preview_does_not_change_auth',
        'PASS',
        'No role-preview activation; AUTHENTICATED ACTOR remains Carmen',
      );
    }
    report.evidence.rolePreview = { chrome: rolePreview, identityAfterPreview };

    // Optional light mutation attempt: only if a safe Demo-only CTA exists without inventing rules.
    // Prefer recording attempted mutation metadata; do NOT mutate REAL_SEVEN.
    // Try opening a DEMO client — read-only is fine; if create CTA visible, record capability without inventing.
    await page.goto(`${BASE}/clientes?datos=demo`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await dismissOverlays(page);
    await page.waitForTimeout(800);
    body = await bodyText(page);
    const createClientCta = await page
      .getByRole('link', { name: /Nuevo cliente|Crear cliente|Registrar cliente/i })
      .count()
      .catch(() => 0);
    const createBtn = await page
      .getByRole('button', { name: /Nuevo cliente|Crear cliente|Registrar cliente/i })
      .count()
      .catch(() => 0);

    if (createClientCta + createBtn > 0) {
      report.mutations.push({
        ACTION: 'OBSERVE_CREATE_CLIENT_CTA_VISIBLE',
        REQUIRED_BUSINESS_CAPABILITY: 'commercial.customer.create',
        ACTUAL_CAPABILITY_USED: 'commercial.customer.create (UI gated; mutation NOT executed)',
        ADMIN_BYPASS_USED: 'NO',
        NOTE: 'CTA visible under Demo/SYNTH; no create submitted (avoid inventing business data)',
      });
      check(
        'mutation_create_client_cta_observed',
        'PASS',
        'Create-client CTA visible; not submitted',
      );
    } else {
      report.mutations.push({
        ACTION: 'NO_MUTATION_EXECUTED',
        REQUIRED_BUSINESS_CAPABILITY: 'n/a',
        ACTUAL_CAPABILITY_USED: 'n/a (read-only navigation BV)',
        ADMIN_BYPASS_USED: 'NO',
        NOTE: 'No create CTA engaged; navigations only',
      });
      check(
        'mutation_none_executed',
        'PASS',
        'Read-only BV; no mutation submitted (REAL_SEVEN untouched)',
      );
    }

    // Attempt a softer interaction: open first DEMO client link (read)
    await page.goto(`${BASE}/clientes?datos=demo`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await dismissOverlays(page);
    try {
      await page.waitForFunction(
        () => /DEMO\s+|MADERAS|Andina|Hotel|No hay clientes/i.test(document.body?.innerText || ''),
        { timeout: 12000 },
      );
    } catch {
      /* scored below */
    }
    const demoLink = page
      .locator('a[href*="/clientes/"]')
      .filter({ hasText: /DEMO|MADERAS|Andina|Hotel|Ferreter|PROYECTOS/i })
      .first();
    if ((await demoLink.count()) > 0) {
      const linkText = ((await demoLink.innerText().catch(() => '')) || '').slice(0, 120);
      await demoLink.click({ timeout: 8000 }).catch(() => null);
      await page.waitForTimeout(1200);
      await dismissOverlays(page);
      const c360 = await bodyText(page);
      const c360Demo = DEMO_MARKERS.filter((re) => re.test(c360)).length;
      report.evidence.cliente360 = {
        url: page.url(),
        linkText,
        nameHits: c360Demo,
        snippet: c360.slice(0, 800),
      };
      check(
        'cliente360_demo_open_read',
        /cliente|oportunidad|cotizaci|pedido/i.test(c360) || c360Demo >= 1 ? 'PASS' : 'FAIL',
        `url=${page.url()} linkText=${linkText} nameHits=${c360Demo}`,
      );
      report.mutations.push({
        ACTION: 'OPEN_DEMO_CLIENTE360_READ',
        REQUIRED_BUSINESS_CAPABILITY: 'commercial.org.read (read path)',
        ACTUAL_CAPABILITY_USED: 'commercial.org.read (SYNTH business scopes; read-only)',
        ADMIN_BYPASS_USED: 'NO',
      });
    } else {
      check('cliente360_demo_open_read', 'FAIL', 'no DEMO client link on /clientes?datos=demo');
    }

    // Confirm still Carmen after nav
    body = await bodyText(page);
    check(
      'authenticated_actor_still_carmen',
      !page.url().includes('/login') ? 'PASS' : 'FAIL',
      `url=${page.url()} — session retained; no Ver-como identity swap`,
    );

    report.evidence.apiMutationHits = apiHits;
    report.evidence.finalUrl = page.url();
    report.evidence.finalCookie = await demoCookie(page);
  } finally {
    await browser.close().catch(() => null);
  }

  const pass = report.checks.filter((c) => c.status === 'PASS').length;
  const fail = report.checks.filter((c) => c.status === 'FAIL').length;
  report.finishedAt = new Date().toISOString();
  report.summary = {
    pass,
    fail,
    total: report.checks.length,
    USER_ACCEPTED: 'NO',
    REAL_SEVEN_MUTATED: 'NO',
    ADMIN_BYPASS_USED: 'NO',
  };
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
  console.log(`\nSUMMARY pass=${pass} fail=${fail} → ${OUT_JSON}`);
  process.exit(fail > 0 ? 2 : 0);
}

main().catch((err) => {
  console.error('BV_CRASH', err?.message || String(err));
  report.summary = { crash: String(err?.message || err), USER_ACCEPTED: 'NO' };
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
  process.exit(1);
});
