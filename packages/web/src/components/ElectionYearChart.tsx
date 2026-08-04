import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSvgContainerSize } from "../hooks/useSvgContainerSize";
import type { CandlePoint, CandleSeries, PathPoint, PathSeries } from "../lib/elections";

interface ElectionYearChartProps {
  series: PathSeries[];
  candles?: CandleSeries | null;
  className?: string;
  height?: number;
  labels?: string[];
  mode?: "percent" | "price";
}

const DEFAULT_LABELS = [
  "Dec prior",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface View {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export default function ElectionYearChart({
  series,
  candles,
  className = "",
  height = 360,
  labels = DEFAULT_LABELS,
  mode = "percent",
}: ElectionYearChartProps) {
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [transform, setTransform] = useState({ scaleX: 1, dx: 0 });
  const [drag, setDrag] = useState<{
    startX: number;
    startY: number;
    initialTransform: { scaleX: number; dx: number };
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { ref: containerRef, size } = useSvgContainerSize(800, height);

  const isPercent = mode === "percent";
  // Display values: percent change from the January base (100 -> 0%), or raw price.
  const toDisplay = useCallback(
    (val: number) => (isPercent ? val - 100 : val),
    [isPercent]
  );
  const toCandleDisplay = useCallback(
    (val: number, janClose?: number) =>
      isPercent ? (val / (janClose ?? 1) - 1) * 100 : val,
    [isPercent]
  );

  const dataRange = useMemo(() => {
    let min = isPercent ? 0 : Infinity;
    let max = isPercent ? 0 : -Infinity;
    let has = false;

    for (const s of series) {
      for (const p of s.points) {
        if (p.value == null) continue;
        const v = toDisplay(p.value);
        if (!has) {
          min = max = v;
          has = true;
        } else {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
    }

    if (candles) {
      for (const c of candles.candles) {
        const high = toCandleDisplay(c.high, candles.janClose);
        const low = toCandleDisplay(c.low, candles.janClose);
        if (!has) {
          min = max = high;
          has = true;
        } else {
          if (low < min) min = low;
          if (high > max) max = high;
        }
      }
    }

    if (!has) {
      min = max = isPercent ? 0 : 100;
    }
    const pad = (max - min) * 0.1 || 5;
    return { minY: min - pad, maxY: max + pad };
  }, [series, candles, isPercent, toCandleDisplay, toDisplay]);

  const maxX = Math.max(labels.length - 1, 1);

  const defaultView: View = useMemo(
    () => ({
      minX: -0.5,
      maxX: maxX + 0.5,
      minY: dataRange.minY,
      maxY: dataRange.maxY,
    }),
    [dataRange.minY, dataRange.maxY, maxX]
  );

  const view: View = useMemo(() => {
    function computeVisibleYRange(minXv: number, maxXv: number) {
      let min = isPercent ? 0 : Infinity;
      let max = isPercent ? 0 : -Infinity;
      let has = false;

      for (const s of series) {
        for (const p of s.points) {
          if (p.value == null) continue;
          if (p.x >= minXv && p.x <= maxXv) {
            const v = toDisplay(p.value);
            if (!has) {
              min = max = v;
              has = true;
            } else {
              if (v < min) min = v;
              if (v > max) max = v;
            }
          }
        }
      }

      if (candles) {
        for (const c of candles.candles) {
          if (c.x >= minXv && c.x <= maxXv) {
            const high = toCandleDisplay(c.high, candles.janClose);
            const low = toCandleDisplay(c.low, candles.janClose);
            if (!has) {
              min = max = high;
              has = true;
            } else {
              if (low < min) min = low;
              if (high > max) max = high;
            }
          }
        }
      }

      if (!has) {
        min = max = isPercent ? 0 : 0;
      }
      const pad = Math.max((max - min) * 0.05, 1);
      return { minY: min - pad, maxY: max + pad };
    }

    const labelMaxX = maxX;
    const baseW = defaultView.maxX - defaultView.minX;
    const w = baseW / transform.scaleX;
    let minX = defaultView.minX + (baseW - w) / 2 + transform.dx;
    let viewMaxX = minX + w;

    // Don't pan too far past the edges.
    if (minX < -1) {
      minX = -1;
      viewMaxX = minX + w;
    }
    if (viewMaxX > labelMaxX + 1) {
      viewMaxX = labelMaxX + 1;
      minX = viewMaxX - w;
    }

    const { minY, maxY } = computeVisibleYRange(minX, viewMaxX);
    return { minX, maxX: viewMaxX, minY, maxY };
  }, [candles, defaultView, isPercent, maxX, series, toCandleDisplay, toDisplay, transform]);

  const W = size.width;
  const H = size.height;
  const padL = 52;
  const padR = 12;
  const padT = 12;
  const padB = 44;
  const gw = Math.max(W - padL - padR, 1);
  const gh = Math.max(H - padT - padB, 1);

  const xScale = gw / (view.maxX - view.minX);
  const yScale = gh / (view.maxY - view.minY);

  const toSvg = useCallback(
    (x: number, displayY: number) => ({
      sx: padL + (x - view.minX) * xScale,
      sy: padT + (view.maxY - displayY) * yScale,
    }),
    [padL, padT, xScale, yScale, view.minX, view.maxY]
  );

  const gridCount = 5;
  const gridYs = useMemo(
    () =>
      Array.from(
        { length: gridCount + 1 },
        (_, i) => view.minY + ((view.maxY - view.minY) * i) / gridCount
      ),
    [view.minY, view.maxY]
  );

  function clientToSvgPoint(e: { clientX: number; clientY: number }) {
    if (!svgRef.current) return { svgX: W / 2, svgY: H / 2 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      svgX: ((e.clientX - rect.left) / rect.width) * W,
      svgY: ((e.clientY - rect.top) / rect.height) * H,
    };
  }

  function handleMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    e.preventDefault();
    setDrag({
      startX: e.clientX,
      startY: e.clientY,
      initialTransform: { scaleX: transform.scaleX, dx: transform.dx },
    });
    setHoverX(null);
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (drag) {
      const dx = e.clientX - drag.startX;
      const dxData = -dx / xScale;
      setTransform({
        scaleX: drag.initialTransform.scaleX,
        dx: drag.initialTransform.dx + dxData,
      });
      return;
    }
    const { svgX } = clientToSvgPoint(e);
    const x = (svgX - padL) / xScale + view.minX;
    setHoverX(Math.max(0, Math.min(maxX, x)));
  }

  function handleMouseLeave() {
    setHoverX(null);
    setDrag(null);
  }

  function handleWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();

    // Pinch-to-zoom on a trackpad is reported as a wheel event with Ctrl/Cmd held.
    const isPinch = e.ctrlKey || e.metaKey;

    // Horizontal two-finger swipe pans the zoomed chart left/right.
    if (!isPinch && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      const dxData = -e.deltaX / xScale;
      setTransform((t) => ({ scaleX: t.scaleX, dx: t.dx + dxData }));
      return;
    }

    const { svgX } = clientToSvgPoint(e);
    const dataX = view.minX + (svgX - padL) / xScale;
    const factor = e.deltaY < 0 ? 1.15 : 0.87;

    const newScaleX = Math.min(20, Math.max(1, transform.scaleX * factor));
    if (newScaleX === transform.scaleX) return;

    const baseW = defaultView.maxX - defaultView.minX;
    const newW = baseW / newScaleX;
    const newXScale = gw / newW;

    const newDx = dataX - (svgX - padL) / newXScale - defaultView.minX - (baseW - newW) / 2;

    setTransform({ scaleX: newScaleX, dx: newDx });
  }

  useEffect(() => {
    if (!drag) return;
    function onMouseUp() {
      setDrag(null);
    }
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, [drag]);

  // Prevent the browser's Ctrl/Cmd+wheel zoom (and page scroll) from leaving the chart.
  // React's synthetic wheel listener is passive by default, so we need a native
  // non-passive listener to call preventDefault reliably.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    function onNativeWheel(e: WheelEvent) {
      e.preventDefault();
    }
    el.addEventListener("wheel", onNativeWheel, { passive: false });
    return () => el.removeEventListener("wheel", onNativeWheel);
  }, []);

  const pathData = useMemo(() => {
    return series.map((s) => {
      let d = "";
      let started = false;
      s.points.forEach((p) => {
        if (p.value == null) {
          started = false;
          return;
        }
        const { sx, sy } = toSvg(p.x, toDisplay(p.value));
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
  }, [series, toDisplay, toSvg]);

  type HoverLineItem = {
    type: "line";
    id: string;
    label: string;
    color: string;
    date: string;
    value: number;
  };
  type HoverCandleItem = {
    type: "candle";
    id: string;
    label: string;
    color: string;
    date: string;
    ohlc: CandlePoint;
  };
  type HoverItem = HoverLineItem | HoverCandleItem;

  const hoverData = useMemo<HoverItem[]>(() => {
    if (hoverX == null) return [];
    const base: HoverLineItem[] = series
      .map((s) => {
        let closest: PathPoint | null = null;
        let closestDist = Infinity;
        for (const p of s.points) {
          if (p.value == null) continue;
          const dist = Math.abs(p.x - hoverX);
          if (dist < closestDist) {
            closestDist = dist;
            closest = p;
          }
        }
        if (!closest || closest.value == null) return null;
        return {
          type: "line",
          id: s.id,
          label: s.label,
          color: s.color,
          date: closest.date,
          value: closest.value,
        };
      })
      .filter(Boolean) as HoverLineItem[];
    if (!candles) return base;
    let nearestCandle: CandlePoint | null = null;
    let nearestDist = Infinity;
    for (const c of candles.candles) {
      const dist = Math.abs(c.x - hoverX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestCandle = c;
      }
    }
    if (!nearestCandle) return base;
    return [
      ...base,
      {
        type: "candle",
        id: `candles-${candles.year}`,
        label: candles.label,
        color: candles.color,
        date: nearestCandle.date,
        ohlc: nearestCandle,
      },
    ];
  }, [hoverX, series, candles]);

  function formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00Z");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  const hoverDateLabel = useMemo(() => {
    if (hoverData.length === 0) return "";
    return formatDateLabel(hoverData[0].date);
  }, [hoverData]);

  const individualCount = series.filter((s) => s.id !== "average").length;
  const legendSeries = series.filter((s) => s.showInLegend && s.id !== "average");

  const yDigits = view.maxY - view.minY < 5 ? 1 : 0;
  const formatY = (y: number) =>
    isPercent
      ? `${y >= 0 ? "+" : ""}${y.toFixed(yDigits)}%`
      : y.toLocaleString("en-US", { maximumFractionDigits: 0 });

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
        {candles && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border"
            style={{
              color: candles.color,
              borderColor: candles.color + "40",
              backgroundColor: candles.color + "15",
            }}
          >
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: candles.color }} />
            {candles.label}
          </span>
        )}
        {individualCount > 0 && (
          <span className="text-[10px] text-gray-400">+{individualCount} individual years overlaid</span>
        )}
        <button
          onClick={() => setTransform({ scaleX: 1, dx: 0 })}
          className="ml-auto text-[10px] font-medium px-2 py-1 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
        >
          Reset zoom
        </button>
      </div>

      <div ref={containerRef} className="flex-1 min-h-0">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className={`w-full h-full touch-none ${drag ? "cursor-grabbing" : "cursor-grab"}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
        >
          <defs>
            <clipPath id="plot-area">
              <rect x={padL} y={padT} width={gw} height={gh} />
            </clipPath>
          </defs>

          {/* Grid lines */}
          {gridYs.map((y, i) => {
            const sy = padT + (view.maxY - y) * yScale;
            return (
              <g key={i}>
                <line x1={padL} y1={sy} x2={W - padR} y2={sy} stroke="#e5e7eb" strokeWidth="1" />
                <text x={padL - 6} y={sy + 3} textAnchor="end" fontSize="10" fill="#9ca3af">
                  {formatY(y)}
                </text>
              </g>
            );
          })}

          {/* Zero / starting-value reference line */}
          {isPercent && view.minY < 0 && view.maxY > 0 && (
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
            if (i < view.minX - 0.5 || i > view.maxX + 0.5) return null;
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

          <g clipPath="url(#plot-area)">
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

            {/* Candlesticks for the most recent completed year */}
            {candles && (
              <g>
                {candles.candles.map((c) => {
                  const openD = toCandleDisplay(c.open, candles.janClose);
                  const highD = toCandleDisplay(c.high, candles.janClose);
                  const lowD = toCandleDisplay(c.low, candles.janClose);
                  const closeD = toCandleDisplay(c.close, candles.janClose);
                  const { sx, sy: syOpen } = toSvg(c.x, openD);
                  const { sy: syClose } = toSvg(c.x, closeD);
                  const { sy: syHigh } = toSvg(c.x, highD);
                  const { sy: syLow } = toSvg(c.x, lowD);
                  let bodyTopY = Math.min(syOpen, syClose);
                  let bodyBottomY = Math.max(syOpen, syClose);
                  if (bodyBottomY - bodyTopY < 1) {
                    const mid = (bodyTopY + bodyBottomY) / 2;
                    bodyTopY = mid - 0.5;
                    bodyBottomY = mid + 0.5;
                  }
                  const bodyHeight = bodyBottomY - bodyTopY;
                  const dayWidth = (xScale * 11) / candles.candles.length;
                  const bodyWidth = Math.max(1.5, dayWidth * 0.5);
                  const isUp = c.close >= c.open;
                  const color = isUp ? "#22c55e" : "#ef4444";
                  return (
                    <g key={c.x}>
                      <line x1={sx} y1={syHigh} x2={sx} y2={syLow} stroke={color} strokeWidth={1} />
                      <rect
                        x={sx - bodyWidth / 2}
                        y={bodyTopY}
                        width={bodyWidth}
                        height={bodyHeight}
                        fill={color}
                        fillOpacity={0.85}
                        stroke={color}
                        strokeWidth={1}
                        rx={1}
                      />
                    </g>
                  );
                })}

                {/* Party-colored underline for the most recent completed year */}
                {(() => {
                  const first = candles.candles[0];
                  const last = candles.candles[candles.candles.length - 1];
                  const lowDs = candles.candles.map((c) => toCandleDisplay(c.low, candles.janClose));
                  const minLow = Math.min(...lowDs);
                  const lineY = minLow - 2;
                  const { sx: x1, sy: y1 } = toSvg(first.x, lineY);
                  const { sx: x2, sy: y2 } = toSvg(last.x, lineY);
                  return (
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={candles.partyColor}
                      strokeWidth={1}
                      strokeLinecap="round"
                      opacity={0.5}
                    />
                  );
                })()}
              </g>
            )}

            {/* Hover line */}
            {hoverX != null && (
              <line
                x1={toSvg(hoverX, 0).sx}
                y1={padT}
                x2={toSvg(hoverX, 0).sx}
                y2={H - padB}
                stroke="#d1d5db"
                strokeWidth="1"
                strokeDasharray="4,4"
                opacity={0.8}
              />
            )}

            {/* Hover dots */}
            {hoverX != null &&
              series.map((s) => {
                let closest: PathPoint | null = null;
                let closestDist = Infinity;
                for (const p of s.points) {
                  if (p.value == null) continue;
                  const dist = Math.abs(p.x - hoverX);
                  if (dist < closestDist) {
                    closestDist = dist;
                    closest = p;
                  }
                }
                if (!closest || closest.value == null) return null;
                const { sx, sy } = toSvg(closest.x, toDisplay(closest.value));
                return <circle key={s.id} cx={sx} cy={sy} r={3} fill={s.color} />;
              })}
          </g>
        </svg>
      </div>

      {/* Hover panel */}
      <div
        className="mt-2 pt-2 border-t border-gray-100 min-h-[2.5rem] max-h-48 overflow-y-auto transition-opacity duration-150"
        style={{ opacity: hoverData.length > 0 ? 1 : 0 }}
      >
        <div className="text-[10px] text-gray-400 font-medium mb-1">{hoverDateLabel}</div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {hoverData.map((d) => {
            if (d.type === "candle") {
              const { ohlc } = d;
              return (
                <div key={d.id} className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: d.color }} />
                  <span className="text-[11px] font-semibold text-gray-700">{d.label}</span>
                  <span className="text-[11px] font-medium text-gray-500">
                    O {ohlc.open.toFixed(0)} H {ohlc.high.toFixed(0)} L {ohlc.low.toFixed(0)} C{" "}
                    {ohlc.close.toFixed(0)}
                  </span>
                </div>
              );
            }
            return (
              <div key={d.id} className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-[11px] font-semibold text-gray-700">{d.label}</span>
                <span
                  className={`text-[11px] font-medium ${
                    isPercent ? (d.value >= 100 ? "text-green-600" : "text-red-600") : "text-gray-600"
                  }`}
                >
                  {formatY(toDisplay(d.value))}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
