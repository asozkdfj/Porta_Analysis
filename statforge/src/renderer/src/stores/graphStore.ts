import { create } from "zustand";
import {
  createDefaultGraphConfig,
  ensureGraphConfig,
  type ColumnRef,
  type GraphConfig,
  type GraphElementType,
  type GraphLayerKind,
  type GraphOptions,
  type RoleKey,
} from "@shared/schemas/types";
import type {
  AxisConfig,
  AxisId,
  GraphAxisConfig,
} from "@shared/schemas/axis";
import { ensureAxisConfig, ensureGraphAxes } from "@shared/schemas/axis";

const SINGLE_SLOT: RoleKey[] = ["overlay", "color", "size", "title"];

interface GraphState {
  config: GraphConfig;
  setElementType: (elementType: GraphElementType) => void;
  toggleLayer: (kind: GraphLayerKind, exclusive?: boolean) => void;
  setActiveLayer: (kind: GraphLayerKind) => void;
  setOptions: (patch: Partial<GraphOptions>) => void;
  setLayerOptions: <K extends "points" | "smoother" | "lineOfFit" | "line">(
    kind: K,
    patch: Partial<GraphOptions[K]>
  ) => void;
  setAxis: (axisId: AxisId, axis: AxisConfig) => void;
  patchAxis: (axisId: AxisId, patch: Partial<AxisConfig>) => void;
  replaceAxes: (axes: GraphAxisConfig) => void;
  assignRole: (role: RoleKey, ref: ColumnRef, index?: number) => void;
  removeFromRole: (role: RoleKey, columnId: string) => void;
  moveWithinRole: (role: RoleKey, fromIndex: number, toIndex: number) => void;
  moveAcrossRoles: (
    fromRole: RoleKey,
    toRole: RoleKey,
    columnId: string,
    toIndex?: number
  ) => void;
  resetRoles: () => void;
  replaceConfig: (config: GraphConfig) => void;
}

function withSingleLayer(kind: GraphLayerKind, config: GraphConfig): GraphConfig {
  return {
    ...config,
    elementType: kind,
    activeLayer: kind,
    layers: config.layers.map((l) => ({
      ...l,
      enabled: l.kind === kind,
    })),
  };
}

