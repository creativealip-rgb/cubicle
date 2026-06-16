// Cubicle Mobile QA Pass 2 — authed /app/* routes with cookie injection
// Usage: node /root/projek/cubicle/scripts/mobile-qa-pass2.cjs
/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require("/root/projects/monev/node_modules/playwright");

const BASE_URL = process.env.CUBICLE_BASE_URL || "https://cubicle.168.144.37.19.sslip.io";
const EMAIL = "owner@cubicle.test";
const PASSWORD = "password123";

const PAGES = [
  "/app/dashboard",
  "/app/clients",
  "/app/projects",
  "/app/tasks",
  "/app/files",
  "/app/time",
  "/app/invoices",
  "/app/invoices/28cd5281-9649-483c-9d34-25564f5be171", // INV-0001 detail
];

const VIEWPORTS = [
  { name: "iPhone12", width: 390, height: 844 },
  { name: "iPhoneSE", width: 375, height: 812 },
  { name: "iPad", width: 768, height: 1024 },
  { name: "Desktop", width: 1280, height: 720 },
];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  const out = [];

  for (const vp of VIEWPORTS) {
    // Login per-viewport to get a fresh context with cookies
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: `Mozilla/5.0 (CubicleQA-Pass2/${vp.name})`,
    });
    const page = await context.newPage();

    // 1) Login via Better Auth API to grab session cookies
    const loginResp = await page.request.post(`${BASE_URL}/api/auth/sign-in/email`, {
      data: { email: EMAIL, password: PASSWORD },
      headers: { "Content-Type": "application/json", Origin: BASE_URL },
    });
    if (!loginResp.ok()) {
      console.error(`[${vp.name}] login failed: HTTP ${loginResp.status()}`);
      await context.close();
      continue;
    }

    // 2) Inject cookies into context
    const cookies = await page.request.storageState();
    await context.addCookies(cookies.cookies);

    // 3) Probe each page
    for (const path of PAGES) {
      try {
        await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle", timeout: 30000 });
        const shot = `/tmp/cubicle-${vp.name}-${path.replaceAll("/", "_")}.png`;
        await page.screenshot({ path: shot, fullPage: false });

        const data = await page.evaluate(() => {
          const overflow = document.documentElement.scrollWidth - window.innerWidth;
          const hOverflow = document.body.scrollWidth - window.innerWidth;
          return {
            url: location.pathname,
            status: document.title,
            docWidth: document.documentElement.scrollWidth,
            winWidth: window.innerWidth,
            docHeight: document.documentElement.scrollHeight,
            winHeight: window.innerHeight,
            horizontalOverflow: overflow,
            bodyHorizontalOverflow: hOverflow,
            sidebarVisible: !!document.querySelector('[data-sidebar], aside, [class*="sidebar" i]'),
            topbarVisible: !!document.querySelector('header, [class*="topbar" i], [class*="top-bar" i]'),
            hamburgerVisible: !!document.querySelector('[aria-label*="menu" i], [class*="hamburger" i], button[class*="menu" i]'),
            headings: [...document.querySelectorAll("h1,h2")]
              .slice(0, 4)
              .map((el) => el.textContent.trim().slice(0, 60)),
            // Check if redirected to login (cookie didn't work)
            redirectedToLogin: location.pathname.includes("/login") || location.pathname.includes("/signup"),
          };
        });
        out.push({ viewport: vp.name, page: path, ok: true, shot, ...data });
      } catch (e) {
        out.push({ viewport: vp.name, page: path, ok: false, error: String(e).slice(0, 200) });
      }
    }
    await context.close();
  }

  await browser.close();
  console.log(JSON.stringify(out, null, 2));
})();
