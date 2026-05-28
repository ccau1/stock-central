import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, ChevronDown, HelpCircle } from "lucide-react";
import type { PanelProps } from "./types";
import { dataApi } from "../lib/api";
import type {
  MacroIndicator,
  IndexPerformance,
  HeatmapUniverse,
} from "../lib/api";
import StockTreemap from "../components/StockTreemap";
import { PanelContainer, PanelError, PanelLoading, renderSvgLine, colorForChangePct, normalizeRatioSeries } from "./shared";
import { usePanelData } from "./hooks";

// ---------- Yield Curve Panel ----------

export function YieldCurvePanel({ title, refreshKey, onRefresh, description }: PanelProps) {
  const { data, loading, error } = usePanelData(
    () => dataApi.getYieldCurve(),
    [refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const spread10y3m = data?.spreads?.["10y_3m"] ?? 0;
  const inverted = spread10y3m < 0;

  const points = data
    ? [
        { label: "3M", val: data.yields["3m"] },
        { label: "5Y", val: data.yields["5y"] },
        { label: "10Y", val: data.yields["10y"] },
        { label: "30Y", val: data.yields["30y"] },
      ].filter((d) => d.val !== undefined)
    : [];

  const ycMin = Math.min(...points.map((d) => d.val ?? 0));
  const ycMax = Math.max(...points.map((d) => d.val ?? 0));
  const ycRange = ycMax - ycMin || 1;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">10Y − 3M</span>
          <span className={`font-bold ${inverted ? "text-red-600" : "text-gray-800"}`}>{spread10y3m.toFixed(2)}%</span>
        </div>
        {data?.yields["10y"] !== undefined && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">10Y Treasury</span>
            <span className="font-medium text-gray-700">{data.yields["10y"].toFixed(2)}%</span>
          </div>
        )}
        <div className={`text-[10px] font-medium ${inverted ? "text-red-600" : "text-green-600"}`}>
          {inverted ? "⚠ Inverted — recession signal" : "✓ Normal slope"}
        </div>
      </div>
      <div className="h-24 mt-2">
        {points.length > 0 ? (
          <svg viewBox="0 0 300 80" className="w-full h-full">
            {[0, 1, 2, 3].map((i) => {
              const y = 5 + (i / 3) * 70;
              return <line key={i} x1="30" y1={y} x2="290" y2={y} stroke="#f3f4f6" strokeWidth="1" />;
            })}
            <text x="25" y="10" textAnchor="end" fontSize="7" fill="#9ca3af">{ycMax.toFixed(1)}%</text>
            <text x="25" y="78" textAnchor="end" fontSize="7" fill="#9ca3af">{ycMin.toFixed(1)}%</text>
            {renderSvgLine(points.map((d, i) => ({ x: i, y: d.val })), 300, 80, inverted ? "#ef4444" : "#3b82f6", true)}
            {points.map((d, i) => {
              const x = 30 + (i / (points.length - 1)) * 260;
              return <text key={d.label} x={x} y="79" textAnchor="middle" fontSize="8" fill="#6b7280">{d.label}</text>;
            })}
            {points.map((d, i) => {
              const x = 30 + (i / (points.length - 1)) * 260;
              const y = 5 + ((ycMax - d.val) / ycRange) * 70;
              return <circle key={d.label} cx={x} cy={y} r="2.5" fill={inverted ? "#ef4444" : "#3b82f6"} />;
            })}
          </svg>
        ) : (
          <PanelLoading />
        )}
      </div>
    </PanelContainer>
  );
}

// ---------- Macro Card Panel ----------

