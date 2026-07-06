import { useMemo } from "react";
import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";
import { useSvgContainerSize } from "../../hooks/useSvgContainerSize";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

function formatBillion(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}T`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}T`;
  return `${value.toFixed(0)}B`;
}

function MoneySupplyChart({ series }: { series: import("../../lib/api").MoneySupplySeries[] }) {
  const { ref, size } = useSvgContainerSize(600, 240);

  const activeSeries = useMemo(
    () => series.filter((s) => !s.error && s.history.length > 1),
    [series]
  );

  if (activeSeries.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-[10px] text-gray-400">No chart data</div>;
  }

  const chartW = size.width || 600;
  const chartH = size.height || 240;
  const padLeft = 48;
  const padRight = 12;
  const padTop = 8;
  const padBottom = 28;
  const plotW = Math.max(chartW - padLeft - padRight, 1);
  const plotH = Math.max(chartH - padTop - padBottom, 1);

  // Build combined date index from all active histories.
  const dateSet = new Set<string>();
  for (const s of activeSeries) {
    for (const p of s.history) dateSet.add(p.date);
  }
  const dates = Array.from(dateSet).sort();
  const dateIdx = new Map(dates.map((d, i) => [d, i]));

  let minY = Infinity;
  let maxY = -Infinity;
  for (const s of activeSeries) {
    for (const p of s.history) {
      minY = Math.min(minY, p.value);
      maxY = Math.max(maxY, p.value);
    }
  }
  if (!isFinite(minY) || !isFinite(maxY)) {
    minY = 0;
    maxY = 1;
  }
  const rangeY = maxY - minY || 1;

  const scaleX = (i: number) => padLeft + (i / (dates.length - 1 || 1)) * plotW;
  const scaleY = (y: number) => padTop + ((maxY - y) / rangeY) * plotH;

  const paths = activeSeries.map((s, idx) => {
    let d = "";
    let first = true;
    for (const p of s.history) {
      const i = dateIdx.get(p.date);
      if (i === undefined) continue;
      const x = scaleX(i);
      const y = scaleY(p.value);
      d += first ? `M ${x} ${y}` : ` L ${x} ${y}`;
      first = false;
    }
    return { color: COLORS[idx % COLORS.length], d, name: s.id };
  });

  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const xTicks = [0, Math.floor((dates.length - 1) / 2), dates.length - 1];

  return (
    <div ref={ref} className="flex-1 min-h-0 relative">
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-full">
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
              {formatBillion(val)}
            </text>
          );
        })}

        {/* X-axis labels */}
        {xTicks.map((i) => {
          const date = dates[i];
          if (!date) return null;
          return (
            <text
              key={`x-${i}`}
              x={scaleX(i)}
              y={chartH - 8}
              textAnchor={i === 0 ? "start" : i === dates.length - 1 ? "end" : "middle"}
              fontSize="7"
              fill="#9ca3af"
            >
              {new Date(date).toLocaleDateString(undefined, { month: "short", year: "2-digit" })}
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

        {/* Series lines */}
        {paths.map(
          (p) =>
            p.d && (
              <path
                key={p.name}
                d={p.d}
                fill="none"
                stroke={p.color}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )
        )}
      </svg>
    </div>
  );
}

export function MoneySupplyPanel({ title, refreshKey, onRefresh, onExpand, description }: PanelProps) {
  const { data, loading, error } = usePanelData(() => dataApi.getMoneySupply(120), [refreshKey]);

  const series = data?.series ?? [];
  const activeSeries = series.filter((s) => !s.error);

  if (loading && !data) {
    return (
      <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading description={description}>
        <PanelLoading />
      </PanelContainer>
    );
  }

  return (
    <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="h-full flex flex-col">
        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          {series.map((s, idx) => {
            const color = COLORS[idx % COLORS.length];
            if (s.error) {
              return (
                <div key={s.id} className="bg-gray-50 rounded p-2">
                  <div className="text-[10px] text-gray-400">{s.name}</div>
                  <div className="text-xs text-gray-400 truncate" title={s.error}>
                    Unavailable
                  </div>
                </div>
              );
            }
            return (
              <div key={s.id} className="bg-gray-50 rounded p-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[10px] text-gray-500">{s.name}</span>
                </div>
                <div className="text-lg font-bold text-gray-800">{formatBillion(s.current)}</div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className={s.change_yoy >= 0 ? "text-green-600" : "text-red-600"}>
                    {s.change_yoy >= 0 ? "+" : ""}
                    {s.change_yoy.toFixed(1)}% YoY
                  </span>
                  {s.change_mom !== 0 && (
                    <span className={s.change_mom >= 0 ? "text-green-500" : "text-red-500"}>
                      {s.change_mom >= 0 ? "+" : ""}
                      {s.change_mom.toFixed(1)}% MoM
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Chart */}
        {activeSeries.length > 0 ? (
          <MoneySupplyChart series={series} />
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

export const moneySupplyPanel: PanelDefinition = {
  id: "money-supply",
  name: "Money Supply",
  description:
    "M1, M2, and M3 money supply from the Federal Reserve. M1 is the most liquid (cash + checking), M2 adds savings and small time deposits, and M3 is the broadest measure tracked by the Fed (discontinued as an official target in 2006). M4 is not published by the Fed.",
  categories: ["macro"],
  component: MoneySupplyPanel,
  filterConfig: { tickerMode: "none" },
};
