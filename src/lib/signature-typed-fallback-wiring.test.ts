import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const source=readFileSync("src/components/contracts/signature-pad.tsx","utf8");
describe("typed signature fallback",()=>{
 it("offers draw and type modes",()=>{expect(source).toContain('signatureMode');expect(source).toContain('t("Ketik Nama", "Type Name")');expect(source).toContain('t("Gambar Tanda Tangan", "Draw Signature")');});
 it("renders typed name into validated PNG payload",()=>{expect(source).toContain('typedSignatureDataUrl');expect(source).toContain('canvas.toDataURL("image/png")');});
});
