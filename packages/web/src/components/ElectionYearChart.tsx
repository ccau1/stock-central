import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSvgChartScale } from "../hooks/useSvgChartScale";
import { useSvgHover } from "../hooks/useSvgHover";
import { SvgChartGrid } from "./svg/SvgChartGrid";
import { SvgZeroLine } from "./svg/SvgZeroLine";
import { SvgHoverLine } from "./svg/SvgHoverLine";
import { SvgHoverDots, type SvgHoverDotItem } from "./svg/SvgHoverDots";
import type { CandlePoint, CandleSeries, PathSeries } from "../lib/elections";

interface ElectionYearChartProps {
  series: PathSeries[];
  candles?: CandleSeries | null;
  enabledIds?: Set<string>;
  setEnabledIds?: React.Dispatch<React.SetStateAction<Set<string>>>;
  className?: string;
  height?: number;
  labels?: string[];
  mode?: "percent" | "price";
}

const DEFAULT_LABELS = [
  "Dec prior", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
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
  enabledIds,
  setEnabledIds,
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
  const touchRef = useRef<{
    mode: "none" | "pan" | "pinch";
    startX: number;
    initialTransform: { scaleX: number; dx: number };
    startDist: number;
    startMidSvgX: number;
  }>({
    mode: "none",
    startX: 0,
    initialTransform: { scaleX: 1, dx: 0 },
    startDist: 0,
    startMidSvgX: 0,
  });
  const transformRef = useRef(transform);
  transformRef.current = transform;

  const isPercent = mode === "percent";

  // Track which series are currently visible on the chart.
  const allSeriesIds = useMemo(() => {
    const ids = series.map((s) => s.id);
    if (candles) ids.push(`candles-${candles.year}`);
    return ids;
  }, [series, candles]);

  const isControlled = enabledIds !== undefined && setEnabledIds !== undefined;
  const [internalEnabledIds, setInternalEnabledIds] = useState<Set<string>>(new Set(allSeriesIds));
  const [hoveredLegendId, setHoveredLegendId] = useState<string | null>(null);

  useEffect(() => {
    if (!isControlled) setInternalEnabledIds(new Set(allSeriesIds));
    setHoveredLegendId(null);
  }, [allSeriesIds, isControlled]);

  const effectiveEnabledIds = isControlled ? enabledIds! : internalEnabledIds;
  const effectiveSetEnabledIds = isControlled ? setEnabledIds! : setInternalEnabledIds;

  const visibleSeries = useMemo(
    () => series.filter((s) => effectiveEnabledIds.has(s.id)),
    [series, effectiveEnabledIds]
  );
  const visibleCandles = useMemo(
    () => (candles && effectiveEnabledIds.has(`candles-${candles.year}`) ? candles : null),
    [candles, effectiveEnabledIds]
  );

  const allEnabled = effectiveEnabledIds.size === allSeriesIds.length && allSeriesIds.length > 0;

  function toggleId(id: string) {
    effectiveSetEnabledIds((prev) => {
      // When everything is visible, clicking an item isolates it.
      if (prev.size === allSeriesIds.length) {
        return new Set([id]);
      }
      // When only the clicked item is visible (ignoring hidden candlestick
      // series), restore everything so the user never ends up with all legend
      // items disabled.
      const enabledLines = Array.from(prev).filter((x) => !x.startsWith("candles-"));
      if (enabledLines.length === 1 && enabledLines[0] === id) {
        return new Set(allSeriesIds);
      }
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    effectiveSetEnabledIds(new Set(allSeriesIds));
  }

  function dimOpacity(base: number | undefined, id: string) {
    const baseOpacity = base ?? 1;
    if (!hoveredLegendId || hoveredLegendId === id) return baseOpacity;
    return baseOpacity * 0.25;
  }

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
  }, [visibleSeries, visibleCandles, isPercent, toCandleDisplay, toDisplay]);

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
  }, [visibleCandles, defaultView, isPercent, maxX, visibleSeries, toCandleDisplay, toDisplay, transform]);

  const scale = useSvgChartScale({
    defaultHeight: height,
    padding: { left: 52, right: 12, top: 12, bottom: 44 },
    xDomain: [view.minX, view.maxX],
    yDomain: [view.minY, view.maxY],
  });

  const hover = useSvgHover({ scale, mode: "continuous", enabled: !drag });

  // Sync external hoverX state with the shared hook's hoverX.
  useEffect(() => {
    setHoverX(hover.hoverX);
  }, [hover.hoverX]);

  const W = scale.size.width;
  const H = scale.size.height;
  const gw = scale.plotArea.width;

  function computeZoomTransform(
    initialTransform: { scaleX: number; dx: number },
    svgX: number,
    targetScaleX: number
  ): { scaleX: number; dx: number } {
    const baseW = defaultView.maxX - defaultView.minX;
    const initialW = baseW / initialTransform.scaleX;
    const initialXScale = gw / initialW;
    const initialMinX = defaultView.minX + (baseW - initialW) / 2 + initialTransform.dx;
    const dataX = initialMinX + (svgX - scale.padding.left) / initialXScale;
    const newW = baseW / targetScaleX;
    const newXScale = gw / newW;
    const newMinX = dataX - (svgX - scale.padding.left) / newXScale;
    const newDx = newMinX - defaultView.minX - (baseW - newW) / 2;
    return { scaleX: targetScaleX, dx: newDx };
  }

  function handleMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    e.preventDefault();
    setDrag({
      startX: e.clientX,
      startY: e.clientY,
      initialTransform: { scaleX: transform.scaleX, dx: transform.dx },
    });
    hover.handleMouseLeave();
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (drag) {
      const dx = e.clientX - drag.startX;
      const dxData = -dx / scale.xScale;
      setTransform({
        scaleX: drag.initialTransform.scaleX,
        dx: drag.initialTransform.dx + dxData,
      });
      return;
    }
    hover.handleMouseMove(e);
  }

  function handleMouseLeave() {
    hover.handleMouseLeave();
    setDrag(null);
  }

  function handleWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const isPinch = e.ctrlKey || e.metaKey;
    const { sx } = scale.clientToSvg(e);

    if (!isPinch && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      const dxData = -e.deltaX / scale.xScale;
      setTransform((t) => ({ scaleX: t.scaleX, dx: t.dx + dxData }));
      return;
    }

    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    const newScaleX = Math.min(20, Math.max(1, transform.scaleX * factor));
    if (newScaleX === transform.scaleX) return;
    setTransform(computeZoomTransform(transform, sx, newScaleX));
  }

  useEffect(() => {
    if (!drag) return;
    function onMouseUp() {
      setDrag(null);
    }
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, [drag]);

  // Prevent the browser's Ctrl/Cmd+wheel zoom from leaving the chart.
  useEffect(() => {
    const el = scale.svgRef.current;
    if (!el) return;
    function onNativeWheel(e: WheelEvent) {
      e.preventDefault();
    }
    el.addEventListener("wheel", onNativeWheel, { passive: false });
    return () => el.removeEventListener("wheel", onNativeWheel);
  }, []);

  // Mobile touch handling: single-finger pan and two-finger pinch zoom.
  useEffect(() => {
    const el = scale.svgRef.current;
    if (!el) return;

    function getMidSvgPoint(t1: Touch, t2: Touch) {
      const rect = scale.svgRef.current!.getBoundingClientRect();
      const midClientX = (t1.clientX + t2.clientX) / 2;
      return ((midClientX - rect.left) / rect.width) * W;
    }

    function getTouchDistance(t1: Touch, t2: Touch) {
      return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    }

    function onTouchStart(e: TouchEvent) {
      const t = touchRef.current;
      const current = transformRef.current;
      if (e.touches.length === 1) {
        t.mode = "pan";
        t.startX = e.touches[0].clientX;
        t.initialTransform = { scaleX: current.scaleX, dx: current.dx };
        hover.handleMouseLeave();
      } else if (e.touches.length === 2) {
        t.mode = "pinch";
        t.startDist = getTouchDistance(e.touches[0], e.touches[1]);
        t.startMidSvgX = getMidSvgPoint(e.touches[0], e.touches[1]);
        t.initialTransform = { scaleX: current.scaleX, dx: current.dx };
        hover.handleMouseLeave();
      }
    }

    function onTouchMove(e: TouchEvent) {
      const t = touchRef.current;
      if (t.mode === "pan" && e.touches.length === 1) {
        e.preventDefault();
        const dx = e.touches[0].clientX - t.startX;
        const baseW = defaultView.maxX - defaultView.minX;
        const w = baseW / t.initialTransform.scaleX;
        const panXScale = gw / w;
        const dxData = -dx / panXScale;
        setTransform({
          scaleX: t.initialTransform.scaleX,
          dx: t.initialTransform.dx + dxData,
        });
      } else if (t.mode === "pinch" && e.touches.length === 2) {
        e.preventDefault();
        const newDist = getTouchDistance(e.touches[0], e.touches[1]);
        if (t.startDist <= 0) return;
        const ratio = newDist / t.startDist;
        const newScaleX = Math.min(20, Math.max(1, t.initialTransform.scaleX * ratio));
        if (newScaleX === transformRef.current.scaleX) return;
        const midSvgX = getMidSvgPoint(e.touches[0], e.touches[1]);
        setTransform(computeZoomTransform(t.initialTransform, midSvgX, newScaleX));
      }
    }

    function onTouchEnd() {
      touchRef.current.mode = "none";
    }

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [W, gw, defaultView, hover, scale]);

  const pathData = useMemo(() => {
    return visibleSeries.map((s) => {
      let d = "";
      let started = false;
      s.points.forEach((p) => {
        if (p.value == null) {
          started = false;
          return;
        }
        const { sx, sy } = scale.toSvg(p.x, toDisplay(p.value));
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
  }, [visibleSeries, toDisplay, scale]);

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
    const base: HoverLineItem[] = visibleSeries
      .map((s) => {
        let closest = null as { point: typeof s.points[number]; dist: number } | null;
        for (const p of s.points) {
          if (p.value == null) continue;
          const dist = Math.abs(p.x - hoverX);
          if (!closest || dist < closest.dist) {
            closest = { point: p, dist };
          }
        }
        if (!closest) return null;
        return {
          type: "line" as const,
          id: s.id,
          label: s.label,
          color: s.color,
          date: closest.point.date,
          value: closest.point.value,
        };
      })
      .filter(Boolean) as HoverLineItem[];
    if (!visibleCandles) return base;
    let nearestCandle: CandlePoint | null = null;
    let nearestDist = Infinity;
    for (const c of visibleCandles.candles) {
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
        type: "candle" as const,
        id: `candles-${visibleCandles.year}`,
        label: visibleCandles.label,
        color: visibleCandles.color,
        date: nearestCandle.date,
        ohlc: nearestCandle,
      },
    ];
  }, [hoverX, visibleSeries, visibleCandles]);

  const hoverDotItems: SvgHoverDotItem[] = useMemo(() => {
    if (hoverX == null) return [];
    return series.map((s) => {
      let closest: { x: number; y: number } | null = null;
      let closestDist = Infinity;
      for (const p of s.points) {
        if (p.value == null) continue;
        const dist = Math.abs(p.x - hoverX);
        if (dist < closestDist) {
          closestDist = dist;
          closest = { x: p.x, y: toDisplay(p.value) };
        }
      }
      return {
        key: s.id,
        x: closest?.x ?? hoverX,
        y: closest?.y ?? null,
        color: s.color,
      };
    });
  }, [hoverX, visibleSeries, toDisplay]);

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
        <button
          onClick={selectAll}
          onMouseEnter={() => setHoveredLegendId("average")}
          onMouseLeave={() => setHoveredLegendId(null)}
          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border transition-opacity ${
            allEnabled ? "bg-gray-100 text-gray-700 border-gray-200" : "bg-white text-gray-400 border-gray-200"
          } ${hoveredLegendId && hoveredLegendId !== "average" ? "opacity-40" : "opacity-100"}`}
        >
          <span className="w-2 h-2 rounded-full bg-gray-900" />
          Average
        </button>
        {legendSeries.map((s) => {
          const enabled = effectiveEnabledIds.has(s.id);
          const isDimmed = hoveredLegendId && hoveredLegendId !== s.id;
          return (
            <button
              key={s.id}
              onClick={() => toggleId(s.id)}
              onMouseEnter={() => setHoveredLegendId(s.id)}
              onMouseLeave={() => setHoveredLegendId(null)}
              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border transition-opacity ${
                isDimmed ? "opacity-40" : enabled ? "opacity-100" : "opacity-40"
              }`}
              style={{
                color: s.color,
                borderColor: s.color + "40",
                backgroundColor: s.color + "15",
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </button>
          );
        })}
        {candles && (
          <button
            onClick={() => toggleId(`candles-${candles.year}`)}
            onMouseEnter={() => setHoveredLegendId(`candles-${candles.year}`)}
            onMouseLeave={() => setHoveredLegendId(null)}
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border transition-opacity ${
              hoveredLegendId && hoveredLegendId !== `candles-${candles.year}` ? "opacity-40" : "opacity-100"
            } ${effectiveEnabledIds.has(`candles-${candles.year}`) ? "" : "opacity-40"}`}
            style={{
              color: candles.color,
              borderColor: candles.color + "40",
              backgroundColor: candles.color + "15",
            }}
          >
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: candles.color }} />
            {candles.label}
          </button>
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

      <div ref={scale.containerRef} className="flex-1 min-h-0">
        <svg
          ref={scale.svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className={`w-full h-full touch-none ${drag ? "cursor-grabbing" : "cursor-grab"}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
        >
          <defs>
            <clipPath id="plot-area">
              <rect x={scale.padding.left} y={scale.padding.top} width={gw} height={scale.plotArea.height} />
            </clipPath>
          </defs>

          <SvgChartGrid scale={scale} formatY={formatY} />
          {isPercent && <SvgZeroLine scale={scale} />}

          {/* X-axis labels */}
          {labels.map((label, i) => {
            if (i < view.minX - 0.5 || i > view.maxX + 0.5) return null;
            const { sx } = scale.toSvg(i, 0);
            return (
              <text
                key={label}
                x={sx}
                y={H - scale.padding.bottom + 16}
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
                opacity={dimOpacity(p.opacity, p.id)}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {/* Candlesticks for the most recent completed year */}
            {visibleCandles && (
              <g>
                {visibleCandles.candles.map((c) => {
                  const openD = toCandleDisplay(c.open, visibleCandles.janClose);
                  const highD = toCandleDisplay(c.high, visibleCandles.janClose);
                  const lowD = toCandleDisplay(c.low, visibleCandles.janClose);
                  const closeD = toCandleDisplay(c.close, visibleCandles.janClose);
                  const { sx, sy: syOpen } = scale.toSvg(c.x, openD);
                  const { sy: syClose } = scale.toSvg(c.x, closeD);
                  const { sy: syHigh } = scale.toSvg(c.x, highD);
                  const { sy: syLow } = scale.toSvg(c.x, lowD);
                  let bodyTopY = Math.min(syOpen, syClose);
                  let bodyBottomY = Math.max(syOpen, syClose);
                  if (bodyBottomY - bodyTopY < 1) {
                    const mid = (bodyTopY + bodyBottomY) / 2;
                    bodyTopY = mid - 0.5;
                    bodyBottomY = mid + 0.5;
                  }
                  const bodyHeight = bodyBottomY - bodyTopY;
                  const dayWidth = (scale.xScale * 11) / visibleCandles.candles.length;
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
                  const first = visibleCandles.candles[0];
                  const last = visibleCandles.candles[visibleCandles.candles.length - 1];
                  const lowDs = visibleCandles.candles.map((c) => toCandleDisplay(c.low, visibleCandles.janClose));
                  const minLow = Math.min(...lowDs);
                  const lineY = minLow - 2;
                  const { sx: x1, sy: y1 } = scale.toSvg(first.x, lineY);
                  const { sx: x2, sy: y2 } = scale.toSvg(last.x, lineY);
                  return (
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={visibleCandles.partyColor}
                      strokeWidth={1}
                      strokeLinecap="round"
                      opacity={0.5}
                    />
                  );
                })()}
              </g>
            )}

            <SvgHoverLine
              svgX={hover.hoverSvgX}
              top={scale.padding.top}
              bottom={H - scale.padding.bottom}
            />

            <SvgHoverDots items={hoverDotItems} scale={scale} />
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
