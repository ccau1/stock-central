import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createChart, CandlestickSeries, CrosshairMode } from "lightweight-charts";
import type { IChartApi, ISeriesApi } from "lightweight-charts";
import { X } from "lucide-react";
import { dataApi, type CandleData } from "../lib/api";
import { formatPct } from "../lib/monthlyReturns";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface MonthlyCandlesModalProps {
  symbol: string;
  year: number;
  month: number; // 0-11
  open: boolean;
  onClose: () => void;
}

export default function MonthlyCandlesModal({
  symbol,
  year,
  month,
  open,
  onClose,
}: MonthlyCandlesModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const [candles, setCandles] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { startDate, endDate } = useMemo(() => {
    const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(Date.UTC(year, month + 1, 0));
    const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay.getUTCDate()).padStart(2, "0")}`;
    return { startDate: start, endDate: end };
  }, [year, month]);

  const monthCandles = useMemo(() => {
    return candles.filter((c) => {
      const d = c.date.slice(0, 10);
      return d >= startDate && d <= endDate;
    });
  }, [candles, startDate, endDate]);

  const monthReturn = useMemo(() => {
    if (monthCandles.length === 0) return null;
    const previous = candles
      .filter((c) => c.date.slice(0, 10) < startDate)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    const last = monthCandles[monthCandles.length - 1];
    if (!previous || !previous.close) return null;
    return ((last.close - previous.close) / previous.close) * 100;
  }, [monthCandles, candles, startDate]);

  // Fetch daily candles when the modal opens.
  useEffect(() => {
    if (!open || !symbol) return;
    let cancelled = false;
    dataApi
      .getCandles(symbol, "10y", "1d")
      .then((data) => {
        if (!cancelled) {
          setCandles(data);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError((e as Error).message || "Failed to load candles");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, symbol]);

  // Initialize chart.
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { color: "#ffffff" }, textColor: "#6b7280" },
      grid: { vertLines: { color: "#f3f4f6" }, horzLines: { color: "#f3f4f6" } },
      rightPriceScale: { borderColor: "#e5e7eb" },
      timeScale: { borderColor: "#e5e7eb", timeVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
      autoSize: true,
      handleScale: { mouseWheel: false, pinch: true },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });
    chartRef.current = chart;
    seriesRef.current = series;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      const timeScale = chart.timeScale();
      const range = timeScale.getVisibleLogicalRange();
      if (!range) return;
      const zoomFactor = Math.exp(-e.deltaY * 0.001 * 2.5);
      const center = (range.from + range.to) / 2;
      const halfSpan = (range.to - range.from) / 2;
      const newHalfSpan = Math.max(2, halfSpan * zoomFactor);
      timeScale.setVisibleLogicalRange({ from: center - newHalfSpan, to: center + newHalfSpan });
    };
    const container = containerRef.current;
    container.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", onWheel);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Update candle data.
  useEffect(() => {
    if (!seriesRef.current) return;
    if (monthCandles.length > 0) {
      const data = monthCandles
        .map((c) => ({
          time: c.date.slice(0, 10),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
        .sort((a, b) => String(a.time).localeCompare(String(b.time)));
      seriesRef.current.setData(data);
      chartRef.current?.timeScale().fitContent();
    } else {
      seriesRef.current.setData([]);
    }
  }, [monthCandles]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const title = `${symbol} – ${MONTHS[month]} ${year}`;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900 truncate">{title}</h3>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {monthReturn !== null ? (
                <span className={monthReturn >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatPct(monthReturn)}
                </span>
              ) : (
                <span>No data</span>
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

        <div className="flex-1 min-h-0 p-4">
          {loading && <div className="text-xs text-gray-500">Loading chart…</div>}
          {error && <div className="text-xs text-red-500">{error}</div>}
          {!loading && !error && monthCandles.length === 0 && (
            <div className="text-xs text-gray-400">No daily candles available for this month.</div>
          )}
          <div ref={containerRef} className="w-full h-[360px]" />
        </div>
      </div>
    </div>,
    document.body
  );
}
