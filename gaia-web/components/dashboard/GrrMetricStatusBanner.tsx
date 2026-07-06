"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GrrMetricStatusBannerProps {
  statusTitle: string;
  statusMessage: string;
  passed: boolean;
  warn?: boolean;
  specMissing?: boolean;
}

export function GrrMetricStatusBanner({
  statusTitle,
  statusMessage,
  passed,
  warn,
  specMissing,
}: GrrMetricStatusBannerProps) {
  const isWarn = warn || specMissing;

  return (
    <Card
      className={cn(
        "border-2",
        passed
          ? "border-emerald-300 bg-emerald-50"
          : isWarn
            ? "border-amber-300 bg-amber-50"
            : "border-red-300 bg-red-50"
      )}
    >
      <CardContent className="py-3 flex flex-wrap items-center gap-3">
        <Badge
          variant={passed ? "success" : specMissing ? "warning" : isWarn ? "warning" : "danger"}
          className="text-sm px-3 py-1"
        >
          {statusTitle}
        </Badge>
        <span
          className={cn(
            "text-sm font-semibold",
            passed ? "text-emerald-900" : isWarn ? "text-amber-900" : "text-red-900"
          )}
        >
          {statusMessage}
        </span>
      </CardContent>
    </Card>
  );
}
