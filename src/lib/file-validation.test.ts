import { describe, it, expect } from "vitest";
import { validateUploadedFile } from "./file-validation";

const bytes = (arr: number[]) => new Uint8Array(arr);

describe("validateUploadedFile", () => {
  it("accepts a real PNG", () => {
    const png = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(validateUploadedFile("logo.png", png).ok).toBe(true);
  });

  it("accepts a real PDF", () => {
    const pdf = bytes([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
    expect(validateUploadedFile("doc.pdf", pdf).ok).toBe(true);
  });

  it("accepts a docx (zip container)", () => {
    const zip = bytes([0x50, 0x4b, 0x03, 0x04, 0, 0]);
    expect(validateUploadedFile("report.docx", zip).ok).toBe(true);
  });

  it("rejects .html even with html bytes", () => {
    const html = bytes([0x3c, 0x21, 0x44, 0x4f, 0x43]); // <!DOC
    const r = validateUploadedFile("evil.html", html);
    expect(r.ok).toBe(false);
  });

  it("rejects .svg (active content)", () => {
    const svg = bytes([0x3c, 0x73, 0x76, 0x67]); // <svg
    expect(validateUploadedFile("x.svg", svg).ok).toBe(false);
  });

  it("rejects a PNG extension with fake bytes (magic mismatch)", () => {
    const fake = bytes([0x3c, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74]); // <script
    const r = validateUploadedFile("payload.png", fake);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/tidak cocok/i);
  });

  it("rejects unknown extension", () => {
    expect(validateUploadedFile("malware.exe", bytes([0x4d, 0x5a])).ok).toBe(false);
  });

  it("rejects a file with no extension", () => {
    expect(validateUploadedFile("noext", bytes([0x89, 0x50])).ok).toBe(false);
  });

  it("accepts text-like csv without strict signature", () => {
    expect(validateUploadedFile("data.csv", bytes([0x61, 0x2c, 0x62])).ok).toBe(true);
  });
});