export function MacroCardPanel({ title, inputs, refreshKey, onRefresh, description }: PanelProps) {
  const source = inputs.source || "macro";
  const symbol = inputs.symbol || "^VIX";
  const invertColors = inputs.invert_colors === true;

  const { data, loading, error } = usePanelData(
    async () => {
      if (source === "macro") {
        const arr = await dataApi.getMacro();
        return arr.find((m) => m.symbol === symbol) ?? null;
      }
      const arr = await dataApi.getIndexPerformance();
      return arr.find((m) => m.symbol === symbol) ?? null;
    },
    [refreshKey, source, symbol]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const up = (data?.change ?? 0) >= 0;
  const isTreasury = symbol === "^TNX" || symbol === "^FVX" || symbol === "^TYX";
  const isVix = symbol === "^VIX";

  let upColor = up ? "text-green-600" : "text-red-600";
  let upIcon = up ? <TrendingUp size={14} /> : <TrendingDown size={14} />;
  if (invertColors || isVix) {
    upColor = up ? "text-red-600" : "text-green-600";
    upIcon = up ? <TrendingUp size={14} className="text-red-500" /> : <TrendingDown size={14} className="text-green-500" />;
  }
  if (isTreasury) {
    upColor = up ? "text-red-600" : "text-green-600";
  }

  const ytd = (data as IndexPerformance)?.ytd;
  const val = data && "value" in data ? data.value : (data as IndexPerformance)?.price;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      {data && val !== undefined ? (
        <div className="flex flex-col h-full justify-center">
          <div className="flex items-center justify-between mb-1">
            {upIcon}
          </div>
          <div className="text-2xl font-bold text-gray-900">{val.toLocaleString()}</div>
          <div className={`text-xs font-medium mt-1 ${upColor}`}>
            {up ? "↑" : "↓"} {Math.abs(data.change).toFixed(2)} ({up ? "+" : ""}{data.change_pct.toFixed(2)}%) <span className="text-gray-400 font-normal">5d</span>
          </div>
          {ytd !== undefined && (
            <div className="text-[10px] text-gray-400 mt-1">YTD: {ytd >= 0 ? "+" : ""}{ytd.toFixed(1)}%</div>
          )}
          {isVix && (
            <div className="text-[10px] text-gray-400 mt-1">{val > 30 ? "High fear" : val > 20 ? "Elevated" : "Low / complacent"}</div>
          )}
        </div>
      ) : (
        <PanelLoading />
      )}
    </PanelContainer>
  );
}

// ---------- Macro Card Grid Panel ----------

export function MacroCardGridPanel({ title, inputs, refreshKey, onRefresh, description }: PanelProps) {
  const symbols: string[] = inputs.symbols || ["^TNX", "^FVX", "^DJI", "^IXIC"];

  const { data: macroData, loading, error } = usePanelData(
    async () => {
      const [m, idx] = await Promise.all([
        dataApi.getMacro(),
        dataApi.getIndexPerformance(),
      ]);
      return { macro: m, index: idx };
    },
    [refreshKey]
  );

  if (loading && !macroData) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const allData = [...(macroData?.macro || []), ...(macroData?.index || [])];
  const filtered = symbols.map((sym) => allData.find((d) => d.symbol === sym)).filter(Boolean) as (MacroIndicator | IndexPerformance)[];

  const getValue = (d: MacroIndicator | IndexPerformance) => "value" in d ? d.value : d.price;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {filtered.map((m) => {
          const up = m.change >= 0;
          const isTreasury = m.symbol === "^TNX" || m.symbol === "^FVX";
          const upColor = isTreasury ? (up ? "text-red-600" : "text-green-600") : (up ? "text-green-600" : "text-red-600");
          return (
            <div key={m.symbol} className="bg-gray-50 rounded-lg p-2 border border-gray-100">
              <div className="text-[10px] text-gray-500 font-medium">{m.name}</div>
              <div className="text-sm font-bold text-gray-900">{getValue(m).toFixed(2)}</div>
              <div className={`text-[10px] font-medium ${upColor}`}>
                {up ? "↑" : "↓"} {Math.abs(m.change).toFixed(2)} ({up ? "+" : ""}{m.change_pct.toFixed(2)}%)
              </div>
            </div>
          );
        })}
      </div>
    </PanelContainer>
  );
}

// ---------- Market Breadth Panel ----------

