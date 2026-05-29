import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  CrosshairMode,
} from "lightweight-charts";
import { dataApi, type CandleData, type IndicatorSeries, type FormulaResponse } from "../lib/api";
import { RefreshCw, X, Activity, BarChart3, Pencil, Eye, EyeOff, Settings, Plus } from "lucide-react";

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

interface FormulaItem {
  id: string;
  formula: string;
  enabled: boolean;
  name?: string;
  description?: string;
}

const COLORS = [
  "#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
];

function FormulaDocs() {
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-3">
      <div className="text-[10px] font-bold text-gray-900 uppercase tracking-wide mb-1">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
  const Fn = ({ sig, desc }: { sig: string; desc: string }) => (
    <div className="flex items-start gap-1.5 text-[10px]">
      <code className="text-purple-700 font-mono bg-purple-50 px-1 rounded shrink-0">{sig}</code>
      <span className="text-gray-600">{desc}</span>
    </div>
  );
  const Ex = ({ children }: { children: React.ReactNode }) => (
    <code className="block text-[10px] font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{children}</code>
  );
  return (
    <div>
      <Section title="Price Data">
        <Fn sig="close()" desc="closing price" />
        <Fn sig="open()" desc="opening price" />
        <Fn sig="high()" desc="high price" />
        <Fn sig="low()" desc="low price" />
        <Fn sig="volume()" desc="trading volume" />
        <Fn sig="hl2()" desc="(high + low) / 2" />
        <Fn sig="hlc3()" desc="(high + low + close) / 3" />
        <Fn sig="ohlc4()" desc="(open + high + low + close) / 4" />
      </Section>
      <Section title="Moving Averages">
        <Fn sig="sma(period)" desc="Simple Moving Average of close" />
        <Fn sig="ema(period)" desc="Exponential Moving Average of close" />
        <Fn sig="wma(period)" desc="Weighted Moving Average of close" />
        <Fn sig="hma(period)" desc="Hull Moving Average of close" />
        <Fn sig="vwma(period)" desc="Volume Weighted Moving Average" />
      </Section>
      <Section title="Oscillators">
        <Fn sig="rsi(period)" desc="Relative Strength Index (0–100)" />
        <Fn sig="macd(f,s,sg)" desc="MACD line" />
        <Fn sig="macd_signal(f,s,sg)" desc="MACD signal line" />
        <Fn sig="macd_hist(f,s,sg)" desc="MACD histogram" />
        <Fn sig="stoch_k(period)" desc="Stochastic %K" />
        <Fn sig="stoch_d(p,sk)" desc="Stochastic %D (SMA of %K)" />
        <Fn sig="williams_r(period)" desc="Williams %R (–100 to 0)" />
        <Fn sig="cci(period)" desc="Commodity Channel Index" />
        <Fn sig="mfi(period)" desc="Money Flow Index (0–100)" />
      </Section>
      <Section title="Bollinger Bands">
        <Fn sig="bb_upper(p,m)" desc="Upper band" />
        <Fn sig="bb_middle(period)" desc="Middle band (SMA)" />
        <Fn sig="bb_lower(p,m)" desc="Lower band" />
      </Section>
      <Section title="Volatility">
        <Fn sig="atr(period)" desc="Average True Range" />
        <Fn sig="stddev(period)" desc="Standard Deviation of close" />
        <Fn sig="tr()" desc="True Range" />
      </Section>
      <Section title="Volume">
        <Fn sig="obv()" desc="On Balance Volume" />
      </Section>
      <Section title="Operators">
        <div className="text-[10px] text-gray-600"><code className="text-purple-700 font-mono bg-purple-50 px-1 rounded">+ – * /</code> arithmetic</div>
        <div className="text-[10px] text-gray-600"><code className="text-purple-700 font-mono bg-purple-50 px-1 rounded">( )</code> parentheses</div>
        <div className="text-[10px] text-gray-600"><code className="text-purple-700 font-mono bg-purple-50 px-1 rounded">-expr</code> unary minus</div>
      </Section>
      <Section title="Examples">
        <Ex>rsi(14)</Ex>
        <Ex>close() - sma(20)</Ex>
        <Ex>macd(12,26,9) - macd_signal(12,26,9)</Ex>
        <Ex>(bb_upper(20,2) - bb_lower(20,2)) / bb_middle(20)</Ex>
        <Ex>rsi(14) * 0.5 + macd_hist(12,26,9) * 0.5</Ex>
        <Ex>atr(14) / close()</Ex>
        <Ex>cci(20)</Ex>
        <Ex>obv() / vwma(20)</Ex>
      </Section>
    </div>
  );
}

