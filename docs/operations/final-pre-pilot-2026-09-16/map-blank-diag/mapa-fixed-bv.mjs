/**
 * Post-deploy MAP_LIVE BV for carmen.staging — secret-safe.
 * Never prints passwords or Mapbox tokens.
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
const SHOT = join(OUT_DIR, 'mapa-fixed-1440.png');
const REPORT = join(OUT_DIR, 'mapa-fixed-bv.json');
const SHA = '29b6f3f37fcf848a4a16248f34e39eeb33d1e463';

mkdirSync(OUT_DIR, { recursive: true });

function loadPassword(email) {
  const secretsDir = join(homedir(), '.isalwa-secrets');
  for (const name of [
    'isalwa-os-staging-wave-b-issue-memory-passwords.json',
    'isalwa-os-staging-wave-a-continuity-passwords.json',
    'isalwa-os-staging-wave2-role-passwords.json',
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

function redact(url) {
  try {
    const u = new URL(url);
    if (u.searchParams.has('access_token')) u.searchParams.set('access_token', 'REDACTED');
    return `${u.origin}${u.pathname}${u.search}`;
  } catch {
    return String(url).replace(/access_token=[^&]+/gi, 'access_token=REDACTED');
  }
}

/** Sample map canvas pixels; porcelain blank ≈ near #f3f1ed with low variance. */
function analyzePixels(data, w, h) {
  if (!data || !w || !h) return { ok: false, reason: 'NO_PIXELS' };
  // Porcelain target from defect: #f3f1ed
  const porcelain = { r: 0xf3, g: 0xf1, b: 0xed };
  let samples = 0;
  let porcelainNear = 0;
  let uniqueBuckets = new Set();
  let sumR = 0,
    sumG = 0,
    sumB = 0;
  const stepX = Math.max(1, Math.floor(w / 24));
  const stepY = Math.max(1, Math.floor(h / 16));
  // Avoid edges / UI chrome — sample center 70%
  const x0 = Math.floor(w * 0.15);
  const x1 = Math.floor(w * 0.85);
  const y0 = Math.floor(h * 0.15);
  const y1 = Math.floor(h * 0.85);
  for (let y = y0; y < y1; y += stepY) {
    for (let x = x0; x < x1; x += stepX) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 200) continue;
      samples++;
      sumR += r;
      sumG += g;
      sumB += b;
      uniqueBuckets.add(`${r >> 4},${g >> 4},${b >> 4}`);
      const dr = Math.abs(r - porcelain.r);
      const dg = Math.abs(g - porcelain.g);
      const db = Math.abs(b - porcelain.b);
      if (dr < 18 && dg < 18 && db < 18) porcelainNear++;
    }
  }
  const porcelainRatio = samples ? porcelainNear / samples : 1;
  const avg = samples
    ? { r: Math.round(sumR / samples), g: Math.round(sumG / samples), b: Math.round(sumB / samples) }
    : null;
  // Real Mapbox Light basemap has roads/land variation; blank porcelain is near-uniform
  const basemapVisible = samples > 20 && porcelainRatio < 0.55 && uniqueBuckets.size >= 8;
  return {
    samples,
    porcelainRatio: Number(porcelainRatio.toFixed(3)),
    uniqueBuckets: uniqueBuckets.size,
    avg,
    basemapVisible,
  };
}

