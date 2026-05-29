import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../../core";
import ComparisonChart from "../../../components/ComparisonChart";

export function ComparisonChartPanel({ title, tickers, inputs, refreshKey, onRefresh, description }: PanelProps) {
  const timeRange = inputs.timeRange || "1y";
  const symbols = tickers ?? [];
  const { data, loading, error } = usePanelData(
    () => dataApi.getPriceHistory(symbols, timeRange),
    [symbols.join(","), timeRange, refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      {data && <ComparisonChart data={data} symbols={symbols} />}
    </PanelContainer>
  );
}

export const comparisonChartPanel: PanelDefinition = {
  id: "comparison-chart",
  name: "% Changes",
  description: "Percentage price change comparison across selected tickers.",
  category: "comparison",
  component: ComparisonChartPanel,
  filterConfig: { tickerMode: "enabled", injectTimeRange: true },
};
