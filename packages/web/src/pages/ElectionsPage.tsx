import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RefreshCw, Landmark } from "lucide-react";
import { Tooltip } from "react-tooltip";
import { dataApi } from "../lib/api";
import {
  CYCLE_YEAR_LABELS,
  buildMonthCloseMap,
  computeElectionStats,
  computeIndividualPathSeries,
  computeMonthlyStats,
  computeMostRecentYearCandles,
  formatPct,
  getCurrentCycleYear,
  ideology,
  type CandleInput,
  type CandleSeries,
  type CategoryStats,
  type ElectionStats,
  type MonthCloseMap,
  type MonthlyStat,
  type PathSeries,
} from "../lib/elections";
import ElectionYearChart from "../components/ElectionYearChart";

const TABS = [1, 2, 3, 4] as const;
const CHART_MODES = ["percent", "price"] as const;

type LineFilter = "sameParty" | "partyChange" | "firstTerm" | "secondTerm";

const LINE_FILTERS: { key: LineFilter; label: string }[] = [
  { key: "sameParty", label: "Consecutive party" },
  { key: "partyChange", label: "Changed party" },
  { key: "firstTerm", label: "First term" },
  { key: "secondTerm", label: "Second term" },
];

function StatCard({
  title,
  stats,
  colorClass = "text-gray-900",
}: {
  title: string;
  stats: CategoryStats;
  colorClass?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="text-[11px] font-medium text-gray-500 mb-1">{title}</div>
      <div className={`text-xl font-bold ${colorClass}`}>{formatPct(stats.avgReturn)}</div>
      <div className="mt-1 text-[11px] text-gray-500">
        {stats.positiveCount}/{stats.count} positive{" "}
        {stats.positivePct != null && `(${formatPct(stats.positivePct, 0)})`}
      </div>
      {(stats.best != null || stats.worst != null) && (
        <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
          <span>Best: <span className="text-green-600">{formatPct(stats.best)}</span></span>
          <span>Worst: <span className="text-red-600">{formatPct(stats.worst)}</span></span>
        </div>
      )}
    </div>
  );
}

