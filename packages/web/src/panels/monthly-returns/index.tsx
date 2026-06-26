import { useMemo, useState } from "react";
import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import { computeMonthlyReturns, formatPct } from "../../lib/monthlyReturns";
import { PanelContainer, PanelError, PanelLoading, usePanelData, colorForChangePct } from "../_core";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function MonthlyReturnsPanel({
  title,
  tickers,
  enabledTickers,
  refreshKey,
  onRefresh,
  onExpand,
  description,
}: PanelProps) {
  const symbols = tickers ?? [];
  const enabledSymbols = enabledTickers ?? symbols;
  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => enabledSymbols[0] ?? "");

  // Derive the effective symbol: stay on the current selection if still enabled,
  // otherwise fall back to the first enabled symbol.
  const effectiveSymbol = enabledSymbols.includes(selectedSymbol)
    ? selectedSymbol
    : enabledSymbols[0] ?? "";

  const { data, loading, error } = usePanelData(
    () => dataApi.getPriceHistory([effectiveSymbol], "max"),
    [effectiveSymbol, refreshKey]
  );

  const returns = useMemo(() => {
    if (!data || !data[effectiveSymbol]) return [];
    return computeMonthlyReturns(data[effectiveSymbol]);
  }, [data, effectiveSymbol]);

  const averages = useMemo(() => {
    if (returns.length === 0) return null;
    return MONTHS.map((_, month) => {
      const vals = returns.map((y) => y.months[month]).filter((v): v is number => v !== null);
      if (vals.length === 0) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    });
  }, [returns]);


  const headerCellClass = "px-1.5 py-1 text-[10px] font-semibold text-gray-600 text-center border-b border-gray-200 bg-gray-50";
  const cellClass = "px-1 py-1 text-[10px] text-center border-b border-gray-100 min-w-[52px]";
  const yearCellClass = "px-2 py-1 text-[10px] font-semibold text-gray-700 text-left border-b border-gray-200 bg-gray-50 sticky left-0";

  return (
    <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      {loading && !data && <PanelLoading />}

      {symbols.length > 1 && (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[10px] text-gray-500">Ticker</span>
          <select
            value={effectiveSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="text-[11px] border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {symbols.map((sym) => (
              <option key={sym} value={sym}>
                {sym}
              </option>
            ))}
          </select>
        </div>
      )}

      {returns.length > 0 && (
        <div className="overflow-auto h-full">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${headerCellClass} sticky left-0 z-10`}>Year</th>
                {MONTHS.map((m) => (
                  <th key={m} className={headerCellClass}>
                    {m}
                  </th>
                ))}
                <th className={headerCellClass}>Yearly</th>
              </tr>
            </thead>
            <tbody>
              {averages && (
                <tr>
                  <td className={`${yearCellClass} font-bold`}>Avg</td>
                  {averages.map((v, i) => (
                    <td key={i} className={`${cellClass} ${v !== null ? colorForChangePct(v) : ""}`}>
                      {formatPct(v)}
                    </td>
                  ))}
                  <td className={cellClass}>—</td>
                </tr>
              )}
              {returns.map((row) => (
                <tr key={row.year}>
                  <td className={yearCellClass}>{row.year}</td>
                  {row.months.map((v, i) => (
                    <td key={i} className={`${cellClass} ${v !== null ? colorForChangePct(v) : ""}`}>
                      {formatPct(v)}
                    </td>
                  ))}
                  <td className={`${cellClass} ${row.yearlyReturn !== null ? colorForChangePct(row.yearlyReturn) : ""}`}>
                    {formatPct(row.yearlyReturn)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && returns.length === 0 && !error && (
        <div className="text-xs text-gray-400">No price data available</div>
      )}
    </PanelContainer>
  );
}

export const monthlyReturnsPanel: PanelDefinition = {
  id: "monthly-returns",
  name: "Monthly Returns",
  description: "Monthly and yearly percent returns by year for the selected ticker.",
  categories: ["generic"],
  component: MonthlyReturnsPanel,
  filterConfig: { tickerMode: "enabled" },
};
