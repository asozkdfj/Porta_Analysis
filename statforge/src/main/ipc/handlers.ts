import { BrowserWindow, dialog, ipcMain } from "electron";
import { readFile, writeFile } from "fs/promises";
import { basename } from "path";
import { IPC_CHANNELS } from "../../shared/ipc-types";
import { PROJECT_EXTENSION } from "../../shared/constants/app";

function getMainWindow(): BrowserWindow | null {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null;
}

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.dialogOpenData, async () => {
    const win = getMainWindow();
    const result = await (win
      ? dialog.showOpenDialog(win, {
          title: "Open Data",
          properties: ["openFile"],
          filters: [
            { name: "Data Files", extensions: ["csv", "tsv", "txt", "xlsx", "json"] },
            { name: "CSV", extensions: ["csv", "tsv", "txt"] },
            { name: "Excel", extensions: ["xlsx"] },
            { name: "JSON", extensions: ["json"] },
            { name: "All Files", extensions: ["*"] },
          ],
        })
      : dialog.showOpenDialog({
          title: "Open Data",
          properties: ["openFile"],
          filters: [
            { name: "Data Files", extensions: ["csv", "tsv", "txt", "xlsx", "json"] },
            { name: "CSV", extensions: ["csv", "tsv", "txt"] },
            { name: "Excel", extensions: ["xlsx"] },
            { name: "JSON", extensions: ["json"] },
            { name: "All Files", extensions: ["*"] },
          ],
        }));

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true as const };
    }

    const filePath = result.filePaths[0];
    const fileName = basename(filePath);
    const lower = fileName.toLowerCase();

    if (lower.endsWith(".xlsx")) {
      const buffer = await readFile(filePath);
      return {
        canceled: false as const,
        filePath,
        fileName,
        content: buffer.toString("base64"),
        encoding: "utf-8" as const,
        binary: true as const,
      };
    }

    const content = await readFile(filePath, "utf-8");
    return {
      canceled: false as const,
      filePath,
      fileName,
      content,
      encoding: "utf-8" as const,
      binary: false as const,
    };
  });

  ipcMain.handle(IPC_CHANNELS.dialogOpenProject, async () => {
    const win = getMainWindow();
    const options = {
      title: "Open Project",
      properties: ["openFile"] as Array<"openFile">,
      filters: [
        { name: "StatForge Project", extensions: ["statforge", "json"] },
        { name: "All Files", extensions: ["*"] },
      ],
    };
    const result = await (win
      ? dialog.showOpenDialog(win, options)
      : dialog.showOpenDialog(options));
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true as const };
    }
    const filePath = result.filePaths[0];
    const content = await readFile(filePath, "utf-8");
    return { canceled: false as const, filePath, content };
  });

  ipcMain.handle(IPC_CHANNELS.dialogSaveProject, async (_event, defaultName?: string) => {
    const win = getMainWindow();
    const options = {
      title: "Save Project",
      defaultPath: defaultName ?? `project${PROJECT_EXTENSION}`,
      filters: [{ name: "StatForge Project", extensions: ["statforge"] }],
    };
    const result = await (win
      ? dialog.showSaveDialog(win, options)
      : dialog.showSaveDialog(options));
    if (result.canceled || !result.filePath) {
      return { canceled: true as const };
    }
    return { canceled: false as const, filePath: result.filePath };
  });

  ipcMain.handle(IPC_CHANNELS.fsReadText, async (_event, filePath: string) => {
    return readFile(filePath, "utf-8");
  });

  ipcMain.handle(IPC_CHANNELS.fsWriteText, async (_event, filePath: string, content: string) => {
    await writeFile(filePath, content, "utf-8");
  });

  ipcMain.handle(IPC_CHANNELS.windowMinimize, () => {
    getMainWindow()?.minimize();
  });

  ipcMain.handle(IPC_CHANNELS.windowMaximize, () => {
    const win = getMainWindow();
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });

  ipcMain.handle(IPC_CHANNELS.windowClose, () => {
    getMainWindow()?.close();
  });

  ipcMain.handle(IPC_CHANNELS.windowIsMaximized, () => {
    return getMainWindow()?.isMaximized() ?? false;
  });

  ipcMain.handle(IPC_CHANNELS.setTitle, (_event, title: string) => {
    getMainWindow()?.setTitle(title);
  });

  ipcMain.handle(IPC_CHANNELS.getStartupOpenPath, () => {
    const fromEnv = process.env.STATFORGE_OPEN?.trim();
    if (fromEnv) return fromEnv;
    const arg = process.argv.find((a) => a.toLowerCase().endsWith(".csv"));
    return arg ?? null;
  });
}
