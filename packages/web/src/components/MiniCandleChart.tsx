import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  CrosshairMode,
  type ISeriesApi,
  type CandlestickData,
  type Time,
} from "lightweight-charts";
import { RefreshCw } from "lucide-react";
import { dataApi, type CandleData } from "../lib/api";

const FIVE_YEARS_SECONDS = 5 * 365.25 * 24 * 60 * 60;

const INTERVALS = [
  { label: "5m", value: "5m", initialRange: "1d", defaultVisibleBars: 48, canLoadMore: false }, // ~4 trading hours
  { label: "15m", value: "15m", initialRange: "5d", defaultVisibleBars: 26, canLoadMore: false }, // ~1 trading day
  { label: "1H", value: "1h", initialRange: "1mo", defaultVisibleBars: 35, canLoadMore: false }, // ~1 trading week
  { label: "1D", value: "1d", initialRange: "5y", defaultVisibleBars: undefined, canLoadMore: true },
  { label: "1W", value: "1wk", initialRange: "5y", defaultVisibleBars: undefined, canLoadMore: true },
  { label: "1M", value: "1mo", initialRange: "max", defaultVisibleBars: 120, canLoadMore: true }, // ~10 years
  { label: "3M", value: "3mo", initialRange: "max", defaultVisibleBars: undefined, canLoadMore: false },
] as const;

type IntervalConfig = (typeof INTERVALS)[number];

function isIntraday(interval: string): boolean {
  return interval === "5m" || interval === "15m" || interval === "1h";
}

function toChartTime(dateStr: string, interval: string): Time {
  const d = new Date(dateStr);
  if (isIntraday(interval)) {
    return Math.floor(d.getTime() / 1000) as Time;
  }
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sortByTime<T extends { time: Time }>(data: T[]): T[] {
  const seen = new Set<Time>();
  return [...data]
    .sort((a, b) => {
      if (typeof a.time === "string" && typeof b.time === "string") {
        return a.time.localeCompare(b.time);
      }
      return (a.time as number) - (b.time as number);
    })
    .filter((item) => {
      if (seen.has(item.time)) return false;
      seen.add(item.time);
      return true;
    });
}

function mergeCandles(prev: CandleData[], next: CandleData[]): CandleData[] {
  const map = new Map<string, CandleData>();
  for (const c of prev) map.set(c.date, c);
  for (const c of next) map.set(c.date, c);
  return [...map.values()].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export default function MiniCandleChart({ symbol }: { symbol: string }) {
  const [intervalConfig, setIntervalConfig] = useState<IntervalConfig>(INTERVALS[3]); // default 1D
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const loadingMoreRef = useRef(false);
  const initialZoomSetRef = useRef(false);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { color: "#ffffff" }, textColor: "#6b7280" },
      grid: { vertLines: { color: "#f3f4f6" }, horzLines: { color: "#f3f4f6" } },
      rightPriceScale: { borderColor: "#e5e7eb" },
      timeScale: { borderColor: "#e5e7eb", timeVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
      autoSize: true,
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
    });

    chartRef.current = chart;

    const candlestick = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });
    seriesRef.current = candlestick;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Update time scale label visibility when interval changes
  useEffect(() => {
    chartRef.current?.applyOptions({
      timeScale: { timeVisible: isIntraday(intervalConfig.value) },
    });
  }, [intervalConfig.value]);

  // Reset initial zoom flag when symbol or interval changes
  useEffect(() => {
    initialZoomSetRef.current = false;
  }, [symbol, intervalConfig.value]);

  // Update chart data when candles or interval change
  useEffect(() => {
    if (!seriesRef.current) return;
    const formatted: CandlestickData<Time>[] = sortByTime(
      candles.map((c) => ({
        time: toChartTime(c.date, intervalConfig.value),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );
    seriesRef.current.setData(formatted);

    // Apply default zoom only on the first data set for this symbol/interval so
    // auto-loaded older history doesn't jump the view.
    if (!initialZoomSetRef.current) {
      if (intervalConfig.defaultVisibleBars && formatted.length > intervalConfig.defaultVisibleBars) {
        chartRef.current?.timeScale().setVisibleLogicalRange({
          from: formatted.length - intervalConfig.defaultVisibleBars,
          to: formatted.length - 1,
        });
      } else {
        chartRef.current?.timeScale().fitContent();
      }
      initialZoomSetRef.current = true;
    }
  }, [candles, intervalConfig.value, intervalConfig.defaultVisibleBars]);

  // Fetch initial candles when symbol or interval changes
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      setHasMore(intervalConfig.canLoadMore);
      try {
        const data = await dataApi.getCandles(symbol, intervalConfig.initialRange, intervalConfig.value);
        if (!cancelled) {
          setCandles(data);
          if (intervalConfig.canLoadMore) {
            setHasMore(data.length > 0);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load chart");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol, intervalConfig]);

  // Auto-load older data when scrolling near the left edge
  const loadMore = useCallback(async () => {
    if (!intervalConfig.canLoadMore || loadingMoreRef.current || candles.length === 0) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const oldestDate = new Date(candles[0].date);
      const newEnd = Math.floor(oldestDate.getTime() / 1000) - 1;
      const newStart = Math.max(0, newEnd - FIVE_YEARS_SECONDS);
      if (newEnd <= newStart) {
        setHasMore(false);
        return;
      }
      const data = await dataApi.getCandlesPeriod(symbol, newStart, newEnd, intervalConfig.value);
      if (data.length === 0) {
        setHasMore(false);
      } else {
        setCandles((prev) => {
          const merged = mergeCandles(data, prev);
          // If we didn't get any new older candles, stop trying
          if (merged.length === prev.length) {
            setHasMore(false);
          }
          return merged;
        });
      }
    } catch {
      // Silently stop auto-loading on error; user can still see current data
      setHasMore(false);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [symbol, intervalConfig, candles]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !intervalConfig.canLoadMore || !hasMore) return;

    const handler = () => {
      const range = chart.timeScale().getVisibleLogicalRange();
      if (range && range.from < 20) {
        void loadMore();
      }
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handler);
    return () => chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
  }, [loadMore, intervalConfig.canLoadMore, hasMore]);

  const lastClose = candles.length > 0 ? candles[candles.length - 1].close : null;
  const prevClose = candles.length > 1 ? candles[candles.length - 2].close : lastClose;
  const changePct = lastClose != null && prevClose != null && prevClose !== 0
    ? ((lastClose - prevClose) / prevClose) * 100
    : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-900">{symbol}</span>
          {lastClose != null && (
            <span className="text-[11px] text-gray-600">
              {lastClose.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          )}
          {changePct != null && (
            <span className={`text-[10px] font-medium px-1 rounded ${changePct >= 0 ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"}`}>
              {changePct >= 0 ? "+" : ""}
              {changePct.toFixed(2)}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {loadingMore && <span className="text-[9px] text-gray-400">loading history…</span>}
          {(loading || loadingMore) && <RefreshCw size={12} className="text-gray-400 animate-spin" />}
        </div>
      </div>

      <div className="flex gap-1 px-3 py-1.5 border-b border-gray-50 overflow-x-auto">
        {INTERVALS.map((r) => (
          <button
            key={r.label}
            title={r.canLoadMore ? `${r.label} candles — 5y initial, scroll left for more history` : `${r.label} candles`}
            onClick={() => setIntervalConfig(r)}
            className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${
              intervalConfig.label === r.label
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="relative h-[220px] sm:h-[280px]">
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-red-500 px-4 text-center z-10">
            {error}
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