function toChartTime(dateStr: string, interval: IntervalValue): any {
  const d = new Date(dateStr);
  if (interval === "1d" || interval === "1w" || interval === "1mo") {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return Math.floor(d.getTime() / 1000);
}

function sortByTime<T extends { time: string | number }>(data: T[]): T[] {
  return [...data].sort((a, b) => {
    if (typeof a.time === "string" && typeof b.time === "string") {
      return a.time.localeCompare(b.time);
    }
    return (a.time as number) - (b.time as number);
  });
}

function getYahooInterval(interval: IntervalValue): string {
  return INTERVALS.find((i) => i.value === interval)?.yahooInterval ?? interval;
}

const STORAGE_KEY = "stockcentral-chart-settings";

function loadSavedSettings(): { indicators: IndicatorToggle[]; formulas: FormulaItem[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const indicators = (Array.isArray(parsed.indicators) ? parsed.indicators : []) as IndicatorToggle[];
      const formulas = (Array.isArray(parsed.formulas) ? parsed.formulas : []) as FormulaItem[];
      // Migrate old formulas without enabled, name, or description
      const migratedFormulas = formulas.map((f) => ({
        ...f,
        enabled: f.enabled ?? true,
        name: f.name ?? "",
        description: f.description ?? "",
      }));
      // Merge saved indicators with defaults so new types aren't lost
      const savedMap = new Map(indicators.map((i) => [i.type, i]));
      return {
        indicators: DEFAULT_INDICATORS.map((def) => savedMap.get(def.type) || def),
        formulas: migratedFormulas,
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
  const [indicatorConfig, setIndicatorConfig] = useState<IndicatorToggle[]>(savedSettings.indicators);
  const [indicatorData, setIndicatorData] = useState<Record<string, IndicatorSeries[]>>({});
  const [activeFormulas, setActiveFormulas] = useState<FormulaItem[]>(savedSettings.formulas);
  const [formulaData, setFormulaData] = useState<Record<string, FormulaResponse>>({});
  const [formulaError, setFormulaError] = useState<string | null>(null);
  const [formulaModalOpen, setFormulaModalOpen] = useState(false);
  const [editingFormulaId, setEditingFormulaId] = useState<string | null>(null);
  const [editingFormulaText, setEditingFormulaText] = useState("");
  const [editingFormulaName, setEditingFormulaName] = useState("");
  const [editingFormulaDescription, setEditingFormulaDescription] = useState("");
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState<IndicatorToggle | null>(null);

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
  const enabledFormulas = useMemo(() => activeFormulas.filter((f) => f.enabled), [activeFormulas]);

  const fetchCandles = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    try {
      const data = await dataApi.getCandles(symbol, range, getYahooInterval(interval));
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
      const res = await dataApi.getIndicators(symbol, range, getYahooInterval(interval), types, params);
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
    if (!symbol || enabledFormulas.length === 0) {
      setFormulaData((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }
    const results: Record<string, FormulaResponse> = {};
    await Promise.all(
      enabledFormulas.map(async (f) => {
        try {
          const res = await dataApi.postFormula({
            symbol,
            range,
            interval: getYahooInterval(interval),
            formula: f.formula,
          });
          results[f.id] = res;
        } catch (e: any) {
          console.error("Formula fetch failed:", e);
        }
      })
    );
    setFormulaData(results);
  }, [symbol, range, interval, enabledFormulas]);

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
    const candleData = sortByTime(candles.map((c) => ({
      time: toChartTime(c.date, interval),
      open: c.open, high: c.high, low: c.low, close: c.close,
    })));
    seriesRef.current.candlestick.setData(candleData as any);

    const volumeData = sortByTime(candles.map((c) => ({
      time: toChartTime(c.date, interval),
      value: c.volume,
      color: c.close >= c.open ? "#22c55e66" : "#ef444466",
    })));
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
        line.setData(sortByTime(ind.points.map((p) => ({ time: toChartTime(p.date, interval), value: p.value }))) as any);
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
        line.setData(sortByTime(ind.points.map((p) => ({ time: toChartTime(p.date, interval), value: p.value }))) as any);
        seriesRef.current.oscillator.set(ind.name, line);
      });
    });

    // Add formulas
    Object.entries(formulaData).forEach(([fid, res]) => {
      const color = COLORS[colorIdx % COLORS.length];
      colorIdx++;
      const item = activeFormulas.find((f) => f.id === fid);
      const title = item?.name?.trim() ? item.name.trim() : res.name;
      const line = chart.addSeries(LineSeries, { color, lineWidth: 2, title });
      line.setData(sortByTime(res.points.map((p) => ({ time: toChartTime(p.date, interval), value: p.value }))) as any);
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
  }, [indicatorData, formulaData, interval, activeFormulas]);

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

  const openIndicatorModal = (type: IndicatorToggle["type"]) => {
    const ind = indicatorConfig.find((i) => i.type === type);
    if (ind) setEditingIndicator({ ...ind });
  };

  const closeIndicatorModal = () => {
    setEditingIndicator(null);
  };

  const saveIndicatorSettings = () => {
    if (!editingIndicator) return;
    setIndicatorConfig((prev) =>
      prev.map((ind) => (ind.type === editingIndicator.type ? editingIndicator : ind))
    );
    closeIndicatorModal();
  };

  const removeFormula = (id: string) => {
    setActiveFormulas((prev) => prev.filter((f) => f.id !== id));
    setFormulaData((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const toggleFormulaEnabled = (id: string) => {
    setActiveFormulas((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
  };

  const openAddModal = () => {
    setEditingFormulaId(null);
    setEditingFormulaText("");
    setEditingFormulaName("");
    setEditingFormulaDescription("");
    setFormulaError(null);
    setFormulaModalOpen(true);
  };

  const openEditModal = (item: FormulaItem) => {
    setEditingFormulaId(item.id);
    setEditingFormulaText(item.formula);
    setEditingFormulaName(item.name ?? "");
    setEditingFormulaDescription(item.description ?? "");
    setFormulaError(null);
    setFormulaModalOpen(true);
  };

  const closeFormulaModal = () => {
    setFormulaModalOpen(false);
    setEditingFormulaId(null);
    setEditingFormulaText("");
    setEditingFormulaName("");
    setEditingFormulaDescription("");
    setFormulaError(null);
  };

  const saveFormulaModal = async () => {
    const trimmed = editingFormulaText.trim();
    if (!trimmed) return;
    setFormulaError(null);
    try {
      const res = await dataApi.postFormula({
        symbol,
        range,
        interval,
        formula: trimmed,
      });
      if (!editingFormulaId) {
        // Add mode
        const id = crypto.randomUUID();
        setActiveFormulas((prev) => [
          ...prev,
          {
            id,
            formula: trimmed,
            enabled: true,
            name: editingFormulaName.trim(),
            description: editingFormulaDescription.trim(),
          },
        ]);
        setFormulaData((prev) => ({ ...prev, [id]: res }));
      } else {
        // Edit mode
        setActiveFormulas((prev) =>
          prev.map((f) =>
            f.id === editingFormulaId
              ? { ...f, formula: trimmed, name: editingFormulaName.trim(), description: editingFormulaDescription.trim() }
              : f
          )
        );
        setFormulaData((prev) => ({ ...prev, [editingFormulaId]: res }));
      }
      closeFormulaModal();
    } catch (e: any) {
      setFormulaError(e.message || "Invalid formula");
    }
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

      {/* Indicator panel - no box wrapper */}
      <div className="mt-3">
        <div className="flex items-center gap-3 flex-wrap">
          {indicatorConfig.map((ind) => (
            <div key={ind.type} className="flex items-center gap-1">
              <button
                onClick={() => toggleIndicator(ind.type)}
                className={`text-[11px] font-medium transition-colors ${
                  ind.enabled ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {ind.label}
              </button>
              <button
                onClick={() => openIndicatorModal(ind.type)}
                className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                title={`${ind.label} settings`}
              >
                <Settings size={10} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <hr className="border-gray-200 my-3" />

      {/* Formula panel */}
      <div className="mt-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-purple-500" />
            <span className="text-[11px] font-semibold text-gray-700">Custom Formula</span>
            {activeFormulas.length > 0 && (
              <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                {activeFormulas.filter((f) => f.enabled).length}/{activeFormulas.length} active
              </span>
            )}
            <button
              onClick={openAddModal}
              className="flex items-center justify-center w-5 h-5 rounded bg-purple-600 text-white hover:bg-purple-700 ml-0.5"
              title="Add formula"
            >
              <Plus size={10} />
            </button>
          </div>
          <button
            onClick={() => setDocsModalOpen(true)}
            className="text-[10px] text-gray-500 hover:text-gray-700 underline"
          >
            Docs
          </button>
        </div>

        {/* Active formula chips */}
        {activeFormulas.length > 0 && (
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            {activeFormulas.map((f) => (
              <span
                key={f.id}
                className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded border ${
                  f.enabled
                    ? "bg-purple-50 text-purple-700 border-purple-100"
                    : "bg-gray-100 text-gray-400 border-gray-200"
                }`}
              >
                <button
                  onClick={() => toggleFormulaEnabled(f.id)}
                  className="hover:text-purple-900"
                  title={f.enabled ? "Disable" : "Enable"}
                >
                  {f.enabled ? <Eye size={10} /> : <EyeOff size={10} />}
                </button>
                <span className={f.enabled ? "" : "line-through opacity-60"} title={f.formula}>
                  {f.name?.trim() ? f.name.trim() : f.formula}
                </span>
                <button
                  onClick={() => openEditModal(f)}
                  className="hover:text-purple-900"
                  title={f.description ? f.description : "Edit"}
                >
                  <Pencil size={10} />
                </button>
                <button
                  onClick={() => removeFormula(f.id)}
                  className="hover:text-purple-900"
                  title="Remove"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Formula Modal (Add / Edit) */}
      {formulaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[56vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">
                {editingFormulaId ? "Edit Formula" : "Add Formula"}
              </h3>
              <button onClick={closeFormulaModal} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                <X size={14} />
              </button>
            </div>
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              {/* Left — form */}
              <div className="flex-1 p-4 overflow-auto">
                <textarea
                  value={editingFormulaText}
                  onChange={(e) => setEditingFormulaText(e.target.value)}
                  placeholder="e.g. rsi(14) + macd(12,26,9)"
                  className="w-full text-[11px] px-2 py-1.5 rounded border border-gray-300 bg-white font-mono resize-none"
                  rows={5}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveFormulaModal();
                  }}
                />
                <div className="mt-2">
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Name (optional)</label>
                  <input
                    type="text"
                    value={editingFormulaName}
                    onChange={(e) => setEditingFormulaName(e.target.value)}
                    placeholder="e.g. My Custom RSI"
                    className="w-full text-[11px] px-2 py-1.5 rounded border border-gray-300 bg-white"
                  />
                </div>
                <div className="mt-2">
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={editingFormulaDescription}
                    onChange={(e) => setEditingFormulaDescription(e.target.value)}
                    placeholder="e.g. Custom RSI blend"
                    className="w-full text-[11px] px-2 py-1.5 rounded border border-gray-300 bg-white"
                  />
                </div>
                {formulaError && (
                  <div className="text-[10px] text-red-500 mt-1.5">{formulaError}</div>
                )}
              </div>
              {/* Right — docs */}
              <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-gray-100 bg-gray-50 p-3 overflow-auto">
                <div className="text-[10px] font-semibold text-gray-500 mb-1">Reference</div>
                <FormulaDocs />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-100">
              <button
                onClick={closeFormulaModal}
                className="text-[11px] font-medium px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveFormulaModal}
                className="text-[11px] font-medium px-3 py-1.5 rounded bg-purple-600 text-white hover:bg-purple-700"
              >
                {editingFormulaId ? "Save" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Docs Modal */}
      {docsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">Formula Reference</h3>
              <button onClick={() => setDocsModalOpen(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                <X size={14} />
              </button>
            </div>
            <div className="text-[10px] text-gray-600 bg-gray-50 p-3 rounded overflow-auto flex-1">
              <FormulaDocs />
            </div>
          </div>
        </div>
      )}

      {/* Indicator Settings Modal */}
      {editingIndicator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">{editingIndicator.label} Settings</h3>
              <button onClick={closeIndicatorModal} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                <X size={14} />
              </button>
            </div>
            <div className="space-y-3">
              {editingIndicator.type === "sma" && (
                <label className="flex items-center justify-between text-[12px] text-gray-700">
                  Period
                  <input
                    type="number"
                    value={editingIndicator.params.period}
                    onChange={(e) =>
                      setEditingIndicator((prev) =>
                        prev ? { ...prev, params: { ...prev.params, period: Number(e.target.value) } } : prev
                      )
                    }
                    className="w-20 px-2 py-1 rounded border border-gray-300 text-[12px]"
                    min={2} max={200}
                  />
                </label>
              )}
              {editingIndicator.type === "ema" && (
                <label className="flex items-center justify-between text-[12px] text-gray-700">
                  Period
                  <input
                    type="number"
                    value={editingIndicator.params.period}
                    onChange={(e) =>
                      setEditingIndicator((prev) =>
                        prev ? { ...prev, params: { ...prev.params, period: Number(e.target.value) } } : prev
                      )
                    }
                    className="w-20 px-2 py-1 rounded border border-gray-300 text-[12px]"
                    min={2} max={200}
                  />
                </label>
              )}
              {editingIndicator.type === "bollinger" && (
                <>
                  <label className="flex items-center justify-between text-[12px] text-gray-700">
                    Period
                    <input
                      type="number"
                      value={editingIndicator.params.period}
                      onChange={(e) =>
                        setEditingIndicator((prev) =>
                          prev ? { ...prev, params: { ...prev.params, period: Number(e.target.value) } } : prev
                        )
                      }
                      className="w-20 px-2 py-1 rounded border border-gray-300 text-[12px]"
                      min={2} max={200}
                    />
                  </label>
                  <label className="flex items-center justify-between text-[12px] text-gray-700">
                    Multiplier
                    <input
                      type="number"
                      value={editingIndicator.params.mult}
                      onChange={(e) =>
                        setEditingIndicator((prev) =>
                          prev ? { ...prev, params: { ...prev.params, mult: Number(e.target.value) } } : prev
                        )
                      }
                      className="w-20 px-2 py-1 rounded border border-gray-300 text-[12px]"
                      min={0.5} max={5} step={0.5}
                    />
                  </label>
                </>
              )}
              {editingIndicator.type === "rsi" && (
                <label className="flex items-center justify-between text-[12px] text-gray-700">
                  Period
                  <input
                    type="number"
                    value={editingIndicator.params.period}
                    onChange={(e) =>
                      setEditingIndicator((prev) =>
                        prev ? { ...prev, params: { ...prev.params, period: Number(e.target.value) } } : prev
                      )
                    }
                    className="w-20 px-2 py-1 rounded border border-gray-300 text-[12px]"
                    min={2} max={100}
                  />
                </label>
              )}
              {editingIndicator.type === "macd" && (
                <>
                  <label className="flex items-center justify-between text-[12px] text-gray-700">
                    Fast
                    <input
                      type="number"
                      value={editingIndicator.params.fast}
                      onChange={(e) =>
                        setEditingIndicator((prev) =>
                          prev ? { ...prev, params: { ...prev.params, fast: Number(e.target.value) } } : prev
                        )
                      }
                      className="w-20 px-2 py-1 rounded border border-gray-300 text-[12px]"
                      min={2} max={100}
                    />
                  </label>
                  <label className="flex items-center justify-between text-[12px] text-gray-700">
                    Slow
                    <input
                      type="number"
                      value={editingIndicator.params.slow}
                      onChange={(e) =>
                        setEditingIndicator((prev) =>
                          prev ? { ...prev, params: { ...prev.params, slow: Number(e.target.value) } } : prev
                        )
                      }
                      className="w-20 px-2 py-1 rounded border border-gray-300 text-[12px]"
                      min={2} max={100}
                    />
                  </label>
                  <label className="flex items-center justify-between text-[12px] text-gray-700">
                    Signal
                    <input
                      type="number"
                      value={editingIndicator.params.signal}
                      onChange={(e) =>
                        setEditingIndicator((prev) =>
                          prev ? { ...prev, params: { ...prev.params, signal: Number(e.target.value) } } : prev
                        )
                      }
                      className="w-20 px-2 py-1 rounded border border-gray-300 text-[12px]"
                      min={2} max={100}
                    />
                  </label>
                </>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={closeIndicatorModal}
                className="text-[11px] font-medium px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveIndicatorSettings}
                className="text-[11px] font-medium px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
