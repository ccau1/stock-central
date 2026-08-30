import { useState, useCallback } from "react";
import type { SvgChartScale } from "./useSvgChartScale";

export type SvgHoverMode = "continuous" | "index";

export interface UseSvgHoverOptions {
  scale: SvgChartScale;
  mode: SvgHoverMode;
  maxIndex?: number;
  enabled?: boolean;
}

export interface UseSvgHoverResult {
  /** Data-space x (or index when mode === "index"). */
  hoverX: number | null;
  /** Integer index only set when mode === "index". */
  hoverIndex: number | null;
  /** SVG x coordinate for the hover line, or null. */
  hoverSvgX: number | null;
  handleMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
  handleMouseLeave: () => void;
}

export function useSvgHover(options: UseSvgHoverOptions): UseSvgHoverResult {
  const { scale, mode, maxIndex = 0, enabled = true } = options;
  const [hoverX, setHoverX] = useState<number | null>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!enabled) return;
      const { sx } = scale.clientToSvg(e);
      const x = scale.toDataX(sx);
      if (mode === "index") {
        let idx = Math.round(x);
        idx = Math.max(0, Math.min(idx, maxIndex));
        setHoverX(idx);
      } else {
        setHoverX(x);
      }
    },
    [enabled, mode, maxIndex, scale]
  );

  const handleMouseLeave = useCallback(() => setHoverX(null), []);

  return {
    hoverX,
    hoverIndex: mode === "index" && hoverX != null ? hoverX : null,
    hoverSvgX: hoverX != null ? scale.toSvg(hoverX, 0).sx : null,
    handleMouseMove,
    handleMouseLeave,
  };
}
