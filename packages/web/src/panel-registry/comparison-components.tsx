import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import type { PanelProps } from "./types";
import { dataApi } from "../lib/api";
import type { PricePoint, QuarterlyEarning } from "../lib/api";
import { PanelContainer, PanelError, PanelLoading } from "./shared";
import { usePanelData } from "./hooks";
import ComparisonChart from "../components/ComparisonChart";
import { useSvgContainerSize } from "../hooks/useSvgContainerSize";

const CHART_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#a855f7",
];

// ---------- Comparison Chart Panel ----------

export function ComparisonChartPanel({ title, tickers, inputs, refreshKey, onRefresh, description }: PanelProps) {
  const timeRange = inputs.timeRange || "1y";
  const symbols = tickers ?? [];
  const { data, loading, error } = usePanelData(
    () => dataApi.getPriceHistory(symbols, timeRange),
    [symbols.join(","), timeRange, refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      {data && <ComparisonChart data={data} symbols={symbols} />}
    </PanelContainer>
  );
}

// ---------- RSI Comparison Panel ----------

function computeRSI(prices: PricePoint[], period = 14): { x: number; y: number; date: string }[] {
  if (prices.length < period + 1) return [];
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = prices[i].price - prices[i - 1].price;
    if (change > 0) avgGain += change;
    else avgLoss += -change;
  }
  avgGain /= period;
  avgLoss /= period;

  const result: { x: number; y: number; date: string }[] = [];
  for (let i = period; i < prices.length; i++) {
    const change = prices[i].price - prices[i - 1].price;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    result.push({ x: i - period, y: Math.min(Math.max(rsi, 0), 100), date: prices[i].date });
  }
  return result;
}

