import { useLayoutEffect, useRef, useState } from "react";
import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../../core";

export function ValuationPanel({ title, refreshKey, onRefresh, description }: PanelProps) {
  const { data, loading, error } = usePanelData(
    () => dataApi.getValuation(),
    [refreshKey]
  );

  const chartRef = useRef<HTMLDivElement>(null);
  const [chartSize, setChartSize] = useState({ w: 300, h: 150 });

  useLayoutEffect(() => {
    if (!chartRef.current) return;
    const el = chartRef.current;
    setChartSize({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setChartSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [data]);

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const chartW = chartSize.w || 300;
  const chartH = chartSize.h || 150;
  const padLeft = 36;
  const padRight = 4;
  const padTop = 6;
  const padBottom = 18;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const history = data?.history ?? [];
  const prices = history.map((d) => d.price);
  const mas = history.filter((d) => d.ma_200 > 0).map((d) => d.ma_200);

  const allValues = [...prices, ...mas];
  const minY = allValues.length ? Math.min(...allValues) : 0;
  const maxY = allValues.length ? Math.max(...allValues) : 1;
  const rangeY = maxY - minY || 1;

  const scaleX = (i: number) => padLeft + (i / ((history.length || 1) - 1 || 1)) * plotW;
  const scaleY = (y: number) => padTop + ((maxY - y) / rangeY) * plotH;

  function buildPath(values: number[]) {
    let d = "";
    values.forEach((v, i) => {
      if (v === 0) return;
      const cmd = d ? " L" : "M";
      d += `${cmd} ${scaleX(i)} ${scaleY(v)}`;
    });
    return d;
  }

  const pricePath = buildPath(history.map((d) => d.price));
  const maPath = buildPath(history.map((d) => d.ma_200));

  const premium = data?.premium ?? 0;
  const premiumColor = premium > 20 ? "text-red-600" : premium > 10 ? "text-amber-600" : premium > 0 ? "text-green-600" : "text-blue-600";
  const forwardPE = data?.forward_pe ?? 0;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="h-full flex flex-col">
        {/* Metrics */}
        <div className="flex items-center gap-4 px-1 mb-1">
          <div>
            <div className="text-[10px] text-gray-400">vs 200-day MA</div>
            <div className={`text-sm font-bold ${premiumColor}`}>
              {premium >= 0 ? "+" : ""}{premium.toFixed(1)}%
            </div>
          </div>
          {forwardPE > 0 && (
            <div>
              <div className="text-[10px] text-gray-400">Forward P/E</div>
              <div className="text-sm font-bold text-gray-700">{forwardPE.toFixed(1)}x</div>
            </div>
          )}
          <div>
            <div className="text-[10px] text-gray-400">Current</div>
            <div className="text-sm font-bold text-gray-700">{data?.current?.toLocaleString() ?? "—"}</div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 px-2 py-0.5 mb-1">
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-[#374151]" />
            <span className="text-[10px] text-gray-500">S&amp;P 500</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-[#3b82f6]" />
            <span className="text-[10px] text-gray-500">200-day MA</span>
          </div>
        </div>

        {/* Chart */}
        {history.length > 0 ? (
          <div ref={chartRef} className="flex-1 min-h-0 relative">
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-full">
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                const y = padTop + t * plotH;
                return <line key={t} x1={padLeft} y1={y} x2={chartW - padRight} y2={y} stroke="#f3f4f6" strokeWidth="0.5" />;
              })}

              {/* Y-axis labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                const val = maxY - t * rangeY;
                const y = padTop + t * plotH;
                return (
                  <text key={t} x={padLeft - 3} y={y + 3} textAnchor="end" fontSize="6" fill="#9ca3af">
                    {Math.round(val).toLocaleString()}
                  </text>
                );
              })}

              {/* Axis lines */}
              <line x1={padLeft} y1={padTop} x2={padLeft} y2={chartH - padBottom} stroke="#e5e7eb" strokeWidth="0.5" />
              <line x1={padLeft} y1={chartH - padBottom} x2={chartW - padRight} y2={chartH - padBottom} stroke="#e5e7eb" strokeWidth="0.5" />

              {/* X-axis date labels */}
              {history.length > 0 && (
                <>
                  <text x={padLeft} y={chartH - 4} textAnchor="start" fontSize="6" fill="#9ca3af">
                    {new Date(history[0].date).toLocaleDateString(undefined, { month: "short", year: "2-digit" })}
                  </text>
                  <text x={padLeft + plotW / 2} y={chartH - 4} textAnchor="middle" fontSize="6" fill="#9ca3af">
                    {new Date(history[Math.floor((history.length - 1) / 2)].date).toLocaleDateString(undefined, { month: "short", year: "2-digit" })}
                  </text>
                  <text x={chartW - padRight} y={chartH - 4} textAnchor="end" fontSize="6" fill="#9ca3af">
                    {new Date(history[history.length - 1].date).toLocaleDateString(undefined, { month: "short", year: "2-digit" })}
                  </text>
                </>
              )}

              {/* Data series */}
              <path d={maPath} fill="none" stroke="#3b82f6" strokeWidth="1.2" strokeLinejoin="round" />
              <path d={pricePath} fill="none" stroke="#374151" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
        ) : (
          <PanelLoading />
        )}
      </div>
    </PanelContainer>
  );
}

export const valuationPanel: PanelDefinition = {
  id: "valuation",
  name: "Valuation",
  description: "S&P 500 price versus its 200-day moving average with forward P/E. Large premiums above the long-term trend suggest elevated valuations.",
  category: "macro",
  component: ValuationPanel,
  filterConfig: { tickerMode: "none" },
};
