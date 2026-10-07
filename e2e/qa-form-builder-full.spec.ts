import { test, expect } from "@playwright/test";

test.use({
  baseURL: "https://dev.cubiqlo.com",
  storageState: ".auth/user.json",
  viewport: { width: 1440, height: 900 },
});

test("Full Form Builder Browser Flow with all features", async ({ page, context }) => {
  const formTitle = `E2E Form QA ${Date.now()}`;

  console.log("1. Buka halaman pembuatan form baru...");
  await page.goto("/app/questionnaires/new", { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: /Simpan|Save/i })).toBeVisible({ timeout: 15000 });

  // Ubah judul form
  console.log("2. Set judul form...");
  const titleInput = page.locator('header input[type="text"]');
  await titleInput.fill(formTitle);

  // Verifikasi hanya 3 tab (BUILD, SETTINGS, PUBLISH) tanpa Condition Logic
  console.log("3. Verifikasi Tab Builder...");
  await expect(page.getByRole("button", { name: "BUILD" })).toBeVisible();
  await expect(page.getByRole("button", { name: "SETTINGS" })).toBeVisible();
  await expect(page.getByRole("button", { name: "PUBLISH" })).toBeVisible();
  await expect(page.getByText("Condition Logic")).toHaveCount(0);

  // Klik salah satu field untuk styling
  console.log("4. Tes styling teks & typography di Properti...");
  const firstFieldCard = page.locator('[data-rbd-draggable-id], [class*="rounded-xl border"]').filter({ hasText: /Nama Lengkap/i }).first();
  await firstFieldCard.click();

  // Ubah font, format bold & italic
  const fontSelect = page.locator('select, [role="combobox"]').filter({ hasText: /Inter|Plus Jakarta|Default/i }).first();
  if (await fontSelect.isVisible()) {
    await fontSelect.click();
    const plusJakartaOption = page.getByRole("option", { name: /Plus Jakarta Sans/i });
    if (await plusJakartaOption.isVisible()) {
      await plusJakartaOption.click();
    }
  }

  // Klik tombol Bold (B) dan Italic (I)
  const boldBtn = page.getByRole("button", { name: "B", exact: true });
  if (await boldBtn.isVisible()) {
    await boldBtn.click();
  }

  // Tambahkan Elemen Baru: Single / Multiple Choice
  console.log("5. Tambah Single Choice / Multiple Choice dan tes Options Manager...");
  // Buka drawer elemen jika belum buka
  const addElemBtn = page.getByRole("button", { name: /Elemen|Elements/i });
  if (await addElemBtn.isVisible()) {
    await addElemBtn.click();
  }

  // Tambah Pilihan Ganda (select / multiselect)
  const selectCatalogItem = page.getByText(/Pilihan Ganda|Dropdown|Multiple Choice/i).first();
  if (await selectCatalogItem.isVisible()) {
    await selectCatalogItem.click();
  }

  // Tambah File Upload
  const fileCatalogItem = page.getByText(/Upload File|File/i).first();
  if (await fileCatalogItem.isVisible()) {
    await fileCatalogItem.click();
  }

  // Pindah ke tab SETTINGS untuk set Expiry & Max Responses & Require All
  console.log("6. Buka tab SETTINGS dan atur limit auto-close & Require All...");
  await page.getByRole("button", { name: "SETTINGS" }).click();

  // Set Max Responses
  const maxRespInput = page.getByPlaceholder(/Misal: 50|e\.g\., 50/i);
  if (await maxRespInput.isVisible()) {
    await maxRespInput.fill("100");
  }

  // Toggle Require All
  const requireAllCheckbox = page.locator('button[role="checkbox"], input[type="checkbox"]').first();
  if (await requireAllCheckbox.isVisible()) {
    await requireAllCheckbox.click();
  }

  // Simpan Form
  console.log("7. Simpan formulir via tombol Simpan di atas...");
  const saveBtn = page.getByRole("button", { name: /Simpan|Save/i }).first();
  await saveBtn.click();

  // Tunggu redirect ke halaman form detail / edit
  await page.waitForURL(/\/app\/questionnaires\/[a-zA-Z0-9-]+/, { timeout: 15000 });
  console.log("Form tersimpan! URL baru:", page.url());

  // Buka tab PUBLISH dan ambil Direct Public Link
  console.log("8. Buka tab PUBLISH dan salin link form publik...");
  await page.getByRole("button", { name: "PUBLISH" }).click();

  const shareInput = page.locator('input[readonly]').first();
  await expect(shareInput).toBeVisible();
  const publicUrl = await shareInput.inputValue();
  console.log("Public Intake URL:", publicUrl);

  // Buka Form Publik di Incognito / Browser Page Baru
  console.log("9. Menguji Form Publik di browser baru (Intake Public Page)...");
  const publicPage = await context.newPage();
  await publicPage.goto(publicUrl, { waitUntil: "networkidle" });

  await expect(publicPage.getByRole("heading", { name: formTitle })).toBeVisible({ timeout: 10000 });
  console.log("Halaman intake publik berhasil dimuat dengan judul form!");

  // Tes Validasi Required Field (tekan submit saat kosong)
  console.log("10. Tes validasi required field saat submit kosong...");
  const submitBtn = publicPage.getByRole("button", { name: /Kirim Tanggapan|Submit Response|Kirim/i });
  await submitBtn.click();

  // Verifikasi muncul toast validasi
  await expect(publicPage.locator('[data-sonner-toast], .toast, [role="status"]').first()).toBeVisible({ timeout: 5000 });
  console.log("Toast validasi wajib isi berhasil muncul!");

  // Isi data lengkap
  console.log("11. Mengisi form dan upload file...");
  const textInputs = publicPage.locator('input[type="text"], input[type="email"], input[type="tel"]');
  const count = await textInputs.count();
  for (let i = 0; i < count; i++) {
    const input = textInputs.nth(i);
    const type = await input.getAttribute("type");
    if (type === "email") {
      await input.fill("qa-tester@cubiqlo.com");
    } else if (type === "tel") {
      await input.fill("081234567890");
    } else {
      await input.fill("Budi Santoso QA");
    }
  }

  // Upload file native
  const fileInput = publicPage.locator('input[type="file"]').first();
  if (await fileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await fileInput.setInputFiles({
      name: "proposal-test-doc.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Dokumen QA Form Builder Cubiqlo Native Upload"),
    });
    console.log("File diupload ke form publik!");
    await publicPage.waitForTimeout(2000); // tunggu upload selesai
  }

  // Kirim respon form
  console.log("12. Kirim formulir lengkap...");
  await submitBtn.click();

  // Verifikasi sukses submit
  await expect(publicPage.getByText(/Terima kasih|Tanggapan Anda telah kami terima|Response submitted/i)).toBeVisible({ timeout: 15000 });
  console.log("Tanggapan form berhasil terkirim dan tersimpan!");

  await page.screenshot({ path: "/tmp/qa_form_builder_success.png" });
  await publicPage.screenshot({ path: "/tmp/qa_public_intake_success.png" });
  await publicPage.close();
});
