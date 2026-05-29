import { useLayoutEffect, useRef, useState } from "react";
import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../../core";

export function MarketBreadthPanel({ title, refreshKey, onRefresh, description }: PanelProps) {
  const { data, loading, error } = usePanelData(
    () => dataApi.getBreadth(),
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
  const padLeft = 32;
  const padRight = 4;
  const padTop = 6;
  const padBottom = 18;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const allValues = data ? [
    ...data.map((d: any) => d.price),
    ...data.filter((d: any) => d.ma_50 > 0).map((d: any) => d.ma_50),
    ...data.filter((d: any) => d.ma_200 > 0).map((d: any) => d.ma_200),
  ] : [];
  const minY = allValues.length ? Math.min(...allValues) : 0;
  const maxY = allValues.length ? Math.max(...allValues) : 1;
  const rangeY = maxY - minY || 1;

  const scaleX = (i: number) => padLeft + (i / ((data?.length || 1) - 1 || 1)) * plotW;
  const scaleY = (y: number) => padTop + ((maxY - y) / rangeY) * plotH;

  function buildPath(values: (number | null)[]) {
    let d = "";
    values.forEach((v, i) => {
      if (v === null || v === undefined) return;
      const cmd = d ? " L" : "M";
      d += `${cmd} ${scaleX(i)} ${scaleY(v)}`;
    });
    return d;
  }

  const pricePath = data ? buildPath(data.map((d: any) => d.price)) : "";
  const ma50Path = data ? buildPath(data.map((d: any) => (d.ma_50 > 0 ? d.ma_50 : null))) : "";
  const ma200Path = data ? buildPath(data.map((d: any) => (d.ma_200 > 0 ? d.ma_200 : null))) : "";

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="h-full flex flex-col">
        {data && data.length > 0 ? (
          <>
            <div className="flex items-center justify-center gap-4 px-3 py-1.5 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-[#374151]" />
                <span className="text-xs text-gray-600">S&amp;P 500</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-[#3b82f6]" />
                <span className="text-xs text-gray-600">50-day MA</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-[#ef4444]" />
                <span className="text-xs text-gray-600">200-day MA</span>
              </div>
            </div>
            <div ref={chartRef} className="flex-1 min-h-0 relative max-md:min-h-[200px]">
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-full">
                {/* Horizontal grid lines */}
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
                <text x={padLeft} y={chartH - 4} textAnchor="start" fontSize="6" fill="#9ca3af">
                  {new Date(data[0].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </text>
                <text x={padLeft + plotW / 2} y={chartH - 4} textAnchor="middle" fontSize="6" fill="#9ca3af">
                  {new Date(data[Math.floor((data.length - 1) / 2)].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </text>
                <text x={chartW - padRight} y={chartH - 4} textAnchor="end" fontSize="6" fill="#9ca3af">
                  {new Date(data[data.length - 1].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </text>

                {/* Data series */}
                <path d={pricePath} fill="none" stroke="#374151" strokeWidth="1.5" strokeLinejoin="round" />
                <path d={ma50Path} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round" />
                <path d={ma200Path} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
          </>
        ) : (
          <PanelLoading />
        )}
      </div>
    </PanelContainer>
  );
}

export const marketBreadthPanel: PanelDefinition = {
  id: "market-breadth",
  name: "Market Breadth",
  description: "S&P 500 price versus its 50-day and 200-day moving averages. Shows whether the market is trending above or below key support levels.",
  category: "macro",
  component: MarketBreadthPanel,
  filterConfig: { tickerMode: "none" },
};
