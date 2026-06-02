import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";

export function EarningsHistoryPanel({ title, tickers, refreshKey, onRefresh, description }: PanelProps) {
  const symbols = tickers ?? [];
  const { data, loading, error } = usePanelData(
    () => dataApi.getForwardPe(symbols),
    [symbols.join(","), refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const items = (data || []).filter((d) => symbols.includes(d.symbol));
  const validItems = items.filter((d) => d.earnings_history && d.earnings_history.length > 0);

  if (validItems.length === 0) {
    return (
      <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
        {error && <PanelError message={error} />}
        <div className="text-xs text-gray-400">No earnings data available</div>
      </PanelContainer>
    );
  }

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="space-y-4 overflow-auto h-full">
        {validItems.map((item) => {
          const history = item.earnings_history;
          const maxVal = Math.max(...history.map((q) => Math.max(q.actual, q.estimate)), 0.01);
          return (
            <div key={item.symbol}>
              <div className="text-xs font-semibold text-gray-700 mb-1.5">{item.symbol}</div>
              <div className="flex items-end gap-1">
                {history.map((q, i) => {
                  const beat = q.actual >= q.estimate;
                  const actualH = (q.actual / maxVal) * 100;
                  const estH = (q.estimate / maxVal) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: 80 }}>
                        <div
                          className="w-2 bg-blue-400 rounded-t"
                          style={{ height: `${Math.max(estH, 2)}%` }}
                          title={`Estimate: $${q.estimate.toFixed(2)}`}
                        />
                        <div
                          className={`w-2 rounded-t ${beat ? "bg-green-500" : "bg-red-500"}`}
                          style={{ height: `${Math.max(actualH, 2)}%` }}
                          title={`Actual: $${q.actual.toFixed(2)}`}
                        />
                      </div>
                      <div className="text-[9px] text-gray-400 text-center leading-tight">{q.date}</div>
                      <div className={`text-[9px] font-medium ${beat ? "text-green-600" : "text-red-600"}`}>
                        {beat ? "+" : ""}{q.beat_pct.toFixed(0)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-400 rounded-sm inline-block" /> Estimate</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-sm inline-block" /> Beat</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-sm inline-block" /> Miss</span>
      </div>
    </PanelContainer>
  );
}

export const earningsHistoryPanel: PanelDefinition = {
  id: "earnings-history",
  name: "Earnings History",
  description: "Quarterly actual vs estimated EPS bars for selected tickers.",
  categories: ["generic"],
  component: EarningsHistoryPanel,
  filterConfig: { tickerMode: "enabled" },
};
