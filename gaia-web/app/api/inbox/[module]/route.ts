import path from "node:path";
import { NextResponse } from "next/server";
import {
  getInboxModuleDir,
  getInboxRoot,
  isInboxModuleId,
  listInboxFiles,
  readInboxFile,
  resolveTactTimeInboxSubdir,
} from "@/lib/inbox-server";
import { INBOX_MODULES } from "@/lib/inbox-types";

export async function GET(
  req: Request,
  context: { params: Promise<{ module: string }> }
) {
  const { module } = await context.params;

  if (!isInboxModuleId(module)) {
    return NextResponse.json({ error: "Unknown inbox module" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const file = searchParams.get("file");

  let subdir: string | null = null;
  try {
    if (module === "tact-time") {
      subdir = resolveTactTimeInboxSubdir(
        searchParams.get("station"),
        searchParams.get("subdir")
      );
      if (!subdir) {
        return NextResponse.json(
          { error: "tact-time requires station=1..8 (or subdir=StationN)" },
          { status: 400 }
        );
      }
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid station" },
      { status: 400 }
    );
  }

  try {
    if (file) {
      const data = readInboxFile(module, file, subdir);
      return NextResponse.json({
        module,
        subdir,
        fileName: data.fileName,
        text: data.text,
      });
    }

    const folder = subdir
      ? `${INBOX_MODULES[module].folder}/${subdir}`
      : INBOX_MODULES[module].folder;

    return NextResponse.json({
      module,
      folder,
      subdir,
      inboxRoot: getInboxRoot(),
      modulePath: subdir
        ? pathJoin(getInboxModuleDir(module), subdir)
        : getInboxModuleDir(module),
      files: listInboxFiles(module, subdir),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Inbox read failed" },
      { status: 400 }
    );
  }
}

function pathJoin(a: string, b: string): string {
  return path.join(a, b);
}
