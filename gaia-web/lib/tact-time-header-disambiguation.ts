import {
  aggregateSettingRowsFromLogEntries,
  isCycleTotalTimeLabel,
  isTactTimeCycleStartLabel,
  splitLogEntriesByTotalTimeMarker,
} from "./tact-time-parser";
import type {
  ParsedTactTimeCsv,
  TactTimeLogEntry,
  TactTimeStationId,
} from "./tact-time-types";

export const MOVE_ODD_POSITION_MARKER = "MOVE_ODD_Position";
export const MOVE_CYLINDER_MARKER = "MoveCylinder";
export const SECOND_HEADER_SUFFIX = "_2nd";

const STATION_DUPLICATE_MARKERS: Partial<
  Record<TactTimeStationId, string>
> = {
  2: MOVE_ODD_POSITION_MARKER,
  4: MOVE_CYLINDER_MARKER,
};

export function stationUsesHeaderDisambiguation(
  stationId: TactTimeStationId
): boolean {
  return STATION_DUPLICATE_MARKERS[stationId] != null;
}

/** @deprecated use stationUsesHeaderDisambiguation */
export function stationUsesMoveOddDisambiguation(
  stationId: TactTimeStationId
): boolean {
  return stationUsesHeaderDisambiguation(stationId);
}

export function getStationDuplicateMarker(
  stationId: TactTimeStationId
): string | null {
  return STATION_DUPLICATE_MARKERS[stationId] ?? null;
}

function headerIncludesMarker(header: string, marker: string): boolean {
  return header.includes(marker);
}

/**
 * Cycle 내 순차 변환:
 * - 첫 등장: 원본 Label
 * - 동일 Label 재등장: _1, _2, … (첫 중복부터 1)
 * - marker(MoveCylinder 등) 이후, marker 이전에 나온 Label 재등장: _2nd, _2nd_1, …
 * Total time · Init_Test_Proc(2회차~) 마다 상태 초기화 → Cycle마다 동일 규칙 적용
 */
export function disambiguateLogEntriesSequential(
  entries: TactTimeLogEntry[],
  marker: string | null
): TactTimeLogEntry[] {
  const cycles = splitLogEntriesByTotalTimeMarker(entries);
  if (cycles.length === 0) {
    return disambiguateSingleCycleSequential(entries, marker);
  }

  const result: TactTimeLogEntry[] = [];
  for (const cycle of cycles) {
    result.push(...disambiguateSingleCycleSequential(cycle, marker));
  }
  return result.sort((a, b) => a.rowIndex - b.rowIndex);
}

export function disambiguateSingleCycleSequential(
  entries: TactTimeLogEntry[],
  marker: string | null
): TactTimeLogEntry[] {
  const ordered = [...entries].sort((a, b) => a.rowIndex - b.rowIndex);
  const result: TactTimeLogEntry[] = [];

  let afterMarker = false;
  const seenBeforeMarker = new Set<string>();
  const occurrenceCount = new Map<string, number>();
  const afterMarkerDupCount = new Map<string, number>();

  const resetCycleState = () => {
    afterMarker = false;
    seenBeforeMarker.clear();
    occurrenceCount.clear();
    afterMarkerDupCount.clear();
  };

  resetCycleState();

  for (const entry of ordered) {
    const baseHeader = entry.header;

    if (isCycleTotalTimeLabel(baseHeader)) {
      result.push(entry);
      resetCycleState();
      continue;
    }

    // Total time 없이 Init_Test_Proc만 반복되는 구간(로그 앞부분 등)도 사이클 경계로 처리
    if (isTactTimeCycleStartLabel(baseHeader) && result.length > 0) {
      resetCycleState();
    }

    if (marker && headerIncludesMarker(baseHeader, marker)) {
      afterMarker = true;
      result.push(entry);
      continue;
    }

    const prevCount = occurrenceCount.get(baseHeader) ?? 0;
    let header = baseHeader;

    if (prevCount > 0) {
      if (marker && afterMarker && seenBeforeMarker.has(baseHeader)) {
        const dupIndex = afterMarkerDupCount.get(baseHeader) ?? 0;
        afterMarkerDupCount.set(baseHeader, dupIndex + 1);
        header =
          dupIndex === 0
            ? `${baseHeader}${SECOND_HEADER_SUFFIX}`
            : `${baseHeader}${SECOND_HEADER_SUFFIX}_${dupIndex}`;
      } else {
        header = `${baseHeader}_${prevCount}`;
      }
    } else if (!afterMarker) {
      seenBeforeMarker.add(baseHeader);
    }

    occurrenceCount.set(baseHeader, prevCount + 1);
    result.push(header === baseHeader ? entry : { ...entry, header });
  }

  return result;
}

