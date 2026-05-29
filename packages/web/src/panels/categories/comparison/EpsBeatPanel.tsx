import { useRef, useState } from "react";
import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import type { QuarterlyEarning } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../../core";
import { useSvgContainerSize } from "../../../hooks/useSvgContainerSize";

import { CHART_COLORS } from "../../core/constants";

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

  const items = (data || []).filter((d: any) => symbols.includes(d.symbol));
  const validItems = items.filter((d: any) => d.earnings_history && d.earnings_history.length > 0);

  if (validItems.length === 0) {
    return (
      <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
        {error && <PanelError message={error} />}
        <div className="text-xs text-gray-400">No earnings data available</div>
      </PanelContainer>
    );
  }

  const maxQuarters = Math.max(...validItems.map((d: any) => d.earnings_history.length));

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
          .map((item: any) => {
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
          {validItems.map((d: any) => {
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
        {validItems.map((item: any) => {
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
          validItems.map((item: any) => {
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
        {validItems.map((item: any) => {
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

export const epsBeatPanel: PanelDefinition = {
  id: "eps-beat",
  name: "EPS Beat/Miss",
  description: "Quarterly earnings surprise percentages across selected tickers.",
  category: "comparison",
  component: EpsBeatPanel,
  filterConfig: { tickerMode: "enabled" },
};
