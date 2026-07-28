import { describe, expect, it } from "vitest";
import fs from "node:fs"; import path from "node:path";
const read=(p:string)=>fs.readFileSync(path.join(process.cwd(),p),"utf8");
describe("MH3 UI/export wiring",()=>{
 it("renders project task member reporting",()=>{const page=read("src/app/(app)/app/reports/page.tsx");expect(page).toContain("buildTimeReport");expect(page).toContain("Kinerja Waktu");expect(page).toContain("Per Proyek");expect(page).toContain("Per Tugas");expect(page).toContain("Per Anggota");});
 it("adds time tracking XLSX worksheet",()=>{const route=read("src/app/api/reports/export/xlsx/route.ts");expect(route).toContain('"Time Tracking"');expect(route).toContain("buildTimeReport");});
});
