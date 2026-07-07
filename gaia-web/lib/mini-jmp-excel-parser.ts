import ExcelJS from "exceljs";
import type { MiniJmpDataset } from "./mini-jmp-types";
import { buildDatasetFromMatrix } from "./mini-jmp-parser";

export async function parseMiniJmpExcel(
  buffer: ArrayBuffer,
  fileName: string
): Promise<MiniJmpDataset> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Excel 파일에 시트가 없습니다.");

  const matrix: string[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      while (cells.length < colNumber - 1) cells.push("");
      const v = cell.value;
      if (v == null) {
        cells.push("");
      } else if (typeof v === "object" && "result" in v) {
        cells.push(String(v.result ?? ""));
      } else if (v instanceof Date) {
        cells.push(v.toISOString());
      } else {
        cells.push(String(v).trim());
      }
    });
    if (cells.some((c) => c.trim())) matrix.push(cells);
  });

  if (matrix.length < 2) {
    throw new Error("Excel에 헤더와 데이터 행이 필요합니다.");
  }

  return buildDatasetFromMatrix(matrix, fileName);
}
