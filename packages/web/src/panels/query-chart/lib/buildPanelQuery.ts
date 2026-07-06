import type { DashboardVariable } from "../../../lib/api";
import type { QuerySpec, QueryInput, ChartConfig, NamedQueryInput } from "../../../lib/query/types";
import { resolveVariables, buildVariableContext } from "../../../lib/query/variables";
import { normalizeQuery, isCompactQuery, parseCompactQuery } from "../../../lib/query/compact";

export interface BuildPanelQueryOptions {
  tickers?: string[];
  enabledTickers?: string[];
  timeRange?: string;
  country?: string;
  dashboardVariables?: DashboardVariable[];
  panelVariables?: Record<string, string | string[]>;
}

export interface PanelQuery {
  name?: string;
  spec: QuerySpec;
}

function isNamedQueryInput(input: QueryInput): input is NamedQueryInput {
  return (
    typeof input === "object" &&
    input !== null &&
    !Array.isArray(input) &&
    !("source" in input) &&
    !("expr" in input) &&
    "query" in input
  );
}


function normalizeSingleQuery(raw: QueryInput): QuerySpec {
  if (isCompactQuery(raw)) {
    return parseCompactQuery(raw as string);
  }
  return normalizeQuery(raw as QueryInput);
}

export function buildPanelQuery(rawQuery: unknown, options: BuildPanelQueryOptions): PanelQuery | PanelQuery[] {
  const ctx = buildVariableContext(
    options.tickers,
    options.enabledTickers,
    options.timeRange,
    options.country,
    options.dashboardVariables,
    options.panelVariables
  );

  const input = rawQuery as QueryInput;

  if (Array.isArray(input)) {
    const resolved = resolveVariables({ queries: input }, ctx) as { queries: QueryInput[] };
    return resolved.queries.map((q) => {
      if (isNamedQueryInput(q)) {
        return { name: q.name, spec: normalizeSingleQuery(q.query) };
      }
      return { spec: normalizeSingleQuery(q) };
    });
  }

  const resolved = resolveVariables({ query: input }, ctx) as { query: QueryInput };
  const q = resolved.query;
  if (isNamedQueryInput(q)) {
    return { name: q.name, spec: normalizeSingleQuery(q.query) };
  }
  return { spec: normalizeSingleQuery(q) };
}

export function buildChartConfig(rawChart: unknown, title: string): ChartConfig & { title: string } {
  const defaultChart: ChartConfig = { type: "line" };
  const chart = (rawChart as ChartConfig | undefined) ?? defaultChart;
  return {
    ...chart,
    title: chart.title || title,
  } as ChartConfig & { title: string };
}