export default function ElectionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentCycleYear = getCurrentCycleYear();

  const activeTab = useMemo(() => {
    const yearParam = searchParams.get("year");
    const parsed = yearParam ? Number(yearParam) : NaN;
    if (!isNaN(parsed) && TABS.includes(parsed as typeof TABS[number])) {
      return parsed;
    }
    return currentCycleYear ?? 1;
  }, [searchParams, currentCycleYear]);

  const setActiveTab = (tab: number) => {
    setSearchParams({ year: String(tab), mode: chartMode });
  };

  const chartMode = useMemo(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam && CHART_MODES.includes(modeParam as typeof CHART_MODES[number])) {
      return modeParam as typeof CHART_MODES[number];
    }
    return "percent";
  }, [searchParams]);

  const setChartMode = (mode: typeof CHART_MODES[number]) => {
    setSearchParams({ year: String(activeTab), mode });
  };

  const [history, setHistory] = useState<MonthCloseMap>({});
  const [rawCandles, setRawCandles] = useState<CandleInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async (): Promise<{ closeMap: MonthCloseMap; candles: CandleInput[] }> => {
    // Yahoo's period endpoint gives daily candles back to 1970 for ^GSPC, so use them
    // for the chart. Monthly candles go back to the index inception and are used for the
    // stats tables.
    const nowUnix = Math.floor(Date.now() / 1000);
    const [daily, monthly] = await Promise.all([
      dataApi.getCandlesPeriod("^GSPC", 0, nowUnix, "1d"),
      // Yahoo's "max" range returns quarterly candles for 1mo, so request the full
      // available history by explicit start/end timestamps to get true monthly data.
      dataApi.getCandlesPeriod("^GSPC", 0, nowUnix, "1mo"),
    ]);
    if (daily.length === 0 || monthly.length === 0) {
      throw new Error("No S&P 500 data returned");
    }
    const points: { date: string; price: number }[] = monthly.map((c) => ({
      date: c.date.slice(0, 10),
      price: c.close,
    }));
    const normalizedCandles: CandleInput[] = daily.map((c) => ({
      date: c.date.slice(0, 10),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    return { closeMap: buildMonthCloseMap(points), candles: normalizedCandles };
  };

  useEffect(() => {
    let cancelled = false;
    loadHistory()
      .then((map) => {
        if (cancelled) return;
        setHistory(map.closeMap);
        setRawCandles(map.candles);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load S&P 500 history");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const map = await loadHistory();
      setHistory(map.closeMap);
      setRawCandles(map.candles);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load S&P 500 history");
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo<ElectionStats>(() => computeElectionStats(history, activeTab), [history, activeTab]);
  const overallMostRecentCandles = useMemo<CandleSeries | null>(
    () => computeMostRecentYearCandles(rawCandles, history, activeTab),
    [rawCandles, history, activeTab]
  );
  // Show the latest 4 completed years plus the current year (when applicable) on the chart,
  // while the stats/monthly tables use the full history.
  const pathSeries = useMemo<PathSeries[]>(
    () => computeIndividualPathSeries(rawCandles, activeTab, chartMode, 4),
    [rawCandles, activeTab, chartMode]
  );
  const monthlyStats = useMemo<MonthlyStat[]>(() => computeMonthlyStats(history, activeTab), [history, activeTab]);

  const currentYear = new Date().getFullYear();
  const [enabledIds, setEnabledIds] = useState<Set<string>>(new Set());
  const [activeLineFilter, setActiveLineFilter] = useState<LineFilter | null>(null);

  // Reset visibility to everything when the cycle year or chart mode changes.
  useEffect(() => {
    const ids = new Set(pathSeries.map((s) => s.id));
    if (overallMostRecentCandles) ids.add(`candles-${overallMostRecentCandles.year}`);
    setEnabledIds(ids);
    setActiveLineFilter(null);
  }, [pathSeries, overallMostRecentCandles]);

  // The candlestick year follows the latest enabled completed year (never the current year).
  const enabledHistoricalYears = useMemo(() => {
    const years = new Set<number>();
    for (const s of pathSeries) {
      if (s.year && s.year !== currentYear && enabledIds.has(s.id)) years.add(s.year);
    }
    return years;
  }, [pathSeries, enabledIds, currentYear]);

  const mostRecentCandles = useMemo<CandleSeries | null>(
    () => computeMostRecentYearCandles(rawCandles, history, activeTab, enabledHistoricalYears),
    [rawCandles, history, activeTab, enabledHistoricalYears]
  );

  // Keep the candle toggle in sync with the dynamic candle year. Whenever the most recent
  // enabled completed year changes, enable the corresponding candle (and remove stale ones).
  useEffect(() => {
    if (!mostRecentCandles) return;
    const newCandleId = `candles-${mostRecentCandles.year}`;
    setEnabledIds((prev) => {
      if (prev.has(newCandleId)) return prev;
      const next = new Set(prev);
      Array.from(prev)
        .filter((id) => id.startsWith("candles-"))
        .forEach((id) => next.delete(id));
      next.add(newCandleId);
      return next;
    });
  }, [mostRecentCandles]);

  function latestEnabledCompletedYear(ids: Set<string>) {
    let latest = 0;
    for (const s of pathSeries) {
      if (s.year && s.year !== currentYear && ids.has(s.id) && s.year > latest) latest = s.year;
    }
    return latest || null;
  }

  function computeFilterIds(filter: LineFilter) {
    const ids = new Set<string>();
    ids.add("average");
    for (const s of pathSeries) {
      if (s.id === "average") continue;
      let include = false;
      if (filter === "sameParty" && s.party && s.prevParty && s.party === s.prevParty) include = true;
      if (filter === "partyChange" && s.party && s.prevParty && s.party !== s.prevParty) include = true;
      if (filter === "firstTerm" && s.termOrder === 1) include = true;
      if (filter === "secondTerm" && s.termOrder === 2) include = true;
      if (include) ids.add(s.id);
    }
    const candleYear = latestEnabledCompletedYear(ids);
    if (candleYear) ids.add(`candles-${candleYear}`);
    return ids;
  }

  function applyFilter(filter: LineFilter) {
    if (activeLineFilter === filter) {
      setActiveLineFilter(null);
      const ids = new Set(pathSeries.map((s) => s.id));
      if (overallMostRecentCandles) ids.add(`candles-${overallMostRecentCandles.year}`);
      setEnabledIds(ids);
      return;
    }
    setActiveLineFilter(filter);
    setEnabledIds(computeFilterIds(filter));
  }

  // If the user manually toggles legend items, clear the active quick filter.
  useEffect(() => {
    if (!activeLineFilter) return;
    const expected = computeFilterIds(activeLineFilter);
    if (expected.size !== enabledIds.size || !Array.from(expected).every((id) => enabledIds.has(id))) {
      setActiveLineFilter(null);
    }
  }, [enabledIds, activeLineFilter, pathSeries, overallMostRecentCandles]);

  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Landmark size={18} className="text-blue-600" />
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Presidential Election Cycle</h1>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-60 self-start"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <p className="text-xs text-gray-500 max-w-3xl">
          Historical S&P 500 statistics for each year of the four-year U.S. presidential cycle. Party
          affiliation is mapped as Conservative (Republican) and Liberal (Democrat). Data uses the last
          10 years of daily S&P 500 closes, aggregated to month-end.
        </p>

        {error && (
          <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2">
          {TABS.map((year) => {
            const isCurrent = year === currentCycleYear;
            return (
              <button
                key={year}
                onClick={() => setActiveTab(year)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  activeTab === year
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {CYCLE_YEAR_LABELS[year]}
                {isCurrent && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500 text-white">
                    current
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-gray-400 text-xs">
            <RefreshCw size={16} className="animate-spin mr-2" />
            Loading S&P 500 history…
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Overall" stats={stats.overall} />
              <StatCard title="First Term" stats={stats.firstTerm} colorClass="text-blue-700" />
              <StatCard title="Second Term" stats={stats.secondTerm} colorClass="text-violet-700" />
              <StatCard title="Same Party" stats={stats.sameParty} colorClass="text-emerald-700" />
              <StatCard title="Party Change" stats={stats.partyChange} colorClass="text-amber-700" />
              <StatCard title="Conservative (R)" stats={stats.conservative} colorClass="text-red-700" />
              <StatCard title="Liberal (D)" stats={stats.liberal} colorClass="text-cyan-700" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Conservative → Conservative"
                stats={stats.conservativeToConservative}
                colorClass="text-red-700"
              />
              <StatCard title="Conservative → Liberal" stats={stats.conservativeToLiberal} colorClass="text-red-700" />
              <StatCard title="Liberal → Liberal" stats={stats.liberalToLiberal} colorClass="text-cyan-700" />
              <StatCard title="Liberal → Conservative" stats={stats.liberalToConservative} colorClass="text-cyan-700" />
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1">
                <h2 className="text-sm font-bold text-gray-900">
                  S&P 500 paths for each {CYCLE_YEAR_LABELS[activeTab]}
                </h2>
                <div className="flex items-center gap-1 p-0.5 bg-gray-100 rounded-lg">
                  <button
                    onClick={() => setChartMode("percent")}
                    className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${
                      chartMode === "percent"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    % change
                  </button>
                  <button
                    onClick={() => setChartMode("price")}
                    className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${
                      chartMode === "price"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Price
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mb-4">
                {chartMode === "percent"
                  ? "Each thin line is one calendar year in this cycle bucket, shown as daily percent change from the January close. The thick black line is the daily average. The most recent completed year is shown as both a line and daily candlesticks."
                  : "Each thin line is one calendar year in this cycle bucket, shown as actual S&P 500 daily closes. The thick black line is the daily average across all years. The most recent completed year is shown as both a line and daily candlesticks."}
              </p>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-[11px] text-gray-500">Quick filters:</span>
                {LINE_FILTERS.map((f) => {
                  const active = activeLineFilter === f.key;
                  return (
                    <button
                      key={f.key}
                      onClick={() => applyFilter(f.key)}
                      className={`text-[10px] font-medium px-2 py-1 rounded border transition-colors ${
                        active
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              <ElectionYearChart
                key={activeTab}
                series={pathSeries}
                candles={mostRecentCandles}
                enabledIds={enabledIds}
                setEnabledIds={setEnabledIds}
                labels={monthLabels}
                mode={chartMode}
                height={420}
              />
            </div>

            {/* Monthly stats */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-sm font-bold text-gray-900">
                  Monthly pattern for {CYCLE_YEAR_LABELS[activeTab]}
                </h2>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Returns measured from the January close of each cycle year.
                </p>
              </div>
              <div className="overflow-x-auto">
                <Tooltip
                  id="monthly-row"
                  place="left"
                  className="!bg-gray-900 !text-white !text-[11px] !px-2.5 !py-1.5 !rounded-lg !z-[9999] !shadow-lg"
                  classNameArrow="!bg-gray-900"
                />
                <table className="w-full text-[11px]">
                  <thead className="bg-gray-50">
                    <tr>
                      {monthlyStats.map((m) => (
                        <th key={m.month} className="px-2 py-2 font-semibold text-gray-600 text-center min-w-[4.5rem]">
                          {m.month}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      className="border-b border-gray-50"
                      data-tooltip-id="monthly-row"
                      data-tooltip-content="Avg return from Jan close"
                    >
                      {monthlyStats.map((m) => (
                        <td key={`${m.month}-avg`} className="px-2 py-2 text-center font-medium text-gray-700">
                          {formatPct(m.avgReturn)}
                        </td>
                      ))}
                    </tr>
                    <tr
                      className="border-b border-gray-50"
                      data-tooltip-id="monthly-row"
                      data-tooltip-content="% of years positive"
                    >
                      {monthlyStats.map((m) => (
                        <td key={`${m.month}-pos`} className="px-2 py-2 text-center text-gray-500">
                          {m.positivePct != null ? `${(m.positivePct * 100).toFixed(0)}%` : "–"}
                        </td>
                      ))}
                    </tr>
                    <tr
                      data-tooltip-id="monthly-row"
                      data-tooltip-content="Observed min / max"
                    >
                      {monthlyStats.map((m) => (
                        <td key={`${m.month}-range`} className="px-2 py-2 text-center text-[10px] text-gray-400">
                          {m.min != null ? `${formatPct(m.min, 0)} / ${formatPct(m.max, 0)}` : "–"}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detail table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-sm font-bold text-gray-900">
                  {CYCLE_YEAR_LABELS[activeTab]} returns by term
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Year</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">President</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Party</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Term</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Previous</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-600">S&P 500 Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.annualReturns
                      .filter((r) => r.annualReturn != null)
                      .map((r) => {
                        const transition =
                          r.prevParty == null
                            ? "—"
                            : `${ideology(r.prevParty)} → ${ideology(r.term.party)}`;
                        return (
                          <tr key={r.year} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-500">{r.year}</td>
                            <td className="px-3 py-2 font-medium text-gray-800">{r.term.president}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  r.term.party === "Republican"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-cyan-50 text-cyan-700"
                                }`}
                              >
                                {ideology(r.term.party)} ({r.term.party[0]})
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {r.term.termOrder === 1 ? "First" : "Second"}
                            </td>
                            <td className="px-3 py-2 text-gray-500">{transition}</td>
                            <td
                              className={`px-3 py-2 text-right font-semibold ${
                                (r.annualReturn ?? 0) >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {formatPct(r.annualReturn)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
