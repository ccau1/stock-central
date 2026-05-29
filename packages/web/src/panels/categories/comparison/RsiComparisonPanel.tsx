import { useRef, useState } from "react";
import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import type { PricePoint } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../../core";
import { useSvgContainerSize } from "../../../hooks/useSvgContainerSize";

import { CHART_COLORS } from "../../core/constants";

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

export const rsiComparisonPanel: PanelDefinition = {
  id: "rsi-comparison",
  name: "RSI Comparison",
  description: "RSI (14) comparison across selected tickers with overbought/oversold zones.",
  category: "comparison",
  component: RsiComparisonPanel,
  filterConfig: { tickerMode: "enabled", injectTimeRange: true },
};
