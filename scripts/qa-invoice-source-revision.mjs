import { chromium } from '@playwright/test';
import fs from 'node:fs';

const base = 'http://127.0.0.1:3201';
const email = 'qa-owner-20260730@cubiqlo.test';
const password = 'QaCubiqlo!2026';
const clientId = '88804acd-2681-4c46-a0c9-d316a2ce1345';
const fixedId = '7d0cbd8a-4cb1-47a6-86f0-87b2e827af57';
const hourlyId = '2da0f390-a8b4-4242-9a11-9d2d0b392dbe';
const retainerId = '11111111-2222-4333-8444-555555555555';
const outDir = 'docs/qa-screenshots/invoice-source-revision';
fs.mkdirSync(outDir, { recursive: true });
const report = { checks: [], errors: [] };
const check = (name, ok, detail = {}) => { report.checks.push({ name, ok, ...detail }); if (!ok) process.exitCode = 1; };

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.on('pageerror', e => report.errors.push(`pageerror @ ${page.url()}: ${e.message}`));
page.on('console', m => { if (m.type() === 'error') report.errors.push(`console @ ${page.url()}: ${m.text()}`); });

async function login() {
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', password);
  await page.click('button[type=submit]');
  await page.waitForURL(/\/app\//, { timeout: 20000 });
}
async function text() { return await page.locator('main').innerText(); }
async function shot(name) { await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true }); }
async function openProjectDialog(projectId, expected) {
  await page.goto(`${base}/app/projects/${projectId}`, { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: /Invoice/ }).click();
  const body = await text();
  check(`${expected}-page-no-error`, !body.includes('Ada yang error'));
  const button = page.getByRole('button', { name: expected === 'retainer' ? /Buat Deposit\/Item Manual/i : /Buat Invoice/i }).first();
  check(`${expected}-action-visible`, await button.isVisible().catch(() => false));
  if (await button.isVisible().catch(() => false)) {
    await button.click();
    const dialog = page.getByRole('dialog').last();
    check(`${expected}-dialog-visible`, await dialog.isVisible().catch(() => false));
    const dtext = await dialog.innerText().catch(() => '');
    if (expected === 'fixed') check('fixed-preview-visible', /Nilai disepakati[\s\S]*Sudah ditagih[\s\S]*Sisa nilai/.test(dtext));
    if (expected === 'hourly') check('hourly-source-options-visible', /Timesheet disetujui/.test(dtext) && /Deposit/.test(dtext));
    if (expected === 'retainer') check('retainer-manual-copy-visible', /Invoice periode Retainer dibuat lewat alur periode Retainer/.test(dtext));
    await shot(`desktop-project-${expected}`);
    await page.keyboard.press('Escape');
  }
  return body;
}

try {
  await login();
  await page.goto(`${base}/app/invoices/new`, { waitUntil: 'networkidle' });
  let body = await text();
  check('global-page-no-error', !body.includes('Ada yang error'));
  check('global-client-selector', await page.getByText('Klien *').isVisible().catch(() => false));
  await shot('desktop-global');

  await page.goto(`${base}/app/clients/${clientId}?tab=invoices`, { waitUntil: 'networkidle' });
  body = await text();
  check('client-page-no-error', !body.includes('Ada yang error'));
  const clientButton = page.getByRole('button', { name: /Buat Invoice/i }).first();
  check('client-create-visible', await clientButton.isVisible().catch(() => false));
  if (await clientButton.isVisible().catch(() => false)) {
    await clientButton.click();
    const dialog = page.getByRole('dialog').last();
    const dtext = await dialog.innerText();
    check('client-dialog-no-client-selector', !/Klien \*/.test(dtext));
    check('client-dialog-mobile-safe-classes', await dialog.evaluate(el => el.className.includes('max-h-[90dvh]') && el.className.includes('overflow-y-auto')));
    await shot('desktop-client-dialog');
    await page.keyboard.press('Escape');
  }

  await openProjectDialog(fixedId, 'fixed');
  await openProjectDialog(hourlyId, 'hourly');
  body = await openProjectDialog(retainerId, 'retainer');
  check('retainer-period-action-visible', /Buat Invoice Periode Retainer/.test(body));

  await page.setViewportSize({ width: 390, height: 844 });
  for (const [id, kind] of [[fixedId, 'fixed'], [hourlyId, 'hourly'], [retainerId, 'retainer']]) {
    await page.goto(`${base}/app/projects/${id}`, { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: /Invoice/ }).click();
    const button = page.getByRole('button', { name: kind === 'retainer' ? /Buat Deposit\/Item Manual/i : /Buat Invoice/i }).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      const dialog = page.getByRole('dialog').last();
      const metrics = await dialog.evaluate(el => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, bottom: el.getBoundingClientRect().bottom, viewport: innerHeight }));
      check(`mobile-${kind}-no-horizontal-overflow`, metrics.scrollWidth <= metrics.clientWidth + 1, metrics);
      check(`mobile-${kind}-dialog-reachable`, metrics.clientHeight <= 760 && metrics.bottom <= metrics.viewport + 1, metrics);
      await shot(`mobile-project-${kind}`);
      await page.keyboard.press('Escape');
    }
  }
} catch (error) {
  report.fatal = error.stack || error.message;
  process.exitCode = 1;
} finally {
  fs.writeFileSync('/tmp/cubiqlo-invoice-revision-final/browser-qa.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}
