import { useLayoutEffect, useRef, useState } from "react";
import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, renderSvgLine, usePanelData } from "../../core";

export function CreditSpreadPanel({ title, refreshKey, onRefresh, description }: PanelProps) {
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

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const w = chartSize.w || 300;
  const h = chartSize.h || 150;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="h-full">
        {data && data.length > 0 ? (
          <div ref={chartRef} className="w-full h-full max-md:min-h-[200px]">
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
              {renderSvgLine(data.map((d: any, i: number) => ({ x: i, y: d.spread })), w, h, "#f59e0b", true)}
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
  category: "macro",
  component: CreditSpreadPanel,
  filterConfig: { tickerMode: "none" },
};
