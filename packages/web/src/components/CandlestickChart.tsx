import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  CrosshairMode,
} from "lightweight-charts";
import { dataApi, type CandleData, type IndicatorSeries, type FormulaResponse } from "../lib/api";
import { RefreshCw, X, Activity, BarChart3, ChevronDown, ChevronUp } from "lucide-react";

const INTERVALS = [
  { label: "1m", value: "1m", defaultRange: "1d", yahooInterval: "1m" },
  { label: "5m", value: "5m", defaultRange: "5d", yahooInterval: "5m" },
  { label: "15m", value: "15m", defaultRange: "5d", yahooInterval: "15m" },
  { label: "30m", value: "30m", defaultRange: "1mo", yahooInterval: "30m" },
  { label: "1h", value: "1h", defaultRange: "1mo", yahooInterval: "1h" },
  { label: "1d", value: "1d", defaultRange: "1y", yahooInterval: "1d" },
  { label: "1w", value: "1w", defaultRange: "5y", yahooInterval: "1wk" },
  { label: "1mo", value: "1mo", defaultRange: "5y", yahooInterval: "1mo" },
] as const;

type IntervalValue = (typeof INTERVALS)[number]["value"];

const RANGES = [
  { label: "1D", value: "1d" },
  { label: "5D", value: "5d" },
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
  { label: "5Y", value: "5y" },
] as const;

type RangeValue = (typeof RANGES)[number]["value"];

interface IndicatorToggle {
  type: "sma" | "ema" | "bollinger" | "rsi" | "macd";
  label: string;
  enabled: boolean;
  params: Record<string, number>;
}

const DEFAULT_INDICATORS: IndicatorToggle[] = [
  { type: "sma", label: "SMA", enabled: false, params: { period: 20 } },
  { type: "ema", label: "EMA", enabled: false, params: { period: 20 } },
  { type: "bollinger", label: "Bollinger", enabled: false, params: { period: 20, mult: 2 } },
  { type: "rsi", label: "RSI", enabled: false, params: { period: 14 } },
  { type: "macd", label: "MACD", enabled: false, params: { fast: 12, slow: 26, signal: 9 } },
];

const COLORS = [
  "#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
];

const FORMULA_HELP = `Price data:
  close()      — closing price
  open()       — opening price
  high()       — high price
  low()        — low price
  volume()     — trading volume
  hl2()        — (high + low) / 2
  hlc3()       — (high + low + close) / 3
  ohlc4()      — (open + high + low + close) / 4

Moving averages:
  sma(period)                   — Simple Moving Average
  ema(period)                   — Exponential Moving Average

Oscillators:
  rsi(period)                   — Relative Strength Index (0-100)
  macd(fast,slow,signal)        — MACD line
  macd_signal(fast,slow,signal) — MACD signal line
  macd_hist(fast,slow,signal)   — MACD histogram

Bollinger Bands:
  bb_upper(period,mult)         — Upper band
  bb_middle(period)             — Middle band (SMA)
  bb_lower(period,mult)         — Lower band

Operators: +  -  *  /  parentheses  unary minus

Examples:
  rsi(14)
  close() - sma(20)
  macd(12,26,9) - macd_signal(12,26,9)
  (bb_upper(20,2) - bb_lower(20,2)) / bb_middle(20)
  rsi(14) * 0.5 + macd_hist(12,26,9) * 0.5`;

function toChartTime(dateStr: string, interval: IntervalValue): any {
  const d = new Date(dateStr);
  if (interval === "1d" || interval === "1w" || interval === "1mo") {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return Math.floor(d.getTime() / 1000);
}

const STORAGE_KEY = "stockcentral-chart-settings";

function loadSavedSettings(): { indicators: IndicatorToggle[]; formulas: { id: string; formula: string }[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const indicators = (Array.isArray(parsed.indicators) ? parsed.indicators : []) as IndicatorToggle[];
      const formulas = (Array.isArray(parsed.formulas) ? parsed.formulas : []) as { id: string; formula: string }[];
      // Merge saved indicators with defaults so new types aren't lost
      const savedMap = new Map(indicators.map((i) => [i.type, i]));
      return {
        indicators: DEFAULT_INDICATORS.map((def) => savedMap.get(def.type) || def),
        formulas,
      };
    }
  } catch {}
  return { indicators: DEFAULT_INDICATORS, formulas: [] };
}

