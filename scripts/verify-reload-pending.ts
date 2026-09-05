import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({
    executablePath: '/snap/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  console.log('Logging in...');
  await page.goto('https://app.cubiqlo.com/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'lostyoungsters@gmail.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app/**', { timeout: 15000 });

  console.log('Navigating to Brain...');
  await page.goto('https://app.cubiqlo.com/app/brain', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Start new chat
  const newBtn = page.getByRole('button', { name: '+ New' }).first();
  if (await newBtn.isVisible()) {
    await newBtn.click();
    await page.waitForTimeout(1000);
  }

  // Type: buatkan projek retainer di budiono wong
  console.log('Sending command: buatkan projek retainer di budiono wong');
  const input = page.locator('textarea, input[placeholder*="Write a question"], input[placeholder*="Ask about"]').first();
  await input.fill('buatkan projek retainer di budiono wong');
  await input.press('Enter');

  // Wait for confirmation card
  await page.waitForTimeout(6000);

  // Reload page to verify persistence of pending confirmation card
  console.log('Reloading page to test persistence...');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  await page.screenshot({ path: '/root/.hermes/profiles/coder/cache/images/verify-reload-pending.png', fullPage: true });
  console.log('Screenshot saved to /root/.hermes/profiles/coder/cache/images/verify-reload-pending.png');

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
