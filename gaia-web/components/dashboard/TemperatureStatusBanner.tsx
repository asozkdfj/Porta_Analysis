import type { TemperatureVerdict } from "@/lib/temperature-tracking-types";
import { verdictStatusLabel } from "@/lib/temperature-tracking";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TemperatureStatusBannerProps {
  verdict: TemperatureVerdict;
  message: string;
}

export function TemperatureStatusBanner({
  verdict,
  message,
}: TemperatureStatusBannerProps) {
  return (
    <Card
      className={cn(
        "border-2",
        verdict === "pass" && "border-emerald-300 bg-emerald-50",
        verdict === "warning" && "border-amber-300 bg-amber-50",
        verdict === "fail" && "border-red-300 bg-red-50"
      )}
    >
      <CardContent className="py-4 flex flex-wrap items-center gap-3">
        <Badge
          variant={
            verdict === "pass"
              ? "success"
              : verdict === "warning"
                ? "warning"
                : "danger"
          }
          className="text-sm px-3 py-1"
        >
          {verdictStatusLabel(verdict)}
        </Badge>
        <span
          className={cn(
            "text-base font-semibold",
            verdict === "pass" && "text-emerald-900",
            verdict === "warning" && "text-amber-900",
            verdict === "fail" && "text-red-900"
          )}
        >
          {message}
        </span>
      </CardContent>
    </Card>
  );
}