const savedSettings = loadSavedSettings();

export default function CandlestickChart({ symbol }: { symbol: string }) {
  const [interval, setInterval] = useState<IntervalValue>("1d");
  const [range, setRange] = useState<RangeValue>("1y");
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [formulaOpen, setFormulaOpen] = useState(false);
  const [indicatorConfig, setIndicatorConfig] = useState<IndicatorToggle[]>(savedSettings.indicators);
  const [indicatorData, setIndicatorData] = useState<Record<string, IndicatorSeries[]>>({});
  const [activeFormulas, setActiveFormulas] = useState<{ id: string; formula: string }[]>(savedSettings.formulas);
  const [formulaData, setFormulaData] = useState<Record<string, FormulaResponse>>({});
  const [formulaText, setFormulaText] = useState("");
  const [formulaError, setFormulaError] = useState<string | null>(null);
  const [showFormulaHelp, setShowFormulaHelp] = useState(false);

  const mainContainerRef = useRef<HTMLDivElement>(null);
  const oscContainerRef = useRef<HTMLDivElement>(null);
  const mainChartRef = useRef<any>(null);
  const oscChartRef = useRef<any>(null);
  const seriesRef = useRef<{
    candlestick: any;
    volume: any;
    overlays: Map<string, any>;
    oscillator: Map<string, any>;
  }>({ candlestick: null, volume: null, overlays: new Map(), oscillator: new Map() });
  const skipSyncRef = useRef(false);

  const enabledIndicators = useMemo(() => indicatorConfig.filter((i) => i.enabled), [indicatorConfig]);

  const fetchCandles = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    try {
      const data = await dataApi.getCandles(symbol, range, interval);
      setCandles(data);
    } catch (e) {
      console.error("Failed to fetch candles:", e);
    } finally {
      setLoading(false);
    }
  }, [symbol, range, interval]);

  const fetchIndicators = useCallback(async () => {
    if (!symbol || enabledIndicators.length === 0) {
      setIndicatorData((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }
    const types = enabledIndicators.map((i) => i.type);
    const params: Record<string, string> = {};
    enabledIndicators.forEach((ind) => {
      Object.entries(ind.params).forEach(([k, v]) => {
        const prefix = ind.type === "bollinger" ? "bb" : ind.type === "macd" ? "macd" : ind.type === "rsi" ? "rsi" : ind.type;
        params[`${prefix}_${k}`] = String(v);
      });
    });
    try {
      const res = await dataApi.getIndicators(symbol, range, interval, types, params);
      const byType: Record<string, IndicatorSeries[]> = {};
      res.indicators.forEach((ind) => {
        const baseName = ind.name.split("(")[0].toLowerCase().trim();
        if (!byType[baseName]) byType[baseName] = [];
        byType[baseName].push(ind);
      });
      setIndicatorData(byType);
    } catch (e) {
      console.error("Failed to fetch indicators:", e);
    }
  }, [symbol, range, interval, enabledIndicators]);

  const fetchFormulas = useCallback(async () => {
    if (!symbol || activeFormulas.length === 0) {
      setFormulaData((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }
    const results: Record<string, FormulaResponse> = {};
    await Promise.all(
      activeFormulas.map(async (f) => {
        try {
          const res = await dataApi.postFormula({
            symbol,
            range,
            interval,
            formula: f.formula,
          });
          results[f.id] = res;
        } catch (e: any) {
          console.error("Formula fetch failed:", e);
        }
      })
    );
    setFormulaData(results);
  }, [symbol, range, interval, activeFormulas]);

  // Persist indicators & formulas to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      indicators: indicatorConfig,
      formulas: activeFormulas,
    }));
  }, [indicatorConfig, activeFormulas]);

  // Live polling
  useEffect(() => {
    fetchCandles();
    const pollMs = interval === "1m" || interval === "5m" ? 30000 : 60000;
    const tick = () => { fetchCandles(); };
    const timer = window.setInterval(tick, pollMs);
    return () => window.clearInterval(timer);
  }, [fetchCandles, interval]);

  useEffect(() => {
    fetchIndicators();
  }, [fetchIndicators]);

  useEffect(() => {
    fetchFormulas();
  }, [fetchFormulas]);

  // Initialize main chart
  useEffect(() => {
    if (!mainContainerRef.current) return;
    const chart = createChart(mainContainerRef.current, {
      layout: { background: { color: "#ffffff" }, textColor: "#6b7280" },
      grid: { vertLines: { color: "#f3f4f6" }, horzLines: { color: "#f3f4f6" } },
      rightPriceScale: { borderColor: "#e5e7eb" },
      timeScale: { borderColor: "#e5e7eb", timeVisible: interval !== "1d" && interval !== "1w" && interval !== "1mo" },
      crosshair: { mode: CrosshairMode.Normal },
      autoSize: true,
      handleScale: { mouseWheel: false, pinch: true },
    });
    mainChartRef.current = chart;

    const candlestick = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e", downColor: "#ef4444",
      borderUpColor: "#22c55e", borderDownColor: "#ef4444",
      wickUpColor: "#22c55e", wickDownColor: "#ef4444",
    });
    const volume = chart.addSeries(HistogramSeries, {
      color: "#9ca3af", priceFormat: { type: "volume" }, priceScaleId: "",
    });
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    seriesRef.current.candlestick = candlestick;
    seriesRef.current.volume = volume;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      const timeScale = chart.timeScale();
      const range = timeScale.getVisibleLogicalRange();
      if (!range) return;
      const zoomSpeed = 2.5;
      const zoomFactor = Math.exp(-e.deltaY * 0.001 * zoomSpeed);
      const center = (range.from + range.to) / 2;
      const halfSpan = (range.to - range.from) / 2;
      const newHalfSpan = Math.max(2, halfSpan * zoomFactor);
      timeScale.setVisibleLogicalRange({ from: center - newHalfSpan, to: center + newHalfSpan });
    };
    const container = mainContainerRef.current;
    container?.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      container?.removeEventListener("wheel", onWheel);
      chart.remove();
      mainChartRef.current = null;
      seriesRef.current.candlestick = null;
      seriesRef.current.volume = null;
      seriesRef.current.overlays.clear();
    };
  }, [interval]);

  // Initialize oscillator chart (always create the div, but we'll lazy-init the chart)
  useEffect(() => {
    if (!oscContainerRef.current) return;
    const chart = createChart(oscContainerRef.current, {
      layout: { background: { color: "#ffffff" }, textColor: "#6b7280" },
      grid: { vertLines: { color: "#f3f4f6" }, horzLines: { color: "#f3f4f6" } },
      rightPriceScale: { borderColor: "#e5e7eb" },
      timeScale: { borderColor: "#e5e7eb", timeVisible: interval !== "1d" && interval !== "1w" && interval !== "1mo", visible: false },
      crosshair: { mode: CrosshairMode.Normal },
      autoSize: true,
      handleScale: { mouseWheel: false, pinch: true },
    });
    oscChartRef.current = chart;

    const onWheelOsc = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      const timeScale = chart.timeScale();
      const range = timeScale.getVisibleLogicalRange();
      if (!range) return;
      const zoomSpeed = 2.5;
      const zoomFactor = Math.exp(-e.deltaY * 0.001 * zoomSpeed);
      const center = (range.from + range.to) / 2;
      const halfSpan = (range.to - range.from) / 2;
      const newHalfSpan = Math.max(2, halfSpan * zoomFactor);
      timeScale.setVisibleLogicalRange({ from: center - newHalfSpan, to: center + newHalfSpan });
    };
    const oscContainer = oscContainerRef.current;
    oscContainer?.addEventListener("wheel", onWheelOsc, { passive: false });

    return () => {
      oscContainer?.removeEventListener("wheel", onWheelOsc);
      chart.remove();
      oscChartRef.current = null;
      seriesRef.current.oscillator.clear();
    };
  }, [interval]);

  // Update candlestick data
  useEffect(() => {
    if (!seriesRef.current.candlestick || candles.length === 0) return;
    const candleData = candles.map((c) => ({
      time: toChartTime(c.date, interval),
      open: c.open, high: c.high, low: c.low, close: c.close,
    }));
    seriesRef.current.candlestick.setData(candleData as any);

    const volumeData = candles.map((c) => ({
      time: toChartTime(c.date, interval),
      value: c.volume,
      color: c.close >= c.open ? "#22c55e66" : "#ef444466",
    }));
    seriesRef.current.volume.setData(volumeData as any);

    mainChartRef.current?.timeScale().fitContent();
  }, [candles, interval]);

  // Update overlay indicators on main chart
  useEffect(() => {
    const chart = mainChartRef.current;
    if (!chart) return;

    seriesRef.current.overlays.forEach((s) => chart.removeSeries(s));
    seriesRef.current.overlays.clear();

    let colorIdx = 0;
    Object.values(indicatorData).forEach((seriesList) => {
      seriesList.forEach((ind) => {
        if (ind.name.toLowerCase().startsWith("rsi") || ind.name.toLowerCase().startsWith("macd")) return;
        const color = COLORS[colorIdx % COLORS.length];
        colorIdx++;
        const line = chart.addSeries(LineSeries, { color, lineWidth: 2, title: ind.name });
        line.setData(ind.points.map((p) => ({ time: toChartTime(p.date, interval), value: p.value })) as any);
        seriesRef.current.overlays.set(ind.name, line);
      });
    });
  }, [indicatorData, interval]);

  // Update oscillator chart
  useEffect(() => {
    const chart = oscChartRef.current;
    if (!chart) return;

    // Suppress bidirectional sync while we tear down / rebuild oscillator series
    // so removeSeries/addSeries/setData don't echo back to the main chart.
    skipSyncRef.current = true;

    seriesRef.current.oscillator.forEach((s) => chart.removeSeries(s));
    seriesRef.current.oscillator.clear();

    let colorIdx = 0;

    // Add RSI/MACD from indicators
    Object.values(indicatorData).forEach((seriesList) => {
      seriesList.forEach((ind) => {
        if (!ind.name.toLowerCase().startsWith("rsi") && !ind.name.toLowerCase().startsWith("macd")) return;
        const color = COLORS[colorIdx % COLORS.length];
        colorIdx++;
        const line = chart.addSeries(LineSeries, { color, lineWidth: 2, title: ind.name });
        line.setData(ind.points.map((p) => ({ time: toChartTime(p.date, interval), value: p.value })) as any);
        seriesRef.current.oscillator.set(ind.name, line);
      });
    });

    // Add formulas
    Object.entries(formulaData).forEach(([fid, res]) => {
      const color = COLORS[colorIdx % COLORS.length];
      colorIdx++;
      const line = chart.addSeries(LineSeries, { color, lineWidth: 2, title: res.name });
      line.setData(res.points.map((p) => ({ time: toChartTime(p.date, interval), value: p.value })) as any);
      seriesRef.current.oscillator.set(fid, line);
    });

    // Keep oscillator in sync with main chart so it doesn't start zoomed out
    const mainChart = mainChartRef.current;
    if (mainChart) {
      const range = mainChart.timeScale().getVisibleLogicalRange();
      if (range) {
        chart.timeScale().setVisibleLogicalRange(range);
      }
    }

    // Defer re-enabling sync until after any async range-change events fire
    const t = window.setTimeout(() => {
      skipSyncRef.current = false;
    }, 50);

    return () => window.clearTimeout(t);
  }, [indicatorData, formulaData, interval]);

  // Sync scroll/zoom between main and oscillator charts (bidirectional)
  useEffect(() => {
    const mainChart = mainChartRef.current;
    const oscChart = oscChartRef.current;
    if (!mainChart || !oscChart) return;

    let syncing = false;

    const syncMainToOsc = () => {
      if (syncing || skipSyncRef.current) return;
      const range = mainChart.timeScale().getVisibleLogicalRange();
      if (!range) return;
      syncing = true;
      oscChart.timeScale().setVisibleLogicalRange(range);
      syncing = false;
    };

    const syncOscToMain = () => {
      if (syncing || skipSyncRef.current) return;
      const range = oscChart.timeScale().getVisibleLogicalRange();
      if (!range) return;
      syncing = true;
      mainChart.timeScale().setVisibleLogicalRange(range);
      syncing = false;
    };

    mainChart.timeScale().subscribeVisibleLogicalRangeChange(syncMainToOsc);
    oscChart.timeScale().subscribeVisibleLogicalRangeChange(syncOscToMain);

    return () => {
      mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(syncMainToOsc);
      oscChart.timeScale().unsubscribeVisibleLogicalRangeChange(syncOscToMain);
    };
  }, [interval]);

  const toggleIndicator = (type: IndicatorToggle["type"]) => {
    setIndicatorConfig((prev) =>
      prev.map((ind) => (ind.type === type ? { ...ind, enabled: !ind.enabled } : ind))
    );
  };

  const updateIndicatorParam = (type: IndicatorToggle["type"], key: string, value: number) => {
    setIndicatorConfig((prev) =>
      prev.map((ind) =>
        ind.type === type ? { ...ind, params: { ...ind.params, [key]: value } } : ind
      )
    );
  };

  const runFormula = async () => {
    if (!formulaText.trim()) return;
    setFormulaError(null);
    try {
      const res = await dataApi.postFormula({
        symbol,
        range,
        interval,
        formula: formulaText.trim(),
      });
      const id = crypto.randomUUID();
      setActiveFormulas((prev) => [...prev, { id, formula: formulaText.trim() }]);
      setFormulaData((prev) => ({ ...prev, [id]: res }));
      setFormulaText("");
    } catch (e: any) {
      setFormulaError(e.message || "Invalid formula");
    }
  };

  const removeFormula = (id: string) => {
    setActiveFormulas((prev) => prev.filter((f) => f.id !== id));
    setFormulaData((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const hasOscillatorData =
    Object.values(indicatorData).some((list) =>
      list.some((i) => i.name.toLowerCase().startsWith("rsi") || i.name.toLowerCase().startsWith("macd"))
    ) || Object.keys(formulaData).length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-gray-500" />
          <h2 className="text-sm font-bold text-gray-900">Price Chart</h2>
          {loading && <RefreshCw size={12} className="text-gray-400 animate-spin" />}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={fetchCandles} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Refresh">
            <RefreshCw size={12} />
          </button>

        </div>
      </div>

      {/* Interval & Range selectors */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-500 font-medium mr-1">Interval</span>
          {INTERVALS.map((i) => (
            <button
              key={i.value}
              onClick={() => { setInterval(i.value); setRange(i.defaultRange as RangeValue); }}
              className={`text-[11px] font-medium px-2 py-0.5 rounded transition-colors ${
                interval === i.value ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-500 font-medium mr-1">Range</span>
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`text-[11px] font-medium px-2 py-0.5 rounded transition-colors ${
                range === r.value ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div ref={mainContainerRef} className="w-full" style={{ height: 400 }} />
      <div
        ref={oscContainerRef}
        className="w-full mt-1 transition-all"
        style={{ height: hasOscillatorData ? 140 : 0, overflow: "hidden" }}
      />

      {/* Indicator panel */}
      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-[11px] font-semibold text-gray-700 mb-2">Indicators</div>

        {/* Horizontal toggle list */}
        <div className="flex items-center gap-3 mb-2 flex-wrap">
            {indicatorConfig.map((ind) => (
              <button
                key={ind.type}
                onClick={() => toggleIndicator(ind.type)}
                className={`text-[11px] font-medium transition-colors ${
                  ind.enabled ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {ind.label}
              </button>
            ))}
          </div>

          {/* Settings for enabled indicators */}
          {enabledIndicators.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              {enabledIndicators.map((ind) => (
                <div key={ind.type} className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-gray-500">{ind.label}</span>
                  {ind.type === "sma" && (
                    <label className="flex items-center gap-1 text-[11px] text-gray-600">
                      <input
                        type="number"
                        value={ind.params.period}
                        onChange={(e) => updateIndicatorParam(ind.type, "period", Number(e.target.value))}
                        className="w-12 px-1.5 py-0.5 rounded border border-gray-300 text-[11px]"
                        min={2} max={200}
                      />
                    </label>
                  )}
                  {ind.type === "ema" && (
                    <label className="flex items-center gap-1 text-[11px] text-gray-600">
                      <input
                        type="number"
                        value={ind.params.period}
                        onChange={(e) => updateIndicatorParam(ind.type, "period", Number(e.target.value))}
                        className="w-12 px-1.5 py-0.5 rounded border border-gray-300 text-[11px]"
                        min={2} max={200}
                      />
                    </label>
                  )}
                  {ind.type === "bollinger" && (
                    <>
                      <label className="flex items-center gap-1 text-[11px] text-gray-600">
                        <input
                          type="number"
                          value={ind.params.period}
                          onChange={(e) => updateIndicatorParam(ind.type, "period", Number(e.target.value))}
                          className="w-12 px-1.5 py-0.5 rounded border border-gray-300 text-[11px]"
                          min={2} max={200}
                        />
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-gray-600">
                        ×
                        <input
                          type="number"
                          value={ind.params.mult}
                          onChange={(e) => updateIndicatorParam(ind.type, "mult", Number(e.target.value))}
                          className="w-10 px-1.5 py-0.5 rounded border border-gray-300 text-[11px]"
                          min={0.5} max={5} step={0.5}
                        />
                      </label>
                    </>
                  )}
                  {ind.type === "rsi" && (
                    <label className="flex items-center gap-1 text-[11px] text-gray-600">
                      <input
                        type="number"
                        value={ind.params.period}
                        onChange={(e) => updateIndicatorParam(ind.type, "period", Number(e.target.value))}
                        className="w-12 px-1.5 py-0.5 rounded border border-gray-300 text-[11px]"
                        min={2} max={100}
                      />
                    </label>
                  )}
                  {ind.type === "macd" && (
                    <>
                      <label className="flex items-center gap-1 text-[11px] text-gray-600">
                        <input
                          type="number"
                          value={ind.params.fast}
                          onChange={(e) => updateIndicatorParam(ind.type, "fast", Number(e.target.value))}
                          className="w-10 px-1.5 py-0.5 rounded border border-gray-300 text-[11px]"
                          min={2} max={100}
                        />
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-gray-600">
                        <input
                          type="number"
                          value={ind.params.slow}
                          onChange={(e) => updateIndicatorParam(ind.type, "slow", Number(e.target.value))}
                          className="w-10 px-1.5 py-0.5 rounded border border-gray-300 text-[11px]"
                          min={2} max={100}
                        />
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-gray-600">
                        <input
                          type="number"
                          value={ind.params.signal}
                          onChange={(e) => updateIndicatorParam(ind.type, "signal", Number(e.target.value))}
                          className="w-10 px-1.5 py-0.5 rounded border border-gray-300 text-[11px]"
                          min={2} max={100}
                        />
                      </label>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      {/* Formula panel */}
      <div className="mt-3 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => setFormulaOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-purple-500" />
            <span className="text-[11px] font-semibold text-gray-700">Custom Formula</span>
            {activeFormulas.length > 0 && (
              <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                {activeFormulas.length} active
              </span>
            )}
          </div>
          {formulaOpen ? (
            <ChevronUp size={14} className="text-gray-400" />
          ) : (
            <ChevronDown size={14} className="text-gray-400" />
          )}
        </button>

        {formulaOpen && (
          <div className="px-3 pb-3">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <textarea
                  value={formulaText}
                  onChange={(e) => setFormulaText(e.target.value)}
                  placeholder="e.g. rsi(14) + macd(12,26,9)"
                  className="w-full text-[11px] px-2 py-1.5 rounded border border-gray-300 bg-white font-mono resize-none"
                  rows={2}
                />
                {formulaError && (
                  <div className="text-[10px] text-red-500 mt-1">{formulaError}</div>
                )}
              </div>
              <button
                onClick={runFormula}
                className="flex items-center gap-1 text-[11px] font-medium px-3 py-1.5 rounded bg-purple-600 text-white hover:bg-purple-700 whitespace-nowrap"
              >
                <Activity size={10} />
                Run
              </button>
            </div>

            {/* Active formula chips */}
            {activeFormulas.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {activeFormulas.map((f) => (
                  <span
                    key={f.id}
                    className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100"
                  >
                    {f.formula}
                    <button onClick={() => removeFormula(f.id)} className="hover:text-purple-900">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Formula docs toggle */}
            <button
              onClick={() => setShowFormulaHelp((s) => !s)}
              className="mt-2 text-[10px] text-gray-500 hover:text-gray-700 underline"
            >
              {showFormulaHelp ? "Hide docs" : "Show docs"}
            </button>
            {showFormulaHelp && (
              <pre className="mt-1 text-[10px] text-gray-500 bg-white p-2 rounded border border-gray-200 overflow-auto whitespace-pre-wrap">{FORMULA_HELP}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
