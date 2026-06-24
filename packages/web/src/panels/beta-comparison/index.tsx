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

function computeBeta(stockReturns: number[], marketReturns: number[]): number {
  const n = Math.min(stockReturns.length, marketReturns.length);
  if (n < 2) return 0;
  let sumS = 0, sumM = 0;
  for (let i = 0; i < n; i++) {
    sumS += stockReturns[i];
    sumM += marketReturns[i];
  }
  const meanS = sumS / n;
  const meanM = sumM / n;
  let cov = 0, varM = 0;
  for (let i = 0; i < n; i++) {
    const ds = stockReturns[i] - meanS;
    const dm = marketReturns[i] - meanM;
    cov += ds * dm;
    varM += dm * dm;
  }
  return varM === 0 ? 0 : cov / varM;
}

export function BetaComparisonPanel({ title, tickers, inputs, refreshKey, onRefresh, onExpand, description }: PanelProps) {
  const timeRange = inputs.timeRange || "1y";
  const symbols = tickers ?? [];

  const { data, loading, error } = usePanelData(
    async () => {
      const allSymbols = [...symbols, "SPY"];
      const history = await dataApi.getPriceHistory(allSymbols, timeRange);
      return { history };
    },
    [symbols.join(","), timeRange, refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const marketReturns = data?.history["SPY"] ? computeDailyReturns(data.history["SPY"]) : [];
  const activeSymbols = symbols.filter((s) => data?.history[s] && data.history[s].length > 1);

  const betas = activeSymbols.map((sym) => ({
    symbol: sym,
    beta: computeBeta(computeDailyReturns(data!.history[sym]), marketReturns),
  }));

  const maxBeta = Math.max(...betas.map((b) => Math.abs(b.beta)), 0.1);

  return (
    <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="text-[10px] text-gray-400 mb-2">Beta relative to SPY</div>
      <div className="space-y-3">
        {betas.map((b) => {
          const isNegative = b.beta < 0;
          const barWidth = Math.min((Math.abs(b.beta) / maxBeta) * 100, 100);
          return (
            <div key={b.symbol}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="w-12 text-xs font-semibold text-gray-700">{b.symbol}</span>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all absolute top-0"
                    style={{
                      left: isNegative ? `${50 - barWidth / 2}%` : "50%",
                      width: `${barWidth / 2}%`,
                      backgroundColor: isNegative ? "#ef4444" : b.beta > 1 ? "#f59e0b" : "#3b82f6",
                    }}
                  />
                  <div className="absolute top-0 left-1/2 w-px h-full bg-gray-300" />
                </div>
                <div className={`w-14 text-xs font-bold text-right ${isNegative ? "text-red-600" : "text-gray-700"}`}>
                  {b.beta.toFixed(2)}
                </div>
              </div>
            </div>
          );
        })}
        {betas.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-4">Add tickers to see beta comparison.</div>
        )}
      </div>
    </PanelContainer>
  );
}

export const betaComparisonPanel: PanelDefinition = {
  id: "beta-comparison",
  name: "Beta Comparison",
  description: "Compare beta (systematic risk) of selected tickers relative to SPY.",
  categories: ["comparison"],
  component: BetaComparisonPanel,
  filterConfig: { tickerMode: "enabled", injectTimeRange: true },
};
