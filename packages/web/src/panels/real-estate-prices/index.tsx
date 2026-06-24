import { TrendingUp, TrendingDown } from "lucide-react";
import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import type { RealEstateSeries } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";
import { CHART_COLORS } from "../_core/constants";
import { useSvgContainerSize } from "../../hooks/useSvgContainerSize";

function SeriesRow({ series, color }: { series: RealEstateSeries; color: string }) {
  const up = series.change_yoy >= 0;
  const TrendIcon = up ? TrendingUp : TrendingDown;
  const colorClass = up ? "text-green-600" : "text-red-600";

  const formatCurrent = (v: number) => {
    if (series.unit === "$") return `$${v.toLocaleString()}`;
    return v.toLocaleString();
  };

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
        <div className="text-sm font-semibold text-gray-900">{formatCurrent(series.current)}</div>
        <div className={`text-[10px] font-medium flex items-center justify-end gap-0.5 ${colorClass}`}>
          <TrendIcon size={10} />
          YoY {up ? "+" : ""}
          {series.change_yoy.toFixed(2)}%
        </div>
        <div className="text-[10px] text-gray-400">MoM {series.change_mom >= 0 ? "+" : ""}{series.change_mom.toFixed(2)}%</div>
      </div>
    </div>
  );
}

function PricesChart({ series }: { series: RealEstateSeries[] }) {
  const { ref, size } = useSvgContainerSize<HTMLDivElement>();

  // Normalize to percent change from each series start so indices and dollar values are comparable.
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

export function RealEstatePricesPanel({ title, refreshKey, onRefresh, onExpand, description }: PanelProps) {
  const { data, loading, error } = usePanelData(() => dataApi.getRealEstateUsPrices(), [refreshKey]);

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {data.series.map((s, idx) => (
              <SeriesRow key={s.id} series={s} color={CHART_COLORS[idx % CHART_COLORS.length]} />
            ))}
          </div>
          <PricesChart series={data.series} />
        </div>
      )}
    </PanelContainer>
  );
}

export const realEstatePricesPanel: PanelDefinition = {
  id: "real-estate-prices",
  name: "U.S. Real Estate Prices",
  description: "Year-over-year home price changes across Case-Shiller, FHFA, median, and average U.S. sales price measures from FRED.",
  categories: ["real-estate"],
  component: RealEstatePricesPanel,
  filterConfig: { tickerMode: "none" },
};
