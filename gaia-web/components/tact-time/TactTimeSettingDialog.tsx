"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { FilePickButton } from "@/components/controls/FilePickButton";
import { TactTimeItemCard } from "@/components/tact-time/TactTimeItemCard";
import { useMarqueeSelection } from "@/components/tact-time/useMarqueeSelection";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getSnColor } from "@/lib/chart-colors";
import {
  tactTimeStationLabel,
  type TactTimeGroup,
  type TactTimeRow,
  type TactTimeStationId,
} from "@/lib/tact-time-types";

interface TactTimeSettingDialogProps {
  open: boolean;
  onClose: () => void;
  stationId: TactTimeStationId;
  rows: TactTimeRow[];
  groups: TactTimeGroup[];
  unassignedHeaders: string[];
  onCreateGroup: (name: string, headers: string[]) => string | null;
  onUpdateGroup: (
    groupId: string,
    patch: { name?: string; headers?: string[] }
  ) => string | null;
  onDeleteGroup: (groupId: string) => void;
  onAddItemsToGroup: (groupId: string, headers: string[]) => string | null;
  onRemoveItemFromGroup: (groupId: string, header: string) => void;
  onResetGroups: () => void;
  onExportSettings: () => void;
  onImportSettings: (file: File) => void | Promise<void>;
  onSaveDeployDefault?: () => Promise<string | null>;
}

