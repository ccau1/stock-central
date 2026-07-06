export type ColumnType = "string" | "number" | "time" | "boolean";

export interface Column {
  name: string;
  type: ColumnType;
}

export interface DataFrame {
  columns: Column[];
  rows: unknown[][];
}

export interface QuerySpec {
  source: string;
  params: Record<string, unknown>;
}

export interface ExpressionQueryInput {
  expr: string;
  queries?: Record<string, QueryInput>;
}

export interface NamedQueryInput {
  name?: string;
  query: QueryInput;
}

export type QueryInput = string | QuerySpec | ExpressionQueryInput | NamedQueryInput | QueryInput[];

export interface QueryResponse {
  source: string;
  row_count: number;
  columns: Column[];
  rows: unknown[][];
  error?: string;
}

export interface QuerySourcesResponse {
  sources: string[];
}

// ---------- Chart configuration ----------

export type ChartType =
  | "line"
  | "area"
  | "bar"
  | "candlestick"
  | "pie"
  | "donut"
  | "treemap"
  | "table"
  | "stat"
  | "gauge"
  | "heatmap"
  | "grid"
  | "list";

export interface ChartSeries {
  field: string;
  label?: string;
  color?: string;
  style?: "line" | "area" | "bar";
  width?: number;
  dash?: string;
}

export type ThresholdMode = "above" | "below" | "between";

export interface Threshold {
  value: number;
  value2?: number;
  color: string;
  mode: ThresholdMode;
  label?: string;
}

export interface ChartAnnotation {
  date?: string;
  value?: number;
  label: string;
  color?: string;
}

export interface ChartAxisConfig {
  label?: string;
  min?: number;
  max?: number;
  logScale?: boolean;
}

export interface ChartOptions {
  stacked?: boolean;
  normalized?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  showGrid?: boolean;
  horizontal?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  xAxis?: ChartAxisConfig;
  yAxis?: ChartAxisConfig;
  colors?: string[];
  emptyMessage?: string;
  gridColumns?: number;
  maxItems?: number;
}

export interface ChartConfig {
  type: ChartType;
  title?: string;
  x?: string; // column name for the x / category axis
  y?: ChartSeries[];
  color?: string; // field or color used for color encoding
  size?: string; // field used for size encoding (treemap, bubble)
  options?: ChartOptions;
  thresholds?: Threshold[];
  annotations?: ChartAnnotation[];
  fields?: {
    title?: string;
    subtitle?: string;
    value?: string;
    change?: string;
    date?: string;
    link?: string;
    image?: string;
  };
}

export interface QueryChartInputs {
  query: QueryInput;
  chart: ChartConfig;
}

// ---------- Helpers ----------

export function getColumnIndex(df: DataFrame, name: string): number {
  return df.columns.findIndex((c) => c.name === name);
}

export function getCell<T>(df: DataFrame, rowIndex: number, columnName: string): T | undefined {
  const colIdx = getColumnIndex(df, columnName);
  if (colIdx < 0) return undefined;
  return df.rows[rowIndex]?.[colIdx] as T | undefined;
}

export function getNumericRows(df: DataFrame, xColumn: string, yFields: string[]): Array<Record<string, number | string | null>> {
  const xIdx = getColumnIndex(df, xColumn);
  const yIdxs = yFields.map((f) => getColumnIndex(df, f));
  return df.rows.map((row) => {
    const out: Record<string, number | string | null> = {};
    out[xColumn] = xIdx >= 0 ? (row[xIdx] as string | number | null) : null;
    yFields.forEach((f, i) => {
      const idx = yIdxs[i];
      out[f] = idx >= 0 ? (typeof row[idx] === "number" ? (row[idx] as number) : null) : null;
    });
    return out;
  });
}

