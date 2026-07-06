"use client";

import { ANALYSIS_GROUPS, GROUP_LABELS } from "@/lib/groups";
import {
  metricFilterSourceLabel,
  type MetricFilterSource,
} from "@/lib/grr-metric-policy";
import { GRR_NAVIGATION_SHORTCUTS } from "@/hooks/useGrrNavigationShortcuts";
import type { AnalysisGroup } from "@/lib/types";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ControlPanelProps {
  group: AnalysisGroup;
  onGroupChange: (g: AnalysisGroup) => void;
  metrics: string[];
  metric: string;
  onMetricChange: (m: string) => void;
  sockets: string[];
  referenceSocket: string;
  onReferenceSocketChange: (s: string) => void;
  serials: string[];
  serialFilter: string;
  onSerialFilterChange: (s: string) => void;
  liwBranch: "all" | "50C" | "20C";
  onLiwBranchChange: (b: "all" | "50C" | "20C") => void;
  metricFilterSource?: MetricFilterSource | null;
  disabled?: boolean;
}

const GROUPS: AnalysisGroup[] = ANALYSIS_GROUPS;

export function ControlPanel({
  group,
  onGroupChange,
  metrics,
  metric,
  onMetricChange,
  sockets,
  referenceSocket,
  onReferenceSocketChange,
  serials,
  serialFilter,
  onSerialFilterChange,
  liwBranch,
  onLiwBranchChange,
  metricFilterSource,
  disabled,
}: ControlPanelProps) {
  return (
    <div className="space-y-5">
      <div>
        <Label className="mb-2 block">분석 그룹</Label>
        <Tabs
          value={group}
          onValueChange={(v) => onGroupChange(v as AnalysisGroup)}
        >
          <TabsList className="grid w-full grid-cols-2 gap-1 h-auto p-1 sm:grid-cols-3 lg:grid-cols-4">
            {GROUPS.map((g) => (
              <TabsTrigger key={g} value={g} disabled={disabled} className="text-xs sm:text-sm">
                {g}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <p className="mt-2 text-xs text-muted-foreground">{GROUP_LABELS[group]}</p>
      </div>

      {group === "LIW" && (
        <div>
          <Label className="mb-2 block">LIW 온도 분기</Label>
          <Tabs
            value={liwBranch}
            onValueChange={(v) => onLiwBranchChange(v as "all" | "50C" | "20C")}
          >
            <TabsList>
              <TabsTrigger value="all" disabled={disabled}>
                전체
              </TabsTrigger>
              <TabsTrigger value="50C" disabled={disabled}>
                LIW 50C
              </TabsTrigger>
              <TabsTrigger value="20C" disabled={disabled}>
                LIW 20C
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      <div>
        <Label className="mb-2 block">Metric (Reference Test Item)</Label>
        <Select
          value={metric || undefined}
          onValueChange={onMetricChange}
          disabled={disabled || metrics.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="항목 선택" />
          </SelectTrigger>
          <SelectContent>
            {metrics.map((m) => (
              <SelectItem key={m} value={m}>
                <span className="truncate max-w-[280px] block">{m}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-xs text-muted-foreground">
          Reference 매칭: {metrics.length}개
          {metricFilterSource && ` · ${metricFilterSourceLabel(metricFilterSource)}`}
        </p>
      </div>

      <div>
        <Label className="mb-2 block">기준 소켓 (Reference)</Label>
        <Select
          value={referenceSocket || undefined}
          onValueChange={onReferenceSocketChange}
          disabled={disabled || sockets.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="소켓 선택" />
          </SelectTrigger>
          <SelectContent>
            {sockets.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="mb-2 block">SerialNumber</Label>
        <Select
          value={serialFilter}
          onValueChange={onSerialFilterChange}
          disabled={disabled || serials.length === 0}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체</SelectItem>
            {serials.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground space-y-0.5">
        <p className="font-medium text-slate-600">단축키</p>
        <p>Metric — {GRR_NAVIGATION_SHORTCUTS.metricPrev} / {GRR_NAVIGATION_SHORTCUTS.metricNext}</p>
        <p>소켓 — {GRR_NAVIGATION_SHORTCUTS.socketPrev} / {GRR_NAVIGATION_SHORTCUTS.socketNext}</p>
      </div>
    </div>
  );
}
