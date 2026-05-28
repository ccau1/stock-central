import { useState } from "react";
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

export function RrgPanel({ title, tickers, inputs, refreshKey, onRefresh, description }: PanelProps) {
  const benchmark = inputs.benchmark || "SPY";
  const lookback = inputs.lookback || "3m";
  const trailLength = inputs.trailLength || 20;
  const symbols = tickers ?? [];
  const { data, loading, error } = usePanelData(
    () => dataApi.getRrg(symbols, benchmark, lookback, trailLength),
    [symbols, benchmark, lookback, trailLength, refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="text-[10px] text-gray-400 mb-1">vs {benchmark} · {lookback} · trail {trailLength}</div>
      <div className="flex-1 relative min-h-0 flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 200 200" className="max-w-full max-h-full">
          {/* Quadrant backgrounds */}
          <rect x="100" y="0" width="100" height="100" fill="#dcfce7" opacity="0.5" />
          <rect x="100" y="100" width="100" height="100" fill="#fef3c7" opacity="0.5" />
          <rect x="0" y="100" width="100" height="100" fill="#fee2e2" opacity="0.5" />
          <rect x="0" y="0" width="100" height="100" fill="#dbeafe" opacity="0.5" />
          {/* Axes */}
          <line x1="100" y1="10" x2="100" y2="190" stroke="#9ca3af" strokeWidth="1" strokeDasharray="3,3" />
          <line x1="10" y1="100" x2="190" y2="100" stroke="#9ca3af" strokeWidth="1" strokeDasharray="3,3" />
          {/* Quadrant Labels */}
          <text x="150" y="20" textAnchor="middle" fontSize="8" fill="#166534">Leading</text>
          <text x="150" y="185" textAnchor="middle" fontSize="8" fill="#92400e">Weakening</text>
          <text x="50" y="185" textAnchor="middle" fontSize="8" fill="#991b1b">Lagging</text>
          <text x="50" y="20" textAnchor="middle" fontSize="8" fill="#1e40af">Improving</text>

          {data?.map((trail, idx) => {
            const color = RRG_COLORS[idx % RRG_COLORS.length];
            const points = trail.points;
            if (points.length === 0) return null;

            const pathD = points.map((p, i) => {
              const x = p.rs * 2;
              const y = 200 - p.rm * 2;
              return `${i === 0 ? "M" : "L"} ${x} ${y}`;
            }).join(" ");

            const current = points[points.length - 1];

            return (
              <g key={trail.symbol}>
                {points.length > 1 && (
                  <path d={pathD} fill="none" stroke={color} strokeWidth="1" opacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
                )}
                {points.slice(0, -1).map((p, i) => (
                  <circle key={i} cx={p.rs * 2} cy={200 - p.rm * 2} r="1.5" fill={color} opacity={0.3 + (i / points.length) * 0.4} />
                ))}
                <circle cx={current.rs * 2} cy={200 - current.rm * 2} r="4" fill={color} opacity="0.9" />
                {(() => {
                  const cx = current.rs * 2;
                  const cy = 200 - current.rm * 2;
                  const nearRight = cx > 185;
                  const nearTop = cy < 15;
                  const nearBottom = cy > 185;
                  return (
                    <text
                      x={nearRight ? cx - 6 : cx + 6}
                      y={nearTop ? cy + 12 : nearBottom ? cy - 6 : cy + 3}
                      textAnchor={nearRight ? "end" : "start"}
                      fontSize="7"
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
