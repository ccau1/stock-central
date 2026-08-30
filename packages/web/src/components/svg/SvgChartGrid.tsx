import type { SvgChartScale } from "../../hooks/useSvgChartScale";

interface SvgChartGridProps {
  scale: SvgChartScale;
  formatY: (y: number) => string;
  count?: number;
  stroke?: string;
  strokeDasharray?: string;
  strokeOpacity?: number;
  labelFill?: string;
  labelFontSize?: number;
}

export function SvgChartGrid({
  scale,
  formatY,
  count = 5,
  stroke = "#e5e7eb",
  strokeDasharray,
  strokeOpacity,
  labelFill = "#9ca3af",
  labelFontSize = 10,
}: SvgChartGridProps) {
  const ys =
    count === scale.gridYs.length
      ? scale.gridYs
      : Array.from({ length: count + 1 }, (_, i) => {
          const range = scale.gridYs[scale.gridYs.length - 1] - scale.gridYs[0];
          return scale.gridYs[0] + (range * i) / count;
        });

  return (
    <>
      {ys.map((y, i) => {
        const sy = scale.toSvg(0, y).sy;
        return (
          <g key={i}>
            <line
              x1={scale.padding.left}
              y1={sy}
              x2={scale.size.width - scale.padding.right}
              y2={sy}
              stroke={stroke}
              strokeWidth={1}
              strokeDasharray={strokeDasharray}
              strokeOpacity={strokeOpacity}
            />
            <text
              x={scale.padding.left - 6}
              y={sy + 3}
              textAnchor="end"
              fontSize={labelFontSize}
              fill={labelFill}
            >
              {formatY(y)}
            </text>
          </g>
        );
      })}
    </>
  );
}
