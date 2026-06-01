import { useLayoutEffect, useRef, useState } from "react";
import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../../core";

function computeDrawdown(points: { date: string; price: number }[]) {
  let peak = points[0]?.price ?? 0;
  return points.map((p) => {
    if (p.price > peak) peak = p.price;
    const dd = peak !== 0 ? ((p.price - peak) / peak) * 100 : 0;
    return { date: p.date, drawdown: dd };
  });
}

export function DrawdownPanel({ title, tickers, inputs, refreshKey, onRefresh, description }: PanelProps) {
  const timeRange = inputs.timeRange || "1y";
  const symbols = tickers ?? [];
  const { data, loading, error } = usePanelData(
    () => dataApi.getPriceHistory(symbols, timeRange),
    [symbols.join(","), timeRange, refreshKey]
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

  const validSymbols = symbols.filter((s) => data && data[s] && data[s].length > 1);

  if (validSymbols.length === 0) {
    return (
      <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
        {error && <PanelError message={error} />}
        <div className="text-xs text-gray-400">No price data available</div>
      </PanelContainer>
    );
  }

  const chartW = chartSize.w || 300;
  const chartH = chartSize.h || 150;
  const padLeft = 40;
  const padRight = 4;
  const padTop = 6;
  const padBottom = 18;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"];

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div ref={chartRef} className="flex-1 min-h-0 relative max-md:min-h-[200px]">
        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-full">
          {/* Find global min for Y scale */}
          {(() => {
            let minDD = 0;
            validSymbols.forEach((sym) => {
              const dd = computeDrawdown(data![sym]);
              dd.forEach((d) => { if (d.drawdown < minDD) minDD = d.drawdown; });
            });
            const range = Math.max(Math.abs(minDD), 1);

            const scaleX = (i: number, len: number) => padLeft + (i / (len - 1 || 1)) * plotW;
            const scaleY = (v: number) => padTop + ((0 - v) / range) * plotH;

            return (
              <>
                {/* Grid lines */}
                {[0, -range * 0.25, -range * 0.5, -range * 0.75, -range].map((val, i) => {
                  const y = scaleY(val);
                  return (
                    <g key={i}>
                      <line x1={padLeft} y1={y} x2={chartW - padRight} y2={y} stroke="#f3f4f6" strokeWidth="0.5" />
                      <text x={padLeft - 4} y={y + 3} textAnchor="end" fontSize="6" fill="#9ca3af">
                        {val.toFixed(0)}%
                      </text>
                    </g>
                  );
                })}

                {/* Zero line */}
                <line x1={padLeft} y1={scaleY(0)} x2={chartW - padRight} y2={scaleY(0)} stroke="#e5e7eb" strokeWidth="0.5" />
                <line x1={padLeft} y1={padTop} x2={padLeft} y2={chartH - padBottom} stroke="#e5e7eb" strokeWidth="0.5" />
                <line x1={padLeft} y1={chartH - padBottom} x2={chartW - padRight} y2={chartH - padBottom} stroke="#e5e7eb" strokeWidth="0.5" />

                {/* Data */}
                {validSymbols.map((sym, idx) => {
                  const dd = computeDrawdown(data![sym]);
                  const color = colors[idx % colors.length];
                  let d = "";
                  dd.forEach((pt, i) => {
                    const x = scaleX(i, dd.length);
                    const y = scaleY(pt.drawdown);
                    d += `${i === 0 ? "M" : "L"} ${x} ${y}`;
                  });
                  const areaD = `${d} L ${scaleX(dd.length - 1, dd.length)} ${scaleY(0)} L ${scaleX(0, dd.length)} ${scaleY(0)} Z`;
                  return (
                    <g key={sym} opacity={0.7}>
                      <path d={areaD} fill={color} opacity={0.15} />
                      <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
                    </g>
                  );
                })}

                {/* X labels */}
                {validSymbols.length > 0 && (() => {
                  const dd = computeDrawdown(data![validSymbols[0]]);
                  if (dd.length === 0) return null;
                  return (
                    <>
                      <text x={padLeft} y={chartH - 4} textAnchor="start" fontSize="6" fill="#9ca3af">
                        {new Date(dd[0].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </text>
                      <text x={padLeft + plotW / 2} y={chartH - 4} textAnchor="middle" fontSize="6" fill="#9ca3af">
                        {new Date(dd[Math.floor(dd.length / 2)].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </text>
                      <text x={chartW - padRight} y={chartH - 4} textAnchor="end" fontSize="6" fill="#9ca3af">
                        {new Date(dd[dd.length - 1].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </text>
                    </>
                  );
                })()}
              </>
            );
          })()}
        </svg>
      </div>
      <div className="flex flex-wrap gap-2 mt-1 px-1">
        {validSymbols.map((sym, i) => (
          <span key={sym} className="text-[10px] font-medium flex items-center gap-1" style={{ color: colors[i % colors.length] }}>
            <span className="w-2 h-0.5 rounded-sm inline-block" style={{ backgroundColor: colors[i % colors.length] }} />
            {sym}
          </span>
        ))}
      </div>
    </PanelContainer>
  );
}

export const drawdownPanel: PanelDefinition = {
  id: "drawdown",
  name: "Drawdown",
  description: "Running peak-to-trough drawdown over the selected time range.",
  category: "generic",
  component: DrawdownPanel,
  filterConfig: { tickerMode: "enabled", injectTimeRange: true },
};
