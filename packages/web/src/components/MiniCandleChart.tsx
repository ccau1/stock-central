import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  type ISeriesApi,
  type CandlestickData,
  type Time,
} from "lightweight-charts";
import { RefreshCw } from "lucide-react";
import { dataApi, type CandleData } from "../lib/api";
import { useLightweightChart } from "../hooks/useLightweightChart";
import { toChartTime, sortByTime } from "../lib/chartTime";
import { candlestickSeriesOptions } from "../lib/chartStyles";

const RANGES = [
  { label: "1D", range: "1d", interval: "5m" },
  { label: "1W", range: "5d", interval: "15m" },
  { label: "1M", range: "1mo", interval: "1d" },
  { label: "3M", range: "3mo", interval: "1d" },
  { label: "1Y", range: "1y", interval: "1d" },
] as const;

type RangeConfig = (typeof RANGES)[number];

export default function MiniCandleChart({ symbol }: { symbol: string }) {
  const [rangeConfig, setRangeConfig] = useState<RangeConfig>(RANGES[2]); // default 1M
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const { containerRef, chartRef } = useLightweightChart({
    nativeWheelZoom: true,
  });

  // Add candlestick series once the chart is ready.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const series = chart.addSeries(CandlestickSeries, candlestickSeriesOptions);
    seriesRef.current = series;
    return () => {
      if (seriesRef.current) {
        chart.removeSeries(seriesRef.current);
        seriesRef.current = null;
      }
    };
  }, [chartRef]);

  // Update data when candles or interval change.
  useEffect(() => {
    if (!seriesRef.current) return;
    const formatted: CandlestickData<Time>[] = sortByTime(
      candles.map((c) => ({
        time: toChartTime(c.date, rangeConfig.interval),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );
    seriesRef.current.setData(formatted);
    chartRef.current?.timeScale().fitContent();
  }, [candles, rangeConfig.interval, chartRef]);

  // Update time scale label visibility when interval changes.
  useEffect(() => {
    chartRef.current?.applyOptions({
      timeScale: { timeVisible: rangeConfig.interval !== "1d" },
    });
  }, [rangeConfig.interval, chartRef]);

  // Fetch candles on symbol/range change.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await dataApi.getCandles(symbol, rangeConfig.range, rangeConfig.interval);
        if (!cancelled) setCandles(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load chart");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol, rangeConfig]);

  const lastClose = candles.length > 0 ? candles[candles.length - 1].close : null;
  const prevClose = candles.length > 1 ? candles[candles.length - 2].close : lastClose;
  const changePct =
    lastClose != null && prevClose != null && prevClose !== 0
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
            <span
              className={`text-[10px] font-medium px-1 rounded ${
                changePct >= 0 ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
              }`}
            >
              {changePct >= 0 ? "+" : ""}
              {changePct.toFixed(2)}%
            </span>
          )}
        </div>
        {loading && <RefreshCw size={12} className="text-gray-400 animate-spin" />}
      </div>

      <div className="flex gap-1 px-3 py-1.5 border-b border-gray-50 overflow-x-auto">
        {RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setRangeConfig(r)}
            className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${
              rangeConfig.label === r.label
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="relative flex-1 min-h-[280px]">
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
