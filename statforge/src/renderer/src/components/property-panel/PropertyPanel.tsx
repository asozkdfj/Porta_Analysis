import { useGraphStore } from "@renderer/stores/graphStore";
import { ensureGraphConfig, type GraphLayerKind } from "@shared/schemas/types";

const LAYER_TITLES: Record<GraphLayerKind, string> = {
  points: "Points",
  smoother: "Smoother",
  lineOfFit: "Line of Fit",
  line: "Line",
};

export function PropertyPanel() {
  const raw = useGraphStore((s) => s.config);
  const config = ensureGraphConfig(raw);
  const setOptions = useGraphStore((s) => s.setOptions);
  const setLayerOptions = useGraphStore((s) => s.setLayerOptions);
  const active = config.activeLayer;
  const options = config.options;

  return (
    <div className="property-panel" aria-label="Graph properties">
      <h3>{LAYER_TITLES[active]}</h3>
      <div className="property-body">
        <div className="prop-row">
          <label htmlFor="titleText">Title</label>
          <input
            id="titleText"
            type="text"
            value={options.titleText}
            onChange={(e) => setOptions({ titleText: e.target.value })}
          />
        </div>
        <div className="prop-row">
          <label htmlFor="showGrid">Show Grid</label>
          <input
            id="showGrid"
            type="checkbox"
            checked={options.showGrid}
            onChange={(e) => setOptions({ showGrid: e.target.checked })}
          />
        </div>
        <div className="prop-row">
          <label htmlFor="showLegend">Show Legend</label>
          <input
            id="showLegend"
            type="checkbox"
            checked={options.showLegend}
            onChange={(e) => setOptions({ showLegend: e.target.checked })}
          />
        </div>
        <div className="prop-row">
          <label htmlFor="overlayBinCount">Overlay Bins</label>
          <input
            id="overlayBinCount"
            type="number"
            min={2}
            max={20}
            value={options.overlayBinCount}
            onChange={(e) => setOptions({ overlayBinCount: Number(e.target.value) })}
          />
        </div>

        {active === "points" ? (
          <>
            <div className="prop-row">
              <label htmlFor="pointsSummary">Summary Statistic</label>
              <select
                id="pointsSummary"
                value={options.points.summaryStatistic}
                onChange={(e) =>
                  setLayerOptions("points", {
                    summaryStatistic: e.target.value as typeof options.points.summaryStatistic,
                  })
                }
              >
                <option value="none">None</option>
                <option value="n">N</option>
                <option value="mean">Mean</option>
                <option value="median">Median</option>
                <option value="geometricMean">Geometric Mean</option>
                <option value="min">Min</option>
                <option value="max">Max</option>
                <option value="range">Range</option>
                <option value="sum">Sum</option>
                <option value="cumulativeSum">Cumulative Sum</option>
                <option value="pctTotal">% of Total</option>
                <option value="pctFactor">% of Factor</option>
                <option value="pctGrandTotal">% of Grand Total</option>
                <option value="stdDev">Std Dev</option>
                <option value="variance">Variance</option>
                <option value="stdErr">Std Err</option>
                <option value="iqr">Interquartile Range</option>
                <option value="mad">Median Absolute Deviation</option>
                <option value="q1">First Quartile</option>
                <option value="q3">Third Quartile</option>
              </select>
            </div>
            <div className="prop-row">
              <label htmlFor="pointsErrorInterval">Error Interval</label>
              <select
                id="pointsErrorInterval"
                value={options.points.errorInterval}
                onChange={(e) =>
                  setLayerOptions("points", {
                    errorInterval: e.target.value as typeof options.points.errorInterval,
                  })
                }
              >
                <option value="auto">Auto</option>
                <option value="none">None</option>
                <option value="range">Range</option>
                <option value="iqr">Interquartile Range</option>
                <option value="standardError">Standard Error</option>
                <option value="standardDeviation">Standard Deviation</option>
                <option value="confidenceInterval">Confidence Interval</option>
                <option value="mad">Median Absolute Deviation</option>
                <option value="customInterval">Custom Interval</option>
                <option value="twoWayInterval">Two-way Interval</option>
              </select>
            </div>
            <div className="prop-row">
              <label htmlFor="pointsIntervalStyle">Interval Style</label>
              <select
                id="pointsIntervalStyle"
                value={options.points.intervalStyle}
                onChange={(e) =>
                  setLayerOptions("points", {
                    intervalStyle: e.target.value as typeof options.points.intervalStyle,
                  })
                }
              >
                <option value="errorBar">Error Bar</option>
                <option value="band">Band</option>
              </select>
            </div>
            <div className="prop-row">
              <label htmlFor="pointsJitter">Jitter</label>
              <select
                id="pointsJitter"
                value={
                  options.points.jitter === "random" || options.points.jitter === "uniform"
                    ? "randomUniform"
                    : options.points.jitter === "normal"
                      ? "randomNormal"
                      : options.points.jitter === "centered"
                        ? "centeredGrid"
                        : options.points.jitter
                }
                onChange={(e) =>
                  setLayerOptions("points", {
                    jitter: e.target.value as typeof options.points.jitter,
                  })
                }
              >
                <option value="none">None</option>
                <option value="auto">Auto</option>
                <option value="randomUniform">Random Uniform</option>
                <option value="randomNormal">Random Normal</option>
                <option value="packed">Packed</option>
                <option value="centeredGrid">Centered Grid</option>
                <option value="positiveGrid">Positive Grid</option>
                <option value="densityRandom">Density Random</option>
              </select>
            </div>
            <div className="prop-row prop-row--with-value">
              <label htmlFor="pointsJitterLimit">Jitter Limit</label>
              <input
                id="pointsJitterLimit"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={options.points.jitterLimit}
                onChange={(e) =>
                  setLayerOptions("points", { jitterLimit: Number(e.target.value) })
                }
              />
              <span className="prop-value">{options.points.jitterLimit.toFixed(2)}</span>
            </div>
            <details className="prop-details">
              <summary>Variables</summary>
              <div className="prop-row">
                <label htmlFor="pointsOpacity">Opacity</label>
                <input
                  id="pointsOpacity"
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={options.points.opacity}
                  onChange={(e) =>
                    setLayerOptions("points", { opacity: Number(e.target.value) })
                  }
                />
              </div>
              <div className="prop-row">
                <label htmlFor="pointsMarkerSize">Marker Size</label>
                <input
                  id="pointsMarkerSize"
                  type="number"
                  min={2}
                  max={24}
                  value={options.points.markerSize}
                  onChange={(e) =>
                    setLayerOptions("points", { markerSize: Number(e.target.value) })
                  }
                />
              </div>
              <div className="prop-row">
                <label htmlFor="pointsMarkerShape">Marker Shape</label>
                <select
                  id="pointsMarkerShape"
                  value={options.points.markerShape}
                  onChange={(e) =>
                    setLayerOptions("points", {
                      markerShape: e.target.value as typeof options.points.markerShape,
                    })
                  }
                >
                  <option value="circle">Circle</option>
                  <option value="square">Square</option>
                  <option value="diamond">Diamond</option>
                  <option value="triangle">Triangle</option>
                </select>
              </div>
              <div className="prop-row">
                <label htmlFor="pointsApplyColor">Apply Color</label>
                <input
                  id="pointsApplyColor"
                  type="checkbox"
                  checked={options.points.applyColor}
                  onChange={(e) =>
                    setLayerOptions("points", { applyColor: e.target.checked })
                  }
                />
              </div>
              <div className="prop-row">
                <label htmlFor="pointsApplySize">Apply Size</label>
                <input
                  id="pointsApplySize"
                  type="checkbox"
                  checked={options.points.applySize}
                  onChange={(e) =>
                    setLayerOptions("points", { applySize: e.target.checked })
                  }
                />
              </div>
              <div className="prop-row">
                <label htmlFor="pointsApplyOverlay">Apply Overlay</label>
                <input
                  id="pointsApplyOverlay"
                  type="checkbox"
                  checked={options.points.applyOverlay}
                  onChange={(e) =>
                    setLayerOptions("points", { applyOverlay: e.target.checked })
                  }
                />
              </div>
            </details>
          </>
        ) : null}

        {active === "smoother" ? (
          <>
            <div className="prop-row">
              <label htmlFor="smoothMethod">Method</label>
              <select
                id="smoothMethod"
                value={options.smoother.method}
                onChange={(e) =>
                  setLayerOptions("smoother", {
                    method: e.target.value as typeof options.smoother.method,
                  })
                }
              >
                <option value="loess">LOESS</option>
                <option value="movingAverage">Moving Average</option>
              </select>
            </div>
            <div className="prop-row">
              <label htmlFor="span">Span</label>
              <input
                id="span"
                type="range"
                min={0.15}
                max={1}
                step={0.05}
                value={options.smoother.span}
                onChange={(e) =>
                  setLayerOptions("smoother", { span: Number(e.target.value) })
                }
              />
            </div>
            <div className="prop-row">
              <label htmlFor="windowSize">Window Size</label>
              <input
                id="windowSize"
                type="number"
                min={3}
                max={51}
                value={options.smoother.windowSize}
                onChange={(e) =>
                  setLayerOptions("smoother", { windowSize: Number(e.target.value) })
                }
              />
            </div>
            <div className="prop-row">
              <label htmlFor="smoothWidth">Line Width</label>
              <input
                id="smoothWidth"
                type="number"
                min={1}
                max={8}
                value={options.smoother.lineWidth}
                onChange={(e) =>
                  setLayerOptions("smoother", { lineWidth: Number(e.target.value) })
                }
              />
            </div>
          </>
        ) : null}

        {active === "lineOfFit" ? (
          <>
            <div className="prop-row">
              <label htmlFor="degree">Degree</label>
              <select
                id="degree"
                value={options.lineOfFit.degree}
                onChange={(e) =>
                  setLayerOptions("lineOfFit", {
                    degree: Number(e.target.value) as 1 | 2 | 3,
                  })
                }
              >
                <option value={1}>Linear</option>
                <option value={2}>Quadratic</option>
                <option value={3}>Cubic</option>
              </select>
            </div>
            <div className="prop-row">
              <label htmlFor="showEquation">Show Equation</label>
              <input
                id="showEquation"
                type="checkbox"
                checked={options.lineOfFit.showEquation}
                onChange={(e) =>
                  setLayerOptions("lineOfFit", { showEquation: e.target.checked })
                }
              />
            </div>
            <div className="prop-row">
              <label htmlFor="showR2">Show R²</label>
              <input
                id="showR2"
                type="checkbox"
                checked={options.lineOfFit.showR2}
                onChange={(e) =>
                  setLayerOptions("lineOfFit", { showR2: e.target.checked })
                }
              />
            </div>
            <div className="prop-row">
              <label htmlFor="fitWidth">Line Width</label>
              <input
                id="fitWidth"
                type="number"
                min={1}
                max={8}
                value={options.lineOfFit.lineWidth}
                onChange={(e) =>
                  setLayerOptions("lineOfFit", { lineWidth: Number(e.target.value) })
                }
              />
            </div>
          </>
        ) : null}

        {active === "line" ? (
          <>
            <div className="prop-row">
              <label htmlFor="lineSummary">Summary Statistic</label>
              <select
                id="lineSummary"
                value={options.line.summaryStatistic}
                onChange={(e) =>
                  setLayerOptions("line", {
                    summaryStatistic: e.target.value as typeof options.line.summaryStatistic,
                  })
                }
              >
                <option value="mean">Mean</option>
                <option value="median">Median</option>
                <option value="sum">Sum</option>
                <option value="count">Count</option>
                <option value="minimum">Minimum</option>
                <option value="maximum">Maximum</option>
                <option value="none">None (row order)</option>
              </select>
            </div>
            <div className="prop-row">
              <label htmlFor="sortOrder">Sort Order</label>
              <select
                id="sortOrder"
                value={options.line.sortOrder}
                onChange={(e) =>
                  setLayerOptions("line", {
                    sortOrder: e.target.value as typeof options.line.sortOrder,
                  })
                }
              >
                <option value="xAsc">X Ascending</option>
                <option value="xDesc">X Descending</option>
                <option value="rowOrder">Row Order</option>
              </select>
            </div>
            <div className="prop-row">
              <label htmlFor="lineWidth">Line Width</label>
              <input
                id="lineWidth"
                type="number"
                min={1}
                max={8}
                value={options.line.lineWidth}
                onChange={(e) =>
                  setLayerOptions("line", { lineWidth: Number(e.target.value) })
                }
              />
            </div>
            <div className="prop-row">
              <label htmlFor="showMarkers">Show Markers</label>
              <input
                id="showMarkers"
                type="checkbox"
                checked={options.line.showMarkers}
                onChange={(e) =>
                  setLayerOptions("line", { showMarkers: e.target.checked })
                }
              />
            </div>
            <div className="prop-row">
              <label htmlFor="connectNulls">Connect Missing</label>
              <input
                id="connectNulls"
                type="checkbox"
                checked={options.line.connectNulls}
                onChange={(e) =>
                  setLayerOptions("line", { connectNulls: e.target.checked })
                }
              />
            </div>
            <div className="prop-row">
              <label htmlFor="lineApplyColor">Split by Color</label>
              <input
                id="lineApplyColor"
                type="checkbox"
                checked={options.line.applyColor}
                onChange={(e) =>
                  setLayerOptions("line", { applyColor: e.target.checked })
                }
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
