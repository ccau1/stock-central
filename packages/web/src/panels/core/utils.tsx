export function renderSvgLine(
  data: { x: number; y: number }[],
  width: number,
  height: number,
  color: string,
  fill = false,
  pad = 5
) {
  if (data.length < 2) return null;
  const minY = Math.min(...data.map((d) => d.y));
  const maxY = Math.max(...data.map((d) => d.y));
  const rangeY = maxY - minY || 1;
  const scaleX = (width - pad * 2) / (data.length - 1);
  const scaleY = (height - pad * 2) / rangeY;

  const pts = data.map((d, i) => {
    const sx = pad + i * scaleX;
    const sy = pad + (maxY - d.y) * scaleY;
    return { sx, sy };
  });
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.sx} ${p.sy}`).join(" ");

  if (fill) {
    const fillPath = `${pathD} L ${pts[pts.length - 1].sx} ${height} L ${pts[0].sx} ${height} Z`;
    return (
      <g>
        <path d={fillPath} fill={color} opacity="0.15" />
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" />
      </g>
    );
  }
  return <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" />;
}

export function colorForChangePct(pct: number): string {
  if (pct >= 10) return "bg-green-600 text-white";
  if (pct >= 5) return "bg-green-500 text-white";
  if (pct >= 2) return "bg-green-400 text-gray-900";
  if (pct >= 0) return "bg-green-300 text-gray-900";
  if (pct >= -2) return "bg-red-300 text-gray-900";
  if (pct >= -5) return "bg-red-400 text-white";
  if (pct >= -10) return "bg-red-500 text-white";
  return "bg-red-600 text-white";
}

export function normalizeRatioSeries(
  points: { date: string; ratio: number }[]
): { date: string; pct: number }[] {
  if (points.length === 0) return [];
  const base = points[0].ratio;
  if (base === 0) return points.map((p) => ({ date: p.date, pct: 0 }));
  return points.map((p) => ({ date: p.date, pct: ((p.ratio - base) / base) * 100 }));
}
