import type { SvgChartScale } from "../../hooks/useSvgChartScale";

export interface SvgHoverDotItem {
  key: string;
  x: number;
  y: number | null;
  color: string;
  dimmed?: boolean;
}

interface SvgHoverDotsProps {
  items: SvgHoverDotItem[];
  scale: SvgChartScale;
  radius?: number;
}

export function SvgHoverDots({ items, scale, radius = 3 }: SvgHoverDotsProps) {
  return (
    <>
      {items.map((item) => {
        if (item.y == null) return null;
        const { sx, sy } = scale.toSvg(item.x, item.y);
        return (
          <circle
            key={item.key}
            cx={sx}
            cy={sy}
            r={radius}
            fill={item.color}
            opacity={item.dimmed ? 0.15 : 1}
          />
        );
      })}
    </>
  );
}
