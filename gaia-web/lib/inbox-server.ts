import fs from "node:fs";
import path from "node:path";
import { getInboxRoot } from "./gaia-portable-paths";
import {
  INBOX_MODULES,
  type InboxFileEntry,
  type InboxModuleId,
} from "./inbox-types";
import {
  TACT_TIME_STATION_COUNT,
  parseTactTimeStationInboxFolder,
  tactTimeStationInboxFolder,
  type TactTimeStationId,
} from "./tact-time-types";

export { getInboxRoot } from "./gaia-portable-paths";

export function isInboxModuleId(value: string): value is InboxModuleId {
  return value in INBOX_MODULES;
}

export function getInboxModuleDir(moduleId: InboxModuleId): string {
  const folder = INBOX_MODULES[moduleId].folder;
  return path.join(getInboxRoot(), folder);
}

function isSafeSubdirName(subdir: string): boolean {
  const base = path.basename(subdir);
  if (base !== subdir) return false;
  if (!base || base.startsWith(".")) return false;
  if (base.includes("..")) return false;
  return /^[A-Za-z0-9_-]+$/.test(base);
}

export function resolveTactTimeInboxSubdir(
  station: string | null,
  subdir: string | null
): string | null {
  if (station) {
    const n = Number(station);
    if (!Number.isInteger(n) || n < 1 || n > TACT_TIME_STATION_COUNT) {
      throw new Error("Invalid station (use 1–8)");
    }
    return tactTimeStationInboxFolder(n as TactTimeStationId);
  }
  if (subdir) {
    if (!isSafeSubdirName(subdir)) {
      throw new Error("Invalid subdir");
    }
    if (!parseTactTimeStationInboxFolder(subdir)) {
      throw new Error("Invalid tact-time subdir (use Station1–Station8)");
    }
    return subdir;
  }
  return null;
}

function getInboxListDir(
  moduleId: InboxModuleId,
  subdir: string | null
): string {
  const moduleDir = getInboxModuleDir(moduleId);
  if (!subdir) return moduleDir;
  if (moduleId !== "tact-time") {
    throw new Error("subdir is only supported for tact-time");
  }
  return path.join(moduleDir, subdir);
}

function isSafeCsvFileName(fileName: string): boolean {
  const base = path.basename(fileName);
  if (base !== fileName) return false;
  if (!base || base.startsWith(".")) return false;
  if (base.includes("..")) return false;
  return /\.csv$/i.test(base);
}

function assertFileInModuleDir(moduleDir: string, filePath: string): void {
  const resolvedModule = path.resolve(moduleDir);
  const resolvedFile = path.resolve(filePath);
  if (
    resolvedFile !== resolvedModule &&
    !resolvedFile.startsWith(resolvedModule + path.sep)
  ) {
    throw new Error("Invalid file path");
  }
}

export function ensureInboxStructure(): void {
  const root = getInboxRoot();
  fs.mkdirSync(root, { recursive: true });
  for (const mod of Object.values(INBOX_MODULES)) {
    fs.mkdirSync(path.join(root, mod.folder), { recursive: true });
  }
  for (let i = 1; i <= TACT_TIME_STATION_COUNT; i++) {
    fs.mkdirSync(
      path.join(
        root,
        INBOX_MODULES["tact-time"].folder,
        tactTimeStationInboxFolder(i as TactTimeStationId)
      ),
      { recursive: true }
    );
  }
}

export function listInboxFiles(
  moduleId: InboxModuleId,
  subdir: string | null = null
): InboxFileEntry[] {
  const listDir = getInboxListDir(moduleId, subdir);
  if (!fs.existsSync(listDir)) {
    return [];
  }

  const entries = fs.readdirSync(listDir, { withFileTypes: true });
  const files: InboxFileEntry[] = [];

  for (const ent of entries) {
    if (!ent.isFile()) continue;
    if (!isSafeCsvFileName(ent.name)) continue;
    const full = path.join(listDir, ent.name);
    const stat = fs.statSync(full);
    files.push({
      name: ent.name,
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    });
  }

  return files.sort(
    (a, b) =>
      new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
  );
}

export function readInboxFile(
  moduleId: InboxModuleId,
  fileName: string,
  subdir: string | null = null
): { fileName: string; text: string } {
  if (!isSafeCsvFileName(fileName)) {
    throw new Error("Invalid file name");
  }

  const listDir = getInboxListDir(moduleId, subdir);
  const filePath = path.join(listDir, fileName);
  assertFileInModuleDir(listDir, filePath);

  if (!fs.existsSync(filePath)) {
    throw new Error("File not found");
  }

  const text = fs.readFileSync(filePath, "utf8");
  return { fileName, text };
}
