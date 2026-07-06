import type { DataFrame, ChartConfig } from "../lib/query/types";

interface GridLayoutProps {
  df: DataFrame;
  config: ChartConfig;
}

function colorForChange(value: unknown): string {
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return "bg-slate-700 text-slate-200";
  return num >= 0
    ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/30"
    : "bg-rose-500/20 text-rose-200 border-rose-500/30";
}

export default function GridLayout({ df, config }: GridLayoutProps) {
  const titleField = config.fields?.title ?? "title";
  const subtitleField = config.fields?.subtitle ?? "subtitle";
  const valueField = config.fields?.value ?? "value";
  const changeField = config.fields?.change ?? "change";

  const titleIdx = df.columns.findIndex((c) => c.name === titleField);
  const subtitleIdx = df.columns.findIndex((c) => c.name === subtitleField);
  const valueIdx = df.columns.findIndex((c) => c.name === valueField);
  const changeIdx = df.columns.findIndex((c) => c.name === changeField);

  const hasChange = changeIdx >= 0;
  const gridCols = config.options?.gridColumns ?? 4;

  return (
    <div
      className="grid gap-2 h-full overflow-auto"
      style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
    >
      {df.rows.map((row, i) => {
        const title = titleIdx >= 0 ? String(row[titleIdx] ?? "") : `#${i + 1}`;
        const subtitle = subtitleIdx >= 0 ? String(row[subtitleIdx] ?? "") : "";
        const value = valueIdx >= 0 ? row[valueIdx] : null;
        const change = hasChange ? row[changeIdx] : null;

        return (
          <div
            key={i}
            className={`rounded-lg p-2 flex flex-col text-center border ${hasChange ? colorForChange(change) : "bg-slate-800 text-slate-200 border-slate-700"}`}
          >
            {title && <div className="text-[10px] font-medium opacity-90 truncate">{title}</div>}
            {subtitle && <div className="text-xs font-bold my-0.5">{subtitle}</div>}
            {value != null && <div className="text-[10px] opacity-90">{typeof value === "number" ? value.toFixed(2) : String(value)}</div>}
            {hasChange && change != null && (
              <div className="text-[9px] opacity-75 mt-0.5">
                {typeof change === "number" ? `${change >= 0 ? "+" : ""}${change.toFixed(1)}%` : String(change)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
