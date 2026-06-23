import { test, expect } from "@playwright/test"

test.describe("Cubicle E2E", () => {
  test.describe("Public routes", () => {
    test("landing page loads", async ({ page }) => {
      await page.goto("/")
      await expect(page).toHaveTitle(/Cubiqlo/i)
    })

    test("login page loads", async ({ page }) => {
      await page.goto("/login")
      await expect(page.locator("input[type=email]")).toBeVisible()
      await expect(page.locator("input[type=password]")).toBeVisible()
    })

    test("signup page loads", async ({ page }) => {
      await page.goto("/signup")
      await expect(page.locator("input[type=email]")).toBeVisible()
    })

    test("health API returns ok", async ({ request }) => {
      const response = await request.get("/api/health")
      expect(response.ok()).toBeTruthy()
      const body = await response.json()
      expect(body.status).toBe("ok")
      expect(body.db).toBe("ok")
    })
  })

  test.describe("Auth flow", () => {
    test("login with valid credentials", async ({ page }) => {
      await page.goto("/login")
      await page.fill("input[type=email]", "owner@cubicle.test")
      await page.fill("input[type=password]", "password123")
      await page.click("button[type=submit]")
      await page.waitForURL("**/app/**", { timeout: 10000 })
      await expect(page).toHaveURL(/\/app\/dashboard/)
    })

    test("login with invalid credentials shows error", async ({ page }) => {
      await page.goto("/login")
      await page.fill("input[type=email]", "owner@cubicle.test")
      await page.fill("input[type=password]", "wrongpassword")
      await page.click("button[type=submit]")
      // Should stay on login or show error
      await page.waitForTimeout(3000)
      const url = page.url()
      expect(url).not.toContain("/app/dashboard")
    })

    test("protected routes redirect to login", async ({ page }) => {
      await page.goto("/app/dashboard")
      await page.waitForURL("**/login**", { timeout: 5000 })
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe("Authenticated app", () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto("/login")
      await page.fill("input[type=email]", "owner@cubicle.test")
      await page.fill("input[type=password]", "password123")
      await page.click("button[type=submit]")
      await page.waitForURL("**/app/**", { timeout: 10000 })
    })

    test("dashboard loads with KPIs", async ({ page }) => {
      await page.goto("/app/dashboard")
      await expect(page.getByText("Revenue").first()).toBeVisible({ timeout: 10000 })
    })

    test("clients page loads", async ({ page }) => {
      await page.goto("/app/clients")
      await expect(page.getByRole("heading", { name: "Clients" })).toBeVisible({ timeout: 10000 })
    })

    test("invoices page loads", async ({ page }) => {
      await page.goto("/app/invoices")
      await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible({ timeout: 10000 })
    })

    test("brain page loads", async ({ page }) => {
      await page.goto("/app/brain")
      await expect(page.getByText("How can I help")).toBeVisible({ timeout: 10000 })
    })

    test("settings page loads", async ({ page }) => {
      await page.goto("/app/settings")
      await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe("Rate limiting", () => {
    test("auth endpoint returns rate limit headers", async ({ request }) => {
      const response = await request.get("/api/auth/get-session")
      const headers = response.headers()
      expect(headers["x-ratelimit-limit"]).toBeTruthy()
      expect(headers["x-ratelimit-remaining"]).toBeTruthy()
    })
  })
})
