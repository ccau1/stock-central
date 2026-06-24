import { Link } from "react-router-dom";
import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";

export function DividendYieldPanel({ title, tickers, refreshKey, onRefresh, onExpand, description }: PanelProps) {
  const symbols = tickers ?? [];
  const { data, loading, error } = usePanelData(
    () => dataApi.getMetric(symbols, "dividend_yield"),
    [symbols, refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const maxYield = Math.max(...(data?.map((d) => d.value) || [1]), 0.1);
  const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  return (
    <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="space-y-3">
        {data?.map((d, i) => (
          <div key={d.symbol}>
            <div className="flex items-center gap-2 mb-0.5">
              <Link to={`/ticker/${d.symbol}`} className="w-12 text-xs font-semibold text-gray-700 hover:text-blue-700 transition-colors">
                {d.symbol}
              </Link>
              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min((d.value / maxYield) * 100, 100)}%`,
                    backgroundColor: colors[i % colors.length],
                  }}
                />
              </div>
              <div className="w-12 text-xs font-bold text-gray-700 text-right">{d.label}</div>
            </div>
          </div>
        ))}
        {data?.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-4">No dividend data available.</div>
        )}
      </div>
    </PanelContainer>
  );
}

export const dividendYieldPanel: PanelDefinition = {
  id: "dividend-yield",
  name: "Dividend Yield",
  description: "Compare dividend yields across selected tickers.",
  categories: ["generic"],
  component: DividendYieldPanel,
  filterConfig: { tickerMode: "enabled" },
  preview: () => import("./preview").then((m) => m.default),
};
