import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS, type StatForgeApi } from "../shared/ipc-types";

const api: StatForgeApi = {
  openDataFile: () => ipcRenderer.invoke(IPC_CHANNELS.dialogOpenData),
  openProjectFile: () => ipcRenderer.invoke(IPC_CHANNELS.dialogOpenProject),
  saveProjectDialog: (defaultName?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.dialogSaveProject, defaultName),
  writeTextFile: (filePath: string, content: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.fsWriteText, filePath, content),
  readTextFile: (filePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.fsReadText, filePath),
  minimize: () => ipcRenderer.invoke(IPC_CHANNELS.windowMinimize),
  maximize: () => ipcRenderer.invoke(IPC_CHANNELS.windowMaximize),
  close: () => ipcRenderer.invoke(IPC_CHANNELS.windowClose),
  isMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.windowIsMaximized),
  setTitle: (title: string) => ipcRenderer.invoke(IPC_CHANNELS.setTitle, title),
  getStartupOpenPath: () => ipcRenderer.invoke(IPC_CHANNELS.getStartupOpenPath),
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("statforge", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).statforge = api;
}
