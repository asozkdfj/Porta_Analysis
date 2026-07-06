import { writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { normalizeStationStore } from "@/lib/tact-time-persistence";

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "dev only" }, { status: 403 });
  }

  try {
    const json: unknown = await req.json();
    const store = normalizeStationStore(json);
    const outPath = path.join(
      process.cwd(),
      "public",
      "tact-time-default-stations.json"
    );
    await writeFile(outPath, JSON.stringify(store, null, 2), "utf8");
    const groupCount = Object.values(store.stations).reduce(
      (sum, s) => sum + s.groups.length,
      0
    );
    return NextResponse.json({ ok: true, path: outPath, groupCount });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "save failed" },
      { status: 400 }
    );
  }
}
