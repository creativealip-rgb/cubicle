import { test, expect } from '@playwright/test';


const BASE_URL = process.env.BASE_URL || 'https://app.cubiqlo.com';

test('Calendar availability, public booking, internal cancel, and ICS download flow', async ({ browser }) => {
  test.setTimeout(120000);
  const context = await browser.newContext({ storageState: '.auth/user.json' });
  const page = await context.newPage();

  // Go to /app/settings to verify or set booking slug
  console.log('Navigating to /app/settings');
  await page.goto(`${BASE_URL}/app/settings`);
  await page.waitForLoadState('networkidle');

  const bookingSlugInput = page.locator('input[name="bookingSlug"]');
  let slugValue = '';
  if (await bookingSlugInput.count() > 0) {
    slugValue = await bookingSlugInput.inputValue();
  }

  if (!slugValue) {
    const slugField = page.locator('input[name="bookingSlug"]').first();
    if (await slugField.isVisible()) {
      const newSlug = `qa-booking-${Date.now()}`;
      await slugField.fill(newSlug);
      const saveBtn = page.locator('button:has-text("Simpan"), button:has-text("Save")').first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(1000);
      }
      slugValue = newSlug;
    }
  }

  console.log(`Current QA booking slug: ${slugValue}`);

  // Go to /app/calendar to check availability rules
  console.log('Navigating to /app/calendar');
  await page.goto(`${BASE_URL}/app/calendar`);
  await page.waitForLoadState('networkidle');

  // If no availability rules exist, create one via UI
  const addRuleBtn = page.locator('button:has-text("Tambah aturan"), button:has-text("Tambah Aturan"), button:has-text("Add Rule")');
  if (await addRuleBtn.isVisible()) {
    console.log('Creating availability rule via UI...');
    await addRuleBtn.click();
    await page.waitForTimeout(500);
    const submitRuleBtn = page.locator('dialog button[type="submit"], [role="dialog"] button[type="submit"]').first();
    if (await submitRuleBtn.isVisible()) {
      await submitRuleBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  const publicBookingLink = page.locator(`a[href*="/booking/"]`).first();
  let bookingUrl = '';
  if (await publicBookingLink.isVisible()) {
    bookingUrl = await publicBookingLink.getAttribute('href') || '';
    if (bookingUrl.startsWith('/')) {
      bookingUrl = `${BASE_URL}${bookingUrl}`;
    }
  } else if (slugValue) {
    bookingUrl = `${BASE_URL}/booking/${slugValue}`;
  }

  console.log(`Public Booking URL: ${bookingUrl}`);
  expect(bookingUrl).not.toBe('');

  // Unauthenticated booking context
  const clientContext = await browser.newContext();
  const clientPage = await clientContext.newPage();

  console.log(`Opening public booking: ${bookingUrl}`);
  await clientPage.goto(bookingUrl);
  await clientPage.waitForLoadState('networkidle');

  // Find first future date with a free slot; fixed dates become stale/full.
  const dateInput = clientPage.locator('#booking-date');
  let slotRadio = clientPage.locator('input[name="slot"]').first();
  for (let offset = 1; offset <= 14; offset++) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + offset);
    await dateInput.fill(date.toISOString().slice(0, 10));
    await clientPage.waitForTimeout(350);
    slotRadio = clientPage.locator('input[name="slot"]').first();
    if (await slotRadio.count()) break;
  }
  await expect(slotRadio).toBeAttached({ timeout: 5_000 });
  await slotRadio.locator('xpath=..').click();
  await expect(slotRadio).toBeChecked();

  const timestamp = Date.now();
  const qaTitle = `QA-E2E Calendar Meeting ${timestamp}`;
  const qaName = `QA Tester ${timestamp}`;
  const qaEmail = `qa-attendee-${timestamp}@cubiqlo.test`;

  const nameInput = clientPage.locator('input[name="attendeeName"]');
  const emailInput = clientPage.locator('input[name="attendeeEmail"]');
  const titleInput = clientPage.locator('input[name="title"]');

  await titleInput.fill(qaTitle);
  await nameInput.fill(qaName);
  await emailInput.fill(qaEmail);

  const submitBookingBtn = clientPage.locator('form button[type="submit"]').first();
  console.log('Submitting public booking...');
  await submitBookingBtn.click();

  await clientPage.waitForTimeout(3000);
  console.log(`Post-booking URL: ${clientPage.url()}`);
  const clientContent = await clientPage.content();
  const bookingSuccess = clientContent.includes('Booking Confirmed') || clientContent.includes('success=1');
  console.log(`Client page booking success: ${bookingSuccess}`);
  expect(bookingSuccess).toBe(true);
  await clientContext.close();

  // Return to internal /app/calendar
  console.log('Reloading /app/calendar');
  await page.goto(`${BASE_URL}/app/calendar`);
  await page.waitForLoadState('networkidle');

  const pageContent = await page.content();
  console.log(`Calendar page contains QA Title (${qaTitle}): ${pageContent.includes(qaTitle)}`);
  expect(pageContent.includes(qaTitle)).toBe(true);

  // Find .ics link href
  const icsLink = page.locator(`a[href*="/api/calendar/"][href*="/ics"]`).first();
  expect(await icsLink.isVisible()).toBe(true);
  const icsHref = await icsLink.getAttribute('href');
  console.log(`Rendered ICS Href: ${icsHref}`);

  // Fetch ICS URL with authenticated session
  const fullIcsUrl = icsHref?.startsWith('/') ? `${BASE_URL}${icsHref}` : icsHref!;
  const response = await page.request.get(fullIcsUrl);
  console.log(`ICS HTTP Status: ${response.status()}`);
  expect(response.status()).toBe(200);

  const contentType = response.headers()['content-type'];
  console.log(`ICS Content-Type: ${contentType}`);
  expect(contentType).toContain('text/calendar');

  const contentDisposition = response.headers()['content-disposition'];
  console.log(`ICS Content-Disposition: ${contentDisposition}`);
  expect(contentDisposition).toContain('attachment');

  const icsBody = await response.text();
  console.log(`ICS Body preview: ${icsBody.substring(0, 120).replace(/\n/g, ' ')}`);
  expect(icsBody).toContain('BEGIN:VCALENDAR');
  expect(icsBody).toContain('STATUS:');

  // Cancel appointment via UI
  console.log('Cancelling appointment via UI...');
  const appointment = page.getByText(qaTitle, { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded")][1]');
  await appointment.getByRole('button', { name: /Batalkan .*|Cancel appointment/i }).click();
  const confirm = appointment.getByRole('group', { name: /Konfirmasi batalkan janji/i });
  await confirm.getByRole('button', { name: /Batalkan|Cancel booking/i }).click();
  await expect(page.getByText(/Janji temu dibatalkan|Appointment cancelled/i)).toBeVisible();

  // Verify cancelled state / disappearance in UI
  await page.reload();
  await page.waitForLoadState('networkidle');
  const reloadedContent = await page.content();
  const isCancelledOrRemoved = reloadedContent.includes('Dibatalkan') || reloadedContent.includes('Cancelled') || !reloadedContent.includes(qaTitle);
  console.log(`After cancel check: ${isCancelledOrRemoved}`);
  expect(isCancelledOrRemoved).toBe(true);

  await context.close();
});
