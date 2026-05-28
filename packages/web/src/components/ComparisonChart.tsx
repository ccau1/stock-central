import { useState, useRef } from "react";
import type { PricePoint } from "../lib/api";

const CHART_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#a855f7",
];

function normalizePoints(points: PricePoint[]): { x: number; y: number; date: string }[] {
  if (points.length === 0) return [];
  const base = points[0].price;
  return points.map((p, i) => ({ x: i, y: ((p.price - base) / base) * 100, date: p.date }));
}

function rawPricePoints(points: PricePoint[]): { x: number; y: number; date: string }[] {
  if (points.length === 0) return [];
  return points.map((p, i) => ({ x: i, y: p.price, date: p.date }));
}

interface ComparisonChartProps {
  data: Record<string, PricePoint[]> | null;
  symbols: string[];
  className?: string;
  mode?: "normalized" | "price";
}

export default function ComparisonChart({ data, symbols, className = "", mode = "normalized" }: ComparisonChartProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const activeSymbols = symbols.filter((s) => data && data[s] && data[s].length > 0);
  if (!data || activeSymbols.length === 0) return null;

  const isPrice = mode === "price";

  const series = activeSymbols.map((sym) => ({
    sym,
    points: isPrice ? rawPricePoints(data[sym]) : normalizePoints(data[sym]),
    color: CHART_COLORS[symbols.indexOf(sym) % CHART_COLORS.length],
  }));

  const allY = series.flatMap((n) => n.points.map((p) => p.y));
  const minY = Math.min(...allY, 0);
  const maxY = Math.max(...allY, 0);
  const rangeY = maxY - minY || 1;

  const maxLen = Math.max(...series.map((n) => n.points.length));
  const W = 800;
  const H = 320;
  const padL = 44;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const gw = W - padL - padR;
  const gh = H - padT - padB;

  const xScale = maxLen > 1 ? gw / (maxLen - 1) : gw;
  const yScale = gh / rangeY;

  const toSvg = (x: number, y: number) => ({
    sx: padL + x * xScale,
    sy: padT + (maxY - y) * yScale,
  });

  const gridLines = 5;
  const gridYs = Array.from({ length: gridLines + 1 }, (_, i) => minY + (rangeY * i) / gridLines);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || maxLen <= 1) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    let idx = Math.round((svgX - padL) / xScale);
    if (idx < 0) idx = 0;
    if (idx >= maxLen) idx = maxLen - 1;
    setHoverIndex(idx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const hoveredData =
    hoverIndex != null
      ? (series
          .map((n) => {
            const pt = n.points[hoverIndex];
            return pt ? { sym: n.sym, color: n.color, y: pt.y, date: pt.date } : null;
          })
          .filter(Boolean) as { sym: string; color: string; y: number; date: string }[])
      : [];

  const hoverDate = hoveredData[0]?.date ?? "";

  function formatY(val: number) {
    if (isPrice) return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return `${val >= 0 ? "+" : ""}${val.toFixed(0)}%`;
  }

  function formatEndLabel(val: number) {
    if (isPrice) return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
  }

  function formatHover(val: number) {
    if (isPrice) return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        {series.map((n) => (
          <button
            key={n.sym}
            onMouseEnter={() => setHovered(n.sym)}
            onMouseLeave={() => setHovered(null)}
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded transition-opacity ${
              hovered && hovered !== n.sym ? "opacity-40" : "opacity-100"
            }`}
            style={{ color: n.color, backgroundColor: n.color + "15" }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: n.color }} />
            {n.sym}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
        {/* Grid lines */}
        {gridYs.map((y, i) => {
          const { sy } = toSvg(0, y);
          return (
            <g key={i}>
              <line x1={padL} y1={sy} x2={W - padR} y2={sy} stroke="#e5e7eb" strokeWidth="1" />
              <text x={padL - 6} y={sy + 3} textAnchor="end" fontSize="10" fill="#9ca3af">
                {formatY(y)}
              </text>
            </g>
          );
        })}

        {/* Zero line */}
        {minY < 0 && maxY > 0 && (
          <line
            x1={padL}
            y1={toSvg(0, 0).sy}
            x2={W - padR}
            y2={toSvg(0, 0).sy}
            stroke="#9ca3af"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        )}

        {/* Paths */}
        {series.map((n) => {
          const d = n.points
            .map((p, i) => {
              const { sx, sy } = toSvg(p.x, p.y);
              return `${i === 0 ? "M" : "L"} ${sx} ${sy}`;
            })
            .join(" ");
          const isDimmed = hovered && hovered !== n.sym;
          return (
            <path
              key={n.sym}
              d={d}
              fill="none"
              stroke={n.color}
              strokeWidth={hovered === n.sym ? 2.5 : 1.5}
              opacity={isDimmed ? 0.15 : hovered === n.sym ? 1 : 0.85}
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
          series.map((n) => {
            const pt = n.points[hoverIndex];
            if (!pt) return null;
            const { sx, sy } = toSvg(pt.x, pt.y);
            const isDimmed = hovered && hovered !== n.sym;
            return (
              <circle
                key={n.sym}
                cx={sx}
                cy={sy}
                r={3}
                fill={n.color}
                opacity={isDimmed ? 0.15 : 1}
              />
            );
          })}

        {/* End labels */}
        {series.map((n) => {
          const last = n.points[n.points.length - 1];
          if (!last) return null;
          const { sx, sy } = toSvg(last.x, last.y);
          const isDimmed = hovered && hovered !== n.sym;
          return (
            <text
              key={n.sym}
              x={sx + 5}
              y={sy + 3}
              fontSize="10"
              fontWeight="500"
              fill={n.color}
              opacity={isDimmed ? 0.15 : 1}
            >
              {formatEndLabel(last.y)}
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
            <div key={d.sym} className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-[11px] font-semibold text-gray-700">{d.sym}</span>
              <span className={`text-[11px] font-medium ${!isPrice && d.y >= 0 ? "text-green-600" : !isPrice && d.y < 0 ? "text-red-600" : "text-gray-600"}`}>
                {formatHover(d.y)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
