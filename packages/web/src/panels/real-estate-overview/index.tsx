import { TrendingUp, TrendingDown, Home, DollarSign, Package, Percent } from "lucide-react";
import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import type { RealEstateSeries } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";

function MetricCard({
  label,
  series,
  icon: Icon,
  format,
  invertColors,
}: {
  label: string;
  series: RealEstateSeries | null;
  icon: React.ElementType;
  format: "number" | "currency" | "percent" | "months";
  invertColors?: boolean;
}) {
  if (!series) {
    return (
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 flex flex-col justify-center h-full">
        <div className="text-[10px] text-gray-500 font-medium mb-1">{label}</div>
        <div className="text-xs text-gray-400">No data</div>
      </div>
    );
  }

  const formatValue = (v: number) => {
    if (format === "currency") return `$${v.toLocaleString()}`;
    if (format === "percent") return `${v.toFixed(2)}%`;
    if (format === "months") return `${v.toFixed(1)} mo`;
    return v.toLocaleString();
  };

  const up = series.change_mom >= 0;
  const colorClass = invertColors
    ? up
      ? "text-red-600"
      : "text-green-600"
    : up
    ? "text-green-600"
    : "text-red-600";
  const IconComponent = up ? TrendingUp : TrendingDown;

  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 flex flex-col justify-center h-full">
      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium mb-1">
        <Icon size={10} />
        {label}
      </div>
      <div className="text-xl font-bold text-gray-900">{formatValue(series.current)}</div>
      <div className={`text-[10px] font-medium mt-0.5 flex items-center gap-0.5 ${colorClass}`}>
        <IconComponent size={10} />
        {up ? "+" : ""}
        {series.change_mom.toFixed(2)}% MoM
      </div>
      <div className="text-[10px] text-gray-400 mt-0.5">YoY: {series.change_yoy >= 0 ? "+" : ""}{series.change_yoy.toFixed(2)}%</div>
    </div>
  );
}

export function RealEstateOverviewPanel({ title, refreshKey, onRefresh, onExpand, description }: PanelProps) {
  const { data, loading, error } = usePanelData(() => dataApi.getRealEstateUsOverview(), [refreshKey]);

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 h-full">
          <MetricCard label="Months of Inventory" series={data.inventory} icon={Package} format="months" invertColors />
          <MetricCard label="Existing Home Sales" series={data.sales} icon={Home} format="number" />
          <MetricCard label="Case-Shiller HPI" series={data.prices} icon={DollarSign} format="number" />
          <MetricCard label="30-Yr Mortgage Rate" series={data.mortgage} icon={Percent} format="percent" invertColors />
        </div>
      )}
    </PanelContainer>
  );
}

export const realEstateOverviewPanel: PanelDefinition = {
  id: "real-estate-overview",
  name: "U.S. Real Estate Overview",
  description: "Snapshot of U.S. housing inventory, sales, home prices, and mortgage rates sourced from FRED.",
  categories: ["real-estate"],
  component: RealEstateOverviewPanel,
  filterConfig: { tickerMode: "none" },
};