const password = loadPassword(EMAIL);
if (!password) {
  writeFileSync(REPORT, JSON.stringify({ ok: false, reason: 'PASSWORD_MISSING', sha: SHA }, null, 2));
  console.log('FAIL PASSWORD_MISSING');
  process.exit(2);
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const mapbox = [];

page.on('response', (res) => {
  if (/mapbox\.com/i.test(res.url())) {
    try {
      const u = new URL(res.url());
      mapbox.push({
        status: res.status(),
        host: u.host,
        path: u.pathname,
        url: redact(res.url()),
      });
    } catch {
      mapbox.push({ status: res.status(), url: redact(res.url()) });
    }
  }
});

const report = {
  at: new Date().toISOString(),
  sha: SHA,
  email: EMAIL,
  page: `${BASE}/mapa`,
  viewport: { width: 1440, height: 900 },
};

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 90000 }),
    page.click('button[type="submit"]'),
  ]);
  report.login = 'OK';

  await page.goto(`${BASE}/mapa`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(1200);

  let dismissed = false;
  const skip = page.getByRole('button', { name: /Explorar por mi cuenta/i });
  if (await skip.count()) {
    await skip.click();
    dismissed = true;
    await page.waitForTimeout(1000);
  } else {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
  report.welcomeDismissed = dismissed;

  await page.waitForSelector('[data-map-canvas="live"], .mapboxgl-canvas, canvas', { timeout: 45000 });
  await page.waitForTimeout(8000);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('resize'));
  });
  await page.waitForTimeout(1500);

  const dom = await page.evaluate(() => {
    const text = document.body?.innerText || '';
    const cov = text.match(/(\d+)\s+de\s+(\d+)\s+clientes con (coordenadas|ubicación)/i);
    const markers = document.querySelectorAll(
      '.mapboxgl-marker, [data-map-marker], .mapboxgl-marker-anchor-center',
    ).length;
    const canvas = document.querySelector('[data-map-canvas="live"] canvas, .mapboxgl-canvas, canvas');
    let pixels = null;
    if (canvas) {
      try {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          const { width, height } = canvas;
          const img = ctx.getImageData(0, 0, width, height);
          pixels = { w: width, h: height, data: Array.from(img.data) };
        }
      } catch (e) {
        pixels = { error: String(e.message || e).slice(0, 120) };
      }
    }
    return {
      url: location.href,
      welcomeStill: /Bienvenido a ISALWA/i.test(text),
      mapboxLight: /Mapbox Light/i.test(text),
      coverageText: cov ? `${cov[1]}/${cov[2]}` : null,
      coverageParts: cov ? [Number(cov[1]), Number(cov[2])] : null,
      markers,
      mapCanvasAttr: document.querySelector('[data-map-canvas]')?.getAttribute('data-map-canvas'),
      engine: document.querySelector('[data-map-engine]')?.getAttribute('data-map-engine'),
      canvasCount: document.querySelectorAll('canvas').length,
      canvasSize: canvas ? { w: canvas.width, h: canvas.height } : null,
      pixels,
    };
  });

  let pixelAnalysis = { ok: false, reason: 'NO_2D_CONTEXT' };
  if (dom.pixels?.data) {
    pixelAnalysis = analyzePixels(dom.pixels.data, dom.pixels.w, dom.pixels.h);
  } else if (dom.pixels?.error) {
    // WebGL canvas often blocks 2d read — fall back to screenshot file analysis later
    pixelAnalysis = { ok: false, reason: 'WEBGL_READBACK_BLOCKED', detail: dom.pixels.error };
  }
  delete dom.pixels;

  await page.screenshot({ path: SHOT, fullPage: false });
  report.screenshot = SHOT;
  report.screenshotBytes = existsSync(SHOT) ? readFileSync(SHOT).length : 0;

  // If canvas 2d blocked, sample PNG via sharp/pngjs if available, else crude PNG decode skip
  if (!pixelAnalysis.basemapVisible && pixelAnalysis.reason === 'WEBGL_READBACK_BLOCKED') {
    try {
      // Use Chromium screenshot of map region only + evaluate via OffscreenCanvas from blob is hard.
      // Instead: CDP capture of map element bounding box already in SHOT — use simple PNG parse.
      const { PNG } = require('pngjs');
      const png = PNG.sync.read(readFileSync(SHOT));
      // Approximate map region: right/center of layout — sample middle band of full page shot
      pixelAnalysis = {
        ...analyzePixels(png.data, png.width, png.height),
        source: 'fullpage-png',
      };
    } catch (e) {
      pixelAnalysis = {
        ...pixelAnalysis,
        pngFallbackError: String(e.message || e).slice(0, 160),
      };
    }
  }

  const style200 = mapbox.filter(
    (r) => r.status === 200 && /\/styles\/v1\//.test(r.path || r.url || ''),
  ).length;
  const tile200 = mapbox.filter(
    (r) => r.status === 200 && (/\/v4\//.test(r.path || r.url || '') || /\.vector\.pbf/.test(r.url || '')),
  ).length;
  const authFail = mapbox.filter((r) => r.status === 401 || r.status === 403).length;

  report.dom = dom;
  report.pixelAnalysis = pixelAnalysis;
  report.mapbox = {
    total: mapbox.length,
    ok200: mapbox.filter((r) => r.status === 200).length,
    style200,
    tile200,
    authFail,
    samples: mapbox.slice(0, 20),
  };

  const coverageHonesty =
    Array.isArray(dom.coverageParts) &&
    dom.coverageParts[0] === 2 &&
    dom.coverageParts[1] === 7;

  const mapLive =
    report.login === 'OK' &&
    !dom.welcomeStill &&
    style200 >= 1 &&
    tile200 >= 1 &&
    authFail === 0 &&
    (pixelAnalysis.basemapVisible === true ||
      // if PNG analysis unavailable but canvas live + tiles + Mapbox Light + markers/coverage
      (pixelAnalysis.reason === 'WEBGL_READBACK_BLOCKED' &&
        dom.mapCanvasAttr === 'live' &&
        style200 >= 1 &&
        tile200 >= 4));

  // Stricter: require basemapVisible when we have pixel analysis
  const mapLiveStrict =
    report.login === 'OK' &&
    !dom.welcomeStill &&
    style200 >= 1 &&
    tile200 >= 1 &&
    authFail === 0 &&
    pixelAnalysis.basemapVisible === true &&
    (coverageHonesty || dom.coverageText === '2/7');

  report.coverageHonesty = coverageHonesty;
  report.MAP_LIVE = mapLiveStrict || (pixelAnalysis.basemapVisible === true && style200 >= 1 && tile200 >= 1);
  // Prefer strict; if webgl blocked use visual judgment via PNG
  if (pixelAnalysis.basemapVisible === true) report.MAP_LIVE = true;
  else if (pixelAnalysis.porcelainRatio != null && pixelAnalysis.porcelainRatio >= 0.55)
    report.MAP_LIVE = false;
  else report.MAP_LIVE = mapLiveStrict;

  report.criteria = {
    loginOk: report.login === 'OK',
    welcomeGone: !dom.welcomeStill,
    style200,
    tile200,
    authFail,
    basemapVisible: pixelAnalysis.basemapVisible === true,
    coverageHonesty,
    markers: dom.markers,
    mapboxLight: dom.mapboxLight,
  };

  writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log(
    `RESULT MAP_LIVE=${report.MAP_LIVE} style200=${style200} tile200=${tile200} auth=${authFail} cov=${dom.coverageText} markers=${dom.markers} porcelainRatio=${pixelAnalysis.porcelainRatio} buckets=${pixelAnalysis.uniqueBuckets} basemap=${pixelAnalysis.basemapVisible} shot=${SHOT}`,
  );
} catch (err) {
  report.ok = false;
  report.error = String(err.message || err)
    .replace(/pk\.[A-Za-z0-9._-]+/g, 'pk.REDACTED')
    .slice(0, 400);
  writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log('FAIL', report.error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
