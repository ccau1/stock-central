import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LineSeries } from "lightweight-charts";
import type { ISeriesApi } from "lightweight-charts";
import { X } from "lucide-react";
import { dataApi, type CandleData } from "../lib/api";
import { useLightweightChart } from "../hooks/useLightweightChart";
import { toChartTime, sortByTime } from "../lib/chartTime";

interface MacroIndicatorChartModalProps {
  symbol: string;
  title?: string;
  open: boolean;
  onClose: () => void;
  range?: string;
}

const RANGE_OPTIONS = [
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
  { label: "2Y", value: "yoy" },
];

export default function MacroIndicatorChartModal({
  symbol,
  title,
  open,
  onClose,
  range = "6mo",
}: MacroIndicatorChartModalProps) {
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const { containerRef, chartRef } = useLightweightChart();

  const [selectedRange, setSelectedRange] = useState(range);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const displayTitle = title || symbol;
  const rangeLabel = RANGE_OPTIONS.find((o) => o.value === selectedRange)?.label || selectedRange;

  // Fetch daily candles when the modal opens or range changes.
  useEffect(() => {
    if (!open || !symbol) return;
    let cancelled = false;
    setCandles([]);
    setLoading(true);
    setError(null);
    dataApi
      .getCandles(symbol, selectedRange, "1d")
      .then((data) => {
        if (!cancelled) {
          setCandles(data);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError((e as Error).message || "Failed to load chart");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, symbol, selectedRange]);

  // Add line series once the shared chart is ready.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const series = chart.addSeries(LineSeries, {
      color: "#2563eb",
      lineWidth: 2,
      crosshairMarkerVisible: true,
    });
    seriesRef.current = series;
    return () => {
      if (seriesRef.current) {
        chart.removeSeries(seriesRef.current);
        seriesRef.current = null;
      }
    };
  }, [chartRef]);

  // Update line data.
  useEffect(() => {
    if (!seriesRef.current) return;
    if (candles.length > 0) {
      const data = sortByTime(
        candles.map((c) => ({
          time: toChartTime(c.date, "1d"),
          value: c.close,
        }))
      );
      seriesRef.current.setData(data);
      requestAnimationFrame(() => {
        chartRef.current?.timeScale().fitContent();
      });
    } else {
      seriesRef.current.setData([]);
    }
  }, [candles, chartRef]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const latestReturn = useMemo(() => {
    if (candles.length < 2) return null;
    const first = candles[0];
    const last = candles[candles.length - 1];
    if (!first?.close || !last?.close) return null;
    return ((last.close - first.close) / first.close) * 100;
  }, [candles]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900 truncate">{displayTitle}</h3>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {latestReturn !== null ? (
                <span className={latestReturn >= 0 ? "text-green-600" : "text-red-600"}>
                  {latestReturn >= 0 ? "+" : ""}
                  {latestReturn.toFixed(2)}% over {rangeLabel}
                </span>
              ) : (
                <span>Daily chart</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 ml-2 shrink-0"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-1 px-4 pt-3 pb-0">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedRange(opt.value)}
              className={`px-2 py-0.5 text-[11px] rounded border transition-colors ${
                selectedRange === opt.value
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 p-4">
          {loading && <div className="text-xs text-gray-500">Loading chart…</div>}
          {error && <div className="text-xs text-red-500">{error}</div>}
          {!loading && !error && candles.length === 0 && (
            <div className="text-xs text-gray-400">No daily data available.</div>
          )}
          <div ref={containerRef} className="w-full h-[360px]" />
        </div>
      </div>
    </div>,
    document.body
  );
}
