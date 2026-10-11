import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/portal/portal-request-admin.tsx", "utf8");

describe("meeting admin dialogs", () => {
  it("does not use browser prompts", () => {
    expect(source).not.toContain("window.prompt");
  });

  it("renders a structured reschedule dialog", () => {
    expect(source).toContain('t("Usulkan Jadwal Baru", "Propose New Schedule")');
    expect(source).toContain('type="date"');
    expect(source).toContain('type="time"');
    expect(source).toContain('t("Kirim usulan jadwal", "Send schedule proposal")');
    expect(source).toContain('t("Catatan untuk klien", "Note for client")');
  });

  it("renders a rejection reason dialog", () => {
    expect(source).toContain('t("Tolak Permintaan Pertemuan", "Reject Meeting Request")');
    expect(source).toContain('t("Alasan penolakan", "Rejection reason")');
  });
});
