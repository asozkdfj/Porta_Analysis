import { NextResponse } from "next/server";
import { findPortableRoot, getInboxRoot, getOutboxRoot } from "@/lib/gaia-portable-paths";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "gaia-web",
    version: "0.1.0-mvp",
    portableRoot: findPortableRoot() ?? null,
    inboxRoot: getInboxRoot(),
    outboxRoot: getOutboxRoot(),
  });
}
