import { Link } from "react-router-dom";
import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import type { ScreenStock } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";

export function ValuationRatiosPanel({ title, tickers, refreshKey, onRefresh, description }: PanelProps) {
  const symbols = tickers ?? [];
  const { data, loading, error } = usePanelData(
    () => dataApi.getBatchQuotes(symbols),
    [symbols, refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const metrics: { key: keyof ScreenStock; label: string; fmt: (v: number) => string }[] = [
    { key: "trailing_pe", label: "P/E (TTM)", fmt: (v) => (v > 0 ? `${v.toFixed(1)}x` : "–") },
    { key: "forward_pe", label: "Forward P/E", fmt: (v) => (v > 0 ? `${v.toFixed(1)}x` : "–") },
    { key: "price_to_book", label: "P/B", fmt: (v) => (v > 0 ? `${v.toFixed(1)}x` : "–") },
    { key: "dividend_yield", label: "Div Yield", fmt: (v) => (v > 0 ? `${(v * 100).toFixed(2)}%` : "–") },
  ];

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="overflow-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-1.5 pr-2 font-semibold text-gray-500">Ticker</th>
              {metrics.map((m) => (
                <th key={m.label} className="text-right py-1.5 px-1.5 font-semibold text-gray-500">{m.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.map((d) => (
              <tr key={d.symbol} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="py-1.5 pr-2">
                  <Link to={`/ticker/${d.symbol}`} className="font-semibold text-gray-700 hover:text-blue-700 transition-colors">
                    {d.symbol}
                  </Link>
                </td>
                {metrics.map((m) => (
                  <td key={m.label} className="text-right py-1.5 px-1.5 text-gray-600 font-medium">
                    {m.fmt(d[m.key] as number)}
                  </td>
                ))}
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={metrics.length + 1} className="text-center py-4 text-gray-400">No valuation data available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PanelContainer>
  );
}

export const valuationRatiosPanel: PanelDefinition = {
  id: "valuation-ratios",
  name: "Valuation Ratios",
  description: "Compare P/E, Forward P/E, P/B, and dividend yield across tickers.",
  categories: ["generic"],
  component: ValuationRatiosPanel,
  filterConfig: { tickerMode: "enabled" },
};
