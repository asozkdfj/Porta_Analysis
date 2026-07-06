import {
  aggregateSocketRuns,
  computeTestResultBounds,
  type SocketRunAggregate,
} from "./grr-stats";
import type { GaiaAnalysisResult, SerialGrrResult } from "./types";

/** Repeatability Range 색상 구간 (설정값) */
export const REPEATABILITY_THRESHOLDS = {
  goodMax: 0.1,
  warnMax: 0.25,
} as const;

export type RepeatabilityTier = "good" | "medium" | "poor";

/** Socket 1개 + 모듈(Serial) 1개의 Repeatability */
export interface ModuleRepeatabilityRow {
  serial: string;
  avg: number;
  stdev: number;
  grrStdev: number | null;
  boundUp: number;
  boundDn: number;
  repeatabilityRange: number;
  tier: RepeatabilityTier;
  runCount: number;
  outOfSpec: boolean;
}

/** 동일 Socket 내 모듈(Serial)별 Repeatability 집계 */
export interface RepeatabilitySocketSummary {
  modules: ModuleRepeatabilityRow[];
  grrStdev: number | null;
  thresholds: typeof REPEATABILITY_THRESHOLDS;
}

export interface RepeatabilitySocketView {
  socket: string;
  summary: RepeatabilitySocketSummary;
}

export interface GrrRepeatabilityBySocket {
  sockets: RepeatabilitySocketView[];
  grrStdev: number | null;
  thresholds: typeof REPEATABILITY_THRESHOLDS;
}

/** @deprecated Socket 행 — ModuleRepeatabilityRow 사용 */
export interface SocketRepeatabilityRow {
  socket: string;
  avg: number;
  stdev: number;
  grrStdev: number | null;
  boundUp: number;
  boundDn: number;
  repeatabilityRange: number;
  tier: RepeatabilityTier;
  runCount: number;
  outOfSpec: boolean;
}

/** @deprecated */
export interface SocketRepeatabilitySummary {
  sockets: SocketRepeatabilityRow[];
  bestSocket: string | null;
  worstSocket: string | null;
  smallestRange: number | null;
  largestRange: number | null;
  grrStdev: number | null;
  thresholds: typeof REPEATABILITY_THRESHOLDS;
}

export function classifyRepeatabilityRange(
  range: number,
  thresholds: typeof REPEATABILITY_THRESHOLDS = REPEATABILITY_THRESHOLDS
): RepeatabilityTier {
  if (range <= thresholds.goodMax) return "good";
  if (range <= thresholds.warnMax) return "medium";
  return "poor";
}

export function repeatabilityTierColor(tier: RepeatabilityTier): string {
  if (tier === "good") return "#22c55e";
  if (tier === "medium") return "#eab308";
  return "#ef4444";
}

function isOutOfSpec(
  boundUp: number,
  boundDn: number,
  lsl: number | null,
  usl: number | null
): boolean {
  return (lsl !== null && boundDn < lsl) || (usl !== null && boundUp > usl);
}

export function moduleRepeatabilityFromAggregate(
  serial: string,
  agg: SocketRunAggregate,
  grrStdev: number | null,
  lsl: number | null = null,
  usl: number | null = null
): ModuleRepeatabilityRow {
  const { boundUp, boundDn } = computeTestResultBounds(
    agg.avg,
    agg.stdev,
    grrStdev
  );
  const repeatabilityRange = boundUp - boundDn;
  return {
    serial,
    avg: agg.avg,
    stdev: agg.stdev,
    grrStdev,
    boundUp,
    boundDn,
    repeatabilityRange,
    tier: classifyRepeatabilityRange(repeatabilityRange),
    runCount: agg.runs.length,
    outOfSpec: isOutOfSpec(boundUp, boundDn, lsl, usl),
  };
}

function finalizeSocketSummary(
  modules: ModuleRepeatabilityRow[],
  grrStdev: number | null
): RepeatabilitySocketSummary {
  return {
    modules,
    grrStdev,
    thresholds: REPEATABILITY_THRESHOLDS,
  };
}

/** GRR 분석 — Socket별 모듈(Serial) Repeatability 비교 */
export function buildRepeatabilityBySocket(
  analysis: GaiaAnalysisResult
): GrrRepeatabilityBySocket {
  const { grrStdev, lsl, usl } = analysis.spec;
  const bySocket = new Map<string, ModuleRepeatabilityRow[]>();

  for (const serial of analysis.serials) {
    const perSocket = aggregateSocketRuns(serial.socketMeans);
    for (const agg of perSocket) {
      const row = moduleRepeatabilityFromAggregate(
        serial.serial,
        agg,
        grrStdev,
        lsl,
        usl
      );
      if (!bySocket.has(agg.socket)) bySocket.set(agg.socket, []);
      bySocket.get(agg.socket)!.push(row);
    }
  }

  const sockets: RepeatabilitySocketView[] = [...bySocket.entries()]
    .map(([socket, modules]) => ({
      socket,
      summary: finalizeSocketSummary(
        modules.sort((a, b) => a.serial.localeCompare(b.serial)),
        grrStdev
      ),
    }))
    .sort((a, b) =>
      a.socket.localeCompare(b.socket, undefined, { numeric: true })
    );

  return {
    sockets,
    grrStdev,
    thresholds: REPEATABILITY_THRESHOLDS,
  };
}

export function repeatabilityErrorBarOffsets(
  avg: number,
  boundUp: number,
  boundDn: number
): [number, number] {
  return [Math.max(0, avg - boundDn), Math.max(0, boundUp - avg)];
}

/** @deprecated buildRepeatabilityBySocket 사용 */
export function buildSocketRepeatabilityForSerial(
  serial: SerialGrrResult,
  grrStdev: number | null,
  lsl: number | null = null,
  usl: number | null = null
): SocketRepeatabilitySummary {
  const perSocket = aggregateSocketRuns(serial.socketMeans);
  const sockets: SocketRepeatabilityRow[] = perSocket
    .map((s) => {
      const row = moduleRepeatabilityFromAggregate(
        serial.serial,
        s,
        grrStdev,
        lsl,
        usl
      );
      return { socket: s.socket, ...row };
    })
    .sort((a, b) =>
      a.socket.localeCompare(b.socket, undefined, { numeric: true })
    );

  let bestSocket: string | null = null;
  let worstSocket: string | null = null;
  let smallestRange: number | null = null;
  let largestRange: number | null = null;
  for (const row of sockets) {
    if (smallestRange === null || row.repeatabilityRange < smallestRange) {
      smallestRange = row.repeatabilityRange;
      bestSocket = row.socket;
    }
    if (largestRange === null || row.repeatabilityRange > largestRange) {
      largestRange = row.repeatabilityRange;
      worstSocket = row.socket;
    }
  }

  return {
    sockets,
    bestSocket,
    worstSocket,
    smallestRange,
    largestRange,
    grrStdev,
    thresholds: REPEATABILITY_THRESHOLDS,
  };
}
