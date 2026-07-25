import { describe, expect, it } from "vitest";
import * as ExcelJS from "exceljs";
import { styleWorksheet, XLSX_MIME, xlsxResponse } from "./excel";

describe("Excel export helpers", () => {
  it("applies spreadsheet usability styles", () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Data");
    sheet.columns = [
      { header: "Nama", key: "name" },
      { header: "Total", key: "total" },
    ];
    sheet.addRow({ name: "Contoh", total: 1000 });
    styleWorksheet(sheet, [24, 18]);

    expect(sheet.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    expect(sheet.autoFilter).toEqual({
      from: { row: 1, column: 1 },
      to: { row: 1, column: 2 },
    });
    expect(sheet.getRow(1).font?.bold).toBe(true);
    expect(sheet.getColumn(1).width).toBe(24);
  });

  it("returns official XLSX headers and binary data", async () => {
    const response = xlsxResponse(Buffer.from("PK-test"), "laporan.xlsx");
    expect(response.headers.get("content-type")).toBe(XLSX_MIME);
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="laporan.xlsx"',
    );
    expect(Buffer.from(await response.arrayBuffer()).subarray(0, 2).toString()).toBe("PK");
  });
});
