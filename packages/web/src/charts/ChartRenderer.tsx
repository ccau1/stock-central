import type { DataFrame, ChartConfig } from "../lib/query/types";
import LineAreaBarChart from "./LineAreaBarChart";
import DataTable from "./DataTable";
import StatChart from "./StatChart";
import GridLayout from "./GridLayout";
import ListLayout from "./ListLayout";

interface ChartRendererProps {
  df: DataFrame;
  config: ChartConfig;
}

export default function ChartRenderer({ df, config }: ChartRendererProps) {
  switch (config.type) {
    case "line":
    case "area":
    case "bar":
      return <LineAreaBarChart df={df} config={config} />;
    case "table":
      return <DataTable df={df} config={config} />;
    case "stat":
    case "gauge":
      return <StatChart df={df} config={config} />;
    case "grid":
      return <GridLayout df={df} config={config} />;
    case "list":
      return <ListLayout df={df} config={config} />;
    default:
      return (
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          Chart type "{config.type}" is not supported yet.
        </div>
      );
  }
}