export function MarketBreadthPanel({ title, refreshKey, onRefresh, description }: PanelProps) {
  const { data, loading, error } = usePanelData(
    () => dataApi.getBreadth(),
    [refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const chartW = 300;
  const chartH = 150;
  const padLeft = 32;
  const padRight = 4;
  const padTop = 6;
  const padBottom = 18;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const allValues = data ? [
    ...data.map((d) => d.price),
    ...data.filter((d) => d.ma_50 > 0).map((d) => d.ma_50),
    ...data.filter((d) => d.ma_200 > 0).map((d) => d.ma_200),
  ] : [];
  const minY = allValues.length ? Math.min(...allValues) : 0;
  const maxY = allValues.length ? Math.max(...allValues) : 1;
  const rangeY = maxY - minY || 1;

  const scaleX = (i: number) => padLeft + (i / ((data?.length || 1) - 1 || 1)) * plotW;
  const scaleY = (y: number) => padTop + ((maxY - y) / rangeY) * plotH;

  function buildPath(values: (number | null)[]) {
    let d = "";
    values.forEach((v, i) => {
      if (v === null || v === undefined) return;
      const cmd = d ? " L" : "M";
      d += `${cmd} ${scaleX(i)} ${scaleY(v)}`;
    });
    return d;
  }

  const pricePath = data ? buildPath(data.map((d) => d.price)) : "";
  const ma50Path = data ? buildPath(data.map((d) => (d.ma_50 > 0 ? d.ma_50 : null))) : "";
  const ma200Path = data ? buildPath(data.map((d) => (d.ma_200 > 0 ? d.ma_200 : null))) : "";

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="h-full flex flex-col">
        {data && data.length > 0 ? (
          <>
            <div className="flex items-center justify-center gap-4 px-3 py-1.5 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-[#374151]" />
                <span className="text-xs text-gray-600">S&amp;P 500</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-[#3b82f6]" />
                <span className="text-xs text-gray-600">50-day MA</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-[#ef4444]" />
                <span className="text-xs text-gray-600">200-day MA</span>
              </div>
            </div>
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full flex-1 min-h-0">
              {/* Horizontal grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                const y = padTop + t * plotH;
                return <line key={t} x1={padLeft} y1={y} x2={chartW - padRight} y2={y} stroke="#f3f4f6" strokeWidth="0.5" />;
              })}

              {/* Y-axis labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                const val = maxY - t * rangeY;
                const y = padTop + t * plotH;
                return (
                  <text key={t} x={padLeft - 3} y={y + 3} textAnchor="end" fontSize="6" fill="#9ca3af">
                    {Math.round(val).toLocaleString()}
                  </text>
                );
              })}

              {/* Axis lines */}
              <line x1={padLeft} y1={padTop} x2={padLeft} y2={chartH - padBottom} stroke="#e5e7eb" strokeWidth="0.5" />
              <line x1={padLeft} y1={chartH - padBottom} x2={chartW - padRight} y2={chartH - padBottom} stroke="#e5e7eb" strokeWidth="0.5" />

              {/* X-axis date labels */}
              <text x={padLeft} y={chartH - 4} textAnchor="start" fontSize="6" fill="#9ca3af">
                {new Date(data[0].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </text>
              <text x={padLeft + plotW / 2} y={chartH - 4} textAnchor="middle" fontSize="6" fill="#9ca3af">
                {new Date(data[Math.floor((data.length - 1) / 2)].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </text>
              <text x={chartW - padRight} y={chartH - 4} textAnchor="end" fontSize="6" fill="#9ca3af">
                {new Date(data[data.length - 1].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </text>

              {/* Data series */}
              <path d={pricePath} fill="none" stroke="#374151" strokeWidth="1.5" strokeLinejoin="round" />
              <path d={ma50Path} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round" />
              <path d={ma200Path} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </>
        ) : (
          <PanelLoading />
        )}
      </div>
    </PanelContainer>
  );
}

// ---------- Credit Spread Panel ----------

export function CreditSpreadPanel({ title, refreshKey, onRefresh, description }: PanelProps) {
  const { data, loading, error } = usePanelData(
    () => dataApi.getCreditSpread(),
    [refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="h-full">
        {data && data.length > 0 ? (
          <svg viewBox="0 0 300 150" className="w-full h-full">
            {renderSvgLine(data.map((d, i) => ({ x: i, y: d.spread })), 300, 150, "#f59e0b", true)}
          </svg>
        ) : (
          <PanelLoading />
        )}
      </div>
    </PanelContainer>
  );
}

// ---------- Ratio Chart Panel ----------

const RATIO_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function RatioChartPanel({ title, refreshKey, onRefresh, description }: PanelProps) {
  const { data, loading, error } = usePanelData(
    () => dataApi.getRatios(),
    [refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const normalized = data?.map((ratio) => ({
    name: ratio.name,
    color: RATIO_COLORS[data.indexOf(ratio) % RATIO_COLORS.length],
    points: normalizeRatioSeries(ratio.points),
  })) || [];

  const allPcts = normalized.flatMap((s) => s.points.map((p) => p.pct));
  const minPct = Math.min(...allPcts, 0);
  const maxPct = Math.max(...allPcts, 0);
  const rangePct = maxPct - minPct || 1;

  const maxLen = Math.max(...normalized.map((s) => s.points.length), 0);

  const chartW = 300;
  const chartH = 150;
  const padLeft = 32;
  const padRight = 4;
  const padTop = 6;
  const padBottom = 18;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const scaleX = (i: number) => padLeft + (i / (maxLen - 1 || 1)) * plotW;
  const scaleY = (pct: number) => padTop + ((maxPct - pct) / rangePct) * plotH;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="h-full">
        {normalized.length > 0 ? (
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-full">
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const y = padTop + t * plotH;
              return <line key={t} x1={padLeft} y1={y} x2={chartW - padRight} y2={y} stroke="#f3f4f6" strokeWidth="0.5" />;
            })}

            {minPct < 0 && maxPct > 0 && (
              <line
                x1={padLeft}
                y1={scaleY(0)}
                x2={chartW - padRight}
                y2={scaleY(0)}
                stroke="#d1d5db"
                strokeWidth="0.8"
                strokeDasharray="3,2"
              />
            )}

            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const val = maxPct - t * rangePct;
              const y = padTop + t * plotH;
              return (
                <text key={t} x={padLeft - 3} y={y + 3} textAnchor="end" fontSize="6" fill="#9ca3af">
                  {val >= 0 ? "+" : ""}{val.toFixed(0)}%
                </text>
              );
            })}

            {normalized[0]?.points && (
              <>
                <text x={padLeft} y={chartH - 4} textAnchor="start" fontSize="6" fill="#9ca3af">
                  {new Date(normalized[0].points[0].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </text>
                <text x={padLeft + plotW / 2} y={chartH - 4} textAnchor="middle" fontSize="6" fill="#9ca3af">
                  {new Date(normalized[0].points[Math.floor((normalized[0].points.length - 1) / 2)].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </text>
                <text x={chartW - padRight} y={chartH - 4} textAnchor="end" fontSize="6" fill="#9ca3af">
                  {new Date(normalized[0].points[normalized[0].points.length - 1].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </text>
              </>
            )}

            {normalized.map((series) => {
              const pathD = series.points
                .map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(i)} ${scaleY(p.pct)}`)
                .join(" ");
              const lastPt = series.points[series.points.length - 1];
              return (
                <g key={series.name}>
                  <path d={pathD} fill="none" stroke={series.color} strokeWidth="1.2" strokeLinejoin="round" />
                  {lastPt && (
                    <>
                      <circle cx={scaleX(series.points.length - 1)} cy={scaleY(lastPt.pct)} r="2.5" fill={series.color} />
                      <text
                        x={scaleX(series.points.length - 1) + 5}
                        y={scaleY(lastPt.pct) + 3}
                        fontSize="7"
                        fill={series.color}
                        fontWeight="500"
                      >
                        {series.name}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        ) : (
          <PanelLoading />
        )}
      </div>
    </PanelContainer>
  );
}

// ---------- Asset Class Grid Panel ----------

export function AssetClassGridPanel({ title, refreshKey, onRefresh, description }: PanelProps) {
  const { data, loading, error } = usePanelData(
    () => dataApi.getAssetClasses(),
    [refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      {data && data.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {data.map((ac) => (
            <div key={ac.symbol} className={`rounded-lg p-2 flex flex-col text-center ${colorForChangePct(ac.ytd)}`}>
              <div className="text-[10px] font-medium opacity-90 truncate">{ac.name}</div>
              <div className="text-xs font-bold my-0.5">{ac.symbol}</div>
              <div className="text-[10px] opacity-90">YTD {ac.ytd >= 0 ? "+" : ""}{ac.ytd.toFixed(1)}%</div>
              <div className="text-[9px] opacity-75 mt-0.5">1M {ac.change_1m >= 0 ? "+" : ""}{ac.change_1m.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      ) : (
        <PanelLoading />
      )}
    </PanelContainer>
  );
}

// ---------- Stock Heatmap Panel ----------

export function StockHeatmapPanel({ title, inputs, refreshKey, onRefresh, description }: PanelProps) {
  const [universe, setUniverse] = useState<string>(inputs.universe || "nasdaq100");
  const [groupBy, setGroupBy] = useState<"sector" | "industry">("industry");
  const [universes, setUniverses] = useState<HeatmapUniverse[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dataApi.getHeatmapUniverses().then(setUniverses).catch(() => {
      setUniverses([
        { id: "nasdaq100", name: "Nasdaq 100 Index" },
        { id: "sp500", name: "S&P 500 Index" },
      ]);
    });
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const { data, loading, error } = usePanelData(
    () => dataApi.getHeatmap(universe, groupBy),
    [refreshKey, universe, groupBy]
  );

  const selectedName = universes.find((u) => u.id === universe)?.name || universe;

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description} noPadding><PanelLoading /></PanelContainer>;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description} noPadding>
      {error && <PanelError message={error} />}
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center gap-2 mb-2 shrink-0 px-3 pt-3">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              <span className="truncate max-w-[160px]">{selectedName}</span>
              <ChevronDown size={12} />
            </button>
            <HelpCircle size={10} className="text-gray-400 cursor-help" data-tooltip-id="filter-tooltip" data-tooltip-content="The stock index or universe displayed in the heatmap." />
            {showDropdown && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-60 overflow-auto">
                {universes.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setUniverse(u.id);
                      setShowDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
                      u.id === universe ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                    }`}
                  >
                    {u.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center bg-gray-100 rounded-md">
            <button
              onClick={() => setGroupBy("sector")}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                groupBy === "sector" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Sector
            </button>
            <button
              onClick={() => setGroupBy("industry")}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                groupBy === "industry" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Industry
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 relative">
          {data ? (
            <StockTreemap data={data} />
          ) : (
            <PanelLoading />
          )}
        </div>
      </div>
    </PanelContainer>
  );
}

// ---------- Sector Heatmap Panel ----------

const SECTOR_ETFS = [
  { symbol: "XLK", name: "Technology" },
  { symbol: "XLF", name: "Financials" },
  { symbol: "XLE", name: "Energy" },
  { symbol: "XLI", name: "Industrials" },
  { symbol: "XLP", name: "Consumer Staples" },
  { symbol: "XLU", name: "Utilities" },
  { symbol: "XLV", name: "Health Care" },
  { symbol: "XLB", name: "Materials" },
  { symbol: "XLRE", name: "Real Estate" },
  { symbol: "XLC", name: "Communication" },
];

export function SectorHeatmapPanel({ title, refreshKey, onRefresh, description }: PanelProps) {
  const { data, loading, error } = usePanelData(
    async () => {
      const sectorSymbols = SECTOR_ETFS.map((s) => s.symbol);
      const ytdData = await dataApi.getYtd(sectorSymbols);
      return SECTOR_ETFS.map((s) => {
        const d = ytdData.find((x) => x.symbol === s.symbol);
        return {
          symbol: s.symbol,
          name: s.name,
          price: 0,
          change: 0,
          change_pct: 0,
          ytd: d?.ytd ?? 0,
        };
      });
    },
    [refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      {data && data.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {data.map((s) => (
            <Link
              key={s.symbol}
              to={`/ticker/${s.symbol}`}
              className={`rounded-lg p-3 flex flex-col items-center justify-center text-center ${colorForChangePct(s.ytd)} hover:brightness-105 transition-all`}
            >
              <div className="text-[10px] font-medium opacity-90">{s.name}</div>
              <div className="text-sm font-bold my-0.5">{s.symbol}</div>
              <div className="text-[10px] font-medium opacity-90">{s.ytd >= 0 ? "+" : ""}{s.ytd.toFixed(1)}%</div>
            </Link>
          ))}
        </div>
      ) : (
        <PanelLoading />
      )}
    </PanelContainer>
  );
}
