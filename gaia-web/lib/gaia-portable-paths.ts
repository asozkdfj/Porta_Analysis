import fs from "node:fs";
import path from "node:path";

/**
 * Portable layout — bat 파일(Start-Porta / Run-Server)이 있는 폴더 = portable root:
 *   ROOT/
 *     Start-Porta.bat, Run-Server.bat
 *     app/     ← standalone server cwd
 *     inbox/
 *     outbox/
 *     node/
 *
 * Run-Server.bat가 기동 시 app/.gaia-data-root 에 ROOT 를 기록한다.
 * 배포 ZIP 에 빌드 PC 경로가 남지 않도록, 폴더 구조(server.js + ../inbox)를
 * 마커 파일보다 우선한다.
 */

const DATA_ROOT_MARKER = ".gaia-data-root";

const PORTABLE_DIR_NAMES = ["Porta-portable", "GAIA-portable"] as const;

function resolveDevPortableRoot(cwd: string): string | null {
  for (const name of PORTABLE_DIR_NAMES) {
    const portable = path.resolve(cwd, "..", name);
    if (fs.existsSync(path.join(portable, "inbox"))) {
      return portable;
    }
  }
  return null;
}

function portableRootFromEnv(): string | null {
  const fromEnv =
    process.env.PORTA_PORTABLE_ROOT ??
    process.env.GAIA_PORTABLE_ROOT ??
    process.env.GAIA_DATA_ROOT;
  if (!fromEnv) return null;
  const resolved = path.resolve(fromEnv);
  if (fs.existsSync(resolved)) return resolved;
  return null;
}

function inboxRootFromEnv(): string | null {
  const fromEnv = process.env.PORTA_INBOX_ROOT ?? process.env.GAIA_INBOX_ROOT;
  if (!fromEnv) return null;
  return path.resolve(fromEnv);
}

function outboxRootFromEnv(): string | null {
  const fromEnv = process.env.PORTA_OUTBOX_ROOT ?? process.env.GAIA_OUTBOX_ROOT;
  if (!fromEnv) return null;
  return path.resolve(fromEnv);
}

function resolvePortableLayoutRoot(cwd: string): string | null {
  const parent = path.resolve(cwd, "..");

  if (
    fs.existsSync(path.join(cwd, "server.js")) &&
    fs.existsSync(path.join(parent, "inbox"))
  ) {
    return parent;
  }

  if (fs.existsSync(path.join(parent, "inbox"))) {
    return parent;
  }

  return null;
}

function readDataRootMarker(cwd: string): string | null {
  const markerPaths = [
    path.join(cwd, DATA_ROOT_MARKER),
    path.join(cwd, "app", DATA_ROOT_MARKER),
  ];

  for (const markerPath of markerPaths) {
    if (!fs.existsSync(markerPath)) continue;

    const raw = fs.readFileSync(markerPath, "utf8").trim();
    if (!raw) continue;

    const resolved = path.resolve(raw);
    if (fs.existsSync(path.join(resolved, "inbox"))) {
      return resolved;
    }
  }

  return null;
}

export function findPortableRoot(cwd: string = process.cwd()): string | null {
  const fromLayout = resolvePortableLayoutRoot(cwd);
  if (fromLayout) return fromLayout;

  const fromEnv = portableRootFromEnv();
  if (fromEnv) return fromEnv;

  const fromMarker = readDataRootMarker(cwd);
  if (fromMarker) return fromMarker;

  // Dev: gaia-web 옆 Porta-portable / GAIA-portable (npm run dev 전용)
  if (fs.existsSync(path.join(cwd, "package.json"))) {
    const portable = resolveDevPortableRoot(cwd);
    if (portable) return portable;
  }

  return null;
}

export function getPortableRoot(): string {
  return findPortableRoot() ?? path.resolve(process.cwd(), "..");
}

export function getInboxRoot(): string {
  const fromEnv = inboxRootFromEnv();
  if (fromEnv) return fromEnv;

  const portableRoot = findPortableRoot();
  if (portableRoot) {
    return path.join(portableRoot, "inbox");
  }

  return path.join(process.cwd(), "inbox");
}

export function getOutboxRoot(): string {
  const fromEnv = outboxRootFromEnv();
  if (fromEnv) return fromEnv;

  const portableRoot = findPortableRoot();
  if (portableRoot) {
    return path.join(portableRoot, "outbox");
  }

  const devPortable = resolveDevPortableRoot(process.cwd());
  if (devPortable) {
    return path.join(devPortable, "outbox");
  }

  return path.resolve(process.cwd(), "..", "Porta-portable", "outbox");
}
