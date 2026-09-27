import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/db";
import { files, uploadIntents, workspaceMembers } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getSignedDownloadUrl } from "@/lib/r2";
import { and, eq } from "drizzle-orm";
import * as ExcelJS from "exceljs";
import { canAccessFile } from "../download/route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;

  const [file] = await db
    .select()
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);

  if (!file || file.uploadState !== "completed") {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const token = request.nextUrl.searchParams.get("token");
  const allowed = await canAccessFile(file, token);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Generate signed temporary URL for direct streaming/preview
  const downloadUrl = await getSignedDownloadUrl(file.storageKey, 3600, file.name);

  // If text / json / markdown / csv, fetch content directly for instant inline rendering
  const isText =
    file.mimeType?.startsWith("text/") ||
    file.name.endsWith(".txt") ||
    file.name.endsWith(".json") ||
    file.name.endsWith(".md") ||
    file.name.endsWith(".csv") ||
    file.name.endsWith(".srt") ||
    file.name.endsWith(".vtt");

  const isExcel =
    file.mimeType?.includes("spreadsheet") ||
    file.mimeType?.includes("excel") ||
    file.name.endsWith(".xlsx") ||
    file.name.endsWith(".xls");

  let textContent: string | null = null;
  let excelData: Array<{ sheetName: string; rows: Array<Array<string | number | boolean | null>> }> | null = null;

  const size = file.sizeBytes ?? 0;
  if (isText && size < 2 * 1024 * 1024) {
    // Under 2MB text
    try {
      const res = await fetch(downloadUrl);
      if (res.ok) {
        textContent = await res.text();
      }
    } catch {
      // ignore
    }
  } else if (isExcel && size < 10 * 1024 * 1024) {
    // Parse Excel sheet rows using ExcelJS
    try {
      const res = await fetch(downloadUrl);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);

        excelData = workbook.worksheets.map((sheet) => {
          const rows: Array<Array<string | number | boolean | null>> = [];
          sheet.eachRow((row) => {
            const rowValues = (row.values as any[]) || [];
            // row.values is 1-indexed in ExcelJS, slice(1)
            rows.push(rowValues.slice(1).map((val) => (val === null || val === undefined ? "" : typeof val === "object" && val.text ? val.text : String(val))));
          });
          return {
            sheetName: sheet.name,
            rows,
          };
        });
      }
    } catch {
      // ignore
    }
  }

  return NextResponse.json({
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    downloadUrl,
    textContent,
    excelData,
  });
}
