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

  // Click top chat in sidebar history
  console.log('Opening top chat in history...');
  const firstChat = page.locator('button:has-text("buatkan projek retainer")').first();
  if (await firstChat.isVisible()) {
    await firstChat.click();
    await page.waitForTimeout(3000);
  } else {
    // try clicking any recent chat item
    const recentItem = page.locator('div[class*="truncate"]:has-text("buatkan")').first();
    if (await recentItem.isVisible()) {
      await recentItem.click();
      await page.waitForTimeout(3000);
    }
  }

  await page.screenshot({ path: '/root/.hermes/profiles/coder/cache/images/verify-history-card.png', fullPage: true });
  console.log('Screenshot saved to /root/.hermes/profiles/coder/cache/images/verify-history-card.png');

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
