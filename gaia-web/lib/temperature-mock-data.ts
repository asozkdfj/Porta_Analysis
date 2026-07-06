/** Temperature Tracking 데모용 Mock CSV — 8 Barcode × 8 Socket */
function ntcHeaders(): string {
  return [
    "PROX::MOD_LIW20C_NTC_TEMP_PRE_25MA_70MA_AVG",
    "PROX::MOD_LIW50C_NTC_TEMP_PRE_25MA_70MA_AVG",
  ].join(",");
}

const SOCKETS = Array.from({ length: 8 }, (_, i) => `AiO_G_${String(i + 1).padStart(2, "0")}`);
const BARCODES = Array.from({ length: 8 }, (_, i) => `BC24060100${i + 1}`);

function stableTemp(base: number): string {
  return (base + (Math.random() - 0.5) * 0.4).toFixed(2);
}

function driftTemp(start: number, step: number, seq: number): string {
  return (start + step * seq).toFixed(2);
}

export function buildTemperatureMockCsv(): string {
  const headers = [
    "SerialNumber",
    "Test Pass/Fail Status",
    "TesterID",
    "StartTime",
    ntcHeaders(),
  ].join(",");

  const upper = ["", "NA", "NA", "NA", "23", "53"].join(",");
  const lower = ["", "NA", "NA", "NA", "17", "47"].join(",");
  const units = ["", "NA", "NA", "NA", "°C", "°C"].join(",");

  const rows: string[] = [];

  for (const barcode of BARCODES) {
    for (const socket of SOCKETS) {
      for (let i = 0; i < 3; i++) {
        const socketNum = Number(socket.replace(/\D/g, ""));
        const bcNum = Number(barcode.slice(-1));
        const t20 =
          bcNum === 8
            ? driftTemp(20, 0.4, i)
            : stableTemp(20 + socketNum * 0.05 + bcNum * 0.02);
        const t50 =
          bcNum === 7
            ? driftTemp(49, 0.6, i)
            : stableTemp(49 + socketNum * 0.08);
        rows.push(
          `${barcode},PASS,${socket},2026-03-08 ${String(socketNum).padStart(2, "0")}:${i}0:00,${t20},${t50}`
        );
      }
    }
  }

  return [headers, upper, lower, units, ...rows].join("\n");
}
