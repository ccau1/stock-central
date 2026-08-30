import type { SvgChartScale } from "../../hooks/useSvgChartScale";

interface SvgZeroLineProps {
  scale: SvgChartScale;
  stroke?: string;
  strokeDasharray?: string;
  strokeWidth?: number;
}

export function SvgZeroLine({
  scale,
  stroke = "#9ca3af",
  strokeDasharray = "4,4",
  strokeWidth = 1,
}: SvgZeroLineProps) {
  if (scale.zeroLineSy == null) return null;
  return (
    <line
      x1={scale.padding.left}
      y1={scale.zeroLineSy}
      x2={scale.size.width - scale.padding.right}
      y2={scale.zeroLineSy}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
    />
  );
}
