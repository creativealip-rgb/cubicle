import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/app/(app)/app/clients/page.tsx", "utf8");
const dialog = readFileSync("src/components/clients/client-create-dialog.tsx", "utf8");

 describe("client create dialog wiring", () => {
  it("opens client creation from the list without navigating away", () => {
    expect(page).toContain("<ClientCreateDialog");
    expect(page).not.toContain('<Link href="/app/clients/new">');
  });

  it("uses the shared client form and closes after success", () => {
    expect(dialog).toContain('<ClientForm mode="create" onSuccess={() => setOpen(false)} />');
    expect(dialog).toContain("DialogContent");
    expect(dialog).toContain("Tambah Klien");
  });
});
