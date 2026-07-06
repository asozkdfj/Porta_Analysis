import { NextRequest, NextResponse } from "next/server";
import {
  parseGaiaSpecConfig,
  validateGaiaSpecConfig,
  validateMetricCoverage,
} from "@/lib/gaia-spec-config";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      configText: string;
      metrics?: string[];
    };

    if (!body.configText) {
      return NextResponse.json({ error: "configText는 필수입니다." }, { status: 400 });
    }

    const store = parseGaiaSpecConfig(body.configText);
    const validation = validateGaiaSpecConfig(store);
    const coverage = body.metrics?.length
      ? validateMetricCoverage(body.metrics, store)
      : null;

    return NextResponse.json({ validation, coverage, version: store.version });
  } catch (e) {
    const message = e instanceof Error ? e.message : "검증 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
