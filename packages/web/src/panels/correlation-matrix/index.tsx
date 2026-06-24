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

function computeCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  let sumA = 0, sumB = 0;
  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
  }
  const meanA = sumA / n;
  const meanB = sumB / n;
  let num = 0, denA = 0, denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  return den === 0 ? 0 : num / den;
}

export function CorrelationMatrixPanel({ title, tickers, inputs, refreshKey, onRefresh, onExpand, description }: PanelProps) {
  const timeRange = inputs.timeRange || "1y";
  const symbols = tickers ?? [];
  const { data, loading, error } = usePanelData(
    () => dataApi.getPriceHistory(symbols, timeRange),
    [symbols.join(","), timeRange, refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const activeSymbols = symbols.filter((s) => data && data[s] && data[s].length > 1);
  const returnsMap = new Map<string, number[]>();
  for (const sym of activeSymbols) {
    returnsMap.set(sym, computeDailyReturns(data![sym]));
  }

  const matrix = activeSymbols.map((rowSym) =>
    activeSymbols.map((colSym) => {
      const r1 = returnsMap.get(rowSym)!;
      const r2 = returnsMap.get(colSym)!;
      return computeCorrelation(r1, r2);
    })
  );

  function corrColor(corr: number): string {
    if (corr >= 0.8) return "bg-green-600 text-white";
    if (corr >= 0.5) return "bg-green-400 text-white";
    if (corr >= 0.2) return "bg-green-200 text-green-800";
    if (corr >= -0.2) return "bg-gray-100 text-gray-600";
    if (corr >= -0.5) return "bg-red-200 text-red-800";
    if (corr >= -0.8) return "bg-red-400 text-white";
    return "bg-red-600 text-white";
  }

  return (
    <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      {activeSymbols.length > 0 ? (
        <div className="overflow-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr>
                <th className="p-1"></th>
                {activeSymbols.map((s) => (
                  <th key={s} className="p-1 text-center font-semibold text-gray-500">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeSymbols.map((rowSym, i) => (
                <tr key={rowSym}>
                  <td className="p-1 font-semibold text-gray-600">{rowSym}</td>
                  {activeSymbols.map((_, j) => (
                    <td key={j} className={`p-1 text-center font-bold rounded ${corrColor(matrix[i][j])}`}>
                      {matrix[i][j].toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-xs text-gray-400 text-center py-4">Add at least two tickers to see correlation matrix.</div>
      )}
    </PanelContainer>
  );
}

export const correlationMatrixPanel: PanelDefinition = {
  id: "correlation-matrix",
  name: "Correlation Matrix",
  description: "Pairwise correlation of daily returns across selected tickers.",
  categories: ["comparison"],
  component: CorrelationMatrixPanel,
  filterConfig: { tickerMode: "enabled", injectTimeRange: true },
  preview: () => import("./preview").then((m) => m.default),
};
