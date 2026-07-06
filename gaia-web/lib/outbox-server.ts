import fs from "node:fs";
import path from "node:path";
import { getOutboxRoot } from "./gaia-portable-paths";

const GRR_CHARTS_SUBDIR = "grr-charts";

export { getOutboxRoot } from "./gaia-portable-paths";

export function getGrrChartsOutboxDir(): string {
  return path.join(getOutboxRoot(), GRR_CHARTS_SUBDIR);
}

export function ensureGrrChartsOutboxDir(): string {
  const dir = getGrrChartsOutboxDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function isSafePngFileName(fileName: string): boolean {
  const base = path.basename(fileName);
  if (base !== fileName) return false;
  if (!base || base.startsWith(".")) return false;
  if (base.includes("..")) return false;
  return /\.png$/i.test(base);
}

function assertFileInDir(dir: string, filePath: string): void {
  const resolvedDir = path.resolve(dir);
  const resolvedFile = path.resolve(filePath);
  if (
    resolvedFile !== resolvedDir &&
    !resolvedFile.startsWith(resolvedDir + path.sep)
  ) {
    throw new Error("Invalid file path");
  }
}

export function saveGrrChartPngFile(
  fileName: string,
  buffer: Buffer
): { fileName: string; absolutePath: string } {
  if (!isSafePngFileName(fileName)) {
    throw new Error("Invalid PNG file name");
  }

  const dir = ensureGrrChartsOutboxDir();
  const filePath = path.join(dir, fileName);
  assertFileInDir(dir, filePath);
  fs.writeFileSync(filePath, buffer);

  return { fileName, absolutePath: filePath };
}

export function listGrrChartPngFiles(): string[] {
  const dir = getGrrChartsOutboxDir();
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isSafePngFileName(entry.name))
    .map((entry) => entry.name)
    .sort(
      (a, b) =>
        fs.statSync(path.join(dir, b)).mtimeMs -
        fs.statSync(path.join(dir, a)).mtimeMs
    );
}
