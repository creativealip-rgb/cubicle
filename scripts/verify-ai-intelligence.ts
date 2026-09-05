import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({
    executablePath: '/snap/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  console.log('Navigating to login...');
  await page.goto('https://app.cubiqlo.com/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'lostyoungsters@gmail.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app/**', { timeout: 15000 });

  console.log('Navigating to AI Brain (/app/brain)...');
  await page.goto('https://app.cubiqlo.com/app/brain', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Click "+ New" chat to get clean context
  const newBtn = page.getByRole('button', { name: '+ New' }).first();
  if (await newBtn.isVisible()) {
    await newBtn.click();
    await page.waitForTimeout(1000);
  }

  // Type read query: "cek client terbaru yang dibuat"
  console.log('Sending read query: cek client terbaru yang dibuat');
  const input = page.locator('textarea, input[placeholder*="Write a question"]').first();
  await input.fill('cek client terbaru yang dibuat');
  await input.press('Enter');

  // Wait for response
  await page.waitForTimeout(6000);

  await page.screenshot({ path: '/root/.hermes/profiles/coder/cache/images/verify-ai-read.png', fullPage: true });
  console.log('Screenshot saved to /root/.hermes/profiles/coder/cache/images/verify-ai-read.png');

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
