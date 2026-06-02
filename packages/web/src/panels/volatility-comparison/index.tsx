import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import type { PricePoint } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";

function computeDailyReturns(points: PricePoint[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].price;
    const curr = points[i].price;
    if (prev > 0) {
      returns.push((curr - prev) / prev);
    }
  }
  return returns;
}

function computeVolatility(returns: number[]): number {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1);
  const dailyStd = Math.sqrt(variance);
  return dailyStd * Math.sqrt(252) * 100; // annualized %
}

export function VolatilityComparisonPanel({ title, tickers, inputs, refreshKey, onRefresh, description }: PanelProps) {
  const timeRange = inputs.timeRange || "1y";
  const symbols = tickers ?? [];
  const { data, loading, error } = usePanelData(
    () => dataApi.getPriceHistory(symbols, timeRange),
    [symbols.join(","), timeRange, refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const activeSymbols = symbols.filter((s) => data && data[s] && data[s].length > 1);
  const volatilities = activeSymbols.map((sym) => ({
    symbol: sym,
    vol: computeVolatility(computeDailyReturns(data![sym])),
  }));
  const maxVol = Math.max(...volatilities.map((v) => v.vol), 1);
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="space-y-3">
        {volatilities.map((v, i) => (
          <div key={v.symbol}>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-12 text-xs font-semibold text-gray-700">{v.symbol}</span>
              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min((v.vol / maxVol) * 100, 100)}%`,
                    backgroundColor: colors[i % colors.length],
                  }}
                />
              </div>
              <div className="w-14 text-xs font-bold text-gray-700 text-right">{v.vol.toFixed(1)}%</div>
            </div>
          </div>
        ))}
        {volatilities.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-4">Add tickers to see volatility comparison.</div>
        )}
      </div>
    </PanelContainer>
  );
}

export const volatilityComparisonPanel: PanelDefinition = {
  id: "volatility-comparison",
  name: "Volatility Comparison",
  description: "Compare annualized volatility of daily returns across selected tickers.",
  categories: ["comparison"],
  component: VolatilityComparisonPanel,
  filterConfig: { tickerMode: "enabled", injectTimeRange: true },
};
