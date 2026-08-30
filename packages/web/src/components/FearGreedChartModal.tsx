import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LineSeries } from "lightweight-charts";
import type { ISeriesApi } from "lightweight-charts";
import { X } from "lucide-react";
import { dataApi, type FearGreedHistoryPoint } from "../lib/api";
import { useLightweightChart } from "../hooks/useLightweightChart";

interface FearGreedChartModalProps {
  open: boolean;
  onClose: () => void;
  currentValue?: number;
  currentLabel?: string;
}

const RANGE_OPTIONS = [
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
  { label: "5Y", value: "5y" },
];

function gaugeColor(value: number): string {
  if (value <= 24) return "#ef4444";
  if (value <= 44) return "#f97316";
  if (value <= 55) return "#eab308";
  if (value <= 75) return "#84cc16";
  return "#22c55e";
}

function gaugeTextClass(value: number): string {
  if (value <= 24) return "text-red-500";
  if (value <= 44) return "text-orange-500";
  if (value <= 55) return "text-yellow-500";
  if (value <= 75) return "text-lime-500";
  return "text-green-500";
}

interface FearGreedChartProps {
  range: string;
  lineColor: string;
  onPointsLoaded?: (points: FearGreedHistoryPoint[]) => void;
}

function FearGreedChart({ range, lineColor, onPointsLoaded }: FearGreedChartProps) {
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const { containerRef, chartRef } = useLightweightChart();

  const [points, setPoints] = useState<FearGreedHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch history on mount (the parent remounts this component when range changes).
  useEffect(() => {
    let cancelled = false;
    dataApi
      .getFearGreedHistory(range)
      .then((data) => {
        if (!cancelled) {
          setPoints(data);
          onPointsLoaded?.(data);
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
  }, [range, onPointsLoaded]);

  // Add line series once the shared chart is ready.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const series = chart.addSeries(LineSeries, {
      color: lineColor,
      lineWidth: 2,
      crosshairMarkerVisible: true,
      autoscaleInfoProvider: () => ({
        priceRange: { minValue: 0, maxValue: 100 },
      }),
    });
    seriesRef.current = series;
    return () => {
      if (seriesRef.current) {
        chart.removeSeries(seriesRef.current);
        seriesRef.current = null;
      }
    };
  }, [chartRef, lineColor]);

  // Update line data. Deduplicate by date as a safety net.
  useEffect(() => {
    if (!seriesRef.current) return;
    if (points.length > 0) {
      const byDate = new Map<string, number>();
      for (const p of points) {
        byDate.set(p.date, p.value);
      }
      const data = Array.from(byDate.entries())
        .map(([date, value]) => ({ time: date, value }))
        .sort((a, b) => String(a.time).localeCompare(String(b.time)));
      seriesRef.current.setData(data);
      requestAnimationFrame(() => {
        chartRef.current?.timeScale().fitContent();
      });
    } else {
      seriesRef.current.setData([]);
    }
  }, [points, chartRef]);

  return (
    <>
      {loading && <div className="text-xs text-gray-500">Loading chart…</div>}
      {error && <div className="text-xs text-red-500">{error}</div>}
      {!loading && !error && points.length === 0 && (
        <div className="text-xs text-gray-400">No historical data available.</div>
      )}
      <div ref={containerRef} className="w-full h-[360px]" />
    </>
  );
}

export default function FearGreedChartModal({
  open,
  onClose,
  currentValue,
  currentLabel,
}: FearGreedChartModalProps) {
  const [selectedRange, setSelectedRange] = useState("1y");
  const [points, setPoints] = useState<FearGreedHistoryPoint[]>([]);

  const rangeLabel = RANGE_OPTIONS.find((o) => o.value === selectedRange)?.label || selectedRange;
  const lineColor = useMemo(() => gaugeColor(currentValue ?? points[points.length - 1]?.value ?? 50), [currentValue, points]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const latest = points[points.length - 1];
  const start = points[0];
  const periodReturn = useMemo(() => {
    if (!start || !latest) return null;
    return latest.value - start.value;
  }, [start, latest]);

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
            <h3 className="text-sm font-bold text-gray-900 truncate">Fear &amp; Greed History</h3>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {currentValue !== undefined && currentLabel ? (
                <span>
                  Now: <span className={`font-semibold ${gaugeTextClass(currentValue)}`}>{currentLabel}</span> ({currentValue}/100)
                  {periodReturn !== null && (
                    <span className={`ml-2 ${periodReturn >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {periodReturn >= 0 ? "+" : ""}{periodReturn} pts over {rangeLabel}
                    </span>
                  )}
                </span>
              ) : (
                <span>Daily Fear &amp; Greed index</span>
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
          <FearGreedChart
            key={selectedRange}
            range={selectedRange}
            lineColor={lineColor}
            onPointsLoaded={setPoints}
          />
        </div>

        <div className="px-4 pb-3 pt-0 flex flex-wrap gap-2 text-[10px] text-gray-400">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Extreme Fear</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" />Fear</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" />Neutral</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-lime-500" />Greed</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Extreme Greed</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
