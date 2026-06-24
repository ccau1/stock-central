import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";
import ComparisonChart from "../../components/ComparisonChart";

export function VixPanel({ title, refreshKey, onRefresh, onExpand, description }: PanelProps) {
  const { data, loading, error } = usePanelData(
    () => dataApi.getPriceHistory(["^VIX"], "1y"),
    [refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const vixPoints = data?.["^VIX"];
  const current = vixPoints && vixPoints.length > 0 ? vixPoints[vixPoints.length - 1].price : 0;
  const prev = vixPoints && vixPoints.length > 1 ? vixPoints[vixPoints.length - 2].price : current;
  const change = current - prev;

  let sentiment = "Normal";
  let sentimentColor = "text-gray-600";
  if (current > 30) {
    sentiment = "Extreme Fear";
    sentimentColor = "text-red-600";
  } else if (current > 20) {
    sentiment = "Fear";
    sentimentColor = "text-orange-500";
  } else if (current < 15) {
    sentiment = "Complacency";
    sentimentColor = "text-green-600";
  }

  return (
    <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="flex items-center gap-4 px-3 py-2 mb-1">
        <div>
          <div className="text-2xl font-bold text-gray-800">{current.toFixed(2)}</div>
        </div>
        <div className={`text-sm font-semibold ${change >= 0 ? "text-red-500" : "text-green-600"}`}>
          {change >= 0 ? "+" : ""}{change.toFixed(2)}
        </div>
        <div className={`text-sm font-semibold ${sentimentColor}`}>{sentiment}</div>
      </div>
      {data && <ComparisonChart data={data} symbols={["^VIX"]} mode="price" />}
    </PanelContainer>
  );
}

export const vixPanel: PanelDefinition = {
  id: "vix",
  name: "VIX",
  description: "CBOE Volatility Index (VIX) — a measure of market fear and expected volatility.",
  categories: ["macro"],
  component: VixPanel,
  filterConfig: { tickerMode: "none" },
  preview: () => import("./preview").then((m) => m.default),
};
