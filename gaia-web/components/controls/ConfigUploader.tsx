"use client";

import { FileCheck, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilePickButton } from "@/components/controls/FilePickButton";
import { InboxCsvPanel } from "@/components/controls/InboxCsvPanel";
import { Label } from "@/components/ui/label";

interface ConfigUploaderProps {
  fileName: string | null;
  version: string | null;
  itemCount: number;
  appliedAt: number | null;
  isUserConfig?: boolean;
  onLoad: (text: string, name: string) => void;
  onReloadDefault?: () => void;
  showInbox?: boolean;
}

function formatAppliedAt(ts: number | null): string | null {
  if (!ts) return null;
  return new Date(ts).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function ConfigUploader({
  fileName,
  version,
  itemCount,
  appliedAt,
  isUserConfig = false,
  onLoad,
  onReloadDefault,
  showInbox = true,
}: ConfigUploaderProps) {
  const handleFile = async (file: File) => {
    const text = await file.text();
    onLoad(text, file.name);
  };

  const appliedLabel = formatAppliedAt(appliedAt);

  return (
    <div className="space-y-2">
      <Label>GaiaStat2grrConfig (GrrConfig)</Label>
      <div className="flex flex-wrap gap-2">
        <FilePickButton variant="outline" size="sm" onPick={handleFile}>
          <Upload className="h-4 w-4" />
          Config 업로드
        </FilePickButton>
        {onReloadDefault && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReloadDefault}
            title="inbox/config 또는 번들 기본 Config 다시 로드"
          >
            <RefreshCw className="h-4 w-4" />
            기본 Config
          </Button>
        )}
      </div>
      {fileName && (
        <div
          className={`flex items-start gap-2 text-xs rounded-md border px-2.5 py-2 ${
            isUserConfig
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-slate-200 bg-slate-50 text-muted-foreground"
          }`}
        >
          <FileCheck
            className={`h-4 w-4 shrink-0 mt-0.5 ${
              isUserConfig ? "text-emerald-600" : "text-slate-500"
            }`}
          />
          <div className="min-w-0">
            <div className="font-medium truncate" title={fileName}>
              {fileName}
              {isUserConfig && " · 업로드 적용 중"}
            </div>
            {version && <div>버전: {version}</div>}
            <div>등록 Item: {itemCount}개</div>
            {appliedLabel && (
              <div className={isUserConfig ? "text-emerald-700" : undefined}>
                Spec 적용: {appliedLabel}
              </div>
            )}
            {isUserConfig && (
              <div className="text-emerald-700">브라우저에 저장됨 · 새로고침 후에도 유지</div>
            )}
          </div>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground leading-snug">
        업로드 즉시 GRR Stdev / Limit / Upper·Lower ERS가 반영됩니다. 업로드 Config는 브라우저에
        저장되어 다음 방문 시에도 유지됩니다.
      </p>
      {showInbox && (
        <InboxCsvPanel
          module="config"
          onLoad={onLoad}
          loadedFileName={fileName}
          compact
        />
      )}
    </div>
  );
}
