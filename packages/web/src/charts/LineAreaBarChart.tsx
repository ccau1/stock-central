import { useMemo, useState } from "react";
import type { DataFrame, ChartConfig, ChartSeries } from "../lib/query/types";
import { useSvgChartScale } from "../hooks/useSvgChartScale";
import { useSvgHover } from "../hooks/useSvgHover";
import { SvgChartGrid } from "../components/svg/SvgChartGrid";
import { SvgZeroLine } from "../components/svg/SvgZeroLine";
import { SvgHoverLine } from "../components/svg/SvgHoverLine";
import { SvgLegend } from "../components/svg/SvgLegend";

const DEFAULT_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#a855f7",
];

interface LineAreaBarChartProps {
  df: DataFrame;
  config: ChartConfig;
}

export default function LineAreaBarChart({ df, config }: LineAreaBarChartProps) {
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

  const n = xValues.length;
  const bandCount = series.length || 1;

  const scale = useSvgChartScale({
    defaultHeight: 320,
    padding: { left: 48, right: 12, top: 16, bottom: 36 },
    xDomain: [0, Math.max(n - 1, 0)],
    yDomain: [minY, maxY],
  });

  const hover = useSvgHover({ scale, mode: "index", maxIndex: Math.max(n - 1, 0) });

  const gw = scale.plotArea.width;
  const barGroupWidth = n > 0 ? gw / n : 0;
  const barWidth = barGroupWidth > 0 ? Math.min(12, (barGroupWidth - 4) / bandCount) : 0;

  function formatY(val: number) {
    if (normalized) return `${val >= 0 ? "+" : ""}${val.toFixed(0)}%`;
    if (Math.abs(val) >= 1000) return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return val.toFixed(2);
  }

  function pathForSeries(s: ReturnType<typeof buildSeries>[number]) {
    let d = "";
    s.points.forEach((y, i) => {
      if (y == null || Number.isNaN(y)) return;
      const { sx, sy } = scale.toSvg(i, y);
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
    const p1 = scale.toSvg(firstIdx, minY);
    const p2 = scale.toSvg(lastIdx, minY);
    return `${lineD} L ${p2.sx} ${p2.sy} L ${p1.sx} ${p1.sy} Z`;
  }

  const hoverData = hover.hoverIndex != null
    ? series
        .map((s) => {
          const v = s.points[hover.hoverIndex!];
          return v != null && !Number.isNaN(v)
            ? { key: s.key, label: s.label, color: s.color, value: v, x: xValues[hover.hoverIndex!] }
            : null;
        })
        .filter(Boolean) as { key: string; label: string; color: string; value: number; x: string }[]
    : [];

  const legendItems = series.map((s) => ({ key: s.key, label: s.label, color: s.color, marker: "line" as const }));

  // Mobile: single-finger touch drives hover.
  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    hover.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as React.MouseEvent<SVGSVGElement>);
  };

  return (
    <div ref={scale.containerRef} className="flex h-full flex-col">
      {config.options?.showLegend !== false && (
        <SvgLegend
          items={legendItems}
          hoveredKey={hoveredSeries}
          onHover={setHoveredSeries}
          className="px-1 pb-2"
        />
      )}

      <div className="relative flex-1 min-h-0">
        <svg
          ref={scale.svgRef}
          className="h-full w-full touch-pan-x"
          onMouseMove={hover.handleMouseMove}
          onMouseLeave={hover.handleMouseLeave}
          onTouchMove={handleTouchMove}
          onTouchEnd={hover.handleMouseLeave}
        >
          {config.options?.showGrid !== false && (
            <SvgChartGrid
              scale={scale}
              formatY={formatY}
              stroke="#334155"
              strokeOpacity={0.4}
              strokeDasharray="2,2"
              labelFill="#94a3b8"
            />
          )}

          <SvgZeroLine scale={scale} stroke="#64748b" strokeDasharray={undefined} />

          {/* Bars */}
          {series.map((s) =>
            s.style === "bar"
              ? s.points.map((y, i) => {
                  if (y == null || Number.isNaN(y)) return null;
                  const { sx } = scale.toSvg(i, y);
                  const y0 = scale.toSvg(0, 0).sy;
                  const yPos = scale.toSvg(i, y).sy;
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

          <SvgHoverLine
            svgX={hover.hoverSvgX}
            top={scale.padding.top}
            bottom={scale.size.height - scale.padding.bottom}
            stroke="#94a3b8"
          />

          {/* X-axis labels */}
          {n > 0 && [0, Math.floor(n / 2), n - 1].map((i) => {
            const { sx } = scale.toSvg(i, minY);
            return (
              <text
                key={i}
                x={sx}
                y={scale.size.height - scale.padding.bottom + 16}
                textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
                fontSize={10}
                fill="#94a3b8"
              >
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
