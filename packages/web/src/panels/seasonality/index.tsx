import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function computeSeasonality(points: { date: string; price: number }[]) {
  const monthlyReturns: number[][] = Array.from({ length: 12 }, () => []);
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const prevDate = new Date(prev.date);
    const currDate = new Date(curr.date);
    // Only count when month changed
    if (currDate.getMonth() !== prevDate.getMonth() || currDate.getFullYear() !== prevDate.getFullYear()) {
      const month = currDate.getMonth();
      const ret = prev.price !== 0 ? ((curr.price - prev.price) / prev.price) * 100 : 0;
      monthlyReturns[month].push(ret);
    }
  }
  return monthlyReturns.map((rets) =>
    rets.length > 0 ? rets.reduce((a, b) => a + b, 0) / rets.length : 0
  );
}

export function SeasonalityPanel({ title, tickers, refreshKey, onRefresh, description }: PanelProps) {
  const symbols = tickers ?? [];
  const { data, loading, error } = usePanelData(
    () => dataApi.getPriceHistory(symbols, "5y"),
    [symbols.join(","), refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const validSymbols = symbols.filter((s) => data && data[s] && data[s].length > 1);

  if (validSymbols.length === 0) {
    return (
      <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
        {error && <PanelError message={error} />}
        <div className="text-xs text-gray-400">No price data available</div>
      </PanelContainer>
    );
  }

  const seasonality = validSymbols.map((sym) => ({
    symbol: sym,
    avg: computeSeasonality(data![sym]),
  }));

  const maxAbs = Math.max(
    ...seasonality.flatMap((s) => s.avg.map((v) => Math.abs(v))),
    1
  );

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="space-y-3 overflow-auto h-full">
        {seasonality.map((s) => (
          <div key={s.symbol}>
            <div className="text-xs font-semibold text-gray-700 mb-1">{s.symbol}</div>
            <div className="flex items-end gap-0.5" style={{ height: 60 }}>
              {s.avg.map((val, i) => {
                const h = (Math.abs(val) / maxAbs) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className={`w-full rounded-t-sm ${val >= 0 ? "bg-green-500" : "bg-red-500"}`}
                      style={{ height: `${Math.max(h, 2)}%` }}
                      title={`${MONTHS[i]}: ${val >= 0 ? "+" : ""}${val.toFixed(1)}%`}
                    />
                    <div className="text-[9px] text-gray-400">{MONTHS[i]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-gray-400 mt-1">Average monthly return over 5 years</div>
    </PanelContainer>
  );
}

export const seasonalityPanel: PanelDefinition = {
  id: "seasonality",
  name: "Seasonality",
  description: "Average monthly return profile over the past 5 years.",
  categories: ["generic"],
  component: SeasonalityPanel,
  filterConfig: { tickerMode: "enabled" },
};
