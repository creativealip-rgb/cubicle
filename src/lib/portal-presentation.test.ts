import { describe, expect, it } from "vitest";
import {
  cleanPortalRequestDescription,
  partitionPortalRequests,
  projectProgressLabel,
} from "./portal-presentation";

describe("portal presentation", () => {
  it("hides client-origin metadata but keeps the client message", () => {
    expect(
      cleanPortalRequestDescription(
        "[CLIENT_ORIGIN meeting]\nPreferred date: 2026-07-23\nMohon sore hari",
      ),
    ).toBe("Tanggal pilihan: 23 Jul 2026\nMohon sore hari");
  });

  it("puts open requests before closed history", () => {
    const rows = [
      { id: "done", status: "completed" },
      { id: "open", status: "pending" },
    ];
    expect(partitionPortalRequests(rows)).toEqual({
      open: [rows[1]],
      history: [rows[0]],
    });
  });

  it("explains a fully completed active project", () => {
    expect(projectProgressLabel("active", 2, 2)).toBe(
      "Semua tugas selesai · menunggu penutupan",
    );
  });
});
