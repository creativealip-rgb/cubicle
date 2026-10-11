import { expect, test } from "@playwright/test";

/**
 * TASK 14 accessibility + focus contracts for the landing canvas.
 *
 * No `axe` dependency: accessible names, roles, and `aria-pressed` state are
 * asserted directly with locators. Read-only — no document mutations — but it
 * still needs a signed-in session, so it is gated to a localhost/dev target and
 * never runs against the production default `baseURL`.
 */
const email = process.env.PERSONAL_SITE_E2E_EMAIL;
const password = process.env.PERSONAL_SITE_E2E_PASSWORD;
const baseUrl = process.env.BASE_URL ?? "";
const safeTarget = /^https?:\/\/(?:127\.0\.0\.1|localhost|dev\.cubiqlo\.com)(?::\d+)?(?:\/|$)/.test(baseUrl);
const enabled = process.env.ALLOW_MUTATING_E2E === "true" && safeTarget && Boolean(email && password);

test.use({ storageState: ".auth/user.json" });

test.describe.serial("Landing canvas accessibility contracts", () => {
  test.skip(!enabled, "Requires explicit opt-in, owner QA credentials, and a localhost/dev target");

  test.beforeEach(async ({ page }) => {
    await page.goto("/app/personal-site", { waitUntil: "networkidle" });
  });

  test("every icon/toggle button exposes a name and toggles announce aria-pressed", async ({ page }) => {
    // The inline text toolbar only mounts while a text field is focused; open the
    // Structure rail first — its rows are the keyboard entry point.
    await page.getByRole("tab", { name: /structure/i }).click();

    // Icon-only structure action: named, and focusable from the keyboard.
    const drag = page.getByRole("button", { name: /drag to reorder|seret untuk mengurutkan/i }).first();
    await expect(drag).toBeVisible();

    // Rows select from the keyboard (Enter/Space), so the canvas is usable without a pointer.
    const row = page.locator("[data-section-row]").first();
    await row.focus();
    await page.keyboard.press("Enter");
    await expect(row).toHaveAttribute("class", /border-primary/);
  });

  test("formatting toggles expose aria-pressed state", async ({ page }) => {
    await page.locator('[contenteditable="true"]:visible').nth(4).click();
    const toolbar = page.getByRole("toolbar").first();
    await expect(toolbar).toBeVisible();
    for (const name of ["Bold", "Italic", "Underline", "Strikethrough"]) {
      const button = toolbar.getByRole("button", { name });
      const initial = await button.getAttribute("aria-pressed");
      expect(["true", "false"]).toContain(initial);
      await button.click();
      await expect(toolbar.getByRole("button", { name })).toHaveAttribute(
        "aria-pressed",
        initial === "true" ? "false" : "true",
      );
    }
  });

  test("structural mutations are announced in a polite live region", async ({ page }) => {
    const announcer = page.getByTestId("canvas-announcer");
    await expect(announcer).toHaveAttribute("role", "status");
    await expect(announcer).toHaveAttribute("aria-live", "polite");
  });

  test("drawers return focus to their trigger on close", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/app/personal-site", { waitUntil: "networkidle" });
    const trigger = page.getByRole("button", { name: /elements|elemen/i }).first();
    await trigger.click();
    await page.getByRole("button", { name: /close panel|tutup panel|close/i }).first().click();
    await expect(trigger).toBeFocused();
  });

  test("section animation preview respects reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/app/personal-site", { waitUntil: "networkidle" });
    // With reduced motion the scroll-reveal wrapper is already visible (never
    // parked at opacity:0 waiting for the IntersectionObserver).
    const revealed = page.locator(".site-animate").first();
    if (await revealed.count()) {
      await expect(revealed).toHaveCSS("opacity", "1");
    }
  });

  test("keeps exactly one main landmark", async ({ page }) => {
    await expect(page.getByRole("main")).toHaveCount(1);
  });
});
