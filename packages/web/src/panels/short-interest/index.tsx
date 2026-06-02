import { Link } from "react-router-dom";
import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";

export function ShortInterestPanel({ title, tickers, refreshKey, onRefresh, description }: PanelProps) {
  const symbols = tickers ?? [];
  const { data, loading, error } = usePanelData(
    () => dataApi.getBatchQuotes(symbols),
    [symbols, refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const maxShort = Math.max(...(data?.map((d) => d.short_percent_float) || [0.01]), 0.01);

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="space-y-3">
        {data?.map((d) => (
          <div key={d.symbol}>
            <div className="flex items-center gap-2 mb-0.5">
              <Link to={`/ticker/${d.symbol}`} className="w-12 text-xs font-semibold text-gray-700 hover:text-blue-700 transition-colors">
                {d.symbol}
              </Link>
              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min((d.short_percent_float / maxShort) * 100, 100)}%`,
                    backgroundColor: d.short_percent_float > 20 ? "#ef4444" : d.short_percent_float > 10 ? "#f59e0b" : "#3b82f6",
                  }}
                />
              </div>
              <div className="w-14 text-xs font-bold text-gray-700 text-right">{d.short_percent_float.toFixed(1)}%</div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 px-14">
              <span>short ratio {d.short_ratio.toFixed(1)}</span>
              <span>float {d.short_percent_float.toFixed(1)}%</span>
            </div>
          </div>
        ))}
        {data?.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-4">No short interest data available.</div>
        )}
      </div>
    </PanelContainer>
  );
}

export const shortInterestPanel: PanelDefinition = {
  id: "short-interest",
  name: "Short Interest",
  description: "Compare short interest and short percent of float across tickers.",
  categories: ["generic"],
  component: ShortInterestPanel,
  filterConfig: { tickerMode: "enabled" },
};
