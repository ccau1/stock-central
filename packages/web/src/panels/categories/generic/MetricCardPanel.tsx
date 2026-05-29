import { Link } from "react-router-dom";
import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../../core";

export function MetricCardPanel({ title, tickers, inputs, refreshKey, onRefresh, description }: PanelProps) {
  const metric = inputs.metric || "price";
  const symbols = tickers ?? [];
  const { data, loading, error } = usePanelData(
    () => dataApi.getMetric(symbols.slice(0, 4), metric),
    [symbols, metric, refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      {data && (
        <div className="grid grid-cols-2 gap-2">
          {data.map((d) => (
            <div key={d.symbol} className="p-2 bg-gray-50 rounded border border-gray-100 text-center">
              <Link to={`/ticker/${d.symbol}`} className="text-[10px] text-gray-500 uppercase hover:text-blue-700 transition-colors">
                {d.symbol}
              </Link>
              <div className="text-sm font-bold text-gray-800">{d.label}</div>
            </div>
          ))}
        </div>
      )}
    </PanelContainer>
  );
}

export const metricCardPanel: PanelDefinition = {
  id: "metric-card",
  name: "Metric Card",
  description: "Display key metrics for selected tickers.",
  category: "generic",
  component: MetricCardPanel,
  filterConfig: { tickerMode: "enabled" },
};
