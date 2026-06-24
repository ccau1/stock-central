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
          <div className="text-[10px] text-gray-500">{series.frequency}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold text-gray-900">{series.current.toFixed(1)}</div>
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

function InventoryChart({ series }: { series: RealEstateSeries[] }) {
  const { ref, size } = useSvgContainerSize<HTMLDivElement>();

  const allValues = series.flatMap((s) => s.history.map((p) => p.value));
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
          const pathD = s.history
            .map((p, i) => {
              const x = pad + (i / (maxLen - 1 || 1)) * chartWidth;
              const y = pad + ((maxY - p.value) / (maxY - minY || 1)) * chartHeight;
              return `${i === 0 ? "M" : "L"} ${x} ${y}`;
            })
            .join(" ");
          return <path key={s.id} d={pathD} fill="none" stroke={color} strokeWidth="1.5" />;
        })}
      </svg>
    </div>
  );
}

export function RealEstateInventoryPanel({ title, refreshKey, onRefresh, onExpand, description }: PanelProps) {
  const { data, loading, error } = usePanelData(() => dataApi.getRealEstateUsInventory(), [refreshKey]);

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
          <InventoryChart series={data.series} />
        </div>
      )}
    </PanelContainer>
  );
}

export const realEstateInventoryPanel: PanelDefinition = {
  id: "real-estate-inventory",
  name: "U.S. Real Estate Inventory",
  description: "Months of inventory for existing and new U.S. homes, with month-over-month and year-over-year changes.",
  categories: ["real-estate"],
  component: RealEstateInventoryPanel,
  filterConfig: { tickerMode: "none" },
};
