/** Error Analysis Mock CSV — 64 Socket × 다양한 Fail 패턴 + Station2/8 UPH */

const ERRORS = [
  "LIW20C_PO_48MA",
  "WL_CENTER",
  "SMU_IDD",
  "LEAKAGE",
  "NTC_TEMP_PRE_25MA",
  "BC4MM_RANGE",
  "LIW50C_NTC_TEMP",
  "SMU_CONT",
  "LIW20C_WL_FIT_20C",
  "CAPDETECT",
  "FFBP_TEST_ITEM",
  "PB2_1200NM",
];

const STAGES = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

function socketId(stage: string, num: number): string {
  return `${stage}${String(num).padStart(2, "0")}`;
}

function testerId(stage: string, num: number): string {
  return `AiO_${stage}_${String(num).padStart(2, "0")}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateTime(baseHour: number, totalMin: number, sec: number): string {
  const h = baseHour + Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `2026-03-08 ${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
}

function csvRow(cols: (string | number)[]): string {
  return cols.join(",");
}

function buildRows(): string[] {
  const lines: string[] = [];
  let run = 0;
  let minuteOffset = 0;

  for (let cycle = 0; cycle < 20; cycle++) {
    for (const stage of STAGES) {
      for (let num = 1; num <= 8; num++) {
        run += 1;
        const barcode = `SN${String(run).padStart(4, "0")}`;
        const socket = testerId(stage, num);
        const sid = socketId(stage, num);

        let status = "PASS";
        let failing = "";
        let errStr = "";

        const isHotspot = sid === "D01" || sid === "A08" || sid === "B05";
        const isWarm = num === 1 || num === 8;

        if (isHotspot && cycle % 2 === 0) {
          status = "FAIL";
          if (sid === "D01") {
            failing = "LIW20C_PO_48MA;WL_CENTER;SMU_IDD";
            errStr = "LIW20C_PO_48MA";
          } else if (sid === "A08") {
            failing = "WL_CENTER;NTC_TEMP_PRE_25MA";
            errStr = "WL_CENTER";
          } else {
            failing = "SMU_IDD;LEAKAGE";
            errStr = "SMU_IDD";
          }
        } else if (sid === "C03" && cycle % 4 === 0) {
          status = "FAIL";
          failing = "CONT2_VDD;CONT2_SCL;CONT2_SDA";
          errStr = "CONT2_VDD";
        } else if (sid === "E02" && cycle % 5 === 0) {
          status = "FAIL";
          failing = "CONT2_INTB;CONT2_CKIN";
          errStr = "CONT2_INTB";
        } else if (isWarm && cycle % 3 === 1) {
          status = "FAIL";
          failing = ERRORS[(run + cycle) % ERRORS.length]!;
          errStr = failing.split(";")[0]!;
        } else if (run % 17 === 0) {
          status = "FAIL";
          failing = "BC4MM_RANGE";
          errStr = "BC4MM_RANGE";
        }

        let testTime = 142 + (run % 9) * 0.8 + (cycle % 4) * 0.5;
        if (status === "FAIL") {
          testTime += 8 + (run % 6) * 1.2;
        }
        if (run % 29 === 0 && status === "PASS") {
          testTime += 32;
        }
        if (run % 41 === 0) {
          testTime += 25;
        }
        const testTimeStr = (Math.round(testTime * 10) / 10).toFixed(1);

        const startSec = (run * 7) % 60;
        const startTime = formatDateTime(8, minuteOffset, startSec);
        const endSec = Math.min(59, startSec + Math.round(testTime) % 60);
        const endMinuteOffset =
          minuteOffset + Math.floor((startSec + testTime) / 60);
        const endTime = formatDateTime(8, endMinuteOffset, endSec % 60);
        minuteOffset += 1;

        lines.push(
          csvRow([
            barcode,
            "PASS",
            "",
            "",
            socket,
            "P2-L3",
            startTime,
            startTime,
            "",
            "",
            "",
            stage,
            2,
          ])
        );

        lines.push(
          csvRow([
            barcode,
            status,
            status === "FAIL" ? "41218" : "",
            errStr,
            socket,
            "P2-L3",
            endTime,
            startTime,
            endTime,
            testTimeStr,
            failing,
            stage,
            8,
          ])
        );
      }
    }
  }

  return lines;
}

export const ERROR_ANALYSIS_MOCK_CSV = `SerialNumber,Test Pass/Fail Status,errCode,errStr,TesterID,config,timeStamp,StartTime,EndTime,TestTime,Failing Items,PROX::MOD_INIT_STAGE,Station
,NA,NA,NA,NA,NA,NA,NA,NA,NA,NA,NA,NA
,NA,NA,NA,NA,NA,NA,NA,NA,NA,NA,NA,NA
,NA,NA,NA,NA,NA,NA,NA,NA,NA,NA,NA,NA
${buildRows().join("\n")}
`;
