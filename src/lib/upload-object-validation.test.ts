import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { validateUploadObjectStream } from "./upload-object-validation";

async function* chunks(...values: Uint8Array[]) { for (const value of values) yield value; }

const pdf = Buffer.from("%PDF-1.7\nhello");

describe("streamed upload object validation", () => {
  it("derives SHA-256 and validates signature across chunk boundaries", async () => {
    const result = await validateUploadObjectStream(chunks(pdf.subarray(0, 2), pdf.subarray(2)), { expectedBytes: pdf.length, maxBytes: pdf.length, expectedMime: "application/pdf" });
    expect(result.sha256).toBe(createHash("sha256").update(pdf).digest("hex"));
    expect(result.bytes).toBe(pdf.length);
    expect(result.magic).toBe("pdf");
  });

  it("rejects oversize, size mismatch, checksum mismatch, and MIME spoofing", async () => {
    await expect(validateUploadObjectStream(chunks(pdf), { expectedBytes: pdf.length, maxBytes: pdf.length - 1, expectedMime: "application/pdf" })).rejects.toThrow("OBJECT_TOO_LARGE");
    await expect(validateUploadObjectStream(chunks(pdf), { expectedBytes: pdf.length + 1, maxBytes: pdf.length + 1, expectedMime: "application/pdf" })).rejects.toThrow("OBJECT_SIZE_MISMATCH");
    await expect(validateUploadObjectStream(chunks(pdf), { expectedBytes: pdf.length, maxBytes: pdf.length, expectedMime: "application/pdf", expectedSha256: "0".repeat(64) })).rejects.toThrow("OBJECT_CHECKSUM_MISMATCH");
    await expect(validateUploadObjectStream(chunks(pdf), { expectedBytes: pdf.length, maxBytes: pdf.length, expectedMime: "image/png" })).rejects.toThrow("OBJECT_MIME_MISMATCH");
  });

  it("accepts PNG, JPEG, and WebP signatures", async () => {
    const fixtures = [
      ["image/png", Buffer.from("89504e470d0a1a0a00000000", "hex")],
      ["image/jpeg", Buffer.from("ffd8ffe00000000000000000", "hex")],
      ["image/webp", Buffer.from("524946460000000057454250", "hex")],
    ] as const;
    for (const [mime, body] of fixtures) await expect(validateUploadObjectStream(chunks(body), { expectedBytes: body.length, maxBytes: body.length, expectedMime: mime })).resolves.toMatchObject({ bytes: body.length });
  });
});