export const useGraphStore = create<GraphState>((set, get) => ({
  config: createDefaultGraphConfig(),
  setElementType: (elementType) => {
    const config = ensureGraphConfig(get().config);
    if (
      elementType === "points" ||
      elementType === "line" ||
      elementType === "smoother" ||
      elementType === "lineOfFit"
    ) {
      set({ config: withSingleLayer(elementType, config) });
      return;
    }
    set({ config: { ...config, elementType } });
  },
  toggleLayer: (kind, exclusive) => {
    const config = ensureGraphConfig(get().config);
    // JMP Graph Builder: elements combine by default (Points + Line, etc.).
    // Shift+click = show only this element.
    if (exclusive) {
      set({ config: withSingleLayer(kind, config) });
      return;
    }

    const target = config.layers.find((l) => l.kind === kind);
    const isOn = Boolean(target?.enabled);

    // Already on but not focused → only select for the property panel (do not turn off).
    // That avoids "Line highlighted + Points properties" when switching focus.
    if (isOn && config.activeLayer !== kind) {
      set({
        config: {
          ...config,
          activeLayer: kind,
          elementType: kind,
        },
      });
      return;
    }

    // Off → turn on + focus. On + already focused → turn off (keep ≥1 layer).
    const layers = config.layers.map((l) =>
      l.kind === kind ? { ...l, enabled: !l.enabled } : l
    );
    const enabled = layers.filter((l) => l.enabled);
    if (enabled.length === 0) {
      set({
        config: {
          ...config,
          layers: layers.map((l) =>
            l.kind === kind ? { ...l, enabled: true } : l
          ),
          activeLayer: kind,
          elementType: kind,
        },
      });
      return;
    }
    const nextActive = layers.find((l) => l.kind === kind)?.enabled
      ? kind
      : enabled[0]!.kind;
    set({
      config: {
        ...config,
        layers,
        activeLayer: nextActive,
        elementType: nextActive,
      },
    });
  },
  setActiveLayer: (kind) =>
    set({
      config: { ...ensureGraphConfig(get().config), activeLayer: kind },
    }),
  setOptions: (patch) =>
    set({
      config: {
        ...ensureGraphConfig(get().config),
        options: { ...ensureGraphConfig(get().config).options, ...patch },
      },
    }),
  setLayerOptions: (kind, patch) => {
    const config = ensureGraphConfig(get().config);
    set({
      config: {
        ...config,
        options: {
          ...config.options,
          [kind]: { ...config.options[kind], ...patch },
        },
        activeLayer: kind,
      },
    });
  },
  setAxis: (axisId, axis) => {
    const config = ensureGraphConfig(get().config);
    const nextAxis = ensureAxisConfig(axisId, axis);
    const axes = { ...config.axes, [axisId]: nextAxis };
    const options = { ...config.options };
    if (axisId === "x") {
      options.logX = nextAxis.scale.scaleType === "log";
      options.xAxisTitle = nextAxis.appearance.title;
      options.showGrid =
        nextAxis.appearance.showGrid || config.axes.y.appearance.showGrid;
    } else {
      options.logY = nextAxis.scale.scaleType === "log";
      options.yAxisTitle = nextAxis.appearance.title;
      options.showGrid =
        config.axes.x.appearance.showGrid || nextAxis.appearance.showGrid;
    }
    set({ config: { ...config, axes, options } });
  },
  patchAxis: (axisId, patch) => {
    const config = ensureGraphConfig(get().config);
    const current = config.axes[axisId];
    const merged = ensureAxisConfig(axisId, {
      ...current,
      ...patch,
      scale: { ...current.scale, ...patch.scale },
      appearance: { ...current.appearance, ...patch.appearance },
      referenceLines: patch.referenceLines ?? current.referenceLines,
    });
    get().setAxis(axisId, merged);
  },
  replaceAxes: (axes) => {
    const config = ensureGraphConfig(get().config);
    const next = ensureGraphAxes(axes);
    set({
      config: {
        ...config,
        axes: next,
        options: {
          ...config.options,
          logX: next.x.scale.scaleType === "log",
          logY: next.y.scale.scaleType === "log",
          xAxisTitle: next.x.appearance.title,
          yAxisTitle: next.y.appearance.title,
          showGrid: next.x.appearance.showGrid || next.y.appearance.showGrid,
        },
      },
    });
  },
  assignRole: (role, ref, index) => {
    const config = ensureGraphConfig(get().config);
    if (role === "title") {
      set({
        config: {
          ...config,
          options: { ...config.options, titleText: ref.name },
          roles: { ...config.roles, title: [ref] },
        },
      });
      return;
    }
    if (SINGLE_SLOT.includes(role)) {
      set({
        config: {
          ...config,
          roles: { ...config.roles, [role]: [ref] },
        },
      });
      return;
    }
    if (role === "interval") {
      const list = [...config.roles.interval].filter(
        (r) => r.columnId !== ref.columnId
      );
      if (list.length >= 2) {
        list[list.length - 1] = ref;
      } else if (typeof index === "number") list.splice(index, 0, ref);
      else list.push(ref);
      set({
        config: {
          ...config,
          roles: { ...config.roles, interval: list.slice(0, 2) },
        },
      });
      return;
    }
    const list = [...config.roles[role]].filter((r) => r.columnId !== ref.columnId);
    if (typeof index === "number") list.splice(index, 0, ref);
    else list.push(ref);

    // Adding a second+ Y: clear any manual Y zoom so each stacked panel can autoscale
    const resetYScale =
      role === "y" &&
      list.length > 1 &&
      config.axes.y.scale.rangeMode === "manual";

    set({
      config: {
        ...config,
        roles: { ...config.roles, [role]: list },
        ...(resetYScale
          ? {
              axes: {
                ...config.axes,
                y: {
                  ...config.axes.y,
                  scale: {
                    ...config.axes.y.scale,
                    rangeMode: "auto",
                    minimum: null,
                    maximum: null,
                  },
                },
              },
            }
          : {}),
      },
    });
  },
  removeFromRole: (role, columnId) => {
    const config = ensureGraphConfig(get().config);
    set({
      config: {
        ...config,
        roles: {
          ...config.roles,
          [role]: config.roles[role].filter((r) => r.columnId !== columnId),
        },
      },
    });
  },
  moveWithinRole: (role, fromIndex, toIndex) => {
    const config = ensureGraphConfig(get().config);
    const list = [...config.roles[role]];
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= list.length ||
      toIndex >= list.length
    ) {
      return;
    }
    const [item] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, item);
    set({
      config: {
        ...config,
        roles: { ...config.roles, [role]: list },
      },
    });
  },
  moveAcrossRoles: (fromRole, toRole, columnId, toIndex) => {
    if (fromRole === toRole) return;
    const config = ensureGraphConfig(get().config);
    const fromList = [...config.roles[fromRole]];
    const idx = fromList.findIndex((r) => r.columnId === columnId);
    if (idx < 0) return;
    const [item] = fromList.splice(idx, 1);

    let toList: ColumnRef[];
    if (SINGLE_SLOT.includes(toRole) || toRole === "title") {
      toList = [item];
    } else if (toRole === "interval") {
      toList = [...config.roles.interval].filter((r) => r.columnId !== columnId);
      if (toList.length >= 2) toList[toList.length - 1] = item;
      else if (typeof toIndex === "number") toList.splice(toIndex, 0, item);
      else toList.push(item);
      toList = toList.slice(0, 2);
    } else {
      toList = [...config.roles[toRole]].filter((r) => r.columnId !== columnId);
      if (typeof toIndex === "number") toList.splice(toIndex, 0, item);
      else toList.push(item);
    }

    const nextRoles = {
      ...config.roles,
      [fromRole]: fromList,
      [toRole]: toList,
    };
    const nextOptions =
      toRole === "title"
        ? { ...config.options, titleText: item.name }
        : config.options;

    const resetYScale =
      toRole === "y" &&
      toList.length > 1 &&
      config.axes.y.scale.rangeMode === "manual";

    set({
      config: {
        ...config,
        options: nextOptions,
        roles: nextRoles,
        ...(resetYScale
          ? {
              axes: {
                ...config.axes,
                y: {
                  ...config.axes.y,
                  scale: {
                    ...config.axes.y.scale,
                    rangeMode: "auto",
                    minimum: null,
                    maximum: null,
                  },
                },
              },
            }
          : {}),
      },
    });
  },
  resetRoles: () => {
    const fresh = createDefaultGraphConfig();
    set({ config: { ...fresh, id: get().config.id } });
  },
  replaceConfig: (config) => set({ config: ensureGraphConfig(config) }),
}));
