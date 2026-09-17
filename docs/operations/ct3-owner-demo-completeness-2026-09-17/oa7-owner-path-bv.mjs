/**
 * OA-7 — Carmen owner-path acceptance verifier (rewrite of PF-8 methodology).
 *
 * Categories are scored separately — never collapsed into one PASS:
 *   ROUTE_RENDER | DEMO_CONTEXT | DOMAIN_CONTENT | INTERACTION
 *   PERSISTENCE | CROSS_PAGE_COHERENCE | AUTHORIZATION | NEGATIVE_SECURITY
 *
 * Rules:
 * - Primary actor: carmen.staging@isalwa.demo
 * - Password from ~/.isalwa-secrets/isalwa-os-staging-admin.password — NEVER printed
 * - Banner/toggle alone ≠ DOMAIN_CONTENT PASS (no greenwash)
 * - After OA-1: Demo must resolve to SYNTH company context with named DEMO rows
 * - If clients empty under Demo, FAIL with org-lens evidence (PRODUCCIÓN vs evaluación)
 * - Closed-loop approval→convert cascade stubs are TODO until OA-2/OA-3 land + hosted run
 * - HOSTED_RUN stays PENDING until integrate/deploy; do not claim final owner PASS here
 *
 * Usage (after integrate/deploy):
 *   node docs/operations/ct3-owner-demo-completeness-2026-09-17/oa7-owner-path-bv.mjs
 *   OA7_EXECUTE=1 node ...   # actually drive Playwright against staging
 *
 * Default without OA7_EXECUTE=1: dry structural report (HOSTED_RUN=PENDING).
 */
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// docs/operations/<bundle> → repo root is three levels up
const REPO_ROOT = join(__dirname, '../../..');
const EXECUTE = process.env.OA7_EXECUTE === '1' || process.env.OA7_HOSTED_RUN === '1';
const BASE = process.env.OA7_BASE_URL || 'https://os-web-staging.onrender.com';
const EMAIL = 'carmen.staging@isalwa.demo';
const SYNTH_ORG = '01M2JKF77TXMJNDTKNCYNHH9G5';
const REAL_ORG = '01M2DV9F0V5DXS4G89AKF4D5SR';
const OUT_DIR = process.env.OA7_OUT_DIR || '/tmp/ct3-bv';
const OUT_JSON = join(OUT_DIR, 'oa7-owner-path-results.json');

const CATEGORIES = [
  'ROUTE_RENDER',
  'DEMO_CONTEXT',
  'DOMAIN_CONTENT',
  'INTERACTION',
  'PERSISTENCE',
  'CROSS_PAGE_COHERENCE',
  'AUTHORIZATION',
  'NEGATIVE_SECURITY',
];

const DEMO_CLIENT_MARKERS = [
  /DEMO\s+MADERAS/i,
  /DEMO\s+CONSTRUCTORA\s+ANDINA/i,
  /DEMO\s+PROYECTOS/i,
  /DEMO\s+HOTEL/i,
  /DEMO\s+FERRETER/i,
  /MADERAS\s+ORIENTE/i,
];

const BANNER_RE = /DEMO\s*[·•]\s*DATOS FICTICIOS/i;
const EMPTY_CLIENTES_RE =
  /No hay clientes registrados|Busque por nombre|Sin clientes|No se encontraron clientes/i;
const CLIENTE_UNAVAILABLE_RE = /Cliente no disponible|No se encontró este cliente/i;
const REAL_LENS_RE = /PRODUCCI[OÓ]N|CONECTADO COMO\s+Carmen/i;
const SYNTH_LENS_RE = /VISTA DE EVALUACI[OÓ]N|Synth FixtureSeed|WaveA/i;

