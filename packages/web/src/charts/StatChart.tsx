import type { DataFrame, ChartConfig } from "../lib/query/types";

interface StatChartProps {
  df: DataFrame;
  config: ChartConfig;
}

export default function StatChart({ df, config }: StatChartProps) {
  const field = config.y?.[0]?.field ?? df.columns.find((c) => c.type === "number")?.name;
  const colIdx = df.columns.findIndex((c) => c.name === field);

  if (field == null || colIdx < 0) {
    return <div className="flex h-full items-center justify-center text-sm text-slate-500">No numeric field configured.</div>;
  }

  const lastRow = df.rows[df.rows.length - 1];
  const value = typeof lastRow?.[colIdx] === "number" ? (lastRow[colIdx] as number) : null;

  // Find previous value for change calculation.
  let prevValue: number | null = null;
  for (let i = df.rows.length - 2; i >= 0; i--) {
    const v = df.rows[i][colIdx];
    if (typeof v === "number") {
      prevValue = v;
      break;
    }
  }

  const color = config.y?.[0]?.color ?? "#3b82f6";
  const label = config.y?.[0]?.label ?? field;

  if (value == null) {
    return <div className="flex h-full items-center justify-center text-sm text-slate-500">No value available.</div>;
  }

  const change = prevValue != null && prevValue !== 0 ? value - prevValue : null;
  const changePct = change != null && prevValue != null ? (change / Math.abs(prevValue)) * 100 : null;

  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="text-sm font-medium text-slate-400">{label}</div>
      <div className="mt-1 text-5xl font-bold tracking-tight" style={{ color }}>
        {formatValue(value)}
      </div>
      {change != null && (
        <div className={`mt-2 text-sm font-medium ${change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {change >= 0 ? "+" : ""}
          {change.toFixed(2)} ({changePct != null ? `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%` : "n/a"})
        </div>
      )}
    </div>
  );
}

function formatValue(value: number): string {
  if (Math.abs(value) >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return value.toFixed(2);
}
