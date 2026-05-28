import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { PanelProps } from "./types";
import { dataApi } from "../lib/api";
import type { ForwardPeData } from "../lib/api";
import { PanelContainer, PanelError, PanelLoading } from "./shared";
import { usePanelData } from "./hooks";
import ComparisonChart from "../components/ComparisonChart";

// ---------- Line Chart Panel ----------

export function LineChartPanel({ title, tickers, inputs, refreshKey, onRefresh, description }: PanelProps) {
  const timeRange = inputs.timeRange || "1y";
  const symbols = tickers ?? [];
  const { data, loading, error } = usePanelData(
    () => dataApi.getPriceHistory(symbols.slice(0, 5), timeRange),
    [symbols, timeRange, refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      {data && <ComparisonChart data={data} symbols={symbols.slice(0, 5)} mode="price" />}
    </PanelContainer>
  );
}

// ---------- Metric Card Panel ----------

export function MetricCardPanel({ title, tickers, inputs, refreshKey, onRefresh, description }: PanelProps) {
  const metric = inputs.metric || "price";
  const symbols = tickers ?? [];
  const { data, loading, error } = usePanelData(
    () => dataApi.getMetric(symbols.slice(0, 4), metric),
    [symbols, metric, refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      {data && (
        <div className="grid grid-cols-2 gap-2">
          {data.map((d) => (
            <div key={d.symbol} className="p-2 bg-gray-50 rounded border border-gray-100 text-center">
              <Link to={`/ticker/${d.symbol}`} className="text-[10px] text-gray-500 uppercase hover:text-blue-700 transition-colors">
                {d.symbol}
              </Link>
              <div className="text-sm font-bold text-gray-800">{d.label}</div>
            </div>
          ))}
        </div>
      )}
    </PanelContainer>
  );
}

// ---------- News Feed Panel ----------

export function NewsFeedPanel({ title, tickers, inputs, refreshKey, onRefresh, description }: PanelProps) {
  const maxItems = inputs.maxItems || 5;
  const symbols = tickers ?? [];
  const { data, loading, error } = usePanelData(
    () => dataApi.getNews(symbols, maxItems),
    [symbols, maxItems, refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      {data && (
        <div className="space-y-2">
          {data.map((item, i) => (
            <div key={i} className="text-xs p-2 bg-gray-50 rounded border border-gray-100">
              <div className="font-medium text-gray-700 leading-tight">{item.title}</div>
              <div className="text-gray-400 mt-0.5 flex justify-between">
                <span>{item.source}</span>
                <span>{item.published}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelContainer>
  );
}

// ---------- Fear & Greed Panel ----------

export function FearGreedPanel({ title, refreshKey, onRefresh, description }: PanelProps) {
  const { data, loading, error } = usePanelData(
    () => dataApi.getFearGreed(),
    [refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const value = data?.value ?? 50;
  const prev = data?.previous_value ?? 50;
  const label = data?.label ?? "Neutral";
  const rotation = -90 + (value / 100) * 180;
  const colorClass =
    value <= 20 ? "text-red-600" :
    value <= 40 ? "text-orange-600" :
    value <= 60 ? "text-yellow-600" :
    value <= 80 ? "text-lime-600" : "text-green-600";

  const delta = value - prev;
  const deltaPercent = prev !== 0 ? Math.round((delta / prev) * 100) : 0;
  const deltaUp = delta >= 0;
  const deltaColor = deltaUp ? "text-green-600" : "text-red-600";
  const deltaArrow = deltaUp ? "↑" : "↓";

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="flex flex-col items-center justify-center h-full">
        <div className="relative w-full max-w-[180px] aspect-[2/1]">
          <svg viewBox="0 0 200 110" className="w-full h-full">
            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e5e7eb" strokeWidth="20" strokeLinecap="round" />
            <path d="M 20 100 A 80 80 0 0 1 80 35" fill="none" stroke="#ef4444" strokeWidth="20" strokeLinecap="round" />
            <path d="M 80 35 A 80 80 0 0 1 120 35" fill="none" stroke="#eab308" strokeWidth="20" strokeLinecap="round" />
            <path d="M 120 35 A 80 80 0 0 1 180 100" fill="none" stroke="#22c55e" strokeWidth="20" strokeLinecap="round" />
            <line x1="100" y1="100" x2="100" y2="30" stroke="#374151" strokeWidth="3" strokeLinecap="round" transform={`rotate(${rotation} 100 100)`} />
            <circle cx="100" cy="100" r="5" fill="#374151" />
          </svg>
        </div>
        <div className={`text-lg font-bold mt-1 ${colorClass}`}>{label}</div>
        <div className="text-xs text-gray-400 mt-0.5">{value}/100</div>
        {data && (
          <div className={`text-xs font-medium mt-1 ${deltaColor}`}>
            {deltaArrow} {Math.abs(delta)} pts ({deltaUp ? "+" : ""}{deltaPercent}%)
            <span className="text-gray-400 font-normal ml-1">vs last week</span>
          </div>
        )}
        {data && <div className="text-[10px] text-gray-300 mt-1">{new Date(data.timestamp).toLocaleTimeString()}</div>}
      </div>
    </PanelContainer>
  );
}

// ---------- RRG Panel ----------

const RRG_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

const RRG_GROUPS: { label: string; tickers: string[] }[] = [
  { label: "Sectors", tickers: ["XLK", "XLF", "XLE", "XLI", "XLP", "XLU", "XLV", "XLB", "XLRE", "XLC", "SPY"] },
  { label: "AI + Software", tickers: ["NVDA", "MSFT", "GOOGL", "AMZN", "META", "AVGO", "AMD", "CRM", "ADBE", "ORCL", "PLTR", "PANW"] },
  { label: "Commodities", tickers: ["USO", "UNG", "GLD", "SLV", "PPLT", "CPER", "DBB", "DBC", "GDX", "XLE", "BNO"] },
  { label: "Big Tech", tickers: ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"] },
  { label: "Financials", tickers: ["JPM", "BAC", "GS", "MS", "WFC", "C", "BLK", "BX", "SPY"] },
  { label: "China Tech", tickers: ["BABA", "JD", "PDD", "TCEHY", "NTES", "BIDU", "NIO", "LI", "XPEV"] },
];

export function RrgPanel({ title, tickers, inputs, refreshKey, onRefresh, description }: PanelProps) {
  const benchmark = inputs.benchmark || "SPY";
  const lookback = inputs.lookback || "3m";

  const [trailLength, setTrailLength] = useState(inputs.trail_length || inputs.trailLength || 2);
  const [group, setGroup] = useState<string | null>(inputs.group || null);

  const symbols = useMemo(() => {
    if (group) {
      const found = RRG_GROUPS.find((g) => g.label === group);
      if (found) return found.tickers;
    }
    return tickers ?? [];
  }, [group, tickers]);

  const { data, loading, error } = usePanelData(
    () => dataApi.getRrg(symbols, benchmark, lookback, trailLength),
    [symbols, benchmark, lookback, trailLength, refreshKey]
  );

  const chartRef = useRef<HTMLDivElement>(null);
  const [chartSize, setChartSize] = useState({ w: 200, h: 200 });

  useLayoutEffect(() => {
    if (!chartRef.current) return;
    const el = chartRef.current;

    // Immediate measurement in case RO hasn't fired yet
    setChartSize({ w: el.clientWidth, h: el.clientHeight });

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setChartSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [data]);

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const { w, h } = chartSize;
  const s = Math.min(w, h) / 200;
  const cx = w / 2;
  const cy = h / 2;
  const pad = 10 * s;

  const sx = (rs: number) => pad + (rs / 100) * (w - 2 * pad);
  const sy = (rm: number) => h - pad - (rm / 100) * (h - 2 * pad);

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      <div className="flex flex-col h-full">
        {error && <PanelError message={error} />}
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-[10px] text-gray-400">{benchmark} · {lookback}</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">Trail:</span>
            <input
              type="range"
              min={1}
              max={60}
              step={1}
              value={trailLength}
              onChange={(e) => setTrailLength(Number(e.target.value))}
              className="w-16 h-1 accent-gray-900 cursor-pointer"
            />
            <span className="text-[10px] font-medium text-gray-700 w-4 text-right">{trailLength}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">Group:</span>
            <select
              className="text-[10px] bg-transparent focus:outline-none"
              value={group ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setGroup(val || null);
              }}
            >
              <option value="">Custom</option>
              {RRG_GROUPS.map((g) => (
                <option key={g.label} value={g.label}>{g.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div ref={chartRef} className="flex-1 relative min-h-0 overflow-hidden">
          <svg width={w} height={h} style={{ display: "block" }}>
            {/* Quadrant backgrounds */}
            <rect x={cx} y={0} width={cx} height={cy} fill="#dcfce7" opacity="0.5" />
            <rect x={cx} y={cy} width={cx} height={cy} fill="#fef3c7" opacity="0.5" />
            <rect x={0} y={cy} width={cx} height={cy} fill="#fee2e2" opacity="0.5" />
            <rect x={0} y={0} width={cx} height={cy} fill="#dbeafe" opacity="0.5" />
            {/* Axes */}
            <line x1={cx} y1={pad} x2={cx} y2={h - pad} stroke="#9ca3af" strokeWidth={s} strokeDasharray={`${3 * s},${3 * s}`} />
            <line x1={pad} y1={cy} x2={w - pad} y2={cy} stroke="#9ca3af" strokeWidth={s} strokeDasharray={`${3 * s},${3 * s}`} />
            {/* Quadrant Labels */}
            <text x={w * 0.75} y={pad + 8 * s} textAnchor="middle" fontSize={9 * s} fill="#166534" fontWeight="600">Leading</text>
            <text x={w * 0.75} y={h - pad - 2 * s} textAnchor="middle" fontSize={9 * s} fill="#92400e" fontWeight="600">Weakening</text>
            <text x={w * 0.25} y={h - pad - 2 * s} textAnchor="middle" fontSize={9 * s} fill="#991b1b" fontWeight="600">Lagging</text>
            <text x={w * 0.25} y={pad + 8 * s} textAnchor="middle" fontSize={9 * s} fill="#1e40af" fontWeight="600">Improving</text>

            {data?.map((trail, idx) => {
              const color = RRG_COLORS[idx % RRG_COLORS.length];
              const points = trail.points;
              if (points.length === 0) return null;

              const pathD = points.map((p, i) => {
                return `${i === 0 ? "M" : "L"} ${sx(p.rs)} ${sy(p.rm)}`;
              }).join(" ");

              const current = points[points.length - 1];
              const curX = sx(current.rs);
              const curY = sy(current.rm);

              return (
                <g key={trail.symbol}>
                  {points.length > 1 && (
                    <path d={pathD} fill="none" stroke={color} strokeWidth={1.2 * s} opacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                  {points.slice(0, -1).map((p, i) => (
                    <circle key={i} cx={sx(p.rs)} cy={sy(p.rm)} r={1.5 * s} fill={color} opacity={0.3 + (i / points.length) * 0.4} />
                  ))}
                  <circle cx={curX} cy={curY} r={4 * s} fill={color} opacity="0.9" stroke="white" strokeWidth={0.5 * s} />
                  {(() => {
                    const nearRight = curX > w - pad - (w - 2 * pad) * 0.08;
                    const nearTop = curY < pad + (h - 2 * pad) * 0.08;
                    const nearBottom = curY > h - pad - (h - 2 * pad) * 0.08;
                    return (
                      <text
                        x={nearRight ? curX - 5 * s : curX + 5 * s}
                        y={nearTop ? curY + 12 * s : nearBottom ? curY - 6 * s : curY + 3 * s}
                        textAnchor={nearRight ? "end" : "start"}
                        fontSize={7 * s}
                        fill="#1f2937"
                        fontWeight="500"
                      >
                        {trail.symbol}
                      </text>
                    );
                  })()}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </PanelContainer>
  );
}

// ---------- Forward PE Panel ----------

export function ForwardPePanel({ title, tickers, refreshKey, onRefresh, description }: PanelProps) {
  const symbols = tickers ?? [];
  const { data, loading, error } = usePanelData(
    () => dataApi.getForwardPe(symbols),
    [symbols, refreshKey]
  );
  const [peMode, setPeMode] = useState<"current_fy" | "next_fy">("current_fy");

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const peValue = (d: ForwardPeData) => peMode === "current_fy" ? d.forward_pe : d.forward_pe_next_fy;
  const epsValue = (d: ForwardPeData) => peMode === "current_fy" ? d.forward_eps : d.forward_eps_next_fy;
  const maxPe = Math.max(...(data?.map(peValue) || [1]), 1);
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] text-gray-400">Source: Yahoo Finance</div>
        <select
          value={peMode}
          onChange={(e) => setPeMode(e.target.value as "current_fy" | "next_fy")}
          className="text-[10px] bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="current_fy">Current FY</option>
          <option value="next_fy">Next FY</option>
        </select>
      </div>
      <div className="space-y-3">
        {data?.map((d, i) => (
          <div key={d.symbol}>
            <div className="flex items-center gap-2 mb-0.5">
              <Link to={`/ticker/${d.symbol}`} className="w-12 text-xs font-semibold text-gray-700 hover:text-blue-700 transition-colors">
                {d.symbol}
              </Link>
              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${(peValue(d) / maxPe) * 100}%`, backgroundColor: colors[i % colors.length] }} />
              </div>
              <div className="w-10 text-xs font-bold text-gray-700 text-right">{peValue(d)}x</div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 px-14">
              <span>trailing {d.trailing_pe > 0 ? d.trailing_pe + "x" : "–"}</span>
              <span>fwd EPS ${epsValue(d) > 0 ? epsValue(d).toFixed(2) : "–"}</span>
            </div>
          </div>
        ))}
      </div>
    </PanelContainer>
  );
}
