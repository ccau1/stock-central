import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../../core";
import ComparisonChart from "../../../components/ComparisonChart";

export function LineChartPanel({ title, tickers, inputs, refreshKey, onRefresh, description }: PanelProps) {
  const timeRange = inputs.timeRange || "1y";
  const symbols = tickers ?? [];
  const { data, loading, error } = usePanelData(
    () => dataApi.getPriceHistory(symbols.slice(0, 5), timeRange),
    [symbols, timeRange, refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      {data && <ComparisonChart data={data} symbols={symbols.slice(0, 5)} mode="price" />}
    </PanelContainer>
  );
}

export const lineChartPanel: PanelDefinition = {
  id: "line-chart",
  name: "Line Chart",
  description: "Raw price comparison across selected tickers overlaid in one chart. Hover for crosshair and detailed prices.",
  category: "generic",
  component: LineChartPanel,
  filterConfig: { tickerMode: "enabled" },
};
