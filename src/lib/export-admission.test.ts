import { describe, expect, it, vi } from "vitest";
import { withExportAdmission, type ExportAdmissionBackend } from "./export-admission";

describe("heavy export admission", () => {
  it("releases exact fencing token after success and failure", async () => {
    const backend: ExportAdmissionBackend = { acquire: vi.fn().mockResolvedValue({ ok: true, token: "lease" }), renew: vi.fn(), release: vi.fn().mockResolvedValue(true) };
    await expect(withExportAdmission({ userId: "u", workspaceId: "w", endpoint: "report-xlsx", backend }, async () => "ok")).resolves.toBe("ok");
    await expect(withExportAdmission({ userId: "u", workspaceId: "w", endpoint: "report-xlsx", backend }, async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    expect(backend.release).toHaveBeenCalledTimes(2);
    expect(backend.release).toHaveBeenCalledWith("lease");
  });

  it("maps user/workspace pressure to 429 and instance pressure to 503", async () => {
    for (const [dimension, status] of [["user", 429], ["workspace", 429], ["instance", 503]] as const) {
      const backend: ExportAdmissionBackend = { acquire: vi.fn().mockResolvedValue({ ok: false, dimension, retryAfterSec: 30 }), renew: vi.fn(), release: vi.fn() };
      const response = await withExportAdmission({ userId: "u", workspaceId: "w", endpoint: "x", backend }, async () => new Response());
      expect(response).toBeInstanceOf(Response);
      expect((response as Response).status).toBe(status);
    }
  });

  it("aborts timed-out work and releases its lease", async () => {
    const backend: ExportAdmissionBackend = { acquire: vi.fn().mockResolvedValue({ ok: true, token: "timeout-lease" }), renew: vi.fn(), release: vi.fn().mockResolvedValue(true) };
    let aborted = false;
    const result = await withExportAdmission({ userId: "u", workspaceId: "w", endpoint: "x", backend, timeoutMs: 5 }, async (signal) => {
      await new Promise<void>((resolve) => signal.addEventListener("abort", () => { aborted = true; resolve(); }, { once: true }));
      return "late";
    });
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(504);
    expect(aborted).toBe(true);
    expect(backend.release).toHaveBeenCalledWith("timeout-lease");
  });
});
