import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({
    executablePath: '/snap/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Login
  await page.goto('https://app.cubiqlo.com/login');
  await page.fill('input[type="email"]', 'lostyoungsters@gmail.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app/dashboard', { timeout: 15000 });

  // Open AI Fullpage
  await page.goto('https://app.cubiqlo.com/app/ai');
  await page.waitForTimeout(2000);

  // Click on the latest chat in the sidebar
  const firstChat = page.locator('aside button').first();
  if (await firstChat.isVisible()) {
    await firstChat.click();
    await page.waitForTimeout(2000);
  }

  await page.screenshot({ path: '/root/ai_chat_real_inspect.png' });
  console.log('Real AI chat inspected!');
  await browser.close();
}

main().catch(console.error);
