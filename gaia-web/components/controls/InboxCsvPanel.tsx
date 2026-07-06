"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FolderOpen, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InboxFileEntry, InboxModuleId } from "@/lib/inbox-types";
import { INBOX_MODULES } from "@/lib/inbox-types";

interface InboxCsvPanelProps {
  module: InboxModuleId;
  onLoad: (text: string, fileName: string) => void;
  loadedFileName?: string | null;
  compact?: boolean;
  /** tact-time: Station1 … Station8 */
  subdir?: string;
  /** tact-time: 1–8 (subdir보다 우선) */
  station?: number;
}

export function InboxCsvPanel({
  module,
  onLoad,
  loadedFileName,
  compact = false,
  subdir,
  station,
}: InboxCsvPanelProps) {
  const [files, setFiles] = useState<InboxFileEntry[]>([]);
  const [folder, setFolder] = useState("");
  const [modulePath, setModulePath] = useState("");
  const [inboxRoot, setInboxRoot] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = INBOX_MODULES[module];

  const querySuffix = useMemo(() => {
    if (module !== "tact-time") return "";
    if (station != null) return `?station=${station}`;
    if (subdir) return `?subdir=${encodeURIComponent(subdir)}`;
    return "";
  }, [module, station, subdir]);

  const parseInboxResponse = async <T,>(res: Response): Promise<T> => {
    const contentType = res.headers.get("content-type") ?? "";
    const raw = await res.text();

    if (!contentType.includes("application/json")) {
      if (raw.trimStart().startsWith("<!DOCTYPE") || raw.trimStart().startsWith("<html")) {
        throw new Error(
          "Inbox API가 JSON 대신 HTML을 반환했습니다. dev 서버를 재시작하거나(.next 삭제 후 npm run dev) 포터블 앱 server.js로 실행 중인지 확인하세요."
        );
      }
      throw new Error(
        raw.trim().slice(0, 120) || `Inbox API 응답 오류 (HTTP ${res.status})`
      );
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new Error("Inbox API JSON 파싱 실패");
    }
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/inbox/${module}${querySuffix}`, {
        cache: "no-store",
      });
      const data = await parseInboxResponse<{
        error?: string;
        files?: InboxFileEntry[];
        folder?: string;
        modulePath?: string;
        inboxRoot?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error ?? "Inbox 목록 조회 실패");
      setFiles(data.files ?? []);
      setFolder(data.folder ?? meta.folder);
      setModulePath(data.modulePath ?? "");
      setInboxRoot(data.inboxRoot ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Inbox 목록 조회 실패");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [module, meta.folder, querySuffix]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadFile = async (fileName: string) => {
    setLoading(true);
    setError(null);
    try {
      const fileQs = querySuffix
        ? `${querySuffix}&file=${encodeURIComponent(fileName)}`
        : `?file=${encodeURIComponent(fileName)}`;
      const res = await fetch(`/api/inbox/${module}${fileQs}`, {
        cache: "no-store",
      });
      const data = await parseInboxResponse<{
        error?: string;
        text?: string;
        fileName?: string;
      }>(res);
      if (!res.ok || !data.text) {
        throw new Error(data.error ?? "파일 읽기 실패");
      }
      onLoad(data.text, data.fileName ?? fileName);
    } catch (e) {
      setError(e instanceof Error ? e.message : "파일 읽기 실패");
    } finally {
      setLoading(false);
    }
  };

  const latest = files[0];

  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-slate-300 bg-slate-50/80",
        compact ? "p-2.5 space-y-2" : "p-3 space-y-3"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <FolderOpen className="h-3.5 w-3.5 shrink-0" />
            Inbox · {meta.label}
          </div>
          <p
            className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate"
            title={modulePath || inboxRoot}
          >
            {modulePath || `${inboxRoot ? `${inboxRoot}\\` : ""}${folder || meta.folder}\\`}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 shrink-0"
          onClick={() => void refresh()}
          disabled={loading}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground leading-snug">
        탐색기에서 CSV를 위 폴더에 복사한 뒤 아래에서 불러오세요. (브라우저
        업로드 불필요)
      </p>

      {error && (
        <p className="text-[11px] text-red-600 rounded border border-red-200 bg-red-50 px-2 py-1">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={loading || !latest}
          onClick={() => latest && void loadFile(latest.name)}
        >
          최신 파일 불러오기
        </Button>
      </div>

      {files.length > 0 ? (
        <ul className="max-h-32 overflow-y-auto space-y-1">
          {files.map((f) => {
            const active = loadedFileName === f.name;
            return (
              <li key={f.name}>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void loadFile(f.name)}
                  className={cn(
                    "w-full text-left rounded-md border px-2 py-1.5 text-xs transition-colors",
                    active
                      ? "border-slate-400 bg-white"
                      : "border-transparent hover:border-slate-200 hover:bg-white/80"
                  )}
                >
                  <div className="font-mono truncate">{f.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {(f.size / 1024).toFixed(1)} KB ·{" "}
                    {new Date(f.modifiedAt).toLocaleString("ko-KR")}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        !loading && (
          <p className="text-[11px] text-muted-foreground text-center py-2">
            폴더에 CSV가 없습니다.
          </p>
        )
      )}
    </div>
  );
}
