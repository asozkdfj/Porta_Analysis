import { getMetricValue } from "./csv-parser";
import {
  annotateRunSequences,
  buildTestRunIdentity,
} from "./test-run";
import {
  getAxisDomain,
  getSpecForJudgment,
  isFullAxisSpec,
  hasAnySpecLimit,
  resolveGrrConfigSpec,
  type GaiaSpecStore,
} from "./gaia-spec-config";
import { computeChartDomainFromValues } from "./chart-domain";
import { socketsMatch } from "./golden-socket-config";
import { applySerialGrrJudgments } from "./gaia-stat2-grr-summary";
import {
  aggregateSocketRuns,
  computePseudoGolden,
  computeSocketRangeBounds,
  grrMean,
  grrSampleStdev,
} from "./grr-stats";
import { computeGroupGrrStats, grrLimitToPercentFactor } from "./grr-test-limit";
import type {
  AnalysisGroup,
  GaiaAnalysisResult,
  GrrJudgmentLabel,
  MetricSpecLimits,
  ParsedCsv,
  SerialGrrResult,
  SocketMean,
} from "./types";

function judgeErsMeasurement(
  ymin: number,
  ymax: number,
  upper: number | null,
  lower: number | null
): GrrJudgmentLabel {
  if (upper === null && lower === null) return "SPEC MISSING";

  const aboveLower = lower === null || ymin >= lower;
  const belowUpper = upper === null || ymax <= upper;

  if (aboveLower && belowUpper) return "PASS";
  return "FAIL";
}

function buildFailReason(
  measurementStatus: GrrJudgmentLabel,
  grrStatus: GrrJudgmentLabel
): string | null {
  const reasons: string[] = [];
  if (measurementStatus === "FAIL") reasons.push("ERS Out");
  if (grrStatus === "FAIL") reasons.push("GRR PCT Error Out");
  if (measurementStatus === "SPEC MISSING") reasons.push("Spec Missing");
  if (measurementStatus === "AMBIGUOUS SPEC MATCH") {
    reasons.push("Ambiguous Spec");
  }
  return reasons.length > 0 ? reasons.join(", ") : null;
}

function sortSockets(sockets: string[]): string[] {
  return [...sockets].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b, undefined, { numeric: true });
  });
}

