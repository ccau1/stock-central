import { useMemo, useRef, useState } from "react";
import type { DataFrame, ChartConfig, ChartSeries } from "../lib/query/types";
import { useSvgContainerSize } from "../hooks/useSvgContainerSize";

const DEFAULT_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#a855f7",
];

interface LineAreaBarChartProps {
  df: DataFrame;
  config: ChartConfig;
}

export default function LineAreaBarChart({ df, config }: LineAreaBarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { ref: containerRef, size } = useSvgContainerSize(800, 320);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);

  const xColumn = config.x ?? df.columns[0]?.name ?? "date";
  const series = useMemo(() => buildSeries(df, config), [df, config]);
  const normalized = config.options?.normalized ?? false;

  const { xValues, minY, maxY } = useMemo(() => {
    const xIdx = df.columns.findIndex((c) => c.name === xColumn);
    const xVals = df.rows.map((r) => String(r[xIdx] ?? ""));
    let min = Infinity;
    let max = -Infinity;
    series.forEach((s) => {
      s.points.forEach((p) => {
        if (p != null && !Number.isNaN(p)) {
          min = Math.min(min, p);
          max = Math.max(max, p);
        }
      });
    });
    if (!isFinite(min)) { min = 0; max = 1; }
    return { xValues: xVals, minY: min, maxY: max };
  }, [df, series, xColumn]);

  if (series.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-slate-500">No series configured.</div>;
  }

  const W = size.width;
  const H = size.height;
  const padL = 48;
  const padR = 12;
  const padT = 16;
  const padB = 36;
  const gw = Math.max(W - padL - padR, 0);
  const gh = Math.max(H - padT - padB, 0);
  const rangeY = maxY - minY || 1;

  const n = xValues.length;
  const bandCount = series.length || 1;
  const xScale = n > 1 ? gw / (n - 1) : gw;
  const yScale = gh / rangeY;
  const barGroupWidth = n > 0 ? gw / n : 0;
  const barWidth = barGroupWidth > 0 ? Math.min(12, (barGroupWidth - 4) / bandCount) : 0;

  const toSvg = (i: number, y: number) => ({
    sx: n > 1 ? padL + i * xScale : padL + gw / 2,
    sy: padT + (maxY - y) * yScale,
  });

  const gridLines = 5;
  const gridYs = Array.from({ length: gridLines + 1 }, (_, i) => minY + (rangeY * i) / gridLines);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || n <= 1 || W <= 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    let idx = Math.round((svgX - padL) / xScale);
    idx = Math.max(0, Math.min(idx, n - 1));
    setHoverIndex(idx);
  };

  const handleMouseLeave = () => setHoverIndex(null);

  const hoverData = hoverIndex != null
    ? series
        .map((s) => {
          const v = s.points[hoverIndex];
          return v != null && !Number.isNaN(v)
            ? { key: s.key, label: s.label, color: s.color, value: v, x: xValues[hoverIndex] }
            : null;
        })
        .filter(Boolean) as { key: string; label: string; color: string; value: number; x: string }[]
    : [];

  function formatY(val: number) {
    if (normalized) return `${val >= 0 ? "+" : ""}${val.toFixed(0)}%`;
    if (Math.abs(val) >= 1000) return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return val.toFixed(2);
  }

  function pathForSeries(s: ReturnType<typeof buildSeries>[number]) {
    let d = "";
    s.points.forEach((y, i) => {
      if (y == null || Number.isNaN(y)) return;
      const { sx, sy } = toSvg(i, y);
      d += d ? ` L ${sx} ${sy}` : `M ${sx} ${sy}`;
    });
    return d;
  }

  function areaPathForSeries(s: ReturnType<typeof buildSeries>[number]) {
    const lineD = pathForSeries(s);
    if (!lineD) return "";
    const firstIdx = s.points.findIndex((y) => y != null && !Number.isNaN(y));
    const lastIdx = s.points.length - 1 - [...s.points].reverse().findIndex((y) => y != null && !Number.isNaN(y));
    if (firstIdx < 0 || lastIdx < firstIdx) return "";
    const p1 = toSvg(firstIdx, minY);
    const p2 = toSvg(lastIdx, minY);
    return `${lineD} L ${p2.sx} ${p2.sy} L ${p1.sx} ${p1.sy} Z`;
  }

  return (
    <div ref={containerRef} className="flex h-full flex-col">
      {config.options?.showLegend !== false && (
        <div className="flex flex-wrap items-center gap-3 px-1 pb-2">
          {series.map((s) => (
            <button
              key={s.key}
              className={`flex items-center gap-1.5 text-xs transition-opacity ${hoveredSeries && hoveredSeries !== s.key ? "opacity-40" : "opacity-100"}`}
              onMouseEnter={() => setHoveredSeries(s.key)}
              onMouseLeave={() => setHoveredSeries(null)}
            >
              <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: s.color }} />
              <span className="text-slate-300">{s.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="relative flex-1 min-h-0">
        <svg ref={svgRef} className="h-full w-full" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
          {/* Grid lines */}
          {config.options?.showGrid !== false && gridYs.map((y, i) => {
            const sy = padT + (maxY - y) * yScale;
            return (
              <g key={i}>
                <line x1={padL} y1={sy} x2={W - padR} y2={sy} stroke="#334155" strokeOpacity={0.4} strokeDasharray="2,2" />
                <text x={padL - 6} y={sy + 3} textAnchor="end" fontSize={10} fill="#94a3b8">{formatY(y)}</text>
              </g>
            );
          })}

          {/* Zero line */}
          {minY < 0 && maxY > 0 && (() => {
            const sy = padT + (maxY - 0) * yScale;
            return <line x1={padL} y1={sy} x2={W - padR} y2={sy} stroke="#64748b" strokeWidth={1} />;
          })()}

          {/* Bars */}
          {series.map((s) =>
            s.style === "bar"
              ? s.points.map((y, i) => {
                  if (y == null || Number.isNaN(y)) return null;
                  const { sx } = toSvg(i, y);
                  const y0 = padT + (maxY - 0) * yScale;
                  const yPos = padT + (maxY - y) * yScale;
                  const xOffset = (series.indexOf(s) - (series.length - 1) / 2) * barWidth;
                  return (
                    <rect
                      key={`${s.key}-bar-${i}`}
                      x={sx + xOffset - barWidth / 2}
                      y={Math.min(y0, yPos)}
                      width={barWidth}
                      height={Math.abs(yPos - y0)}
                      fill={s.color}
                      opacity={hoveredSeries && hoveredSeries !== s.key ? 0.2 : 0.85}
                    />
                  );
                })
              : null
          )}

          {/* Areas */}
          {series.map((s) =>
            s.style === "area" ? (
              <path
                key={`${s.key}-area`}
                d={areaPathForSeries(s)}
                fill={s.color}
                opacity={hoveredSeries && hoveredSeries !== s.key ? 0.1 : 0.25}
              />
            ) : null
          )}

          {/* Lines */}
          {series.map((s) =>
            s.style === "line" || s.style === "area" ? (
              <path
                key={`${s.key}-line`}
                d={pathForSeries(s)}
                fill="none"
                stroke={s.color}
                strokeWidth={hoveredSeries && hoveredSeries !== s.key ? 1.5 : 2}
                opacity={hoveredSeries && hoveredSeries !== s.key ? 0.3 : 1}
              />
            ) : null
          )}

          {/* Hover crosshair */}
          {hoverIndex != null && n > 1 && (() => {
            const { sx } = toSvg(hoverIndex, maxY);
            return (
              <line
                x1={sx}
                y1={padT}
                x2={sx}
                y2={H - padB}
                stroke="#94a3b8"
                strokeWidth={1}
                strokeDasharray="4,4"
              />
            );
          })()}

          {/* X-axis labels */}
          {n > 0 && [0, Math.floor(n / 2), n - 1].map((i) => {
            const { sx } = toSvg(i, minY);
            return (
              <text key={i} x={sx} y={H - padB + 16} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize={10} fill="#94a3b8">
                {xValues[i]}
              </text>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hoverData.length > 0 && (
          <div className="pointer-events-none absolute top-2 right-2 rounded bg-slate-900/90 p-2 text-xs shadow ring-1 ring-slate-700">
            <div className="mb-1 text-slate-400">{hoverData[0]?.x}</div>
            {hoverData.map((d) => (
              <div key={d.key} className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-slate-300">{d.label}:</span>
                <span className="font-mono text-slate-100">{formatY(d.value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function buildSeries(df: DataFrame, config: ChartConfig) {
  const xColumn = config.x ?? df.columns[0]?.name ?? "date";
  const yColumns =
    config.y && config.y.length > 0
      ? config.y
      : df.columns.filter((c) => c.name !== xColumn && c.type === "number").map((c) => ({ field: c.name } as ChartSeries));

  const colors = config.options?.colors ?? DEFAULT_COLORS;

  return yColumns.map((s, i) => {
    const colIdx = df.columns.findIndex((c) => c.name === s.field);
    const points: (number | null)[] = df.rows.map((row) => {
      if (colIdx < 0) return null;
      const v = row[colIdx];
      return typeof v === "number" && !Number.isNaN(v) ? v : null;
    });

    // Apply normalization to each series independently.
    let normalizedPoints = points;
    if (config.options?.normalized) {
      const first = points.find((p) => p != null);
      if (first != null && first !== 0) {
        normalizedPoints = points.map((p) => (p != null ? ((p - first) / Math.abs(first)) * 100 : null));
      }
    }

    return {
      key: s.field,
      label: s.label || s.field,
      color: s.color || colors[i % colors.length],
      style: s.style || (config.type === "bar" ? "bar" : config.type === "area" ? "area" : "line"),
      width: s.width ?? 2,
      points: normalizedPoints,
    };
  });
}
