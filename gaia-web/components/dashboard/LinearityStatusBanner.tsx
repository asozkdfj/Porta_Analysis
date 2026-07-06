import type { LinearityVerdict } from "@/lib/liw-linearity-types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LinearityStatusBannerProps {
  statusTitle: string;
  statusMessage: string;
  verdict: LinearityVerdict;
}

export function LinearityStatusBanner({
  statusTitle,
  statusMessage,
  verdict,
}: LinearityStatusBannerProps) {
  const isPass = verdict === "pass";

  return (
    <Card
      className={cn(
        "border-2",
        isPass
          ? "border-emerald-300 bg-emerald-50"
          : verdict === "data_missing"
            ? "border-amber-300 bg-amber-50"
            : "border-red-300 bg-red-50"
      )}
    >
      <CardContent className="py-4 flex flex-wrap items-center gap-3">
        <Badge
          variant={isPass ? "success" : "danger"}
          className="text-sm px-3 py-1"
        >
          {statusTitle}
        </Badge>
        <span
          className={cn(
            "text-base font-semibold",
            isPass ? "text-emerald-900" : "text-red-900"
          )}
        >
          {statusMessage}
        </span>
        {verdict === "emission_failure" && (
          <span className="text-xs text-red-700/80">
            선형성 분석 전 발광 실패로 판정되었습니다.
          </span>
        )}
        {verdict === "data_missing" && (
          <span className="text-xs text-amber-800/80">
            분석에 필요한 측정 데이터가 부족합니다.
          </span>
        )}
        {verdict === "non_linear" && (
          <span className="text-xs text-red-700/80">
            발광은 확인되었으나 선형성 기준 미달입니다.
          </span>
        )}
      </CardContent>
    </Card>
  );
}
