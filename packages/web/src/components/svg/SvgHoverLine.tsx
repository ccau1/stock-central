interface SvgHoverLineProps {
  svgX: number | null;
  top: number;
  bottom: number;
  stroke?: string;
  strokeDasharray?: string;
  strokeWidth?: number;
  opacity?: number;
}

export function SvgHoverLine({
  svgX,
  top,
  bottom,
  stroke = "#d1d5db",
  strokeDasharray = "4,4",
  strokeWidth = 1,
  opacity = 0.8,
}: SvgHoverLineProps) {
  if (svgX == null) return null;
  return (
    <line
      x1={svgX}
      y1={top}
      x2={svgX}
      y2={bottom}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
      opacity={opacity}
    />
  );
}
