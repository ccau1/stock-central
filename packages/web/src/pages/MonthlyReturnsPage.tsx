import { useMemo, useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { dataApi } from "../lib/api";
import { useTickerSearch } from "../hooks/useTickerSearch";
import { computeMonthlyReturns, computeMonthlyStats, formatPct } from "../lib/monthlyReturns";
import { colorForChangePct } from "../panels/_core/utils";
import { usePanelData } from "../panels/_core";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DISPLAY_YEARS = 10;

interface SummaryRowProps {
  label: string;
  values: (number | null)[];
  yearlyValue?: number | null;
  decimals?: number;
  colorize?: boolean;
  colorizeYearly?: boolean;
}

function SummaryRow({
  label,
  values,
  yearlyValue = null,
  decimals = 2,
  colorize = true,
  colorizeYearly = true,
}: SummaryRowProps) {
  return (
    <tr>
      <td className="px-3 py-1.5 text-[11px] font-semibold text-gray-700 text-left border-b border-gray-100 sticky left-0 bg-white">
        {label}
      </td>
      {values.map((v, i) => (
        <td
          key={i}
          className={`px-1 py-1.5 text-[10px] text-center border-b border-gray-100 min-w-[58px] ${colorize && v !== null ? colorForChangePct(v) : ""}`}
        >
          {formatPct(v, decimals)}
        </td>
      ))}
      <td
        className={`px-1 py-1.5 text-[10px] text-center border-b border-gray-100 min-w-[58px] ${
          colorizeYearly && yearlyValue !== null ? colorForChangePct(yearlyValue) : ""
        }`}
      >
        {formatPct(yearlyValue, decimals)}
      </td>
    </tr>
  );
}

export default function MonthlyReturnsPage() {
  const [symbol, setSymbol] = useState("SPY");

  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    showDropdown,
    searchRef,
    handleSelect,
    handleKeyDown,
    setShowDropdown,
  } = useTickerSearch({
    onSelect: (sym: string) => {
      setSymbol(sym);
    },
  });

  const { data, loading, error } = usePanelData(
    () => dataApi.getPriceHistory([symbol], "max"),
    [symbol]
  );

  const allReturns = useMemo(() => computeMonthlyReturns(data?.[symbol] ?? []), [data, symbol]);
  const displayReturns = useMemo(() => allReturns.slice(0, DISPLAY_YEARS), [allReturns]);
  const stats = useMemo(() => computeMonthlyStats(displayReturns), [displayReturns]);

  const yearlyReturns = useMemo(
    () => displayReturns.map((r) => r.yearlyReturn).filter((v): v is number => v !== null),
    [displayReturns]
  );

  const yearlyStats = useMemo(() => {
    if (yearlyReturns.length === 0) return null;
    const sorted = [...yearlyReturns].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const absVals = yearlyReturns.map((v) => Math.abs(v));
    return {
      average: yearlyReturns.reduce((a, b) => a + b, 0) / yearlyReturns.length,
      pctPositive: (yearlyReturns.filter((v) => v > 0).length / yearlyReturns.length) * 100,
      pctNegative: (yearlyReturns.filter((v) => v < 0).length / yearlyReturns.length) * 100,
      median: sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid],
      best: Math.max(...yearlyReturns),
      worst: Math.min(...yearlyReturns),
      absAverage: absVals.reduce((a, b) => a + b, 0) / absVals.length,
      absBest: Math.max(...absVals),
      absWorst: Math.min(...absVals),
    };
  }, [yearlyReturns]);

  const headerClass = "px-1 py-2 text-[10px] font-semibold text-gray-600 text-center border-b border-gray-200 bg-gray-50";
  const cellClass = "px-1 py-1.5 text-[10px] text-center border-b border-gray-100 min-w-[58px]";
  const yearCellClass = "px-3 py-1.5 text-[11px] font-semibold text-gray-700 text-left border-b border-gray-200 bg-gray-50 sticky left-0";

  const title = symbol ? `${symbol} Total Percent Returns` : "Total Percent Returns";

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h1>
          <div className="relative" ref={searchRef}>
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1.5 w-56">
              <Search size={14} className="text-gray-400 shrink-0" />
              <input
                className="bg-transparent text-xs focus:outline-none placeholder:text-gray-400 w-full"
                placeholder="Change ticker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true);
                }}
              />
              {searchLoading && <RefreshCw size={12} className="text-gray-400 animate-spin shrink-0" />}
            </div>
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-72 overflow-auto">
                {searchResults.map((r) => (
                  <button
                    key={r.symbol}
                    onClick={() => handleSelect(r.symbol)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0"
                  >
                    <div>
                      <div className="text-xs font-semibold text-gray-800">{r.symbol}</div>
                      <div className="text-[10px] text-gray-500 truncate max-w-[200px]">{r.name}</div>
                    </div>
                    <div className="text-[10px] text-gray-400">{r.exchange}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && <div className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

        {loading && displayReturns.length === 0 && (
          <div className="flex items-center justify-center h-64 text-xs text-gray-400">Loading…</div>
        )}

        {displayReturns.length > 0 && (
          <>
            {/* Main returns table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-auto shadow-sm">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={`${headerClass} sticky left-0 z-10`}>Year</th>
                    {MONTHS.map((m) => (
                      <th key={m} className={headerClass}>
                        {m}
                      </th>
                    ))}
                    <th className={headerClass}>Yearly Return</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`${yearCellClass} font-bold`}>Average</td>
                    {stats.average.map((v, i) => (
                      <td key={i} className={`${cellClass} ${v !== null ? colorForChangePct(v) : ""}`}>
                        {formatPct(v)}
                      </td>
                    ))}
                    <td className={`${cellClass} ${yearlyStats ? colorForChangePct(yearlyStats.average) : ""}`}>
                      {yearlyStats ? formatPct(yearlyStats.average) : "—"}
                    </td>
                  </tr>
                  {displayReturns.map((row) => (
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

            {/* Summary */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-auto shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-sm font-bold text-gray-900">Summary</h2>
              </div>
              {stats.overallBest && stats.overallWorst && (
                <div className="px-4 py-3 flex flex-wrap gap-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-red-500" />
                    <span className="text-[11px] text-gray-600">
                      Worst Return: {formatPct(stats.overallWorst.value)} ({MONTHS[stats.overallWorst.month]} {stats.overallWorst.year})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-green-600" />
                    <span className="text-[11px] text-gray-600">
                      Best Return: {formatPct(stats.overallBest.value)} ({MONTHS[stats.overallBest.month]} {stats.overallBest.year})
                    </span>
                  </div>
                </div>
              )}
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={`${headerClass} sticky left-0 z-10 text-left`}></th>
                    {MONTHS.map((m) => (
                      <th key={m} className={headerClass}>
                        {m}
                      </th>
                    ))}
                    <th className={headerClass}>Yearly</th>
                  </tr>
                </thead>
                <tbody>
                  <SummaryRow label="Average" values={stats.average} yearlyValue={yearlyStats?.average ?? null} />
                  <SummaryRow label="% Positive" values={stats.pctPositive} yearlyValue={yearlyStats?.pctPositive ?? null} decimals={1} colorize={false} colorizeYearly={false} />
                  <SummaryRow label="% Negative" values={stats.pctNegative} yearlyValue={yearlyStats?.pctNegative ?? null} decimals={1} colorize={false} colorizeYearly={false} />
                  <SummaryRow label="Median" values={stats.median} yearlyValue={yearlyStats?.median ?? null} />
                  <SummaryRow label="Best" values={stats.best} yearlyValue={yearlyStats?.best ?? null} />
                  <SummaryRow label="Worst" values={stats.worst} yearlyValue={yearlyStats?.worst ?? null} />
                  <SummaryRow label="Abs Average" values={stats.absAverage} yearlyValue={yearlyStats?.absAverage ?? null} colorize={false} colorizeYearly={false} />
                  <SummaryRow label="Abs Best" values={stats.absBest} yearlyValue={yearlyStats?.absBest ?? null} colorize={false} colorizeYearly={false} />
                  <SummaryRow label="Abs Worst" values={stats.absWorst} yearlyValue={yearlyStats?.absWorst ?? null} colorize={false} colorizeYearly={false} />
                </tbody>
              </table>
            </div>
          </>
        )}

        {!loading && displayReturns.length === 0 && !error && (
          <div className="text-xs text-gray-400">No price data available</div>
        )}
      </div>
    </div>
  );
}
