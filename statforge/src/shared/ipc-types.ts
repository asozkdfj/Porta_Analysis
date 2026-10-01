export const IPC_CHANNELS = {
  dialogOpenData: "dialog:open-data",
  dialogSaveProject: "dialog:save-project",
  dialogOpenProject: "dialog:open-project",
  fsReadText: "fs:read-text",
  fsReadBinary: "fs:read-binary",
  fsWriteText: "fs:write-text",
  windowMinimize: "window:minimize",
  windowMaximize: "window:maximize",
  windowClose: "window:close",
  windowIsMaximized: "window:is-maximized",
  setTitle: "window:set-title",
  getStartupOpenPath: "app:get-startup-open-path",
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

export type OpenDataResult =
  | {
      canceled: false;
      filePath: string;
      fileName: string;
      content: string;
      encoding: "utf-8";
      binary?: boolean;
    }
  | { canceled: true };

export type SaveProjectDialogResult =
  | { canceled: false; filePath: string }
  | { canceled: true };

export type OpenProjectResult =
  | { canceled: false; filePath: string; content: string }
  | { canceled: true };

export interface StatForgeApi {
  openDataFile: () => Promise<OpenDataResult>;
  openProjectFile: () => Promise<OpenProjectResult>;
  saveProjectDialog: (defaultName?: string) => Promise<SaveProjectDialogResult>;
  writeTextFile: (filePath: string, content: string) => Promise<void>;
  readTextFile: (filePath: string) => Promise<string>;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  setTitle: (title: string) => Promise<void>;
  getStartupOpenPath: () => Promise<string | null>;
}

declare global {
  interface Window {
    statforge: StatForgeApi;
  }
}

export {};
