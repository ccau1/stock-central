import { useMemo, useRef } from "react";
import { useSvgContainerSize } from "./useSvgContainerSize";

export interface SvgChartPadding {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface SvgChartScaleOptions {
  defaultWidth?: number;
  defaultHeight?: number;
  padding?: Partial<SvgChartPadding>;
  xDomain: readonly [number, number];
  yDomain: readonly [number, number];
}

export interface SvgChartScale {
  containerRef: (el: HTMLDivElement | null) => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
  size: { width: number; height: number };
  padding: SvgChartPadding;
  plotArea: { x: number; y: number; width: number; height: number };
  xScale: number;
  yScale: number;
  toSvg: (x: number, y: number) => { sx: number; sy: number };
  toDataX: (sx: number) => number;
  clientToSvg: (e: { clientX: number; clientY: number }) => { sx: number; sy: number };
  gridYs: number[];
  zeroLineSy: number | null;
}

const DEFAULT_PADDING: SvgChartPadding = { left: 48, right: 12, top: 12, bottom: 36 };

export function useSvgChartScale(options: SvgChartScaleOptions): SvgChartScale {
  const { defaultWidth = 800, defaultHeight = 320, xDomain, yDomain } = options;
  const padding = { ...DEFAULT_PADDING, ...options.padding };
  const svgRef = useRef<SVGSVGElement>(null);
  const { ref: containerRef, size } = useSvgContainerSize(defaultWidth, defaultHeight);

  const W = size.width;
  const H = size.height;
  const gw = Math.max(W - padding.left - padding.right, 0);
  const gh = Math.max(H - padding.top - padding.bottom, 0);

  const xRange = xDomain[1] - xDomain[0] || 1;
  const yRange = yDomain[1] - yDomain[0] || 1;

  const xScale = gw / xRange;
  const yScale = gh / yRange;

  const toSvg = (x: number, y: number) => ({
    sx: padding.left + (x - xDomain[0]) * xScale,
    sy: padding.top + (yDomain[1] - y) * yScale,
  });

  const toDataX = (sx: number) => (sx - padding.left) / xScale + xDomain[0];

  const clientToSvg = (e: { clientX: number; clientY: number }) => {
    if (!svgRef.current) return { sx: W / 2, sy: H / 2 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      sx: ((e.clientX - rect.left) / rect.width) * W,
      sy: ((e.clientY - rect.top) / rect.height) * H,
    };
  };

  const gridYs = useMemo(() => {
    const count = 5;
    return Array.from({ length: count + 1 }, (_, i) => yDomain[0] + (yRange * i) / count);
  }, [yDomain, yRange]);

  const zeroLineSy = yDomain[0] < 0 && yDomain[1] > 0 ? toSvg(0, 0).sy : null;

  return {
    containerRef,
    svgRef,
    size,
    padding,
    plotArea: { x: padding.left, y: padding.top, width: gw, height: gh },
    xScale,
    yScale,
    toSvg,
    toDataX,
    clientToSvg,
    gridYs,
    zeroLineSy,
  };
}
