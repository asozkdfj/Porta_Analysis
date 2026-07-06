import { resolveGrrConfigSpec, type GaiaSpecStore } from "./gaia-spec-config";
import { analyzeGaiaGrr } from "./grr-calculator";
import { findMetricsForGroup } from "./groups";
import { formatTestItemLabel } from "./liw-grr-spec";
import type {
  AnalysisGroup,
  GrrDashboardSpecResultEntry,
  GrrDashboardSpecSummary,
  ParsedCsv,
} from "./types";

function listSocketsFromParsed(parsed: ParsedCsv): string[] {
  const set = new Set<string>();
  for (const row of parsed.rows) {
    const socket = row[parsed.socketKey]?.trim();
    if (socket) set.add(socket);
  }
  return [...set].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b, undefined, { numeric: true });
  });
}

function matchedMetrics(
  metrics: string[],
  specStore: GaiaSpecStore | null
): string[] {
  return metrics.filter(
    (metric) => resolveGrrConfigSpec(metric, specStore).matchStatus === "matched"
  );
}

/**
 * 소켓 기준 GRR — 해당 소켓을 Reference로 할 때 모든 Metric·모듈이 PASS여야 PASS
 */
function evaluateSocketGrr(
  parsed: ParsedCsv,
  group: AnalysisGroup,
  metrics: string[],
  specStore: GaiaSpecStore | null,
  socket: string,
  serialFilter?: string
): { pass: boolean; failures: GrrDashboardSpecResultEntry[] } {
  const failures: GrrDashboardSpecResultEntry[] = [];
  let evaluated = false;

  for (const metric of metrics) {
    const analysis = analyzeGaiaGrr(parsed, group, metric, {
      specStore,
      referenceSocket: socket,
      serialFilter,
    });

    if (analysis.serials.length === 0) continue;
    evaluated = true;

    const metricLabel = formatTestItemLabel(metric);
    for (const serial of analysis.serials) {
      if (serial.grrStatus !== "PASS") {
        failures.push({
          socket,
          serial: serial.serial,
          metric,
          metricLabel,
        });
      }
    }
  }

  return {
    pass: evaluated && failures.length === 0,
    failures,
  };
}

export function buildGrrDashboardSpecSummary(
  parsed: ParsedCsv,
  group: AnalysisGroup,
  specStore: GaiaSpecStore | null,
  liwBranch: "50C" | "20C" | "all" = "all",
  options?: {
    referenceSocket?: string;
    serialFilter?: string;
  }
): GrrDashboardSpecSummary {
  const { metrics } = findMetricsForGroup(parsed.headers, group, {
    liwBranch,
    specStore,
  });

  const specMatchedMetrics = matchedMetrics(metrics, specStore);
  const sockets = listSocketsFromParsed(parsed);

  let specMatched = 0;
  let specMissing = 0;
  let ambiguousMatch = 0;
  let measurementPass = 0;
  let measurementFail = 0;

  const referenceSocket = options?.referenceSocket || sockets[0] || "";

  for (const metric of metrics) {
    const resolution = resolveGrrConfigSpec(metric, specStore);
    if (resolution.matchStatus === "matched") specMatched++;
    else if (resolution.matchStatus === "ambiguous") ambiguousMatch++;
    else specMissing++;

    if (resolution.matchStatus !== "matched") continue;

    const analysis = analyzeGaiaGrr(parsed, group, metric, {
      specStore,
      referenceSocket,
      serialFilter: options?.serialFilter,
    });

    for (const serial of analysis.serials) {
      if (serial.measurementStatus === "PASS") measurementPass++;
      else if (serial.measurementStatus === "FAIL") measurementFail++;
    }
  }

  const grrPassItems: GrrDashboardSpecResultEntry[] = [];
  const grrFailItems: GrrDashboardSpecResultEntry[] = [];

  for (const socket of sockets) {
    const { pass, failures } = evaluateSocketGrr(
      parsed,
      group,
      specMatchedMetrics,
      specStore,
      socket,
      options?.serialFilter
    );

    if (pass) {
      grrPassItems.push({ socket });
    } else if (failures.length > 0) {
      grrFailItems.push(...failures);
    }
  }

  const grrFailSocketCount = new Set(grrFailItems.map((item) => item.socket)).size;

  return {
    totalMetrics: metrics.length,
    specMatched,
    specMissing,
    ambiguousMatch,
    measurementPass,
    measurementFail,
    grrPass: grrPassItems.length,
    grrFail: grrFailSocketCount,
    grrPassItems,
    grrFailItems,
  };
}