export function RsiComparisonPanel({ title, tickers, inputs, refreshKey, onRefresh, description }: PanelProps) {
  const timeRange = inputs.timeRange || "1y";
  const symbols = tickers ?? [];
  const { data, loading, error } = usePanelData(
    () => dataApi.getPriceHistory(symbols, timeRange),
    [symbols.join(","), timeRange, refreshKey]
  );

  const [hovered, setHovered] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { ref: svgContainerRef, size } = useSvgContainerSize(800, 280);

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const activeSymbols = symbols.filter((s) => data && data[s] && data[s].length > 0);
  if (!data || activeSymbols.length === 0) {
    return (
      <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
        {error && <PanelError message={error} />}
        <div className="text-xs text-gray-400">No data available</div>
      </PanelContainer>
    );
  }

  const series = activeSymbols.map((sym) => ({
    sym,
    points: computeRSI(data[sym], 14),
    color: CHART_COLORS[symbols.indexOf(sym) % CHART_COLORS.length],
  })).filter((s) => s.points.length > 0);

  if (series.length === 0) {
    return (
      <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
        {error && <PanelError message={error} />}
        <div className="text-xs text-gray-400">No RSI data available</div>
      </PanelContainer>
    );
  }

  const maxLen = Math.max(...series.map((s) => s.points.length));
  const W = size.width;
  const H = size.height;
  const padL = 44;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const gw = W - padL - padR;
  const gh = H - padT - padB;

  const maxY = 100;
  const rangeY = 100;
  const xScale = maxLen > 1 ? gw / (maxLen - 1) : gw;
  const yScale = gh / rangeY;

  const toSvg = (x: number, y: number) => ({
    sx: padL + x * xScale,
    sy: padT + (maxY - y) * yScale,
  });

  const gridLines = [0, 20, 40, 60, 80, 100];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || maxLen <= 1 || W <= 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    let idx = Math.round((svgX - padL) / xScale);
    if (idx < 0) idx = 0;
    if (idx >= maxLen) idx = maxLen - 1;
    setHoverIndex(idx);
  };

  const handleMouseLeave = () => setHoverIndex(null);

  const hoveredData =
    hoverIndex != null
      ? series.map((s) => {
          const pt = s.points[hoverIndex];
          return pt ? { sym: s.sym, color: s.color, y: pt.y, date: pt.date } : null;
        }).filter(Boolean) as { sym: string; color: string; y: number; date: string }[]
      : [];
  const hoverDate = hoveredData[0]?.date ?? "";

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="h-full flex flex-col">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          {series.map((s) => (
            <button
              key={s.sym}
              onMouseEnter={() => setHovered(s.sym)}
              onMouseLeave={() => setHovered(null)}
              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded transition-opacity ${
                hovered && hovered !== s.sym ? "opacity-40" : "opacity-100"
              }`}
              style={{ color: s.color, backgroundColor: s.color + "15" }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.sym}
            </button>
          ))}
        </div>

        <div ref={svgContainerRef} className="flex-1 min-h-0">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-full"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
        {/* Overbought zone (>70) */}
        <rect x={padL} y={toSvg(0, 100).sy} width={gw} height={toSvg(0, 70).sy - toSvg(0, 100).sy} fill="#fee2e2" opacity="0.4" />
        {/* Oversold zone (<30) */}
        <rect x={padL} y={toSvg(0, 30).sy} width={gw} height={toSvg(0, 0).sy - toSvg(0, 30).sy} fill="#dcfce7" opacity="0.4" />

        {/* Grid lines */}
        {gridLines.map((y) => {
          const { sy } = toSvg(0, y);
          return (
            <g key={y}>
              <line x1={padL} y1={sy} x2={W - padR} y2={sy} stroke="#e5e7eb" strokeWidth="1" />
              <text x={padL - 6} y={sy + 3} textAnchor="end" fontSize="10" fill="#9ca3af">
                {y}
              </text>
            </g>
          );
        })}

        {/* Reference lines: 30, 50, 70 */}
        {[30, 50, 70].map((y) => (
          <line
            key={y}
            x1={padL}
            y1={toSvg(0, y).sy}
            x2={W - padR}
            y2={toSvg(0, y).sy}
            stroke={y === 50 ? "#9ca3af" : y === 70 ? "#ef4444" : "#22c55e"}
            strokeWidth="1"
            strokeDasharray="4,4"
            opacity={0.6}
          />
        ))}

        {/* Paths */}
        {series.map((s) => {
          const d = s.points
            .map((p, i) => {
              const { sx, sy } = toSvg(p.x, p.y);
              return `${i === 0 ? "M" : "L"} ${sx} ${sy}`;
            })
            .join(" ");
          const isDimmed = hovered && hovered !== s.sym;
          return (
            <path
              key={s.sym}
              d={d}
              fill="none"
              stroke={s.color}
              strokeWidth={hovered === s.sym ? 2.5 : 1.5}
              opacity={isDimmed ? 0.15 : hovered === s.sym ? 1 : 0.85}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {/* Hover vertical line */}
        {hoverIndex != null && (
          <line
            x1={toSvg(hoverIndex, 0).sx}
            y1={padT}
            x2={toSvg(hoverIndex, 0).sx}
            y2={H - padB}
            stroke="#d1d5db"
            strokeWidth="1"
            strokeDasharray="4,4"
            opacity={0.7}
          />
        )}

        {/* Hover dots */}
        {hoverIndex != null &&
          series.map((s) => {
            const pt = s.points[hoverIndex];
            if (!pt) return null;
            const { sx, sy } = toSvg(pt.x, pt.y);
            const isDimmed = hovered && hovered !== s.sym;
            return (
              <circle
                key={s.sym}
                cx={sx}
                cy={sy}
                r={3}
                fill={s.color}
                opacity={isDimmed ? 0.15 : 1}
              />
            );
          })}

        {/* End labels */}
        {series.map((s) => {
          const last = s.points[s.points.length - 1];
          if (!last) return null;
          const { sx, sy } = toSvg(last.x, last.y);
          const isDimmed = hovered && hovered !== s.sym;
          return (
            <text
              key={s.sym}
              x={sx + 5}
              y={sy + 3}
              fontSize="10"
              fontWeight="500"
              fill={s.color}
              opacity={isDimmed ? 0.15 : 1}
            >
              {last.y.toFixed(1)}
            </text>
          );
        })}
          </svg>
        </div>

        {/* Hover data panel */}
        <div className="mt-2 pt-2 border-t border-gray-100 min-h-[3.25rem] max-h-[4.5rem] overflow-y-auto transition-opacity duration-150" style={{ opacity: hoverIndex != null && hoveredData.length > 0 ? 1 : 0 }}>
          <div className="text-[10px] text-gray-400 font-medium mb-1.5">{hoverDate}</div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {hoveredData.map((d) => (
              <div key={d.sym} className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-[11px] font-semibold text-gray-700">{d.sym}</span>
                <span className={`text-[11px] font-medium ${d.y > 70 ? "text-red-600" : d.y < 30 ? "text-green-600" : "text-gray-600"}`}>
                  {d.y.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PanelContainer>
  );
}

// ---------- EPS Beat Panel ----------

export function EpsBeatPanel({ title, tickers, refreshKey, onRefresh, description }: PanelProps) {
  const symbols = tickers ?? [];
  const { data, loading, error } = usePanelData(
    () => dataApi.getForwardPe(symbols),
    [symbols.join(","), refreshKey]
  );

  const [hovered, setHovered] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { ref: svgContainerRef, size } = useSvgContainerSize(800, 300);

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const items = (data || []).filter((d) => symbols.includes(d.symbol));
  const validItems = items.filter((d) => d.earnings_history && d.earnings_history.length > 0);

  if (validItems.length === 0) {
    return (
      <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
        {error && <PanelError message={error} />}
        <div className="text-xs text-gray-400">No earnings data available</div>
      </PanelContainer>
    );
  }

  const maxQuarters = Math.max(...validItems.map((d) => d.earnings_history.length));

  const W = size.width;
  const H = size.height;
  const padL = 52;
  const padR = 12;
  const padT = 36;
  const padB = 36;
  const gw = W - padL - padR;
  const gh = H - padT - padB;

  let minY = 0;
  let maxY = 0;
  for (const item of validItems) {
    for (const q of item.earnings_history) {
      if (q.beat_pct < minY) minY = q.beat_pct;
      if (q.beat_pct > maxY) maxY = q.beat_pct;
    }
  }
  const range = Math.max(Math.abs(minY), Math.abs(maxY), 5);
  minY = -range;
  maxY = range;

  const toSvg = (x: number, y: number) => ({
    sx: padL + x * gw,
    sy: padT + ((maxY - y) / (maxY - minY)) * gh,
  });

  const groupCount = maxQuarters;
  const zeroY = toSvg(0, 0).sy;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || maxQuarters <= 0 || gw <= 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    let idx = Math.round(((svgX - padL) / gw) * groupCount - 0.5);
    if (idx < 0) idx = 0;
    if (idx >= maxQuarters) idx = maxQuarters - 1;
    setHoverIndex(idx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const hoveredData =
    hoverIndex != null
      ? (validItems
          .map((item) => {
            const q = item.earnings_history[hoverIndex];
            if (!q) return null;
            const color = CHART_COLORS[symbols.indexOf(item.symbol) % CHART_COLORS.length];
            return { sym: item.symbol, color, q };
          })
          .filter(Boolean) as { sym: string; color: string; q: QuarterlyEarning }[])
      : [];

  const hoverDate = hoveredData[0]?.q.date ?? "";

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="h-full flex flex-col">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          {validItems.map((d) => {
            const color = CHART_COLORS[symbols.indexOf(d.symbol) % CHART_COLORS.length];
            return (
              <button
                key={d.symbol}
                onMouseEnter={() => setHovered(d.symbol)}
                onMouseLeave={() => setHovered(null)}
                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded transition-opacity ${
                  hovered && hovered !== d.symbol ? "opacity-40" : "opacity-100"
                }`}
                style={{ color, backgroundColor: color + "15" }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                {d.symbol}
              </button>
            );
          })}
        </div>

        <div ref={svgContainerRef} className="flex-1 min-h-0">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-full"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
        {/* Grid lines */}
        {[minY, minY / 2, 0, maxY / 2, maxY].map((y, i) => {
          const { sy } = toSvg(0, y);
          return (
            <g key={i}>
              <line x1={padL} y1={sy} x2={W - padR} y2={sy} stroke="#e5e7eb" strokeWidth="1" />
              <text x={padL - 6} y={sy + 3} textAnchor="end" fontSize="10" fill="#9ca3af">
                {y >= 0 ? "+" : ""}{y.toFixed(0)}%
              </text>
            </g>
          );
        })}

        {/* Zero line */}
        <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} stroke="#9ca3af" strokeWidth="1" strokeDasharray="4,4" />

        {/* Lines */}
        {validItems.map((item) => {
          const color = CHART_COLORS[symbols.indexOf(item.symbol) % CHART_COLORS.length];
          const isDimmed = hovered && hovered !== item.symbol;
          const d = item.earnings_history
            .map((q: QuarterlyEarning, qIdx: number) => {
              const { sx, sy } = toSvg((qIdx + 0.5) / groupCount, q.beat_pct);
              return `${qIdx === 0 ? "M" : "L"} ${sx} ${sy}`;
            })
            .join(" ");
          return (
            <path
              key={item.symbol}
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={hovered === item.symbol ? 2.5 : 1.5}
              opacity={isDimmed ? 0.15 : hovered === item.symbol ? 1 : 0.85}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {/* Hover vertical line */}
        {hoverIndex != null && (
          <line
            x1={toSvg((hoverIndex + 0.5) / groupCount, 0).sx}
            y1={padT}
            x2={toSvg((hoverIndex + 0.5) / groupCount, 0).sx}
            y2={H - padB}
            stroke="#d1d5db"
            strokeWidth="1"
            strokeDasharray="4,4"
            opacity={0.7}
          />
        )}

        {/* Hover dots */}
        {hoverIndex != null &&
          validItems.map((item) => {
            const q = item.earnings_history[hoverIndex];
            if (!q) return null;
            const color = CHART_COLORS[symbols.indexOf(item.symbol) % CHART_COLORS.length];
            const isDimmed = hovered && hovered !== item.symbol;
            const { sx, sy } = toSvg((hoverIndex + 0.5) / groupCount, q.beat_pct);
            return (
              <circle
                key={item.symbol}
                cx={sx}
                cy={sy}
                r={3}
                fill={color}
                opacity={isDimmed ? 0.15 : 1}
              />
            );
          })}

        {/* X-axis labels */}
        {Array.from({ length: maxQuarters }, (_, i) => {
          const label = `Q-${maxQuarters - i}`;
          const { sx } = toSvg((i + 0.5) / groupCount, 0);
          return (
            <text key={i} x={sx} y={H - padB + 16} textAnchor="middle" fontSize="10" fill="#6b7280">
              {label}
            </text>
          );
        })}

        {/* End labels */}
        {validItems.map((item) => {
          const color = CHART_COLORS[symbols.indexOf(item.symbol) % CHART_COLORS.length];
          const lastQ = item.earnings_history[item.earnings_history.length - 1];
          if (!lastQ) return null;
          const { sx, sy } = toSvg((item.earnings_history.length - 0.5) / groupCount, lastQ.beat_pct);
          const labelY = lastQ.beat_pct >= 0 ? sy - 6 : sy + 12;
          return (
            <text
              key={item.symbol}
              x={sx}
              y={labelY}
              textAnchor="middle"
              fontSize="9"
              fontWeight="500"
              fill={color}
              opacity={hovered && hovered !== item.symbol ? 0.15 : 1}
            >
              {lastQ.beat_pct >= 0 ? "+" : ""}{lastQ.beat_pct.toFixed(1)}%
            </text>
          );
        })}
          </svg>
        </div>

        {/* Hover data panel */}
        <div
          className="mt-2 pt-2 border-t border-gray-100 min-h-[3.25rem] max-h-[4.5rem] overflow-y-auto transition-opacity duration-150"
          style={{ opacity: hoverIndex != null && hoveredData.length > 0 ? 1 : 0 }}
        >
          <div className="text-[10px] text-gray-400 font-medium mb-1.5">{hoverDate}</div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {hoveredData.map((d) => (
              <div key={d.sym} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-[11px] font-semibold text-gray-700">{d.sym}</span>
                <span className="text-[11px] text-gray-500">
                  Est ${d.q.estimate.toFixed(2)} · Act ${d.q.actual.toFixed(2)}
                </span>
                <span className={`text-[11px] font-medium ${d.q.beat_pct >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {d.q.beat_pct >= 0 ? "+" : ""}{d.q.beat_pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PanelContainer>
  );
}

// ---------- Comparison Grid Panel ----------

export function ComparisonGridPanel({ title, tickers, enabledTickers, refreshKey, onRefresh, description }: PanelProps) {
  const symbols = tickers ?? [];
  const enabledSymbols = enabledTickers ?? symbols;

  const fpState = usePanelData(() => dataApi.getForwardPe(symbols), [symbols.join(","), refreshKey]);
  const rsiState = usePanelData(() => dataApi.getRsi(symbols), [symbols.join(","), refreshKey]);
  const ytdState = usePanelData(() => dataApi.getYtd(symbols), [symbols.join(","), refreshKey]);
  const mcState = usePanelData(() => dataApi.getMetric(symbols, "market_cap"), [symbols.join(","), refreshKey]);

  const loading = fpState.loading || rsiState.loading || ytdState.loading || mcState.loading;
  const error = fpState.error || rsiState.error || ytdState.error || mcState.error;

  const forwardPe = fpState.data;
  const rsi = rsiState.data;
  const ytd = ytdState.data;
  const marketCap = mcState.data;

  const getFp = (sym: string) => forwardPe?.find((d) => d.symbol === sym);
  const getRsi = (sym: string) => rsi?.find((d) => d.symbol === sym);
  const getYtd = (sym: string) => ytd?.find((d) => d.symbol === sym);
  const getMc = (sym: string) => marketCap?.find((d) => d.symbol === sym);

  if (loading && !forwardPe) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {symbols.map((sym) => {
          const isDisabled = !enabledSymbols.includes(sym);
          const fp = getFp(sym);
          const r = getRsi(sym);
          const y = getYtd(sym);
          const mc = getMc(sym);

          return (
            <div key={sym} className={`bg-white rounded-xl border border-gray-200 p-4 transition-opacity ${isDisabled ? "opacity-40" : ""}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Link to={`/ticker/${sym}`} className="text-sm font-bold text-gray-900 hover:text-blue-700 transition-colors">
                    {sym}
                  </Link>
                  {fp && fp.eps_trailing != null && fp.eps_trailing <= 0 && (
                    <span className="text-[9px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Not Profitable</span>
                  )}
                </div>
                {y && (
                  <span className={`flex items-center gap-0.5 text-[10px] font-medium ${y.ytd >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {y.ytd >= 0 ? "↑" : "↓"}
                    {y.ytd >= 0 ? "+" : ""}{y.ytd.toFixed(1)}%
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {/* Next Earnings */}
                {fp && fp.next_earnings_date != null && fp.next_earnings_date > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">Next Earnings</span>
                    <span className="text-[10px] font-semibold text-gray-800">
                      {new Date(fp.next_earnings_date * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {fp.next_earnings_time && (
                        <span className="text-gray-500 font-normal"> {fp.next_earnings_time}</span>
                      )}
                    </span>
                  </div>
                )}

                {/* Forward PE */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">Forward P/E</span>
                  <span className="text-xs font-semibold text-gray-800">
                    {fp ? (fp.forward_pe > 0 ? fp.forward_pe.toFixed(1) + "x" : "–") : "–"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">Trailing P/E</span>
                  <span className="text-xs font-medium text-gray-600">
                    {fp ? (fp.trailing_pe > 0 ? fp.trailing_pe.toFixed(1) + "x" : "–") : "–"}
                  </span>
                </div>

                {/* RSI */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">RSI (14)</span>
                  <span className={`text-xs font-semibold ${
                    r ? (r.rsi > 70 ? "text-red-600" : r.rsi < 30 ? "text-green-600" : "text-gray-800") : "text-gray-800"
                  }`}>
                    {r ? r.rsi.toFixed(1) : "–"}
                  </span>
                </div>

                {/* Market Cap */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">Market Cap</span>
                  <span className="text-xs font-semibold text-gray-800">
                    {mc ? mc.label : "–"}
                  </span>
                </div>

                {/* EPS */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500">Trailing EPS</span>
                    <span className="text-xs font-medium text-gray-700">
                      {fp && fp.eps_trailing != null && fp.eps_trailing !== 0 ? "$" + fp.eps_trailing.toFixed(2) : "–"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">Forward EPS</span>
                    <span className="text-xs font-medium text-gray-700">
                      {fp ? (fp.forward_eps > 0 ? "$" + fp.forward_eps.toFixed(2) : "–") : "–"}
                    </span>
                  </div>
                  {fp && fp.quarter_label && (fp.eps_actual_q != null || fp.eps_estimate_q != null) && (
                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-dashed border-gray-100">
                      <span className="text-[10px] text-gray-500">{fp.quarter_label} EPS</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-medium text-gray-700">
                          {fp.eps_actual_q != null ? "$" + fp.eps_actual_q.toFixed(2) : "–"}
                          {fp.eps_estimate_q != null && (
                            <span className="text-gray-400"> vs ${fp.eps_estimate_q.toFixed(2)}</span>
                          )}
                        </span>
                        {fp.eps_actual_q != null && fp.eps_estimate_q != null && (
                          <span className={`text-[10px] font-semibold ${fp.eps_actual_q >= fp.eps_estimate_q ? "text-green-600" : "text-red-600"}`}>
                            {fp.eps_actual_q >= fp.eps_estimate_q ? "Beat" : "Miss"}
                            {" "}{fp.eps_actual_q >= fp.eps_estimate_q ? "+" : ""}${(fp.eps_actual_q - fp.eps_estimate_q).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Guidance */}
                {fp && (fp.eps_growth !== 0 || fp.revenue_growth !== 0 || fp.num_analysts > 0) && (
                  <div className="pt-2 border-t border-gray-100">
                    <div className="text-[10px] font-semibold text-gray-700 mb-1">Guidance</div>
                    <div className="space-y-1">
                      {fp.eps_growth !== 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">EPS Growth</span>
                          <span className={`text-[10px] font-medium ${fp.eps_growth >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {fp.eps_growth >= 0 ? "+" : ""}{(fp.eps_growth * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {fp.revenue_growth !== 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">Rev Growth</span>
                          <span className={`text-[10px] font-medium ${fp.revenue_growth >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {fp.revenue_growth >= 0 ? "+" : ""}{(fp.revenue_growth * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {fp.eps_revision_30d !== 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">EPS Revision (30d)</span>
                          <span className={`text-[10px] font-medium ${fp.eps_revision_30d >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {fp.eps_revision_30d >= 0 ? "+" : ""}${fp.eps_revision_30d.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {fp.num_analysts > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">Analysts</span>
                          <span className="text-[10px] font-medium text-gray-700">{fp.num_analysts}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* YTD Bar */}
                {y && (
                  <div className="pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 w-6">YTD</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${y.ytd >= 0 ? "bg-green-500" : "bg-red-500"}`}
                          style={{ width: `${Math.min(Math.abs(y.ytd) * 2, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </PanelContainer>
  );
}
