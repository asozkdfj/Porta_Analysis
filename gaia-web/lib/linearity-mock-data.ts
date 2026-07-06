/** LIW GRR 분석 데모용 Mock CSV — 8 모듈 × PO + NTC + WL_CENTER */

import { GRR_MODULE_COUNT } from "./liw-grr-config";

const PO_STEP_INDICES = Array.from({ length: 37 }, (_, i) => i * 2.5);
const MOCK_BARCODES = Array.from(
  { length: GRR_MODULE_COUNT },
  (_, i) => `BC24060100${i + 1}`
);
const MOCK_SOCKETS = Array.from(
  { length: GRR_MODULE_COUNT },
  (_, i) => `AiO_G_${String(i + 1).padStart(2, "0")}`
);

function poMaSuffix(index: number): string {
  const whole = Math.floor(index);
  const frac = Math.round((index - whole) * 10);
  return `${whole}P${frac}MA`;
}

function buildPoHeaders(branch: "20C" | "50C"): string {
  return Array.from({ length: 91 }, (_, i) => `PROX::MOD_LIW${branch}_PO_${i}`).join(",");
}

function buildIndexedNtcHeaders(branch: "20C" | "50C"): string {
  return PO_STEP_INDICES.map(
    (idx) => `PROX::MOD_LIW${branch}_NTC_TEMP_PRE_${poMaSuffix(idx)}`
  ).join(",");
}

function buildIndexedWlCenterHeaders(branch: "20C" | "50C"): string {
  return PO_STEP_INDICES.map(
    (idx) => `PROX::MOD_LIW${branch}_WL_CENTER_${poMaSuffix(idx)}`
  ).join(",");
}

function ntcHeader(branch: "20C" | "50C"): string {
  return `PROX::MOD_LIW${branch}_NTC_TEMP_PRE_25MA_70MA_AVG`;
}

function buildPoValues(base: number, slope: number, noise: number): string {
  return Array.from({ length: 91 }, (_, i) => {
    const v = base + slope * i + (Math.random() - 0.5) * noise;
    return v.toFixed(4);
  }).join(",");
}

function buildNtcStepValues(baseTemp: number, drift: number, noise: number): string {
  return PO_STEP_INDICES.map((idx) => {
    const v = baseTemp + drift * (idx / 90) + (Math.random() - 0.5) * noise;
    return v.toFixed(2);
  }).join(",");
}

function buildWlCenterStepValues(
  base: number,
  drift: number,
  noise: number,
  spikeAt?: number
): string {
  return PO_STEP_INDICES.map((idx, pointIndex) => {
    if (pointIndex < 11) return "1130.0000";
    let v = base + drift * (idx / 90) + (Math.random() - 0.5) * noise;
    if (spikeAt === pointIndex) v = 1145;
    return v.toFixed(4);
  }).join(",");
}

export function buildLinearityMockCsv(): string {
  const po20 = buildPoHeaders("20C");
  const po50 = buildPoHeaders("50C");
  const ntcStep20 = buildIndexedNtcHeaders("20C");
  const ntcStep50 = buildIndexedNtcHeaders("50C");
  const wlStep20 = buildIndexedWlCenterHeaders("20C");
  const wlStep50 = buildIndexedWlCenterHeaders("50C");
  const ntc20 = ntcHeader("20C");
  const ntc50 = ntcHeader("50C");

  const headers = [
    "SerialNumber",
    "Test Pass/Fail Status",
    "TesterID",
    "StartTime",
    po20,
    po50,
    ntcStep20,
    ntcStep50,
    wlStep20,
    wlStep50,
    ntc20,
    ntc50,
    "PROX::MOD_LIW20C_PO_48MA",
    "PROX::MOD_LIW20C_PO_22MW",
    "PROX::MOD_LIW50C_PO_48MA",
    "PROX::MOD_LIW50C_PO_22MW",
  ].join(",");

  const metricCols =
    91 * 2 + PO_STEP_INDICES.length * 4 + 2 + 4;
  const upper = ["", "NA", "NA", "NA", ...Array(metricCols).fill("")].join(",");
  const lower = ["", "NA", "NA", "NA", ...Array(metricCols).fill("")].join(",");
  const units = [
    "",
    "NA",
    "NA",
    "NA",
    ...Array(91).fill("mW"),
    ...Array(91).fill("mW"),
    ...Array(PO_STEP_INDICES.length).fill("°C"),
    ...Array(PO_STEP_INDICES.length).fill("°C"),
    ...Array(PO_STEP_INDICES.length).fill("nm"),
    ...Array(PO_STEP_INDICES.length).fill("nm"),
    "°C",
    "°C",
    "mW",
    "mW",
    "mW",
    "mW",
  ].join(",");

  const rows = MOCK_BARCODES.map((barcode, i) => {
    const socket = MOCK_SOCKETS[i];
    const poBase = 10 + i * 0.05;
    const ntc20Base = 20 + i * 0.1;
    const ntc50Base = 49.5 + i * 0.15;
    const wlBase = 1132 + i * 0.1;
    const hour = String(10 + Math.floor(i / 4)).padStart(2, "0");
    const min = String((i % 4) * 10).padStart(2, "0");
    const wlSpike = i === 7 ? 30 : undefined;
    const po48_20 = (18 + i * 0.05).toFixed(4);
    const po22_20 = (22.0 + i * 0.01).toFixed(4);
    const po48_50 = (18.5 + i * 0.05).toFixed(4);
    const po22_50 = (22.0 + i * 0.01).toFixed(4);
    return `${barcode},PASS,${socket},2026-03-08 ${hour}:${min}:00,${buildPoValues(poBase, 0.55, 0.3)},${buildPoValues(poBase + 2, 0.52, 0.3)},${buildNtcStepValues(ntc20Base, 0.4, 0.15)},${buildNtcStepValues(ntc50Base, 0.6, 0.2)},${buildWlCenterStepValues(wlBase, 0.05, 0.02, wlSpike)},${buildWlCenterStepValues(wlBase + 5, 0.06, 0.02)},${(ntc20Base + 0.1).toFixed(1)},${(ntc50Base + 0.3).toFixed(1)},${po48_20},${po22_20},${po48_50},${po22_50}`;
  });

  return [headers, upper, lower, units, ...rows].join("\n");
}
