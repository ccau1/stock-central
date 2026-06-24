import { useLayoutEffect, useRef, useState } from "react";
import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import type { CreditSpreadPoint } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";

export function CreditSpreadPanel({ title, refreshKey, onRefresh, onExpand, description }: PanelProps) {
  const { data, loading, error } = usePanelData(
    () => dataApi.getCreditSpread(),
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

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const chartW = chartSize.w || 300;
  const chartH = chartSize.h || 150;
  const padLeft = 32;
  const padRight = 4;
  const padTop = 6;
  const padBottom = 18;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const allValues = data?.length ? data.map((d: CreditSpreadPoint) => d.spread) : [0, 1];
  const minY = Math.min(...allValues);
  const maxY = Math.max(...allValues);
  const rangeY = maxY - minY || 1;

  const scaleX = (i: number) => padLeft + (i / ((data?.length || 1) - 1 || 1)) * plotW;
  const scaleY = (y: number) => padTop + ((maxY - y) / rangeY) * plotH;

  const pathD = data?.length
    ? data.map((d: CreditSpreadPoint, i: number) => `${i === 0 ? "M" : "L"} ${scaleX(i)} ${scaleY(d.spread)}`).join(" ")
    : "";
  const fillPath = data?.length
    ? `${pathD} L ${scaleX(data.length - 1)} ${chartH - padBottom} L ${scaleX(0)} ${chartH - padBottom} Z`
    : "";

  return (
    <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="h-full">
        {data && data.length > 0 ? (
          <div ref={chartRef} className="w-full h-full max-md:min-h-[200px]">
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
                    {val.toFixed(2)}%
                  </text>
                );
              })}

              {/* Axis lines */}
              <line x1={padLeft} y1={padTop} x2={padLeft} y2={chartH - padBottom} stroke="#e5e7eb" strokeWidth="0.5" />
              <line x1={padLeft} y1={chartH - padBottom} x2={chartW - padRight} y2={chartH - padBottom} stroke="#e5e7eb" strokeWidth="0.5" />

              {/* X-axis date labels */}
              {data && (
                <>
                  <text x={padLeft} y={chartH - 4} textAnchor="start" fontSize="6" fill="#9ca3af">
                    {new Date(data[0].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </text>
                  <text x={padLeft + plotW / 2} y={chartH - 4} textAnchor="middle" fontSize="6" fill="#9ca3af">
                    {new Date(data[Math.floor((data.length - 1) / 2)].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </text>
                  <text x={chartW - padRight} y={chartH - 4} textAnchor="end" fontSize="6" fill="#9ca3af">
                    {new Date(data[data.length - 1].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </text>
                </>
              )}

              {/* Area fill and line */}
              {fillPath && <path d={fillPath} fill="#f59e0b" opacity="0.15" />}
              {pathD && <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" />}
            </svg>
          </div>
        ) : (
          <PanelLoading />
        )}
      </div>
    </PanelContainer>
  );
}

export const creditSpreadPanel: PanelDefinition = {
  id: "credit-spread",
  name: "Credit Spread",
  description: "High-yield to investment-grade credit spread. Widening spreads indicate rising credit risk and often precede equity volatility.",
  categories: ["macro"],
  component: CreditSpreadPanel,
  filterConfig: { tickerMode: "none" },
};