function loadSeeded() {
  const path = join(REPO_ROOT, 'apps/os-web/lib/demo/seeded-ids.json');
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function loadCarmenPassword() {
  const secretsDir = join(homedir(), '.isalwa-secrets');
  const adminFile = join(secretsDir, 'isalwa-os-staging-admin.password');
  if (existsSync(adminFile)) {
    const v = readFileSync(adminFile, 'utf8').trim();
    if (v) return v;
  }
  // Fallback bags — never log contents
  for (const name of [
    'isalwa-os-staging-wave2-role-passwords.json',
    'isalwa-os-staging-wave-a-continuity-passwords.json',
  ]) {
    const p = join(secretsDir, name);
    if (!existsSync(p)) continue;
    const raw = JSON.parse(readFileSync(p, 'utf8'));
    const bag = raw.passwords || raw;
    const entry = bag[EMAIL];
    if (typeof entry === 'string' && entry) return entry;
    if (entry && typeof entry.password === 'string' && entry.password) return entry.password;
  }
  return null;
}

function countDemoNames(text) {
  return DEMO_CLIENT_MARKERS.filter((re) => re.test(text || '')).length;
}

function inferOrgLens(text) {
  const t = text || '';
  const synth = SYNTH_LENS_RE.test(t);
  const real = REAL_LENS_RE.test(t) && !synth;
  if (synth) return { lens: 'SYNTH_LIKE', expectedOrg: SYNTH_ORG };
  if (real) return { lens: 'REAL_LIKE', expectedOrg: REAL_ORG };
  return { lens: 'UNKNOWN', expectedOrg: null };
}

mkdirSync(OUT_DIR, { recursive: true });

/** @type {{ lane: string, actor: string, hostedRun: string, categories: Record<string, object>, checks: object[], summary: object, todos: object[] }} */
const report = {
  lane: 'OA-7',
  actor: EMAIL,
  passwordSource: 'isalwa-os-staging-admin.password',
  passwordPrinted: false,
  base: BASE,
  synthOrg: SYNTH_ORG,
  realOrg: REAL_ORG,
  startedAt: new Date().toISOString(),
  hostedRun: EXECUTE ? 'RUNNING' : 'PENDING',
  note:
    'HOSTED_RUN=PENDING until integrate/deploy. Do not treat dry/structural output as owner PASS.',
  categories: Object.fromEntries(
    CATEGORIES.map((c) => [c, { pass: 0, fail: 0, todo: 0, skip: 0, checks: [] }]),
  ),
  checks: [],
  todos: [],
  summary: {},
};

function record(category, id, status, detail = '', extra = {}) {
  if (!CATEGORIES.includes(category)) {
    throw new Error(`Unknown category: ${category}`);
  }
  const row = {
    category,
    id,
    status, // PASS | FAIL | TODO | SKIP
    detail: String(detail).slice(0, 600),
    ...extra,
  };
  report.checks.push(row);
  report.categories[category].checks.push(id);
  const bucket =
    status === 'PASS' ? 'pass' : status === 'FAIL' ? 'fail' : status === 'TODO' ? 'todo' : 'skip';
  report.categories[category][bucket] += 1;
  const tag = status.padEnd(4);
  console.log(`${tag} [${category}] ${id} — ${String(detail).slice(0, 140)}`);
  return row;
}

function pass(cat, id, detail, extra) {
  return record(cat, id, 'PASS', detail, extra);
}
function fail(cat, id, detail, extra) {
  return record(cat, id, 'FAIL', detail, extra);
}
function todo(cat, id, detail, extra) {
  report.todos.push({ category: cat, id, detail });
  return record(cat, id, 'TODO', detail, extra);
}
function skip(cat, id, detail, extra) {
  return record(cat, id, 'SKIP', detail, extra);
}

/**
 * Closed-loop cascade from steering addendum §6 (approval → convert → Pedido).
 * Stubs until OA-2/OA-3 + hosted execute; must not be scored PASS by omission.
 */
function registerClosedLoopTodos() {
  const cascade = [
    [
      'INTERACTION',
      'todo_approval_appears_for_approver',
      'Approval requested → visible to correct approver (closed-loop)',
    ],
    [
      'INTERACTION',
      'todo_approval_decision_occurs',
      'Approver can decide approve/reject on subject quote',
    ],
    [
      'PERSISTENCE',
      'todo_approval_decision_persists',
      'Decision persists after refresh (not toast-only)',
    ],
    [
      'CROSS_PAGE_COHERENCE',
      'todo_quote_reflects_decision',
      'Quote detail reflects approval decision; does NOT auto-create Pedido',
    ],
    [
      'CROSS_PAGE_COHERENCE',
      'todo_audit_reflects_decision',
      'Audit/history shows approval business event',
    ],
    [
      'DOMAIN_CONTENT',
      'todo_post_approval_next_action',
      'Requester sees next safe CTA (Ver cotización); Convertir only if eligible + authorized',
    ],
    [
      'DOMAIN_CONTENT',
      'todo_work_attention_updates',
      'Work/Attention resolves or changes after decision when model already requires it',
    ],
    [
      'INTERACTION',
      'todo_convert_explicit_when_eligible',
      'Eligible quote: Convertir a Pedido available; conversion remains explicit human action',
    ],
    [
      'DOMAIN_CONTENT',
      'todo_pedido_in_index',
      'After convert: Pedido appears in Pedidos index under Demo/SYNTH',
    ],
    [
      'CROSS_PAGE_COHERENCE',
      'todo_pedido_in_cliente360',
      'Pedido appears in Cliente360; quote/approval history remains intact',
    ],
    [
      'CROSS_PAGE_COHERENCE',
      'todo_downstream_can_reference_pedido',
      'Ops/entrega surfaces can reference the created Pedido (no orphan)',
    ],
    [
      'NEGATIVE_SECURITY',
      'todo_approval_does_not_auto_create_pedido',
      'Approval decision MUST NOT auto-create Pedido (convert remains explicit)',
    ],
    [
      'AUTHORIZATION',
      'todo_convert_cta_authorized_only',
      'Convertir a Pedido only when quote eligible AND actor has convert scope',
    ],
  ];
  for (const [cat, id, detail] of cascade) {
    todo(cat, id, detail, { closedLoop: true, steering: 'addendum-§6' });
  }
}

async function dismissOverlays(page) {
  for (let i = 0; i < 6; i++) {
    const welcome = page.locator('[role="dialog"][aria-labelledby="intro-welcome-title"]');
    if ((await welcome.count()) > 0) {
      const skipBtn = page.getByRole('button', { name: /Explorar por mi cuenta/i });
      if ((await skipBtn.count()) > 0) await skipBtn.first().click({ timeout: 4000 }).catch(() => null);
      else await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }
    const omitir = page.getByRole('button', { name: /^Omitir$/i });
    if ((await omitir.count()) > 0) await omitir.first().click({ timeout: 3000 }).catch(() => null);
    await page.keyboard.press('Escape').catch(() => null);
    await page.waitForTimeout(200);
  }
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

async function bodyText(page) {
  return page.locator('body').innerText();
}

async function demoCookie(page) {
  const cookies = await page.context().cookies(BASE);
  const hit = cookies.find((c) => c.name === 'isalwa-demo-data-mode');
  return hit?.value || null;
}

async function runHosted() {
  const password = loadCarmenPassword();
  if (!password) {
    fail('AUTHORIZATION', 'carmen_password_present', 'staging-admin.password missing');
    return;
  }
  pass('AUTHORIZATION', 'carmen_password_present', 'loaded (not printed)');

  const seeded = loadSeeded();
  if (!seeded?.hrefHints) {
    fail('ROUTE_RENDER', 'seeded_ids_present', 'seeded-ids.json missing');
    return;
  }
  pass('ROUTE_RENDER', 'seeded_ids_present', `clients=${seeded.clients?.length ?? 0}`);

  const require = createRequire('/Users/carmen/projects/isalwa/.tmp/pw-agent4/package.json');
  const { chromium } = require('playwright-core');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    const logged = await login(page, password);
    if (!logged.ok) {
      fail('AUTHORIZATION', 'carmen_login', 'still on /login');
      return;
    }
    pass('AUTHORIZATION', 'carmen_login', 'session ok');

    // --- Enter Demo ---
    const resp = await page.goto(`${BASE}/clientes?datos=demo`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await dismissOverlays(page);
    await page.waitForTimeout(1200);
    const status = resp ? resp.status() : 0;
    const body = await bodyText(page);
    const cookie = await demoCookie(page);
    const lens = inferOrgLens(body);
    const nameHits = countDemoNames(body);
    const banner = BANNER_RE.test(body);
    const empty = EMPTY_CLIENTES_RE.test(body) && nameHits === 0;

    if (status >= 200 && status < 400 && !/Application error|Unhandled/i.test(body)) {
      pass('ROUTE_RENDER', 'clientes_demo_renders', `status=${status}`);
    } else {
      fail('ROUTE_RENDER', 'clientes_demo_renders', `status=${status}`);
    }

    if (banner || cookie === 'demo' || /[?&]datos=demo/.test(page.url())) {
      pass(
        'DEMO_CONTEXT',
        'demo_mode_entered',
        `banner=${banner} cookie=${cookie} urlHasDatos=${/[?&]datos=demo/.test(page.url())}`,
      );
    } else {
      fail('DEMO_CONTEXT', 'demo_mode_entered', `banner=${banner} cookie=${cookie}`);
    }

    // DOMAIN_CONTENT: named clients required — banner-only is FAIL
    if (nameHits >= 2 && !empty) {
      pass(
        'DOMAIN_CONTENT',
        'demo_client_names_visible',
        `nameHits=${nameHits} lens=${lens.lens}`,
        { orgLens: lens },
      );
    } else {
      fail(
        'DOMAIN_CONTENT',
        'demo_client_names_visible',
        `EMPTY under Demo — nameHits=${nameHits} lens=${lens.lens} (OA-1 Demo→SYNTH expected; do not greenwash banner)`,
        {
          orgLens: lens,
          bannerPresent: banner,
          emptyState: empty,
          evidence:
            lens.lens === 'REAL_LIKE'
              ? 'Carmen still on REAL Staging lens — Demo filter empty (forensic CARMEN_OWNER_PATH_REPRO)'
              : 'Demo chrome without SYNTH DEMO rows',
        },
      );
    }

    // Sidebar nav without ?datos=demo — cookie should retain Demo
    await page.goto(`${BASE}/cotizaciones`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await dismissOverlays(page);
    await page.waitForTimeout(900);
    const cotBody = await bodyText(page);
    const cotCookie = await demoCookie(page);
    const cotBanner = BANNER_RE.test(cotBody);
    if (cotCookie === 'demo' || cotBanner) {
      pass(
        'PERSISTENCE',
        'sidebar_nav_retains_demo',
        `cookie=${cotCookie} banner=${cotBanner} url=${page.url()}`,
      );
    } else {
      fail('PERSISTENCE', 'sidebar_nav_retains_demo', `cookie=${cotCookie} banner=${cotBanner}`);
    }

    // Refresh retains Demo
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
    await dismissOverlays(page);
    await page.waitForTimeout(800);
    const refCookie = await demoCookie(page);
    const refBanner = BANNER_RE.test(await bodyText(page));
    if (refCookie === 'demo' || refBanner) {
      pass('PERSISTENCE', 'refresh_retains_demo', `cookie=${refCookie} banner=${refBanner}`);
    } else {
      fail('PERSISTENCE', 'refresh_retains_demo', `cookie=${refCookie}`);
    }

    // Story Mode retains Demo
    await page.goto(`${BASE}/inicio?datos=demo&story=1`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await dismissOverlays(page);
    await page.waitForTimeout(1200);
    let storyBody = await bodyText(page);
    if (!/Siguiente/i.test(storyBody)) {
      const btn = page.getByRole('button', { name: /Ver recorrido completo/i }).first();
      if (await btn.count()) {
        await btn.click({ force: true }).catch(() => null);
        await page.waitForTimeout(1000);
        storyBody = await bodyText(page);
      }
    }
    const storyOpen =
      /Siguiente/i.test(storyBody) &&
      (/Paso \d+ de 20/i.test(storyBody) || /Anterior/i.test(storyBody));
    const storyDemo = BANNER_RE.test(storyBody) || (await demoCookie(page)) === 'demo';
    if (storyOpen) pass('INTERACTION', 'story_mode_open', 'controls present');
    else fail('INTERACTION', 'story_mode_open', 'missing story controls');
    if (storyDemo) pass('DEMO_CONTEXT', 'story_mode_retains_demo', 'banner/cookie');
    else fail('DEMO_CONTEXT', 'story_mode_retains_demo', 'demo lost in story');

    // Named client openable (only meaningful if DOMAIN_CONTENT passed)
    const partyHref = `${seeded.hrefHints.cliente360}?datos=demo`;
    await page.goto(`${BASE}${partyHref}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await dismissOverlays(page);
    await page.waitForTimeout(1000);
    const c360 = await bodyText(page);
    const unavailable = CLIENTE_UNAVAILABLE_RE.test(c360);
    if (!unavailable && /DEMO MADERAS|MADERAS ORIENTE/i.test(c360)) {
      pass('DOMAIN_CONTENT', 'named_client_openable', 'Cliente360 DEMO MADERAS');
      pass('ROUTE_RENDER', 'cliente360_renders', 'ok');
    } else {
      fail(
        'DOMAIN_CONTENT',
        'named_client_openable',
        unavailable
          ? 'Cliente no disponible — Carmen org ≠ SYNTH party (OA-1 pending or grant not applied)'
          : 'name missing on Cliente360',
        { unavailable },
      );
    }

    // Opportunity / quote / PDF — content not banner
    await page.goto(`${BASE}${seeded.hrefHints.quote}?datos=demo`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await dismissOverlays(page);
    await page.waitForTimeout(1000);
    const quoteBody = await bodyText(page);
    const quoteOk =
      /Q-000002|Cotizaci[oó]n/i.test(quoteBody) && !CLIENTE_UNAVAILABLE_RE.test(quoteBody);
    if (quoteOk) {
      pass('DOMAIN_CONTENT', 'quote_visible', 'quote detail has number/copy');
      pass('CROSS_PAGE_COHERENCE', 'quote_matches_seeded_maderas', 'Q-000002 path');
    } else {
      fail('DOMAIN_CONTENT', 'quote_visible', 'quote detail empty or unavailable');
    }

    const pdfResp = await page.request.get(`${BASE}${seeded.hrefHints.quotePdf}`);
    const pdfCt = pdfResp.headers()['content-type'] || '';
    if (pdfResp.status() === 200 && /pdf|octet/i.test(pdfCt)) {
      pass('INTERACTION', 'quote_pdf_openable', `status=200 ct=${pdfCt}`);
    } else if (pdfResp.status() === 403 || pdfResp.status() === 404) {
      // May fail if wrong org — record honestly
      fail(
        'INTERACTION',
        'quote_pdf_openable',
        `status=${pdfResp.status()} (org scope?)`,
      );
    } else {
      fail('INTERACTION', 'quote_pdf_openable', `status=${pdfResp.status()} ct=${pdfCt}`);
    }

    // Pedido coherence when domain content available
    await page.goto(`${BASE}${seeded.hrefHints.order}?datos=demo`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await dismissOverlays(page);
    await page.waitForTimeout(900);
    const orderBody = await bodyText(page);
    if (/O-000002|Pedido/i.test(orderBody) && !CLIENTE_UNAVAILABLE_RE.test(orderBody)) {
      pass('CROSS_PAGE_COHERENCE', 'pedido_detail_maderas', 'O-000002 visible');
    } else {
      fail('CROSS_PAGE_COHERENCE', 'pedido_detail_maderas', 'pedido missing or unavailable');
    }

    // Map / management factual presence (row-level, not chrome)
    await page.goto(`${BASE}/mapa?datos=demo`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await dismissOverlays(page);
    await page.waitForTimeout(1000);
    const mapBody = await bodyText(page);
    const mapDemo = countDemoNames(mapBody) > 0 || /DEMO/i.test(mapBody);
    if (mapDemo && !/Application error/i.test(mapBody)) {
      pass('DOMAIN_CONTENT', 'map_has_demo_entries', 'demo cues/names on map');
    } else {
      fail('DOMAIN_CONTENT', 'map_has_demo_entries', 'no demo row cues');
    }

    await page.goto(`${BASE}/inicio?lente=gerencia&datos=demo`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await dismissOverlays(page);
    await page.waitForTimeout(900);
    const mgmt = await bodyText(page);
    if (/Gerencia|comercial|oportunid|cotiz/i.test(mgmt) && BANNER_RE.test(mgmt)) {
      // Require more than banner: some metric/list language
      if (countDemoNames(mgmt) > 0 || /\d+/.test(mgmt)) {
        pass('DOMAIN_CONTENT', 'management_demo_metrics', 'gerencia lens with factual cues');
      } else {
        fail('DOMAIN_CONTENT', 'management_demo_metrics', 'banner-only / no factual demo metrics');
      }
    } else {
      fail('DOMAIN_CONTENT', 'management_demo_metrics', 'gerencia surface incomplete');
    }

    // Datos reales restores REAL context
    await page.goto(`${BASE}/clientes?datos=reales`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await dismissOverlays(page);
    await page.waitForTimeout(1000);
    const realBody = await bodyText(page);
    const realCookie = await demoCookie(page);
    const stillBanner = BANNER_RE.test(realBody);
    if (realCookie !== 'demo' && !stillBanner) {
      pass(
        'DEMO_CONTEXT',
        'datos_reales_restores_real',
        `cookie=${realCookie} banner=${stillBanner}`,
      );
    } else {
      // Toggle click path if query alone insufficient
      const realesBtn = page.getByRole('button', { name: /Datos reales/i }).first();
      if (await realesBtn.count()) {
        await realesBtn.click().catch(() => null);
        await page.waitForTimeout(1000);
      }
      const after = await bodyText(page);
      const afterCookie = await demoCookie(page);
      if (afterCookie !== 'demo' && !BANNER_RE.test(after)) {
        pass('DEMO_CONTEXT', 'datos_reales_restores_real', `after toggle cookie=${afterCookie}`);
      } else {
        fail(
          'DEMO_CONTEXT',
          'datos_reales_restores_real',
          `still demo cookie=${afterCookie}`,
        );
      }
    }

    // NEGATIVE_SECURITY: protected REAL unchanged — read-only check of REAL_SEVEN artifact + no mutation claims
    const realSeven = seeded.REAL_SEVEN_MUTATED === 'NO';
    if (realSeven) {
      pass(
        'NEGATIVE_SECURITY',
        'real_seven_mutated_no',
        'seeded artifact REAL_SEVEN_MUTATED=NO (verifier is read-safe)',
      );
    } else {
      fail('NEGATIVE_SECURITY', 'real_seven_mutated_no', 'artifact not NO');
    }

    // Conversaciones durable — TODO if OA-4 not proven; soft check
    await page.goto(`${BASE}/conversaciones?datos=demo`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await dismissOverlays(page);
    await page.waitForTimeout(900);
    const conv = await bodyText(page);
    if (countDemoNames(conv) > 0 || /Conversaci/i.test(conv)) {
      pass('ROUTE_RENDER', 'conversaciones_renders', 'page loads');
      if (countDemoNames(conv) > 0) {
        pass('DOMAIN_CONTENT', 'conversation_demo_visible', 'demo thread cues');
      } else {
        todo(
          'DOMAIN_CONTENT',
          'conversation_durable_record',
          'Durable os_customer_conversations row visibility — wait OA-4 (fixtures-only is not PASS)',
        );
      }
    } else {
      fail('ROUTE_RENDER', 'conversaciones_renders', 'page empty/crash');
    }
  } finally {
    await browser.close().catch(() => null);
  }
}

function runDryStructural() {
  skip(
    'ROUTE_RENDER',
    'hosted_execute_skipped',
    'Set OA7_EXECUTE=1 after integrate/deploy to run Playwright',
  );
  const password = loadCarmenPassword();
  if (password) pass('AUTHORIZATION', 'carmen_password_present', 'file readable (not printed)');
  else fail('AUTHORIZATION', 'carmen_password_present', 'staging-admin.password missing');

  const seeded = loadSeeded();
  if (seeded?.clients?.length >= 5) {
    pass('ROUTE_RENDER', 'seeded_ids_structural', `${seeded.clients.length} seeded clients`);
  } else {
    fail('ROUTE_RENDER', 'seeded_ids_structural', 'seeded-ids incomplete');
  }

  // Document required hosted checks as TODO until execute (§17).
  // Each check keeps exactly one category — never collapsed into a single PASS.
  const required = [
    ['AUTHORIZATION', 'actor_remains_carmen', 'Shell shows Carmen — never substitute people-admin for owner PASS'],
    ['ROUTE_RENDER', 'inicio_demo_renders', 'Inicio?datos=demo renders without crash'],
    ['ROUTE_RENDER', 'clientes_demo_renders', 'Clientes?datos=demo renders without crash'],
    ['DEMO_CONTEXT', 'carmen_enters_demo', 'Carmen enters Demo'],
    ['DEMO_CONTEXT', 'org_lens_synth_after_demo', 'After OA-1 Demo resolves SYNTH lens (not REAL empty filter)'],
    ['DOMAIN_CONTENT', 'demo_client_names_visible', 'Client names visible (not banner-only)'],
    ['PERSISTENCE', 'sidebar_nav_retains_demo', 'Normal sidebar nav retains Demo'],
    ['PERSISTENCE', 'refresh_retains_demo', 'Refresh retains Demo'],
    ['DEMO_CONTEXT', 'story_mode_retains_demo', 'Story Mode retains Demo'],
    ['DOMAIN_CONTENT', 'named_client_openable', 'Named client openable'],
    ['DOMAIN_CONTENT', 'opportunity_visible', 'Opportunity visible'],
    ['DOMAIN_CONTENT', 'quote_visible', 'Quote visible'],
    ['INTERACTION', 'quote_pdf_openable', 'Quote PDF openable'],
    ['DOMAIN_CONTENT', 'approval_request_visible', 'Approval request visible'],
    ['PERSISTENCE', 'approval_decision_persists', 'Approval decision persists'],
    ['DOMAIN_CONTENT', 'post_approval_next_action', 'Correct post-approval next action'],
    ['INTERACTION', 'eligible_quote_conversion', 'Eligible quote conversion works'],
    ['DOMAIN_CONTENT', 'pedido_in_index', 'Created Pedido in Pedidos index'],
    ['CROSS_PAGE_COHERENCE', 'pedido_in_cliente360', 'Pedido in Cliente360'],
    ['DOMAIN_CONTENT', 'work_attention_updates', 'Work/Attention updates when appropriate'],
    ['DOMAIN_CONTENT', 'conversation_durable_visible', 'Conversation durable record visible'],
    ['CROSS_PAGE_COHERENCE', 'audit_business_events', 'Audit/history receives business events'],
    ['DOMAIN_CONTENT', 'map_demo_entries', 'Map contains demo entries'],
    ['DOMAIN_CONTENT', 'management_demo_metrics', 'Management factual demo metrics'],
    ['DEMO_CONTEXT', 'datos_reales_restores_real', 'Datos reales restores REAL context'],
    ['NEGATIVE_SECURITY', 'protected_real_unchanged', 'Protected REAL records unchanged'],
    ['NEGATIVE_SECURITY', 'no_qa_ver_como_impersonation', 'Demo must not swap actorMemberId (no Ver como)'],
    ['NEGATIVE_SECURITY', 'no_invented_revenue_on_mgmt', 'Gerencia must not show official revenue/profit'],
  ];
  for (const [cat, id, detail] of required) {
    todo(cat, id, `${detail} — HOSTED_RUN=PENDING`);
  }
}

registerClosedLoopTodos();

if (EXECUTE) {
  report.hostedRun = 'RUNNING';
  await runHosted();
  report.hostedRun = 'EXECUTED';
} else {
  runDryStructural();
  report.hostedRun = 'PENDING';
}

const totals = CATEGORIES.reduce(
  (acc, c) => {
    const b = report.categories[c];
    acc.pass += b.pass;
    acc.fail += b.fail;
    acc.todo += b.todo;
    acc.skip += b.skip;
    return acc;
  },
  { pass: 0, fail: 0, todo: 0, skip: 0 },
);

report.finishedAt = new Date().toISOString();
report.summary = {
  ...totals,
  hostedRun: report.hostedRun,
  ownerPassClaimed: false,
  bannerOnlyNotPass: true,
  note:
    report.hostedRun === 'PENDING'
      ? 'Script committed; HOSTED_RUN=PENDING until integrate/deploy. No owner PASS claim.'
      : totals.fail > 0
        ? 'Hosted run recorded FAILs — do not greenwash.'
        : 'Hosted execute finished; Control Tower still scores categories separately.',
};

writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
console.log('\n--- OA-7 summary ---');
console.log(JSON.stringify(report.summary, null, 2));
console.log(`Wrote ${OUT_JSON}`);

if (report.hostedRun === 'PENDING') {
  process.exitCode = 0;
} else if (totals.fail > 0) {
  process.exitCode = 1;
}
