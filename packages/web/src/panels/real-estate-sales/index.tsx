import { TrendingUp, TrendingDown } from "lucide-react";
import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import type { RealEstateSeries } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";
import { CHART_COLORS } from "../_core/constants";
import { useSvgContainerSize } from "../../hooks/useSvgContainerSize";

function SeriesRow({ series, color }: { series: RealEstateSeries; color: string }) {
  const up = series.change_mom >= 0;
  const TrendIcon = up ? TrendingUp : TrendingDown;
  const colorClass = up ? "text-green-600" : "text-red-600";

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <div>
          <div className="text-xs font-medium text-gray-900">{series.name}</div>
          <div className="text-[10px] text-gray-500">{series.unit}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold text-gray-900">{series.current.toLocaleString()}</div>
        <div className={`text-[10px] font-medium flex items-center justify-end gap-0.5 ${colorClass}`}>
          <TrendIcon size={10} />
          {up ? "+" : ""}
          {series.change_mom.toFixed(2)}% MoM
        </div>
        <div className="text-[10px] text-gray-400">YoY {series.change_yoy >= 0 ? "+" : ""}{series.change_yoy.toFixed(2)}%</div>
      </div>
    </div>
  );
}

function SalesChart({ series }: { series: RealEstateSeries[] }) {
  const { ref, size } = useSvgContainerSize<HTMLDivElement>();

  // Normalize each series to percent-change from its own start for comparison.
  const normalized = series.map((s) => {
    const base = s.history[0]?.value ?? 1;
    return s.history.map((p) => ((p.value - base) / base) * 100);
  });

  const allValues = normalized.flat();
  const minY = Math.min(...allValues);
  const maxY = Math.max(...allValues);
  const pad = 5;
  const chartWidth = Math.max(size.width - pad * 2, 10);
  const chartHeight = Math.max(size.height - pad * 2, 10);
  const maxLen = Math.max(...series.map((s) => s.history.length));

  return (
    <div ref={ref} className="flex-1 min-h-0 w-full">
      <svg width={size.width} height={size.height} className="overflow-visible">
        {series.map((s, idx) => {
          const color = CHART_COLORS[idx % CHART_COLORS.length];
          const pathD = normalized[idx]
            .map((v, i) => {
              const x = pad + (i / (maxLen - 1 || 1)) * chartWidth;
              const y = pad + ((maxY - v) / (maxY - minY || 1)) * chartHeight;
              return `${i === 0 ? "M" : "L"} ${x} ${y}`;
            })
            .join(" ");
          return <path key={s.id} d={pathD} fill="none" stroke={color} strokeWidth="1.5" />;
        })}
      </svg>
    </div>
  );
}

export function RealEstateSalesPanel({ title, refreshKey, onRefresh, onExpand, description }: PanelProps) {
  const { data, loading, error } = usePanelData(() => dataApi.getRealEstateUsSales(), [refreshKey]);

  if (loading && !data) {
    return (
      <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={true} description={description}>
        <PanelLoading />
      </PanelContainer>
    );
  }

  return (
    <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      {data && (
        <div className="flex flex-col h-full gap-3">
          <div>
            {data.series.map((s, idx) => (
              <SeriesRow key={s.id} series={s} color={CHART_COLORS[idx % CHART_COLORS.length]} />
            ))}
          </div>
          <SalesChart series={data.series} />
        </div>
      )}
    </PanelContainer>
  );
}

export const realEstateSalesPanel: PanelDefinition = {
  id: "real-estate-sales",
  name: "U.S. Real Estate Sales",
  description: "Existing and new U.S. home sales with month-over-month and year-over-year comparisons.",
  categories: ["real-estate"],
  component: RealEstateSalesPanel,
  filterConfig: { tickerMode: "none" },
};
