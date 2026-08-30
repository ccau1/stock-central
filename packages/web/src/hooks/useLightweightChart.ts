import { useEffect, useRef } from "react";
import {
  createChart,
  CrosshairMode,
  type IChartApi,
  type ChartOptions,
  type DeepPartial,
} from "lightweight-charts";

export interface UseLightweightChartOptions {
  /** Show the time portion on the time scale (e.g. for intraday intervals). */
  timeVisible?: boolean;
  /** Hide the time scale entirely (used by the oscillator sub-chart). */
  hideTimeScale?: boolean;
  /**
   * true  = use the library's native mouse-wheel zoom.
   * false = disable native wheel zoom and add a custom centered wheel zoom.
   * Default: false.
   */
  nativeWheelZoom?: boolean;
  /** Extra chart options merged after the shared defaults. */
  chartOptions?: DeepPartial<ChartOptions>;
}

const DEFAULT_CHART_OPTIONS: DeepPartial<ChartOptions> = {
  layout: { background: { color: "#ffffff" }, textColor: "#6b7280" },
  grid: { vertLines: { color: "#f3f4f6" }, horzLines: { color: "#f3f4f6" } },
  rightPriceScale: { borderColor: "#e5e7eb" },
  timeScale: { borderColor: "#e5e7eb" },
  crosshair: { mode: CrosshairMode.Normal },
  autoSize: true,
};

const EMPTY_CHART_OPTIONS: DeepPartial<ChartOptions> = {};

/**
 * Shared lightweight-charts lifecycle hook.
 *
 * Handles chart creation, theming, the custom centered wheel-zoom handler,
 * and cleanup so individual components don't duplicate that boilerplate.
 */
export function useLightweightChart(opts: UseLightweightChartOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const {
    timeVisible = false,
    hideTimeScale = false,
    nativeWheelZoom = false,
    chartOptions = EMPTY_CHART_OPTIONS,
  } = opts;

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      ...DEFAULT_CHART_OPTIONS,
      timeScale: {
        ...DEFAULT_CHART_OPTIONS.timeScale,
        timeVisible,
        visible: !hideTimeScale,
      },
      handleScale: nativeWheelZoom
        ? { mouseWheel: true, pinch: true }
        : { mouseWheel: false, pinch: true },
      ...chartOptions,
    });

    chartRef.current = chart;

    const container = containerRef.current;
    let onWheel: ((e: WheelEvent) => void) | null = null;

    if (!nativeWheelZoom) {
      onWheel = (e: WheelEvent) => {
        if (e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        const timeScale = chart.timeScale();
        const range = timeScale.getVisibleLogicalRange();
        if (!range) return;
        const zoomFactor = Math.exp(-e.deltaY * 0.001 * 2.5);
        const center = (range.from + range.to) / 2;
        const halfSpan = (range.to - range.from) / 2;
        const newHalfSpan = Math.max(2, halfSpan * zoomFactor);
        timeScale.setVisibleLogicalRange({
          from: center - newHalfSpan,
          to: center + newHalfSpan,
        });
      };
      container.addEventListener("wheel", onWheel, { passive: false });
    }

    return () => {
      if (onWheel) container.removeEventListener("wheel", onWheel);
      chart.remove();
      chartRef.current = null;
    };
  }, [timeVisible, hideTimeScale, nativeWheelZoom, chartOptions]);

  return { containerRef, chartRef };
}
