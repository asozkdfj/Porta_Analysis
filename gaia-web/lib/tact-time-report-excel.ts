import ExcelJS from "exceljs";
import type { TactTimeFullReport, TactTimeStationReport } from "./tact-time-report-types";

const MS_FORMAT = "0";
const TABLE_HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD9EAF7" },
};
const TOTAL_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF8FAFC" },
};
const CHECK_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFF3CD" },
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF94A3B8" } },
  left: { style: "thin", color: { argb: "FF94A3B8" } },
  bottom: { style: "thin", color: { argb: "FF94A3B8" } },
  right: { style: "thin", color: { argb: "FF94A3B8" } },
};

function applyBorder(row: ExcelJS.Row, colCount = 2) {
  for (let i = 1; i <= colCount; i++) {
    row.getCell(i).border = THIN_BORDER;
  }
}

function formatTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function cycleModeLabel(mode: TactTimeFullReport["cycleMode"]): string {
  switch (mode) {
    case "average":
      return "Average Cycle";
    case "first":
      return "First Cycle";
    case "worst":
      return "Worst Cycle";
    case "selected":
      return "Selected Cycle";
    default:
      return mode;
  }
}

function tactMs(value: number): number {
  return Math.round(value);
}

/** Station 블록: 제목 + Header|Tact 2열 테이블 */
function writeStationBlock(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  station: TactTimeStationReport
): number {
  let rowNum = startRow;

  sheet.mergeCells(rowNum, 1, rowNum, 2);
  const titleRow = sheet.getRow(rowNum);
  titleRow.getCell(1).value = `Station${station.stationId}`;
  titleRow.font = { bold: true, size: 12 };
  titleRow.alignment = { vertical: "middle" };
  rowNum++;

  if (!station.hasData) {
    const noDataRow = sheet.getRow(rowNum);
    noDataRow.getCell(1).value = "No Data";
    noDataRow.getCell(2).value = station.error ?? "";
    noDataRow.font = { italic: true, color: { argb: "FF64748B" } };
    applyBorder(noDataRow);
    return rowNum + 2;
  }

  const headerRow = sheet.getRow(rowNum);
  headerRow.getCell(1).value = "Header";
  headerRow.getCell(2).value = "Tact";
  headerRow.font = { bold: true };
  headerRow.fill = TABLE_HEADER_FILL;
  applyBorder(headerRow);
  rowNum++;

  for (const group of station.groups) {
    const dataRow = sheet.getRow(rowNum);
    dataRow.getCell(1).value = group.groupName;
    dataRow.getCell(2).value = tactMs(group.durationMs);
    dataRow.getCell(2).numFmt = MS_FORMAT;
    dataRow.getCell(2).alignment = { horizontal: "right" };
    applyBorder(dataRow);
    rowNum++;
  }

  const totalRow = sheet.getRow(rowNum);
  totalRow.getCell(1).value = "Total";
  totalRow.getCell(2).value = tactMs((station.totalSec ?? 0) * 1000);
  totalRow.getCell(2).numFmt = MS_FORMAT;
  totalRow.getCell(2).alignment = { horizontal: "right" };
  totalRow.font = { bold: true };
  totalRow.fill = TOTAL_FILL;
  applyBorder(totalRow);
  rowNum++;

  if (station.status === "CHECK") {
    const statusRow = sheet.getRow(rowNum);
    statusRow.getCell(1).value = "Remark";
    statusRow.getCell(2).value = `CHECK — ${station.remark}`;
    statusRow.font = { bold: true, color: { argb: "FF92400E" } };
    statusRow.fill = CHECK_FILL;
    applyBorder(statusRow);
    rowNum++;
  }

  return rowNum + 1;
}

function writeReportSheet(
  workbook: ExcelJS.Workbook,
  report: TactTimeFullReport
) {
  const sheet = workbook.addWorksheet("Tact Time Report");

  sheet.getCell("A1").value = "Tact Time Report";
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.getCell("A2").value = "Generated";
  sheet.getCell("B2").value = report.generatedAt.toLocaleString("ko-KR");
  sheet.getCell("A3").value = "Cycle Basis";
  sheet.getCell("B3").value = cycleModeLabel(report.cycleMode);

  let rowNum = 5;
  const stations = report.stations.filter((s) => s.hasData || s.fileName);

  for (const station of stations) {
    rowNum = writeStationBlock(sheet, rowNum, station);
  }

  sheet.getColumn(1).width = 28;
  sheet.getColumn(2).width = 12;
}

function writeStationSheet(
  workbook: ExcelJS.Workbook,
  station: TactTimeStationReport
) {
  const sheet = workbook.addWorksheet(`Station_${station.stationId}`);

  if (station.fileName) {
    sheet.getCell("A1").value = "Source";
    sheet.getCell("B1").value = station.fileName;
  }
  if (station.cycleLabel) {
    sheet.getCell("A2").value = "Cycle";
    sheet.getCell("B2").value = station.cycleLabel;
  }

  writeStationBlock(sheet, station.fileName ? 4 : 1, station);

  sheet.getColumn(1).width = 28;
  sheet.getColumn(2).width = 12;
}

export async function exportTactTimeReportExcel(
  report: TactTimeFullReport
): Promise<{ blob: Blob; fileName: string }> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GAIA";
  workbook.created = report.generatedAt;

  writeReportSheet(workbook, report);

  for (const station of report.stations) {
    if (!station.hasData && !station.fileName) continue;
    writeStationSheet(workbook, station);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const fileName = `Tact_Time_Report_${formatTimestamp(report.generatedAt)}.xlsx`;
  return { blob, fileName };
}

export function downloadTactTimeReport(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
