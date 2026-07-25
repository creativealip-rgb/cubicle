import { describe, expect, it } from "vitest";
import {
  checkUploadQuota,
  getUploadQuotaLimits,
  validateContentLength,
  validateSignatureDataUrl,
  persistUploadedObject,
} from "@/lib/upload-safety";

describe("upload quota policy", () => {
  it("removes uploaded object when database persistence fails", async () => {
    const cleaned: string[] = [];
    await expect(persistUploadedObject({
      storageKey: "workspace/orphan.png",
      persist: async () => { throw new Error("simulated database failure"); },
      cleanup: async (key) => { cleaned.push(key); },
    })).rejects.toThrow("simulated database failure");
    expect(cleaned).toEqual(["workspace/orphan.png"]);
  });

  it("uses plan-specific file and aggregate limits", () => {
    expect(getUploadQuotaLimits("free")).toEqual({
      maxFileBytes: 5 * 1024 * 1024,
      maxWorkspaceBytes: 100 * 1024 * 1024,
      maxWorkspaceFiles: 100,
      maxClientBytes: 0,
      maxClientFiles: 0,
    });
    expect(getUploadQuotaLimits("solo").maxWorkspaceBytes).toBe(5 * 1024 * 1024 * 1024);
    expect(getUploadQuotaLimits("team").maxFileBytes).toBe(50 * 1024 * 1024);
  });

  it("rejects before storage when workspace byte quota would be exceeded", () => {
    const result = checkUploadQuota({
      incomingBytes: 10,
      workspaceBytes: 95,
      workspaceFiles: 2,
      clientBytes: 0,
      clientFiles: 0,
      limits: {
        maxFileBytes: 50,
        maxWorkspaceBytes: 100,
        maxWorkspaceFiles: 10,
        maxClientBytes: 0,
        maxClientFiles: 0,
      },
    });
    expect(result).toEqual({ allowed: false, code: "WORKSPACE_BYTES_LIMIT" });
  });

  it("rejects client subquota independently", () => {
    const result = checkUploadQuota({
      incomingBytes: 10,
      workspaceBytes: 20,
      workspaceFiles: 2,
      clientBytes: 45,
      clientFiles: 2,
      limits: {
        maxFileBytes: 50,
        maxWorkspaceBytes: 100,
        maxWorkspaceFiles: 10,
        maxClientBytes: 50,
        maxClientFiles: 5,
      },
    });
    expect(result).toEqual({ allowed: false, code: "CLIENT_BYTES_LIMIT" });
  });

  it("rejects oversized content-length before multipart parsing", () => {
    expect(validateContentLength(String(6 * 1024 * 1024), 5 * 1024 * 1024)).toBe(false);
    expect(validateContentLength(null, 5 * 1024 * 1024)).toBe(true);
  });
});

describe("contract signature payload", () => {
  it("accepts a small PNG signature", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString("base64");
    expect(validateSignatureDataUrl(`data:image/png;base64,${png}`)).toEqual({ ok: true });
  });

  it("rejects unsupported image subtype", () => {
    expect(validateSignatureDataUrl("data:image/svg+xml;base64,PHN2Zz4=")).toEqual({
      ok: false,
      reason: "Signature format must be PNG, JPEG, or WebP",
    });
  });

  it("rejects spoofed and oversized decoded payloads", () => {
    const fake = Buffer.from("not a png").toString("base64");
    expect(validateSignatureDataUrl(`data:image/png;base64,${fake}`).ok).toBe(false);
    const oversized = Buffer.alloc(512 * 1024 + 1).toString("base64");
    expect(validateSignatureDataUrl(`data:image/png;base64,${oversized}`)).toEqual({
      ok: false,
      reason: "Signature image must be under 512KB",
    });
  });
});