export function analyzeGaiaGrr(
  parsed: ParsedCsv,
  group: AnalysisGroup,
  metricHeader: string,
  options?: {
    referenceSocket?: string;
    serialFilter?: string;
    specStore?: GaiaSpecStore | null;
  }
): GaiaAnalysisResult {
  const { rows, serialKey, socketKey, upperSpecs, lowerSpecs } = parsed;
  const csvUpper = upperSpecs[metricHeader] ?? null;
  const csvLower = lowerSpecs[metricHeader] ?? null;

  const configResolution = resolveGrrConfigSpec(
    metricHeader,
    options?.specStore ?? null
  );

  const specInfo = getSpecForJudgment(
    metricHeader,
    options?.specStore ?? null,
    csvLower,
    csvUpper
  );
  const upper = specInfo.upper;
  const lower = specInfo.lower;

  const axis = getAxisDomain(
    metricHeader,
    options?.specStore ?? null,
    csvLower,
    csvUpper
  );

  const specBlocked =
    specInfo.matchStatus === "missing" || specInfo.matchStatus === "ambiguous";
  const blockedLabel: GrrJudgmentLabel =
    specInfo.matchStatus === "ambiguous"
      ? "AMBIGUOUS SPEC MATCH"
      : "SPEC MISSING";

  const filteredRowIndexes: number[] = [];
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (options?.serialFilter && options.serialFilter !== "ALL") {
      if (row[serialKey] !== options.serialFilter) continue;
    }
    filteredRowIndexes.push(rowIndex);
  }

  const sequenceMap = annotateRunSequences(filteredRowIndexes, parsed, "repeat");
  const bySerial = new Map<string, SocketMean[]>();

  for (const rowIndex of filteredRowIndexes) {
    const row = rows[rowIndex];
    const serial = row[serialKey];
    const socket = row[socketKey];
    const value = getMetricValue(row, metricHeader);
    if (!serial || !socket || value === null) continue;

    const identity = buildTestRunIdentity(parsed, rowIndex, sequenceMap);
    const measurement: SocketMean = {
      socket,
      mean: value,
      count: 1,
      runId: identity.runId,
      timestamp: identity.timestamp,
      testSequence: identity.testSequence,
      attemptLabel: identity.attemptLabel,
      rowIndex,
    };

    if (!bySerial.has(serial)) {
      bySerial.set(serial, []);
    }
    bySerial.get(serial)!.push(measurement);
  }

  const allSockets = new Set<string>();
  bySerial.forEach((measurements) =>
    measurements.forEach((m) => allSockets.add(m.socket))
  );
  const sockets = sortSockets([...allSockets]);

  const requestedRef = options?.referenceSocket ?? sockets[0] ?? "";
  const resolvedRef =
    sockets.find((s) => socketsMatch(s, requestedRef)) ?? requestedRef;

  const serials: SerialGrrResult[] = [];

  for (const [serial, socketMeans] of bySerial) {
    if (socketMeans.length === 0) continue;

    const perSocket = aggregateSocketRuns(socketMeans);
    const socketAvgs = perSocket.map((s) => s.avg);
    const pseudoGolden = computePseudoGolden(socketAvgs);
    const criteriaStdev = grrSampleStdev(socketAvgs);
    const grrLimitForRange = specInfo.grrLimit ?? null;
    const { ymin, ymax } = computeSocketRangeBounds(
      perSocket,
      grrLimitForRange,
      specInfo.grrStdev ?? null
    );

    const refEntry = perSocket.find((s) => socketsMatch(s.socket, resolvedRef));
    const refRuns = refEntry?.runs ?? [];
    const refMean = refRuns.length > 0 ? grrMean(refRuns) : socketAvgs[0] ?? 0;
    const refStdev = refEntry?.stdev ?? grrSampleStdev(refRuns);
    const refYmin =
      refRuns.length > 0 ? Math.min(...refRuns) : refMean;
    const refYmax =
      refRuns.length > 0 ? Math.max(...refRuns) : refMean;

    serials.push({
      serial,
      referenceSocket: resolvedRef,
      referenceValue: refMean,
      referenceStdev: refStdev,
      referenceYmin: refYmin,
      referenceYmax: refYmax,
      pseudoGolden,
      socketMeans,
      ymin,
      ymax,
      range: ymax - ymin,
      percentRange:
        pseudoGolden !== 0 ? ((ymax - ymin) / Math.abs(pseudoGolden)) * 100 : 0,
      upper,
      lower,
      calculatedStdev: criteriaStdev,
      calculatedGrr:
        pseudoGolden !== 0 ? ((ymax - ymin) / Math.abs(pseudoGolden)) * 100 : 0,
      measurementStatus: "CHECK",
      grrStatus: "CHECK",
      failReason: null,
      status: "CHECK",
    });
  }

  serials.sort((a, b) => a.serial.localeCompare(b.serial));

  const spec: MetricSpecLimits = {
    found: hasAnySpecLimit(lower, upper) && !specBlocked,
    lsl: lower,
    usl: upper,
    grrStdev: specInfo.grrStdev ?? null,
    grrLimit: specInfo.grrLimit ?? null,
    unit: specInfo.unit,
    source: specInfo.source,
    matchedItem: specInfo.matchedItem,
    matchStatus: specInfo.matchStatus,
    ambiguousCandidates: specInfo.ambiguousCandidates,
  };

  const fullAxis = isFullAxisSpec(lower, upper) && !specBlocked;

  const dataVals = serials.flatMap((s) => [
    s.ymin,
    s.ymax,
    s.referenceValue,
    s.pseudoGolden,
  ]);
  const chartDomain =
    dataVals.length > 0
      ? computeChartDomainFromValues(dataVals, spec.lsl, spec.usl)
      : axis.domain;

  const bandLsl = spec.lsl !== null ? spec.lsl : chartDomain[0];
  const bandUsl = spec.usl !== null ? spec.usl : chartDomain[1];

  const groupGrr =
    serials.length > 0 && !specBlocked
      ? computeGroupGrrStats(
          serials,
          spec.grrLimit,
          spec.grrStdev,
          spec.lsl,
          spec.usl,
          bandLsl,
          bandUsl
        )
      : null;

  for (const s of serials) {
    if (specBlocked) {
      s.measurementStatus = blockedLabel;
      s.grrStatus = blockedLabel;
      s.failReason = buildFailReason(blockedLabel, blockedLabel);
      s.status = "CHECK";
      continue;
    }

    s.measurementStatus = judgeErsMeasurement(
      s.ymin,
      s.ymax,
      s.upper,
      s.lower
    );
  }

  if (!specBlocked) {
    applySerialGrrJudgments(
      serials,
      spec.grrLimit,
      spec.grrStdev,
      buildFailReason
    );
  }

  const plotAxisDomain: [number, number] = fullAxis ? axis.domain : chartDomain;

  const summary = {
    total: serials.length,
    pass: serials.filter((s) => s.status === "PASS").length,
    fail: serials.filter((s) => s.status === "FAIL").length,
    check: serials.filter((s) => s.status === "CHECK").length,
  };

  return {
    group,
    metric: metricHeader,
    serials,
    summary,
    sockets,
    axisDomain: plotAxisDomain,
    chartDomain,
    spec,
    groupGrr,
    specSource: specInfo.source,
    matchedConfigItem: specInfo.matchedItem ?? axis.matchedItem,
    specUnit: specInfo.unit,
    configResolution,
  };
}

export function grrLimitPercent(grrLimit: number | null): number | null {
  if (grrLimit === null || grrLimit <= 0) return null;
  return grrLimitToPercentFactor(grrLimit) * 100;
}
