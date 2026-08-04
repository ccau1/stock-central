import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";
import { useSvgContainerSize } from "../../hooks/useSvgContainerSize";

// Rough rule-of-thumb thresholds for the Buffett Indicator.
const THRESHOLDS = [
  { value: 70, label: "Undervalued", color: "#10b981" },
  { value: 100, label: "Fair value", color: "#3b82f6" },
  { value: 120, label: "Overvalued", color: "#f59e0b" },
  { value: 150, label: "Significantly overvalued", color: "#ef4444" },
];

function getSignal(current: number): { label: string; color: string } {
  if (current < 70) return THRESHOLDS[0];
  if (current < 100) return THRESHOLDS[1];
  if (current < 120) return THRESHOLDS[2];
  return THRESHOLDS[3];
}

function MarketCapToGdpChart({ history }: { history: import("../../lib/api").BuffettIndicatorPoint[] }) {
  const { ref, size } = useSvgContainerSize(600, 240);

  const chartW = size.width || 600;
  const chartH = size.height || 240;
  const padLeft = 40;
  const padRight = 12;
  const padTop = 8;
  const padBottom = 28;
  const plotW = Math.max(chartW - padLeft - padRight, 1);
  const plotH = Math.max(chartH - padTop - padBottom, 1);

  const values = history.map((h) => h.value);
  let minY = Math.min(...values, 70);
  let maxY = Math.max(...values, 120);
  minY = Math.floor(minY / 10) * 10;
  maxY = Math.ceil(maxY / 10) * 10;
  const rangeY = maxY - minY || 1;

  const scaleX = (i: number) => padLeft + (i / (history.length - 1 || 1)) * plotW;
  const scaleY = (y: number) => padTop + ((maxY - y) / rangeY) * plotH;

  let pathD = "";
  history.forEach((p, i) => {
    const x = scaleX(i);
    const y = scaleY(p.value);
    pathD += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  });

  const fairValueY = scaleY(100);
  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const xTicks = [0, Math.floor((history.length - 1) / 2), history.length - 1];

  return (
    <div ref={ref} className="flex-1 min-h-0 relative">
      <svg viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none" className="w-full h-full">
        {/* Grid lines */}
        {yTicks.map((t) => {
          const y = padTop + t * plotH;
          return (
            <line
              key={t}
              x1={padLeft}
              y1={y}
              x2={chartW - padRight}
              y2={y}
              stroke="#f3f4f6"
              strokeWidth="1"
            />
          );
        })}

        {/* Fair value reference line at 100% */}
        {fairValueY >= padTop && fairValueY <= chartH - padBottom && (
          <line
            x1={padLeft}
            y1={fairValueY}
            x2={chartW - padRight}
            y2={fairValueY}
            stroke="#3b82f6"
            strokeWidth="0.5"
            strokeDasharray="3,3"
            opacity="0.5"
          />
        )}

        {/* Y-axis labels */}
        {yTicks.map((t) => {
          const val = maxY - t * rangeY;
          const y = padTop + t * plotH;
          return (
            <text
              key={`y-${t}`}
              x={padLeft - 4}
              y={y + 3}
              textAnchor="end"
              fontSize="7"
              fill="#9ca3af"
            >
              {val.toFixed(0)}%
            </text>
          );
        })}

        {/* X-axis labels */}
        {xTicks.map((i) => {
          const point = history[i];
          if (!point) return null;
          return (
            <text
              key={`x-${i}`}
              x={scaleX(i)}
              y={chartH - 8}
              textAnchor={i === 0 ? "start" : i === history.length - 1 ? "end" : "middle"}
              fontSize="7"
              fill="#9ca3af"
            >
              {new Date(point.date).toLocaleDateString(undefined, { year: "numeric" })}
            </text>
          );
        })}

        {/* Axis lines */}
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={chartH - padBottom} stroke="#e5e7eb" strokeWidth="1" />
        <line
          x1={padLeft}
          y1={chartH - padBottom}
          x2={chartW - padRight}
          y2={chartH - padBottom}
          stroke="#e5e7eb"
          strokeWidth="1"
        />

        {/* Area under the line */}
        {pathD && (
          <path
            d={`${pathD} L ${scaleX(history.length - 1)} ${chartH - padBottom} L ${scaleX(0)} ${chartH - padBottom} Z`}
            fill="rgba(59, 130, 246, 0.08)"
          />
        )}

        {/* Indicator line */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  );
}

export function MarketCapToGdpPanel({ title, refreshKey, onRefresh, onExpand, description }: PanelProps) {
  const { data, loading, error } = usePanelData(() => dataApi.getBuffettIndicator(40), [refreshKey]);

  if (loading && !data) {
    return (
      <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading description={description}>
        <PanelLoading />
      </PanelContainer>
    );
  }

  const current = data?.current ?? 0;
  const signal = getSignal(current);
  const history = data?.history ?? [];

  return (
    <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="h-full flex flex-col">
        {/* Main metric */}
        <div className="flex items-end gap-3 px-1 mb-2">
          <div>
            <div className="text-[10px] text-gray-400">Current Ratio</div>
            <div className="text-2xl font-bold text-gray-800">{current.toFixed(1)}%</div>
          </div>
          <div className="text-[10px] pb-1">
            <span className="px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: signal.color }}>
              {signal.label}
            </span>
          </div>
          {data?.current_date && (
            <div className="ml-auto text-[10px] text-gray-400 pb-1">
              {new Date(data.current_date).toLocaleDateString(undefined, { year: "numeric", month: "short" })}
            </div>
          )}
        </div>

        {/* Legend / thresholds */}
        <div className="flex flex-wrap gap-2 px-1 mb-2">
          {THRESHOLDS.map((t) => (
            <div key={t.label} className="flex items-center gap-1 text-[9px] text-gray-500">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
              {t.label}
            </div>
          ))}
        </div>

        {/* Chart */}
        {history.length > 0 ? (
          <MarketCapToGdpChart history={history} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-[10px] text-gray-400">
            No data available
          </div>
        )}

        {data?.source && <div className="text-[9px] text-gray-400 text-right mt-1">{data.source}</div>}
      </div>
    </PanelContainer>
  );
}

export const marketCapToGdpPanel: PanelDefinition = {
  id: "market-cap-to-gdp",
  name: "Buffett Indicator (Market Cap / GDP)",
  description:
    "Total US stock market capitalization divided by GDP. A long-term valuation gauge popularized by Warren Buffett. Readings near or below 100% are generally considered fair value, while sustained levels above 120% suggest the market may be expensive relative to economic output. Data is annual from the World Bank and typically lags by a few years.",
  categories: ["macro"],
  component: MarketCapToGdpPanel,
  filterConfig: { tickerMode: "none" },
};
