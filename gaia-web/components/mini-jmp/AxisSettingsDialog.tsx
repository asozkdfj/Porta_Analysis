"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { stageBoundaryLines, newGuideLineId, DEFAULT_GUIDE_LINE_COLOR, GUIDE_LINE_COLOR_PRESETS } from "@/lib/mini-jmp-axis";
import type { MiniJmpAxisSettings, MiniJmpGuideLine } from "@/lib/mini-jmp-types";

interface AxisSettingsDialogProps {
  open: boolean;
  axis: "x" | "y";
  axisLabel: string;
  categorical: boolean;
  categories: string[];
  dataExtent?: { min: number; max: number };
  settings: MiniJmpAxisSettings;
  onApply: (settings: MiniJmpAxisSettings) => void;
  onClose: () => void;
}

function parseNum(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function GuideLineColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-slate-600 bg-slate-800 p-0.5"
          title="색상 선택"
        />
        <span
          className="inline-block h-0.5 flex-1 rounded"
          style={{
            background: `repeating-linear-gradient(90deg, ${value} 0 6px, transparent 6px 10px)`,
          }}
          title="점선 미리보기"
        />
        <span className="font-mono text-[10px] text-slate-400">{value}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {GUIDE_LINE_COLOR_PRESETS.map((preset) => (
          <button
            key={preset.color}
            type="button"
            title={preset.label}
            onClick={() => onChange(preset.color)}
            className="h-5 w-5 rounded border border-slate-600 hover:scale-110 transition-transform"
            style={{
              backgroundColor: preset.color,
              outline: value === preset.color ? "2px solid #fff" : undefined,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function AxisSettingsDialog({
  open,
  axis,
  axisLabel,
  categorical,
  categories,
  dataExtent,
  settings,
  onApply,
  onClose,
}: AxisSettingsDialogProps) {
  const [draft, setDraft] = useState(settings);
  const [minText, setMinText] = useState("");
  const [maxText, setMaxText] = useState("");
  const [linePos, setLinePos] = useState("");
  const [lineLabel, setLineLabel] = useState("");
  const [lineColor, setLineColor] = useState(DEFAULT_GUIDE_LINE_COLOR);
  const [pickCategory, setPickCategory] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraft(settings);
    setMinText(settings.range.min == null ? "" : String(settings.range.min));
    setMaxText(settings.range.max == null ? "" : String(settings.range.max));
    setLinePos("");
    setLineLabel("");
    setLineColor(DEFAULT_GUIDE_LINE_COLOR);
    setPickCategory("");
  }, [open, settings]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const axisName = axis === "x" ? "X" : "Y";
  const lineKind = axis === "x" ? "세로" : "가로";

  const addLine = (position: number, label?: string, color?: string) => {
    if (!Number.isFinite(position)) return;
    const line: MiniJmpGuideLine = {
      id: newGuideLineId(),
      position,
      label: label?.trim() || undefined,
      color: color ?? DEFAULT_GUIDE_LINE_COLOR,
    };
    setDraft((prev) => ({
      ...prev,
      guideLines: [...prev.guideLines, line].sort((a, b) => a.position - b.position),
    }));
  };

  const handleAddLine = () => {
    const pos = parseNum(linePos);
    if (pos == null) return;
    addLine(pos, lineLabel, lineColor);
    setLinePos("");
    setLineLabel("");
  };

  const handlePickCategory = () => {
    if (!pickCategory) return;
    const idx = categories.indexOf(pickCategory);
    if (idx < 0) return;
    addLine(idx - 0.5, pickCategory, lineColor);
    setPickCategory("");
  };

  const updateLine = (id: string, patch: Partial<MiniJmpGuideLine>) => {
    setDraft((prev) => ({
      ...prev,
      guideLines: prev.guideLines
        .map((g) => (g.id === id ? { ...g, ...patch } : g))
        .sort((a, b) => a.position - b.position),
    }));
  };

  const handleApply = () => {
    onApply({
      range: {
        min: parseNum(minText),
        max: parseNum(maxText),
      },
      guideLines: draft.guideLines,
    });
    onClose();
  };

  const handleReset = () => {
    setDraft({ range: { min: null, max: null }, guideLines: [] });
    setMinText("");
    setMaxText("");
  };

  const applyStagePreset = (stages: number) => {
    const lines = stageBoundaryLines(categories.length, stages);
    setDraft((prev) => ({
      ...prev,
      guideLines: lines,
    }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="axis-settings-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-slate-600 bg-slate-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <div>
            <h2 id="axis-settings-title" className="text-sm font-semibold text-slate-100">
              {axisName}축 설정
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{axisLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-4 py-3 space-y-4">
          <section className="space-y-2">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Range</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Min (비우면 자동)</span>
                <input
                  type="number"
                  step="any"
                  value={minText}
                  onChange={(e) => setMinText(e.target.value)}
                  placeholder={
                    dataExtent ? String(Math.round(dataExtent.min * 1000) / 1000) : "auto"
                  }
                  className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Max (비우면 자동)</span>
                <input
                  type="number"
                  step="any"
                  value={maxText}
                  onChange={(e) => setMaxText(e.target.value)}
                  placeholder={
                    dataExtent ? String(Math.round(dataExtent.max * 1000) / 1000) : "auto"
                  }
                  className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                />
              </label>
            </div>
            {categorical && (
              <p className="text-[10px] text-slate-500">
                카테고리 축: 0 ~ {Math.max(categories.length - 1, 0)} 인덱스. 경계선은 15.5처럼
                소수로 지정하면 카테고리 사이에 그려집니다.
              </p>
            )}
            {!categorical && dataExtent && (
              <p className="text-[10px] text-slate-500">
                데이터 범위: {dataExtent.min.toLocaleString()} ~ {dataExtent.max.toLocaleString()}
              </p>
            )}
          </section>

          <section className="space-y-2 border-t border-slate-700 pt-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">
              구분선 ({lineKind} 점선)
            </p>
            <p className="text-[10px] text-slate-500">
              {axis === "x"
                ? "X축: 세로 점선 — Stage·소켓 경계 등"
                : "Y축: 가로 점선 — 스펙 상·하한 등 (예: 49, 50, 51)"}
            </p>

            {axis === "x" && categorical && categories.length >= 4 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyStagePreset(4)}
                  className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
                >
                  4 Stage 구분
                </button>
                <button
                  type="button"
                  onClick={() => applyStagePreset(8)}
                  className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
                >
                  8 Stage 구분
                </button>
              </div>
            )}

            {categorical && categories.length > 0 && (
              <div className="flex gap-2">
                <select
                  value={pickCategory}
                  onChange={(e) => setPickCategory(e.target.value)}
                  className="min-w-0 flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs text-slate-100"
                >
                  <option value="">카테고리 경계 선택…</option>
                  {categories.map((c, i) => (
                    <option key={c} value={c}>
                      {i}: {c}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handlePickCategory}
                  disabled={!pickCategory}
                  className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-40"
                >
                  추가
                </button>
              </div>
            )}

            <div className="space-y-2 rounded border border-slate-700 bg-slate-800/30 p-2">
              <p className="text-[10px] text-slate-500">새 구분선</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  value={linePos}
                  onChange={(e) => setLinePos(e.target.value)}
                  placeholder={axis === "y" ? "Y값" : "X위치"}
                  className="w-24 rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                />
                <input
                  type="text"
                  value={lineLabel}
                  onChange={(e) => setLineLabel(e.target.value)}
                  placeholder="라벨 (선택)"
                  className="min-w-0 flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="rounded border border-blue-700 bg-blue-900/50 px-2 py-1 text-slate-100 hover:bg-blue-900"
                  title="구분선 추가"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <GuideLineColorPicker value={lineColor} onChange={setLineColor} />
            </div>

            {draft.guideLines.length === 0 ? (
              <p className="text-xs text-slate-500">구분선이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {draft.guideLines.map((line) => {
                  const color = line.color ?? DEFAULT_GUIDE_LINE_COLOR;
                  return (
                    <li
                      key={line.id}
                      className="rounded border border-slate-700 bg-slate-800/50 px-2 py-2 space-y-2"
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className="inline-block h-3 w-3 shrink-0 rounded-full border border-slate-600"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-mono text-slate-300">{line.position}</span>
                        {line.label && (
                          <span className="truncate text-slate-400">{line.label}</span>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              guideLines: prev.guideLines.filter((g) => g.id !== line.id),
                            }))
                          }
                          className="ml-auto rounded p-1 text-slate-500 hover:bg-slate-700 hover:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <GuideLineColorPicker
                        value={color}
                        onChange={(c) => updateLine(line.id, { color: c })}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-700 px-4 py-3">
          <button
            type="button"
            onClick={handleReset}
            className="mr-auto rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            초기화
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
}
