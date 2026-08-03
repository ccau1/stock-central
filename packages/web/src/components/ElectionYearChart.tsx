import { useCallback, useMemo, useRef, useState } from "react";
import { useSvgContainerSize } from "../hooks/useSvgContainerSize";
import type { PathSeries } from "../lib/elections";

interface ElectionYearChartProps {
  series: PathSeries[];
  className?: string;
  height?: number;
  labels?: string[];
}

const DEFAULT_LABELS = ["Dec prior", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ElectionYearChart({
  series,
  className = "",
  height = 360,
  labels = DEFAULT_LABELS,
}: ElectionYearChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { ref: containerRef, size } = useSvgContainerSize(800, height);

  // Display values as percent change from the January base (100 -> 0%).
  const toDisplay = (val: number) => val - 100;

  const activePoints = useMemo(() => {
    return series.flatMap((s) =>
      s.points.map((p) => p.value).filter((v): v is number => v != null).map(toDisplay)
    );
  }, [series]);

  const { minY, maxY, yRange } = useMemo(() => {
    const vals = activePoints.length > 0 ? activePoints : [0];
    const min = Math.min(...vals, 0);
    const max = Math.max(...vals, 0);
    const pad = (max - min) * 0.1 || 5;
    return { minY: min - pad, maxY: max + pad, yRange: max - min + pad * 2 };
  }, [activePoints]);

  const W = size.width;
  const H = size.height;
  const padL = 52;
  const padR = 12;
  const padT = 12;
  const padB = 44;
  const gw = Math.max(W - padL - padR, 1);
  const gh = Math.max(H - padT - padB, 1);

  const maxX = Math.max(labels.length - 1, 1);
  const xScale = gw / maxX;
  const yScale = gh / yRange;

  const toSvg = useCallback(
    (x: number, displayY: number) => ({
      sx: padL + x * xScale,
      sy: padT + (maxY - displayY) * yScale,
    }),
    [padL, padT, xScale, yScale, maxY]
  );

  const gridCount = 5;
  const gridYs = Array.from({ length: gridCount + 1 }, (_, i) => minY + (yRange * i) / gridCount);

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current || W <= 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    let idx = Math.round((svgX - padL) / xScale);
    if (idx < 0) idx = 0;
    if (idx > maxX) idx = maxX;
    setHoverIndex(idx);
  }

  function handleMouseLeave() {
    setHoverIndex(null);
  }

  const pathData = useMemo(() => {
    return series.map((s) => {
      let d = "";
      let started = false;
      s.points.forEach((p) => {
        if (p.value == null) {
          started = false;
          return;
        }
        const { sx, sy } = toSvg(p.monthIndex, toDisplay(p.value));
        d += `${started ? "L" : "M"} ${sx} ${sy} `;
        started = true;
      });
      return {
        id: s.id,
        label: s.label,
        color: s.color,
        d,
        lineWidth: s.lineWidth ?? 2,
        opacity: s.opacity ?? 1,
      };
    });
  }, [series, toSvg]);

  const hoverData =
    hoverIndex != null
      ? series
          .map((s) => {
            const pt = s.points[hoverIndex];
            return pt ? { id: s.id, label: s.label, color: s.color, value: pt.value } : null;
          })
          .filter(Boolean) as { id: string; label: string; color: string; value: number | null }[]
      : [];

  const individualCount = series.filter((s) => s.id !== "average").length;
  const legendSeries = series.filter((s) => s.showInLegend && s.id !== "average");

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Legend / summary */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border bg-gray-100 text-gray-700 border-gray-200">
          <span className="w-2 h-2 rounded-full bg-gray-900" />
          Average
        </span>
        {legendSeries.map((s) => (
          <span
            key={s.id}
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border"
            style={{ color: s.color, borderColor: s.color + "40", backgroundColor: s.color + "15" }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
        {individualCount > 0 && (
          <span className="text-[10px] text-gray-400">
            +{individualCount} individual years overlaid
          </span>
        )}
      </div>

      <div ref={containerRef} className="flex-1 min-h-0">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full"
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
                  {`${y >= 0 ? "+" : ""}${y.toFixed(0)}%`}
                </text>
              </g>
            );
          })}

          {/* Zero / starting-value reference line */}
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

          {/* X-axis labels */}
          {labels.map((label, i) => {
            const { sx } = toSvg(i, 0);
            return (
              <text
                key={label}
                x={sx}
                y={H - padB + 16}
                textAnchor={i === 0 ? "start" : i === maxX ? "end" : "middle"}
                fontSize="10"
                fill="#6b7280"
              >
                {label}
              </text>
            );
          })}

          {/* Paths */}
          {pathData.map((p) => (
            <path
              key={p.id}
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth={p.lineWidth}
              opacity={p.opacity}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Hover line */}
          {hoverIndex != null && (
            <line
              x1={toSvg(hoverIndex, 0).sx}
              y1={padT}
              x2={toSvg(hoverIndex, 0).sx}
              y2={H - padB}
              stroke="#d1d5db"
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity={0.8}
            />
          )}

          {/* Hover dots */}
          {hoverIndex != null &&
            series.map((s) => {
              const pt = s.points[hoverIndex];
              if (pt?.value == null) return null;
              const { sx, sy } = toSvg(pt.monthIndex, toDisplay(pt.value));
              return <circle key={s.id} cx={sx} cy={sy} r={3} fill={s.color} />;
            })}
        </svg>
      </div>

      {/* Hover panel */}
      <div
        className="mt-2 pt-2 border-t border-gray-100 min-h-[2.5rem] max-h-48 overflow-y-auto transition-opacity duration-150"
        style={{ opacity: hoverData.length > 0 ? 1 : 0 }}
      >
        <div className="text-[10px] text-gray-400 font-medium mb-1">
          {hoverIndex != null ? labels[hoverIndex] : ""}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {hoverData.map((d) => (
            <div key={d.id} className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-[11px] font-semibold text-gray-700">{d.label}</span>
              <span className={`text-[11px] font-medium ${d.value != null && d.value >= 100 ? "text-green-600" : d.value != null ? "text-red-600" : "text-gray-500"}`}>
                {d.value != null ? `${d.value >= 100 ? "+" : ""}${(d.value - 100).toFixed(1)}%` : "–"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
