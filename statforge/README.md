# StatForge

Windows desktop statistical visualization app (Electron + React + TypeScript).
Layout and workflow are inspired by professional graph-builder tools; branding, icons, and assets are original. Product name: **StatForge**.

## Phase 1 status

Runnable Graph Builder with:

- Custom title bar: `{file} - Graph Builder - StatForge`
- Menu bar + dual toolbar (Lucide icons)
- CSV open via native dialog
- Virtualized column browser (search / sort / multi-select)
- Drop zones (Title, X, Y, Group X/Y, Wrap, Overlay, Color, Size, …)
- Scatter plot (Apache ECharts) for numeric X + Y
- Property panel (title, jitter, opacity, marker size, grid/legend)
- Light / dark theme, resizable panels
- Project save/load (`.statforge` JSON)
- Undo/Redo history scaffold
- Unit tests + Playwright smoke test

## Quick start

```bash
cd statforge
npm install
npm run dev
```

Other scripts:

```bash
npm test
npm run test:e2e
npm run build
```

Sample data: `resources/sample/sample_data.csv`

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Electron Main (src/main)                                    │
│  - BrowserWindow (frameless)                                │
│  - IPC: open/save dialogs, fs read/write, window controls   │
└───────────────────────────┬─────────────────────────────────┘
                            │ contextBridge (preload)
┌───────────────────────────▼─────────────────────────────────┐
│ Renderer (React)                                            │
│  TitleBar → MenuBar → Toolbar                               │
│  Left: ColumnBrowser + PropertyPanel                        │
│  Center: GraphBuilder DropZones + ECharts canvas            │
│  Stores: project / dataset / graph / selection / layout /   │
│          history / preference (Zustand)                     │
└─────────────────────────────────────────────────────────────┘
```

### Component tree (Phase 1)

```
App
├── TitleBar
├── MenuBar
├── Toolbar
├── workspace
│   ├── ColumnBrowser (virtual list + dnd-kit draggable)
│   ├── PropertyPanel
│   └── GraphBuilder
│       └── DropZoneCanvas
│           ├── RoleDropZone × N
│           └── GraphCanvas (scatter)
└── Notifications
```

### State model

- `Dataset`: column metadata + column-oriented `columnsData`
- `GraphConfig`: `elementType`, `roles`, `options`
- Selection: column ids + row indices
- Layout: panel sizes, theme, zoom
- History: up to 100 graph snapshots
- Preferences: notifications

### IPC

| Channel | Purpose |
|---|---|
| `dialog:open-data` | Native open data file |
| `dialog:open-project` | Open `.statforge` |
| `dialog:save-project` | Save dialog |
| `fs:write-text` / `fs:read-text` | Project IO |
| `window:*` | Minimize / maximize / close / title |

## Development plan

| Phase | Focus |
|---|---|
| **1** | Shell, CSV, columns, drop zones, scatter |
| **2** | Data table, hist/bar/line, color/size/overlay, richer undo |
| **3** | Faceting, box/violin/heatmap, export |
| **4** | XLSX/JSON/Parquet, DuckDB, packaging, full e2e |

## Packages (core)

Electron, React 19, TypeScript, Vite (`electron-vite`), Zustand, dnd-kit, ECharts, TanStack Virtual, Papa Parse, SheetJS (`xlsx`), Lucide, Vitest, Playwright, ESLint, Prettier.

## Folder structure

See `src/` and `tests/` as specified in the product brief.
