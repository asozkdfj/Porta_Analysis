import type { MiniJmpSavedConfig } from "./mini-jmp-types";
import { DEFAULT_MINI_JMP_AXIS_CONFIG } from "./mini-jmp-types";

const DEFAULT_OPTIONS = {
  showGrid: true,
  showDataLabels: false,
  showTrendLine: false,
  pointAlpha: 1,
  jitter: 0.45,
};

function preset(partial: Partial<MiniJmpSavedConfig> & Pick<MiniJmpSavedConfig, "name">): MiniJmpSavedConfig {
  return {
    version: 1,
    graphType: "scatter",
    xColumn: null,
    yColumn: null,
    colorColumn: null,
    groupColumn: null,
    sizeColumn: null,
    labelColumn: null,
    aggregation: "average",
    options: DEFAULT_OPTIONS,
    axisConfig: DEFAULT_MINI_JMP_AXIS_CONFIG,
    filters: [],
    ...partial,
  };
}

/** 컬럼명은 데이터셋에 맞게 사용자가 수정 가능 */
export const MINI_JMP_PRESETS: MiniJmpSavedConfig[] = [
  preset({
    name: "Test Time Trend",
    graphType: "line",
    xColumn: "StartTime",
    yColumn: "TestTime",
    colorColumn: "Test Pass/Fail Status",
    options: { ...DEFAULT_OPTIONS, showTrendLine: true },
    axisConfig: {
      x: { range: { min: null, max: null }, guideLines: [] },
      y: {
        range: { min: null, max: null },
        guideLines: [{ id: "spec-170", position: 170, label: "170s", color: "#e74c3c" }],
      },
    },
  }),
  preset({
    name: "Fail Item Pareto",
    graphType: "pareto",
    xColumn: "Failing Items",
  }),
  preset({
    name: "Socket Fail Heatmap",
    graphType: "heatmap",
    xColumn: "Socket Number",
    yColumn: "Stage",
    aggregation: "count",
  }),
  preset({
    name: "Tester Comparison",
    graphType: "box",
    xColumn: "TesterID",
    yColumn: "TestTime",
  }),
  preset({
    name: "TestTime Histogram",
    graphType: "histogram",
    yColumn: "TestTime",
  }),
  preset({
    name: "Tester Average Bar",
    graphType: "bar",
    xColumn: "TesterID",
    yColumn: "TestTime",
    aggregation: "average",
  }),
];
