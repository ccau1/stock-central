import { useState } from "react";
import type { PricePoint } from "../lib/api";
import { useSvgChartScale } from "../hooks/useSvgChartScale";
import { useSvgHover } from "../hooks/useSvgHover";
import { SvgChartGrid } from "./svg/SvgChartGrid";
import { SvgZeroLine } from "./svg/SvgZeroLine";
import { SvgHoverLine } from "./svg/SvgHoverLine";
import { SvgHoverDots } from "./svg/SvgHoverDots";
import { SvgLegend } from "./svg/SvgLegend";

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
  baseline?: "zero" | "auto";
}

export default function ComparisonChart({
  data,
  symbols,
  className = "",
  mode = "normalized",
  baseline = "zero",
}: ComparisonChartProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const activeSymbols = symbols.filter((s) => data && data[s] && data[s].length > 0);
  if (!data || activeSymbols.length === 0) return null;

  const isPrice = mode === "price";

  const series = activeSymbols.map((sym) => ({
    sym,
    points: isPrice ? rawPricePoints(data[sym]) : normalizePoints(data[sym]),
    color: CHART_COLORS[symbols.indexOf(sym) % CHART_COLORS.length],
  }));

  const allY = series.flatMap((n) => n.points.map((p) => p.y));
  const dataMin = Math.min(...allY);
  const dataMax = Math.max(...allY);

  let minY: number;
  let maxY: number;
  if (baseline === "auto") {
    const pad = (dataMax - dataMin) * 0.05 || 1;
    minY = dataMin - pad;
    maxY = dataMax + pad;
  } else {
    minY = Math.min(dataMin, 0);
    maxY = Math.max(dataMax, 0);
  }

  const maxLen = Math.max(...series.map((n) => n.points.length));

  const scale = useSvgChartScale({
    defaultHeight: 320,
    padding: { left: 44, right: 12, top: 12, bottom: 28 },
    xDomain: [0, Math.max(maxLen - 1, 0)],
    yDomain: [minY, maxY],
  });

  const hover = useSvgHover({ scale, mode: "index", maxIndex: Math.max(maxLen - 1, 0) });

  const hoveredData =
    hover.hoverIndex != null
      ? (series
          .map((n) => {
            const pt = n.points[hover.hoverIndex!];
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

  const legendItems = series.map((n) => ({ key: n.sym, label: n.sym, color: n.color }));
  const hoverDotItems =
    hover.hoverIndex != null
      ? series.map((n) => {
          const pt = n.points[hover.hoverIndex!];
          return {
            key: n.sym,
            x: pt?.x ?? hover.hoverIndex!,
            y: pt?.y ?? null,
            color: n.color,
            dimmed: hovered != null && hovered !== n.sym,
          };
        })
      : [];

  // Mobile: treat a single touch as hover so users can inspect values.
  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    hover.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as React.MouseEvent<SVGSVGElement>);
  };

  return (
    <div className={`h-full flex flex-col ${className}`}>
      <SvgLegend
        items={legendItems}
        hoveredKey={hovered}
        onHover={setHovered}
        className="mb-3"
      />

      <div ref={scale.containerRef} className="flex-1 min-h-0">
        <svg
          ref={scale.svgRef}
          viewBox={`0 0 ${scale.size.width} ${scale.size.height}`}
          className="w-full h-full touch-pan-x"
          onMouseMove={hover.handleMouseMove}
          onMouseLeave={hover.handleMouseLeave}
          onTouchMove={handleTouchMove}
          onTouchEnd={hover.handleMouseLeave}
        >
          <SvgChartGrid scale={scale} formatY={formatY} />
          <SvgZeroLine scale={scale} />

          {/* Paths */}
          {series.map((n) => {
            const d = n.points
              .map((p, i) => {
                const { sx, sy } = scale.toSvg(p.x, p.y);
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

          <SvgHoverLine
            svgX={hover.hoverSvgX}
            top={scale.padding.top}
            bottom={scale.size.height - scale.padding.bottom}
            opacity={0.7}
          />

          <SvgHoverDots items={hoverDotItems} scale={scale} />

          {/* End labels */}
          {series.map((n) => {
            const last = n.points[n.points.length - 1];
            if (!last) return null;
            const { sx, sy } = scale.toSvg(last.x, last.y);
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
        style={{ opacity: hover.hoverIndex != null && hoveredData.length > 0 ? 1 : 0 }}
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
