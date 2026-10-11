import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

const base = process.env.BASE_URL || 'https://cubiqlo.com';
const out = process.env.OUT_DIR || '/tmp/cubiqlo-landing-audit';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
for (const device of [
  { name: 'desktop', viewport: { width: 1440, height: 1000 } },
  { name: 'tablet', viewport: { width: 768, height: 1024 } },
  { name: 'mobile', viewport: { width: 390, height: 844 } },
]) {
  const context = await browser.newContext({ viewport: device.viewport, locale: 'en-US' });
  const page = await context.newPage();
  const consoleErrors = [], pageErrors = [], failedRequests = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('requestfailed', r => failedRequests.push(`${r.method()} ${r.url()} ${r.failure()?.errorText}`));
  const response = await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
  await page.screenshot({ path: `${out}/${device.name}-full.png`, fullPage: true });
  const metrics = await page.evaluate(() => {
    const html = document.documentElement;
    const all = [...document.querySelectorAll('*')];
    const images = [...document.images].map(i => ({ src: i.currentSrc, complete: i.complete, nw: i.naturalWidth, nh: i.naturalHeight, alt: i.alt }));
    const headings = [...document.querySelectorAll('h1,h2,h3')].map(h => ({ tag: h.tagName, text: h.textContent?.trim() }));
    const links = [...document.querySelectorAll('a[href]')].map(a => ({ text: a.textContent?.trim(), href: a.href, visible: !!(a.offsetWidth || a.offsetHeight || a.getClientRects().length) }));
    const controls = [...document.querySelectorAll('button,input,select,textarea,summary')].map(e => ({ tag: e.tagName, text: e.textContent?.trim(), label: e.getAttribute('aria-label'), title: e.getAttribute('title'), visible: !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length) }));
    const clipped = all.filter(e => { const r=e.getBoundingClientRect(); return r.width>0 && (r.right > innerWidth + 1 || r.left < -1); }).slice(0,30).map(e => ({ tag:e.tagName, cls:e.className?.toString().slice(0,120), left:e.getBoundingClientRect().left, right:e.getBoundingClientRect().right }));
    return { title: document.title, lang: html.lang, scrollWidth: html.scrollWidth, clientWidth: html.clientWidth, images, headings, links, controls, clipped, sections: [...document.querySelectorAll('section')].length };
  });
  // Verify anchors scroll to target and mobile menu opens.
  const anchors = ['workflow','portal','compare','pricing'];
  const anchorResults = [];
  for (const id of anchors) {
    const target = page.locator(`#${id}`);
    anchorResults.push({ id, count: await target.count(), visible: await target.isVisible().catch(()=>false) });
  }
  let mobileMenu = null;
  if (device.name === 'mobile') {
    const summary = page.locator('summary[aria-label]').first();
    await summary.click();
    mobileMenu = { open: await page.locator('details').first().getAttribute('open') !== null, links: await page.locator('details nav a').count() };
    await page.screenshot({ path: `${out}/mobile-menu.png`, fullPage: false });
  }
  results.push({ device: device.name, status: response?.status(), url: page.url(), metrics, anchorResults, mobileMenu, consoleErrors, pageErrors, failedRequests });
  await context.close();
}
await browser.close();
await fs.writeFile(`${out}/result.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results.map(r => ({device:r.device,status:r.status,url:r.url,overflow:r.metrics.scrollWidth-r.metrics.clientWidth,imagesBroken:r.metrics.images.filter(i=>!i.complete||!i.nw).length,sections:r.metrics.sections,headings:r.metrics.headings.length,links:r.metrics.links.length,controls:r.metrics.controls.length,clipped:r.metrics.clipped.length,anchors:r.anchorResults,mobileMenu:r.mobileMenu,consoleErrors:r.consoleErrors,pageErrors:r.pageErrors,failedRequests:r.failedRequests})), null, 2));
