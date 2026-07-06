import type { DataFrame, ChartConfig } from "../lib/query/types";

interface DataTableProps {
  df: DataFrame;
  config: ChartConfig;
}

export default function DataTable({ df, config }: DataTableProps) {
  if (df.rows.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-slate-500">No data.</div>;
  }

  const columns = config.color
    ? df.columns.filter((c) => c.name !== config.color)
    : df.columns;

  return (
    <div className="h-full overflow-auto rounded border border-slate-700/50">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-slate-800">
          <tr>
            {columns.map((c) => (
              <th key={c.name} className="px-3 py-2 font-medium text-slate-300">
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {df.rows.map((row, i) => (
            <tr key={i} className="border-t border-slate-700/30 hover:bg-slate-800/50">
              {columns.map((c) => {
                const value = row[df.columns.findIndex((col) => col.name === c.name)];
                return (
                  <td key={c.name} className="px-3 py-1.5 text-slate-300">
                    {formatCell(value, c.type)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(value: unknown, type: string): string {
  if (value == null) return "—";
  if (type === "number" && typeof value === "number") {
    if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (Math.abs(value) >= 1_000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return value.toFixed(2);
  }
  return String(value);
}
