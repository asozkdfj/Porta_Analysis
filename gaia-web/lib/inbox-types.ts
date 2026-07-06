export const INBOX_MODULES = {
  grr: {
    folder: "grr",
    label: "GRR 분석",
    description: "GRR 테스트 결과 CSV",
  },
  liw: {
    folder: "liw",
    label: "LIW 분석",
    description: "LIW Linearity Log CSV",
  },
  temperature: {
    folder: "temperature",
    label: "Temperature Tracking",
    description: "온도 추적 CSV",
  },
  "tact-time": {
    folder: "tact-time",
    label: "Tact Time",
    description: "Tact Time 로그 CSV (Station1~Station8 하위 폴더)",
  },
  "error-analysis": {
    folder: "error-analysis",
    label: "Error Analysis",
    description: "Fail 분석 CSV",
  },
  config: {
    folder: "config",
    label: "GRR Config",
    description: "GaiaStat2grrConfig CSV",
  },
} as const;

export type InboxModuleId = keyof typeof INBOX_MODULES;

export interface InboxFileEntry {
  name: string;
  size: number;
  modifiedAt: string;
}

export interface InboxListResponse {
  module: InboxModuleId;
  folder: string;
  inboxRoot: string;
  files: InboxFileEntry[];
}

export interface InboxReadResponse {
  module: InboxModuleId;
  fileName: string;
  text: string;
}