export function TactTimeSettingDialog({
  open,
  onClose,
  stationId,
  rows,
  groups,
  unassignedHeaders,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onAddItemsToGroup,
  onRemoveItemFromGroup,
  onResetGroups,
  onExportSettings,
  onImportSettings,
  onSaveDeployDefault,
}: TactTimeSettingDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newGroupName, setNewGroupName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  const rowByHeader = new Map(rows.map((r) => [r.header, r]));

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setNewGroupName("");
      setFormError(null);
      setEditingGroupId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleSelectionChange = useCallback((next: Set<string>) => {
    setSelected(next);
    setFormError(null);
  }, []);

  const {
    containerRef,
    registerItemRef,
    marquee,
    marqueeDragging,
    onContainerPointerDown,
    onContainerPointerMove,
    onContainerPointerUp,
    onContainerPointerCancel,
  } = useMarqueeSelection({
    enabled: open,
    selected,
    onSelectionChange: handleSelectionChange,
  });

  const handleCreateGroup = () => {
    const err = onCreateGroup(newGroupName, [...selected]);
    if (err) {
      setFormError(err);
      return;
    }
    setSelected(new Set());
    setNewGroupName("");
    setFormError(null);
  };

  const handleDropOnGroup = (groupId: string, header: string) => {
    setDragOverGroupId(null);
    const err = onAddItemsToGroup(groupId, [header]);
    if (err) setFormError(err);
    else setFormError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(header);
      return next;
    });
  };

  const startRename = (group: TactTimeGroup) => {
    setEditingGroupId(group.id);
    setEditingName(group.name);
    setFormError(null);
  };

  const saveRename = () => {
    if (!editingGroupId) return;
    const err = onUpdateGroup(editingGroupId, { name: editingName });
    if (err) {
      setFormError(err);
      return;
    }
    setEditingGroupId(null);
    setEditingName("");
    setFormError(null);
  };

  if (!open) return null;

  const unassignedRows = unassignedHeaders
    .map((h) => rowByHeader.get(h))
    .filter((r): r is TactTimeRow => !!r);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden />
      <div
        role="dialog"
        aria-labelledby="tact-setting-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col rounded-lg border border-slate-300 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b px-5 py-4 shrink-0">
          <div>
            <h2 id="tact-setting-title" className="text-lg font-semibold">
              {tactTimeStationLabel(stationId)} · Tact Time Setting
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {tactTimeStationLabel(stationId)} 전용 그룹 설정 · localStorage에
              자동 저장 · CSV를 다시 불러와도 유지
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {formError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <section className="sticky top-0 z-10 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3 shadow-sm">
            <Label className="text-sm font-semibold">새 그룹 생성</Label>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => {
                    setNewGroupName(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="Group Name (예: SMU, Ranging, LIW)"
                  className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              {selected.size > 0 && (
                <span className="text-xs text-blue-600 font-medium whitespace-nowrap pb-2.5">
                  {selected.size}개 선택
                </span>
              )}
              <Button
                type="button"
                onClick={handleCreateGroup}
                disabled={selected.size === 0 || !newGroupName.trim()}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Group
              </Button>
            </div>
            {selected.size > 0 && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer select-none hover:text-slate-700">
                  선택 목록 보기
                </summary>
                <p className="mt-1 max-h-16 overflow-y-auto rounded border border-slate-200 bg-white px-2 py-1 font-mono text-[10px] text-slate-600 break-all leading-relaxed">
                  {[...selected].join(", ")}
                </p>
              </details>
            )}
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <Label className="text-sm font-semibold">
                  미할당 Items ({unassignedRows.length})
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  드래그하여 여러 개 선택 · Shift+드래그로 추가 선택 · 클릭으로
                  토글
                </p>
              </div>
              {selected.size > 0 && (
                <span className="text-xs text-blue-600 font-medium">
                  {selected.size}개 선택됨
                </span>
              )}
            </div>
            {unassignedRows.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-md border border-dashed px-4 py-6 text-center">
                모든 아이템이 그룹에 할당되었습니다.
              </p>
            ) : (
              <div
                ref={containerRef}
                className="relative flex flex-wrap gap-2 rounded-md border border-dashed border-slate-200 bg-slate-50/40 p-2 min-h-[120px] select-none touch-none"
                onPointerDown={onContainerPointerDown}
                onPointerMove={onContainerPointerMove}
                onPointerUp={onContainerPointerUp}
                onPointerCancel={onContainerPointerCancel}
              >
                {unassignedRows.map((row) => (
                  <div
                    key={row.header}
                    ref={(el) => registerItemRef(row.header, el)}
                    data-tact-header={row.header}
                    className="shrink-0"
                  >
                    <TactTimeItemCard
                      row={row}
                      selected={selected.has(row.header)}
                      draggable
                      suppressNativeDrag={marqueeDragging}
                      onDragStart={() => {}}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <Label className="text-sm font-semibold mb-3 block">
              저장된 Groups ({groups.length})
            </Label>
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-md border border-dashed px-4 py-6 text-center">
                아직 그룹이 없습니다. 아래에서 아이템을 선택하고 위에서 그룹을
                만드세요.
              </p>
            ) : (
              <div className="space-y-4">
                {groups.map((group, index) => (
                  <div
                    key={group.id}
                    className={cn(
                      "rounded-lg border-2 bg-white p-4 transition-colors",
                      dragOverGroupId === group.id
                        ? "border-blue-400 bg-blue-50/40"
                        : "border-slate-200"
                    )}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverGroupId(group.id);
                    }}
                    onDragLeave={() => setDragOverGroupId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      const header = e.dataTransfer.getData("text/tact-header");
                      if (header) handleDropOnGroup(group.id, header);
                    }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: getSnColor(index) }}
                        />
                        {editingGroupId === group.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="h-8 rounded border px-2 text-sm font-semibold"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={saveRename}
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingGroupId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <span className="font-semibold text-slate-900">
                            {group.name}
                          </span>
                        )}
                        <span className="text-xs font-mono text-muted-foreground">
                          {group.headers
                            .reduce(
                              (s, h) =>
                                s + (rowByHeader.get(h)?.durationMs ?? 0),
                              0
                            )
                            .toLocaleString()}{" "}
                          ms
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => startRename(group)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => onDeleteGroup(group.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.headers.map((header) => {
                        const row = rowByHeader.get(header);
                        if (!row) {
                          return (
                            <span
                              key={header}
                              className="inline-flex items-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-mono text-slate-600"
                              title="현재 CSV에 없는 Label — 설정은 유지됩니다"
                            >
                              {header}
                              <span className="ml-1.5 text-[10px] text-muted-foreground">
                                (파일 없음)
                              </span>
                              <button
                                type="button"
                                className="ml-2 text-red-500 hover:text-red-700"
                                onClick={() =>
                                  onRemoveItemFromGroup(group.id, header)
                                }
                                title="그룹에서 제거"
                              >
                                ×
                              </button>
                            </span>
                          );
                        }
                        return (
                          <div key={header} className="relative group">
                            <TactTimeItemCard
                              row={row}
                              compact
                              groupColor={getSnColor(index)}
                              draggable
                              onDragStart={() => {}}
                            />
                            <button
                              type="button"
                              className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-[10px]"
                              onClick={() =>
                                onRemoveItemFromGroup(group.id, header)
                              }
                              title="그룹에서 제거"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      미할당 카드를 여기로 드래그하여 추가
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="border-t px-5 py-3 flex flex-wrap items-center justify-between gap-2 shrink-0 bg-slate-50">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-red-600"
              onClick={() => {
                if (
                  confirm(
                    `${tactTimeStationLabel(stationId)}의 모든 그룹 설정을 초기화할까요?`
                  )
                ) {
                  onResetGroups();
                }
              }}
            >
              Reset All Groups
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onExportSettings();
                setSettingsMessage("설정 파일을 다운로드했습니다.");
              }}
            >
              설정보내기
            </Button>
            <FilePickButton
              variant="outline"
              size="sm"
              accept=".json,application/json"
              onPick={async (file) => {
                await onImportSettings(file);
                setSettingsMessage(`${file.name} 설정을 불러왔습니다.`);
              }}
            >
              설정 가져오기
            </FilePickButton>
            {onSaveDeployDefault && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  void onSaveDeployDefault().then((err) => {
                    setSettingsMessage(
                      err
                        ? err
                        : "public/tact-time-default-stations.json 저장됨 (배포용)"
                    );
                  });
                }}
              >
                배포용 기본값 저장
              </Button>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            {settingsMessage && (
              <p className="text-[10px] text-emerald-700">{settingsMessage}</p>
            )}
            <Button type="button" onClick={onClose}>
              Save &amp; Close
            </Button>
          </div>
        </div>
      </div>
      {marquee && (
        <div
          className="fixed z-[100] border-2 border-blue-500 bg-blue-500/15 pointer-events-none rounded-sm"
          style={{
            left: Math.min(marquee.x1, marquee.x2),
            top: Math.min(marquee.y1, marquee.y2),
            width: Math.abs(marquee.x2 - marquee.x1),
            height: Math.abs(marquee.y2 - marquee.y1),
          }}
        />
      )}
    </div>
  );
}