/** @deprecated use disambiguateLogEntriesSequential */
export function disambiguateStation4LogEntries(
  entries: TactTimeLogEntry[]
): TactTimeLogEntry[] {
  return disambiguateLogEntriesSequential(entries, MOVE_CYLINDER_MARKER);
}

/** @deprecated use disambiguateLogEntriesSequential */
export function disambiguateLogEntriesAfterMarker(
  entries: TactTimeLogEntry[],
  marker: string
): TactTimeLogEntry[] {
  return disambiguateStation2LogEntries(entries, marker);
}

/**
 * Station 2: marker 이후 중복 Label → _2nd (기존 규칙 유지)
 */
export function disambiguateStation2LogEntries(
  entries: TactTimeLogEntry[],
  marker: string
): TactTimeLogEntry[] {
  const cycles = splitLogEntriesByTotalTimeMarker(entries);
  if (cycles.length === 0) {
    return disambiguateStation2SingleCycle(entries, marker);
  }

  const result: TactTimeLogEntry[] = [];
  for (const cycle of cycles) {
    result.push(...disambiguateStation2SingleCycle(cycle, marker));
  }
  return result.sort((a, b) => a.rowIndex - b.rowIndex);
}

function disambiguateStation2SingleCycle(
  entries: TactTimeLogEntry[],
  marker: string
): TactTimeLogEntry[] {
  const ordered = [...entries].sort((a, b) => a.rowIndex - b.rowIndex);
  const result: TactTimeLogEntry[] = [];
  let afterMarker = false;
  const seenInCycle = new Map<string, number>();

  for (const entry of ordered) {
    const baseHeader = entry.header;

    if (isCycleTotalTimeLabel(baseHeader)) {
      result.push(entry);
      afterMarker = false;
      seenInCycle.clear();
      continue;
    }

    if (isTactTimeCycleStartLabel(baseHeader) && result.length > 0) {
      afterMarker = false;
      seenInCycle.clear();
    }

    let header = baseHeader;

    if (headerIncludesMarker(baseHeader, marker)) {
      afterMarker = true;
    } else if (afterMarker && (seenInCycle.get(baseHeader) ?? 0) > 0) {
      header = `${baseHeader}${SECOND_HEADER_SUFFIX}`;
    }

    seenInCycle.set(baseHeader, (seenInCycle.get(baseHeader) ?? 0) + 1);
    result.push(header === baseHeader ? entry : { ...entry, header });
  }

  return result;
}

export function applyStationHeaderTransforms(
  parsed: ParsedTactTimeCsv,
  stationId: TactTimeStationId
): ParsedTactTimeCsv {
  if (stationId === 4) {
    const logEntries = disambiguateLogEntriesSequential(
      parsed.logEntries,
      MOVE_CYLINDER_MARKER
    );
    const rows = aggregateSettingRowsFromLogEntries(logEntries);
    return { ...parsed, logEntries, rows };
  }

  if (stationId === 2) {
    const logEntries = disambiguateStation2LogEntries(
      parsed.logEntries,
      MOVE_ODD_POSITION_MARKER
    );
    const rows = aggregateSettingRowsFromLogEntries(logEntries);
    return { ...parsed, logEntries, rows };
  }

  return parsed;
}

export function getStationDisambiguationHint(
  stationId: TactTimeStationId
): string | null {
  if (stationId === 2) {
    return `${MOVE_ODD_POSITION_MARKER} 이후 중복 Label → _2nd`;
  }
  if (stationId === 4) {
    return `${MOVE_CYLINDER_MARKER} 이후 재등장 Label → _2nd · 중복 → _1, _2, … · Total time·Init_Test_Proc마다 초기화`;
  }
  return null;
}
