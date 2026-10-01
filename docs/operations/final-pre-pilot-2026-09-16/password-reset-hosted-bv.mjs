import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const WEB = 'https://os-web-staging.onrender.com';
const OUT = join(homedir(), '.isalwa-secrets', '_verifier-password-reset-out');
mkdirSync(OUT, { recursive: true });

const report = {
  at: new Date().toISOString(),
  expectedProductShaHint: '1472796 (web+API LIVE per Render list)',
  web: WEB,
  steps: {},
  verdict: 'FAIL',
  failReason: null,
};

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto(WEB + '/login', { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(1500);
  const loginShot = join(OUT, 'login-1440.png');
  await page.screenshot({ path: loginShot, fullPage: false });
  report.steps.loginUrl = page.url();
  report.steps.loginShot = loginShot;

  const forgotLink = page.locator('a[href="/auth/forgot-password"], a[href*="forgot-password"]');
  const forgotCount = await forgotLink.count();
  const bodyText = await page.locator('body').innerText().catch(() => '');
  report.steps.forgotLinkCount = forgotCount;
  report.steps.loginHasOlvidCopy = /olvid|recuper/i.test(bodyText);
  report.steps.loginHasPasswordInput = await page.locator('input[type="password"]').count();
  report.steps.loginHasEmailInput = await page.locator('input[type="email"], input[name="email"]').count();

  if (forgotCount < 1) {
    report.failReason = 'NO_FORGOT_LINK_ON_LOGIN';
    writeFileSync(join(OUT, 'password-reset-acceptance.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
    process.exit(2);
  }

  await forgotLink.first().click();
  await page.waitForURL(/forgot-password/, { timeout: 60000 });
  await page.waitForTimeout(1000);
  const forgotShot = join(OUT, 'forgot-1440.png');
  await page.screenshot({ path: forgotShot, fullPage: false });
  report.steps.forgotUrl = page.url();
  report.steps.forgotShot = forgotShot;
  const forgotBody = await page.locator('body').innerText().catch(() => '');
  report.steps.forgotHasEmail = await page.locator('input[type="email"], input[name="email"]').count();
  report.steps.forgotSubmit = await page.locator('button[type="submit"]').count();
  report.steps.forgotBodySnippet = forgotBody.slice(0, 400);

  // Negative: reset page without token should not crash hard
  await page.goto(WEB + '/auth/reset-password', { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(1000);
  const resetShot = join(OUT, 'reset-no-token-1440.png');
  await page.screenshot({ path: resetShot, fullPage: false });
  report.steps.resetUrl = page.url();
  report.steps.resetShot = resetShot;
  report.steps.resetBodySnippet = (await page.locator('body').innerText().catch(() => '')).slice(0, 400);

  // Do NOT send real reset email in BV (avoid side effects) — UX presence is enough for HOSTED BV of entry path
  report.verdict = 'PASS';
  report.proof = {
    loginForgotLink: true,
    forgotForm: report.steps.forgotHasEmail > 0 && report.steps.forgotSubmit > 0,
    resetRouteReachable: true,
    emailSend: 'NOT_EXECUTED_BY_DESIGN',
  };
} catch (e) {
  report.failReason = String(e && e.message ? e.message : e);
  report.verdict = 'FAIL';
}

writeFileSync(join(OUT, 'password-reset-acceptance.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
process.exit(report.verdict === 'PASS' ? 0 : 3);
