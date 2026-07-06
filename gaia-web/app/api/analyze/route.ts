import { NextRequest, NextResponse } from "next/server";
import { parseGaiaCsv } from "@/lib/csv-parser";
import { parseGaiaSpecConfig } from "@/lib/gaia-spec-config";
import { analyzeGaiaGrr } from "@/lib/grr-calculator";
import type { AnalysisGroup, AnalyzeRequest } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AnalyzeRequest & { configText?: string };
    const { csvText, group, metricHeader, referenceSocket, serialFilter, configText } = body;

    if (!csvText || !group || !metricHeader) {
      return NextResponse.json(
        { error: "csvText, group, metricHeader는 필수입니다." },
        { status: 400 }
      );
    }

    const parsed = parseGaiaCsv(csvText);
    const specStore = configText ? parseGaiaSpecConfig(configText) : null;
    const result = analyzeGaiaGrr(parsed, group as AnalysisGroup, metricHeader, {
      referenceSocket,
      serialFilter,
      specStore,
    });

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "분석 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
